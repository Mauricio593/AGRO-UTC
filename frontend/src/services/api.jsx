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

export default API;