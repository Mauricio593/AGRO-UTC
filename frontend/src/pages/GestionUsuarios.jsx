import React, { useState, useEffect } from "react";
import PermisoRol from "../components/PermisoRol";
import Navbar from "../components/Navbar"; 
import API from "../services/api"; 

const GestionUsuarios = ({ usuarioActual }) => {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  
  // Estados para manejar la edición
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [datosEdicion, setDatosEdicion] = useState({ username: "", email: "", rol: "" });

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

  // Función para abrir el modal con los datos cargados
  const abrirEdicion = (usuario) => {
    setUsuarioEditando(usuario.id);
    setDatosEdicion({
      username: usuario.username || usuario.nombre || "",
      email: usuario.email || usuario.correo || "",
      rol: usuario.rol || "estudiante"
    });
  };

  // Función para guardar los cambios
  const guardarEdicion = async (e) => {
    e.preventDefault();
    try {
      // Petición PUT o PATCH a tu backend para actualizar
      await API.put(`usuarios/${usuarioEditando}/`, datosEdicion);
      alert("✅ Usuario actualizado correctamente.");
      setUsuarioEditando(null); // Cerrar modal
      obtenerUsuarios(); // Refrescar tabla
    } catch (error) {
      console.error("Error al editar:", error);
      alert("❌ Ocurrió un error al actualizar el usuario. Verifica la consola.");
    }
  };

  if (cargando) return <p style={{ padding: "20px" }}>Cargando usuarios desde el servidor...</p>;

  return (
    <>
      <Navbar /> 

      <div style={{ padding: "20px", fontFamily: "Arial, sans-serif", position: "relative" }}>
        <h2>Gestión de Usuarios</h2>

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
                    <PermisoRol rolUsuarioActual={usuarioActual?.rol} rolRequerido="docente">
                       <button onClick={() => abrirEdicion(usuario)} style={{ backgroundColor: "#4CAF50", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", padding: "5px 10px" }}>✏️ Editar</button>
                       <button onClick={() => eliminarUsuario(usuario.id)} style={{ backgroundColor: "#f44336", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", padding: "5px 10px" }}>🗑️ Borrar</button>
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

        {/* MODAL DE EDICIÓN */}
        {usuarioEditando && (
          <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
            <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px", width: "400px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
              <h3>Editar Usuario</h3>
              <form onSubmit={guardarEdicion}>
                <div style={{ marginBottom: "10px" }}>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Nombre de Usuario:</label>
                  <input type="text" value={datosEdicion.username} onChange={(e) => setDatosEdicion({...datosEdicion, username: e.target.value})} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", boxSizing: "border-box" }} required />
                </div>
                <div style={{ marginBottom: "10px" }}>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Correo:</label>
                  <input type="email" value={datosEdicion.email} onChange={(e) => setDatosEdicion({...datosEdicion, email: e.target.value})} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", boxSizing: "border-box" }} required />
                </div>
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Rol:</label>
                  <select value={datosEdicion.rol} onChange={(e) => setDatosEdicion({...datosEdicion, rol: e.target.value})} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", boxSizing: "border-box" }}>
                    <option value="estudiante">Estudiante</option>
                    <option value="docente">Docente</option>
                  </select>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button type="button" onClick={() => setUsuarioEditando(null)} style={{ padding: "8px 12px", border: "none", borderRadius: "4px", cursor: "pointer", backgroundColor: "#ccc" }}>Cancelar</button>
                  <button type="submit" style={{ padding: "8px 12px", border: "none", borderRadius: "4px", cursor: "pointer", backgroundColor: "#45B7D1", color: "white" }}>Guardar Cambios</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default GestionUsuarios;