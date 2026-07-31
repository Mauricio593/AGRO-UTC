import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// Importamos la imagen desde la carpeta api
import invitroImg from "../api/invitro.jpg"; 
import "./Login.css";

function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState(""); 
  const [rol, setRol] = useState("estudiante"); 
  const [rememberMe, setRememberMe] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/dashboard"); 
    }
  }, [navigate]);

  // --- FUNCIÓN PARA INICIAR SESIÓN ACTUALIZADA ---
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("https://agro-utc.onrender.com/api/token/", { 
        username, 
        password 
      });
      
      localStorage.setItem("token", res.data.access);
      localStorage.setItem("username", username); 
      
      // Buscamos el rol del usuario y lo guardamos
      try {
        const usersRes = await axios.get("https://agro-utc.onrender.com/api/usuarios/");
        const currentUser = usersRes.data.find(u => u.username === username);
        if (currentUser) {
          localStorage.setItem("rol", currentUser.rol);
        }
      } catch (err) {
        console.error("No se pudo obtener el rol del usuario", err);
      }
      
      navigate("/dashboard");
    } catch (error) {
      alert("❌ Error al iniciar sesión: Revisa tus credenciales.");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await axios.post("https://agro-utc.onrender.com/api/registro/", { 
        username, 
        email,
        password,
        rol
      });
      
      alert("✅ ¡Registro exitoso! Ahora puedes iniciar sesión.");
      setPassword("");
      setIsRegistering(false); 
    } catch (error) {
      alert("❌ Error al registrar: Revisa los datos o puede que el usuario ya exista.");
      console.error(error);
    }
  };

  const toggleForm = () => {
    setIsRegistering(!isRegistering);
    setUsername("");
    setPassword("");
    setEmail("");
  };

  return (
    <div className="login-container">
      <div className="login-card">
        
        <div className="login-illustration">
          <img src={invitroImg} alt="Cultivo In Vitro" className="illustration-img" />
        </div>

        <div className="login-form-section">
          <h2>{isRegistering ? "Crear una Cuenta" : "Iniciar Sesión"}</h2>
          
          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="form-content">
            
            <div className="input-group">
              <input 
                type="text" 
                placeholder="Usuario" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required 
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
                    required 
                  />
                </div>
                <div className="input-group">
                  <select 
                    value={rol} 
                    onChange={(e) => setRol(e.target.value)}
                    required
                    style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }}
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
                placeholder="Contraseña (••••••••)" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>

            {!isRegistering && (
              <div className="form-actions">
                <label className="remember-me">
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  Recordar
                </label>
                <a href="#" className="forgot-password">¿Olvidaste tu contraseña?</a>
              </div>
            )}

            <button type="submit" className="submit-btn" style={{ marginTop: isRegistering ? "20px" : "0" }}>
              {isRegistering ? "REGISTRARME" : "INGRESAR"}
            </button>

            <div style={{ marginTop: "20px", textAlign: "center" }}>
              <span style={{ fontSize: "14px", color: "#666" }}>
                {isRegistering ? "¿Ya tienes una cuenta? " : "¿No tienes una cuenta? "}
              </span>
              <button 
                type="button" 
                onClick={toggleForm} 
                style={{
                  background: "none",
                  border: "none",
                  color: "#0277bd",
                  fontWeight: "bold",
                  cursor: "pointer",
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
  );
}

export default Login;