import { useState, useEffect } from "react";
import axios from "axios";
import { getAuthHeaders } from "../services/auth";
import AnalisisEstadistico from "./AnalisisEstadistico"; 

function VariableForm({ 
  expId, 
  varId, 
  nombreCultivo = "Cultivo no especificado", 
  nombreVariable = "Variable no especificada",
  nombreLote = "Mes no especificado",
  anio = "Año no especificado"
}) { 
  const [tratamiento, setTratamiento] = useState("");
  
  const [plantas, setPlantas] = useState([
    { id: 1, valores: Array(10).fill("") },
    { id: 2, valores: Array(10).fill("") },
    { id: 3, valores: Array(10).fill("") }
  ]);
  
  const [listaValores, setListaValores] = useState([]);
  const [listaTratamientos, setListaTratamientos] = useState([]);
  const [mostrarAnalisis, setMostrarAnalisis] = useState(false);
  const [cargando, setCargando] = useState(false);

  // ESTADOS PARA LA CARGA DESDE EXCEL (Matricial Superior)
  const [mostrarPegar, setMostrarPegar] = useState(false);
  const [textoExcel, setTextoExcel] = useState("");
  const [cargandoBulk, setCargandoBulk] = useState(false);

  // NUEVOS ESTADOS PARA PEGAR REGISTROS DIRECTOS (Inferior)
  const [mostrarPegarDirecto, setMostrarPegarDirecto] = useState(false);
  const [textoExcelDirecto, setTextoExcelDirecto] = useState("");
  const [cargandoDirecto, setCargandoDirecto] = useState(false);

  const cargarDatos = async () => {
    try {
      const resValores = await axios.get("https://agro-utc.onrender.com/api/valores/", getAuthHeaders());
      const datosFiltrados = resValores.data
        .filter(item => item.variable === parseInt(varId) && item.experimento === parseInt(expId))
        .reverse(); 
      setListaValores(datosFiltrados);

      const resTratamientos = await axios.get("https://agro-utc.onrender.com/api/tratamientos/", getAuthHeaders());
      setListaTratamientos(resTratamientos.data);
    } catch (error) {
      console.error("Error al cargar los datos:", error);
    }
  };

  useEffect(() => {
    if(expId && varId) cargarDatos();
  }, [varId, expId]);

  const handleValorChange = (plantaIndex, repIndex, val) => {
    if ((val === "" || Number(val) >= 0) && val.length <= 6) {
      const nuevasPlantas = [...plantas];
      nuevasPlantas[plantaIndex].valores[repIndex] = val;
      setPlantas(nuevasPlantas);
    }
  };

  const agregarPlanta = () => {
    setPlantas([...plantas, { id: plantas.length + 1, valores: Array(10).fill("") }]);
  };

  const calcularPromediosPorRepeticion = () => {
    const promedios = Array(10).fill("");
    for (let repIndex = 0; repIndex < 10; repIndex++) {
      let suma = 0;
      let cantidad = 0;
      plantas.forEach(planta => {
        const valor = planta.valores[repIndex];
        if (valor !== "" && !isNaN(valor)) {
          suma += parseFloat(valor);
          cantidad++;
        }
      });
      if (cantidad > 0) promedios[repIndex] = (suma / cantidad).toFixed(2);
    }
    return promedios;
  };

  const promediosActuales = calcularPromediosPorRepeticion();

  const guardarDatosPromediados = async () => {
    if (!tratamiento) return alert("Por favor, ingresa el nombre del tratamiento.");
    
    const hayDatos = promediosActuales.some(p => p !== "");
    if (!hayDatos) return alert("No hay datos para promediar. Ingresa valores.");

    setCargando(true);
    try {
      let tratamientoId = null;
      const tratamientoExistente = listaTratamientos.find(
        (t) => t.nombre.toLowerCase() === tratamiento.toLowerCase().trim()
      );

      if (tratamientoExistente) {
        tratamientoId = tratamientoExistente.id;
      } else {
        const resNuevoTrat = await axios.post("https://agro-utc.onrender.com/api/tratamientos/", { nombre: tratamiento.trim() }, getAuthHeaders());
        tratamientoId = resNuevoTrat.data.id;
      }

      const promesasGuardado = promediosActuales.map((promedio, index) => {
        if (promedio !== "") {
          return axios.post(
            "https://agro-utc.onrender.com/api/valores/",
            {
              experimento: parseInt(expId), variable: parseInt(varId),      
              tratamiento: tratamientoId, repeticion: index + 1, valor: parseFloat(promedio)
            }, getAuthHeaders()
          );
        }
        return null;
      }).filter(p => p !== null);

      await Promise.all(promesasGuardado);
      alert("✅ ¡Promedios guardados con éxito!");
      limpiarCampos(); cargarDatos(); 
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("❌ Error al guardar. Revisa la consola.");
    } finally {
      setCargando(false);
    }
  };

  // FUNCIÓN EXISTENTE: PROCESAR EXCEL MATRICIAL
  const procesarExcelMatricial = async () => {
    if (!textoExcel.trim()) return alert("Por favor, pega datos primero.");
    setCargandoBulk(true);
    
    try {
      let tratamientosLocales = [...listaTratamientos];
      const lineas = textoExcel.split(/\r?\n/);
      let datosAgrupados = {}; 
      let ultimoTratamiento = "";

      for (const linea of lineas) {
        if (!linea.trim()) continue;
        const columnas = linea.split("\t");
        
        let tratNombre = columnas[0] ? columnas[0].trim() : "";
        
        if (tratNombre !== "" && tratNombre.toLowerCase() !== "tratamiento") {
           ultimoTratamiento = tratNombre;
        } else if (tratNombre === "" && ultimoTratamiento !== "") {
           tratNombre = ultimoTratamiento;
        }

        if (!tratNombre) continue;

        const colPlanta = columnas[1] ? columnas[1].trim().toLowerCase() : "";
        if (colPlanta === "planta" || colPlanta === "") continue;

        if (!datosAgrupados[tratNombre]) {
           datosAgrupados[tratNombre] = Array(10).fill().map(() => []);
        }

        let repIndex = 0;
        for (let i = 2; i < columnas.length; i++) {
          if (repIndex >= 10) break;

          const valStr = columnas[i] ? columnas[i].trim().replace(",", ".") : "";
          if (valStr !== "" && !isNaN(valStr)) {
             datosAgrupados[tratNombre][repIndex].push(parseFloat(valStr));
             repIndex++;
          }
        }
      }

      let promediosGuardados = 0;
      let promesas = [];

      for (const [tratNombre, repeticionesData] of Object.entries(datosAgrupados)) {
         let tratamientoId = null;
         const existe = tratamientosLocales.find((t) => t.nombre.toLowerCase() === tratNombre.toLowerCase());
         
         if (existe) {
           tratamientoId = existe.id;
         } else {
           const resNuevoTrat = await axios.post("https://agro-utc.onrender.com/api/tratamientos/", { nombre: tratNombre }, getAuthHeaders());
           tratamientoId = resNuevoTrat.data.id;
           tratamientosLocales.push(resNuevoTrat.data);
         }

         for (let i = 0; i < 10; i++) {
           const valores = repeticionesData[i];
           if (valores.length > 0) {
             const suma = valores.reduce((a, b) => a + b, 0);
             const promedioFinal = (suma / valores.length).toFixed(2);
             
             promesas.push(
               axios.post("https://agro-utc.onrender.com/api/valores/", {
                 experimento: parseInt(expId),
                 variable: parseInt(varId),
                 tratamiento: tratamientoId,
                 repeticion: i + 1, 
                 valor: parseFloat(promedioFinal)
               }, getAuthHeaders())
             );
             promediosGuardados++;
           }
         }
      }

      await Promise.all(promesas);

      alert(`✅ ¡Éxito! Se agruparon las plantas y se guardaron ${promediosGuardados} promedios.`);
      setTextoExcel(""); setMostrarPegar(false); cargarDatos();
    } catch (error) {
      console.error("Error en la importación masiva:", error);
      alert("❌ Ocurrió un problema guardando las filas. Verifica la consola.");
    } finally {
      setCargandoBulk(false);
    }
  };

  // NUEVA FUNCIÓN: PROCESAR REGISTROS DIRECTOS (Tratamiento | Repetición | Valor)
  const procesarExcelDirecto = async () => {
    if (!textoExcelDirecto.trim()) return alert("Por favor, pega datos primero.");
    setCargandoDirecto(true);
    
    try {
      let tratamientosLocales = [...listaTratamientos];
      const lineas = textoExcelDirecto.split(/\r?\n/);
      let promesas = [];
      let registrosGuardados = 0;

      for (const linea of lineas) {
        if (!linea.trim()) continue;
        const columnas = linea.split("\t");
        
        // Verificamos que al menos existan 3 columnas
        if (columnas.length < 3) continue;

        const tratNombre = columnas[0].trim();
        // Limpiamos la repetición en caso de que copien "R1" en lugar de "1"
        const repeticionStr = columnas[1].trim().replace(/\D/g, ''); 
        const repeticion = parseInt(repeticionStr);
        // Formateamos el valor numérico
        const valor = parseFloat(columnas[2].trim().replace(",", "."));

        // Si falta algún dato importante o la fila era encabezado, la saltamos
        if (!tratNombre || isNaN(repeticion) || isNaN(valor) || tratNombre.toLowerCase() === 'tratamiento') continue;

        let tratamientoId = null;
        const existe = tratamientosLocales.find((t) => t.nombre.toLowerCase() === tratNombre.toLowerCase());

        if (existe) {
          tratamientoId = existe.id;
        } else {
          const resNuevoTrat = await axios.post("https://agro-utc.onrender.com/api/tratamientos/", { nombre: tratNombre }, getAuthHeaders());
          tratamientoId = resNuevoTrat.data.id;
          tratamientosLocales.push(resNuevoTrat.data);
        }

        promesas.push(
          axios.post("https://agro-utc.onrender.com/api/valores/", {
            experimento: parseInt(expId),
            variable: parseInt(varId),
            tratamiento: tratamientoId,
            repeticion: repeticion,
            valor: valor
          }, getAuthHeaders())
        );
        registrosGuardados++;
      }

      await Promise.all(promesas);

      alert(`✅ ¡Éxito! Se guardaron ${registrosGuardados} registros directamente en la base de datos.`);
      setTextoExcelDirecto(""); setMostrarPegarDirecto(false); cargarDatos();
    } catch (error) {
      console.error("Error al importar registros directos:", error);
      alert("❌ Hubo un error al guardar los registros. Verifica que el formato sea el correcto.");
    } finally {
      setCargandoDirecto(false);
    }
  };

  const eliminarDato = async (id) => {
    if (!window.confirm("¿Estás seguro de eliminar este registro?")) return;
    try {
      await axios.delete(`https://agro-utc.onrender.com/api/valores/${id}/`, getAuthHeaders());
      alert("🗑️ Registro eliminado.");
      cargarDatos();
    } catch (error) {
      console.error("Error al eliminar:", error);
    }
  };

  const limpiarCampos = () => {
    setTratamiento(""); 
    setPlantas([
      { id: 1, valores: Array(10).fill("") },
      { id: 2, valores: Array(10).fill("") },
      { id: 3, valores: Array(10).fill("") }
    ]); 
  };

  const obtenerNombreTratamiento = (idTrat) => {
    const t = listaTratamientos.find(x => x.id === idTrat);
    return t ? t.nombre : `ID: ${idTrat}`;
  };

  return (
    <div style={{ backgroundColor: "#fff", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
      <h3 style={{ color: "#0277bd", marginTop: 0, borderBottom: "2px solid #eee", paddingBottom: "10px" }}>📊 Registro de Mediciones - Promedios In Vitro</h3>

      {/* --- FORMULARIO MANUAL --- */}
      <div style={{ backgroundColor: "#f8f9fa", padding: "15px", borderRadius: "8px", border: "1px solid #e0e0e0", marginBottom: "20px", overflowX: "auto" }}>
        
        <div style={{ marginBottom: "15px", width: "300px" }}>
          <label style={{ display: "block", color: "#0277bd", fontWeight: "bold", fontSize: "14px", marginBottom: "5px" }}>Tratamiento (Ej. T1):</label>
          <input type="text" value={tratamiento} onChange={(e) => setTratamiento(e.target.value)} list="trat-list" style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }} />
          <datalist id="trat-list">{listaTratamientos.map(t => <option key={t.id} value={t.nombre} />)}</datalist>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
          <thead>
            <tr>
              <th style={{ padding: "8px", backgroundColor: "#e3f2fd", border: "1px solid #bbdefb", textAlign: "left" }}>Plantas</th>
              {[...Array(10)].map((_, i) => (
                <th key={i} style={{ padding: "8px", backgroundColor: "#e3f2fd", border: "1px solid #bbdefb", textAlign: "center", width: "8%" }}>R{i + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plantas.map((planta, pIndex) => (
              <tr key={planta.id}>
                <td style={{ padding: "8px", border: "1px solid #eee", fontWeight: "bold", color: "#424242" }}>Planta {planta.id}</td>
                {planta.valores.map((valor, rIndex) => (
                  <td key={rIndex} style={{ padding: "4px", border: "1px solid #eee" }}>
                    <input type="number" min="0" step="0.01" value={valor} onChange={(e) => handleValorChange(pIndex, rIndex, e.target.value)} style={{ width: "100%", padding: "4px", boxSizing: "border-box", textAlign: "center", border: "1px solid #ccc", borderRadius: "3px" }} />
                  </td>
                ))}
              </tr>
            ))}
            <tr style={{ backgroundColor: "#e8f5e9" }}>
              <td style={{ padding: "10px 8px", border: "1px solid #c8e6c9", fontWeight: "bold", color: "#2e7d32" }}>Promedios Finales:</td>
              {promediosActuales.map((prom, index) => (
                <td key={index} style={{ padding: "10px 8px", border: "1px solid #c8e6c9", textAlign: "center", fontWeight: "bold", color: "#1b5e20" }}>{prom !== "" ? prom : "-"}</td>
              ))}
            </tr>
          </tbody>
        </table>
        
        <div style={{ marginTop: "10px" }}>
          <button onClick={agregarPlanta} style={{ padding: "6px 12px", backgroundColor: "#eceff1", color: "#455a64", border: "1px solid #cfd8dc", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>+ Agregar otra Planta</button>
        </div>
      </div>

      {/* --- SECCIÓN PEGAR DESDE EXCEL (Matriz) --- */}
      {mostrarPegar && (
        <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#f9f9f9", borderRadius: "6px", border: "1px dashed #0288d1" }}>
          <label style={{ display: "block", color: "#0288d1", fontWeight: "bold", fontSize: "14px", marginBottom: "5px" }}>
            Copia desde tu Excel las 12 columnas: Tratamiento | Planta | R1 hasta R10 y pégalas aquí. 
          </label>
          <span style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "10px" }}>
            El sistema detectará múltiples plantas para un mismo tratamiento, promediará R1, R2, etc. automáticamente y guardará los resultados.
          </span>
          <textarea
            rows="6"
            value={textoExcel}
            onChange={(e) => setTextoExcel(e.target.value)}
            placeholder="Haz clic aquí y presiona Ctrl+V..."
            style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", fontFamily: "monospace", fontSize: "12px", resize: "vertical" }}
            disabled={cargandoBulk}
          />
          <div style={{ display: "flex", gap: "10px", marginTop: "10px", justifyContent: "flex-end" }}>
            <button onClick={procesarExcelMatricial} disabled={cargandoBulk} style={{ padding: "6px 12px", backgroundColor: "#0288d1", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>
              {cargandoBulk ? "Procesando promedios..." : "⚡ Calcular y Guardar a BD"}
            </button>
            <button onClick={() => { setTextoExcel(""); setMostrarPegar(false); }} disabled={cargandoBulk} style={{ padding: "6px 12px", backgroundColor: "#757575", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* --- BOTONERA PRINCIPAL --- */}
      <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", flexWrap: "wrap", marginBottom: "30px" }}>
        <button onClick={() => setMostrarPegar(!mostrarPegar)} style={{ padding: "8px 16px", backgroundColor: "#e0f2f1", color: "#004d40", border: "1px solid #004d40", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>
          📋 Importar Matriz Excel
        </button>
        <button onClick={guardarDatosPromediados} disabled={cargando} style={{ padding: "8px 16px", backgroundColor: "#2e7d32", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>
          {cargando ? "Guardando..." : "Guardar Formulario"}
        </button>
        <button onClick={limpiarCampos} style={{ padding: "8px 16px", backgroundColor: "#757575", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>Limpiar</button>
        <button onClick={() => setMostrarAnalisis(!mostrarAnalisis)} style={{ padding: "8px 16px", backgroundColor: "#0288d1", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>📊 Ver Análisis</button>
      </div>

      {/* --- NUEVO: ENCABEZADO FLEXIBLE PARA LA TABLA DE REGISTROS --- */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #eee", paddingBottom: "10px", marginBottom: "15px" }}>
        <h4 style={{ color: "#424242", margin: 0 }}>Registros en Base de Datos</h4>
        <button onClick={() => setMostrarPegarDirecto(!mostrarPegarDirecto)} style={{ padding: "6px 12px", backgroundColor: "#00897b", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}>
          📋 Pegar Datos Directos
        </button>
      </div>

      {/* --- NUEVA SECCIÓN: PEGAR REGISTROS DIRECTOS --- */}
      {mostrarPegarDirecto && (
        <div style={{ marginBottom: "15px", padding: "15px", backgroundColor: "#e0f2f1", borderRadius: "6px", border: "1px dashed #00897b" }}>
          <label style={{ display: "block", color: "#00695c", fontWeight: "bold", fontSize: "14px", marginBottom: "5px" }}>
            Copia desde Excel 3 columnas: Tratamiento | Repetición | Valor Promedio
          </label>
          <span style={{ fontSize: "12px", color: "#004d40", display: "block", marginBottom: "10px" }}>
            Ideal si ya tienes los promedios calculados. (Ej. T1  1  15.5)
          </span>
          <textarea
            rows="5"
            value={textoExcelDirecto}
            onChange={(e) => setTextoExcelDirecto(e.target.value)}
            placeholder="T1&#9;1&#9;15.5&#10;T1&#9;2&#9;16.0..."
            style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #b2dfdb", fontFamily: "monospace", fontSize: "12px", resize: "vertical" }}
            disabled={cargandoDirecto}
          />
          <div style={{ display: "flex", gap: "10px", marginTop: "10px", justifyContent: "flex-end" }}>
            <button onClick={procesarExcelDirecto} disabled={cargandoDirecto} style={{ padding: "6px 12px", backgroundColor: "#00897b", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>
              {cargandoDirecto ? "Guardando registros..." : "⚡ Guardar en BD"}
            </button>
            <button onClick={() => { setTextoExcelDirecto(""); setMostrarPegarDirecto(false); }} disabled={cargandoDirecto} style={{ padding: "6px 12px", backgroundColor: "#757575", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* TABLA DE BASE DE DATOS */}
      <div style={{ maxHeight: "250px", overflowY: "auto", border: "1px solid #ddd", borderRadius: "8px" }}>
        <table className="sql-table" style={{ margin: 0, width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ position: "sticky", top: 0, backgroundColor: "#f4f7f6", zIndex: 1 }}>
            <tr>
              <th style={{padding: "10px", borderBottom: "2px solid #ddd", textAlign: "left"}}>Tratamiento</th>
              <th style={{padding: "10px", borderBottom: "2px solid #ddd", textAlign: "left"}}>Repetición (R)</th>
              <th style={{padding: "10px", borderBottom: "2px solid #ddd", textAlign: "left"}}>Valor (Promedio)</th>
              <th style={{padding: "10px", borderBottom: "2px solid #ddd", textAlign: "center"}}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {listaValores.map((dato) => (
              <tr key={dato.id} style={{ backgroundColor: "transparent" }}>
                <td style={{padding: "10px", borderBottom: "1px solid #eee"}}>{obtenerNombreTratamiento(dato.tratamiento)}</td>
                <td style={{padding: "10px", borderBottom: "1px solid #eee"}}>R{dato.repeticion}</td>
                <td style={{padding: "10px", borderBottom: "1px solid #eee", fontWeight: "bold"}}>{dato.valor}</td>
                <td style={{padding: "10px", borderBottom: "1px solid #eee", textAlign: "center"}}>
                  <button onClick={() => eliminarDato(dato.id)} style={{ padding: "4px 8px", backgroundColor: "#ffebee", color: "#c62828", border: "1px solid #ffcdd2", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>Eliminar</button>
                </td>
              </tr>
            ))}
            {listaValores.length === 0 && (
              <tr><td colSpan="4" style={{textAlign:"center", padding: "15px"}}>No hay datos registrados aún.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {mostrarAnalisis && listaValores.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <AnalisisEstadistico 
            valores={listaValores} 
            tratamientos={listaTratamientos} 
            nombreCultivo={nombreCultivo} 
            nombreVariable={nombreVariable}
            nombreLote={nombreLote}
            anio={anio}
          />
        </div>
      )}
    </div>
  );
}

export default VariableForm;