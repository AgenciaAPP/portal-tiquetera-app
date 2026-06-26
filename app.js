import { beneficios } from './beneficios.js';

// ==========================================
// ESTADO GLOBAL
// ==========================================
let tipoActual = "Tiquetera";
let beneficioSeleccionado = null;
let permisosUsuario = [];
let rolUsuarioActivo = "EMPLEADO";
let listaSubordinados = [];
let historicoPermisosEquipo = [];

// ==========================================
// CONFIGURACIÓN DE BACKEND INSTITUCIONAL
// ==========================================
const URL_FLOW_CONSULTA  = "https://54b407e9c34be36d9ed93dfaf5a04b.e5.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/416f1b2038a24f729b516db2c869774e/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=KjDEhk6b_cTv_TF3yc0B43OvtdKAJ4qfKPs27gOjBG8";
const URL_FLOW_REGISTRO  = "https://54b407e9c34be36d9ed93dfaf5a04b.e5.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/0545fde32b6648ef94ea9f6e01c70d6b/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=yQ3l3qxdl2oAS6KpgPBDYTOR88hwzGyxTwW29sVNJ6k";

// ==========================================
// REFERENCIAS DOM
// ==========================================
const gridBeneficios          = document.getElementById('gridBeneficios');
const tabTiquetera            = document.getElementById('tabTiquetera');
const tabAdministrativos      = document.getElementById('tabAdministrativos');
const tabEquipo               = document.getElementById('tabEquipo');
const tabAnaliticaTH          = document.getElementById('tabAnaliticaTH');
const modal                   = document.getElementById('modalBeneficio');
const seccionLogin            = document.getElementById('seccionLogin');
const seccionContenidoPortal  = document.getElementById('seccionContenidoPortal');
const seccionDashboardEquipo  = document.getElementById('seccionDashboardEquipo');
const seccionAnaliticaTH      = document.getElementById('seccionAnaliticaTH');
const btnValidarCedula        = document.getElementById('btnValidarCedula');
const txtCedulaIngreso        = document.getElementById('txtCedulaIngreso');
const lblErrorLogin           = document.getElementById('lblErrorLogin');
const headerUsuario           = document.getElementById('headerUsuario');
const avatarUsuario           = document.getElementById('avatarUsuario');
const lblNombreUsuario        = document.getElementById('lblNombreUsuario');
const lblCedulaUsuario        = document.getElementById('lblCedulaUsuario');
const btnCerrarSesion         = document.getElementById('btnCerrarSesion');
const spinnerLoading          = document.getElementById('spinnerLoading');
const txtBtnValidar           = document.getElementById('txtBtnValidar');
const tbodyHistoricoEquipo    = document.getElementById('tbodyHistoricoEquipo');
const tbodyHistoricoTH        = document.getElementById('tbodyHistoricoTH');
const inputBuscadorTH         = document.getElementById('inputBuscadorTH');
const dtFechaInicio           = document.getElementById('dtFechaInicio');
const txtJustificacion        = document.getElementById('txtJustificacion');
const attSoportes             = document.getElementById('attSoportes');
const btnEnviarSolicitud      = document.getElementById('btnEnviarSolicitud');

// ==========================================
// HELPERS DE VISIBILIDAD
// ==========================================
function mostrarEl(el)  { if(el) el.style.display = ''; }
function ocultarEl(el)  { if(el) el.style.display = 'none'; }
function mostrarFlex(el){ if(el) el.style.display = 'flex'; }

// ==========================================
// INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    setupFormValidation();
    btnValidarCedula.addEventListener('click', procesarAutenticacion);
    txtCedulaIngreso.addEventListener('keypress', (e) => { if (e.key === 'Enter') procesarAutenticacion(); });
    btnCerrarSesion.addEventListener('click', cerrarSesion);
    btnEnviarSolicitud.addEventListener('click', procesarEnvioSolicitud);
    if (inputBuscadorTH) inputBuscadorTH.addEventListener('input', filtrarTablaTalentoHumano);
});

// ==========================================
// AUTENTICACIÓN
// ==========================================
async function procesarAutenticacion() {
    const cedula = txtCedulaIngreso.value.trim();
    if (!cedula) return;

    btnValidarCedula.disabled = true;
    mostrarEl(spinnerLoading);
    txtBtnValidar.innerText = "Verificando...";
    ocultarEl(lblErrorLogin);

    try {
        const respuesta = await fetch(URL_FLOW_CONSULTA, {
            method: 'POST', mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cedula })
        });
        if (!respuesta.ok) throw new Error("Error de red");

        const resultado = await respuesta.json();

        if (resultado.valido === "SI") {
            permisosUsuario         = resultado.permisos         || [];
            rolUsuarioActivo        = resultado.rol              || "EMPLEADO";
            listaSubordinados       = resultado.subordinados     || [];
            historicoPermisosEquipo = resultado.historicoEquipo  || [];

            const nombre = resultado.nombre || "Servidor Público";
            lblNombreUsuario.innerText = nombre;
            lblCedulaUsuario.innerText = cedula;
            avatarUsuario.innerText    = nombre.charAt(0).toUpperCase();

            mostrarFlex(headerUsuario);
            ocultarEl(seccionLogin);
            mostrarEl(seccionContenidoPortal);

            evaluarRolYActivarVista();
        } else {
            lblErrorLogin.innerText = "⚠️ Funcionario no habilitado o no encontrado en la base de datos.";
            mostrarEl(lblErrorLogin);
        }
    } catch (err) {
        console.error(err);
        lblErrorLogin.innerText = "⚠️ Error de conexión con el servidor institucional de la Agencia APP.";
        mostrarEl(lblErrorLogin);
    } finally {
        ocultarEl(spinnerLoading);
        txtBtnValidar.innerText = "Verificar";
        btnValidarCedula.disabled = false;
    }
}

// ==========================================
// ORQUESTADOR DE ROL
// ==========================================
function evaluarRolYActivarVista() {
    ocultarEl(tabTiquetera);
    ocultarEl(tabAdministrativos);
    ocultarEl(tabEquipo);
    ocultarEl(tabAnaliticaTH);

    if (rolUsuarioActivo === "ADMIN_TH") {
        mostrarEl(tabAnaliticaTH);
        activarTab('AnaliticaTH');
    } else if (rolUsuarioActivo === "JEFE" || rolUsuarioActivo === "SUPER_JEFE") {
        mostrarEl(tabTiquetera);
        mostrarEl(tabAdministrativos);
        mostrarEl(tabEquipo);
        activarTab('Tiquetera');
    } else {
        mostrarEl(tabTiquetera);
        mostrarEl(tabAdministrativos);
        activarTab('Tiquetera');
    }
}

// ==========================================
// SISTEMA DE TABS
// ==========================================
function setupTabs() {
    tabTiquetera.addEventListener('click',       () => activarTab('Tiquetera'));
    tabAdministrativos.addEventListener('click', () => activarTab('Administrativos'));
    tabEquipo.addEventListener('click',          () => activarTab('Equipo'));
    tabAnaliticaTH.addEventListener('click',     () => activarTab('AnaliticaTH'));
}

const TAB_ACTIVO   = "border-indigo-600 text-indigo-600 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all focus:outline-none";
const TAB_INACTIVO = "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all focus:outline-none";

function activarTab(tipo) {
    tipoActual = tipo;
    [tabTiquetera, tabAdministrativos, tabEquipo, tabAnaliticaTH].forEach(t => { if(t) t.className = TAB_INACTIVO; });
    ocultarEl(gridBeneficios);
    ocultarEl(seccionDashboardEquipo);
    ocultarEl(seccionAnaliticaTH);

    switch (tipo) {
        case 'Tiquetera':
            tabTiquetera.className = TAB_ACTIVO;
            mostrarEl(gridBeneficios);
            renderGrid();
            break;
        case 'Administrativos':
            tabAdministrativos.className = TAB_ACTIVO;
            mostrarEl(gridBeneficios);
            renderGrid();
            break;
        case 'Equipo':
            tabEquipo.className = TAB_ACTIVO;
            mostrarEl(seccionDashboardEquipo);
            renderDashboardEquipo();
            break;
        case 'AnaliticaTH':
            tabAnaliticaTH.className = TAB_ACTIVO;
            mostrarEl(seccionAnaliticaTH);
            renderDashboardTalentoHumano();
            break;
    }
}

// ==========================================
// HELPERS
// ==========================================
function formatFecha(str) {
    if (!str) return '—';
    const d = new Date(str.includes('T') ? str : str + 'T00:00:00');
    return isNaN(d) ? str : d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getEstadoStr(reg) {
    return (reg.Estado?.Value || reg.Estado || '').toString();
}

function badgeEstado(estado) {
    const e = estado.toLowerCase();
    if (e === 'aprobado')  return `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:700;background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0">✔ Aprobado</span>`;
    if (e === 'rechazado') return `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:700;background:#fef2f2;color:#b91c1c;border:1px solid #fecaca">✘ Rechazado</span>`;
    return `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:700;background:#fffbeb;color:#b45309;border:1px solid #fde68a">⏳ Pendiente</span>`;
}

// Cruza cédula con lista de subordinados para obtener nombre
function getNombrePorCedula(cedula) {
    const sub = listaSubordinados.find(s => s.Title === cedula);
    return sub?.NombreCompleto || cedula;
}

// ==========================================
// RENDER: GRID DE BENEFICIOS
// ==========================================
function renderGrid() {
    gridBeneficios.innerHTML = '';
    const filtrados = beneficios.filter(b => b.tipo === tipoActual);
    filtrados.forEach(b => {
        const regla = permisosUsuario.find(p => p.Titulo === b.titulo);
        let disponible = true, mensajeBoton = "Solicitar", badgeVeces = "";
        if (regla) {
            const veces = parseInt(regla.VecesUsado) || 0;
            badgeVeces = `<span class="text-[11px] text-slate-400 font-medium block mt-1">Usado este año: ${veces} vez/veces</span>`;
            switch (regla.ReglaBloqueo) {
                case "Anual":       if (veces >= 1) { disponible = false; mensajeBoton = "Ya utilizado este año"; } break;
                case "Semestral":   if (veces >= 1) { disponible = false; mensajeBoton = "Límite semestral alcanzado"; } break;
                case "Anual_Limite_2":
                    if (veces >= 2) { disponible = false; mensajeBoton = "Límite anual alcanzado (Máx 2)"; }
                    else if (veces === 1) badgeVeces += `<span class="text-[10px] text-amber-500 font-semibold block mt-0.5">⚠️ Te queda 1 solicitud disponible</span>`;
                    break;
            }
        } else if (tipoActual === "Tiquetera") { disponible = false; mensajeBoton = "No Habilitado"; }

        const card = document.createElement('div');
        card.className = `bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${!disponible ? 'opacity-60 bg-slate-50/50' : ''}`;
        card.innerHTML = `
            <div>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${b.requiereAdjunto ? 'bg-amber-50 text-amber-800 border border-amber-100' : 'bg-emerald-50 text-emerald-800 border border-emerald-100'}">
                    ${b.requiereAdjunto ? '📎 Requiere Soporte' : '⚡ Uso Directo'}
                </span>
                <h4 class="text-base font-bold text-slate-900 mt-3 mb-1 leading-snug">${b.titulo}</h4>
                <p class="text-xs text-slate-400">Anticipación: ${b.diasAntelacion} días hábiles</p>
                ${badgeVeces}
            </div>
            <button class="mt-6 w-full text-center py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${disponible ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}"
                    ${!disponible ? 'disabled' : ''}>${mensajeBoton}</button>`;
        if (disponible) card.querySelector('button').addEventListener('click', () => abrirPopup(b));
        gridBeneficios.appendChild(card);
    });
}

// ==========================================
// RENDER: DASHBOARD JEFE / SUPER JEFE
// ==========================================
function renderDashboardEquipo() {
    const hist = historicoPermisosEquipo;
    const total      = hist.length;
    const aprobados  = hist.filter(r => getEstadoStr(r).toLowerCase() === 'aprobado').length;
    const rechazados = hist.filter(r => getEstadoStr(r).toLowerCase() === 'rechazado').length;
    const pendientes = total - aprobados - rechazados;

    // KPIs
    document.getElementById('kpiTotalEquipo').innerText          = listaSubordinados.length;
    document.getElementById('kpiTotalHistoricoEquipo').innerText = total;
    document.getElementById('kpiAprobadosEquipo').innerText      = aprobados;
    document.getElementById('kpiRechazadosEquipo').innerText     = rechazados;
    document.getElementById('kpiPendientesEquipo').innerText     = pendientes;

    // Tasa de aprobación
    const tasaEl = document.getElementById('kpiTasaAprobacion');
    if (tasaEl) tasaEl.innerText = total > 0 ? Math.round((aprobados / total) * 100) + '%' : '—';

    // Top trámite
    const conteo = {};
    hist.forEach(r => { const k = r.PermisoSolicitado || 'Sin definir'; conteo[k] = (conteo[k]||0)+1; });
    const top = Object.entries(conteo).sort((a,b) => b[1]-a[1])[0];
    document.getElementById('kpiTopTramiteEquipo').innerText = top ? `${top[0]} (${top[1]})` : '—';

    // Gráfica de barras por tipo de beneficio
    renderBarrasEquipo(conteo, total);

    // Tarjetas por servidor
    renderTarjetasServidores();

    // Tabla con filtros
    renderTablaEquipo(hist);
}

function renderBarrasEquipo(conteo, total) {
    const contenedor = document.getElementById('graficaBeneficiosEquipo');
    if (!contenedor) return;
    const sorted = Object.entries(conteo).sort((a,b) => b[1]-a[1]).slice(0, 6);
    const maxVal = sorted[0]?.[1] || 1;
    const colores = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6'];

    contenedor.innerHTML = sorted.map(([nombre, val], i) => {
        const pct = Math.round((val/maxVal)*100);
        const pctTotal = Math.round((val/total)*100);
        return `
        <div style="margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                <span style="font-size:11px;font-weight:600;color:#475569;max-width:65%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${nombre}">${nombre}</span>
                <span style="font-size:11px;font-weight:700;color:${colores[i]}">${val} (${pctTotal}%)</span>
            </div>
            <div style="background:#f1f5f9;border-radius:9999px;height:8px;overflow:hidden">
                <div style="width:${pct}%;height:100%;background:${colores[i]};border-radius:9999px;transition:width 0.6s ease"></div>
            </div>
        </div>`;
    }).join('');
}

function renderTarjetasServidores() {
    const contenedor = document.getElementById('gridTarjetasServidores');
    if (!contenedor) return;

    if (listaSubordinados.length === 0) {
        contenedor.innerHTML = `<p style="font-size:12px;color:#94a3b8;text-align:center;padding:20px">No hay colaboradores registrados.</p>`;
        return;
    }

    contenedor.innerHTML = listaSubordinados.map(sub => {
        const cedula = sub.Title;
        const nombre = sub.NombreCompleto || cedula;
        const solicitudes = historicoPermisosEquipo.filter(r => r.Title === cedula);
        const aprob = solicitudes.filter(r => getEstadoStr(r).toLowerCase() === 'aprobado').length;
        const rech  = solicitudes.filter(r => getEstadoStr(r).toLowerCase() === 'rechazado').length;
        const pend  = solicitudes.length - aprob - rech;
        const inicial = nombre.charAt(0).toUpperCase();

        const colorAvatar = solicitudes.length === 0 ? '#94a3b8' : aprob > 0 ? '#6366f1' : '#f59e0b';

        return `
        <div style="background:white;border:1px solid #e2e8f0;border-radius:16px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,0.06);transition:box-shadow 0.2s"
             onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'" onmouseout="this.style.boxShadow='0 1px 3px rgba(0,0,0,0.06)'">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
                <div style="width:36px;height:36px;border-radius:50%;background:${colorAvatar};color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0">${inicial}</div>
                <div style="overflow:hidden">
                    <div style="font-size:12px;font-weight:700;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${nombre}">${nombre}</div>
                    <div style="font-size:10px;color:#94a3b8">${cedula}</div>
                </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;text-align:center">
                <div style="background:#f0fdf4;border-radius:8px;padding:6px">
                    <div style="font-size:16px;font-weight:700;color:#15803d">${aprob}</div>
                    <div style="font-size:9px;color:#16a34a;font-weight:600;text-transform:uppercase">Aprobados</div>
                </div>
                <div style="background:#fffbeb;border-radius:8px;padding:6px">
                    <div style="font-size:16px;font-weight:700;color:#b45309">${pend}</div>
                    <div style="font-size:9px;color:#d97706;font-weight:600;text-transform:uppercase">Pendientes</div>
                </div>
                <div style="background:#fef2f2;border-radius:8px;padding:6px">
                    <div style="font-size:16px;font-weight:700;color:#b91c1c">${rech}</div>
                    <div style="font-size:9px;color:#dc2626;font-weight:600;text-transform:uppercase">Rechazados</div>
                </div>
            </div>
            ${solicitudes.length === 0 ? '<div style="text-align:center;margin-top:8px;font-size:10px;color:#cbd5e1">Sin solicitudes aún</div>' : ''}
        </div>`;
    }).join('');
}

// Estado del filtro de equipo
let filtroEquipoBusqueda = '';
let filtroEquipoEstado = '';
let filtroEquipoBeneficio = '';

function renderTablaEquipo(datos) {
    if (!tbodyHistoricoEquipo) return;

    // Poblar select de beneficios si existe
    const selectBeneficio = document.getElementById('filtroEquipoBeneficio');
    if (selectBeneficio && selectBeneficio.options.length <= 1) {
        const beneficiosUnicos = [...new Set(datos.map(r => r.PermisoSolicitado).filter(Boolean))].sort();
        beneficiosUnicos.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b; opt.innerText = b;
            selectBeneficio.appendChild(opt);
        });
    }

    let filtrados = datos.filter(r => {
        const nombre = getNombrePorCedula(r.Title).toLowerCase();
        const cedula = (r.Title || '').toLowerCase();
        const busq   = filtroEquipoBusqueda.toLowerCase();
        const matchBusq = !busq || nombre.includes(busq) || cedula.includes(busq);
        const matchEst  = !filtroEquipoEstado || getEstadoStr(r).toLowerCase() === filtroEquipoEstado;
        const matchBen  = !filtroEquipoBeneficio || r.PermisoSolicitado === filtroEquipoBeneficio;
        return matchBusq && matchEst && matchBen;
    });

    filtrados = [...filtrados].sort((a,b) => new Date(b.Created||0) - new Date(a.Created||0));

    tbodyHistoricoEquipo.innerHTML = '';
    if (filtrados.length === 0) {
        tbodyHistoricoEquipo.innerHTML = `
            <tr><td colspan="5" style="padding:32px;text-align:center;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em">
                No hay registros que coincidan con los filtros aplicados.
            </td></tr>`;
        return;
    }

    filtrados.forEach(reg => {
        const nombre = getNombrePorCedula(reg.Title);
        const inicial = nombre.charAt(0).toUpperCase();
        const tr = document.createElement('tr');
        tr.style.cssText = "border-bottom:1px solid #f1f5f9;transition:background 0.15s";
        tr.onmouseover = () => tr.style.background = '#f8fafc';
        tr.onmouseout  = () => tr.style.background = '';
        tr.innerHTML = `
            <td style="padding:12px 20px">
                <div style="display:flex;align-items:center;gap:8px">
                    <div style="width:28px;height:28px;border-radius:50%;background:#6366f1;color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;flex-shrink:0">${inicial}</div>
                    <div>
                        <div style="font-size:12px;font-weight:700;color:#1e293b">${nombre}</div>
                        <div style="font-size:10px;color:#94a3b8">${reg.Title}</div>
                    </div>
                </div>
            </td>
            <td style="padding:12px 20px;font-size:12px;font-weight:600;color:#334155;max-width:200px">
                <span style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${reg.PermisoSolicitado||''}">${reg.PermisoSolicitado||'—'}</span>
            </td>
            <td style="padding:12px 20px;font-size:11px;color:#64748b;white-space:nowrap">${formatFecha(reg.Created)}</td>
            <td style="padding:12px 20px;font-size:11px;color:#64748b;white-space:nowrap">${formatFecha(reg.FechaSolicitud||reg.FechaInicio)}</td>
            <td style="padding:12px 20px">${badgeEstado(getEstadoStr(reg))}</td>`;
        tbodyHistoricoEquipo.appendChild(tr);
    });
}

// ==========================================
// RENDER: DASHBOARD TALENTO HUMANO
// ==========================================
function renderDashboardTalentoHumano() {
    const hist = historicoPermisosEquipo;
    const total      = hist.length;
    const aprobados  = hist.filter(r => getEstadoStr(r).toLowerCase() === 'aprobado').length;
    const rechazados = hist.filter(r => getEstadoStr(r).toLowerCase() === 'rechazado').length;
    const pendientes = total - aprobados - rechazados;

    document.getElementById('kpiThTotalServidores').innerText = listaSubordinados.length;
    document.getElementById('kpiThTotalTramites').innerText   = total;
    document.getElementById('kpiThAprobados').innerText       = aprobados;
    document.getElementById('kpiThRechazados').innerText      = rechazados;
    document.getElementById('kpiThPendientes').innerText      = pendientes;

    const conteo = {};
    hist.forEach(r => { const k = r.PermisoSolicitado||'Sin definir'; conteo[k]=(conteo[k]||0)+1; });
    const top = Object.entries(conteo).sort((a,b)=>b[1]-a[1])[0];
    document.getElementById('kpiThTopTramite').innerText = top ? `${top[0]} (${top[1]})` : '—';

    inyectarRegistrosTablaTH(hist);
}

function inyectarRegistrosTablaTH(datos) {
    tbodyHistoricoTH.innerHTML = '';
    if (!datos || datos.length === 0) {
        tbodyHistoricoTH.innerHTML = `
            <tr><td colspan="5" style="padding:32px;text-align:center;font-size:11px;color:#94a3b8;text-transform:uppercase">
                Ningún registro coincide con los parámetros ingresados.
            </td></tr>`;
        return;
    }
    [...datos].sort((a,b) => new Date(b.Created||0)-new Date(a.Created||0)).forEach(reg => {
        const nombre = getNombrePorCedula(reg.Title);
        const inicial = nombre.charAt(0).toUpperCase();
        const tr = document.createElement('tr');
        tr.style.cssText = "border-bottom:1px solid #f1f5f9;transition:background 0.15s";
        tr.onmouseover = () => tr.style.background = '#f8fafc';
        tr.onmouseout  = () => tr.style.background = '';
        tr.innerHTML = `
            <td style="padding:12px 20px">
                <div style="display:flex;align-items:center;gap:8px">
                    <div style="width:28px;height:28px;border-radius:50%;background:#6366f1;color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;flex-shrink:0">${inicial}</div>
                    <div>
                        <div style="font-size:12px;font-weight:700;color:#1e293b">${nombre}</div>
                        <div style="font-size:10px;color:#94a3b8">${reg.Title}</div>
                    </div>
                </div>
            </td>
            <td style="padding:12px 20px;font-size:12px;font-weight:600;color:#334155;max-width:200px">
                <span style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${reg.PermisoSolicitado||''}">${reg.PermisoSolicitado||'—'}</span>
            </td>
            <td style="padding:12px 20px;font-size:11px;color:#64748b;white-space:nowrap">${formatFecha(reg.Created)}</td>
            <td style="padding:12px 20px;font-size:11px;color:#64748b;white-space:nowrap">${formatFecha(reg.FechaSolicitud||reg.FechaInicio)}</td>
            <td style="padding:12px 20px">${badgeEstado(getEstadoStr(reg))}</td>`;
        tbodyHistoricoTH.appendChild(tr);
    });
}

function filtrarTablaTalentoHumano() {
    const busqueda = inputBuscadorTH.value.trim().toLowerCase();
    if (!busqueda) { inyectarRegistrosTablaTH(historicoPermisosEquipo); return; }
    const filtrados = historicoPermisosEquipo.filter(reg =>
        getNombrePorCedula(reg.Title).toLowerCase().includes(busqueda) ||
        (reg.Title||'').toLowerCase().includes(busqueda) ||
        (reg.PermisoSolicitado||'').toLowerCase().includes(busqueda)
    );
    inyectarRegistrosTablaTH(filtrados);
}

// ==========================================
// ENVÍO DE SOLICITUD
// ==========================================
async function procesarEnvioSolicitud() {
    const cedula        = lblCedulaUsuario.innerText;
    const beneficio     = beneficioSeleccionado.titulo;
    const fecha         = dtFechaInicio.value;
    const justificacion = txtJustificacion.value.trim();

    btnEnviarSolicitud.disabled  = true;
    btnEnviarSolicitud.innerText = "Enviando Radicado...";

    let nombreArchivo   = "Sin_Soporte.txt";
    let contenidoBase64 = "VGV4dG8gZHUgbXkgcGFyYSBldml0YXIgZmFsbG9z";

    try {
        if (beneficioSeleccionado.requiereAdjunto && attSoportes.files.length > 0) {
            const archivo = attSoportes.files[0];
            nombreArchivo = archivo.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
            contenidoBase64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(archivo);
                reader.onload  = () => resolve(reader.result.split(',')[1]);
                reader.onerror = reject;
            });
        }
        const payload = { cedula, beneficio, fechaInicio: fecha, justificacion, nombreArchivo, contenidoBase64, regulacion: beneficioSeleccionado.hint };
        const respuesta = await fetch(URL_FLOW_REGISTRO, {
            method: 'POST', mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!respuesta.ok) throw new Error();
        alert(`🎉 Tu solicitud para "${beneficio}" ha sido radicada con éxito. Iniciando flujo de firmas.`);
        cerrarPopup();
        procesarAutenticacion();
    } catch (err) {
        console.error(err);
        alert("⚠️ Hubo un problema al radicar tu solicitud. Por favor, reintenta.");
        btnEnviarSolicitud.disabled  = false;
        btnEnviarSolicitud.innerText = "Enviar Solicitud";
    }
}

// ==========================================
// POPUP
// ==========================================
function abrirPopup(b) {
    beneficioSeleccionado = b;
    document.getElementById('lblTituloPopup').innerText = b.titulo;
    document.getElementById('lblAnticipacion').innerHTML = `⏰ <strong>Mínimo ${b.diasAntelacion} días de anticipación.</strong><br><span style="display:block;margin-top:8px;font-size:12px;color:#475569;font-weight:400;line-height:1.5">${b.hint}</span>`;
    const wrapSoportes = document.getElementById('wrapperSoportes');
    const lblAlertaSop = document.getElementById('lblAlertaSoporte');
    if (b.requiereAdjunto) { mostrarEl(wrapSoportes); mostrarEl(lblAlertaSop); }
    else                   { ocultarEl(wrapSoportes); ocultarEl(lblAlertaSop); }
    document.getElementById('formSolicitud').reset();
    document.getElementById('lblFileStatus').innerText = "📄 Selecciona o arrastra tu archivo (PDF, PNG, JPG)";
    ocultarEl(document.getElementById('lblAlertaFecha'));
    btnEnviarSolicitud.disabled  = true;
    btnEnviarSolicitud.innerText = "Enviar Solicitud";
    mostrarFlex(modal);
}

window.cerrarPopup = function() {
    ocultarEl(modal);
    beneficioSeleccionado = null;
};

// ==========================================
// CERRAR SESIÓN
// ==========================================
function cerrarSesion() {
    permisosUsuario = []; listaSubordinados = []; historicoPermisosEquipo = [];
    rolUsuarioActivo = "EMPLEADO"; txtCedulaIngreso.value = "";
    filtroEquipoBusqueda = ''; filtroEquipoEstado = ''; filtroEquipoBeneficio = '';
    if (inputBuscadorTH) inputBuscadorTH.value = "";
    mostrarEl(tabTiquetera); mostrarEl(tabAdministrativos);
    ocultarEl(tabEquipo); ocultarEl(tabAnaliticaTH);
    tabTiquetera.className = TAB_ACTIVO; tabAdministrativos.className = TAB_INACTIVO;
    ocultarEl(headerUsuario); ocultarEl(seccionContenidoPortal);
    ocultarEl(seccionDashboardEquipo); ocultarEl(seccionAnaliticaTH);
    mostrarEl(gridBeneficios); mostrarEl(seccionLogin);
}

// ==========================================
// VALIDACIÓN DE FORMULARIO
// ==========================================
function setupFormValidation() {
    const lblAlertaFecha = document.getElementById('lblAlertaFecha');
    attSoportes.addEventListener('change', (e) => {
        if (e.target.files.length > 0) document.getElementById('lblFileStatus').innerText = `✅ ${e.target.files[0].name}`;
        validarFormulario();
    });
    [dtFechaInicio, txtJustificacion].forEach(el => el.addEventListener('input', validarFormulario));
    function validarFormulario() {
        if (!beneficioSeleccionado) return;
        const justValid = txtJustificacion.value.trim().length > 0;
        let fechaValid = false;
        if (dtFechaInicio.value) {
            const hoy = new Date(); hoy.setHours(0,0,0,0);
            const fechaSel = new Date(dtFechaInicio.value + 'T00:00:00');
            fechaValid = true;
            if (Math.ceil((fechaSel-hoy)/86400000) < beneficioSeleccionado.diasAntelacion) mostrarEl(lblAlertaFecha);
            else ocultarEl(lblAlertaFecha);
        }
        btnEnviarSolicitud.disabled = !(justValid && fechaValid && (!beneficioSeleccionado.requiereAdjunto || attSoportes.files.length > 0));
    }
}

// ==========================================
// FILTROS PANEL EQUIPO — expuestos globalmente
// ==========================================
window.aplicarFiltrosEquipo = function() {
    filtroEquipoBusqueda  = document.getElementById('filtroEquipoBusqueda')?.value || '';
    filtroEquipoEstado    = document.getElementById('filtroEquipoEstado')?.value || '';
    filtroEquipoBeneficio = document.getElementById('filtroEquipoBeneficio')?.value || '';
    renderTablaEquipo(historicoPermisosEquipo);
};
