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

  // Estado para las tarjetas superiores
  const [stats, setStats] = useState({
    cultivos: 0,
    mediciones: 0,
    experimentos: 0,
    tratamientos: 0
  });

  // Estado para almacenar los datos reales de la base de datos
  const [actividades, setActividades] = useState([]);

  useEffect(() => {
    // Obtenemos el nombre del usuario activo
    const nombreUsuario = localStorage.getItem("username") || "Investigador";
    setUsuario(nombreUsuario);

    const cargarDatos = async () => {
      try {
        const headers = getAuthHeaders();
        
        // Hacemos todas las peticiones al mismo tiempo
        const [resCultivos, resValores, resExperimentos, resTratamientos, resAccesos] = await Promise.all([
          axios.get("https://agro-utc.onrender.com/api/cultivos/", headers).catch(() => ({ data: [] })),
          axios.get("https://agro-utc.onrender.com/api/valores/", headers).catch(() => ({ data: [] })),
          axios.get("https://agro-utc.onrender.com/api/experimentos/", headers).catch(() => ({ data: [] })),
          axios.get("https://agro-utc.onrender.com/api/tratamientos/", headers).catch(() => ({ data: [] })),
          axios.get("https://agro-utc.onrender.com/api/accesos/", headers).catch((err) => {
            console.error("Error en petición de accesos:", err);
            return { data: [] };
          })
        ]);

        // Actualizamos los contadores
        setStats({
          cultivos: resCultivos.data.length || 0,
          mediciones: resValores.data.length || 0,
          experimentos: resExperimentos.data.length || 0,
          tratamientos: resTratamientos.data.length || 0
        });

        // --- LÓGICA MEJORADA PARA EXTRAER LOS ACCESOS ---
        const dataAccesos = resAccesos.data;
        console.log("Respuesta del servidor para accesos:", dataAccesos); // <- Te ayudará a depurar

        let listaAccesos = [];
        
        // Verificamos en qué formato viene la respuesta para extraer el arreglo correctamente
        if (Array.isArray(dataAccesos)) {
          listaAccesos = dataAccesos;
        } else if (dataAccesos && Array.isArray(dataAccesos.accesos)) {
          listaAccesos = dataAccesos.accesos;
        } else if (dataAccesos && Array.isArray(dataAccesos.results)) {
          listaAccesos = dataAccesos.results;
        }

        // Guardamos los últimos accesos (limitamos a los 5 más recientes)
        setActividades(listaAccesos.slice(0, 5));

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

        <div className="dashboard-bottom">
          
          {/* Hemos agregado style={{ width: "100%" }} para que ocupe todo el espacio libre */}
          <div className="activity-section" style={{ width: "100%" }}>
            <h3 className="section-title">🕒 Actividad Reciente</h3>
            <table className="activity-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Evento</th>
                  <th style={{ textAlign: "left" }}>Usuario</th>
                  <th style={{ textAlign: "left" }}>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {/* Mostramos los datos reales iterando sobre el estado 'actividades' */}
                {actividades.length > 0 ? (
                  actividades.map((item, index) => (
                    <tr key={index}>
                      <td>Inicio de sesión en el sistema</td>
                      <td style={{ fontWeight: "bold" }}>
                        {/* Buscamos el nombre del usuario en diferentes posibles propiedades */}
                        {item.usuario?.username || item.usuario || item.username || "Usuario"}
                      </td>
                      <td style={{ color: "#777" }}>
                        {item.fecha_ingreso ? new Date(item.fecha_ingreso).toLocaleString("es-ES", {
                          day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit'
                        }) : "Fecha desconocida"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" style={{ textAlign: "center", padding: "30px", color: "#888" }}>
                      No se encontraron registros de actividad reciente en el servidor.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* SE ELIMINÓ LA SECCIÓN DE "ESTADO DEL SISTEMA" */}

        </div>

      </main>
    </div>
  );
}

export default Dashboard;