import React, { useMemo, useState } from 'react';
import html2pdf from 'html2pdf.js';
import { Bar, Chart, Pie, Line, Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  ArcElement
} from 'chart.js';

import { BoxPlotController, BoxAndWiskers } from '@sgratzl/chartjs-chart-boxplot';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Plugin personalizado para dibujar las letras del ANOVA
const pluginLetrasANOVA = {
  id: 'letrasAnova',
  afterDatasetsDraw(chart, args, options) {
    // 🔥 SOLUCIÓN 1: Evitar que el plugin falle si el gráfico no tiene la opción 'letras' configurada
    if (!options || !options.letras) return;

    const { ctx } = chart;
    const barDatasetIndex = chart.config.data.datasets.findIndex(ds => ds.type === 'bar');
    if (barDatasetIndex === -1) return;

    const meta = chart.getDatasetMeta(barDatasetIndex);
    // 🔥 Verificación extra de seguridad para asegurar que los datos meta existan
    if (!meta || !meta.data) return;
    
    ctx.save();
    ctx.font = 'bold 11px Arial'; 
    ctx.fillStyle = '#111827'; 
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    meta.data.forEach((bar, index) => {
      const letra = options.letras[index]; 
      if (letra) {
        ctx.fillText(letra, bar.x, bar.y - 5); 
      }
    });
    ctx.restore();
  }
};

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement, Title, Tooltip, Legend, PointElement, ArcElement, 
  pluginLetrasANOVA, BoxPlotController, BoxAndWiskers, ChartDataLabels
);

const AnalisisEstadistico = ({ 
  valores, 
  tratamientos, 
  nombreVariable = "Variable no especificada", 
  nombreCultivo = "Cultivo no especificado",
  nombreLote = "Mes no especificado",
  anio = "Año no especificado" 
}) => {
  
  const [grafico1, setGrafico1] = useState('barras');
  const [grafico2, setGrafico2] = useState('lineas');

  const resultados = useMemo(() => {
    if (!valores || valores.length === 0) return null;

    const grupos = {};
    valores.forEach(v => {
      if (!grupos[v.tratamiento]) grupos[v.tratamiento] = [];
      grupos[v.tratamiento].push(v.valor);
    });

    const idsTratamientos = Object.keys(grupos);
    const nTotal = valores.length;
    const kGrupos = idsTratamientos.length;

    const maxRepeticiones = Math.max(...Object.values(grupos).map(arr => arr.length));
    const tablaCrudos = idsTratamientos.map(id => {
      const nombre = tratamientos.find(t => t.id === parseInt(id))?.nombre || `Trat ${id}`;
      return { id, nombre, valores: grupos[id] };
    });

    let sumaTotalGlobal = 0;
    const datosTabla = [];

    idsTratamientos.forEach(id => {
      const vals = grupos[id];
      const n = vals.length;
      const suma = vals.reduce((a, b) => a + b, 0);
      const media = suma / n;
      const nombre = tratamientos.find(t => t.id === parseInt(id))?.nombre || `Trat ${id}`;
      
      sumaTotalGlobal += suma;
      datosTabla.push({ id, nombre, media, n, suma });
    });

    const mediaGlobal = sumaTotalGlobal / nTotal;
    let scEntre = 0;
    let scError = 0;

    datosTabla.forEach(grupo => {
      scEntre += grupo.n * Math.pow(grupo.media - mediaGlobal, 2);
      grupos[grupo.id].forEach(v => {
        scError += Math.pow(v - grupo.media, 2);
      });
    });

    const glError = nTotal - kGrupos;
    const cme = scError / glError; 
    const errorExperimental = cme; 
    const cv = (Math.sqrt(cme) / mediaGlobal) * 100;

    datosTabla.sort((a, b) => b.media - a.media);
    
    const tablaQ = { 2: 2.87, 3: 3.44, 4: 3.79, 5: 4.04, 6: 4.23, 7: 4.39, 8: 4.53 };
    const qTukey = tablaQ[kGrupos] || 3.8; 
    const nPromedio = nTotal / kGrupos; 
    const hsd = qTukey * Math.sqrt(cme / nPromedio);

    const rangosMaximos = [];
    for (let i = 0; i < datosTabla.length; i++) {
      let j = i;
      while (j + 1 < datosTabla.length && Math.abs(datosTabla[i].media - datosTabla[j + 1].media) <= hsd) {
        j++;
      }
      
      const estaContenido = rangosMaximos.some(r => i >= r.inicio && j <= r.fin);
      if (!estaContenido) {
        rangosMaximos.push({ inicio: i, fin: j, letra: String.fromCharCode(97 + rangosMaximos.length) });
      }
    }

    datosTabla.forEach((d, idx) => {
      d.rango = rangosMaximos
        .filter(r => idx >= r.inicio && idx <= r.fin)
        .map(r => r.letra)
        .join(' ');
    });

    return { datosTabla, cme, errorExperimental, cv, mediaGlobal, tablaCrudos, maxRepeticiones };
  }, [valores, tratamientos]);

  if (!resultados) return <p style={{ color: '#6b7280', textAlign: 'center', marginTop: '20px' }}>Datos insuficientes.</p>;

  const colores = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', '#D4A5A5', '#9B59B6', '#3498DB'];
  const labels = resultados.datosTabla.map(d => d.nombre);
  const medias = resultados.datosTabla.map(d => d.media);
  const rangos = resultados.datosTabla.map(d => d.rango);

  const chartOptionsGenericas = {
    maintainAspectRatio: false,
    animation: false,
    plugins: { 
      legend: { display: true, position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } 
    },
    scales: {
      x: { ticks: { font: { size: 11 } } },
      y: { ticks: { font: { size: 11 } } }
    }
  };

  const chartDataBar = {
    labels,
    datasets: [
      {
        type: 'line', label: 'Media Global', data: Array(labels.length).fill(resultados.mediaGlobal),
        borderColor: '#E74C3C', borderWidth: 1, borderDash: [5, 5], fill: false, pointRadius: 0, order: 1,
        datalabels: { display: false } 
      },
      {
        type: 'bar', label: 'Media del Tratamiento', data: medias,
        backgroundColor: resultados.datosTabla.map((_, i) => colores[i % colores.length]),
        borderColor: 'rgba(0,0,0,0.1)', borderWidth: 1, borderRadius: 2, order: 2,
        datalabels: { display: true, color: '#ffffff', anchor: 'end', align: 'bottom', font: { weight: 'bold', size: 10 }, formatter: (v) => v.toFixed(2) }
      }
    ]
  };

  const chartDataLine = {
    labels,
    datasets: [
      {
        label: 'Tendencia de Medias', data: medias, borderColor: '#3498DB', backgroundColor: '#3498DB',
        borderWidth: 2, fill: false, tension: 0.1,
        datalabels: { display: true, align: 'top', font: { size: 10 }, formatter: (v) => v.toFixed(2) }
      }
    ]
  };

  const chartDataPie = {
    labels,
    datasets: [
      {
        data: medias, backgroundColor: resultados.datosTabla.map((_, i) => colores[i % colores.length]),
        borderWidth: 1, datalabels: { display: true, color: '#fff', font: { weight: 'bold', size: 11 }, formatter: (v) => v.toFixed(2) }
      }
    ]
  };

  const scatterValues = [];
  resultados.datosTabla.forEach(d => {
    const datosCrudos = resultados.tablaCrudos.find(t => t.id === d.id);
    datosCrudos.valores.forEach(v => {
      if (v !== undefined && v !== null) scatterValues.push({ x: d.nombre, y: v });
    });
  });

  const chartDataScatter = {
    datasets: [
      { label: 'Dispersión de Repeticiones', data: scatterValues, backgroundColor: '#E74C3C', pointRadius: 4, datalabels: { display: false } }
    ]
  };

  const renderGrafico = (tipo) => {
    const alturaGrafico = '280px'; 
    const estiloParrafo = { fontSize: '10px', color: '#4b5563', margin: '5px 0 0 0', textAlign: 'justify', lineHeight: '1.2' };
    const estiloTitulo = { textAlign: 'center', fontSize: '12px', fontWeight: 'bold', margin: '0 0 8px 0' };

    // 🔥 SOLUCIÓN 2: Asignamos una KEY única a cada gráfico para forzar la destrucción del Canvas viejo
    const canvasKey = `grafico-${tipo}-${nombreVariable.replace(/\s+/g, '')}`;

    switch(tipo) {
      case 'barras':
        return (
          <>
            <p style={estiloTitulo}>Análisis de Medias (Tukey)</p>
            <div style={{ height: alturaGrafico }}>
              <Bar key={canvasKey} data={chartDataBar} options={{...chartOptionsGenericas, plugins: { ...chartOptionsGenericas.plugins, letrasAnova: { letras: rangos } }, scales: { y: { ...chartOptionsGenericas.scales.y, beginAtZero: true, suggestedMax: Math.max(...medias) * 1.15 }, x: { ...chartOptionsGenericas.scales.x, grid: { display: false } } }}} />
            </div>
            <p style={estiloParrafo}><strong>Nota:</strong> Letras iguales = sin diferencias significativas.</p>
          </>
        );
      case 'lineas':
        return (
          <>
            <p style={estiloTitulo}>Tendencia de Medias</p>
            <div style={{ height: alturaGrafico }}>
              <Line key={canvasKey} data={chartDataLine} options={{...chartOptionsGenericas, scales: { y: { ...chartOptionsGenericas.scales.y, beginAtZero: true }, x: { ...chartOptionsGenericas.scales.x, grid: { display: false } } }}} />
            </div>
            <p style={estiloParrafo}><strong>Nota:</strong> Evolución de las medias a lo largo de los tratamientos.</p>
          </>
        );
      case 'sectores':
        return (
          <>
            <p style={estiloTitulo}>Proporción de Medias</p>
            <div style={{ height: alturaGrafico, display: 'flex', justifyContent: 'center' }}>
              <Pie key={canvasKey} data={chartDataPie} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { font: { size: 11 } } } } }} />
            </div>
            <p style={estiloParrafo}><strong>Nota:</strong> Proporción de cada tratamiento respecto al total.</p>
          </>
        );
      case 'dispersion':
        return (
          <>
            <p style={estiloTitulo}>Dispersión de Repeticiones</p>
            <div style={{ height: alturaGrafico }}>
              <Scatter key={canvasKey} data={chartDataScatter} options={{...chartOptionsGenericas, scales: { x: { type: 'category', labels: labels, grid: { display: false }, ticks: { font: { size: 11 } } }, y: { beginAtZero: true, grid: { color: '#f3f4f6' }, ticks: { font: { size: 11 } } } }}} />
            </div>
            <p style={estiloParrafo}><strong>Nota:</strong> Dispersión real de los datos recolectados.</p>
          </>
        );
      case 'boxplot':
        return (
          <>
            <p style={estiloTitulo}>Variabilidad (Boxplot)</p>
            <div style={{ height: alturaGrafico }}>
              <Chart key={canvasKey} type="boxplot" data={{ labels, datasets: [{ label: 'Distribución', data: resultados.datosTabla.map(d => resultados.tablaCrudos.find(t => t.id === d.id).valores.filter(v => v !== undefined && v !== null)), backgroundColor: 'rgba(52, 152, 219, 0.4)', borderColor: '#2980B9', borderWidth: 1, outlierRadius: 3, itemRadius: 2 }] }} options={{...chartOptionsGenericas, scales: { x: { ...chartOptionsGenericas.scales.x, grid: { display: false } }, y: { ...chartOptionsGenericas.scales.y, beginAtZero: true } }}} />
            </div>
            <p style={estiloParrafo}><strong>Nota:</strong> Muestra la dispersión y la mediana de los datos.</p>
          </>
        );
      default: return null;
    }
  };

  const obtenerOpcionesPDF = () => ({
    margin:       0.2, 
    filename:     `Reporte_Estadistico.pdf`,
    image:        { type: 'jpeg', quality: 1 },
    html2canvas:  { scale: 2 },
    jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
  });

  const exportarPDF = () => html2pdf().set(obtenerOpcionesPDF()).from(document.getElementById('documento-reporte')).save();
  const previsualizarPDF = () => html2pdf().set(obtenerOpcionesPDF()).from(document.getElementById('documento-reporte')).output('bloburl').then(url => window.open(url, '_blank'));

  return (
    <div style={{ padding: '10px', fontFamily: 'Arial, sans-serif' }}>
      
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px', gap: '8px' }}>
        <button onClick={previsualizarPDF} style={{ backgroundColor: '#45B7D1', color: 'white', padding: '6px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>👁️ Vista Previa</button>
        <button onClick={exportarPDF} style={{ backgroundColor: '#10b981', color: 'white', padding: '6px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>📄 PDF</button>
      </div>

      <div id="documento-reporte" style={{ backgroundColor: 'white', padding: '15px', border: '1px solid #d1d5db', maxWidth: '100%' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '12px', borderBottom: '2px solid black', paddingBottom: '8px' }}>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '16px', textTransform: 'uppercase' }}>Reporte Estadístico</h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', fontSize: '12px', color: '#374151' }}>
            <p style={{ margin: 0 }}>Cultivo: <strong>{nombreCultivo}</strong></p>
            <p style={{ margin: 0 }}>Mes: <strong>{nombreLote}</strong></p>
            <p style={{ margin: 0 }}>Año: <strong>{anio}</strong></p>
            <p style={{ margin: 0 }}>Var: <strong>{nombreVariable}</strong></p>
          </div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <h4 style={{ margin: '0 0 6px 0', fontSize: '13px' }}>1. Datos de Campo</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr>
                <th style={{ padding: '4px', borderBottom: '1px solid black', borderTop: '1px solid black', textAlign: 'left' }}>TRAT</th>
                {Array.from({ length: resultados.maxRepeticiones }).map((_, i) => (
                  <th key={i} style={{ padding: '4px', borderBottom: '1px solid black', borderTop: '1px solid black', textAlign: 'center' }}>R{i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resultados.tablaCrudos.map((fila, index) => (
                <tr key={index}>
                  <td style={{ padding: '4px', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold' }}>{fila.nombre}</td>
                  {Array.from({ length: resultados.maxRepeticiones }).map((_, i) => (
                    <td key={i} style={{ padding: '4px', borderBottom: '1px solid #e5e7eb', textAlign: 'center' }}>{fila.valores[i] !== undefined ? fila.valores[i] : '-'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <h4 style={{ margin: '0 0 6px 0', fontSize: '13px' }}>2. Comparación de Medias</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr>
                <th style={{ padding: '4px', borderBottom: '1px solid #000', borderTop: '1px solid #000', textAlign: 'left' }}>TRATAMIENTO</th>
                <th style={{ padding: '4px', borderBottom: '1px solid #000', borderTop: '1px solid #000', textAlign: 'center' }}>MEDIA</th>
                <th style={{ padding: '4px', borderBottom: '1px solid #000', borderTop: '1px solid #000', textAlign: 'center' }}>RANGO</th>
              </tr>
            </thead>
            <tbody>
              {resultados.datosTabla.map((reg, index) => (
                <tr key={index}>
                  <td style={{ padding: '4px', borderBottom: '1px solid #e5e7eb' }}>{reg.nombre}</td>
                  <td style={{ padding: '4px', borderBottom: '1px solid #e5e7eb', textAlign: 'center' }}>{reg.media.toFixed(2)}</td>
                  <td style={{ padding: '4px', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold', textAlign: 'center' }}>{reg.rango}</td>
                </tr>
              ))}
              <tr>
                <td style={{ padding: '4px', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb' }}>E.E</td>
                <td style={{ padding: '4px', borderBottom: '1px solid #e5e7eb', textAlign: 'center' }}>{resultados.errorExperimental.toFixed(2)}</td>
                <td style={{ padding: '4px', borderBottom: '1px solid #e5e7eb' }}></td>
              </tr>
              <tr>
                <td style={{ padding: '4px', fontWeight: 'bold', borderBottom: '1px solid #000' }}>CV (%)</td>
                <td style={{ padding: '4px', borderBottom: '1px solid #000', textAlign: 'center' }}>{resultados.cv.toFixed(2)}</td>
                <td style={{ padding: '4px', borderBottom: '1px solid #000' }}></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid black', paddingBottom: '4px', marginBottom: '10px' }}>
            <h4 style={{ margin: 0, fontSize: '13px' }}>3. Gráficos</h4>
            
            <div data-html2canvas-ignore="true" style={{ display: 'flex', gap: '15px', fontSize: '11px' }}>
              <div>
                <label style={{ marginRight: '5px', fontWeight: 'bold' }}>Superior:</label>
                <select value={grafico1} onChange={(e) => setGrafico1(e.target.value)} style={{ padding: '3px', fontSize: '11px' }}>
                  <option value="barras">Barras</option>
                  <option value="lineas">Líneas</option>
                  <option value="sectores">Sectores</option>
                  <option value="dispersion">Dispersión</option>
                  <option value="boxplot">Caja</option>
                </select>
              </div>
              <div>
                <label style={{ marginRight: '5px', fontWeight: 'bold' }}>Inferior:</label>
                <select value={grafico2} onChange={(e) => setGrafico2(e.target.value)} style={{ padding: '3px', fontSize: '11px' }}>
                  <option value="barras">Barras</option>
                  <option value="lineas">Líneas</option>
                  <option value="sectores">Sectores</option>
                  <option value="dispersion">Dispersión</option>
                  <option value="boxplot">Caja</option>
                </select>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', marginTop: '10px' }}>
            <div style={{ width: '100%' }}>{renderGrafico(grafico1)}</div>
            <div style={{ width: '100%' }}>{renderGrafico(grafico2)}</div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AnalisisEstadistico;