import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom"; 
import API from "../services/api"; 
import Navbar from "../components/Navbar";
import "./Cultivos.css"; // Reutilizamos los mismos estilos de la app

function Experimentos() {
  const { id } = useParams(); // ID del LOTE padre
  const [experimentos, setExperimentos] = useState([]);
  
  // Usamos 'anio' como pide tu modelo
  const [anio, setAnio] = useState(""); 
  
  // Estados para controlar la edición y el diseño visual
  const [editandoId, setEditandoId] = useState(null);
  const [filaSeleccionada, setFilaSeleccionada] = useState(null);
  
  const navigate = useNavigate();

  const getExperimentos = async () => {
    try {
      const res = await API.get(`experimentos/?unidad=${id}`); 
      setExperimentos(res.data);
    } catch (error) {
      console.error("Error al cargar experimentos:", error);
    }
  };

  const guardarExperimento = async () => {
    if (!anio) return alert("Escribe un año válido.");

    try {
      if (editandoId) {
        // ACTUALIZAR (PUT)
        await API.put(`experimentos/${editandoId}/`, { 
          anio: parseInt(anio),
          unidad: parseInt(id) 
        });
        setEditandoId(null);
      } else {
        // CREAR (POST)
        await API.post("experimentos/", { 
          anio: parseInt(anio),
          unidad: parseInt(id) 
        });
      }
      setAnio("");
      setFilaSeleccionada(null);
      getExperimentos(); 
    } catch (error) {
      console.error("Error devuelto por Django:", error.response?.data);
      alert("Error al guardar el experimento.");
    }
  };

  const eliminarExperimento = async (expId) => {
    if (window.confirm("¿Seguro que deseas eliminar esta campaña/experimento?")) {
      try {
        await API.delete(`experimentos/${expId}/`);
        if (editandoId === expId) cancelarEdicion();
        getExperimentos();
      } catch (error) {
        alert("Error al eliminar.");
      }
    }
  };

  // Funciones para manejar el formulario al hacer clic en "Editar"
  const prepararEdicion = (exp) => {
    setAnio(exp.anio);
    setEditandoId(exp.id);
    setFilaSeleccionada(exp.id);
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setAnio("");
    setFilaSeleccionada(null);
  };

  useEffect(() => {
    getExperimentos();
  }, [id]);

  return (
    <div className="page-container">
      <Navbar />

      <div className="main-container">
        
        {/* ENCABEZADO CON BOTÓN DE REGRESAR */}
        <div className="header-container">
          <button className="btn-back" onClick={() => navigate(-1)}>
            ⬅ Regresar
          </button>
          <h3>🧪 Gestión de Experimentos / Campañas</h3>
        </div>

        {/* TABLA ESTILO SQL */}
        <div className="table-wrapper">
          <table className="sql-table">
            <thead>
              <tr>
                <th>Campaña (Año)</th>
                <th style={{ textAlign: "center", width: "250px" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {experimentos.length === 0 ? (
                <tr><td colSpan="2" style={{textAlign: "center", padding: "20px"}}>No hay experimentos registrados en este lote.</td></tr>
              ) : (
                experimentos.map((e) => (
                  <tr 
                    key={e.id} 
                    className={filaSeleccionada === e.id ? "row-selected" : ""}
                    onClick={() => setFilaSeleccionada(e.id)}
                  >
                    <td style={{ fontWeight: "bold", color: "#0277bd" }}>Campaña {e.anio}</td>
                    <td style={{ textAlign: "center" }}>
                      <div className="table-actions">
                        {/* Botón ENTRAR a Variables */}
                        <button 
                          onClick={(evt) => { evt.stopPropagation(); navigate(`/experimento/${e.id}/variables`); }} 
                          className="btn-table btn-enter"
                          title="Ver variables de este experimento"
                        >
                          Entrar
                        </button>
                        {/* Botón EDITAR */}
                        <button 
                          onClick={(evt) => { evt.stopPropagation(); prepararEdicion(e); }} 
                          className="btn-table btn-edit"
                        >
                          Editar
                        </button>
                        {/* Botón ELIMINAR */}
                        <button 
                          onClick={(evt) => { evt.stopPropagation(); eliminarExperimento(e.id); }} 
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
            <label className="form-label">Año de Campaña:</label>
            <input 
              type="number" 
              className="form-input" 
              value={anio} 
              onChange={(e) => setAnio(e.target.value)} 
              placeholder="Ej. 2024"
            />
          </div>

          {/* BOTONES DE ACCIÓN DEL FORMULARIO */}
          <div className="action-buttons">
            <button onClick={guardarExperimento} className="btn btn-add">
              {editandoId ? "Actualizar" : "Agregar Experimento"}
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

export default Experimentos;