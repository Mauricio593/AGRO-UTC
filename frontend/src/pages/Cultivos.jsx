import { useEffect, useState } from "react";
import API from "../services/api";
import Navbar from "../components/Navbar";
import VariableForm from "./VariableForm"; 
import "./Cultivos.css"; 

function Cultivos() {
  const [listas, setListas] = useState({ cultivos: [], lotes: [], experimentos: [], variables: [] });
  const [sel, setSel] = useState({ cultivo: "", lote: "", experimento: "", variable: "" });
  const [mostrarForm, setMostrarForm] = useState(false);
  const [menuContext, setMenuContext] = useState({ visible: false, x: 0, y: 0, tipo: "", id: "" });

  const cargarCultivos = () => API.get("cultivos/").then(res => setListas(p => ({ ...p, cultivos: res.data })));
  const cargarVariables = () => API.get("variables/").then(res => setListas(p => ({ ...p, variables: res.data })));
  
  const cargarLotes = (cultivoId) => {
    if (!cultivoId) return setListas(p => ({ ...p, lotes: [] }));
    API.get(`unidades/?cultivo=${cultivoId}`).then(res => setListas(p => ({ ...p, lotes: res.data })));
  };

  const cargarExperimentos = (loteId) => {
    if (!loteId) return setListas(p => ({ ...p, experimentos: [] }));
    API.get(`experimentos/?unidad=${loteId}`).then(res => setListas(p => ({ ...p, experimentos: res.data })));
  };

  useEffect(() => { cargarCultivos(); cargarVariables(); }, []);

  useEffect(() => {
    cargarLotes(sel.cultivo);
    setSel(p => ({ ...p, lote: "", experimento: "" }));
    setMostrarForm(false);
  }, [sel.cultivo]);

  useEffect(() => {
    cargarExperimentos(sel.lote);
    setSel(p => ({ ...p, experimento: "" }));
    setMostrarForm(false);
  }, [sel.lote]);

  // --- LÓGICA PARA AGREGAR, EDITAR Y ELIMINAR DESDE LOS FILTROS ---
  const manejarAccionAPI = async (metodo, endpoint, payload = null, mensajeExito) => {
    try {
      if (metodo === 'POST') await API.post(endpoint, payload);
      if (metodo === 'PUT') await API.put(endpoint, payload);
      if (metodo === 'DELETE') await API.delete(endpoint);
      alert(mensajeExito);
      return true;
    } catch (error) {
      console.error("Error API:", error);
      alert("❌ Ocurrió un error. Revisa que los datos sean correctos y no estén duplicados.");
      return false;
    }
  };

  const agregarItem = async (tipo) => {
    const mensajePrompt = tipo === 'experimento' 
      ? `📝 Ingresa el AÑO para la nueva campaña (Ej: 2024):` 
      : `📝 Ingresa el nombre para el nuevo ${tipo}:`;

    const inputUsuario = window.prompt(mensajePrompt);
    
    if (!inputUsuario || inputUsuario.trim() === "") return;
    const valorPuro = inputUsuario.trim();

    let endpoint = ""; let payload = {};

    if (tipo === 'experimento') {
      const anioNum = Number(valorPuro);
      if (!Number.isInteger(anioNum) || anioNum <= 0 || valorPuro.length > 4) {
        return alert("❌ Error: El año de la campaña debe ser numérico, positivo y de máximo 4 dígitos.");
      }
      endpoint = "experimentos/"; 
      payload = { anio: anioNum, unidad: sel.lote };
    } else {
      const soloLetrasRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
      if (!soloLetrasRegex.test(valorPuro)) {
        return alert(`❌ Error: El nombre para '${tipo}' solo puede contener letras y espacios. No se permiten números ni símbolos.`);
      }

      if (tipo === 'cultivo') { endpoint = "cultivos/"; payload = { nombre: valorPuro }; }
      if (tipo === 'lote') { endpoint = "unidades/"; payload = { nombre: valorPuro, cultivo: sel.cultivo }; }
      if (tipo === 'variable') { endpoint = "variables/"; payload = { nombre: valorPuro }; }
    }

    const exito = await manejarAccionAPI('POST', endpoint, payload, `✅ ${tipo} agregado correctamente.`);
    if (exito) refrescarLista(tipo);
  };

  const editarItem = async () => {
    const { tipo, id } = menuContext;
    cerrarMenu();

    const mensajePrompt = tipo === 'experimento' 
      ? `✏️ Ingresa el NUEVO AÑO para esta campaña:` 
      : `✏️ Ingresa el nuevo nombre para este ${tipo}:`;

    const inputUsuario = window.prompt(mensajePrompt);
    
    if (!inputUsuario || inputUsuario.trim() === "") return;
    const valorPuro = inputUsuario.trim();

    let endpoint = ""; let payload = {};

    if (tipo === 'experimento') {
      const anioNum = Number(valorPuro);
      if (!Number.isInteger(anioNum) || anioNum <= 0 || valorPuro.length > 4) {
        return alert("❌ Error: El año de la campaña debe ser numérico, positivo y de máximo 4 dígitos.");
      }
      endpoint = `experimentos/${id}/`; 
      payload = { anio: anioNum, unidad: sel.lote };
    } else {
      const soloLetrasRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
      if (!soloLetrasRegex.test(valorPuro)) {
        return alert(`❌ Error: El nombre para '${tipo}' solo puede contener letras y espacios. No se permiten números ni símbolos.`);
      }

      if (tipo === 'cultivo') { endpoint = `cultivos/${id}/`; payload = { nombre: valorPuro }; }
      if (tipo === 'lote') { endpoint = `unidades/${id}/`; payload = { nombre: valorPuro, cultivo: sel.cultivo }; }
      if (tipo === 'variable') { endpoint = `variables/${id}/`; payload = { nombre: valorPuro }; }
    }

    const exito = await manejarAccionAPI('PUT', endpoint, payload, `🔄 ${tipo} actualizado.`);
    if (exito) refrescarLista(tipo);
  };

  const eliminarItem = async () => {
    const { tipo, id } = menuContext;
    cerrarMenu();
    if (!window.confirm(`⚠️ ¿ESTÁS SEGURO? Eliminar este ${tipo} borrará todos los datos asociados a él.`)) return;

    let endpoint = "";
    if (tipo === 'cultivo') endpoint = `cultivos/${id}/`;
    if (tipo === 'lote') endpoint = `unidades/${id}/`;
    if (tipo === 'experimento') endpoint = `experimentos/${id}/`;
    if (tipo === 'variable') endpoint = `variables/${id}/`;

    const exito = await manejarAccionAPI('DELETE', endpoint, null, `🗑️ ${tipo} eliminado.`);
    if (exito) {
      setSel(p => ({ ...p, [tipo]: "" }));
      refrescarLista(tipo);
    }
  };

  const refrescarLista = (tipo) => {
    if (tipo === 'cultivo') cargarCultivos();
    if (tipo === 'lote') cargarLotes(sel.cultivo);
    if (tipo === 'experimento') cargarExperimentos(sel.lote);
    if (tipo === 'variable') cargarVariables();
  };

  const handleRightClick = (e, tipo, id) => {
    e.preventDefault();
    if (!id) return;
    setMenuContext({ visible: true, x: e.pageX, y: e.pageY, tipo, id });
  };
  
  const cerrarMenu = () => setMenuContext({ ...menuContext, visible: false });

  const manejarCargaDatos = () => {
    if (!sel.cultivo || !sel.lote || !sel.experimento || !sel.variable) {
      alert("⚠️ Por favor, selecciona todos los filtros (Cultivo, Lote, Año y Variable) para continuar.");
      return;
    }
    setMostrarForm(true);
  };

  // 📝 AQUÍ BUSCAMOS LOS NOMBRES REALES EN BASE A LOS IDs SELECCIONADOS
  const nombreCultivoActual = listas.cultivos.find(c => c.id.toString() === sel.cultivo.toString())?.nombre || "Cultivo no especificado";
  const nombreVariableActual = listas.variables.find(v => v.id.toString() === sel.variable.toString())?.nombre || "Variable no especificada";
  // ✅ NUEVO: Buscamos el nombre del lote (mes) y el año
  const nombreLoteActual = listas.lotes.find(l => l.id.toString() === sel.lote.toString())?.nombre || "Mes no especificado";
  const anioActual = listas.experimentos.find(e => e.id.toString() === sel.experimento.toString())?.anio || "Año no especificado";

  return (
    <div className="dashboard-page" onClick={cerrarMenu}>
      <Navbar />
      
      <div className="layout-split-container">
        
        <main className="workspace-left">
          {mostrarForm ? (
            // ✅ NUEVO: Pasamos nombreLote y anio como props
            <VariableForm 
              expId={sel.experimento} 
              varId={sel.variable} 
              nombreCultivo={nombreCultivoActual} 
              nombreVariable={nombreVariableActual} 
              nombreLote={nombreLoteActual}
              anio={anioActual}
            />
          ) : (
            <div className="workspace-empty">
              <h2>🌱 Panel de Trabajo</h2>
              <p>Selecciona los parámetros en la barra lateral derecha y haz clic en <b>"Iniciar Carga de Datos"</b>.</p>
              <p><i>Tip: Puedes hacer clic derecho sobre los elementos seleccionados para Editarlos o Eliminarlos.</i></p>
            </div>
          )}
        </main>

        <aside className="sidebar-right">
          <h3 className="sidebar-title">⚙️ agregar o seleccionar datos </h3>
          
          <div className="filter-box-vertical">
            <label>Cultivo:</label>
            <div className="select-row">
              <select value={sel.cultivo} onChange={(e) => setSel({...sel, cultivo: e.target.value})} onContextMenu={(e) => handleRightClick(e, "cultivo", sel.cultivo)}>
                <option value="">Seleccione...</option>
                {listas.cultivos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <button onClick={() => agregarItem('cultivo')} title="Añadir">+</button>
            </div>
          </div>

          <div className="filter-box-vertical">
            <label>mes :</label>
            <div className="select-row">
              <select value={sel.lote} disabled={!sel.cultivo} onChange={(e) => setSel({...sel, lote: e.target.value})} onContextMenu={(e) => handleRightClick(e, "lote", sel.lote)}>
                <option value="">Seleccione...</option>
                {listas.lotes.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
              </select>
              <button onClick={() => agregarItem('lote')} disabled={!sel.cultivo} title="Añadir">+</button>
            </div>
          </div>

          <div className="filter-box-vertical">
            <label> (Año):</label>
            <div className="select-row">
              <select value={sel.experimento} disabled={!sel.lote} onChange={(e) => setSel({...sel, experimento: e.target.value})} onContextMenu={(e) => handleRightClick(e, "experimento", sel.experimento)}>
                <option value="">Seleccione...</option>
                {listas.experimentos.map(e => <option key={e.id} value={e.id}>{e.anio}</option>)}
              </select>
              <button onClick={() => agregarItem('experimento')} disabled={!sel.lote} title="Añadir">+</button>
            </div>
          </div>

          <div className="filter-box-vertical">
            <label>Variable a Medir:</label>
            <div className="select-row">
              <select value={sel.variable} onChange={(e) => setSel({...sel, variable: e.target.value})} onContextMenu={(e) => handleRightClick(e, "variable", sel.variable)}>
                <option value="">Seleccione...</option>
                {listas.variables.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
              </select>
              <button onClick={() => agregarItem('variable')} title="Añadir">+</button>
            </div>
          </div>

          <button className="btn-iniciar-carga" onClick={manejarCargaDatos}>
            🔍 cargar datos 🔍 
          </button>
        </aside>

      </div>

      {menuContext.visible && (
        <div className="floating-context-menu" style={{ top: menuContext.y, left: menuContext.x }} onClick={(e) => e.stopPropagation()}>
          <div className="context-option-row" onClick={editarItem}><span>✏️ Editar {menuContext.tipo}</span></div>
          <div className="context-option-row delete-option" onClick={eliminarItem}><span>🗑️ Eliminar {menuContext.tipo}</span></div>
        </div>
      )}
    </div>
  );
}

export default Cultivos;