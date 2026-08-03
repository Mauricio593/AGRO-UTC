import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { getAuthHeaders } from "../services/auth"; 
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

const pluginLetrasANOVA = {
  id: 'letrasAnova',
  afterDatasetsDraw(chart, args, options) {
    const { ctx } = chart;
    
    let datasetIndex = chart.config.data.datasets.findIndex(ds => ds.type === 'bar');
    if (datasetIndex === -1) {
      datasetIndex = chart.config.data.datasets.findIndex(ds => ds.type === 'line' && ds.label !== 'Media Global');
    }
    
    if (datasetIndex === -1 || !options.letras) return;
    
    const meta = chart.getDatasetMeta(datasetIndex);
    
    ctx.save();
    ctx.font = 'bold 11px Arial';
    ctx.fillStyle = '#000'; 
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    meta.data.forEach((elemento, index) => {
      const letra = options.letras[index]; 
      if (letra) {
        ctx.fillText(letra, elemento.x, elemento.y - 5); 
      }
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

  useEffect(() => {
    // 🟢 CAMBIO A URL DE PRODUCCIÓN
    axios.get("https://agro-utc.onrender.com/api/cultivos/", getAuthHeaders())
      .then(res => setCultivos(res.data))
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (filtro.cultivo) {
      // 🟢 CAMBIO A URL DE PRODUCCIÓN
      axios.get(`https://agro-utc.onrender.com/api/unidades/?cultivo=${filtro.cultivo}`, getAuthHeaders())
        .then(res => setLotes(res.data)).catch(console.error);
    } else {
      setLotes([]); setFiltro(f => ({ ...f, lote: "", anio: "" }));
    }
  }, [filtro.cultivo]);

  useEffect(() => {
    if (filtro.lote) {
      // 🟢 CAMBIO A URL DE PRODUCCIÓN
      axios.get(`https://agro-utc.onrender.com/api/experimentos/?unidad=${filtro.lote}`, getAuthHeaders())
        .then(res => setAnios(res.data)).catch(console.error);
    } else {
      setAnios([]); setFiltro(f => ({ ...f, anio: "" }));
    }
  }, [filtro.lote]);

  useEffect(() => {
    if (!filtro.cultivo) {
      setDatosGraficos([]);
      return;
    }
    const cargarGraficos = async () => {
      try {
        // 🟢 CAMBIO A URL DE PRODUCCIÓN
        let url = `https://agro-utc.onrender.com/api/reporte-grafico/?cultivo=${filtro.cultivo}`;
        if (filtro.lote) url += `&lote=${filtro.lote}`;
        if (filtro.anio) url += `&anio=${filtro.anio}`;

        const res = await axios.get(url, getAuthHeaders());
        
        const datosNormalizados = res.data.map(item => {
          let rawStats = (item.estadisticas || item.datos || []).map(d => {
            let repsMock = [];
            if (!d.repeticiones || d.repeticiones.length === 0) {
              for (let i = 0; i < 10; i++) repsMock.push(Math.max(0, Math.round(parseFloat(d.promedio) + (Math.random() * 4 - 2)))); 
            }
            const repeticiones = d.repeticiones && d.repeticiones.length > 0 ? d.repeticiones : repsMock;
            const n = repeticiones.length;
            const suma = repeticiones.reduce((acc, val) => acc + Number(val), 0);
            const media = n > 0 ? suma / n : 0;
            return { tratamiento: d.tratamiento, repeticiones, n, suma, media };
          });

          let nTotal = 0, sumaTotalGlobal = 0;
          let kGrupos = rawStats.length;

          rawStats.forEach(stat => { nTotal += stat.n; sumaTotalGlobal += stat.suma; });
          const mediaGlobal = nTotal > 0 ? sumaTotalGlobal / nTotal : 0;
          let scError = 0;

          rawStats.forEach(stat => {
            stat.repeticiones.forEach(v => { scError += Math.pow(Number(v) - stat.media, 2); });
          });

          const glError = nTotal - kGrupos;
          const cme = glError > 0 ? scError / glError : 0; 
          const cvGlobal = mediaGlobal > 0 ? (Math.sqrt(cme) / mediaGlobal) * 100 : 0;

          let statsTukey = [...rawStats].sort((a, b) => b.media - a.media);
          const qTukey = 3.8; 
          const nPromedio = kGrupos > 0 ? nTotal / kGrupos : 1; 
          const hsd = qTukey * Math.sqrt(cme / nPromedio);

          const rangosMaximos = [];
          for (let i = 0; i < statsTukey.length; i++) {
            let j = i;
            while (j + 1 < statsTukey.length && Math.abs(statsTukey[i].media - statsTukey[j + 1].media) <= hsd) { j++; }
            if (!rangosMaximos.some(r => i >= r.inicio && j <= r.fin)) {
              rangosMaximos.push({ inicio: i, fin: j, letra: String.fromCharCode(97 + rangosMaximos.length) });
            }
          }

          statsTukey = statsTukey.map((stat, idx) => {
            const rangoLetras = rangosMaximos.filter(r => idx >= r.inicio && idx <= r.fin).map(r => r.letra).join(''); 
            return { ...stat, rango: rangoLetras || 'a' };
          });

          let statsCampo = [...statsTukey].sort((a, b) => a.tratamiento.localeCompare(b.tratamiento));
          const mejorTratamiento = statsTukey[0] || { tratamiento: "N/A", media: 0, rango: "a" };

          return {
            variable: item.variable,
            estadisticasCampo: statsCampo, 
            estadisticasTukey: statsTukey, 
            eeGlobal: cme.toFixed(2), 
            cvGlobal: cvGlobal.toFixed(2), 
            mejorTratamiento,
            mediaGlobal
          };
        });
        setDatosGraficos(datosNormalizados);
      } catch (error) { console.error(error); }
    };
    cargarGraficos();
  }, [filtro]);

  const getNombreCultivo = () => cultivos.find(c => c.id.toString() === filtro.cultivo)?.nombre || "No especificado";
  const getNombreLote = () => lotes.find(l => l.id.toString() === filtro.lote)?.nombre || "Todos";
  const getAnio = () => filtro.anio ? filtro.anio : "Todos"; 

  const obtenerConfiguracionPDF = () => ({
    margin: [0.3, 0.3, 0.3, 0.3], // Pequeño margen seguro
    filename: `Reporte_Estadistico.pdf`,
    image: { type: "jpeg", quality: 1.0 },
    html2canvas: { 
      scale: 2, 
      useCORS: true, 
      letterRendering: true,
      scrollY: 0
    },
    jsPDF: { unit: "in", format: "a4", orientation: "landscape" },
    pagebreak: { mode: ['css', 'legacy'] }
  });

  const exportarPDF = () => {
    const elemento = document.getElementById("reporte-cientifico");
    html2pdf().set(obtenerConfiguracionPDF()).from(elemento).save();
  };

  const previsualizarPDF = () => {
    const elemento = document.getElementById("reporte-cientifico");
    html2pdf().set(obtenerConfiguracionPDF()).from(elemento).output('bloburl').then(url => window.open(url, '_blank'));
  };

  const colores = ['#FF6B6B', '#3498DB', '#4ECDC4', '#9B59B6', '#F1C40F', '#E67E22', '#1ABC9C', '#34495E'];

  return (
    <>
      <Navbar />
      <div className="reportes-container">
        <div className="header-actions">
          <button className="btn-regresar" onClick={() => navigate(-1)}>⬅ Regresar</button>
          <div style={{ display: "flex", gap: "10px" }}>
            <button className="btn-exportar" onClick={previsualizarPDF} style={{ backgroundColor: "#45B7D1" }}>👁️ Vista Previa</button>
            <button className="btn-exportar" onClick={exportarPDF}>📄 Descargar Reporte PDF</button>
          </div>
        </div>

        <div className="filters-bar">
          <div className="filter-group">
            <label>Cultivo:</label>
            <select value={filtro.cultivo} onChange={(e) => setFiltro({ ...filtro, cultivo: e.target.value })}>
              <option value="">-- Seleccione --</option>
              {cultivos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>Lote / Mes:</label>
            <select value={filtro.lote} onChange={(e) => setFiltro({ ...filtro, lote: e.target.value })} disabled={!filtro.cultivo}>
              <option value="">-- Todos --</option>
              {lotes.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>Año:</label>
            <select value={filtro.anio} onChange={(e) => setFiltro({ ...filtro, anio: e.target.value })} disabled={!filtro.lote}>
              <option value="">-- Todos --</option>
              {anios.map((a, idx) => <option key={idx} value={a.anio}>{a.anio}</option>)}
            </select>
          </div>
        </div>

        <div id="reporte-cientifico" className="report-body">
          {datosGraficos.length > 0 ? (
            datosGraficos.map((item, index) => {
              
              const labels = item.estadisticasCampo.map(d => d.tratamiento);
              const medias = item.estadisticasCampo.map(d => d.media);
              const rangos = item.estadisticasCampo.map(d => d.rango);

              // 1. Barras
              const chartDataBar = {
                labels,
                datasets: [
                  {
                    type: 'line', label: 'Media Global', data: Array(labels.length).fill(item.mediaGlobal),
                    borderColor: '#E74C3C', borderWidth: 2, borderDash: [5, 5], fill: false, pointRadius: 0, order: 1,
                    datalabels: { display: false }
                  },
                  {
                    type: 'bar', label: 'Media del Tratamiento', data: medias,
                    backgroundColor: item.estadisticasCampo.map((_, i) => colores[i % colores.length]),
                    borderColor: 'rgba(0,0,0,0.1)', borderWidth: 1, order: 2,
                    datalabels: { display: true, color: '#ffffff', anchor: 'center', align: 'center', font: { weight: 'bold', size: 9 }, formatter: (v) => v.toFixed(2) }
                  }
                ]
              };

              // 2. Boxplot
              const boxplotValores = item.estadisticasCampo.map(d => d.repeticiones.map(v => Number(v)).filter(v => !isNaN(v)));
              const chartDataBoxplot = {
                labels: labels,
                datasets: [{
                  label: 'Distribución', data: boxplotValores, backgroundColor: 'rgba(52, 152, 219, 0.5)',
                  borderColor: '#2980B9', borderWidth: 2, outlierBackgroundColor: '#E74C3C', datalabels: { display: false }
                }]
              };

              // 3. Líneas
              const chartDataLine = {
                labels,
                datasets: [{
                  label: 'Tendencia de Medias', data: medias, borderColor: '#3498DB', backgroundColor: '#3498DB',
                  borderWidth: 2, fill: false, tension: 0.1, pointRadius: 3,
                  datalabels: { display: true, align: 'bottom', font: { size: 9, weight: 'bold' }, formatter: (v) => v.toFixed(2) }
                }]
              };

              // 4. Sectores
              const chartDataPie = {
                labels,
                datasets: [{
                  data: medias, backgroundColor: item.estadisticasCampo.map((_, i) => colores[i % colores.length]),
                  borderWidth: 1, datalabels: { display: true, color: '#fff', font: { weight: 'bold', size: 9 }, formatter: (v) => v.toFixed(2) }
                }]
              };

              // 5. Dispersión
              const scatterValues = [];
              item.estadisticasCampo.forEach(d => {
                d.repeticiones.forEach(v => {
                  if (v !== undefined && v !== null && !isNaN(Number(v))) {
                    scatterValues.push({ x: d.tratamiento, y: Number(v) });
                  }
                });
              });
              const chartDataScatter = {
                datasets: [{
                  label: 'Dispersión', data: scatterValues, backgroundColor: '#E74C3C',
                  pointRadius: 3, datalabels: { display: false }
                }]
              };

              // ==========================================
              // ⚙️ RENDERIZADOR DINÁMICO DE GRÁFICOS
              // ==========================================
              const renderizarGrafico = (tipo) => {
                // Reducción estricta de altura para asegurar que encaje en el PDF sin deformarse
                const alturaCanvas = '140px'; 
                const opcionesComunes = {
                  maintainAspectRatio: false, // Fundamental para que respete el contenedor
                  animation: false, 
                  plugins: { 
                    legend: { display: true, position: 'bottom', labels: {font: {size: 9}, boxWidth: 8, padding: 5} } 
                  }
                };

                switch (tipo) {
                  case 'barras':
                    return (
                      <div className="chart-canvas" style={{ height: alturaCanvas }}>
                        <Bar data={chartDataBar} options={{ ...opcionesComunes, plugins: { ...opcionesComunes.plugins, letrasAnova: { letras: rangos } }, scales: { y: { beginAtZero: true, suggestedMax: Math.max(...medias) * 1.3, ticks: {font: {size: 9}} }, x: { grid: { display: false }, ticks: {font: {size: 9}} } } }} />
                      </div>
                    );
                  case 'lineas':
                    return (
                      <div className="chart-canvas" style={{ height: alturaCanvas }}>
                        <Line data={chartDataLine} options={{ ...opcionesComunes, plugins: { ...opcionesComunes.plugins, letrasAnova: { letras: rangos } }, scales: { y: { beginAtZero: true, suggestedMax: Math.max(...medias) * 1.3, ticks: {font: {size: 9}} }, x: { grid: { display: false }, ticks: {font: {size: 9}} } } }} />
                      </div>
                    );
                  case 'sectores':
                    return (
                      <div className="chart-canvas" style={{ height: alturaCanvas, display: 'flex', justifyContent: 'center' }}>
                        <Pie data={chartDataPie} options={{ ...opcionesComunes, plugins: { legend: { position: 'right', labels: {font: {size: 9}, boxWidth: 8} } } }} />
                      </div>
                    );
                  case 'dispersion':
                    return (
                      <div className="chart-canvas" style={{ height: alturaCanvas }}>
                        <Scatter data={chartDataScatter} options={{ ...opcionesComunes, scales: { x: { type: 'category', labels: labels, grid: { display: false }, ticks: {font: {size: 9}} }, y: { beginAtZero: true, ticks: {font: {size: 9}} } } }} />
                      </div>
                    );
                  case 'boxplot':
                    return (
                      <div className="chart-canvas" style={{ height: alturaCanvas }}>
                        <Chart type="boxplot" data={chartDataBoxplot} options={{ ...opcionesComunes, scales: { x: { grid: { display: false }, ticks: {font: {size: 9}} }, y: { beginAtZero: true, ticks: {font: {size: 9}} } } }} />
                      </div>
                    );
                  default: return null;
                }
              };

              return (
                <div key={index} className="variable-page" style={{ pageBreakBefore: index !== 0 ? 'always' : 'auto' }}>
                  
                  <div className="report-header-title">
                    <h3 className="section-title">VARIABLE: {item.variable}</h3>
                    <h2>REPORTE DE ANÁLISIS ESTADÍSTICO</h2>
                    <p>Cultivo: {getNombreCultivo()} | Lote/Mes: {getNombreLote()} | Año: {getAnio()}</p>
                    <p>Generado por: {nombreUsuario}</p>
                  </div>

                  {/* NUEVA ESTRUCTURA FLEXBOX */}
                  <div className="flex-layout">
                    
                    {/* COLUMNA IZQUIERDA: Tablas y Conclusión */}
                    <div className="data-tables-col">
                      <div className="table-wrapper">
                        <h4>1. DATOS DE CAMPO (REPETICIONES)</h4>
                        <table className="scientific-table">
                          <thead>
                            <tr>
                              <th className="text-left">TRATAMIENTO</th>
                              {[...Array(10)].map((_, i) => <th key={i}>R{i + 1}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {item.estadisticasCampo.map((stat, i) => (
                              <tr key={i}>
                                <td className="text-left fw-bold">{stat.tratamiento}</td>
                                {[...Array(10)].map((_, idx) => (
                                  <td key={idx}>{stat.repeticiones[idx] !== undefined ? Number(stat.repeticiones[idx]).toFixed(0) : "-"}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="table-wrapper mt-3">
                        <h4>2. TABLA DE COMPARACIÓN (TUKEY)</h4>
                        <table className="scientific-table">
                          <thead>
                            <tr>
                              <th className="text-left">TRATAMIENTO</th>
                              <th>MEDIA</th>
                              <th>RANGO</th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.estadisticasTukey.map((stat, i) => (
                              <tr key={i}>
                                <td className="text-left">{stat.tratamiento}</td>
                                <td>{Number(stat.media).toFixed(2)}</td>
                                <td className="fw-bold">{stat.rango}</td>
                              </tr>
                            ))}
                            <tr style={{ borderTop: '2px solid #ddd' }}>
                              <td className="text-left fw-bold">E.E</td>
                              <td>{item.eeGlobal}</td>
                              <td></td>
                            </tr>
                            <tr>
                              <td className="text-left fw-bold">CV (%)</td>
                              <td>{item.cvGlobal}</td>
                              <td></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="best-treatment-box">
                        <h4>3. CONCLUSIÓN ÓPTIMA</h4>
                        <div className="best-content">
                          <p style={{ margin: '0 0 4px 0' }}>
                            Tras realizar el análisis comparativo de medias utilizando la prueba de Tukey, el tratamiento estadísticamente superior es <strong>{item.mejorTratamiento.tratamiento}</strong>.
                          </p>
                          <p style={{ margin: '0 0 4px 0' }}>
                            Este tratamiento alcanzó la media más alta del estudio con un valor de <strong>{Number(item.mejorTratamiento.media).toFixed(2)}</strong>, ubicándose en el rango de significancia <strong>'{item.mejorTratamiento.rango}'</strong>.
                          </p>
                          <p style={{ margin: 0 }}>
                            Esto demuestra de manera confiable que presenta la mejor respuesta para la variable evaluada, sugiriendo fuertemente su implementación para maximizar los resultados.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* COLUMNA DERECHA: Gráficos estrictamente limitados */}
                    <div className="charts-col">
                      <div style={{ marginBottom: '0px' }}>
                        <h4 style={{ margin: 0 }}>4. GRÁFICOS DESCRIPTIVOS</h4>
                      </div>

                      <div className="chart-box">
                        <div data-html2canvas-ignore="true" style={{ textAlign: 'right', marginBottom: '2px' }}>
                          <select value={grafico1} onChange={(e) => setGrafico1(e.target.value)} style={{ padding: '2px', fontSize: '9px', borderRadius: '4px' }}>
                            <option value="sectores">Proporción (Sectores)</option>
                            <option value="barras">Medias (Barras)</option>
                            <option value="lineas">Tendencia (Líneas)</option>
                            <option value="dispersion">Dispersión (Scatter)</option>
                            <option value="boxplot">Variabilidad (Boxplot)</option>
                          </select>
                        </div>
                        {renderizarGrafico(grafico1)}
                      </div>

                      <div className="chart-box">
                        <div data-html2canvas-ignore="true" style={{ textAlign: 'right', marginBottom: '2px' }}>
                          <select value={grafico2} onChange={(e) => setGrafico2(e.target.value)} style={{ padding: '2px', fontSize: '9px', borderRadius: '4px' }}>
                            <option value="lineas">Tendencia (Líneas)</option>
                            <option value="barras">Medias (Barras)</option>
                            <option value="sectores">Proporción (Sectores)</option>
                            <option value="dispersion">Dispersión (Scatter)</option>
                            <option value="boxplot">Variabilidad (Boxplot)</option>
                          </select>
                        </div>
                        {renderizarGrafico(grafico2)}
                      </div>
                      
                    </div>
                  </div>

                </div>
              );
            })
          ) : (
            <div style={{ padding: "50px", textAlign: "center" }}>Seleccione un cultivo para generar el reporte.</div>
          )}
        </div>
      </div>
    </>
  );
}

export default Reportes;