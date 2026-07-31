import React, { useState, useEffect } from "react";
import PermisoRol from "../components/PermisoRol";
import Navbar from "../components/Navbar"; 
import API from "../services/api"; 

const GestionUsuarios = ({ usuarioActual }) => {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    obtenerUsuarios();
  }, []);

  const obtenerUsuarios = async () => {
    try {
      setCargando(true);
      const respuesta = await API.get("usuarios/"); 
      setUsuarios(respuesta.data);
    } catch (error) {
      console.error("Error al cargar los usuarios:", error);
    } finally {
      setCargando(false);
    }
  };

  const agregarUsuario = async () => {
    const nuevoUsuarioData = {
      username: "nuevo_usuario", 
      email: "nuevo@utc.edu.ec", 
      rol: "estudiante",
      password: "password123" 
    };

    try {
      await API.post("registro/", nuevoUsuarioData); 
      alert("Usuario creado exitosamente");
      obtenerUsuarios(); 
    } catch (error) {
      console.error("Error al crear usuario:", error);
      alert("Hubo un error al crear el usuario. Revisa la consola.");
    }
  };

  const eliminarUsuario = async (id) => {
    const confirmar = window.confirm("¿Estás seguro de eliminar este usuario?");
    if (!confirmar) return;

    try {
      await API.delete(`usuarios/${id}/`);
      alert("Usuario eliminado.");
      obtenerUsuarios(); 
    } catch (error) {
      console.error("Error al eliminar:", error);
      alert("No se pudo eliminar el usuario.");
    }
  };

  const editarUsuario = (id) => {
    alert(`Lógica para editar el usuario con ID: ${id} (Próximamente)`);
  };

  if (cargando) return <p style={{ padding: "20px" }}>Cargando usuarios desde el servidor...</p>;

  return (
    <>
      <Navbar /> 

      <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
        <h2>Gestión de Usuarios</h2>
        
        <PermisoRol rolUsuarioActual={usuarioActual.rol} rolRequerido="docente">
          <button 
            onClick={agregarUsuario}
            style={{ backgroundColor: "#45B7D1", color: "white", padding: "10px", border: "none", borderRadius: "5px", marginBottom: "15px", cursor: "pointer" }}
          >
            + Agregar Nuevo Usuario
          </button>
        </PermisoRol>

        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ backgroundColor: "#f3f4f6", borderBottom: "2px solid #d1d5db" }}>
              <th style={{ padding: "10px" }}>Nombre de Usuario</th>
              <th style={{ padding: "10px" }}>Correo</th>
              <th style={{ padding: "10px" }}>Rol</th>
              <th style={{ padding: "10px" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.length > 0 ? (
              usuarios.map((usuario) => (
                <tr key={usuario.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "10px" }}>{usuario.username || usuario.nombre}</td>
                  <td style={{ padding: "10px" }}>{usuario.email || usuario.correo}</td>
                  <td style={{ padding: "10px" }}>
                    <span style={{ 
                      backgroundColor: usuario.rol === "docente" ? "#D4A5A5" : "#96CEB4", 
                      padding: "4px 8px", 
                      borderRadius: "12px", 
                      fontSize: "12px",
                      fontWeight: "bold",
                      color: "white"
                    }}>
                      {usuario.rol ? String(usuario.rol).toUpperCase() : "NO DEFINIDO"}
                    </span>
                  </td>
                  <td style={{ padding: "10px", display: "flex", gap: "10px" }}>
                    <button onClick={() => editarUsuario(usuario.id)} style={{ cursor: "pointer", padding: "5px" }}>✏️ Editar</button>
                    <PermisoRol rolUsuarioActual={usuarioActual.rol} rolRequerido="docente">
                       <button onClick={() => eliminarUsuario(usuario.id)} style={{ color: "red", cursor: "pointer", padding: "5px" }}>🗑️ Borrar</button>
                    </PermisoRol>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" style={{ padding: "10px", textAlign: "center" }}>No hay usuarios registrados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default GestionUsuarios;