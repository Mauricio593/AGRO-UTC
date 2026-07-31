import React from "react";
import { Pie } from "react-chartjs-2";

function PrediccionKnn({ datosKnn, opcionesGraficos }) {
  if (!datosKnn) return null;

  return (
    <div className="evitar-salto" style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center', borderTop: '2px dashed #d1d5db', paddingTop: '30px' }}>
      {datosKnn.dataset && (
        <div style={{ flex: '1 1 45%', padding: '15px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
          <h4 style={{ textAlign: 'center', color: '#374151', margin: '0 0 15px 0' }}>Historial Dataset (Modelo KNN)</h4>
          <div style={{ height: '200px', display: 'flex', justifyContent: 'center' }}>
            {/* 🔥 Agregamos el prop key al gráfico de pastel */}
            <Pie 
              key={`pie-knn-${Date.now()}`}
              data={{
                labels: ['BUENO', 'MEDIO', 'MALO'],
                datasets: [{
                  data: [
                    datosKnn.dataset.filter(d => d.label === 'BUENO').length,
                    datosKnn.dataset.filter(d => d.label === 'MEDIO').length,
                    datosKnn.dataset.filter(d => d.label === 'MALO').length,
                  ],
                  backgroundColor: ['#baffc9', '#ffffba', '#ffb3ba']
                }]
              }} 
              options={opcionesGraficos} 
            />
          </div>
        </div>
      )}

      {datosKnn.prediccion && (
        <div style={{ flex: '1 1 45%', padding: '15px', border: '2px solid #baffc9', borderRadius: '8px', backgroundColor: '#f0fdf4', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <h4 style={{ color: '#166534', margin: '0 0 10px 0' }}>Predicción Inteligente a Futuro</h4>
          <p style={{ textAlign: 'center', margin: '0 0 10px 0', fontSize: '1rem', color: '#15803d' }}>Rendimiento esperado según el historial global:</p>
          <span style={{ fontSize: '3.5rem', fontWeight: 'bold', color: '#15803d', textTransform: 'uppercase' }}>
            {datosKnn.prediccion}
          </span>
        </div>
      )}
    </div>
  );
}

export default PrediccionKnn;