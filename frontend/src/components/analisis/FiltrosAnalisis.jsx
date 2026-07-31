import React, { useState } from "react";

function FiltrosAnalisis({
  listaCultivos, listaVariables, listaAnios, listaTratamientos,
  cultivo, setCultivo, variable, setVariable,
  anio1, setAnio1, anio2, setAnio2,
  tratamientosSel, toggleTratamiento, obtenerDatos
}) {
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  return (
    <div className="form-card" style={{ display: 'flex', gap: '15px', alignItems: 'flex-start', flexWrap: 'wrap', backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
      <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', width: '100%' }}>
        <div style={{ flex: '1', minWidth: '150px' }}>
          <label className="form-label">Cultivo:</label>
          <select className="form-input" value={cultivo} onChange={(e) => setCultivo(e.target.value)}>
            <option value="">-- Seleccione --</option>
            {listaCultivos.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
          </select>
        </div>
        <div style={{ flex: '1', minWidth: '150px' }}>
          <label className="form-label">Variable:</label>
          <select className="form-input" value={variable} onChange={(e) => setVariable(e.target.value)}>
            <option value="">-- Seleccione --</option>
            {listaVariables.map((v, i) => <option key={i} value={v}>{v.toUpperCase()}</option>)}
          </select>
        </div>
        <div style={{ width: '120px' }}>
          <label className="form-label">Año 1:</label>
          <select className="form-input" value={anio1} onChange={(e) => setAnio1(e.target.value)}>
            <option value="">-- Año --</option>
            {listaAnios.map((a, i) => <option key={i} value={a}>{a}</option>)}
          </select>
        </div>
        <div style={{ width: '120px' }}>
          <label className="form-label">Año 2:</label>
          <select className="form-input" value={anio2} onChange={(e) => setAnio2(e.target.value)}>
            <option value="">-- Año --</option>
            {listaAnios.map((a, i) => <option key={i} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      <div style={{ width: '100%', marginTop: '10px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
        <div 
          onClick={() => setMostrarFiltros(!mostrarFiltros)}
          style={{ padding: '12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#1f2937', fontWeight: 'bold' }}
        >
          <span>{mostrarFiltros ? '▼' : '▶'} Filtrar Tratamientos Específicos (Opcional)</span>
        </div>
        {mostrarFiltros && (
          <div style={{ padding: '0 12px 12px 12px', display: 'flex', gap: '15px', flexWrap: 'wrap', borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
            {listaTratamientos.map((trat, index) => (
              <label key={index} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: 'white', padding: '5px 10px', borderRadius: '4px', border: '1px solid #d1d5db' }}>
                <input type="checkbox" checked={tratamientosSel.includes(trat)} onChange={() => toggleTratamiento(trat)} />
                {trat}
              </label>
            ))}
          </div>
        )}
      </div>
      <button onClick={obtenerDatos} style={{ marginTop: '10px', width: '100%', height: '42px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
        Generar Análisis Completo
      </button>
    </div>
  );
}

export default FiltrosAnalisis;