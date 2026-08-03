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

  // Estados para almacenar los datos reales obtenidos del backend
  const [cultivos, setCultivos] = useState([]);
  const [variables, setVariables] = useState([]);

  useEffect(() => {
    // Recuperamos el nombre del usuario logueado desde el localStorage
    const nombreUsuario = localStorage.getItem("username") || "Investigador";
    setUsuario(nombreUsuario);

    const cargarDatos = async () => {
      try {
        const headers = getAuthHeaders();
        
        // Peticiones simultáneas a la API (incluyendo variables)
        const [resCultivos, resValores, resExperimentos, resTratamientos, resVariables] = await Promise.all([
          axios.get("https://agro-utc.onrender.com/api/cultivos/", headers).catch(() => ({ data: [] })),
          axios.get("https://agro-utc.onrender.com/api/valores/", headers).catch(() => ({ data: [] })),
          axios.get("https://agro-utc.onrender.com/api/experimentos/", headers).catch(() => ({ data: [] })),
          axios.get("https://agro-utc.onrender.com/api/tratamientos/", headers).catch(() => ({ data: [] })),
          axios.get("https://agro-utc.onrender.com/api/variables/", headers).catch(() => ({ data: [] }))
        ]);

        // Actualizamos los contadores de las tarjetas superiores
        setStats({
          cultivos: resCultivos.data.length || 0,
          mediciones: resValores.data.length || 0,
          experimentos: resExperimentos.data.length || 0,
          tratamientos: resTratamientos.data.length || 0
        });

        // Guardamos las listas completas para las dos tablas
        setCultivos(resCultivos.data || []);
        setVariables(resVariables.data || []);

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

        {/* Sección Inferior: Dos Tablas Lado a Lado */}
        <div className="dashboard-bottom" style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
          
          {/* TABLA 1: CULTIVOS REGISTRADOS */}
          <div className="activity-section" style={{ flex: "1", minWidth: "280px" }}>
            <h3 className="section-title">🌿 Cultivos Registrados</h3>
            <table className="activity-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Nombre del Cultivo</th>
                </tr>
              </thead>
              <tbody>
                {cultivos.length > 0 ? (
                  cultivos.map((item, index) => (
                    <tr key={item.id || index}>
                      <td style={{ fontWeight: "bold", padding: "12px 15px" }}>
                        {item.nombre}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td style={{ textAlign: "center", padding: "20px", color: "#888" }}>
                      No hay cultivos registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* TABLA 2: VARIABLES REGISTRADAS */}
          <div className="activity-section" style={{ flex: "1", minWidth: "280px" }}>
            <h3 className="section-title">📊 Variables Registradas</h3>
            <table className="activity-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Nombre de la Variable</th>
                </tr>
              </thead>
              <tbody>
                {variables.length > 0 ? (
                  variables.map((item, index) => (
                    <tr key={item.id || index}>
                      <td style={{ fontWeight: "bold", padding: "12px 15px" }}>
                        {item.nombre}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td style={{ textAlign: "center", padding: "20px", color: "#888" }}>
                      No hay variables registradas.
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