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
  const [errorTratamiento, setErrorTratamiento] = useState("");
  
  const [mensajeSistema, setMensajeSistema] = useState({ texto: "", tipo: "" });
  const [advertenciaCamposVacios, setAdvertenciaCamposVacios] = useState(false);
  
  const [plantas, setPlantas] = useState([
    { id: 1, valores: Array(10).fill("") },
    { id: 2, valores: Array(10).fill("") },
    { id: 3, valores: Array(10).fill("") }
  ]);
  
  const [listaValores, setListaValores] = useState([]);
  const [listaTratamientos, setListaTratamientos] = useState([]);
  const [mostrarAnalisis, setMostrarAnalisis] = useState(false);
  const [cargando, setCargando] = useState(false);

  const [mostrarPegar, setMostrarPegar] = useState(false);
  const [textoExcel, setTextoExcel] = useState("");
  const [cargandoBulk, setCargandoBulk] = useState(false);

  const [mostrarPegarDirecto, setMostrarPegarDirecto] = useState(false);
  const [textoExcelDirecto, setTextoExcelDirecto] = useState("");
  const [cargandoDirecto, setCargandoDirecto] = useState(false);

  // NUEVO ESTADO: Controla qué IDs están marcados para eliminar
  const [seleccionados, setSeleccionados] = useState([]);

  const mostrarMensaje = (texto, tipo = "error") => {
    setMensajeSistema({ texto, tipo });
    setTimeout(() => {
      setMensajeSistema({ texto: "", tipo: "" });
    }, 6000);
  };

  const cargarDatos = async () => {
    try {
      const resValores = await axios.get("https://agro-utc.onrender.com/api/valores/", getAuthHeaders());
      const resTratamientos = await axios.get("https://agro-utc.onrender.com/api/tratamientos/", getAuthHeaders());

      const tratamientosData = resTratamientos.data;
      tratamientosData.sort((a, b) => 
        a.nombre.localeCompare(b.nombre, undefined, { numeric: true, sensitivity: 'base' })
      );
      setListaTratamientos(tratamientosData);

      const datosFiltrados = resValores.data.filter(
        item => item.variable === parseInt(varId) && item.experimento === parseInt(expId)
      );

      datosFiltrados.sort((a, b) => {
        const tratA = tratamientosData.find(t => t.id === a.tratamiento)?.nombre || "";
        const tratB = tratamientosData.find(t => t.id === b.tratamiento)?.nombre || "";
        
        const comparacionTratamiento = tratA.localeCompare(tratB, undefined, { numeric: true, sensitivity: 'base' });
        
        if (comparacionTratamiento === 0) {
          return a.repeticion - b.repeticion;
        }
        return comparacionTratamiento;
      });

      setListaValores(datosFiltrados);
      setSeleccionados([]); // Limpiar selección al recargar datos

    } catch (error) {
      console.error("Error al cargar los datos:", error);
    }
  };

  useEffect(() => {
    if(expId && varId) cargarDatos();
  }, [varId, expId]);

  const handleTratamientoChange = (e) => {
    const valor = e.target.value;
    setErrorTratamiento("");
    setAdvertenciaCamposVacios(false);
    setTratamiento(valor);
  };

  const handleValorChange = (plantaIndex, repIndex, val) => {
    if ((val === "" || Number(val) >= 0) && val.length <= 6) {
      const nuevasPlantas = [...plantas];
      nuevasPlantas[plantaIndex].valores[repIndex] = val;
      setPlantas(nuevasPlantas);
      setAdvertenciaCamposVacios(false); 
    }
  };

  const agregarPlanta = () => {
    setPlantas([...plantas, { id: plantas.length + 1, valores: Array(10).fill("") }]);
    setAdvertenciaCamposVacios(false);
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
    if (!tratamiento.trim()) {
      setErrorTratamiento("⚠️ Por favor, ingresa el nombre del tratamiento.");
      return mostrarMensaje("⚠️ Ingresa el nombre del tratamiento para continuar.", "error"); 
    }

    const hayCamposVacios = plantas.some(planta => planta.valores.some(v => v === ""));

    if (hayCamposVacios && !advertenciaCamposVacios) {
      setAdvertenciaCamposVacios(true);
      return mostrarMensaje(
        "⚠️ Tienes campos vacíos en la tabla. Rellénalos con tus mediciones o presiona 'Guardar Formulario' de nuevo para completarlos automáticamente con ceros (0).",
        "error"
      );
    }

    const plantasActualizadas = plantas.map(planta => ({
      ...planta,
      valores: planta.valores.map(v => (v === "" ? "0" : v))
    }));
    setPlantas(plantasActualizadas);

    const promediosCalculados = Array(10).fill("");
    for (let repIndex = 0; repIndex < 10; repIndex++) {
      let suma = 0;
      let cantidad = 0;
      plantasActualizadas.forEach(planta => {
        const valor = planta.valores[repIndex];
        if (valor !== "" && !isNaN(valor)) {
          suma += parseFloat(valor);
          cantidad++;
        }
      });
      if (cantidad > 0) promediosCalculados[repIndex] = (suma / cantidad).toFixed(2);
    }

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

      const promesasGuardado = promediosCalculados.map((promedio, index) => {
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
      
      mostrarMensaje("✅ ¡Promedios guardados con éxito!", "exito");
      setAdvertenciaCamposVacios(false);
      limpiarCampos(); 
      cargarDatos(); 
    } catch (error) {
      console.error("Error al guardar:", error);
      mostrarMensaje("❌ Error al guardar. Revisa la consola.", "error");
    } finally {
      setCargando(false);
    }
  };

  const procesarExcelMatricial = async () => {
    if (!textoExcel.trim()) return mostrarMensaje("Por favor, pega datos de Excel primero.", "error");
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
                 experimento: parseInt(expId), variable: parseInt(varId),
                 tratamiento: tratamientoId, repeticion: i + 1, valor: parseFloat(promedioFinal)
               }, getAuthHeaders())
             );
             promediosGuardados++;
           }
         }
      }

      await Promise.all(promesas);

      mostrarMensaje(`✅ ¡Éxito! Se agruparon las plantas y se guardaron ${promediosGuardados} promedios.`, "exito");
      setTextoExcel(""); setMostrarPegar(false); cargarDatos();
    } catch (error) {
      console.error("Error en la importación masiva:", error);
      mostrarMensaje("❌ Ocurrió un problema guardando las filas. Verifica el formato.", "error");
    } finally {
      setCargandoBulk(false);
    }
  };

  const procesarExcelDirecto = async () => {
    if (!textoExcelDirecto.trim()) return mostrarMensaje("Por favor, pega datos primero.", "error");
    setCargandoDirecto(true);
    
    try {
      let tratamientosLocales = [...listaTratamientos];
      const lineas = textoExcelDirecto.split(/\r?\n/);
      let promesas = [];
      let registrosGuardados = 0;

      for (const linea of lineas) {
        if (!linea.trim()) continue;
        const columnas = linea.split("\t");
        if (columnas.length < 3) continue;

        const tratNombre = columnas[0].trim();
        const repeticionStr = columnas[1].trim().replace(/\D/g, ''); 
        const repeticion = parseInt(repeticionStr);
        const valor = parseFloat(columnas[2].trim().replace(",", "."));

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
            experimento: parseInt(expId), variable: parseInt(varId),
            tratamiento: tratamientoId, repeticion: repeticion, valor: valor
          }, getAuthHeaders())
        );
        registrosGuardados++;
      }

      await Promise.all(promesas);

      mostrarMensaje(`✅ ¡Éxito! Se guardaron ${registrosGuardados} registros directamente.`, "exito");
      setTextoExcelDirecto(""); setMostrarPegarDirecto(false); cargarDatos();
    } catch (error) {
      console.error("Error al importar registros directos:", error);
      mostrarMensaje("❌ Hubo un error al guardar los registros. Verifica que el formato sea el correcto.", "error");
    } finally {
      setCargandoDirecto(false);
    }
  };

  // FUNCIONES DE SELECCIÓN Y ELIMINACIÓN MÚLTIPLE
  const toggleSeleccion = (id) => {
    if (seleccionados.includes(id)) {
      setSeleccionados(seleccionados.filter(itemId => itemId !== id));
    } else {
      setSeleccionados([...seleccionados, id]);
    }
  };

  const toggleSeleccionarTodos = () => {
    if (seleccionados.length === listaValores.length && listaValores.length > 0) {
      setSeleccionados([]); // Desmarcar todos
    } else {
      setSeleccionados(listaValores.map(dato => dato.id)); // Marcar todos
    }
  };

  const eliminarSeleccionados = async () => {
    const rolUsuario = (localStorage.getItem("rol") || localStorage.getItem("role") || "").toLowerCase();

    if (rolUsuario !== "docente") {
      return mostrarMensaje("⛔ Acceso Denegado: Solo el Docente tiene permisos para eliminar registros.", "error");
    }

    if (seleccionados.length === 0) return;

    if (!window.confirm(`¿Estás seguro de eliminar los ${seleccionados.length} registros seleccionados de forma permanente?`)) return;

    setCargando(true);
    try {
      const promesasEliminar = seleccionados.map(id => 
        axios.delete(`https://agro-utc.onrender.com/api/valores/${id}/`, getAuthHeaders())
      );
      
      await Promise.all(promesasEliminar);
      
      mostrarMensaje(`🗑️ ${seleccionados.length} registros eliminados correctamente.`, "exito");
      setSeleccionados([]);
      cargarDatos();
    } catch (error) {
      console.error("Error al eliminar múltiples registros:", error);
      mostrarMensaje("❌ Ocurrió un error al intentar eliminar los registros seleccionados.", "error");
    } finally {
      setCargando(false);
    }
  };

  const eliminarDatoIndividual = async (id) => {
    const rolUsuario = (localStorage.getItem("rol") || localStorage.getItem("role") || "").toLowerCase();

    if (rolUsuario !== "docente") {
      return mostrarMensaje("⛔ Acceso Denegado: Solo el Docente tiene permisos para eliminar registros.", "error");
    }

    if (!window.confirm("¿Estás seguro de eliminar este registro?")) return;
    try {
      await axios.delete(`https://agro-utc.onrender.com/api/valores/${id}/`, getAuthHeaders());
      mostrarMensaje("🗑️ Registro eliminado correctamente.", "exito");
      // Si estaba seleccionado, lo quitamos de la lista
      setSeleccionados(seleccionados.filter(itemId => itemId !== id));
      cargarDatos();
    } catch (error) {
      console.error("Error al eliminar:", error);
      mostrarMensaje("❌ No se pudo eliminar el registro.", "error");
    }
  };

  const limpiarCampos = () => {
    setTratamiento("");
    setErrorTratamiento(""); 
    setAdvertenciaCamposVacios(false);
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

      {mensajeSistema.texto && (
        <div style={{
          padding: "12px",
          marginBottom: "20px",
          borderRadius: "6px",
          fontWeight: "bold",
          textAlign: "center",
          backgroundColor: mensajeSistema.tipo === "error" ? "#ffebee" : "#e8f5e9",
          color: mensajeSistema.tipo === "error" ? "#c62828" : "#2e7d32",
          border: `1px solid ${mensajeSistema.tipo === "error" ? "#ef9a9a" : "#a5d6a7"}`
        }}>
          {mensajeSistema.texto}
        </div>
      )}

      {/* FORMULARIO MANUAL */}
      <div style={{ backgroundColor: "#f8f9fa", padding: "15px", borderRadius: "8px", border: "1px solid #e0e0e0", marginBottom: "20px", overflowX: "auto" }}>
        
        <div style={{ marginBottom: "15px", width: "300px" }}>
          <label style={{ display: "block", color: "#0277bd", fontWeight: "bold", fontSize: "14px", marginBottom: "5px" }}>Tratamiento (Ej. T1):</label>
          <input 
            type="text" 
            value={tratamiento} 
            maxLength={12}
            onChange={handleTratamientoChange} 
            list="trat-list" 
            style={{ 
              width: "100%", padding: "8px", borderRadius: "4px", 
              border: errorTratamiento ? "2px solid #d32f2f" : "1px solid #ccc", outline: "none"
            }} 
          />
          <datalist id="trat-list">{listaTratamientos.map(t => <option key={t.id} value={t.nombre} />)}</datalist>
          
          {errorTratamiento && (
            <span style={{ color: "#d32f2f", fontSize: "12px", marginTop: "4px", display: "block", fontWeight: "500" }}>{errorTratamiento}</span>
          )}
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
                    <input 
                      type="number" min="0" step="0.01" value={valor} 
                      onChange={(e) => handleValorChange(pIndex, rIndex, e.target.value)} 
                      style={{ width: "100%", padding: "4px", boxSizing: "border-box", textAlign: "center", border: "1px solid #ccc", borderRadius: "3px" }} 
                    />
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

      {/* BOTONERA PRINCIPAL */}
      <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", flexWrap: "wrap", marginBottom: "30px" }}>
        <button onClick={() => setMostrarPegar(!mostrarPegar)} style={{ padding: "8px 16px", backgroundColor: "#e0f2f1", color: "#004d40", border: "1px solid #004d40", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>📋 Importar Matriz Excel</button>
        <button onClick={guardarDatosPromediados} disabled={cargando} style={{ padding: "8px 16px", backgroundColor: "#2e7d32", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>{cargando ? "Guardando..." : "Guardar Formulario"}</button>
        <button onClick={limpiarCampos} style={{ padding: "8px 16px", backgroundColor: "#757575", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>Limpiar</button>
        <button onClick={() => setMostrarAnalisis(!mostrarAnalisis)} style={{ padding: "8px 16px", backgroundColor: "#0288d1", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>📊 Ver Análisis</button>
      </div>

      {/* ENCABEZADO Y REGISTROS DIRECTOS */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #eee", paddingBottom: "10px", marginBottom: "15px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <h4 style={{ color: "#424242", margin: 0 }}>Registros en Base de Datos</h4>
          {seleccionados.length > 0 && (
            <button onClick={eliminarSeleccionados} disabled={cargando} style={{ padding: "6px 12px", backgroundColor: "#d32f2f", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}>
              {cargando ? "Eliminando..." : `🗑️ Eliminar Seleccionados (${seleccionados.length})`}
            </button>
          )}
        </div>
        <button onClick={() => setMostrarPegarDirecto(!mostrarPegarDirecto)} style={{ padding: "6px 12px", backgroundColor: "#00897b", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}>
          📋 Pegar Datos Directos
        </button>
      </div>

      {/* TABLA DE BASE DE DATOS */}
      <div style={{ maxHeight: "350px", overflowY: "auto", border: "1px solid #ddd", borderRadius: "8px" }}>
        <table className="sql-table" style={{ margin: 0, width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ position: "sticky", top: 0, backgroundColor: "#f4f7f6", zIndex: 1, boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
            <tr>
              <th style={{padding: "10px", borderBottom: "2px solid #ddd", textAlign: "center", width: "50px"}}>
                <input 
                  type="checkbox" 
                  checked={listaValores.length > 0 && seleccionados.length === listaValores.length}
                  onChange={toggleSeleccionarTodos}
                  style={{ cursor: "pointer", width: "16px", height: "16px" }}
                  title="Seleccionar todos"
                />
              </th>
              <th style={{padding: "10px", borderBottom: "2px solid #ddd", textAlign: "left"}}>Tratamiento</th>
              <th style={{padding: "10px", borderBottom: "2px solid #ddd", textAlign: "left"}}>Repetición (R)</th>
              <th style={{padding: "10px", borderBottom: "2px solid #ddd", textAlign: "left"}}>Valor (Promedio)</th>
              <th style={{padding: "10px", borderBottom: "2px solid #ddd", textAlign: "center"}}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {listaValores.map((dato) => (
              <tr key={dato.id} style={{ backgroundColor: seleccionados.includes(dato.id) ? "#fff3e0" : "transparent" }}>
                <td style={{padding: "10px", borderBottom: "1px solid #eee", textAlign: "center"}}>
                  <input 
                    type="checkbox" 
                    checked={seleccionados.includes(dato.id)}
                    onChange={() => toggleSeleccion(dato.id)}
                    style={{ cursor: "pointer", width: "16px", height: "16px" }}
                  />
                </td>
                <td style={{padding: "10px", borderBottom: "1px solid #eee"}}>{obtenerNombreTratamiento(dato.tratamiento)}</td>
                <td style={{padding: "10px", borderBottom: "1px solid #eee"}}>R{dato.repeticion}</td>
                <td style={{padding: "10px", borderBottom: "1px solid #eee", fontWeight: "bold"}}>{dato.valor}</td>
                <td style={{padding: "10px", borderBottom: "1px solid #eee", textAlign: "center"}}>
                  <button onClick={() => eliminarDatoIndividual(dato.id)} style={{ padding: "4px 8px", backgroundColor: "#ffebee", color: "#c62828", border: "1px solid #ffcdd2", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {listaValores.length === 0 && (
              <tr><td colSpan="5" style={{textAlign:"center", padding: "15px"}}>No hay datos registrados aún.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {mostrarAnalisis && listaValores.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <AnalisisEstadistico 
            valores={listaValores} tratamientos={listaTratamientos} nombreCultivo={nombreCultivo} 
            nombreVariable={nombreVariable} nombreLote={nombreLote} anio={anio}
          />
        </div>
      )}
    </div>
  );
}

export default VariableForm;
