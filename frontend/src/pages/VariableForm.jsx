import React, { useState, useEffect } from "react";
import API from "../services/api"; // Conexión centralizada
import AnalisisEstadistico from "./AnalisisEstadistico"; 
import "./VariableForm.css"; // Asumiendo que tienes estilos vinculados

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
  const [mostrarPegar, setMostrarPegar] = useState(false);
  const [textoExcel, setTextoExcel] = useState("");
  const [cargandoBulk, setCargandoBulk] = useState(false);

  const cargarDatos = async () => {
    try {
      const resValores = await API.get("valores/");
      const datosFiltrados = resValores.data
        .filter(item => item.variable === parseInt(varId) && item.experimento === parseInt(expId))
        .reverse(); 
      setListaValores(datosFiltrados);

      const resTratamientos = await API.get("tratamientos/");
      setListaTratamientos(resTratamientos.data);
    } catch (error) {
      console.error("Error al cargar los datos:", error);
    }
  };

  useEffect(() => {
    if(expId && varId) cargarDatos();
  }, [varId, expId]);

  const handleValorChange = (plantaIndex, valorIndex, nuevoValor) => {
    const nuevasPlantas = [...plantas];
    nuevasPlantas[plantaIndex].valores[valorIndex] = nuevoValor;
    setPlantas(nuevasPlantas);
  };

  const calcularPromediosRepeticiones = () => {
    return plantas.map(planta => {
      const valoresNumericos = planta.valores
        .map(v => parseFloat(v))
        .filter(v => !isNaN(v));
      
      if (valoresNumericos.length === 0) return "";
      
      const suma = valoresNumericos.reduce((acc, curr) => acc + curr, 0);
      return (suma / valoresNumericos.length).toFixed(2);
    });
  };

  const promediosActuales = calcularPromediosRepeticiones();

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
        const resNuevoTrat = await API.post("tratamientos/", { nombre: tratamiento.trim() });
        tratamientoId = resNuevoTrat.data.id;
      }

      const promesasGuardado = promediosActuales.map((promedio, index) => {
        if (promedio !== "") {
          return API.post("valores/", {
            experimento: parseInt(expId), 
            variable: parseInt(varId),      
            tratamiento: tratamientoId, 
            repeticion: index + 1, 
            valor: parseFloat(promedio)
          });
        }
        return null;
      }).filter(p => p !== null);

      await Promise.all(promesasGuardado);
      alert("✅ ¡Promedios guardados con éxito!");
      limpiarCampos(); 
      cargarDatos(); 
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("❌ Error al guardar. Revisa la consola.");
    } finally {
      setCargando(false);
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

  const procesarExcelMatricial = async () => {
    if (!textoExcel.trim()) return alert("Pega los datos del Excel primero.");
    setCargandoBulk(true);

    try {
      const filas = textoExcel.trim().split("\n");
      const promesas = [];

      for (let i = 0; i < filas.length; i++) {
        const columnas = filas[i].split("\t"); 
        if (columnas.length < 4) continue; 

        const tratNombre = columnas[0].trim();
        const rep1 = parseFloat(columnas[1].replace(',', '.'));
        const rep2 = parseFloat(columnas[2].replace(',', '.'));
        const rep3 = parseFloat(columnas[3].replace(',', '.'));

        if (!tratNombre || isNaN(rep1) || isNaN(rep2) || isNaN(rep3)) continue;

        let tratamientoId = null;
        const tratamientoExistente = listaTratamientos.find(
          (t) => t.nombre.toLowerCase() === tratNombre.toLowerCase()
        );

        if (tratamientoExistente) {
          tratamientoId = tratamientoExistente.id;
        } else {
          const resNuevoTrat = await API.post("tratamientos/", { nombre: tratNombre });
          tratamientoId = resNuevoTrat.data.id;
          setListaTratamientos(prev => [...prev, resNuevoTrat.data]);
        }

        const datosAGuardar = [
          { repeticion: 1, valor: rep1 },
          { repeticion: 2, valor: rep2 },
          { repeticion: 3, valor: rep3 }
        ];

        for (const dato of datosAGuardar) {
          promesas.push(
            API.post("valores/", {
              experimento: parseInt(expId),
              variable: parseInt(varId),
              tratamiento: tratamientoId,
              repeticion: dato.repeticion,
              valor: dato.valor
            })
          );
        }
      }

      await Promise.all(promesas);
      alert("✅ Datos masivos importados con éxito");
      setTextoExcel("");
      setMostrarPegar(false);
      cargarDatos();
    } catch (error) {
      console.error("Error al procesar Excel:", error);
      alert("Error procesando los datos. Revisa el formato.");
    } finally {
      setCargandoBulk(false);
    }
  };

  const eliminarDato = async (id) => {
    if (!window.confirm("¿Estás seguro de eliminar este registro?")) return;
    try {
      await API.delete(`valores/${id}/`);
      alert("🗑️ Registro eliminado.");
      cargarDatos();
    } catch (error) {
      console.error("Error al eliminar:", error);
    }
  };

  const obtenerNombreTratamiento = (id) => {
    const trat = listaTratamientos.find(t => t.id === id);
    return trat ? trat.nombre : "Desconocido";
  };

  if (mostrarAnalisis) {
    return <AnalisisEstadistico 
      datos={listaValores} 
      tratamientos={listaTratamientos}
      onVolver={() => setMostrarAnalisis(false)}
      nombreVariable={nombreVariable}
    />;
  }

  return (
    <div className="variable-form-container">
      
      <div className="form-header">
        <h3>Registrar Datos: {nombreVariable}</h3>
        <p>Cultivo: {nombreCultivo} | Lote: {nombreLote} | Año: {anio}</p>
      </div>

      <div className="actions-bar">
        <button className="btn-toggle" onClick={() => setMostrarPegar(!mostrarPegar)}>
          {mostrarPegar ? "Volver a Ingreso Manual" : "📋 Pegar desde Excel"}
        </button>
        <button className="btn-analisis" onClick={() => setMostrarAnalisis(true)} disabled={listaValores.length === 0}>
          📈 Ver Análisis Estadístico (ANOVA)
        </button>
      </div>

      {mostrarPegar ? (
        <div className="excel-paste-area">
          <p>Pega aquí tus datos copiados desde Excel. El formato debe ser: <strong>Tratamiento | Repeticion 1 | Repeticion 2 | Repeticion 3</strong></p>
          <textarea 
            rows="6" 
            placeholder="Ejemplo:&#10;Tratamiento A&#9;15.2&#9;14.8&#9;15.5&#10;Tratamiento B&#9;12.1&#9;11.9&#9;12.4"
            value={textoExcel}
            onChange={(e) => setTextoExcel(e.target.value)}
          ></textarea>
          <button className="btn-save" onClick={procesarExcelMatricial} disabled={cargandoBulk}>
            {cargandoBulk ? "Procesando..." : "Guardar Datos de Excel"}
          </button>
        </div>
      ) : (
        <div className="manual-entry-area">
          <div className="input-group">
            <label>Nombre del Tratamiento:</label>
            <input 
              type="text" 
              value={tratamiento} 
              onChange={e => setTratamiento(e.target.value)} 
              placeholder="Ej. Medio MS + 2,4-D"
            />
          </div>

          <div className="plantas-grid">
            {plantas.map((planta, pIndex) => (
              <div key={planta.id} className="planta-card">
                <h4>Repetición {planta.id}</h4>
                <div className="valores-grid">
                  {planta.valores.map((val, vIndex) => (
                    <input 
                      key={vIndex}
                      type="number"
                      step="0.01"
                      placeholder={`P${vIndex + 1}`}
                      value={val}
                      onChange={(e) => handleValorChange(pIndex, vIndex, e.target.value)}
                    />
                  ))}
                </div>
                <div className="promedio-display">
                  Promedio: <strong>{promediosActuales[pIndex] || "0.00"}</strong>
                </div>
              </div>
            ))}
          </div>

          <div className="form-footer">
            <button className="btn-clear" onClick={limpiarCampos}>Limpiar Celdas</button>
            <button className="btn-save" onClick={guardarDatosPromediados} disabled={cargando}>
              {cargando ? "Guardando..." : "Guardar Promedios"}
            </button>
          </div>
        </div>
      )}

      <div className="registros-tabla">
        <h4>Registros Guardados</h4>
        {listaValores.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Tratamiento</th>
                <th>Repetición</th>
                <th>Valor Promedio</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {listaValores.map(registro => (
                <tr key={registro.id}>
                  <td>{obtenerNombreTratamiento(registro.tratamiento)}</td>
                  <td>Rep {registro.repeticion}</td>
                  <td>{registro.valor}</td>
                  <td>
                    <button className="btn-delete" onClick={() => eliminarDato(registro.id)}>🗑️ Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="no-data">No hay registros guardados para esta variable.</p>
        )}
      </div>

    </div>
  );
}

export default VariableForm;