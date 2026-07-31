import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom"; 
import API from "../services/api"; 
import Navbar from "../components/Navbar";
import "./Cultivos.css"; 

function RegisterData() {
  const { id } = useParams(); // ID del EXPERIMENTO (Lo extraemos de la URL actual)
  const [variables, setVariables] = useState([]);
  const [nombre, setNombre] = useState("");
  
  // Estados para controlar la edición y el diseño visual
  const [editandoId, setEditandoId] = useState(null);
  const [filaSeleccionada, setFilaSeleccionada] = useState(null);
  
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
    const nombreNormalizado = nombre.trim();
    if (!nombreNormalizado) return alert("Escribe un nombre para la variable.");

    // ✅ VALIDACIÓN EXTRA AL GUARDAR: Bloquea si detecta números o símbolos pegados
    const soloLetrasRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    if (!soloLetrasRegex.test(nombreNormalizado)) {
      return alert("❌ Error: El nombre de la variable solo puede contener letras y espacios. No se permiten números.");
    }

    try {
      if (editandoId) {
        // ACTUALIZAR (PUT)
        await API.put(`variables/${editandoId}/`, { 
          nombre: nombreNormalizado
        });
        setEditandoId(null);
      } else {
        // CREAR (POST)
        await API.post("variables/", { 
          nombre: nombreNormalizado
        });
      }
      
      setNombre("");
      setFilaSeleccionada(null);
      getVariables(); 
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Error al guardar la variable.");
    }
  };

  const eliminarVariable = async (varId) => {
    if (window.confirm("¿Seguro que deseas eliminar esta variable? Se borrarán todos sus datos registrados.")) {
      try {
        await API.delete(`variables/${varId}/`);
        if (editandoId === varId) cancelarEdicion();
        getVariables();
      } catch (error) {
        alert("Error al eliminar.");
      }
    }
  };

  // Funciones para manejar la edición
  const prepararEdicion = (variable) => {
    setNombre(variable.nombre);
    setEditandoId(variable.id);
    setFilaSeleccionada(variable.id);
  };

  const cancelarEdicion = () => {
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
        
        {/* ENCABEZADO CON BOTÓN DE REGRESAR */}
        <div className="header-container">
          <button className="btn-back" onClick={() => navigate(-1)}>
            ⬅ Regresar
          </button>
          <h3>📈 Gestión de Variables</h3>
        </div>

        {/* TABLA ESTILO SQL */}
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

        {/* FORMULARIO DE DETALLES */}
        <div className="form-card">
          <div className="form-grid-single">
            <label className="form-label">Nombre de la Variable:</label>
            <input 
              type="text" 
              className="form-input" 
              value={nombre} 
              /* ✅ VALIDACIÓN AL ESCRIBIR: Solo deja teclear letras y espacios */
              onChange={(e) => {
                const val = e.target.value;
                if (/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/.test(val)) {
                  setNombre(val);
                }
              }} 
              placeholder="Ej. Altura, Rendimiento, Peso..."
            />
          </div>

          {/* BOTONES DE ACCIÓN DEL FORMULARIO */}
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