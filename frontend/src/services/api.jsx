import axios from "axios";

const API = axios.create({
  // URL actualizada para apuntar a tu servidor de producción en Render
  baseURL: "https://agro-utc.onrender.com/", 
});

// Interceptor: pega el token en cada petición automáticamente
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;