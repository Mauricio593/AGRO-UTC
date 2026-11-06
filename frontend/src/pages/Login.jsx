import { useState, useEffect } from "react";
import API from "../services/api"; 
import { useNavigate } from "react-router-dom";
import invitroImg from "../api/invitro.jpg"; 
import "./Login.css";

function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState(""); 
  const [rol, setRol] = useState("estudiante"); 
  const [rememberMe, setRememberMe] = useState(false);
  
  const [errorMensaje, setErrorMensaje] = useState("");
  
  // ESTADO PARA LA PANTALLA DE CARGA
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/dashboard"); 
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMensaje(""); 

    if (!username.trim() || !password.trim()) {
      return setErrorMensaje("Por favor, ingresa tu usuario y contraseña.");
    }

    // Activar carga
    setIsLoading(true);

    try {
      const res = await API.post("token/", { username, password });
      
      localStorage.setItem("token", res.data.access);
      localStorage.setItem("username", username); 
      
      try {
        const usersRes = await API.get("usuarios/");
        const currentUser = usersRes.data.find(u => u.username === username);
        if (currentUser) {
          localStorage.setItem("rol", currentUser.rol);
        }
      } catch (err) {
        console.error("No se pudo obtener el rol del usuario", err);
      }
      
      navigate("/dashboard");
    } catch (error) {
      // Desactivar carga si falla
      setIsLoading(false);
      setErrorMensaje("Credenciales incorrectas. Verifica tu usuario y contraseña.");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMensaje(""); 

    if (!username.trim()) return setErrorMensaje("El nombre de usuario es obligatorio.");
    if (!email.trim() || !email.includes("@")) return setErrorMensaje("Ingresa un correo electrónico válido.");
    if (!password.trim() || password.length < 6) return setErrorMensaje("La contraseña debe tener al menos 6 caracteres.");

    // Activar carga
    setIsLoading(true);

    try {
      if (rol === "docente") {
        try {
          const resUsuarios = await API.get("usuarios/");
          const existeDocente = resUsuarios.data.some(u => u.rol === "docente");
          
          if (existeDocente) {
            setIsLoading(false);
            return setErrorMensaje("Acceso denegado: Ya existe un docente registrado en el sistema. Solo puede haber uno.");
          }
        } catch (err) {
          console.warn("No se pudo verificar la lista de usuarios. El backend podría rechazar la consulta pública.");
        }
      }

      await API.post("registro/", { 
        username, 
        email,
        password,
        rol
      });
      
      // Desactivar carga y limpiar al tener éxito
      setIsLoading(false);
      alert("✅ ¡Registro exitoso! Ahora puedes iniciar sesión.");
      setPassword("");
      setErrorMensaje("");
      setIsRegistering(false); 
    } catch (error) {
      // Desactivar carga si falla
      setIsLoading(false);
      setErrorMensaje("Error al registrar: Es posible que el nombre de usuario o correo ya estén en uso.");
      console.error(error);
    }
  };

  const toggleForm = () => {
    setIsRegistering(!isRegistering);
    setUsername("");
    setPassword("");
    setEmail("");
    setErrorMensaje(""); 
  };

  return (
    <>
      {/* CAPA DE CARGA INDEPENDIENTE (Cubre toda la pantalla) */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>{isRegistering ? "Registrando usuario..." : "Cargando sistema Esperar..."}</p>
        </div>
      )}

      <div className="login-container">
        <div className="login-card">
          
          <div className="login-illustration">
            <img src={invitroImg} alt="Cultivo In Vitro" className="illustration-img" />
          </div>

          <div className="login-form-section">
            <h2>{isRegistering ? "Crear una Cuenta" : "Iniciar Sesión"}</h2>
            
            {errorMensaje && (
              <div style={{ backgroundColor: "#ffebee", color: "#c62828", padding: "10px", borderRadius: "5px", marginBottom: "15px", fontSize: "14px", border: "1px solid #ef9a9a", textAlign: "center" }}>
                ⚠️ {errorMensaje}
              </div>
            )}

            <form onSubmit={isRegistering ? handleRegister : handleLogin} className="form-content" noValidate>
              
              <div className="input-group">
                <input 
                  type="text" 
                  placeholder="Usuario" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              {isRegistering && (
                <>
                  <div className="input-group">
                    <input 
                      type="email" 
                      placeholder="Correo Electrónico" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="input-group">
                    <select 
                      value={rol} 
                      onChange={(e) => setRol(e.target.value)}
                      style={{ width: "100%", padding: "10px", borderRadius: "30px", border: "2px solid transparent", backgroundColor: "#f1f5f9", outline: "none" }}
                      disabled={isLoading}
                    >
                      <option value="estudiante">Estudiante</option>
                      <option value="docente">Docente</option>
                    </select>
                  </div>
                </>
              )}
              
              <div className="input-group">
                <input 
                  type="password" 
                  placeholder="Contraseña (Mínimo 6 caracteres)" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              {!isRegistering && (
                <div className="form-actions">
                  <label className="remember-me">
                    <input 
                      type="checkbox" 
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      disabled={isLoading}
                    />
                    Recordar
                  </label>
                  <a href="#" className="forgot-password">¿Olvidaste tu contraseña?</a>
                </div>
              )}

              <button type="submit" className="submit-btn" style={{ marginTop: isRegistering ? "20px" : "0" }} disabled={isLoading}>
                {isLoading ? "Cargando..." : (isRegistering ? "REGISTRARME" : "INGRESAR")}
              </button>

              <div style={{ marginTop: "20px", textAlign: "center" }}>
                <span style={{ fontSize: "14px", color: "#666" }}>
                  {isRegistering ? "¿Ya tienes una cuenta? " : "¿No tienes una cuenta? "}
                </span>
                <button 
                  type="button" 
                  onClick={toggleForm} 
                  disabled={isLoading}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#0277bd",
                    fontWeight: "bold",
                    cursor: isLoading ? "not-allowed" : "pointer",
                    textDecoration: "underline",
                    fontSize: "14px"
                  }}
                >
                  {isRegistering ? "Inicia sesión aquí" : "Regístrate aquí"}
                </button>
              </div>

            </form>
          </div>

        </div>
      </div>
    </>
  );
}

export default Login;
