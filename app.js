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
    seccionLogin.classList.add('blur-[1px]');
    spinnerLoading.classList.remove('hidden');
    txtBtnValidar.innerText = "Verificando...";
    lblErrorLogin.classList.add('hidden');

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

            headerUsuario.classList.remove('hidden');
            headerUsuario.classList.add('flex');
            seccionLogin.classList.add('hidden');
            seccionContenidoPortal.classList.remove('hidden');

            evaluarRolYActivarVista();
        } else {
            lblErrorLogin.innerText = "⚠️ Funcionario no habilitado o no encontrado en la base de datos.";
            lblErrorLogin.classList.remove('hidden');
        }
    } catch (err) {
        console.error(err);
        lblErrorLogin.innerText = "⚠️ Error de conexión con el servidor institucional de la Agencia APP.";
        lblErrorLogin.classList.remove('hidden');
    } finally {
        spinnerLoading.classList.add('hidden');
        txtBtnValidar.innerText = "Verificar";
        seccionLogin.classList.remove('blur-[1px]');
        btnValidarCedula.disabled = false;
    }
}

// ==========================================
// ORQUESTADOR DE ROL
// EMPLEADO   → Tiquetera + Administrativos
// JEFE       → Tiquetera + Administrativos + Mi Equipo
// SUPER_JEFE → Tiquetera + Administrativos + Mi Equipo (todos)
// ADMIN_TH   → solo Gestión Talento Humano
// ==========================================
function evaluarRolYActivarVista() {
    // Ocultar TODAS las pestañas primero sin excepción
    tabTiquetera.classList.add('hidden');
    tabAdministrativos.classList.add('hidden');
    tabEquipo.classList.add('hidden');
    tabAnaliticaTH.classList.add('hidden');

    // Mostrar solo las que corresponden al rol
    if (rolUsuarioActivo === "ADMIN_TH") {
        tabAnaliticaTH.classList.remove('hidden');
        activarTab('AnaliticaTH');

    } else if (rolUsuarioActivo === "JEFE" || rolUsuarioActivo === "SUPER_JEFE") {
        tabTiquetera.classList.remove('hidden');
        tabAdministrativos.classList.remove('hidden');
        tabEquipo.classList.remove('hidden');
        activarTab('Tiquetera');

    } else {
        // EMPLEADO
        tabTiquetera.classList.remove('hidden');
        tabAdministrativos.classList.remove('hidden');
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

    [tabTiquetera, tabAdministrativos, tabEquipo, tabAnaliticaTH].forEach(t => {
        if (t) t.className = TAB_INACTIVO;
    });

    gridBeneficios.classList.add('hidden');
    seccionDashboardEquipo.classList.add('hidden');
    seccionAnaliticaTH.classList.add('hidden');

    switch (tipo) {
        case 'Tiquetera':
            tabTiquetera.className = TAB_ACTIVO;
            gridBeneficios.classList.remove('hidden');
            renderGrid();
            break;
        case 'Administrativos':
            tabAdministrativos.className = TAB_ACTIVO;
            gridBeneficios.classList.remove('hidden');
            renderGrid();
            break;
        case 'Equipo':
            tabEquipo.className = TAB_ACTIVO;
            seccionDashboardEquipo.classList.remove('hidden');
            renderDashboardEquipo();
            break;
        case 'AnaliticaTH':
            tabAnaliticaTH.className = TAB_ACTIVO;
            seccionAnaliticaTH.classList.remove('hidden');
            renderDashboardTalentoHumano();
            break;
    }
}

// ==========================================
// RENDER: GRID DE BENEFICIOS
// ==========================================
function renderGrid() {
    gridBeneficios.innerHTML = '';
    const filtrados = beneficios.filter(b => b.tipo === tipoActual);

    filtrados.forEach(b => {
        const regla = permisosUsuario.find(p => p.Titulo === b.titulo);

        let disponible   = true;
        let mensajeBoton = "Solicitar";
        let badgeVeces   = "";

        if (regla) {
            const veces = parseInt(regla.VecesUsado) || 0;
            badgeVeces = `<span class="text-[11px] text-slate-400 font-medium block mt-1">Usado este año: ${veces} vez/veces</span>`;

            switch (regla.ReglaBloqueo) {
                case "Anual":
                    if (veces >= 1) { disponible = false; mensajeBoton = "Ya utilizado este año"; }
                    break;
                case "Semestral":
                    if (veces >= 1) { disponible = false; mensajeBoton = "Límite semestral alcanzado"; }
                    break;
                case "Anual_Limite_2":
                    if (veces >= 2) { disponible = false; mensajeBoton = "Límite anual alcanzado (Máx 2)"; }
                    else if (veces === 1) badgeVeces += `<span class="text-[10px] text-amber-500 font-semibold block mt-0.5">⚠️ Te queda 1 solicitud disponible</span>`;
                    break;
                case "Siempre_Activo":
                default:
                    break;
            }
        } else if (tipoActual === "Tiquetera") {
            disponible   = false;
            mensajeBoton = "No Habilitado";
        }

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
                    ${!disponible ? 'disabled' : ''}>
                ${mensajeBoton}
            </button>`;

        if (disponible) card.querySelector('button').addEventListener('click', () => abrirPopup(b));
        gridBeneficios.appendChild(card);
    });
}

// ==========================================
// HELPERS
// ==========================================
function formatFecha(str) {
    if (!str) return '—';
    const d = new Date(str.includes('T') ? str : str + 'T00:00:00');
    return isNaN(d) ? str : d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function badgeEstado(estado) {
    const e = (estado || '').toLowerCase();
    if (e === 'aprobado')  return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">✔ Aprobado</span>`;
    if (e === 'rechazado') return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-100">✘ Rechazado</span>`;
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">⏳ Pendiente</span>`;
}

// ==========================================
// RENDER: DASHBOARD JEFE / SUPER JEFE
// ==========================================
function renderDashboardEquipo() {
    const total      = historicoPermisosEquipo.length;
    const aprobados  = historicoPermisosEquipo.filter(r => (r.Estado||'').toLowerCase() === 'aprobado').length;
    const rechazados = historicoPermisosEquipo.filter(r => (r.Estado||'').toLowerCase() === 'rechazado').length;
    const pendientes = total - aprobados - rechazados;

    document.getElementById('kpiTotalEquipo').innerText          = listaSubordinados.length;
    document.getElementById('kpiTotalHistoricoEquipo').innerText = total;
    document.getElementById('kpiAprobadosEquipo').innerText      = aprobados;
    document.getElementById('kpiRechazadosEquipo').innerText     = rechazados;
    document.getElementById('kpiPendientesEquipo').innerText     = pendientes;

    const conteo = {};
    historicoPermisosEquipo.forEach(r => {
        const k = r.PermisoSolicitado || 'Sin definir';
        conteo[k] = (conteo[k] || 0) + 1;
    });
    const top = Object.entries(conteo).sort((a, b) => b[1] - a[1])[0];
    document.getElementById('kpiTopTramiteEquipo').innerText = top ? `${top[0]} (${top[1]})` : '—';

    tbodyHistoricoEquipo.innerHTML = '';
    if (total === 0) {
        tbodyHistoricoEquipo.innerHTML = `
            <tr><td colspan="6" class="py-10 text-center text-xs font-medium text-slate-400 uppercase tracking-wider bg-slate-50/30">
                No se registran solicitudes radicadas por el equipo de trabajo.
            </td></tr>`;
        return;
    }

    [...historicoPermisosEquipo]
        .sort((a, b) => new Date(b.Created || 0) - new Date(a.Created || 0))
        .forEach(reg => {
            const tr = document.createElement('tr');
            tr.className = "hover:bg-slate-50/50 transition-all";
            tr.innerHTML = `
                <td class="py-3.5 px-5 font-bold text-slate-800 text-xs tracking-wide">${reg.Title || '—'}</td>
                <td class="py-3.5 px-5 text-xs font-semibold text-slate-700 max-w-[200px]">
                    <span class="block truncate" title="${reg.PermisoSolicitado || ''}">${reg.PermisoSolicitado || '—'}</span>
                </td>
                <td class="py-3.5 px-5 text-xs text-slate-500 whitespace-nowrap">${formatFecha(reg.Created)}</td>
                <td class="py-3.5 px-5 text-xs text-slate-500 whitespace-nowrap">${formatFecha(reg.FechaInicio)}</td>
                <td class="py-3.5 px-5 text-xs text-slate-400 max-w-[180px]">
                    <span class="block truncate" title="${reg.Justificacion || ''}">${reg.Justificacion || '—'}</span>
                </td>
                <td class="py-3.5 px-5">${badgeEstado(reg.Estado)}</td>`;
            tbodyHistoricoEquipo.appendChild(tr);
        });
}

// ==========================================
// RENDER: DASHBOARD TALENTO HUMANO
// ==========================================
function renderDashboardTalentoHumano() {
    const total      = historicoPermisosEquipo.length;
    const aprobados  = historicoPermisosEquipo.filter(r => (r.Estado||'').toLowerCase() === 'aprobado').length;
    const rechazados = historicoPermisosEquipo.filter(r => (r.Estado||'').toLowerCase() === 'rechazado').length;
    const pendientes = total - aprobados - rechazados;

    document.getElementById('kpiThTotalServidores').innerText = listaSubordinados.length;
    document.getElementById('kpiThTotalTramites').innerText   = total;
    document.getElementById('kpiThAprobados').innerText       = aprobados;
    document.getElementById('kpiThRechazados').innerText      = rechazados;
    document.getElementById('kpiThPendientes').innerText      = pendientes;

    const conteo = {};
    historicoPermisosEquipo.forEach(r => {
        const k = r.PermisoSolicitado || 'Sin definir';
        conteo[k] = (conteo[k] || 0) + 1;
    });
    const top = Object.entries(conteo).sort((a, b) => b[1] - a[1])[0];
    document.getElementById('kpiThTopTramite').innerText = top ? `${top[0]} (${top[1]})` : '—';

    inyectarRegistrosTablaTH(historicoPermisosEquipo);
}

function inyectarRegistrosTablaTH(datos) {
    tbodyHistoricoTH.innerHTML = '';
    if (!datos || datos.length === 0) {
        tbodyHistoricoTH.innerHTML = `
            <tr><td colspan="6" class="py-10 text-center text-xs font-medium text-slate-400 uppercase tracking-wider bg-slate-50/30">
                Ningún registro coincide con los parámetros de auditoría ingresados.
            </td></tr>`;
        return;
    }

    [...datos]
        .sort((a, b) => new Date(b.Created || 0) - new Date(a.Created || 0))
        .forEach(reg => {
            const tr = document.createElement('tr');
            tr.className = "hover:bg-slate-50/50 transition-all";
            tr.innerHTML = `
                <td class="py-3.5 px-5 font-bold text-slate-800 text-xs tracking-wide">${reg.Title || '—'}</td>
                <td class="py-3.5 px-5 text-xs font-semibold text-slate-700 max-w-[200px]">
                    <span class="block truncate" title="${reg.PermisoSolicitado || ''}">${reg.PermisoSolicitado || '—'}</span>
                </td>
                <td class="py-3.5 px-5 text-xs text-slate-500 whitespace-nowrap">${formatFecha(reg.Created)}</td>
                <td class="py-3.5 px-5 text-xs text-slate-500 whitespace-nowrap">${formatFecha(reg.FechaInicio)}</td>
                <td class="py-3.5 px-5 text-xs text-slate-400 max-w-[180px]">
                    <span class="block truncate" title="${reg.Justificacion || ''}">${reg.Justificacion || '—'}</span>
                </td>
                <td class="py-3.5 px-5">${badgeEstado(reg.Estado)}</td>`;
            tbodyHistoricoTH.appendChild(tr);
        });
}

function filtrarTablaTalentoHumano() {
    const busqueda = inputBuscadorTH.value.trim().toLowerCase();
    if (!busqueda) { inyectarRegistrosTablaTH(historicoPermisosEquipo); return; }
    const filtrados = historicoPermisosEquipo.filter(reg =>
        (reg.Title || '').toLowerCase().includes(busqueda) ||
        (reg.PermisoSolicitado || '').toLowerCase().includes(busqueda)
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

        alert(`🎉 ¡Perfecto! Tu solicitud para "${beneficio}" ha sido radicada con éxito. Iniciando flujo de firmas de Talento Humano y Jefe Inmediato.`);
        cerrarPopup();
        procesarAutenticacion();

    } catch (err) {
        console.error(err);
        alert("⚠️ Huedo un problema al radicar tu solicitud. Por favor, reintenta.");
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
    document.getElementById('lblAnticipacion').innerHTML = `⏰ <strong>Mínimo ${b.diasAntelacion} días de anticipación.</strong><br><span class="block mt-2 font-normal text-slate-600 text-xs leading-relaxed">${b.hint}</span>`;

    const wrapSoportes = document.getElementById('wrapperSoportes');
    const lblAlertaSop = document.getElementById('lblAlertaSoporte');
    if (b.requiereAdjunto) { wrapSoportes.classList.remove('hidden'); lblAlertaSop.classList.remove('hidden'); }
    else                   { wrapSoportes.classList.add('hidden');    lblAlertaSop.classList.add('hidden'); }

    document.getElementById('formSolicitud').reset();
    document.getElementById('lblFileStatus').innerText = "📄 Selecciona o arrastra tu archivo (PDF, PNG, JPG)";
    document.getElementById('lblAlertaFecha').classList.add('hidden');
    document.getElementById('btnEnviarSolicitud').disabled = true;
    btnEnviarSolicitud.innerText = "Enviar Solicitud";
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

window.cerrarPopup = function() {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    beneficioSeleccionado = null;
};

// ==========================================
// CERRAR SESIÓN — reset total de estado
// ==========================================
function cerrarSesion() {
    permisosUsuario         = [];
    listaSubordinados       = [];
    historicoPermisosEquipo = [];
    rolUsuarioActivo        = "EMPLEADO";
    txtCedulaIngreso.value  = "";
    if (inputBuscadorTH) inputBuscadorTH.value = "";

    // Ocultar todas las tabs y resetear visualmente
    tabTiquetera.classList.remove('hidden');
    tabAdministrativos.classList.remove('hidden');
    tabEquipo.classList.add('hidden');
    tabAnaliticaTH.classList.add('hidden');
    tabTiquetera.className       = TAB_ACTIVO;
    tabAdministrativos.className = TAB_INACTIVO;

    headerUsuario.classList.add('hidden');
    headerUsuario.classList.remove('flex');
    seccionContenidoPortal.classList.add('hidden');
    seccionDashboardEquipo.classList.add('hidden');
    seccionAnaliticaTH.classList.add('hidden');
    gridBeneficios.classList.remove('hidden');
    seccionLogin.classList.remove('hidden');
}

// ==========================================
// VALIDACIÓN DE FORMULARIO
// ==========================================
function setupFormValidation() {
    const lblAlertaFecha = document.getElementById('lblAlertaFecha');

    attSoportes.addEventListener('change', (e) => {
        if (e.target.files.length > 0)
            document.getElementById('lblFileStatus').innerText = `✅ ${e.target.files[0].name}`;
        validarFormulario();
    });

    [dtFechaInicio, txtJustificacion].forEach(el => el.addEventListener('input', validarFormulario));

    function validarFormulario() {
        if (!beneficioSeleccionado) return;
        const justValid = txtJustificacion.value.trim().length > 0;
        let fechaValid  = false;

        if (dtFechaInicio.value) {
            const hoy      = new Date(); hoy.setHours(0,0,0,0);
            const fechaSel = new Date(dtFechaInicio.value + 'T00:00:00');
            const diffDays = Math.ceil((fechaSel - hoy) / 86400000);
            fechaValid     = true;
            if (diffDays < beneficioSeleccionado.diasAntelacion) lblAlertaFecha.classList.remove('hidden');
            else lblAlertaFecha.classList.add('hidden');
        }

        const adjuntoValid = !beneficioSeleccionado.requiereAdjunto || attSoportes.files.length > 0;
        btnEnviarSolicitud.disabled = !(justValid && fechaValid && adjuntoValid);
    }
}
