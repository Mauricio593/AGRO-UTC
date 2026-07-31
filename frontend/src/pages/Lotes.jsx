import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom"; 
import API from "../services/api"; 
import Navbar from "../components/Navbar";
import "./Cultivos.css"; // Reutilizamos los estilos del panel moderno

function Lotes() {
  const { id } = useParams(); // ID del CULTIVO padre
  const [lotes, setLotes] = useState([]);
  const [nombre, setNombre] = useState("");
  
  const [editandoId, setEditandoId] = useState(null);
  const [filaSeleccionada, setFilaSeleccionada] = useState(null);
  
  const navigate = useNavigate();

  const getLotes = async () => {
    try {
      // 🎯 Pedimos solo los lotes de ESTE cultivo
      const res = await API.get(`unidades/?cultivo=${id}`); 
      setLotes(res.data);
    } catch (error) {
      console.error("Error al cargar lotes:", error);
    }
  };

  const guardarLote = async () => {
    const nombreNormalizado = nombre.trim();
    if (!nombreNormalizado) return alert("Escribe un nombre para el lote.");

    try {
      if (editandoId) {
        // ACTUALIZAR LOTE
        await API.put(`unidades/${editandoId}/`, { 
          nombre: nombreNormalizado,
          cultivo: parseInt(id)
        });
        setEditandoId(null);
      } else {
        // CREAR LOTE NUEVO
        await API.post("unidades/", { 
          nombre: nombreNormalizado,
          cultivo: parseInt(id) 
        });
      }
      
      setNombre("");
      setFilaSeleccionada(null);
      getLotes(); // Refrescamos la lista
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Error al guardar el lote.");
    }
  };

  const eliminarLote = async (loteId) => {
    if (window.confirm("¿Seguro que deseas eliminar este lote? Todo lo asociado se perderá.")) {
      try {
        await API.delete(`unidades/${loteId}/`);
        if (editandoId === loteId) cancelarEdicion();
        getLotes();
      } catch (error) {
        alert("Error al eliminar.");
      }
    }
  };

  const prepararEdicion = (lote) => {
    setNombre(lote.nombre);
    setEditandoId(lote.id);
    setFilaSeleccionada(lote.id);
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setNombre("");
    setFilaSeleccionada(null);
  };

  useEffect(() => {
    getLotes();
  }, [id]);

  return (
    <div className="panel-layout-page">
      <Navbar />

      <div className="panel-container">
        
        {/* LADO IZQUIERDO: SIDEBAR DE LOTES */}
        <aside className="panel-sidebar">
          <button className="btn-return" onClick={() => navigate(-1)}>
            ⬅ Regresar al Cultivo
          </button>
          
          <div className="sidebar-title">
            <h4>📍 Gestión de Lotes</h4>
            <p>{lotes.length} lotes registrados</p>
          </div>
          
          <div className="item-list">
            {lotes.length === 0 ? (
              <p style={{ textAlign: "center", color: "#888", marginTop: "20px" }}>
                No hay lotes registrados en este cultivo.
              </p>
            ) : (
              lotes.map((l) => (
                <div 
                  key={l.id} 
                  className={`item-card ${filaSeleccionada === l.id ? "active" : ""}`}
                  onClick={() => setFilaSeleccionada(l.id)}
                >
                  <div className="item-info">
                    <span className="item-icon">📍</span>
                    <span className="item-text">{l.nombre}</span>
                  </div>
                  <div className="item-actions">
                    <button onClick={(e) => { e.stopPropagation(); prepararEdicion(l); }} title="Editar Lote">✏️</button>
                    <button onClick={(e) => { e.stopPropagation(); eliminarLote(l.id); }} title="Eliminar Lote">🗑️</button>
                    {/* 🎯 Al hacer clic, viajamos a los experimentos de ESTE lote */}
                    <button onClick={(e) => { e.stopPropagation(); navigate(`/lote/${l.id}/experimentos`); }} title="Ver Experimentos">🔍</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* LADO DERECHO: TARJETA DE GESTIÓN */}
        <main className="panel-main">
          <div className="config-card">
            <div className="config-header">
              <h3>⚙️ Panel de Configuración de Lote</h3>
            </div>
            
            <div className="config-body">
              <p className="description">
                {editandoId 
                  ? "Estás modificando un lote existente. Cambia el nombre y guarda los cambios." 
                  : "Registra un nuevo lote o unidad productiva para este cultivo."}
              </p>

              <div className="input-group-panel">
                <label>Nombre del Lote:</label>
                <input 
                  type="text" 
                  className="panel-input"
                  value={nombre} 
                  onChange={(e) => setNombre(e.target.value)} 
                  placeholder="Ej. Lote Norte, Invernadero 1, Sector A..."
                />
              </div>

              <div className="panel-footer-actions">
                <button 
                  className="btn-panel-clear"
                  onClick={cancelarEdicion}
                >
                  Limpiar / Cancelar
                </button>
                <button 
                  className={`btn-panel-submit ${editandoId ? "update" : "add"}`}
                  onClick={guardarLote}
                >
                  {editandoId ? "Actualizar Lote" : "Agregar Lote"}
                </button>
              </div>
            </div>

            <div className="info-box">
              <p>💡 <strong>Tip de Navegación:</strong> Haz clic en el ícono de la lupa (🔍) en cualquier lote de la lista izquierda para gestionar y visualizar sus experimentos asociados.</p>
            </div>
          </div>
        </main>

      </div>
    </div>
  );
}

export default Lotes;