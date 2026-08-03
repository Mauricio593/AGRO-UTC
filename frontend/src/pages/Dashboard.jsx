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

  // Estado para almacenar los cultivos recientes obtenidos del backend
  const [cultivosRecientes, setCultivosRecientes] = useState([]);

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

        // Extraemos y guardamos los últimos cultivos registrados
        const dataCultivos = resCultivos.data || [];
        setCultivosRecientes(dataCultivos.slice(0, 5));

      } catch (error) {
        console.error("Hubo un error al cargar los datos del dashboard:", error);
      }
    };

    cargarDatos();
  }, []);

  // Función auxiliar para extraer el mes y el año de una fecha
  const obtenerMesYAno = (fechaString) => {
    if (!fechaString) return { mes: "N/A", ano: "N/A" };
    
    const fecha = new Date(fechaString);
    // Extraemos el mes en texto (ej. "agosto") y lo ponemos en mayúscula inicial
    const mesTexto = fecha.toLocaleString('es-ES', { month: 'long' });
    const mesCapitalizado = mesTexto.charAt(0).toUpperCase() + mesTexto.slice(1);
    
    return {
      mes: mesCapitalizado,
      ano: fecha.getFullYear()
    };
  };

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

        {/* Sección de Tabla de Cultivos */}
        <div className="dashboard-bottom">
          <div className="activity-section" style={{ width: "100%" }}>
            <h3 className="section-title">🌱 Cultivos Registrados</h3>
            <table className="activity-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Nombre del Cultivo</th>
                  <th style={{ textAlign: "left" }}>Mes</th>
                  <th style={{ textAlign: "left" }}>Año</th>
                </tr>
              </thead>
              <tbody>
                {cultivosRecientes.length > 0 ? (
                  cultivosRecientes.map((item, index) => {
                    // Usamos la función auxiliar. Verifica cómo se llama tu campo de fecha en la BD 
                    // (puede ser fecha_inicio, created_at, fecha, etc.)
                    const fechaBase = item.fecha_inicio || item.created_at || item.fecha;
                    const { mes, ano } = obtenerMesYAno(fechaBase);

                    return (
                      <tr key={index}>
                        <td style={{ fontWeight: "bold" }}>
                          {item.nombre || `Cultivo #${item.id || index + 1}`}
                        </td>
                        <td style={{ color: "#555", textTransform: "capitalize" }}>
                          {mes}
                        </td>
                        <td style={{ color: "#2c3e50", fontWeight: "bold" }}>
                          {ano}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="3" style={{ textAlign: "center", padding: "30px", color: "#888" }}>
                      No se encontraron cultivos registrados en el servidor.
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