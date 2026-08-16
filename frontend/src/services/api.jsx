import axios from "axios";

const API = axios.create({
  // 🔥 AQUÍ ESTÁ LA MAGIA: Agregamos api/ al final de la URL base
  baseURL: "https://agro-utc.onrender.com/api/", 
});

// Si tienes interceptores para tokens, déjalos tal cual los tienes
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// NUEVO: Interceptor para manejar el error 401 (Sesión expirada)
API.interceptors.response.use(
  (response) => response, 
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("Sesión expirada o token inválido. Redirigiendo al Login...");
      localStorage.removeItem("token");
      localStorage.removeItem("username");
      localStorage.removeItem("rol");
      window.location.href = "/"; 
    }
    return Promise.reject(error);
  }
);

export default API;