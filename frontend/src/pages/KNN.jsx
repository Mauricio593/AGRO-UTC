import React, { useState, useEffect } from "react";
import API from "../services/api";
import Navbar from "../components/Navbar";
import "./KNN.css"; 

import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend, PointElement, LineElement, ScatterController } from "chart.js";
import { Bar, Line, Scatter } from "react-chartjs-2";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend, PointElement, LineElement, ScatterController);

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

      const detallesOrdenados = [...(res.data.detalles || [])].sort((a, b) => {
        const tratA = (a.tratamiento || "").toString();
        const tratB = (b.tratamiento || "").toString();
        const comparacionTratamiento = tratA.localeCompare(tratB, undefined, { numeric: true, sensitivity: 'base' });
        
        if (comparacionTratamiento !== 0) return comparacionTratamiento;

        const plantaA = a.planta !== null && a.planta !== undefined ? Number(a.planta) : 0;
        const plantaB = b.planta !== null && b.planta !== undefined ? Number(b.planta) : 0;
        if (plantaA !== plantaB) return plantaA - plantaB;

        const repA = Number(a.repeticion) || 0;
        const repB = Number(b.repeticion) || 0;
        return repA - repB;
      });

      const reporteActualizado = {
        ...res.data,
        detalles: detallesOrdenados
      };

      setReporte(reporteActualizado);

      setGrafica({
        labels: detallesOrdenados.map(d => d.planta ? `P:${d.planta} R:${d.repeticion}` : `R:${d.repeticion}`),
        datasets: [{
          label: `Valores de ${reporteActualizado.variable}`,
          data: detallesOrdenados.map(d => d.valor),
          backgroundColor: detallesOrdenados.map(d => d.es_anomalia ? "rgba(211, 47, 47, 0.85)" : "rgba(2, 119, 189, 0.75)"),
          borderColor: detallesOrdenados.map(d => d.es_anomalia ? "rgba(211, 47, 47, 1)" : "rgba(2, 119, 189, 1)"),
          borderWidth: 1,
          borderRadius: 4,
          tension: 0.3
        }]
      });

    } catch (error) {
      console.error("Detalle completo del error del servidor:", error.response?.data);
      alert(error.response?.data?.error || "Error al conectar con el servidor para procesar KNN. Revisa la consola.");
    } finally {
      setLoading(false);
    }
  };

  const generarGraficoVecinos = () => {
    if (!reporte || !reporte.detalles || reporte.detalles.length === 0) return null;
    
    const datos = reporte.detalles;
    const indicePrueba = 0;
    const puntoPrueba = datos[indicePrueba]; 
    
    const distancias = datos.map((d, i) => ({
      index: i,
      valor: d.valor,
      dist: Math.abs(d.valor - puntoPrueba.valor)
    }));
    
    const vecinos = distancias
      .filter(d => d.index !== indicePrueba)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3);
    
    const lineasVecinos = vecinos.map((v, i) => ({
      type: 'line',
      label: `Conexión Vecino ${i + 1}`,
      data: [
        { x: indicePrueba, y: puntoPrueba.valor },
        { x: v.index, y: v.valor }
      ],
      borderColor: "#ef4444",
      borderWidth: 1.5,
      borderDash: [5, 5],
      showLine: true,
      fill: false,
      pointRadius: 0
    }));

    return {
      datasets: [
        ...lineasVecinos,
        {
          type: 'scatter',
          label: 'Registros Evaluados',
          data: datos.map((d, i) => ({ x: i, y: d.valor })),
          backgroundColor: "#0288d1",
          pointRadius: 6,
          pointHoverRadius: 8
        },
        {
          type: 'scatter',
          label: 'Punto de Prueba (Seleccionado)',
          data: [{ x: indicePrueba, y: puntoPrueba.valor }],
          backgroundColor: "#16a34a",
          pointRadius: 9,
          pointStyle: 'rectRot'
        }
      ]
    };
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

  const generarPDF = (modoPreview = false) => {
    const doc = new jsPDF();
    const fecha = new Date().toLocaleDateString();

    doc.setFillColor(2, 119, 189); 
    doc.rect(0, 0, 210, 25, 'F'); 
    doc.setTextColor(255, 255, 255); 
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Reporte Técnico de Anomalías (KNN / LOF)", 14, 15);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Fecha de generación: ${fecha} | Laboratorio UTC - Sistema In Vitro`, 14, 21);

    let currentY = 35; 
    doc.setTextColor(40, 40, 40); 

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("1. Resumen del Análisis", 14, currentY);
    currentY += 7;
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Cultivo: ${getNombreCultivo()} | Lote: ${getNombreLote()} | Año: ${filtros.anio}`, 14, currentY);
    currentY += 6;
    doc.text(`Variable analizada: ${reporte.variable}`, 14, currentY);
    currentY += 6;
    doc.text(`Total Registros: ${reporte.total_analizado} | Anomalías Detectadas: ${reporte.total_anomalias}`, 14, currentY);
    currentY += 12;

    if (reporte.metricas) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("2. Evaluación del Modelo Predictivo (Validación Cruzada k-fold)", 14, currentY);
      currentY += 7;

      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.text("La validación cruzada k-fold divide los datos en k grupos para iterar la detección y garantizar que los resultados sean confiables.", 14, currentY, { maxWidth: 180 });
      currentY += 10;
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Exactitud (Accuracy): ${reporte.metricas.accuracy}%`, 14, currentY);
      doc.text(`Precisión: ${reporte.metricas.precision}%`, 110, currentY);
      currentY += 6;
      doc.text(`Sensibilidad (Recall): ${reporte.metricas.recall}%`, 14, currentY);
      doc.text(`F1-Score: ${reporte.metricas.f1_score}%`, 110, currentY);
      currentY += 10;

      if (reporte.metricas.matriz_confusion) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("Matriz de Confusión Detallada:", 14, currentY);
        currentY += 4;

        const mc = reporte.metricas.matriz_confusion;
        autoTable(doc, {
          startY: currentY,
          head: [['', 'Predicción: Anomalía', 'Predicción: Normal']],
          body: [
            ['Real: Anomalía', `${mc[0][0]} (Verdaderos Positivos)`, `${mc[0][1]} (Falsos Negativos)`],
            ['Real: Normal', `${mc[1][0]} (Falsos Positivos)`, `${mc[1][1]} (Verdaderos Negativos)`]
          ],
          theme: 'grid',
          styles: { fontSize: 9, halign: 'center' },
          headStyles: { fillColor: [2, 119, 189], textColor: [255, 255, 255], fontStyle: 'bold' },
          columnStyles: { 0: { fontStyle: 'bold', halign: 'left', fillColor: [241, 245, 249] } },
          margin: { left: 14, right: 40 }
        });

        currentY = doc.lastAutoTable.finalY + 10;
      }
    }

    if (listaAnomaliasDetalladas.length > 0) {
      if (currentY > 240) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("3. Diagnóstico Técnico de Anomalías", 14, currentY);
      currentY += 7;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      listaAnomaliasDetalladas.forEach(item => {
        let conclusionLimpia = item.conclusion
          .replace(/⚠️/g, '[ALERTA]')
          .replace(/🌱/g, '[NOTA BIOLÓGICA]');

        const texto = `• ${item.identificador} (${item.tratamiento}): ${conclusionLimpia}`;
        const lineas = doc.splitTextToSize(texto, 180); 
        
        if (currentY + (lineas.length * 5) > 280) {
          doc.addPage();
          currentY = 20;
        }
        
        doc.text(lineas, 14, currentY);
        currentY += (lineas.length * 5) + 3; 
      });
      currentY += 8;
    }

    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("4. Detalle de Registros Analizados", 14, currentY);

    const tableData = reporte.detalles.map(d => [
      d.planta ? `${d.planta} (R: ${d.repeticion})` : `R: ${d.repeticion}`,
      d.tratamiento,
      d.valor,
      d.es_anomalia ? "ANOMALÍA" : "NORMAL"
    ]);

    autoTable(doc, {
      startY: currentY + 5,
      head: [['Planta (Rep)', 'Tratamiento', `Valor (${reporte.variable})`, 'Estado']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [2, 119, 189] },
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
      doc.addPage(); 
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("5. Representación Gráfica Multidimensional", 14, 20);
      
      const imgData = canvas.toDataURL("image/png", 1.0); 
      const pdfWidth = 180; 
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width; 
      
      doc.addImage(imgData, 'PNG', 15, 30, pdfWidth, pdfHeight);
    }

    if (modoPreview) {
      const pdfBlobUrl = doc.output('bloburl');
      window.open(pdfBlobUrl, '_blank');
    } else {
      doc.save(`Reporte-anomalias_${getNombreCultivo()}_${reporte.variable}.pdf`);
    }
  };

  const opcionesGrafica = { 
    responsive: true, 
    maintainAspectRatio: false, 
    animation: { duration: 0 }, 
    plugins: { 
      legend: { display: false },
      datalabels: { display: false } 
    },
    scales: { 
      x: {
        ticks: { maxRotation: 45, minRotation: 0, autoSkip: true, maxTicksLimit: 15 }
      },
      y: { 
        title: { display: true, text: `Escala (${reporte?.variable || ''})`, font: { weight: 'bold' } } 
      } 
    }
  };

  const opcionesScatter = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: { filter: (item) => !item.text.includes('Conexión') }
      },
      tooltip: {
        callbacks: { label: (context) => `Muestra #${context.parsed.x} | Valor: ${context.parsed.y}` }
      },
      datalabels: { display: false }
    },
    scales: {
      x: {
        type: 'linear',
        title: { display: true, text: 'Índice de Secuencia', font: { weight: 'bold' } },
        ticks: { precision: 0, stepSize: 1 }
      },
      y: {
        type: 'linear',
        title: { display: true, text: `Valor (${reporte?.variable || ''})`, font: { weight: 'bold' } }
      }
    }
  };

  return (
    <div className="page-container">
      <Navbar />
      <div className="main-container">
        
        <div className="header-container">
          <h3>🔍 ANOMALIAS </h3>
          <p style={{ color: "#64748b", marginTop: "5px", marginBottom: 0 }}>
            Análisis matemático multidimensional mediante vecinos más cercanos (KNN) para la detección de incongruencias.
          </p>
        </div>

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
              <label className="form-label">3. Año:</label>
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
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => generarPDF(true)} className="btn" style={{ backgroundColor: "#0288d1", color: "white" }}>
                  👁️ Vista Previa PDF
                </button>
                <button onClick={() => generarPDF(false)} className="btn" style={{ backgroundColor: "#ef4444", color: "white" }}>
                  ⬇️ Descargar PDF
                </button>
              </div>
            )}
          </div>
        </div>

        {reporte && (
          <div style={{ marginTop: "20px" }}>
            
            <div className="form-card resumen-card">
              <h3 style={{ margin: "0 0 10px 0", color: "#1e293b" }}>{reporte.contexto}</h3>
              <p style={{ fontSize: "1.1em", margin: 0, color: "#475569" }}>
                Puntos de control analizados: <strong>{reporte.total_analizado}</strong> | 
                Aislados Atípicos (Anomalías): <strong style={{color: "#d32f2f"}}>{reporte.total_anomalias}</strong>
              </p>
            </div>

            {reporte.metricas && (
              <div className="form-card" style={{ marginTop: "20px", marginBottom: "20px" }}>
                <h4 style={{ borderBottom: "2px solid #e2e8f0", paddingBottom: "10px", marginTop: 0 }}>
                  📊 Evaluación del Modelo (Validación Cruzada k-fold)
                </h4>
                
                <div style={{ display: "flex", gap: "15px", flexWrap: "wrap", marginTop: "15px" }}>
                  <div style={{ flex: 1, minWidth: "140px", padding: "15px", backgroundColor: "#f8fafc", borderRadius: "8px", textAlign: "center", border: "1px solid #e2e8f0" }}>
                    <span style={{ display: "block", fontSize: "0.9em", color: "#64748b", fontWeight: "600" }}>Exactitud (Accuracy)</span>
                    <strong style={{ fontSize: "1.6em", color: "#0f172a", display: "block", margin: "5px 0" }}>{reporte.metricas.accuracy}%</strong>
                  </div>
                  <div style={{ flex: 1, minWidth: "140px", padding: "15px", backgroundColor: "#f8fafc", borderRadius: "8px", textAlign: "center", border: "1px solid #e2e8f0" }}>
                    <span style={{ display: "block", fontSize: "0.9em", color: "#64748b", fontWeight: "600" }}>Precisión</span>
                    <strong style={{ fontSize: "1.6em", color: "#0f172a", display: "block", margin: "5px 0" }}>{reporte.metricas.precision}%</strong>
                  </div>
                  <div style={{ flex: 1, minWidth: "140px", padding: "15px", backgroundColor: "#f8fafc", borderRadius: "8px", textAlign: "center", border: "1px solid #e2e8f0" }}>
                    <span style={{ display: "block", fontSize: "0.9em", color: "#64748b", fontWeight: "600" }}>Sensibilidad (Recall)</span>
                    <strong style={{ fontSize: "1.6em", color: "#0f172a", display: "block", margin: "5px 0" }}>{reporte.metricas.recall}%</strong>
                  </div>
                  <div style={{ flex: 1, minWidth: "140px", padding: "15px", backgroundColor: "#f8fafc", borderRadius: "8px", textAlign: "center", border: "1px solid #e2e8f0" }}>
                    <span style={{ display: "block", fontSize: "0.9em", color: "#64748b", fontWeight: "600" }}>F1-Score</span>
                    <strong style={{ fontSize: "1.6em", color: "#0f172a", display: "block", margin: "5px 0" }}>{reporte.metricas.f1_score}%</strong>
                  </div>
                </div>

                {/* DETALLES DE MÉTRICAS */}
                <div style={{ backgroundColor: "#f1f5f9", padding: "15px", borderRadius: "8px", marginTop: "20px", fontSize: "0.88em", color: "#334155" }}>
                  <strong style={{ display: "block", marginBottom: "8px", color: "#0f172a" }}>ℹ️ Interpretación de Métricas del Modelo:</strong>
                  <ul style={{ margin: 0, paddingLeft: "20px", lineHeight: "1.6" }}>
                    <li><strong>Exactitud (Accuracy):</strong> Porcentaje general de predicciones correctas (anomalías y normales).</li>
                    <li><strong>Precisión:</strong> De todas las muestras clasificadas como anomalías, la proporción que realmente correspondía a un dato atípico.</li>
                    <li><strong>Sensibilidad (Recall):</strong> De todas las anomalías reales presentes en los datos, el porcentaje que el modelo logró detectar con éxito.</li>
                    <li><strong>F1-Score:</strong> Media armónica entre la Precisión y la Sensibilidad, útil para equilibrar falsos positivos y falsos negativos.</li>
                    <li><strong>Validación Cruzada k-fold:</strong> Método que divide el conjunto de datos en $k$ partes para probar recursivamente el algoritmo y asegurar que los resultados sean consistentes y no fruto del azar.</li>
                  </ul>
                </div>

                {reporte.metricas.matriz_confusion && (
                  <div style={{ marginTop: "25px" }}>
                    <h5 style={{ color: "#475569", marginBottom: "12px" }}>Matriz de Confusión Detallada</h5>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", maxWidth: "480px", borderCollapse: "collapse", textAlign: "center", fontSize: "13px" }}>
                        <thead>
                          <tr>
                            <th colSpan="2" rowSpan="2" style={{ border: "none", backgroundColor: "transparent" }}></th>
                            <th colSpan="2" style={{ backgroundColor: "#0277bd", color: "white", padding: "6px", borderRadius: "4px 4px 0 0" }}>
                              Predicción del Algoritmo
                            </th>
                          </tr>
                          <tr>
                            <th style={{ backgroundColor: "#e2e8f0", color: "#334155", padding: "8px", width: "35%" }}>Anomalía</th>
                            <th style={{ backgroundColor: "#e2e8f0", color: "#334155", padding: "8px", width: "35%" }}>Normal</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td rowSpan="2" style={{ backgroundColor: "#475569", color: "white", fontWeight: "bold", writingMode: "vertical-lr", transform: "rotate(180deg)", padding: "10px", borderRadius: "4px 0 0 4px" }}>
                              Valor Real
                            </td>
                            <td style={{ backgroundColor: "#f1f5f9", fontWeight: "bold", color: "#334155", padding: "10px" }}>
                              Anomalía
                            </td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "10px", backgroundColor: "#f0fdf4" }}>
                              <strong style={{ color: "#16a34a", fontSize: "1.2em", display: "block" }}>
                                {reporte.metricas.matriz_confusion[0][0]}
                              </strong>
                              <span style={{ fontSize: "10px", color: "#15803d" }}>Verdaderos Positivos</span>
                            </td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "10px", backgroundColor: "#fef2f2" }}>
                              <strong style={{ color: "#dc2626", fontSize: "1.2em", display: "block" }}>
                                {reporte.metricas.matriz_confusion[0][1]}
                              </strong>
                              <span style={{ fontSize: "10px", color: "#b91c1c" }}>Falsos Negativos</span>
                            </td>
                          </tr>
                          <tr>
                            <td style={{ backgroundColor: "#f1f5f9", fontWeight: "bold", color: "#334155", padding: "10px" }}>
                              Normal
                            </td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "10px", backgroundColor: "#fef2f2" }}>
                              <strong style={{ color: "#dc2626", fontSize: "1.2em", display: "block" }}>
                                {reporte.metricas.matriz_confusion[1][0]}
                              </strong>
                              <span style={{ fontSize: "10px", color: "#b91c1c" }}>Falsos Positivos</span>
                            </td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "10px", backgroundColor: "#f0fdf4" }}>
                              <strong style={{ color: "#16a34a", fontSize: "1.2em", display: "block" }}>
                                {reporte.metricas.matriz_confusion[1][1]}
                              </strong>
                              <span style={{ fontSize: "10px", color: "#15803d" }}>Verdaderos Negativos</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

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
                    <th>Identificador</th>
                    <th>Tratamiento</th>
                    <th>Valor Registrado ({reporte.variable})</th>
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
                        {d.es_anomalia ? "⚠️ REGISTRO ATÍPICO" : "✅ DENTRO DEL RANGO"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="form-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h4 style={{ margin: 0, color: "#475569" }}>Representación Gráfica General</h4>
                <div>
                  <label style={{ marginRight: '10px', fontSize: '14px', fontWeight: 'bold', color: '#64748b' }}>Visualización:</label>
                  <select 
                    value={tipoGrafico} 
                    onChange={(e) => setTipoGrafico(e.target.value)} 
                    style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="bar">📊 Gráfico de Barras</option>
                    <option value="line">📉 Gráfico de Líneas</option>
                  </select>
                </div>
              </div>

              <div className="chart-container" style={{ height: "400px", backgroundColor: "#fff", position: "relative" }}>
                {tipoGrafico === "bar" ? (
                  <Bar data={grafica} options={opcionesGrafica} />
                ) : (
                  <Line data={grafica} options={opcionesGrafica} />
                )}
              </div>
            </div>

            <div className="form-card" style={{ marginTop: "25px" }}>
              <h4 style={{ margin: "0 0 15px 0", color: "#475569" }}>
                Demostración del Algoritmo: K-Vecinos Más Cercanos
              </h4>
              <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "15px" }}>
                Visualización de cómo el algoritmo calcula la distancia entre el primer registro evaluado (Punto de Prueba) y sus 3 vecinos más cercanos matemáticamente.
              </p>
              <div className="chart-container" style={{ height: "350px", backgroundColor: "#fff", position: "relative" }}>
                {reporte && <Scatter 
                  data={generarGraficoVecinos()} 
                  options={opcionesScatter} 
                />}
              </div>
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
}

export default KNN;