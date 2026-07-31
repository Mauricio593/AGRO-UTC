import { useState, useEffect } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import { getAuthHeaders } from "../services/auth";

// Importamos ambos logos
import logo from "../api/logop.png"; 
import logox from "../api/logox.png"; // <-- Ajusta a .png si es necesario

import "./Dashboard.css";

function Dashboard() {
  const [usuario, setUsuario] = useState("");

  const [stats, setStats] = useState({
    cultivos: 0,
    mediciones: 0,
    experimentos: 0,
    tratamientos: 0
  });

  useEffect(() => {
    const nombreUsuario = localStorage.getItem("username") || "Investigador"; 
    setUsuario(nombreUsuario);

    const cargarEstadisticas = async () => {
      try {
        const headers = getAuthHeaders();
        
        const [resCultivos, resValores, resExperimentos, resTratamientos] = await Promise.all([
          axios.get("http://127.0.0.1:8000/api/cultivos/", headers).catch(() => ({ data: [] })),
          axios.get("http://127.0.0.1:8000/api/valores/", headers).catch(() => ({ data: [] })),
          axios.get("http://127.0.0.1:8000/api/experimentos/", headers).catch(() => ({ data: [] })),
          axios.get("http://127.0.0.1:8000/api/tratamientos/", headers).catch(() => ({ data: [] }))
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
        {/* Usamos flexbox en el CSS para alinear estos 3 elementos */}
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
            <p> anomalías en línea</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;