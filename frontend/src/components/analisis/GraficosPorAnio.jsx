import React from "react";
import { Bar, Doughnut, Scatter } from "react-chartjs-2";

function GraficosPorAnio({ datos, anio, opcionesGraficos }) {
  if (!datos) return null;

  return (
    <div className="evitar-salto" style={{ marginBottom: '40px' }}>
      <h3 style={{ textAlign: 'center', backgroundColor: '#f3f4f6', padding: '10px', borderRadius: '5px', color: '#1f2937' }}>
        Detalle de Tratamientos ({anio})
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '15px' }}>
        <div style={{ height: '280px', padding: '15px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
          <h4 style={{ textAlign: 'center', fontSize: '14px', color: '#4b5563', margin: '0 0 10px 0' }}>Volumen (Barras)</h4>
          {/* 🔥 Agregamos el prop key a cada gráfico */}
          <Bar key={`bar-${anio}-${Date.now()}`} data={datos.graficosEstandar} options={{ ...opcionesGraficos, plugins: { legend: { display: false } } }} />
        </div>
        <div style={{ height: '280px', padding: '15px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
          <h4 style={{ textAlign: 'center', fontSize: '14px', color: '#4b5563', margin: '0 0 10px 0' }}>Proporción (Sectorial)</h4>
          <Doughnut key={`doughnut-${anio}-${Date.now()}`} data={datos.graficosEstandar} options={{ ...opcionesGraficos, plugins: { legend: { position: 'right' } } }} />
        </div>
        <div style={{ height: '280px', padding: '15px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
          <h4 style={{ textAlign: 'center', fontSize: '14px', color: '#4b5563', margin: '0 0 10px 0' }}>Dispersión de Medias</h4>
          <Scatter key={`scatter-${anio}-${Date.now()}`} data={datos.scatterData} options={{ ...opcionesGraficos, scales: { x: { type: 'category', labels: datos.labelsOpcionesX } }, plugins: { legend: { display: false } } }} />
        </div>
      </div>
    </div>
  );
}

export default GraficosPorAnio;