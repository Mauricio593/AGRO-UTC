import { useState, useEffect } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import { getAuthHeaders } from "../services/auth";

// Importamos ambos logos
import logo from "../api/logop.png";
import logox from "../api/logox.png";

import "./Dashboard.css";

function Dashboard() {
  const [usuario, setUsuario] = useState("");

  const [stats, setStats] = useState({
    cultivos: 0,
    mediciones: 0,
    experimentos: 0,
    tratamientos: 0
  });

  // Datos simulados (mock data) para la tabla visual
  const actividadesEstaticas = [
    { id: 1, accion: "Registro de medición in vitro", usuario: "Eduardo", fecha: "Hoy, 08:30" },
    { id: 2, accion: "Anomalía detectada (KNN)", usuario: "Sistema", fecha: "Ayer, 14:20" },
    { id: 3, accion: "Nuevo cultivo 'Musa acuminata (Banano)' agregado", usuario: "María", fecha: "2 de Ago, 11:00" }
  ];

  useEffect(() => {
    const nombreUsuario = localStorage.getItem("username") || "Investigador";
    setUsuario(nombreUsuario);

    const cargarEstadisticas = async () => {
      try {
        const headers = getAuthHeaders();
        
        const [resCultivos, resValores, resExperimentos, resTratamientos] = await Promise.all([
          axios.get("https://agro-utc.onrender.com/api/cultivos/", headers).catch(() => ({ data: [] })),
          axios.get("https://agro-utc.onrender.com/api/valores/", headers).catch(() => ({ data: [] })),
          axios.get("https://agro-utc.onrender.com/api/experimentos/", headers).catch(() => ({ data: [] })),
          axios.get("https://agro-utc.onrender.com/api/tratamientos/", headers).catch(() => ({ data: [] }))
        ]);

        setStats({
          cultivos: resCultivos.data.length || 0,
          mediciones: resValores.data.length || 0,
          experimentos: resExperimentos.data.length || 0,
          tratamientos: resTratamientos.data.length || 0
        });
      } catch (error) {
        console.error("Hubo un error al cargar estadísticas:", error);
      }
    };

    cargarEstadisticas();
  }, []);

  return (
    <div className="page-container">
      <Navbar /> 

      <main className="dashboard">
        <header className="dashboard-header">
          <img src={logo} alt="Logo Izquierdo UTC" className="dashboard-logo" /> 

          <div className="header-text">
            <h1>¡Hola, {usuario}! 👋</h1> 
            <p>Panel de Control - Sistema In Vitro Laboratorio UTC Extensión-La Maná-</p> 
          </div>

          <img src={logox} alt="Logo Derecho" className="dashboard-logo" /> 
        </header>

        <div className="cards">
          <div className="card">
            <h3>🌿 Cultivos Totales</h3> 
            <h2 className="stat-number">{stats.cultivos}</h2> 
            <p>Registrados en el sistema</p> 
          </div>

          <div className="card">
            <h3>🧪 Experimentos</h3> 
            <h2 className="stat-number text-blue">{stats.experimentos}</h2> 
            <p>Proyectos en curso</p> 
          </div>

          <div className="card">
            <h3>📋 Tratamientos</h3> 
            <h2 className="stat-number text-purple">{stats.tratamientos}</h2> 
            <p>Variantes aplicadas</p> 
          </div>

          <div className="card">
            <h3>📊 Mediciones</h3> 
            <h2 className="stat-number text-orange">{stats.mediciones}</h2> 
            <p>Datos analizados</p> 
          </div>

          <div className="card knn-card">
            <h3>🤖 Modelo KNN / LOF</h3> 
            <h2 className="stat-number text-success">Activo</h2> 
            <p>anomalías en línea</p> 
          </div>
        </div>

        {/* --- NUEVA SECCIÓN DE ACTIVIDAD Y ESTADO DEL SISTEMA --- */}
        <div className="dashboard-bottom">
          
          <div className="activity-section">
            <h3 className="section-title">🕒 Actividad Reciente</h3>
            <table className="activity-table">
              <thead>
                <tr>
                  <th>Evento</th>
                  <th>Usuario</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {actividadesEstaticas.map((item) => (
                  <tr key={item.id}>
                    <td>{item.accion}</td>
                    <td style={{ fontWeight: "bold" }}>{item.usuario}</td>
                    <td style={{ color: "#777" }}>{item.fecha}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="status-section">
            <h3 className="section-title">🌡️ Estado del Sistema</h3>
            <ul className="status-list">
              <li className="status-item">
                <span><strong>Servidor BD</strong></span>
                <span>En línea 🟢</span>
              </li>
              <li className="status-item">
                <span><strong>Modelo KNN</strong></span>
                <span>Activo 🟢</span>
              </li>
              <li className="status-item">
                <span><strong>Último respaldo</strong></span>
                <span>Hace 2h 🟢</span>
              </li>
            </ul>
          </div>

        </div>

      </main>
    </div>
  );
}

export default Dashboard;