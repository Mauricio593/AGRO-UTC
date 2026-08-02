import React, { useState, useEffect } from "react";
import API from "../services/api"; // Conexión centralizada
import { useNavigate } from "react-router-dom";
import html2pdf from "html2pdf.js";
import Navbar from "../components/Navbar";
import "./Reportes.css";

import { Bar, Line } from "react-chartjs-2";
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

  useEffect(() => {
    const usuarioGuardado = localStorage.getItem("username");
    if (usuarioGuardado) setNombreUsuario(usuarioGuardado);
  }, []);

  // 1. Cargar Cultivos (con ajuste de paginación de Django)
  useEffect(() => {
    API.get("cultivos/")
      .then(res => {
        // Extraemos los datos dependiendo de si Django usa paginación o no
        const data = res.data.results || res.data;
        setCultivos(data);
      })
      .catch(err => console.error("Error al cargar cultivos", err));
  }, []);

  // 2. Cargar Lotes dependiendo del cultivo
  useEffect(() => {
    if (filtro.cultivo) {
      API.get(`unidades/?cultivo=${filtro.cultivo}`)
        .then(res => {
          const data = res.data.results || res.data;
          setLotes(data);
        })
        .catch(console.error);
    } else {
      setLotes([]); 
      setFiltro(f => ({ ...f, lote: "", anio: "" }));
    }
  }, [filtro.cultivo]);

  // 3. Cargar Años dependiendo del lote
  useEffect(() => {
    if (filtro.lote) {
      API.get(`experimentos/?unidad=${filtro.lote}`)
        .then(res => {
          const data = res.data.results || res.data;
          setAnios(data);
        })
        .catch(console.error);
    } else {
      setAnios([]); 
      setFiltro(f => ({ ...f, anio: "" }));
    }
  }, [filtro.lote]);

  // 4. Generar reporte al cambiar filtros
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
        // Aquí no usamos .results porque tu vista personalizada devuelve la lista directo
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
        
        <div className="header-actions">
          <div>
            <h2 className="section-title">📊 Panel de Reportes y Análisis</h2>
            <p style={{ fontSize: "12px", color: "#64748b" }}>
              Bienvenido, <strong>{nombreUsuario}</strong>. Selecciona los parámetros para visualizar el comportamiento.
            </p>
          </div>
        </div>

        {/* AQUÍ ESTÁ EL CAMBIO CLAVE: Usamos las clases de tu CSS (filters-bar, filter-group) */}
        <div className="filters-bar">
          <div className="filter-group">
            <label>Cultivo:</label>
            <select value={filtro.cultivo} onChange={e => setFiltro({ ...filtro, cultivo: e.target.value, lote: "", anio: "" })}>
              <option value="">-- Seleccionar --</option>
              {cultivos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>Lote:</label>
            <select value={filtro.lote} disabled={!filtro.cultivo} onChange={e => setFiltro({ ...filtro, lote: e.target.value, anio: "" })}>
              <option value="">-- Todos --</option>
              {lotes.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
            </select>
          </div>
          <div className="filter-group">
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
            <div style={{ padding: "20px", textAlign: "center", backgroundColor: "white", borderRadius: "8px" }}>
              <p>No hay datos disponibles para los filtros seleccionados o no has seleccionado un cultivo.</p>
            </div>
          ) : (
            datosGraficos.map((dato, index) => (
              <div key={index} className="variable-page">
                <h3 className="section-title">Variabilidad de: {dato.variable}</h3>
                
                <div className="flex-layout">
                  <div className="data-tables-col">
                    <div className="table-wrapper">
                      <h4>Resumen Estadístico</h4>
                      <table className="scientific-table">
                        <thead>
                          <tr>
                            <th>Tratamiento</th>
                            <th>Promedio</th>
                            <th>N° Mediciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dato.tratamientos && dato.tratamientos.map((trat, i) => (
                            <tr key={i}>
                              <td className="text-left">{trat}</td>
                              <td>{dato.promedios[i] ? dato.promedios[i].toFixed(2) : 0.00}</td>
                              <td>{dato.conteos ? dato.conteos[i] : 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="charts-col">
                    <div className="chart-box">
                      <h4>Distribución de Tratamientos</h4>
                      <div className="chart-canvas">
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
                          options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <hr style={{ borderTop: "1px solid #e5e7eb", margin: "15px 0" }} />
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}

export default Reportes;