import React, { useState, useEffect } from "react";
import API from "../services/api"; 
import Navbar from "../components/Navbar";

import "./KNN.css"; 

import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend, PointElement, LineElement } from "chart.js";
import { Bar, Line } from "react-chartjs-2";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend, PointElement, LineElement);

function KNN() {
  const [filtros, setFiltros] = useState({ cultivoId: "", loteId: "", anio: "", variable: "" });
  const [listas, setListas] = useState({ cultivos: [], lotes: [], anios: [], variables: [] });
  
  const [reporte, setReporte] = useState(null);
  const [loading, setLoading] = useState(false);
  const [grafica, setGrafica] = useState(null);
  
  const [tipoGrafico, setTipoGrafico] = useState("bar"); 

  useEffect(() => {
    API.get('cultivos/')
      .then(res => setListas(prev => ({ ...prev, cultivos: res.data })))
      .catch(err => console.error("Error cargando cultivos:", err));

    API.get('variables/')
      .then(res => {
        const variablesUnicas = res.data.filter((v, index, self) =>
          index === self.findIndex((t) => t.nombre === v.nombre)
        );
        setListas(prev => ({ ...prev, variables: variablesUnicas }));
      })
      .catch(err => console.error("Error cargando variables:", err));
  }, []);

  useEffect(() => {
    if (filtros.cultivoId) {
      API.get(`unidades/?cultivo=${filtros.cultivoId}`)
        .then(res => setListas(prev => ({ ...prev, lotes: res.data })))
        .catch(err => console.error("Error cargando lotes:", err));
    } else {
      setListas(prev => ({ ...prev, lotes: [], anios: [] }));
    }
  }, [filtros.cultivoId]);

  useEffect(() => {
    if (filtros.loteId) {
      API.get(`experimentos/?unidad=${filtros.loteId}`)
        .then(res => {
          const aniosUnicos = [...new Set(res.data.map(a => a.anio))];
          setListas(prev => ({ ...prev, anios: aniosUnicos }));
        })
        .catch(err => console.error("Error cargando años:", err));
    } else {
      setListas(prev => ({ ...prev, anios: [] }));
    }
  }, [filtros.loteId]);


  const analizarDatos = async () => {
    if (!filtros.cultivoId || !filtros.loteId || !filtros.anio || !filtros.variable) {
      return alert("Por favor selecciona todos los campos del filtro.");
    }

    setLoading(true);
    try {
      const res = await API.get("knn-anomalias-existentes/", {
        params: {
          cultivo: filtros.cultivoId,
          lote: filtros.loteId,
          anio: filtros.anio,
          variable: filtros.variable 
        }
      });

      setReporte(res.data);

      setGrafica({
        labels: res.data.detalles.map(d => d.planta ? `P:${d.planta} R:${d.repeticion}` : `R:${d.repeticion}`),
        datasets: [{
          label: `Valores de ${res.data.variable}`,
          data: res.data.detalles.map(d => d.valor),
          backgroundColor: res.data.detalles.map(d => d.es_anomalia ? "rgba(211, 47, 47, 0.85)" : "rgba(2, 119, 189, 0.75)"),
          borderColor: res.data.detalles.map(d => d.es_anomalia ? "rgba(211, 47, 47, 1)" : "rgba(2, 119, 189, 1)"),
          borderWidth: 1,
          borderRadius: 4,
          tension: 0.3 
        }]
      });
    } catch (error) {
      console.error("Detalle error:", error.response?.data);
      alert(error.response?.data?.error || "Error procesando análisis.");
    } finally {
      setLoading(false);
    }
  };

  const procesarDetalleAnomalias = () => {
    if (!reporte || !reporte.detalles) return [];
    
    const anomalias = reporte.detalles.filter(d => d.es_anomalia);
    if (anomalias.length === 0) return [];

    const normales = reporte.detalles.filter(d => !d.es_anomalia);
    const mediaNormales = normales.length > 0 
      ? normales.reduce((sum, current) => sum + current.valor, 0) / normales.length 
      : 0;

    return anomalias.map(anom => {
      const desvioPorcentaje = mediaNormales > 0 
        ? Math.abs(((anom.valor - mediaNormales) / mediaNormales) * 100).toFixed(1) 
        : 0;

      let conclusion = "";
      if (desvioPorcentaje > 150 || anom.valor === 0) {
        conclusion = `⚠️ Probable Error: Desviación crítica del ${desvioPorcentaje}%. Verificar bitácoras físicas.`;
      } else {
        conclusion = `🌱 Variación Atípica: Registra una desviación del ${desvioPorcentaje}% al tratamiento ${anom.tratamiento}.`;
      }

      return {
        identificador: anom.planta ? `Planta ${anom.planta} (Repetición ${anom.repeticion})` : `Repetición ${anom.repeticion}`,
        tratamiento: anom.tratamiento,
        valor: anom.valor,
        conclusion: conclusion
      };
    });
  };

  const listaAnomaliasDetalladas = procesarDetalleAnomalias();
  const getNombreCultivo = () => listas.cultivos.find(c => c.id.toString() === filtros.cultivoId)?.nombre || '';
  const getNombreLote = () => listas.lotes.find(l => l.id.toString() === filtros.loteId)?.nombre || '';

  const generarPDF = () => {
    const doc = new jsPDF();
    const fecha = new Date().toLocaleDateString();

    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text("Reporte de Auditoría de Anomalías", 14, 22);
    
    doc.setFontSize(10);
    doc.text(`Fecha: ${fecha} | Laboratorio UTC`, 14, 30);
    doc.text(`Cultivo: ${getNombreCultivo()} | Lote: ${getNombreLote()} | Año: ${filtros.anio}`, 14, 40);
    doc.text(`Total Registros: ${reporte.total_analizado} | Anomalías: ${reporte.total_anomalias}`, 14, 45);

    const tableData = reporte.detalles.map(d => [
      d.planta ? `${d.planta} (R: ${d.repeticion})` : `R: ${d.repeticion}`,
      d.tratamiento,
      d.valor,
      d.es_anomalia ? "ANOMALÍA" : "NORMAL"
    ]);

    autoTable(doc, {
      startY: 55,
      head: [['Identificador', 'Tratamiento', 'Valor', 'Estado']],
      body: tableData,
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          if (data.cell.raw === 'ANOMALÍA') {
            data.cell.styles.textColor = [211, 47, 47];
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [46, 125, 50];
          }
        }
      }
    });
    doc.save(`Auditoria_${getNombreCultivo()}.pdf`);
  };

  const opcionesGrafica = { 
    responsive: true, 
    maintainAspectRatio: false, 
    plugins: { legend: { display: false } },
    scales: { y: { title: { display: true, text: `Escala`, font: { weight: 'bold' } } } }
  };

  return (
    <div className="page-container">
      <Navbar />
      <div className="main-container">
        
        <div className="header-container">
          <h3>🔍 AUDITORÍA DE ANOMALÍAS (KNN / LOF / I-Forest) </h3>
          <p style={{ color: "#64748b", marginTop: "5px", marginBottom: 0 }}>
            Análisis multidimensional de algoritmos de Machine Learning para detección de inconsistencias.
          </p>
        </div>

        <div className="form-card">
          <div className="grid-filters">
            <div className="filter-item">
              <label className="form-label">1. Cultivo:</label>
              <select className="form-input" value={filtros.cultivoId} onChange={e => setFiltros({ cultivoId: e.target.value, loteId: "", anio: "", variable: "" })}>
                <option value="">-- Seleccione --</option>
                {listas.cultivos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div className="filter-item">
              <label className="form-label">2. Lote:</label>
              <select className="form-input" value={filtros.loteId} disabled={!filtros.cultivoId} onChange={e => setFiltros({ ...filtros, loteId: e.target.value, anio: "", variable: "" })}>
                <option value="">-- Seleccione --</option>
                {listas.lotes.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
              </select>
            </div>
            <div className="filter-item">
              <label className="form-label">3. Año:</label>
              <select className="form-input" value={filtros.anio} disabled={!filtros.loteId} onChange={e => setFiltros({ ...filtros, anio: e.target.value, variable: "" })}>
                <option value="">-- Seleccione --</option>
                {listas.anios.map((anio, i) => <option key={i} value={anio}>{anio}</option>)}
              </select>
            </div>
            <div className="filter-item">
              <label className="form-label">4. Variable:</label>
              <select className="form-input" value={filtros.variable} disabled={!filtros.anio} onChange={e => setFiltros({ ...filtros, variable: e.target.value })}>
                <option value="">-- Seleccione --</option>
                {listas.variables.map((v, i) => <option key={i} value={v.id}>{v.nombre}</option>)}
              </select>
            </div>
          </div>
          
          <div className="action-buttons">
            <button onClick={analizarDatos} className="btn btn-add" disabled={loading}>
              {loading ? "⏳ Procesando Modelos..." : "🔍 Ejecutar Inteligencia Artificial"}
            </button>
            {reporte && (
              <button onClick={generarPDF} className="btn" style={{ backgroundColor: "#ef4444", color: "white" }}>📄 Exportar PDF</button>
            )}
          </div>
        </div>

        {reporte && (
          <div style={{ marginTop: "20px" }}>
            
            <div className="form-card resumen-card">
              <h3 style={{ margin: "0 0 10px 0", color: "#1e293b" }}>{reporte.contexto}</h3>
              <p style={{ fontSize: "1.1em", margin: 0, color: "#475569" }}>
                Puntos de control: <strong>{reporte.total_analizado}</strong> | Anomalías Encontradas: <strong style={{color: "#d32f2f"}}>{reporte.total_anomalias}</strong>
              </p>
            </div>

            {/* SECCIÓN NUEVA: Comparativa de 3 Algoritmos */}
            {reporte.metricas && reporte.metricas.KNN && (
              <div className="form-card" style={{ marginTop: "20px", marginBottom: "20px" }}>
                <h4 style={{ borderBottom: "2px solid #e2e8f0", paddingBottom: "10px", marginTop: 0 }}>
                  🤖 Comparativa de Rendimiento (Machine Learning)
                </h4>
                
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px", marginTop: "15px" }}>
                  
                  {/* Tarjeta KNN */}
                  <div style={{ padding: "15px", backgroundColor: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "8px" }}>
                    <h5 style={{ margin: "0 0 12px 0", color: "#0369a1", textAlign: "center", fontSize:"15px" }}>K-Nearest Neighbors (KNN)</h5>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, color: "#334155", fontSize: "14px" }}>
                      <li style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}><span>Exactitud:</span> <strong>{reporte.metricas.KNN.accuracy}%</strong></li>
                      <li style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}><span>Precisión:</span> <strong>{reporte.metricas.KNN.precision}%</strong></li>
                      <li style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}><span>Sensibilidad:</span> <strong>{reporte.metricas.KNN.recall}%</strong></li>
                      <li style={{ display: "flex", justifyContent: "space-between" }}><span>F1-Score:</span> <strong>{reporte.metricas.KNN.f1_score}%</strong></li>
                    </ul>
                  </div>

                  {/* Tarjeta Isolation Forest */}
                  <div style={{ padding: "15px", backgroundColor: "#fdf4ff", border: "1px solid #fbcfe8", borderRadius: "8px" }}>
                    <h5 style={{ margin: "0 0 12px 0", color: "#be185d", textAlign: "center", fontSize:"15px" }}>Isolation Forest</h5>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, color: "#334155", fontSize: "14px" }}>
                      <li style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}><span>Exactitud:</span> <strong>{reporte.metricas.IsolationForest.accuracy}%</strong></li>
                      <li style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}><span>Precisión:</span> <strong>{reporte.metricas.IsolationForest.precision}%</strong></li>
                      <li style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}><span>Sensibilidad:</span> <strong>{reporte.metricas.IsolationForest.recall}%</strong></li>
                      <li style={{ display: "flex", justifyContent: "space-between" }}><span>F1-Score:</span> <strong>{reporte.metricas.IsolationForest.f1_score}%</strong></li>
                    </ul>
                  </div>

                  {/* Tarjeta LOF */}
                  <div style={{ padding: "15px", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px" }}>
                    <h5 style={{ margin: "0 0 12px 0", color: "#15803d", textAlign: "center", fontSize:"15px" }}>Local Outlier Factor (LOF)</h5>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, color: "#334155", fontSize: "14px" }}>
                      <li style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}><span>Exactitud:</span> <strong>{reporte.metricas.LOF.accuracy}%</strong></li>
                      <li style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}><span>Precisión:</span> <strong>{reporte.metricas.LOF.precision}%</strong></li>
                      <li style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}><span>Sensibilidad:</span> <strong>{reporte.metricas.LOF.recall}%</strong></li>
                      <li style={{ display: "flex", justifyContent: "space-between" }}><span>F1-Score:</span> <strong>{reporte.metricas.LOF.f1_score}%</strong></li>
                    </ul>
                  </div>

                </div>
              </div>
            )}
            {/* FIN SECCIÓN COMPARATIVA */}

            {listaAnomaliasDetalladas.length > 0 && (
              <div className="anomaly-diagnostic-panel">
                <div className="diagnostic-card">
                  <h4>⚠️ Diagnóstico Técnico</h4>
                  <ul className="diagnostic-list">
                    {listaAnomaliasDetalladas.map((item, index) => (
                      <li key={index}>En <strong>{item.identificador}</strong> (Trat: {item.tratamiento}): {item.conclusion}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="table-wrapper">
              <table className="sql-table">
                <thead>
                  <tr>
                    <th>Identificador</th>
                    <th>Tratamiento</th>
                    <th>Valor</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {reporte.detalles.map((d, i) => (
                    <tr key={i} style={{ backgroundColor: d.es_anomalia ? "#fef2f2" : "transparent" }}>
                      <td>{d.planta ? `${d.planta} (R: ${d.repeticion})` : `Repetición ${d.repeticion}`}</td>
                      <td>{d.tratamiento}</td>
                      <td style={{ fontWeight: "bold" }}>{d.valor}</td>
                      <td style={{ color: d.es_anomalia ? "#dc2626" : "#16a34a", fontWeight: "bold" }}>
                        {d.es_anomalia ? "⚠️ ATÍPICO" : "✅ NORMAL"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="form-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h4 style={{ margin: 0, color: "#475569" }}>Distribución de Datos</h4>
                <div>
                  <select value={tipoGrafico} onChange={(e) => setTipoGrafico(e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                    <option value="bar">📊 Barras</option>
                    <option value="line">📉 Líneas</option>
                  </select>
                </div>
              </div>
              <div className="chart-container" style={{ height: "400px" }}>
                {tipoGrafico === "bar" ? <Bar data={grafica} options={opcionesGrafica} /> : <Line data={grafica} options={opcionesGrafica} />}
              </div>
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
}

export default KNN;