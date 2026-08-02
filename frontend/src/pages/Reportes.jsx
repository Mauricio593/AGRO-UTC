import React, { useState, useEffect } from "react";
import API from "../services/api"; // Conexión centralizada
import { useNavigate } from "react-router-dom";
import html2pdf from "html2pdf.js";
import Navbar from "../components/Navbar";
import "./Reportes.css";

import { Bar, Chart, Pie, Line, Scatter } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, 
  Title, Tooltip, Legend, PointElement, ArcElement
} from "chart.js";
import { BoxPlotController, BoxAndWiskers } from '@sgratzl/chartjs-chart-boxplot';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Plugin personalizado para mostrar letras de significancia estadística (ANOVA)
const pluginLetrasANOVA = {
  id: 'pluginLetrasANOVA',
  afterDatasetsDraw(chart, args, pluginOptions) {
    const { ctx, data } = chart;
    ctx.save();
    ctx.font = 'bold 12px Arial';
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    data.datasets.forEach((dataset, i) => {
      const meta = chart.getDatasetMeta(i);
      if (meta.type !== 'bar') return;
      meta.data.forEach((bar, index) => {
        const letra = dataset.letras?.[index];
        if (letra) {
          ctx.fillText(letra, bar.x, bar.y - 5);
        }
      });
    });
    ctx.restore();
  }
};

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement, Title, Tooltip, Legend, PointElement, ArcElement,
  pluginLetrasANOVA, BoxPlotController, BoxAndWiskers, ChartDataLabels
);

function Reportes() {
  const navigate = useNavigate();
  const [cultivos, setCultivos] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [anios, setAnios] = useState([]);
  const [filtro, setFiltro] = useState({ cultivo: "", lote: "", anio: "" });
  const [datosGraficos, setDatosGraficos] = useState([]);
  const [nombreUsuario, setNombreUsuario] = useState("Usuario");

  const [grafico1, setGrafico1] = useState('sectores');
  const [grafico2, setGrafico2] = useState('lineas');

  useEffect(() => {
    const usuarioGuardado = localStorage.getItem("username");
    if (usuarioGuardado) setNombreUsuario(usuarioGuardado);
  }, []);

  // Cargar Cultivos
  useEffect(() => {
    API.get("cultivos/")
      .then(res => setCultivos(res.data))
      .catch(err => console.error("Error al cargar cultivos", err));
  }, []);

  // Cargar Lotes dependiendo del cultivo
  useEffect(() => {
    if (filtro.cultivo) {
      API.get(`unidades/?cultivo=${filtro.cultivo}`)
        .then(res => setLotes(res.data))
        .catch(console.error);
    } else {
      setLotes([]); 
      setFiltro(f => ({ ...f, lote: "", anio: "" }));
    }
  }, [filtro.cultivo]);

  // Cargar Años dependiendo del lote
  useEffect(() => {
    if (filtro.lote) {
      API.get(`experimentos/?unidad=${filtro.lote}`)
        .then(res => setAnios(res.data))
        .catch(console.error);
    } else {
      setAnios([]); 
      setFiltro(f => ({ ...f, anio: "" }));
    }
  }, [filtro.lote]);

  // Generar reporte al cambiar filtros
  useEffect(() => {
    if (!filtro.cultivo) {
      setDatosGraficos([]);
      return;
    }
    const cargarGraficos = async () => {
      try {
        let url = `reporte-grafico/?cultivo=${filtro.cultivo}`;
        if (filtro.lote) url += `&lote=${filtro.lote}`;
        if (filtro.anio) url += `&anio=${filtro.anio}`;

        const res = await API.get(url);
        setDatosGraficos(res.data);
      } catch (error) {
        console.error("Error obteniendo datos del reporte:", error);
      }
    };
    cargarGraficos();
  }, [filtro]);

  const exportarPDF = () => {
    const elemento = document.getElementById("reporte-contenido");
    const opciones = {
      margin: 10,
      filename: `Reporte_Agronomico_${new Date().getTime()}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
    };
    html2pdf().set(opciones).from(elemento).save();
  };

  return (
    <div className="reportes-page">
      <Navbar />
      <div className="reportes-container">
        
        <div className="reportes-header">
          <h2>📊 Panel de Reportes y Análisis</h2>
          <p>Bienvenido, <strong>{nombreUsuario}</strong>. Selecciona los parámetros para visualizar el comportamiento de las variables.</p>
        </div>

        <div className="filtros-card">
          <div className="filtro-grupo">
            <label>Cultivo:</label>
            <select value={filtro.cultivo} onChange={e => setFiltro({ ...filtro, cultivo: e.target.value, lote: "", anio: "" })}>
              <option value="">-- Seleccionar --</option>
              {cultivos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="filtro-grupo">
            <label>Lote:</label>
            <select value={filtro.lote} disabled={!filtro.cultivo} onChange={e => setFiltro({ ...filtro, lote: e.target.value, anio: "" })}>
              <option value="">-- Todos --</option>
              {lotes.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
            </select>
          </div>
          <div className="filtro-grupo">
            <label>Año:</label>
            <select value={filtro.anio} disabled={!filtro.lote} onChange={e => setFiltro({ ...filtro, anio: e.target.value })}>
              <option value="">-- Todos --</option>
              {anios.map((a, i) => <option key={i} value={a.anio}>{a.anio}</option>)}
            </select>
          </div>
          <button className="btn-exportar" onClick={exportarPDF} disabled={datosGraficos.length === 0}>
            📄 Exportar a PDF
          </button>
        </div>

        <div id="reporte-contenido" className="reporte-resultados">
          {datosGraficos.length === 0 ? (
            <div className="no-data-msg">
              <p>No hay datos disponibles para los filtros seleccionados o no has seleccionado un cultivo.</p>
            </div>
          ) : (
            datosGraficos.map((dato, index) => (
              <div key={index} className="grafico-seccion">
                <h3 className="variable-titulo">Variabilidad de: {dato.variable}</h3>
                
                <div className="graficos-grid">
                  <div className="grafico-card">
                    <h4>Distribución de Tratamientos</h4>
                    <Bar 
                      data={{
                        labels: dato.tratamientos,
                        datasets: [{
                          label: 'Promedio',
                          data: dato.promedios,
                          backgroundColor: 'rgba(54, 162, 235, 0.6)',
                          borderColor: 'rgba(54, 162, 235, 1)',
                          borderWidth: 1,
                        }]
                      }} 
                      options={{ responsive: true, plugins: { legend: { display: false } } }} 
                    />
                  </div>

                  <div className="grafico-card">
                    <h4>Tendencia General</h4>
                    <Line 
                      data={{
                        labels: dato.tratamientos,
                        datasets: [{
                          label: 'Tendencia',
                          data: dato.promedios,
                          fill: false,
                          borderColor: '#ff6384',
                          tension: 0.1
                        }]
                      }} 
                      options={{ responsive: true }} 
                    />
                  </div>
                </div>

                <div className="tabla-resumen">
                  <h4>Resumen Estadístico</h4>
                  <table>
                    <thead>
                      <tr>
                        <th>Tratamiento</th>
                        <th>Promedio</th>
                        <th>N° Mediciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dato.tratamientos.map((trat, i) => (
                        <tr key={i}>
                          <td>{trat}</td>
                          <td>{dato.promedios[i].toFixed(2)}</td>
                          <td>{dato.conteos ? dato.conteos[i] : 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <hr className="separador-graficos" />
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}

export default Reportes;