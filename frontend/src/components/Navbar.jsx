import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import "./Navbar.css";

function Navbar() {
  const navigate = useNavigate();
  // Estado para controlar si el menú móvil está abierto o cerrado
  const [menuAbierto, setMenuAbierto] = useState(false);
  
  // 🚀 Obtenemos el rol del navegador que guardamos en el Login
  const rolUsuario = localStorage.getItem("rol");

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("rol"); // Limpiamos el rol al salir
    navigate("/");
  };

  // Función para alternar el menú en celulares
  const toggleMenu = () => {
    setMenuAbierto(!menuAbierto);
  };

  // Función para cerrar el menú cuando se hace clic en una opción
  const cerrarMenu = () => {
    setMenuAbierto(false);
  };

  return (
    <div className="navbar">
      <h2>🌱SISTEMA VITROLAB </h2>

      {/* ☰ Icono Hamburguesa (solo visible en celular) */}
      <div className="menu-icon" onClick={toggleMenu}>
        ☰
      </div>

      <div className={`nav-links ${menuAbierto ? "active" : ""}`}>
        <Link to="/dashboard" onClick={cerrarMenu}>Inicio</Link>
        <Link to="/cultivos" onClick={cerrarMenu}>Cultivos</Link>
        <Link to="/analisis" onClick={cerrarMenu}>Análisis</Link>
        <Link to="/knn" onClick={cerrarMenu}>Anomalias</Link>
        <Link to="/reportes" onClick={cerrarMenu}>Reportes</Link>
        
        {/* 👤 RENDERIZADO CONDICIONAL: Solo si es docente */}
        {rolUsuario === "docente" && (
          <Link to="/usuarios" onClick={cerrarMenu}>Usuarios</Link>
        )}
        
        {/* Botón de salir que aparece DENTRO del menú en móviles */}
        <button className="logout-btn mobile-logout" onClick={logout}>
          Salir
        </button>
      </div>

      {/* Botón de salir normal (visible en computadora) */}
      <button className="logout-btn desktop-logout" onClick={logout}>
        Salir
      </button>
    </div>
  );
}

export default Navbar;