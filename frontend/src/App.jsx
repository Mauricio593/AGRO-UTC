import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Cultivos from "./pages/Cultivos";
import Lotes from "./pages/Lotes"; 
import Experimentos from "./pages/Experimentos"; 
import RegisterData from "./pages/RegisterData"; 
import Analisis from "./pages/Analisis";
import KNN from "./pages/KNN";
import VariableForm from "./pages/VariableForm";
import Reportes from "./pages/Reportes"; 

// 👤 1. IMPORTAMOS LA NUEVA PANTALLA DE USUARIOS:
import GestionUsuarios from "./pages/GestionUsuarios"; 

function App() {
  
  // 👤 2. SIMULAMOS UN USUARIO ACTUAL (Para probar los permisos)
  // Cambia 'docente' por 'estudiante' para ver cómo desaparecen los botones de agregar/borrar.
  const usuarioSimulado = { id: 1, nombre: 'Nabor', rol: 'docente' };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* === RUTAS PRINCIPALES === */}
        <Route path="/cultivos" element={<Cultivos />} />
        <Route path="/analisis" element={<Analisis />} />
        <Route path="/knn" element={<KNN />} />
        <Route path="/reportes" element={<Reportes />} />
        
        {/* 👤 3. AGREGAMOS LA RUTA DE USUARIOS AQUÍ: */}
        <Route path="/usuarios" element={<GestionUsuarios usuarioActual={usuarioSimulado} />} />
        
        {/* === NUEVO FLUJO JERÁRQUICO === */}
        {/* Paso 1: Al seleccionar un cultivo, ves sus Lotes */}
        <Route path="/cultivo/:id/lotes" element={<Lotes />} />
        
        {/* Paso 2: Al seleccionar un lote, ves sus Experimentos (Años) */}
        <Route path="/lote/:id/experimentos" element={<Experimentos />} />
        
        {/* Paso 3: Al seleccionar un experimento, ves y creas sus Variables */}
        <Route path="/experimento/:id/variables" element={<RegisterData />} />
        
        {/* Paso 4: Al seleccionar una variable, ves su formulario/datos */}
        <Route path="/experimento/:expId/variable/:id" element={<VariableForm />} />
      </Routes>
    </Router>
  );
}

export default App;