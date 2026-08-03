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

  const [modal, setModal] = useState({
    visible: false,
    accion: "", // 'agregar', 'editar', 'eliminar', 'alerta'
    tipo: "",
    id: null,
    valor: "",
    error: "",
    mensaje: ""
  });

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

  const refrescarLista = (tipo) => {
    if (tipo === 'cultivo') cargarCultivos();
    if (tipo === 'lote') cargarLotes(sel.cultivo);
    if (tipo === 'experimento') cargarExperimentos(sel.lote);
    if (tipo === 'variable') cargarVariables();
  };

  const manejarCambioInput = (e) => {
    const valor = e.target.value;
    let error = "";

    if (modal.tipo === 'experimento') {
      if (valor.length > 4) {
        error = "❌ El año permite máximo 4 dígitos.";
      } else if (valor !== "" && !/^\d+$/.test(valor)) {
        error = "❌ Solo se permiten números para el año.";
      }
    } else {
      if (valor.length > 20) {
        error = "❌ Límite excedido: Máximo 20 caracteres.";
      } else if (valor !== "" && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(valor)) {
        error = "❌ Solo se permiten letras y espacios.";
      }
    }

    setModal({ ...modal, valor, error });
  };

  const abrirModalAgregar = (tipo) => {
    setModal({ visible: true, accion: 'agregar', tipo, id: null, valor: "", error: "", mensaje: `Agregar nuevo ${tipo}` });
  };

  const abrirModalEditar = () => {
    const { tipo, id } = menuContext;
    cerrarMenu();
    setModal({ visible: true, accion: 'editar', tipo, id, valor: "", error: "", mensaje: `Editar ${tipo}` });
  };

  // RESTRICCIÓN DE ELIMINACIÓN POR ROL DE USUARIO
  const abrirModalEliminar = () => {
    const { tipo, id } = menuContext;
    cerrarMenu();

    const rolUsuario = (localStorage.getItem("rol") || localStorage.getItem("role") || "").toLowerCase();

    if (rolUsuario !== "docente") {
      mostrarAlerta("⛔ Acceso Denegado: Solo el Docente tiene permisos para eliminar elementos.");
      return;
    }

    setModal({ 
      visible: true, 
      accion: 'eliminar', 
      tipo, 
      id, 
      valor: "", 
      error: "", 
      mensaje: `⚠️ ¿Estás seguro de eliminar este ${tipo}? Se perderán todos sus datos.` 
    });
  };

  const mostrarAlerta = (mensaje) => {
    setModal({ visible: true, accion: 'alerta', tipo: "", id: null, valor: "", error: "", mensaje });
  };

  const confirmarAccionModal = async () => {
    const { accion, tipo, id, valor } = modal;
    const valorPuro = valor.trim();

    if ((accion === 'agregar' || accion === 'editar') && (valorPuro === "" || modal.error !== "")) {
      return;
    }

    let endpoint = ""; 
    let payload = {};
    let metodo = "";

    if (accion === 'eliminar') {
      metodo = 'DELETE';
      if (tipo === 'cultivo') endpoint = `cultivos/${id}/`;
      if (tipo === 'lote') endpoint = `unidades/${id}/`;
      if (tipo === 'experimento') endpoint = `experimentos/${id}/`;
      if (tipo === 'variable') endpoint = `variables/${id}/`;
    } else {
      metodo = accion === 'agregar' ? 'POST' : 'PUT';
      
      if (tipo === 'experimento') {
        endpoint = accion === 'agregar' ? "experimentos/" : `experimentos/${id}/`;
        payload = { anio: Number(valorPuro), unidad: sel.lote };
      } else {
        if (tipo === 'cultivo') { endpoint = accion === 'agregar' ? "cultivos/" : `cultivos/${id}/`; payload = { nombre: valorPuro }; }
        if (tipo === 'lote') { endpoint = accion === 'agregar' ? "unidades/" : `unidades/${id}/`; payload = { nombre: valorPuro, cultivo: sel.cultivo }; }
        if (tipo === 'variable') { endpoint = accion === 'agregar' ? "variables/" : `variables/${id}/`; payload = { nombre: valorPuro }; }
      }
    }

    try {
      if (metodo === 'POST') await API.post(endpoint, payload);
      if (metodo === 'PUT') await API.put(endpoint, payload);
      if (metodo === 'DELETE') {
        await API.delete(endpoint);
        setSel(p => ({ ...p, [tipo]: "" }));
      }
      
      setModal({ ...modal, visible: false });
      mostrarAlerta(`✅ Operación realizada con éxito.`);
      refrescarLista(tipo);

    } catch (error) {
      console.error("Error API:", error);
      mostrarAlerta("❌ Ocurrió un error. Revisa que los datos sean correctos.");
    }
  };

  const handleRightClick = (e, tipo, id) => {
    e.preventDefault();
    if (!id) return;
    setMenuContext({ visible: true, x: e.pageX, y: e.pageY, tipo, id });
  };
  
  const cerrarMenu = () => setMenuContext({ ...menuContext, visible: false });

  const manejarCargaDatos = () => {
    if (!sel.cultivo || !sel.lote || !sel.experimento || !sel.variable) {
      mostrarAlerta("⚠️ Por favor, selecciona todos los filtros (Cultivo, Lote, Año y Variable) para continuar.");
      return;
    }
    setMostrarForm(true);
  };

  const nombreCultivoActual = listas.cultivos.find(c => c.id.toString() === sel.cultivo.toString())?.nombre || "Cultivo no especificado";
  const nombreVariableActual = listas.variables.find(v => v.id.toString() === sel.variable.toString())?.nombre || "Variable no especificada";
  const nombreLoteActual = listas.lotes.find(l => l.id.toString() === sel.lote.toString())?.nombre || "Mes no especificado";
  const anioActual = listas.experimentos.find(e => e.id.toString() === sel.experimento.toString())?.anio || "Año no especificado";

  return (
    <div className="dashboard-page" onClick={cerrarMenu}>
      <Navbar />
      
      <div className="layout-split-container">
        
        <main className="workspace-left">
          {mostrarForm ? (
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
              <button onClick={() => abrirModalAgregar('cultivo')} title="Añadir">+</button>
            </div>
          </div>

          <div className="filter-box-vertical">
            <label>Mes:</label>
            <div className="select-row">
              <select value={sel.lote} disabled={!sel.cultivo} onChange={(e) => setSel({...sel, lote: e.target.value})} onContextMenu={(e) => handleRightClick(e, "lote", sel.lote)}>
                <option value="">Seleccione...</option>
                {listas.lotes.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
              </select>
              <button onClick={() => abrirModalAgregar('lote')} disabled={!sel.cultivo} title="Añadir">+</button>
            </div>
          </div>

          <div className="filter-box-vertical">
            <label>(Año):</label>
            <div className="select-row">
              <select value={sel.experimento} disabled={!sel.lote} onChange={(e) => setSel({...sel, experimento: e.target.value})} onContextMenu={(e) => handleRightClick(e, "experimento", sel.experimento)}>
                <option value="">Seleccione...</option>
                {listas.experimentos.map(e => <option key={e.id} value={e.id}>{e.anio}</option>)}
              </select>
              <button onClick={() => abrirModalAgregar('experimento')} disabled={!sel.lote} title="Añadir">+</button>
            </div>
          </div>

          <div className="filter-box-vertical">
            <label>Variable a Medir:</label>
            <div className="select-row">
              <select value={sel.variable} onChange={(e) => setSel({...sel, variable: e.target.value})} onContextMenu={(e) => handleRightClick(e, "variable", sel.variable)}>
                <option value="">Seleccione...</option>
                {listas.variables.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
              </select>
              <button onClick={() => abrirModalAgregar('variable')} title="Añadir">+</button>
            </div>
          </div>

          <button className="btn-iniciar-carga" onClick={manejarCargaDatos}>
            🔍 cargar datos 🔍 
          </button>
        </aside>

      </div>

      {menuContext.visible && (
        <div className="floating-context-menu" style={{ top: menuContext.y, left: menuContext.x }} onClick={(e) => e.stopPropagation()}>
          <div className="context-option-row" onClick={abrirModalEditar}><span>✏️ Editar {menuContext.tipo}</span></div>
          <div className="context-option-row delete-option" onClick={abrirModalEliminar}><span>🗑️ Eliminar {menuContext.tipo}</span></div>
        </div>
      )}

      {modal.visible && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>{modal.mensaje}</h3>
            
            {(modal.accion === 'agregar' || modal.accion === 'editar') && (
              <>
                <input 
                  type="text" 
                  placeholder={modal.tipo === 'experimento' ? "Ej: 2024" : `Nombre de ${modal.tipo}`}
                  value={modal.valor}
                  onChange={manejarCambioInput}
                />
                <span className="texto-error">{modal.error}</span>
              </>
            )}

            <div className="modal-actions">
              {modal.accion !== 'alerta' && (
                <button className="btn-cancelar" onClick={() => setModal({ ...modal, visible: false })}>Cancelar</button>
              )}
              <button 
                className="btn-guardar" 
                onClick={modal.accion === 'alerta' ? () => setModal({ ...modal, visible: false }) : confirmarAccionModal}
                disabled={modal.error !== "" || (modal.valor === "" && modal.accion !== 'eliminar' && modal.accion !== 'alerta')}
              >
                {modal.accion === 'alerta' ? 'Aceptar' : (modal.accion === 'eliminar' ? 'Sí, Eliminar' : 'Guardar')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Cultivos;