import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom"; 
import API from "../services/api"; 
import Navbar from "../components/Navbar";
import "./Cultivos.css"; 

function RegisterData() {
  const { id } = useParams(); 
  const [variables, setVariables] = useState([]);
  const [nombre, setNombre] = useState("");
  
  const [editandoId, setEditandoId] = useState(null);
  const [filaSeleccionada, setFilaSeleccionada] = useState(null);
  
  // NUEVO: Estado para manejar los mensajes de error visuales
  const [errorMsg, setErrorMsg] = useState("");
  
  const navigate = useNavigate();

  const getVariables = async () => {
    try {
      const res = await API.get("variables/"); 
      setVariables(res.data);
    } catch (error) {
      console.error("Error al cargar variables:", error);
    }
  };

  const guardarVariable = async () => {
    // Limpiamos errores previos
    setErrorMsg("");
    
    const nombreNormalizado = nombre.trim();
    
    // VALIDACIÓN 1: Campo vacío
    if (!nombreNormalizado) {
      return setErrorMsg("El nombre de la variable es obligatorio.");
    }

    // VALIDACIÓN 2: Solo letras y espacios
    const soloLetrasRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    if (!soloLetrasRegex.test(nombreNormalizado)) {
      return setErrorMsg("El nombre solo puede contener letras y espacios.");
    }

    try {
      if (editandoId) {
        await API.put(`variables/${editandoId}/`, { 
          nombre: nombreNormalizado
        });
        setEditandoId(null);
      } else {
        await API.post("variables/", { 
          nombre: nombreNormalizado
        });
      }
      
      setNombre("");
      setFilaSeleccionada(null);
      getVariables(); 
    } catch (error) {
      console.error("Error al guardar:", error);
      setErrorMsg("Error al guardar la variable en el servidor.");
    }
  };

  const eliminarVariable = async (varId) => {
    // Nota: Mantenemos el confirm para la eliminación por seguridad, 
    // ya que es una acción destructiva muy delicada.
    if (window.confirm("¿Seguro que deseas eliminar esta variable? Se borrarán todos sus datos registrados.")) {
      try {
        await API.delete(`variables/${varId}/`);
        if (editandoId === varId) cancelarEdicion();
        getVariables();
      } catch (error) {
        setErrorMsg("Error al eliminar la variable.");
      }
    }
  };

  const prepararEdicion = (variable) => {
    setErrorMsg(""); // Limpiar errores al cambiar de modo
    setNombre(variable.nombre);
    setEditandoId(variable.id);
    setFilaSeleccionada(variable.id);
  };

  const cancelarEdicion = () => {
    setErrorMsg(""); // Limpiar errores
    setEditandoId(null);
    setNombre("");
    setFilaSeleccionada(null);
  };

  useEffect(() => {
    getVariables();
  }, []);

  return (
    <div className="page-container">
      <Navbar />

      <div className="main-container">
        
        <div className="header-container">
          <button className="btn-back" onClick={() => navigate(-1)}>
            ⬅ Regresar
          </button>
          <h3>📈 Gestión de Variables</h3>
        </div>

        <div className="table-wrapper">
          <table className="sql-table">
            <thead>
              <tr>
                <th>Nombre de la Variable</th>
                <th style={{ textAlign: "center", width: "250px" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {variables.length === 0 ? (
                <tr><td colSpan="2" style={{textAlign: "center", padding: "20px"}}>No hay variables registradas en el catálogo.</td></tr>
              ) : (
                variables.map((v) => (
                  <tr 
                    key={v.id} 
                    className={filaSeleccionada === v.id ? "row-selected" : ""}
                    onClick={() => setFilaSeleccionada(v.id)}
                  >
                    <td style={{ fontWeight: "bold", color: "#0277bd" }}>{v.nombre}</td>
                    <td style={{ textAlign: "center" }}>
                      <div className="table-actions">
                        <button 
                          onClick={(e) => { e.stopPropagation(); navigate(`/experimento/${id}/variable/${v.id}`); }} 
                          className="btn-table btn-enter"
                          title="Ingresar valores para esta variable"
                        >
                          Entrar
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); prepararEdicion(v); }} 
                          className="btn-table btn-edit"
                        >
                          Editar
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); eliminarVariable(v.id); }} 
                          className="btn-table btn-delete-sm"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="form-card">
          <div className="form-grid-single">
            <label className="form-label">Nombre de la Variable:</label>
            
            {/* NUEVO: Mensaje de error en letras rojas */}
            {errorMsg && (
              <p style={{ color: "#d32f2f", fontSize: "14px", fontWeight: "bold", margin: "0 0 10px 0" }}>
                ⚠️ {errorMsg}
              </p>
            )}

            <input 
              type="text" 
              className="form-input" 
              value={nombre} 
              maxLength={12} // Límite estricto de 12 caracteres
              onChange={(e) => {
                const val = e.target.value;
                if (/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/.test(val)) {
                  setNombre(val);
                  setErrorMsg(""); // Limpiar el error si el usuario empieza a escribir bien
                }
              }} 
              placeholder="Ej. Altura, Peso..."
            />
            <small style={{ color: "#666", fontSize: "12px", marginTop: "5px", display: "block" }}>
              Máximo 12 caracteres. Letras y espacios únicamente.
            </small>
          </div>

          <div className="action-buttons">
            <button onClick={guardarVariable} className="btn btn-add">
              {editandoId ? "Actualizar" : "Agregar Variable"}
            </button>
            {editandoId && (
              <button onClick={cancelarEdicion} className="btn btn-clear">
                Cancelar
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default RegisterData;