import { useState, useEffect } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import { getAuthHeaders } from "../services/auth";

// Importamos los logos de la institución
import logo from "../api/logop.png";
import logox from "../api/logox.png";

import "./Dashboard.css";

function Dashboard() {
  const [usuario, setUsuario] = useState("");

  // Estado para gestionar las tarjetas informativas superiores
  const [stats, setStats] = useState({
    cultivos: 0,
    mediciones: 0,
    experimentos: 0,
    tratamientos: 0
  });

  // Estado para almacenar las mediciones reales obtenidas del backend
  const [medicionesRecientes, setMedicionesRecientes] = useState([]);

  useEffect(() => {
    // Recuperamos el nombre del usuario logueado desde el almacenamiento local
    const nombreUsuario = localStorage.getItem("username") || "Investigador";
    setUsuario(nombreUsuario);

    const cargarDatos = async () => {
      try {
        const headers = getAuthHeaders();
        
        // Ejecutamos las peticiones simultáneas a la API
        const [resCultivos, resValores, resExperimentos, resTratamientos] = await Promise.all([
          axios.get("https://agro-utc.onrender.com/api/cultivos/", headers).catch(() => ({ data: [] })),
          axios.get("https://agro-utc.onrender.com/api/valores/", headers).catch(() => ({ data: [] })),
          axios.get("https://agro-utc.onrender.com/api/experimentos/", headers).catch(() => ({ data: [] })),
          axios.get("https://agro-utc.onrender.com/api/tratamientos/", headers).catch(() => ({ data: [] }))
        ]);

        // Actualizamos los contadores de las tarjetas
        setStats({
          cultivos: resCultivos.data.length || 0,
          mediciones: resValores.data.length || 0,
          experimentos: resExperimentos.data.length || 0,
          tratamientos: resTratamientos.data.length || 0
        });

        // Extraemos y guardamos las últimas 5 mediciones reales
        const dataValores = resValores.data || [];
        setMedicionesRecientes(dataValores.slice(0, 5));

      } catch (error) {
        console.error("Hubo un error al cargar los datos del dashboard:", error);
      }
    };

    cargarDatos();
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

        {/* Sección de Tarjetas de Resumen */}
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

        {/* Sección de Tabla de Mediciones Real */}
        <div className="dashboard-bottom">
          <div className="activity-section" style={{ width: "100%" }}>
            <h3 className="section-title">📊 Últimas Mediciones Registradas</h3>
            <table className="activity-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>ID Exp.</th>
                  <th style={{ textAlign: "left" }}>Tratamiento</th>
                  <th style={{ textAlign: "left" }}>Variable</th>
                  <th style={{ textAlign: "left" }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {medicionesRecientes.length > 0 ? (
                  medicionesRecientes.map((item, index) => (
                    <tr key={index}>
                      <td style={{ fontWeight: "bold" }}>
                        {item.experimento?.nombre || item.experimento || "N/A"}
                      </td>
                      <td>
                        {item.tratamiento?.nombre || item.tratamiento || "N/A"}
                      </td>
                      <td style={{ color: "#555" }}>
                        {item.variable?.nombre || item.variable || "N/A"}
                      </td>
                      <td style={{ color: "#e67e22", fontWeight: "bold" }}>
                        {item.valor}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center", padding: "30px", color: "#888" }}>
                      No se encontraron mediciones registradas en el servidor.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}

export default Dashboard;