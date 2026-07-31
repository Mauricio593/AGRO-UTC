import React, { useState, useEffect } from "react";
import axios from "axios";
import { getAuthHeaders } from "../services/auth";
import Navbar from "../components/Navbar";

// Importación del CSS separado
import "./KNN.css"; 

import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";
import { Bar } from "react-chartjs-2";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

function KNN() {
  // 1. Estado para almacenar los IDs y selecciones exactas
  const [filtros, setFiltros] = useState({ cultivoId: "", loteId: "", anio: "", variable: "" });
  
  // 2. Estado para almacenar las listas de datos que vienen del backend
  const [listas, setListas] = useState({ cultivos: [], lotes: [], anios: [], variables: [] });
  
  const [reporte, setReporte] = useState(null);
  const [loading, setLoading] = useState(false);
  const [grafica, setGrafica] = useState(null);

  // ==========================================================
  // LÓGICA DE CARGA EN CASCADA (RELACIONAL)
  // ==========================================================

  // A. Cargar Cultivos y Variables al abrir la pantalla
  useEffect(() => {
    const headers = getAuthHeaders();
    
    axios.get('http://127.0.0.1:8000/api/cultivos/', headers)
      .then(res => setListas(prev => ({ ...prev, cultivos: res.data })))
      .catch(err => console.error("Error cargando cultivos:", err));

    axios.get('http://127.0.0.1:8000/api/variables/', headers)
      .then(res => {
        // CORRECCIÓN: Filtramos para mantener los objetos únicos (con id y nombre) en lugar de solo strings
        const variablesUnicas = res.data.filter((v, index, self) =>
          index === self.findIndex((t) => t.nombre === v.nombre)
        );
        setListas(prev => ({ ...prev, variables: variablesUnicas }));
      })
      .catch(err => console.error("Error cargando variables:", err));
  }, []);

  // B. Cargar Lotes SOLO del Cultivo seleccionado
  useEffect(() => {
    if (filtros.cultivoId) {
      axios.get(`http://127.0.0.1:8000/api/unidades/?cultivo=${filtros.cultivoId}`, getAuthHeaders())
        .then(res => setListas(prev => ({ ...prev, lotes: res.data })))
        .catch(err => console.error("Error cargando lotes:", err));
    } else {
      setListas(prev => ({ ...prev, lotes: [], anios: [] }));
    }
  }, [filtros.cultivoId]);

  // C. Cargar Años SOLO del Lote seleccionado
  useEffect(() => {
    if (filtros.loteId) {
      axios.get(`http://127.0.0.1:8000/api/experimentos/?unidad=${filtros.loteId}`, getAuthHeaders())
        .then(res => {
          // Filtramos años para que no se repitan en el menú desplegable
          const aniosUnicos = [...new Set(res.data.map(a => a.anio))];
          setListas(prev => ({ ...prev, anios: aniosUnicos }));
        })
        .catch(err => console.error("Error cargando años:", err));
    } else {
      setListas(prev => ({ ...prev, anios: [] }));
    }
  }, [filtros.loteId]);


  // ==========================================================
  // FUNCIONES DE ANÁLISIS Y REPORTE
  // ==========================================================

  const analizarDatos = async () => {
    if (!filtros.cultivoId || !filtros.loteId || !filtros.anio || !filtros.variable) {
      return alert("Por favor selecciona todos los campos del filtro.");
    }

    setLoading(true);
    try {
      const authConfig = getAuthHeaders();

      // CORRECCIÓN: Usamos el objeto 'params' de Axios. Así evitamos concatenar strings manuales 
      // y se codifican correctamente los espacios y caracteres especiales de la variable.
      const res = await axios.get("http://127.0.0.1:8000/api/knn-anomalias-existentes/", {
        params: {
          cultivo: filtros.cultivoId,
          lote: filtros.loteId,
          anio: filtros.anio,
          variable: filtros.variable // Envía el ID limpio que espera Django
        },
        ...authConfig 
      });

      setReporte(res.data);

      setGrafica({
        labels: res.data.detalles.map(d => `P:${d.planta} R:${d.repeticion}`),
        datasets: [{
          label: `Valores de ${res.data.variable}`,
          data: res.data.detalles.map(d => d.valor),
          backgroundColor: res.data.detalles.map(d => d.es_anomalia ? "rgba(211, 47, 47, 0.85)" : "rgba(2, 119, 189, 0.75)"),
          borderRadius: 4
        }]
      });
    } catch (error) {
      console.error("Detalle completo del error del servidor:", error.response?.data);
      alert(error.response?.data?.error || "Error al conectar con el servidor para procesar KNN. Revisa la consola.");
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
        conclusion = `⚠️ Probable Error de Digitación: El valor (${anom.valor}) presenta una desviación crítica del ${desvioPorcentaje}% respecto al comportamiento general. Se sugiere verificar las bitácoras físicas.`;
      } else {
        conclusion = `🌱 Desviación Biológica / Mutación: Registra una variación del ${desvioPorcentaje}% del estándar. Puede tratarse de una respuesta atípica del explante al tratamiento ${anom.tratamiento}.`;
      }

      return {
        identificador: `Planta ${anom.planta} (Repetición ${anom.repeticion})`,
        tratamiento: anom.tratamiento,
        valor: anom.valor,
        conclusion: conclusion
      };
    });
  };

  const listaAnomaliasDetalladas = procesarDetalleAnomalias();

  // Función para obtener nombres reales (para el PDF) basados en los IDs seleccionados
  const getNombreCultivo = () => listas.cultivos.find(c => c.id.toString() === filtros.cultivoId)?.nombre || '';
  const getNombreLote = () => listas.lotes.find(l => l.id.toString() === filtros.loteId)?.nombre || '';

  const generarPDF = () => {
    const doc = new jsPDF();
    const fecha = new Date().toLocaleDateString();

    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text("Reporte de Auditoría de Anomalías (KNN/LOF)", 14, 22);
    
    doc.setFontSize(10);
    doc.text(`Fecha de generación: ${fecha}`, 14, 30);
    doc.text(`Laboratorio UTC - Sistema In Vitro`, 14, 35);

    doc.setFontSize(12);
    doc.text("Resumen del Análisis:", 14, 45);
    doc.setFontSize(10);
    doc.text(`Cultivo: ${getNombreCultivo()} | Lote: ${getNombreLote()} | Año: ${filtros.anio}`, 14, 52);
    doc.text(`Variable analizada: ${reporte.variable}`, 14, 57);
    doc.text(`Total Registros: ${reporte.total_analizado} | Anomalías: ${reporte.total_anomalias}`, 14, 62);

    const tableData = reporte.detalles.map(d => [
      `${d.planta} (R: ${d.repeticion})`,
      d.tratamiento,
      d.valor,
      d.es_anomalia ? "ANOMALÍA" : "NORMAL"
    ]);

    autoTable(doc, {
      startY: 70,
      head: [['Planta (Rep)', 'Tratamiento', `Valor (${reporte.variable})`, 'Estado']],
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

    const canvas = document.querySelector('canvas');
    if (canvas) {
      const imgData = canvas.toDataURL("image/png");
      const currentY = doc.lastAutoTable.finalY + 10;
      
      if (currentY > 200) {
        doc.addPage();
        doc.text("Gráfica de Distribución y Desviaciones:", 14, 20);
        doc.addImage(imgData, 'PNG', 15, 30, 180, 80);
      } else {
        doc.text("Gráfica de Distribución y Desviaciones:", 14, currentY);
        doc.addImage(imgData, 'PNG', 15, currentY + 5, 180, 80);
      }
    }

    doc.save(`Reporte_Auditoria_${getNombreCultivo()}_${reporte.variable}.pdf`);
  };

  return (
    <div className="page-container">
      <Navbar />
      <div className="main-container">
        
        <div className="header-container">
          <h3>🔍 Búsqueda y Auditoría de Anomalías</h3>
          <p style={{ color: "#64748b", marginTop: "5px", marginBottom: 0 }}>
            Análisis matemático multidimensional mediante vecindad más cercana (KNN) para la detección de incongruencias en datos agrónomos e histológicos.
          </p>
        </div>

        {/* ==============================================
            FORMULARIO DE FILTROS EN CASCADA
        ============================================== */}
        <div className="form-card">
          <div className="grid-filters">
            
            <div className="filter-item">
              <label className="form-label">1. Cultivo:</label>
              <select 
                className="form-input" 
                value={filtros.cultivoId} 
                onChange={e => setFiltros({ cultivoId: e.target.value, loteId: "", anio: "", variable: "" })}
              >
                <option value="">-- Seleccione Cultivo --</option>
                {listas.cultivos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>

            <div className="filter-item">
              <label className="form-label">2. Lote/Unidad:</label>
              <select 
                className="form-input" 
                value={filtros.loteId} 
                disabled={!filtros.cultivoId}
                onChange={e => setFiltros({ ...filtros, loteId: e.target.value, anio: "", variable: "" })}
              >
                <option value="">-- Seleccione Lote --</option>
                {listas.lotes.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
              </select>
            </div>

            <div className="filter-item">
              <label className="form-label">3. Campaña/Año:</label>
              <select 
                className="form-input" 
                value={filtros.anio} 
                disabled={!filtros.loteId}
                onChange={e => setFiltros({ ...filtros, anio: e.target.value, variable: "" })}
              >
                <option value="">-- Seleccione Año --</option>
                {listas.anios.map((anio, i) => <option key={i} value={anio}>{anio}</option>)}
              </select>
            </div>

            <div className="filter-item">
              <label className="form-label">4. Variable:</label>
              {/* CORRECCIÓN: El value ahora es v.id mapeando correctamente las Llaves Foráneas */}
              <select 
                className="form-input" 
                value={filtros.variable} 
                disabled={!filtros.anio}
                onChange={e => setFiltros({ ...filtros, variable: e.target.value })}
              >
                <option value="">-- Seleccione Variable --</option>
                {listas.variables.map((v, i) => <option key={i} value={v.id}>{v.nombre}</option>)}
              </select>
            </div>
          </div>
          
          <div className="action-buttons">
            <button onClick={analizarDatos} className="btn btn-add" disabled={loading}>
              {loading ? "⏳ Procesando Muestras..." : "🔍 Iniciar Análisis Computacional"}
            </button>
            
            {reporte && (
              <button onClick={generarPDF} className="btn" style={{ backgroundColor: "#ef4444", color: "white" }}>
                📄 Exportar Documento PDF
              </button>
            )}
          </div>
        </div>

        {/* PRESENTACIÓN DE RESULTADOS */}
        {reporte && (
          <div style={{ marginTop: "20px" }}>
            
            <div className="form-card resumen-card">
              <h3 style={{ margin: "0 0 10px 0", color: "#1e293b" }}>{reporte.contexto}</h3>
              <p style={{ fontSize: "1.1em", margin: 0, color: "#475569" }}>
                Puntos de control analizados: <strong>{reporte.total_analizado}</strong> | 
                Aislados Atípicos (Anomalías): <strong style={{color: "#d32f2f"}}>{reporte.total_anomalias}</strong>
              </p>
            </div>

            {listaAnomaliasDetalladas.length > 0 && (
              <div className="anomaly-diagnostic-panel">
                <div className="diagnostic-card">
                  <h4>⚠️ Diagnóstico Técnico de Variabilidad Agronómica</h4>
                  <ul className="diagnostic-list">
                    {listaAnomaliasDetalladas.map((item, index) => (
                      <li key={index}>
                        En la <strong>{item.identificador}</strong> bajo el tratamiento <strong>{item.tratamiento}</strong>: 
                        {item.conclusion}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="table-wrapper">
              <table className="sql-table">
                <thead>
                  <tr>
                    <th>Planta (Repetición)</th>
                    <th>Tratamiento</th>
                    <th>Valor Registrado ({reporte.variable})</th>
                    <th>Estado de Auditoría</th>
                  </tr>
                </thead>
                <tbody>
                  {reporte.detalles.map((d, i) => (
                    <tr key={i} style={{ backgroundColor: d.es_anomalia ? "#fef2f2" : "transparent" }}>
                      <td>{d.planta} (R: {d.repeticion})</td>
                      <td>{d.tratamiento}</td>
                      <td style={{ fontWeight: "bold" }}>{d.valor}</td>
                      <td style={{ color: d.es_anomalia ? "#dc2626" : "#16a34a", fontWeight: "bold" }}>
                        {d.es_anomalia ? "⚠️ REGISTRO ATÍPICO" : "✅ DENTRO DEL RANGO"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="form-card chart-container">
              <Bar 
                data={grafica} 
                options={{ 
                  responsive: true, 
                  maintainAspectRatio: false, 
                  plugins: { legend: { display: false } },
                  scales: { y: { title: { display: true, text: `Escala (${reporte.variable})`, font: { weight: 'bold' } } } }
                }} 
              />
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
}

export default KNN;