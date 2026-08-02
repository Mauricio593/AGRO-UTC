import axios from "axios";

const API = axios.create({
  // Asegúrate de que termine en .com/ y NO en .com/api/
  baseURL: "https://agro-utc.onrender.com/", 
});

// Interceptor para inyectar el token de autenticación (si lo tienes configurado)
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;