import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css";

function Navbar() {
  const navigate = useNavigate();
  
  // 🚀 Obtenemos el rol del navegador que guardamos en el Login
  const rolUsuario = localStorage.getItem("rol");

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("rol"); // Limpiamos el rol al salir
    navigate("/");
  };

  return (
    <div className="navbar">
      <h2>🌱SISTEMA VITROLAB </h2>

      <div className="nav-links">
        <Link to="/dashboard">Inicio</Link>
        <Link to="/cultivos">Cultivos</Link>
        <Link to="/analisis">Análisis</Link>
        <Link to="/knn">Anomalias</Link>
        <Link to="/reportes">Reportes</Link>
        
        {/* 👤 RENDERIZADO CONDICIONAL: Solo si es docente */}
        {rolUsuario === "docente" && (
          <Link to="/usuarios">Usuarios</Link>
        )}
      </div>

      <button className="logout-btn" onClick={logout}>
        Salir
      </button>
    </div>
  );
}

export default Navbar;