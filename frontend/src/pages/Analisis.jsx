import { useState, useEffect } from "react";
import axios from "axios";
import { getAuthHeaders } from "../services/auth";
import html2pdf from "html2pdf.js"; 
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./VariableForm.css"; 

// 🔥 Importamos los nuevos componentes subdivididos
import FiltrosAnalisis from "../components/analisis/FiltrosAnalisis";
import GraficosPorAnio from "../components/analisis/GraficosPorAnio";
import PrediccionKnn from "../components/analisis/PrediccionKnn";

// 🔥 Registramos ChartJS aquí para que funcione en todos los componentes hijos
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  ArcElement, Title, Tooltip, Legend, LineController, BarController, PieController, DoughnutController, ScatterController
} from "chart.js";
import { Chart as ChartReact } from "react-chartjs-2"; 

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement,
  Title, Tooltip, Legend, LineController, BarController, PieController, DoughnutController, ScatterController
);

function Analisis() {
  const navigate = useNavigate(); 

  const [listaCultivos, setListaCultivos] = useState([]);
  const [listaVariables, setListaVariables] = useState([]);
  const [listaAnios, setListaAnios] = useState([]);
  const [listaTratamientos, setListaTratamientos] = useState([]); 

  const [cultivo, setCultivo] = useState("");
  const [variable, setVariable] = useState("");
  const [anio1, setAnio1] = useState("");
  const [anio2, setAnio2] = useState("");
  const [tratamientosSel, setTratamientosSel] = useState([]); 

  const [dataPrincipal, setDataPrincipal] = useState(null);
  const [datosAnio1, setDatosAnio1] = useState(null);
  const [datosAnio2, setDatosAnio2] = useState(null);
  const [datosKnn, setDatosKnn] = useState(null);
  const [errorKnn, setErrorKnn] = useState(null); 
  const [resumenStats, setResumenStats] = useState(null); 

  const coloresPastel = ['#ffb3ba', '#ffdfba', '#ffffba', '#baffc9', '#bae1ff', '#e6b3ff', '#ffb3e6', '#b3fff2'];

  const opcionesGraficos = { maintainAspectRatio: false, animation: false };

  useEffect(() => {
    const cargarOpciones = async () => {
      try {
        const resCultivos = await axios.get("https://agro-utc.onrender.com/api/cultivos/", getAuthHeaders());
        setListaCultivos(resCultivos.data);

        const resVariables = await axios.get("https://agro-utc.onrender.com/api/variables/", getAuthHeaders());
        setListaVariables(Array.from(new Set(resVariables.data.map(v => v.nombre.toLowerCase()))));

        const resExperimentos = await axios.get("https://agro-utc.onrender.com/api/experimentos/", getAuthHeaders());
        setListaAnios(Array.from(new Set(resExperimentos.data.map(exp => exp.anio || exp.nombre))).sort());

        const resTratamientos = await axios.get("https://agro-utc.onrender.com/api/tratamientos/", getAuthHeaders());
        setListaTratamientos(Array.from(new Set(resTratamientos.data.map(t => t.nombre))));
      } catch (error) {
        console.error("Error al cargar opciones base:", error);
      }
    };
    cargarOpciones();
  }, []);

  const toggleTratamiento = (nombre) => {
    setTratamientosSel(prev => prev.includes(nombre) ? prev.filter(t => t !== nombre) : [...prev, nombre]);
  };

  const obtenerDatos = async () => {
    if (!cultivo || !variable || !anio1 || !anio2) return alert("⚠️ Selecciona Cultivo, Variable y ambos Años.");
    if (anio1 === anio2) return alert("⚠️ Selecciona dos años diferentes.");

    // 🔥 SOLUCIÓN: Forzamos a React a desmontar los Canvas viejos limpiando los estados antes de buscar nuevos datos.
    setDataPrincipal(null);
    setDatosAnio1(null);
    setDatosAnio2(null);
    setResumenStats(null);
    setErrorKnn(null);
    setDatosKnn(null);

    try {
      const tratsParam = tratamientosSel.length > 0 ? `&tratamientos=${tratamientosSel.join(',')}` : "";

      const resComparar = await axios.get(`https://agro-utc.onrender.com/api/comparar/?cultivo=${cultivo}&variable=${variable}&anios=${anio1},${anio2}${tratsParam}`, getAuthHeaders());
      if (!resComparar.data || resComparar.data.length === 0) return alert("No se encontraron datos.");

      setDataPrincipal({
        labels: resComparar.data.map(d => d.anio),
        datasets: [
          { type: 'line', label: 'Tendencia Promedio', data: resComparar.data.map(d => d.mejor_promedio), borderColor: '#f43f5e', backgroundColor: '#f43f5e', borderWidth: 2, fill: false, tension: 0.3 },
          { type: 'bar', label: `Mejor promedio (${variable})`, data: resComparar.data.map(d => d.mejor_promedio), backgroundColor: '#bae1ff', borderRadius: 6 }
        ]
      });

      const resAnio1 = await axios.get(`https://agro-utc.onrender.com/api/analisis/?cultivo=${cultivo}&anio=${anio1}&variable=${variable}${tratsParam}`, getAuthHeaders());
      const resAnio2 = await axios.get(`https://agro-utc.onrender.com/api/analisis/?cultivo=${cultivo}&anio=${anio2}&variable=${variable}${tratsParam}`, getAuthHeaders());
      
      const t1 = resAnio1.data.todos || [];
      const t2 = resAnio2.data.todos || [];

      const calcStats = (arr) => arr.length ? { media: arr.reduce((acc, curr) => acc + curr.promedio, 0) / arr.length, mejor: [...arr].sort((a, b) => b.promedio - a.promedio)[0] } : { media: 0, mejor: { tratamiento: '-', promedio: 0 } };
      
      const st1 = calcStats(t1);
      const st2 = calcStats(t2);

      let conclusion = "Faltan datos en uno de los años.";
      if (t1.length && t2.length) {
        const diff = ((st2.media - st1.media) / st1.media) * 100;
        conclusion = `Se observa ${diff > 0 ? "un incremento" : "una disminución"} del ${Math.abs(diff).toFixed(2)}% en la media global. El tratamiento estrella global fue ${st1.mejor.promedio > st2.mejor.promedio ? `${st1.mejor.tratamiento} (${anio1})` : `${st2.mejor.tratamiento} (${anio2})`}.`;
      }
      setResumenStats({ st1, st2, conclusion });

      const estructurarGraficoAnio = (arrDatos, anioStr) => {
        if (!arrDatos.length) return null;
        const labels = arrDatos.map(t => t.tratamiento);
        const colores = arrDatos.map((_, i) => coloresPastel[i % coloresPastel.length]);
        return {
          graficosEstandar: { labels, datasets: [{ label: `Rendimiento ${anioStr}`, data: arrDatos.map(t => t.promedio), backgroundColor: colores }] },
          scatterData: { datasets: [{ label: `Dispersión ${anioStr}`, data: arrDatos.map(t => ({ x: t.tratamiento, y: t.promedio })), backgroundColor: '#8b5cf6', pointRadius: 6 }] },
          labelsOpcionesX: labels
        };
      };

      setDatosAnio1(estructurarGraficoAnio(t1, anio1));
      setDatosAnio2(estructurarGraficoAnio(t2, anio2));

      try {
          const resKnn = await axios.get(`https://agro-utc.onrender.com/api/knn/?cultivo=${cultivo}&variable=${variable}`, getAuthHeaders());
          setDatosKnn(resKnn.data);
      } catch (err) { 
          setDatosKnn(null);
          if (err.response && err.response.data && err.response.data.error) {
             setErrorKnn(err.response.data.error);
          } else {
             setErrorKnn("No se pudo conectar con el servicio de predicción KNN.");
          }
      }

    } catch (error) {
      console.error(error);
      alert("❌ Error al procesar datos.");
    }
  };

  const exportarPDF = () => {
    const elemento = document.getElementById('dashboard-pdf');
    html2pdf().set({ margin: 0.4, filename: `Analisis_${cultivo}_${variable}.pdf`, jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }, pagebreak: { mode: ['css', 'legacy'], avoid: '.evitar-salto' } }).from(elemento).save();
  };

  return (
    <div className="page-container">
      <Navbar />

      <div className="main-container">
        
        <div style={{ marginBottom: '15px' }}>
          <button onClick={() => navigate(-1)} style={{ backgroundColor: '#6b7280', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>⬅ Regresar</button>
        </div>

        <h3>📊 Panel de Análisis Avanzado y Predicción</h3>

        <FiltrosAnalisis 
          listaCultivos={listaCultivos} listaVariables={listaVariables} listaAnios={listaAnios} listaTratamientos={listaTratamientos}
          cultivo={cultivo} setCultivo={setCultivo} variable={variable} setVariable={setVariable}
          anio1={anio1} setAnio1={setAnio1} anio2={anio2} setAnio2={setAnio2}
          tratamientosSel={tratamientosSel} toggleTratamiento={toggleTratamiento} obtenerDatos={obtenerDatos}
        />

        {dataPrincipal && (
          <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'flex-end' }}>
             <button onClick={exportarPDF} style={{ backgroundColor: '#ef4444', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>📄 Exportar a PDF</button>
          </div>
        )}

        {dataPrincipal && (
          <div id="dashboard-pdf" style={{ padding: '20px', backgroundColor: 'white', marginTop: '15px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <h2 style={{ textAlign: 'center', color: '#1f2937', marginBottom: '20px', textTransform: 'uppercase' }}>Reporte de Rendimiento: {cultivo}</h2>
            
            {resumenStats && (
              <>
                <div className="evitar-salto" style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '20px' }}>
                  <div style={{ flex: '1', backgroundColor: '#e0e7ff', padding: '15px', borderRadius: '8px', border: '1px solid #c7d2fe', textAlign: 'center' }}>
                    <span style={{ display: 'block', fontSize: '0.85rem', color: '#4338ca', fontWeight: 'bold' }}>MEDIA GLOBAL ({anio1})</span>
                    <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#3730a3' }}>{resumenStats.st1.media.toFixed(2)}</span>
                  </div>
                  <div style={{ flex: '1', backgroundColor: '#fef3c7', padding: '15px', borderRadius: '8px', border: '1px solid #fde68a', textAlign: 'center' }}>
                    <span style={{ display: 'block', fontSize: '0.85rem', color: '#b45309', fontWeight: 'bold' }}>MEDIA GLOBAL ({anio2})</span>
                    <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#92400e' }}>{resumenStats.st2.media.toFixed(2)}</span>
                  </div>
                </div>
                <div className="evitar-salto" style={{ backgroundColor: '#dcfce7', padding: '15px', borderRadius: '8px', border: '1px solid #bbf7d0', marginBottom: '30px', color: '#166534' }}>
                  <h4 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '5px' }}>💡 Conclusión Comparativa</h4>
                  <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.5' }}>{resumenStats.conclusion}</p>
                </div>
              </>
            )}

            <div className="evitar-salto" style={{ height: '350px', marginBottom: '40px', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
              <h3 style={{ textAlign: 'center', margin: '0 0 10px 0', color: '#374151' }}>Evolución Histórica</h3>
              {/* 🔥 Añadimos la prop key para forzar la recreación del Canvas */}
              <ChartReact key={`main-${Date.now()}`} type="bar" data={dataPrincipal} options={opcionesGraficos} />
            </div>
            
            <GraficosPorAnio datos={datosAnio1} anio={anio1} opcionesGraficos={opcionesGraficos} />
            <GraficosPorAnio datos={datosAnio2} anio={anio2} opcionesGraficos={opcionesGraficos} />

            {errorKnn ? (
              <div className="evitar-salto" style={{ backgroundColor: '#fff3cd', padding: '15px', borderRadius: '8px', border: '1px solid #ffeeba', color: '#856404', marginTop: '20px' }}>
                <h4 style={{ margin: '0 0 5px 0' }}>⚠️ Aviso de Predicción Inteligente</h4>
                <p style={{ margin: 0 }}>{errorKnn}</p>
              </div>
            ) : (
              <PrediccionKnn datosKnn={datosKnn} opcionesGraficos={opcionesGraficos} />
            )}

          </div>
        )}
      </div>
    </div>
  );
}

export default Analisis;