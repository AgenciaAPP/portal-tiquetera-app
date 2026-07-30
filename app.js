import { beneficios, categoriasTiquetera } from './beneficios.js';

// ==========================================
// ESTADO GLOBAL
// ==========================================
let tipoActual = "Tiquetera";
let categoriaActiva = "Todas"; // filtro de píldoras en tiquetera
let beneficioSeleccionado = null;
let permisosUsuario = [];
let rolUsuarioActivo = "EMPLEADO";
let listaSubordinados = [];
let historicoPermisosEquipo = [];
let fechasDisfrute = []; // fechas de disfrute aprobadas del servidor actual

const URL_FLOW_CONSULTA = "https://54b407e9c34be36d9ed93dfaf5a04b.e5.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/416f1b2038a24f729b516db2c869774e/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=KjDEhk6b_cTv_TF3yc0B43OvtdKAJ4qfKPs27gOjBG8";
const URL_FLOW_REGISTRO = "https://54b407e9c34be36d9ed93dfaf5a04b.e5.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/0545fde32b6648ef94ea9f6e01c70d6b/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=yQ3l3qxdl2oAS6KpgPBDYTOR88hwzGyxTwW29sVNJ6k";

// Títulos excluidos del conteo anual de 15 y del límite semanal
const EXCLUIDOS_LIMITES = ["Día para Trabajo desde casa", "Desconexión temprana"];

const gridBeneficios         = document.getElementById('gridBeneficios');
const tabTiquetera           = document.getElementById('tabTiquetera');
const tabAdministrativos     = document.getElementById('tabAdministrativos');
const tabHistorial           = document.getElementById('tabHistorial');
const tabEquipo              = document.getElementById('tabEquipo');
const tabAnaliticaTH         = document.getElementById('tabAnaliticaTH');
const modal                  = document.getElementById('modalBeneficio');
const seccionLogin           = document.getElementById('seccionLogin');
const seccionContenidoPortal = document.getElementById('seccionContenidoPortal');
const seccionHistorial       = document.getElementById('seccionHistorial');
const seccionDashboardEquipo = document.getElementById('seccionDashboardEquipo');
const seccionAnaliticaTH     = document.getElementById('seccionAnaliticaTH');
const btnValidarCedula       = document.getElementById('btnValidarCedula');
const txtCedulaIngreso       = document.getElementById('txtCedulaIngreso');
const lblErrorLogin          = document.getElementById('lblErrorLogin');
const headerUsuario          = document.getElementById('headerUsuario');
const avatarUsuario          = document.getElementById('avatarUsuario');
const lblNombreUsuario       = document.getElementById('lblNombreUsuario');
const lblCedulaUsuario       = document.getElementById('lblCedulaUsuario');
const btnCerrarSesion        = document.getElementById('btnCerrarSesion');
const spinnerLoading         = document.getElementById('spinnerLoading');
const txtBtnValidar          = document.getElementById('txtBtnValidar');
const tbodyHistoricoEquipo   = document.getElementById('tbodyHistoricoEquipo');
const tbodyHistoricoTH       = document.getElementById('tbodyHistoricoTH');
const dtFechaInicio          = document.getElementById('dtFechaInicio');
const txtJustificacion       = document.getElementById('txtJustificacion');
const attSoportes            = document.getElementById('attSoportes');
const btnEnviarSolicitud     = document.getElementById('btnEnviarSolicitud');

function mostrarEl(el)  { if(el) el.style.display = ''; }
function ocultarEl(el)  { if(el) el.style.display = 'none'; }
function mostrarFlex(el){ if(el) el.style.display = 'flex'; }

document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    setupFormValidation();
    btnValidarCedula.addEventListener('click', procesarAutenticacion);
    txtCedulaIngreso.addEventListener('keypress', e => { if(e.key==='Enter') procesarAutenticacion(); });
    btnCerrarSesion.addEventListener('click', cerrarSesion);
    btnEnviarSolicitud.addEventListener('click', procesarEnvioSolicitud);
});

async function procesarAutenticacion() {
    const cedula = txtCedulaIngreso.value.trim();
    if(!cedula) return;
    btnValidarCedula.disabled = true;
    mostrarEl(spinnerLoading);
    txtBtnValidar.innerText = "Verificando...";
    ocultarEl(lblErrorLogin);
    try {
        const r = await fetch(URL_FLOW_CONSULTA, { method:'POST', mode:'cors', headers:{'Content-Type':'application/json'}, body: JSON.stringify({cedula}) });
        if(!r.ok) throw new Error();
        const res = await r.json();
        if(res.valido === "SI") {
            permisosUsuario         = res.permisos         || [];
            rolUsuarioActivo        = res.rol              || "EMPLEADO";
            listaSubordinados       = res.subordinados     || [];
            historicoPermisosEquipo = res.historicoEquipo  || [];
            fechasDisfrute          = res.fechasDisfrute   || [];

            const nombre = res.nombre || "Servidor Público";
            lblNombreUsuario.innerText = nombre;
            lblCedulaUsuario.innerText = cedula;
            avatarUsuario.innerText = nombre.charAt(0).toUpperCase();
            mostrarFlex(headerUsuario);
            ocultarEl(seccionLogin);
            mostrarEl(seccionContenidoPortal);
            evaluarRolYActivarVista();
        } else {
            lblErrorLogin.innerText = "⚠️ Funcionario no habilitado o no encontrado en la base de datos.";
            mostrarEl(lblErrorLogin);
        }
    } catch(e) {
        lblErrorLogin.innerText = "⚠️ Error de conexión con el servidor institucional.";
        mostrarEl(lblErrorLogin);
    } finally {
        ocultarEl(spinnerLoading);
        txtBtnValidar.innerText = "Verificar";
        btnValidarCedula.disabled = false;
    }
}

function evaluarRolYActivarVista() {
    [tabTiquetera, tabAdministrativos, tabEquipo, tabAnaliticaTH].forEach(t => ocultarEl(t));
    ocultarEl(tabHistorial);

    if(rolUsuarioActivo === "ADMIN_TH") {
        mostrarEl(tabAnaliticaTH); activarTab('AnaliticaTH');
    } else if(rolUsuarioActivo === "JEFE" || rolUsuarioActivo === "SUPER_JEFE") {
        mostrarEl(tabTiquetera); mostrarEl(tabAdministrativos);
        mostrarEl(tabHistorial); mostrarEl(tabEquipo);
        activarTab('Tiquetera');
    } else {
        mostrarEl(tabTiquetera); mostrarEl(tabAdministrativos);
        mostrarEl(tabHistorial);
        activarTab('Tiquetera');
    }
}

const TAB_ACTIVO   = "tab-activo font-heading whitespace-nowrap py-4 px-1 text-sm transition-all focus:outline-none";
const TAB_INACTIVO = "tab-inactivo font-heading whitespace-nowrap py-4 px-1 text-sm transition-all focus:outline-none";

function setupTabs() {
    tabTiquetera.addEventListener('click', () => activarTab('Tiquetera'));
    tabAdministrativos.addEventListener('click', () => activarTab('Administrativos'));
    tabHistorial.addEventListener('click', () => activarTab('Historial'));
    tabEquipo.addEventListener('click', () => activarTab('Equipo'));
    tabAnaliticaTH.addEventListener('click', () => activarTab('AnaliticaTH'));
}

function activarTab(tipo) {
    tipoActual = tipo;
    [tabTiquetera, tabAdministrativos, tabHistorial, tabEquipo, tabAnaliticaTH].forEach(t => { if(t) t.className = TAB_INACTIVO; });
    ocultarEl(gridBeneficios); ocultarEl(seccionHistorial); ocultarEl(seccionDashboardEquipo); ocultarEl(seccionAnaliticaTH);

    // Píldoras solo visibles en Tiquetera
    const pildoras = document.getElementById('contenedorPildoras');
    if(pildoras) pildoras.style.display = tipo === 'Tiquetera' ? 'flex' : 'none';

    switch(tipo) {
        case 'Tiquetera':      tabTiquetera.className = TAB_ACTIVO; mostrarEl(gridBeneficios); categoriaActiva = "Todas"; renderGrid(); break;
        case 'Administrativos':tabAdministrativos.className = TAB_ACTIVO; mostrarEl(gridBeneficios); renderGrid(); break;
        case 'Historial':      tabHistorial.className = TAB_ACTIVO; mostrarEl(seccionHistorial); renderHistorial(); break;
        case 'Equipo':         tabEquipo.className = TAB_ACTIVO; mostrarEl(seccionDashboardEquipo); renderDashboardEquipo(); break;
        case 'AnaliticaTH':    tabAnaliticaTH.className = TAB_ACTIVO; mostrarEl(seccionAnaliticaTH); renderDashboardTH(); break;
    }
}

// ==========================================
// HELPERS
// ==========================================
function formatFecha(str) {
    if(!str) return '—';
    const d = new Date(str.includes('T') ? str : str+'T00:00:00');
    return isNaN(d) ? str : d.toLocaleDateString('es-CO', {day:'2-digit', month:'short', year:'numeric'});
}
function getEstado(reg) { return (reg.Estado?.Value || reg.Estado || '').toString(); }
function getNombre(cedula) { return listaSubordinados.find(s=>s.Title===cedula)?.NombreCompleto || cedula; }

// Obtiene el lunes de la semana de una fecha dada
// ==========================================
// HELPERS DE FECHAS Y REGLAS
// ==========================================

function tsDeReg(reg) {
    const f = reg.FechaSolicitud || reg.FechaInicio;
    if(!f) return null;
    return new Date(f.includes('T') ? f : f+'T00:00:00').getTime();
}

function lunesDeSemana(fechaStr) {
    const d = new Date(fechaStr.includes('T') ? fechaStr : fechaStr+'T00:00:00');
    const dia = d.getDay();
    const diffLunes = dia === 0 ? -6 : 1 - dia;
    d.setDate(d.getDate() + diffLunes);
    d.setHours(0,0,0,0);
    return d;
}

// Registros aprobados del servidor filtrados por título (excluye los excluidos si se pide)
function registrosPorTitulo(titulo) {
    return fechasDisfrute.filter(r => r.PermisoSolicitado === titulo);
}

// Títulos de situaciones administrativas (no cuentan en el límite de 15)
const TITULOS_ADMINISTRATIVOS = new Set(
    beneficios.filter(b => b.tipo === "Administrativos").map(b => b.titulo)
);

// Cuenta beneficios de tiquetera aprobados en el año actual
// Excluye: situaciones administrativas + trabajo en casa + desconexión temprana
function contarBeneficiosAnuales() {
    const inicioAnio = new Date(new Date().getFullYear(), 0, 1).getTime();
    return fechasDisfrute.filter(reg => {
        if(EXCLUIDOS_LIMITES.includes(reg.PermisoSolicitado)) return false;
        if(TITULOS_ADMINISTRATIVOS.has(reg.PermisoSolicitado)) return false;
        const ts = tsDeReg(reg);
        return ts !== null && ts >= inicioAnio;
    }).length;
}

// Evalúa si la fecha elegida viola la regla del beneficio
// Retorna null si está OK, o un string con el mensaje de error
function evaluarReglaFecha(beneficio, regla, fechaStr) {
    if(!fechaStr) return null;
    const fechaSel = new Date(fechaStr+'T00:00:00');
    const titulo = beneficio.titulo;
    const regs = registrosPorTitulo(titulo);

    // SEMANAL — aplica a todos los beneficios de tiquetera excepto excluidos
    if(beneficio.tipo === "Tiquetera" && !EXCLUIDOS_LIMITES.includes(titulo)) {
        const lunesSel = lunesDeSemana(fechaStr).getTime();
        const domSel   = lunesSel + 6 * 86400000;
        const conflicto = fechasDisfrute.find(r => {
            if(EXCLUIDOS_LIMITES.includes(r.PermisoSolicitado)) return false;
            const ts = tsDeReg(r);
            return ts !== null && ts >= lunesSel && ts <= domSel;
        });
        if(conflicto) {
            const lunesNext = new Date(lunesSel + 7*86400000);
            return `📅 Ya tienes un beneficio aprobado para esa semana. Solo puedes disfrutar 1 beneficio por semana. Selecciona una fecha a partir del ${lunesNext.toLocaleDateString('es-CO',{day:'2-digit',month:'long'})}.`;
        }
    }

    if(!regla) return null;
    const rb = regla.ReglaBloqueo;

    // MENSUAL
    if(rb === "Mensual") {
        const mismoMes = regs.find(r => {
            const ts = tsDeReg(r);
            if(ts === null) return false;
            const d = new Date(ts);
            return d.getFullYear() === fechaSel.getFullYear() && d.getMonth() === fechaSel.getMonth();
        });
        if(mismoMes) {
            const mesNombre = new Date(fechaSel.getFullYear(), fechaSel.getMonth()+1, 1)
                .toLocaleDateString('es-CO', {month:'long', year:'numeric'});
            return `📆 Ya tienes "${titulo}" solicitado para ${fechaSel.toLocaleDateString('es-CO',{month:'long'})}. Puedes pedirlo a partir de ${mesNombre}.`;
        }
    }

    // SEMESTRAL
    if(rb === "Semestral") {
        const semestreSel = fechaSel.getMonth() < 6 ? 1 : 2;
        const anioSel = fechaSel.getFullYear();
        const mismoSemestre = regs.find(r => {
            const ts = tsDeReg(r);
            if(ts === null) return false;
            const d = new Date(ts);
            const sem = d.getMonth() < 6 ? 1 : 2;
            return d.getFullYear() === anioSel && sem === semestreSel;
        });
        if(mismoSemestre) {
            const inicioSigSem = semestreSel === 1
                ? `1 de julio de ${anioSel}`
                : `1 de enero de ${anioSel+1}`;
            return `📆 Ya usaste este beneficio en el ${semestreSel === 1 ? 'primer' : 'segundo'} semestre. Puedes pedirlo a partir del ${inicioSigSem}.`;
        }
    }

    // ANUAL_LIMITE_2
    if(rb === "Anual_Limite_2") {
        const anioSel = fechaSel.getFullYear();
        const enEsteAnio = regs.filter(r => {
            const ts = tsDeReg(r);
            if(ts === null) return false;
            return new Date(ts).getFullYear() === anioSel;
        });
        if(enEsteAnio.length >= 2) {
            return `🚫 Ya usaste este beneficio 2 veces este año. No puedes volver a solicitarlo hasta el próximo año.`;
        }
    }

    return null; // Sin conflicto
}

function badge(estado) {
    const e = estado.toLowerCase();
    const cfg = e==='aprobado'  ? {bg:'#f0fdf4',c:'#15803d',bc:'#bbf7d0',ico:'✔',txt:'Aprobado'}
              : e==='rechazado' ? {bg:'#fef2f2',c:'#b91c1c',bc:'#fecaca',ico:'✘',txt:'Rechazado'}
              :                   {bg:'#fffbeb',c:'#b45309',bc:'#fde68a',ico:'⏳',txt:'Pendiente'};
    return `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:9999px;font-size:10px;font-weight:700;background:${cfg.bg};color:${cfg.c};border:1px solid ${cfg.bc}">${cfg.ico} ${cfg.txt}</span>`;
}


// Obtiene el tipo (Tiquetera / Administrativos) de un permiso por su título
function getTipoBeneficio(titulo) {
    const b = beneficios.find(b => b.titulo === titulo);
    return b ? b.tipo : null;
}

function badgeTipo(titulo) {
    const tipo = getTipoBeneficio(titulo);
    if(tipo === "Tiquetera")
        return `<span style="display:inline-flex;align-items:center;padding:2px 10px;border-radius:30px;font-size:10px;font-weight:700;background:#fffbea;color:#b7920a;border:1px solid #ffd500">🎟️ Tiquetera</span>`;
    if(tipo === "Administrativos")
        return `<span style="display:inline-flex;align-items:center;padding:2px 10px;border-radius:30px;font-size:10px;font-weight:700;background:#e8f4fd;color:#1878ba;border:1px solid #b8daef">💼 Administrativa</span>`;
    return `<span style="display:inline-flex;align-items:center;padding:2px 10px;border-radius:30px;font-size:10px;font-weight:700;background:#f0f0f0;color:#6a6a6a;border:1px solid #e0e0e0">— Sin clasificar</span>`;
}

function avatarDiv(nombre, size=28, bg='#1878ba') {
    return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${Math.round(size*0.4)}px;flex-shrink:0">${nombre.charAt(0).toUpperCase()}</div>`;
}

function serverRow(reg) {
    const nombre = getNombre(reg.Title);
    return `<tr style="border-bottom:1px solid #f0f0f0;transition:background 0.15s" onmouseover="this.style.background='#fafafa'" onmouseout="this.style.background=''">
        <td style="padding:12px 16px">
            <div style="display:flex;align-items:center;gap:8px">
                ${avatarDiv(nombre)}
                <div><div style="font-size:12px;font-weight:700;color:#222222;font-family:'Montserrat',sans-serif">${nombre}</div><div style="font-size:10px;color:#6a6a6a">${reg.Title}</div></div>
            </div>
        </td>
        <td style="padding:12px 16px;font-size:12px;font-weight:600;color:#333333;max-width:180px"><span style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${reg.PermisoSolicitado||''}">${reg.PermisoSolicitado||'—'}</span></td>
        <td style="padding:12px 16px">${badgeTipo(reg.PermisoSolicitado)}</td>
        <td style="padding:12px 16px;font-size:11px;color:#6a6a6a;white-space:nowrap">${formatFecha(reg.Created)}</td>
        <td style="padding:12px 16px;font-size:11px;color:#6a6a6a;white-space:nowrap">${formatFecha(reg.FechaSolicitud||reg.FechaInicio)}</td>
        <td style="padding:12px 16px">${badge(getEstado(reg))}</td>
    </tr>`;
}

// Fila para tabla TH — sin columna Fecha Radicado
function serverRowTH(reg) {
    const nombre = getNombre(reg.Title);
    return `<tr style="border-bottom:1px solid #f0f0f0;transition:background 0.15s" onmouseover="this.style.background='#fafafa'" onmouseout="this.style.background=''">
        <td style="padding:12px 16px">
            <div style="display:flex;align-items:center;gap:8px">
                ${avatarDiv(nombre)}
                <div><div style="font-size:12px;font-weight:700;color:#222222;font-family:'Montserrat',sans-serif">${nombre}</div><div style="font-size:10px;color:#6a6a6a">${reg.Title}</div></div>
            </div>
        </td>
        <td style="padding:12px 16px;font-size:12px;font-weight:600;color:#333333;max-width:200px"><span style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${reg.PermisoSolicitado||''}">${reg.PermisoSolicitado||'—'}</span></td>
        <td style="padding:12px 16px">${badgeTipo(reg.PermisoSolicitado)}</td>
        <td style="padding:12px 16px;font-size:11px;color:#6a6a6a;white-space:nowrap">${formatFecha(reg.FechaSolicitud||reg.FechaInicio)}</td>
        <td style="padding:12px 16px">${badge(getEstado(reg))}</td>
    </tr>`;
}

function aplicarFiltroFecha(datos, desdeId, hastaId) {
    const desde = document.getElementById(desdeId)?.value;
    const hasta = document.getElementById(hastaId)?.value;
    return datos.filter(r => {
        const fecha = new Date(r.Created || r.FechaSolicitud || 0);
        if(desde && fecha < new Date(desde)) return false;
        if(hasta && fecha > new Date(hasta+'T23:59:59')) return false;
        return true;
    });
}

function barras(conteo, total, contenedorId) {
    const el = document.getElementById(contenedorId);
    if(!el) return;
    const sorted = Object.entries(conteo).sort((a,b)=>b[1]-a[1]).slice(0,7);
    const maxVal = sorted[0]?.[1] || 1;
    const cols = ['#1E1C66','#0ea5e9','#10b981','#f59e0b','#ef4444','#00A6B8','#06b6d4'];
    el.innerHTML = sorted.length === 0
        ? '<p style="font-size:12px;color:#94a3b8;text-align:center;padding:16px">Sin datos.</p>'
        : sorted.map(([nom,val],i) => `
        <div style="margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                <span style="font-size:11px;font-weight:600;color:#475569;max-width:68%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${nom}">${nom}</span>
                <span style="font-size:11px;font-weight:700;color:${cols[i]}">${val} · ${Math.round(val/total*100)}%</span>
            </div>
            <div style="background:#f1f5f9;border-radius:9999px;height:8px;overflow:hidden">
                <div style="width:${Math.round(val/maxVal*100)}%;height:100%;background:${cols[i]};border-radius:9999px;transition:width 0.6s ease"></div>
            </div>
        </div>`).join('');
}

// ==========================================
// GRID BENEFICIOS
// ==========================================
function renderGrid() {
    gridBeneficios.innerHTML = '';

    const totalAnual = contarBeneficiosAnuales();
    const bannerAnual = document.getElementById('bannerLimiteAnual');
    if(bannerAnual && tipoActual === "Tiquetera") {
        const restantes = 15 - totalAnual;
        if(totalAnual >= 15) {
            bannerAnual.innerHTML = `🚫 Has alcanzado el límite anual de <strong>15 beneficios</strong>. No puedes radicar más solicitudes de tiquetera emocional este año.`;
            bannerAnual.style.cssText = "display:block;margin-bottom:20px;padding:14px 20px;border-radius:20px;border:1px solid #fecaca;background:#fdf3f1;color:#cb6c59;font-size:13px;font-weight:600;line-height:1.5;font-family:'Nunito',sans-serif";
        } else if(restantes <= 3) {
            bannerAnual.innerHTML = `⚠️ Te quedan <strong>${restantes} beneficio${restantes===1?'':'s'}</strong> disponibles de tu cuota anual de 15. (Trabajo desde casa y Desconexión temprana no cuentan en este límite.)`;
            bannerAnual.style.cssText = "display:block;margin-bottom:20px;padding:14px 20px;border-radius:20px;border:1px solid #FDDA2F;background:#fffde7;color:#b7920a;font-size:13px;font-weight:600;line-height:1.5;font-family:'Nunito',sans-serif";
        } else {
            ocultarEl(bannerAnual);
        }
    } else if(bannerAnual) {
        ocultarEl(bannerAnual);
    }

    if(tipoActual === "Tiquetera") {
        renderGridTiquetera(totalAnual);
    } else {
        renderGridAdministrativos();
    }
}

function renderPildoras() {
    const contenedor = document.getElementById('contenedorPildoras');
    if(!contenedor) return;
    const pildoras = ["Todas", ...categoriasTiquetera.map(c => c.id)];
    contenedor.innerHTML = pildoras.map(cat => {
        const activa = cat === categoriaActiva;
        const catInfo = categoriasTiquetera.find(c => c.id === cat);
        const emoji = catInfo ? catInfo.emoji : '✨';
        const label = cat === "Todas" ? "✨ Todas" : `${emoji} ${cat}`;
        return `<button onclick="filtrarCategoria('${cat}')"
            style="padding:8px 18px;border-radius:30px;font-size:12px;font-weight:700;font-family:'Montserrat',sans-serif;cursor:pointer;transition:all 0.2s;white-space:nowrap;
            ${activa
                ? 'background:#ffd500;color:#222222;border:2px solid #ffd500;box-shadow:0 2px 8px rgba(255,213,0,0.35)'
                : 'background:white;color:#222222;border:2px solid #e0e0e0'}"
        >${label}</button>`;
    }).join('');
}

window.filtrarCategoria = function(cat) {
    categoriaActiva = cat;
    renderGrid();
};

function renderGridTiquetera(totalAnual) {
    renderPildoras();
    const categoriasAMostrar = categoriaActiva === "Todas"
        ? categoriasTiquetera
        : categoriasTiquetera.filter(c => c.id === categoriaActiva);

    categoriasAMostrar.forEach(cat => {
        const beneficiosCat = beneficios.filter(b => b.tipo === "Tiquetera" && b.categoria === cat.id);
        const header = document.createElement('div');
        header.style.cssText = "grid-column:1/-1;margin-top:8px";
        header.innerHTML = `
            <div style="display:flex;align-items:center;gap:12px;padding:16px 20px;border-radius:20px;background:linear-gradient(135deg,#222222,#6a6a6a);margin-bottom:4px">
                <span style="font-size:28px">${cat.emoji}</span>
                <div>
                    <h3 style="font-family:'Montserrat',sans-serif;font-size:15px;font-weight:800;color:white;margin:0;line-height:1.2">${cat.id}</h3>
                    <p style="font-family:'Nunito',sans-serif;font-size:11px;color:rgba(255,255,255,0.75);margin:2px 0 0 0">${cat.subtitulo}</p>
                </div>
            </div>`;
        gridBeneficios.appendChild(header);
        beneficiosCat.forEach(b => gridBeneficios.appendChild(crearCard(b, totalAnual)));
    });
}

function renderGridAdministrativos() {
    beneficios.filter(b => b.tipo === "Administrativos").forEach(b => {
        gridBeneficios.appendChild(crearCard(b, 0));
    });
}

function crearCard(b, totalAnual) {
    const regla = permisosUsuario.find(p => p.Titulo === b.titulo);
    let disponible = true, btn = "Solicitar", badge2 = "";

    if(b.tipo === "Tiquetera" && totalAnual >= 15 && !EXCLUIDOS_LIMITES.includes(b.titulo)) {
        disponible = false; btn = "Límite anual alcanzado (Máx 15)";
    }

    if(disponible) {
        if(regla) {
            const v = parseInt(regla.VecesUsado) || 0;
            const rb = regla.ReglaBloqueo;
            if(rb === "Anual" && v >= 1)          { disponible = false; btn = "Ya utilizado este año"; }
            else if(rb === "Anual_Limite_2" && v >= 2) { disponible = false; btn = "Límite anual alcanzado (Máx 2)"; }
            if(rb === "Mensual" && v >= 1)         badge2 = `<span style="font-size:11px;color:#1878ba;font-weight:600;display:block;margin-top:4px">📆 Usado ${v} vez/veces — Elige otra fecha al solicitar</span>`;
            else if(rb === "Semestral" && v >= 1)  badge2 = `<span style="font-size:11px;color:#1878ba;font-weight:600;display:block;margin-top:4px">📆 ${v===1?"1er semestre usado":"2 semestres usados"} — Elige fecha del semestre disponible</span>`;
            else if(rb === "Anual_Limite_2" && v === 1) badge2 = `<span style="font-size:11px;color:#b7920a;font-weight:600;display:block;margin-top:4px">⚠️ Te queda 1 solicitud disponible este año</span>`;
            else if(v > 0) badge2 = `<span style="font-size:11px;color:#616161;font-weight:500;display:block;margin-top:4px">Usado este año: ${v} vez/veces</span>`;
        } else if(b.tipo === "Tiquetera") {
            disponible = false; btn = "No Habilitado";
        }
    } else if(regla) {
        const v = parseInt(regla.VecesUsado) || 0;
        if(v > 0) badge2 = `<span style="font-size:11px;color:#616161;font-weight:500;display:block;margin-top:4px">Usado este año: ${v} vez/veces</span>`;
    }

    if(b.tipo === "Tiquetera" && disponible && !EXCLUIDOS_LIMITES.includes(b.titulo)) {
        const restantes = 15 - totalAnual;
        if(restantes <= 3 && restantes > 0) badge2 += `<span style="font-size:10px;color:#b7920a;font-weight:700;display:block;margin-top:4px">📊 Cuota anual: ${totalAnual}/15 usados</span>`;
    }

    const card = document.createElement('div');
    card.className = 'card-app p-6 flex flex-col justify-between';
    if(!disponible) card.style.cssText = 'opacity:0.6;background:#f8f9ff;border-radius:20px;padding:24px;display:flex;flex-direction:column;justify-content:space-between';
    card.innerHTML = `<div>
        <span style="display:inline-flex;align-items:center;padding:3px 12px;border-radius:30px;font-size:11px;font-weight:700;${b.requiereAdjunto?'background:#fffde7;color:#b7920a;border:1px solid #FDDA2F':'background:#e0f7fa;color:#00838F;border:1px solid #b2ebf2'}">${b.requiereAdjunto?'📎 Requiere Soporte':'⚡ Uso Directo'}</span>
        <h4 style="font-family:'Montserrat',sans-serif;font-size:14px;font-weight:700;color:#222222;margin-top:12px;margin-bottom:4px;line-height:1.4">${b.titulo}</h4>
        <p style="font-size:11px;color:#616161">Anticipación: ${b.diasAntelacion} día${b.diasAntelacion===1?'':'s'} hábil${b.diasAntelacion===1?'':'es'}</p>${badge2}
        </div>
        <button style="margin-top:20px;width:100%;text-align:center;padding:10px 16px;border-radius:30px;font-size:13px;font-weight:700;font-family:'Montserrat',sans-serif;transition:all 0.2s;${disponible?'background:#ffd500;color:#222222;cursor:pointer':'background:#ECEFF1;color:#b7b7b7;cursor:not-allowed'}" ${!disponible?'disabled':''}>${btn}</button>`;
    if(disponible) card.querySelector('button').addEventListener('click', () => abrirPopup(b));
    return card;
}

// ==========================================
// RENDER: MI HISTORIAL PERSONAL
// ==========================================
function renderHistorial() {
    const totalAnual  = contarBeneficiosAnuales();
    const aprobados   = fechasDisfrute.filter(r => getEstado(r).toLowerCase() === 'aprobado').length;
    const rechazados  = fechasDisfrute.filter(r => getEstado(r).toLowerCase() === 'rechazado').length;
    const pendientes  = fechasDisfrute.length - aprobados - rechazados;
    const restantes   = Math.max(0, 15 - totalAnual);
    const pct         = Math.min(100, Math.round((totalAnual / 15) * 100));

    // KPIs
    document.getElementById('kpiHistUsados').innerText     = totalAnual;
    document.getElementById('kpiHistAprobados').innerText  = aprobados;
    document.getElementById('kpiHistPendientes').innerText = pendientes;
    document.getElementById('kpiHistRechazados').innerText = rechazados;

    // Barra de cuota
    document.getElementById('kpiHistCuotaTexto').innerText = `${totalAnual}/15`;
    document.getElementById('barraHistCuota').style.width  = `${pct}%`;
    document.getElementById('barraHistCuota').style.background =
        totalAnual >= 15 ? '#cb6c59' : totalAnual >= 12 ? 'linear-gradient(90deg,#b7920a,#cb6c59)' : 'linear-gradient(90deg,#1E1C66,#00A6B8)';

    const disponEl = document.getElementById('kpiHistDisponibles');
    if(disponEl) {
        disponEl.innerText = restantes > 0 ? `${restantes} disponibles` : '¡Cuota agotada!';
        disponEl.style.color = restantes === 0 ? '#cb6c59' : restantes <= 3 ? '#b7920a' : '#00A6B8';
    }

    // Tabla
    const tbody = document.getElementById('tbodyHistorial');
    if(!tbody) return;

    const tipFiltroHist = document.getElementById('filtroHistTipo')?.value||'';
    const histFiltradoHist = tipFiltroHist
        ? fechasDisfrute.filter(r => (getTipoBeneficio(r.PermisoSolicitado)||'') === tipFiltroHist)
        : fechasDisfrute;
    const ordenados = [...histFiltradoHist].sort((a,b) => new Date(b.Created||0) - new Date(a.Created||0));

    if(ordenados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="padding:32px;text-align:center;font-size:11px;color:#b7b7b7;text-transform:uppercase;letter-spacing:0.05em;font-family:'Montserrat',sans-serif">
            Aún no tienes solicitudes radicadas.
        </td></tr>`;
        return;
    }

    tbody.innerHTML = ordenados.map(reg => {
        const cuentaEnCuota = !EXCLUIDOS_LIMITES.includes(reg.PermisoSolicitado) && !TITULOS_ADMINISTRATIVOS.has(reg.PermisoSolicitado);
        const cuentaBadge = cuentaEnCuota
            ? `<span style="display:inline-flex;align-items:center;padding:2px 10px;border-radius:30px;font-size:10px;font-weight:700;background:#e8f4fd;color:#1878ba;border:1px solid #b8daef">✔ Sí cuenta</span>`
            : `<span style="display:inline-flex;align-items:center;padding:2px 10px;border-radius:30px;font-size:10px;font-weight:700;background:#e0f7fa;color:#00838F;border:1px solid #b2ebf2">— No cuenta</span>`;

        return `<tr style="border-bottom:1px solid #f0f0f0;transition:background 0.15s" onmouseover="this.style.background='#fafafa'" onmouseout="this.style.background=''">
            <td style="padding:12px 16px;font-size:12px;font-weight:600;color:#222222;max-width:220px">
                <span style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${reg.PermisoSolicitado||''}">${reg.PermisoSolicitado||'—'}</span>
            </td>
            <td style="padding:12px 16px">${badgeTipo(reg.PermisoSolicitado)}</td>
            <td style="padding:12px 16px;font-size:11px;color:#6a6a6a;white-space:nowrap">${formatFecha(reg.FechaSolicitud||reg.FechaInicio)}</td>
            <td style="padding:12px 16px">${cuentaBadge}</td>
            <td style="padding:12px 16px">${badge(getEstado(reg))}</td>
        </tr>`;
    }).join('');
}


function renderDashboardEquipo() {
    let hist = historicoPermisosEquipo;
    hist = aplicarFiltroFecha(hist, 'filtroEquipoDesde', 'filtroEquipoHasta');
    const busq = (document.getElementById('filtroEquipoBusqueda')?.value||'').toLowerCase();
    const est  = (document.getElementById('filtroEquipoEstado')?.value||'').toLowerCase();
    const ben  = document.getElementById('filtroEquipoBeneficio')?.value||'';
    const tipFiltro = document.getElementById('filtroEquipoTipo')?.value||'';
    const histFiltrado = hist.filter(r => {
        const nom = getNombre(r.Title).toLowerCase();
        const ced = (r.Title||'').toLowerCase();
        const tipo = getTipoBeneficio(r.PermisoSolicitado)||'';
        return (!busq || nom.includes(busq) || ced.includes(busq))
            && (!est  || getEstado(r).toLowerCase()===est)
            && (!ben  || r.PermisoSolicitado===ben)
            && (!tipFiltro || tipo===tipFiltro);
    });
    const total = histFiltrado.length;
    const aprob = histFiltrado.filter(r=>getEstado(r).toLowerCase()==='aprobado').length;
    const rech  = histFiltrado.filter(r=>getEstado(r).toLowerCase()==='rechazado').length;
    const pend  = total - aprob - rech;
    const tasa  = total>0 ? Math.round(aprob/total*100)+'%' : '—';
    document.getElementById('kpiTotalEquipo').innerText          = listaSubordinados.length;
    document.getElementById('kpiTotalHistoricoEquipo').innerText = total;
    document.getElementById('kpiAprobadosEquipo').innerText      = aprob;
    document.getElementById('kpiRechazadosEquipo').innerText     = rech;
    document.getElementById('kpiPendientesEquipo').innerText     = pend;
    document.getElementById('kpiTasaAprobacion').innerText       = tasa;
    const conteo = {};
    histFiltrado.forEach(r => { const k=r.PermisoSolicitado||'Sin definir'; conteo[k]=(conteo[k]||0)+1; });
    const top = Object.entries(conteo).sort((a,b)=>b[1]-a[1])[0];
    document.getElementById('kpiTopTramiteEquipo').innerText = top ? `${top[0]} (${top[1]})` : '—';
    const selBen = document.getElementById('filtroEquipoBeneficio');
    if(selBen && selBen.options.length <= 1) {
        [...new Set(historicoPermisosEquipo.map(r=>r.PermisoSolicitado).filter(Boolean))].sort().forEach(b => {
            const o = document.createElement('option'); o.value=b; o.innerText=b; selBen.appendChild(o);
        });
    }
    barras(conteo, total||1, 'graficaBeneficiosEquipo');
    renderTarjetasServidores(aplicarFiltroFecha(historicoPermisosEquipo, 'filtroEquipoDesde', 'filtroEquipoHasta'));
    tbodyHistoricoEquipo.innerHTML = [...histFiltrado]
        .sort((a,b)=>new Date(b.Created||0)-new Date(a.Created||0))
        .map(serverRow).join('') ||
        `<tr><td colspan="5" style="padding:32px;text-align:center;font-size:11px;color:#94a3b8;text-transform:uppercase">No hay registros que coincidan.</td></tr>`;
}

function renderTarjetasServidores(hist) {
    const el = document.getElementById('gridTarjetasServidores');
    if(!el) return;
    if(listaSubordinados.length===0) { el.innerHTML='<p style="font-size:12px;color:#94a3b8;text-align:center;padding:20px">Sin colaboradores.</p>'; return; }
    el.innerHTML = listaSubordinados.map(sub => {
        const ced = sub.Title;
        const nom = sub.NombreCompleto||ced;
        const sols = hist.filter(r=>r.Title===ced);
        const a = sols.filter(r=>getEstado(r).toLowerCase()==='aprobado').length;
        const re = sols.filter(r=>getEstado(r).toLowerCase()==='rechazado').length;
        const pe = sols.length-a-re;
        const bgAv = sols.length===0?'#94a3b8':a>re?'#1E1C66':'#f59e0b';
        return `<div style="background:white;border:1px solid #e2e8f0;border-radius:16px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,0.05)" onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.09)'" onmouseout="this.style.boxShadow='0 1px 3px rgba(0,0,0,0.05)'">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
                ${avatarDiv(nom,36,bgAv)}
                <div style="overflow:hidden"><div style="font-size:12px;font-weight:700;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${nom}">${nom}</div><div style="font-size:10px;color:#94a3b8">${ced}</div></div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;text-align:center">
                <div style="background:#f0fdf4;border-radius:8px;padding:6px"><div style="font-size:18px;font-weight:700;color:#15803d">${a}</div><div style="font-size:9px;color:#16a34a;font-weight:600;text-transform:uppercase">Aprobados</div></div>
                <div style="background:#fffbeb;border-radius:8px;padding:6px"><div style="font-size:18px;font-weight:700;color:#b45309">${pe}</div><div style="font-size:9px;color:#d97706;font-weight:600;text-transform:uppercase">Pendientes</div></div>
                <div style="background:#fdf3f1;border-radius:8px;padding:6px"><div style="font-size:18px;font-weight:700;color:#b91c1c">${re}</div><div style="font-size:9px;color:#cb6c59;font-weight:600;text-transform:uppercase">Rechazados</div></div>
            </div>
            ${sols.length===0?'<div style="text-align:center;margin-top:8px;font-size:10px;color:#cbd5e1">Sin solicitudes en este período</div>':''}
        </div>`;
    }).join('');
}

// ==========================================
// DASHBOARD TALENTO HUMANO
// ==========================================
function renderDashboardTH() {
    let hist = historicoPermisosEquipo;
    hist = aplicarFiltroFecha(hist, 'filtroTHDesde', 'filtroTHHasta');
    const busq = (document.getElementById('filtroTHBusqueda')?.value||'').toLowerCase();
    const est  = (document.getElementById('filtroTHEstado')?.value||'').toLowerCase();
    const ben  = document.getElementById('filtroTHBeneficio')?.value||'';
    const tipFiltroTH = document.getElementById('filtroTHTipo')?.value||'';
    const histFiltrado = hist.filter(r => {
        const nom = getNombre(r.Title).toLowerCase();
        const ced = (r.Title||'').toLowerCase();
        const tipo = getTipoBeneficio(r.PermisoSolicitado)||'';
        return (!busq || nom.includes(busq) || ced.includes(busq))
            && (!est  || getEstado(r).toLowerCase()===est)
            && (!ben  || r.PermisoSolicitado===ben)
            && (!tipFiltroTH || tipo===tipFiltroTH);
    });
    const total = histFiltrado.length;
    const aprob = histFiltrado.filter(r=>getEstado(r).toLowerCase()==='aprobado').length;
    const rech  = histFiltrado.filter(r=>getEstado(r).toLowerCase()==='rechazado').length;
    const pend  = total - aprob - rech;
    const tasa  = total>0 ? Math.round(aprob/total*100)+'%' : '—';
    const sevsActivos = new Set(histFiltrado.map(r=>r.Title)).size;
    document.getElementById('kpiThTotalServidores').innerText  = listaSubordinados.length;
    document.getElementById('kpiThServsActivos').innerText     = sevsActivos;
    document.getElementById('kpiThTotalTramites').innerText    = total;
    document.getElementById('kpiThAprobados').innerText        = aprob;
    document.getElementById('kpiThRechazados').innerText       = rech;
    document.getElementById('kpiThPendientes').innerText       = pend;
    document.getElementById('kpiThTasa').innerText             = tasa;
    const conteo = {};
    histFiltrado.forEach(r => { const k=r.PermisoSolicitado||'Sin definir'; conteo[k]=(conteo[k]||0)+1; });
    const top = Object.entries(conteo).sort((a,b)=>b[1]-a[1])[0];
    document.getElementById('kpiThTopTramite').innerText = top ? `${top[0]} (${top[1]})` : '—';
    const selBenTH = document.getElementById('filtroTHBeneficio');
    if(selBenTH && selBenTH.options.length<=1) {
        [...new Set(historicoPermisosEquipo.map(r=>r.PermisoSolicitado).filter(Boolean))].sort().forEach(b=>{
            const o=document.createElement('option'); o.value=b; o.innerText=b; selBenTH.appendChild(o);
        });
    }
    barras(conteo, total||1, 'graficaBeneficiosTH');
    renderRankingServidores(aplicarFiltroFecha(historicoPermisosEquipo,'filtroTHDesde','filtroTHHasta'));
    tbodyHistoricoTH.innerHTML = [...histFiltrado]
        .sort((a,b)=>new Date(b.Created||0)-new Date(a.Created||0))
        .map(serverRowTH).join('') ||
        `<tr><td colspan="5" style="padding:32px;text-align:center;font-size:11px;color:#94a3b8;text-transform:uppercase">No hay registros que coincidan.</td></tr>`;
}

function renderRankingServidores(hist) {
    const el = document.getElementById('rankingServidoresTH');
    if(!el) return;
    const conteo = {};
    hist.forEach(r => { conteo[r.Title]=(conteo[r.Title]||0)+1; });
    const sorted = Object.entries(conteo).sort((a,b)=>b[1]-a[1]).slice(0,8);
    const maxVal = sorted[0]?.[1]||1;
    el.innerHTML = sorted.length===0
        ? '<p style="font-size:12px;color:#aaaaaa;text-align:center;padding:16px">Sin datos en el período seleccionado.</p>'
        : sorted.map(([ced,val]) => {
            const nom = getNombre(ced);
            const pct = Math.round(val/maxVal*100);
            const aprob = hist.filter(r=>r.Title===ced && getEstado(r).toLowerCase()==='aprobado').length;
            const rech  = hist.filter(r=>r.Title===ced && getEstado(r).toLowerCase()==='rechazado').length;
            const pend  = val - aprob - rech;
            return `<div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #f0f0f0">
                ${avatarDiv(nom, 34, '#1878ba')}
                <div style="flex:1;min-width:0">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                        <span style="font-size:12px;font-weight:700;color:#222222;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:'Montserrat',sans-serif">${nom}</span>
                        <span style="font-size:11px;font-weight:700;color:#1878ba;flex-shrink:0;margin-left:8px;font-family:'Montserrat',sans-serif">${val} solicitud${val===1?'':'es'}</span>
                    </div>
                    <div style="background:#f0f0f0;border-radius:9999px;height:5px;overflow:hidden;margin-bottom:5px">
                        <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,#1878ba,#ffd500);border-radius:9999px"></div>
                    </div>
                    <div style="display:flex;gap:10px">
                        <span style="font-size:10px;color:#2e7d32;font-weight:600">✔ ${aprob} aprobadas</span>
                        <span style="font-size:10px;color:#b7920a;font-weight:600">⏳ ${pend} pendientes</span>
                        <span style="font-size:10px;color:#cb6c59;font-weight:600">✘ ${rech} rechazadas</span>
                    </div>
                </div>
            </div>`;
        }).join('');
}

window.aplicarFiltrosEquipo = function() { renderDashboardEquipo(); };
window.aplicarFiltrosTH     = function() { renderDashboardTH(); };

// ==========================================
// POPUP + ENVÍO
// ==========================================
function esCitaMedica(b) {
    return b.titulo.toLowerCase().includes('cita') && b.titulo.toLowerCase().includes('medic');
}

function abrirPopup(b) {
    beneficioSeleccionado = b;
    document.getElementById('lblTituloPopup').innerText = b.titulo;
    document.getElementById('lblAnticipacion').innerHTML = `⏰ <strong>Mínimo ${b.diasAntelacion} días de anticipación.</strong><br><span style="display:block;margin-top:8px;font-size:12px;color:#475569;font-weight:400;line-height:1.5">${b.hint}</span>`;
    document.getElementById('lblFechaDisfrute').innerText = "Fecha de la Solicitud";
    const wrapHora = document.getElementById('wrapperHoraCita');
    if(esCitaMedica(b)) { mostrarEl(wrapHora); } else { ocultarEl(wrapHora); }
    const ws=document.getElementById('wrapperSoportes'), la=document.getElementById('lblAlertaSoporte');
    if(b.requiereAdjunto){mostrarEl(ws);mostrarEl(la);}else{ocultarEl(ws);ocultarEl(la);}
    ocultarEl(document.getElementById('lblAlertaSemana'));
    document.getElementById('formSolicitud').reset();
    document.getElementById('lblFileStatus').innerText="📄 Selecciona o arrastra tu archivo (PDF, PNG, JPG)";
    ocultarEl(document.getElementById('lblAlertaFecha'));
    btnEnviarSolicitud.disabled=true; btnEnviarSolicitud.innerText="Enviar Solicitud";
    mostrarFlex(modal);
}
window.cerrarPopup = function() { ocultarEl(modal); beneficioSeleccionado=null; };

async function procesarEnvioSolicitud() {
    const cedula=lblCedulaUsuario.innerText, beneficio=beneficioSeleccionado.titulo;
    const fecha=dtFechaInicio.value;
    let justificacion=txtJustificacion.value.trim();
    if(esCitaMedica(beneficioSeleccionado)) {
        const hora = document.getElementById('inputHoraCita')?.value;
        if(hora) justificacion = `Hora de la cita: ${hora}\n${justificacion}`;
    }
    btnEnviarSolicitud.disabled=true; btnEnviarSolicitud.innerText="Enviando Radicado...";
    let nombreArchivo="Sin_Soporte.txt", contenidoBase64="VGV4dG8gZHUgbXkgcGFyYSBldml0YXIgZmFsbG9z";
    try {
        if(beneficioSeleccionado.requiereAdjunto && attSoportes.files.length>0) {
            const arch=attSoportes.files[0];
            nombreArchivo=arch.name.replace(/[^a-zA-Z0-9.\-_]/g,'_');
            contenidoBase64=await new Promise((res,rej)=>{ const rd=new FileReader(); rd.readAsDataURL(arch); rd.onload=()=>res(rd.result.split(',')[1]); rd.onerror=rej; });
        }
        const resp=await fetch(URL_FLOW_REGISTRO,{method:'POST',mode:'cors',headers:{'Content-Type':'application/json'},body:JSON.stringify({cedula,beneficio,fechaInicio:fecha,justificacion,nombreArchivo,contenidoBase64,regulacion:beneficioSeleccionado.hint})});
        if(!resp.ok) throw new Error();
        alert(`🎉 Tu solicitud para "${beneficio}" ha sido radicada con éxito.`);
        cerrarPopup(); procesarAutenticacion();
    } catch(e) {
        alert("⚠️ Hubo un problema al radicar tu solicitud. Por favor, reintenta.");
        btnEnviarSolicitud.disabled=false; btnEnviarSolicitud.innerText="Enviar Solicitud";
    }
}

function cerrarSesion() {
    permisosUsuario=[]; listaSubordinados=[]; historicoPermisosEquipo=[];
    fechasDisfrute=[]; rolUsuarioActivo="EMPLEADO"; txtCedulaIngreso.value="";
    mostrarEl(tabTiquetera); mostrarEl(tabAdministrativos); mostrarEl(tabHistorial);
    ocultarEl(tabEquipo); ocultarEl(tabAnaliticaTH);
    tabTiquetera.className=TAB_ACTIVO; tabAdministrativos.className=TAB_INACTIVO;
    tabHistorial.className=TAB_INACTIVO;
    ocultarEl(headerUsuario); ocultarEl(seccionContenidoPortal);
    ocultarEl(seccionHistorial); ocultarEl(seccionDashboardEquipo); ocultarEl(seccionAnaliticaTH);
    mostrarEl(gridBeneficios); mostrarEl(seccionLogin);
}

function setupFormValidation() {
    const laf = document.getElementById('lblAlertaFecha');
    const las  = document.getElementById('lblAlertaSemana');

    attSoportes.addEventListener('change', e=>{
        if(e.target.files.length>0) document.getElementById('lblFileStatus').innerText=`✅ ${e.target.files[0].name}`;
        validar();
    });
    [dtFechaInicio, txtJustificacion].forEach(el => el.addEventListener('input', validar));
    document.getElementById('inputHoraCita')?.addEventListener('input', validar);

    function validar() {
        if(!beneficioSeleccionado) return;
        const jv = txtJustificacion.value.trim().length > 0;
        let fv = false;
        let reglaOk = true;

        if(dtFechaInicio.value) {
            const hoy = new Date(); hoy.setHours(0,0,0,0);
            const fechaSel = new Date(dtFechaInicio.value+'T00:00:00');
            const diffDias = Math.ceil((fechaSel - hoy) / 86400000);
            fv = true;

            // Alerta de anticipación mínima
            diffDias < beneficioSeleccionado.diasAntelacion ? mostrarEl(laf) : ocultarEl(laf);

            // Evaluar regla de negocio según tipo de beneficio
            const regla = permisosUsuario.find(p => p.Titulo === beneficioSeleccionado.titulo);
            const mensajeConflicto = evaluarReglaFecha(beneficioSeleccionado, regla, dtFechaInicio.value);

            if(mensajeConflicto) {
                reglaOk = false;
                if(las) {
                    las.innerText = mensajeConflicto;
                    mostrarEl(las);
                }
            } else {
                reglaOk = true;
                if(las) ocultarEl(las);
            }
        }

        const horaVal = esCitaMedica(beneficioSeleccionado)
            ? (document.getElementById('inputHoraCita')?.value?.trim().length > 0)
            : true;

        btnEnviarSolicitud.disabled = !(jv && fv && reglaOk && horaVal && (!beneficioSeleccionado.requiereAdjunto || attSoportes.files.length > 0));
    }
}
