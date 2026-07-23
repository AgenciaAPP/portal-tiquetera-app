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
let usadoEstaSemana = false;
let totalAnualUsado = 0;

const URL_FLOW_CONSULTA = "https://54b407e9c34be36d9ed93dfaf5a04b.e5.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/416f1b2038a24f729b516db2c869774e/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=KjDEhk6b_cTv_TF3yc0B43OvtdKAJ4qfKPs27gOjBG8";
const URL_FLOW_REGISTRO = "https://54b407e9c34be36d9ed93dfaf5a04b.e5.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/0545fde32b6648ef94ea9f6e01c70d6b/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=yQ3l3qxdl2oAS6KpgPBDYTOR88hwzGyxTwW29sVNJ6k";

// Títulos excluidos del conteo anual de 15
const EXCLUIDOS_CONTEO_ANUAL = [
    "Día para Trabajo desde casa",
    "Desconexión temprana"
];

const gridBeneficios         = document.getElementById('gridBeneficios');
const tabTiquetera           = document.getElementById('tabTiquetera');
const tabAdministrativos     = document.getElementById('tabAdministrativos');
const tabEquipo              = document.getElementById('tabEquipo');
const tabAnaliticaTH         = document.getElementById('tabAnaliticaTH');
const modal                  = document.getElementById('modalBeneficio');
const seccionLogin           = document.getElementById('seccionLogin');
const seccionContenidoPortal = document.getElementById('seccionContenidoPortal');
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
            usadoEstaSemana         = res.usadoEstaSemana  || false;
            totalAnualUsado         = res.totalAnualUsado  || 0;

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
    if(rolUsuarioActivo === "ADMIN_TH") {
        mostrarEl(tabAnaliticaTH); activarTab('AnaliticaTH');
    } else if(rolUsuarioActivo === "JEFE" || rolUsuarioActivo === "SUPER_JEFE") {
        mostrarEl(tabTiquetera); mostrarEl(tabAdministrativos); mostrarEl(tabEquipo); activarTab('Tiquetera');
    } else {
        mostrarEl(tabTiquetera); mostrarEl(tabAdministrativos); activarTab('Tiquetera');
    }
}

const TAB_ACTIVO   = "border-indigo-600 text-indigo-600 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all focus:outline-none";
const TAB_INACTIVO = "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all focus:outline-none";

function setupTabs() {
    tabTiquetera.addEventListener('click', () => activarTab('Tiquetera'));
    tabAdministrativos.addEventListener('click', () => activarTab('Administrativos'));
    tabEquipo.addEventListener('click', () => activarTab('Equipo'));
    tabAnaliticaTH.addEventListener('click', () => activarTab('AnaliticaTH'));
}

function activarTab(tipo) {
    tipoActual = tipo;
    [tabTiquetera, tabAdministrativos, tabEquipo, tabAnaliticaTH].forEach(t => { if(t) t.className = TAB_INACTIVO; });
    ocultarEl(gridBeneficios); ocultarEl(seccionDashboardEquipo); ocultarEl(seccionAnaliticaTH);
    switch(tipo) {
        case 'Tiquetera':      tabTiquetera.className = TAB_ACTIVO; mostrarEl(gridBeneficios); renderGrid(); break;
        case 'Administrativos':tabAdministrativos.className = TAB_ACTIVO; mostrarEl(gridBeneficios); renderGrid(); break;
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
function esExcluidoConteoAnual(titulo) { return EXCLUIDOS_CONTEO_ANUAL.includes(titulo); }

function badge(estado) {
    const e = estado.toLowerCase();
    const cfg = e==='aprobado'  ? {bg:'#f0fdf4',c:'#15803d',bc:'#bbf7d0',ico:'✔',txt:'Aprobado'}
              : e==='rechazado' ? {bg:'#fef2f2',c:'#b91c1c',bc:'#fecaca',ico:'✘',txt:'Rechazado'}
              :                   {bg:'#fffbeb',c:'#b45309',bc:'#fde68a',ico:'⏳',txt:'Pendiente'};
    return `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:9999px;font-size:10px;font-weight:700;background:${cfg.bg};color:${cfg.c};border:1px solid ${cfg.bc}">${cfg.ico} ${cfg.txt}</span>`;
}

function avatarDiv(nombre, size=28, bg='#6366f1') {
    return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${Math.round(size*0.4)}px;flex-shrink:0">${nombre.charAt(0).toUpperCase()}</div>`;
}

function serverRow(reg) {
    const nombre = getNombre(reg.Title);
    return `<tr style="border-bottom:1px solid #f1f5f9;transition:background 0.15s" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
        <td style="padding:12px 16px">
            <div style="display:flex;align-items:center;gap:8px">
                ${avatarDiv(nombre)}
                <div><div style="font-size:12px;font-weight:700;color:#1e293b">${nombre}</div><div style="font-size:10px;color:#94a3b8">${reg.Title}</div></div>
            </div>
        </td>
        <td style="padding:12px 16px;font-size:12px;font-weight:600;color:#334155;max-width:180px"><span style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${reg.PermisoSolicitado||''}">${reg.PermisoSolicitado||'—'}</span></td>
        <td style="padding:12px 16px;font-size:11px;color:#64748b;white-space:nowrap">${formatFecha(reg.Created)}</td>
        <td style="padding:12px 16px;font-size:11px;color:#64748b;white-space:nowrap">${formatFecha(reg.FechaSolicitud||reg.FechaInicio)}</td>
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
    const cols = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4'];
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
// GRID BENEFICIOS — con las 3 reglas nuevas
// ==========================================
function renderGrid() {
    gridBeneficios.innerHTML = '';

    // Banner de límite semanal — solo aplica en tiquetera
    if(tipoActual === "Tiquetera") {
        const bannerSemana = document.getElementById('bannerLimiteSemanal');
        if(bannerSemana) {
            if(usadoEstaSemana) mostrarEl(bannerSemana);
            else ocultarEl(bannerSemana);
        }

        // Banner de límite anual
        const bannerAnual = document.getElementById('bannerLimiteAnual');
        if(bannerAnual) {
            const restantes = 15 - totalAnualUsado;
            if(totalAnualUsado >= 15) {
                bannerAnual.innerHTML = `🚫 Has alcanzado el límite anual de <strong>15 beneficios</strong>. No puedes radicar más solicitudes de tiquetera emocional este año.`;
                bannerAnual.style.background = '#fef2f2';
                bannerAnual.style.borderColor = '#fecaca';
                bannerAnual.style.color = '#b91c1c';
                mostrarEl(bannerAnual);
            } else if(restantes <= 3) {
                bannerAnual.innerHTML = `⚠️ Te quedan <strong>${restantes} beneficio${restantes===1?'':'s'}</strong> disponibles de tu cuota anual de 15. (Trabajo desde casa y Desconexión temprana no cuentan en este límite.)`;
                bannerAnual.style.background = '#fffbeb';
                bannerAnual.style.borderColor = '#fde68a';
                bannerAnual.style.color = '#b45309';
                mostrarEl(bannerAnual);
            } else {
                ocultarEl(bannerAnual);
            }
        }
    }

    beneficios.filter(b=>b.tipo===tipoActual).forEach(b => {
        const regla = permisosUsuario.find(p=>p.Titulo===b.titulo);
        let disponible=true, btn="Solicitar", badge2="", motivo="";

        if(tipoActual === "Tiquetera") {
            // Regla 1: límite semanal (no aplica a excluidos)
            if(usadoEstaSemana && !esExcluidoConteoAnual(b.titulo)) {
                disponible = false;
                btn = "Límite semanal alcanzado";
                motivo = "semanal";
            }

            // Regla 2: límite anual de 15 (no aplica a excluidos)
            if(totalAnualUsado >= 15 && !esExcluidoConteoAnual(b.titulo)) {
                disponible = false;
                btn = "Límite anual alcanzado (Máx 15)";
                motivo = "anual15";
            }
        }

        // Reglas individuales por beneficio (solo si aún está disponible)
        if(disponible) {
            if(regla) {
                const v = parseInt(regla.VecesUsado)||0;
                badge2 = `<span class="text-[11px] text-slate-400 font-medium block mt-1">Usado este año: ${v} vez/veces</span>`;
                if(regla.ReglaBloqueo==="Anual" && v>=1)         { disponible=false; btn="Ya utilizado este año"; }
                if(regla.ReglaBloqueo==="Semestral" && v>=1)      { disponible=false; btn="Límite semestral alcanzado"; }
                if(regla.ReglaBloqueo==="Mensual" && v>=1)        { disponible=false; btn="Límite mensual alcanzado"; }
                if(regla.ReglaBloqueo==="Anual_Limite_2" && v>=2) { disponible=false; btn="Límite anual alcanzado (Máx 2)"; }
                if(regla.ReglaBloqueo==="Anual_Limite_2" && v===1) badge2 += `<span class="text-[10px] text-amber-500 font-semibold block mt-0.5">⚠️ Te queda 1 solicitud disponible</span>`;
            } else if(tipoActual==="Tiquetera") {
                disponible=false; btn="No Habilitado";
            }
        } else if(regla) {
            // Mostrar conteo aunque esté bloqueado por regla global
            const v = parseInt(regla.VecesUsado)||0;
            badge2 = `<span class="text-[11px] text-slate-400 font-medium block mt-1">Usado este año: ${v} vez/veces</span>`;
        }

        // Badge de cuota anual restante (solo para beneficios que cuentan en el límite)
        if(tipoActual === "Tiquetera" && !esExcluidoConteoAnual(b.titulo) && disponible) {
            const restantes = 15 - totalAnualUsado;
            if(restantes <= 3 && restantes > 0) {
                badge2 += `<span class="text-[10px] text-amber-500 font-semibold block mt-0.5">📊 Cuota anual: ${totalAnualUsado}/15 usados</span>`;
            }
        }

        const card = document.createElement('div');
        card.className = `bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${!disponible?'opacity-60 bg-slate-50/50':''}`;
        card.innerHTML = `<div>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${b.requiereAdjunto?'bg-amber-50 text-amber-800 border border-amber-100':'bg-emerald-50 text-emerald-800 border border-emerald-100'}">${b.requiereAdjunto?'📎 Requiere Soporte':'⚡ Uso Directo'}</span>
            <h4 class="text-base font-bold text-slate-900 mt-3 mb-1 leading-snug">${b.titulo}</h4>
            <p class="text-xs text-slate-400">Anticipación: ${b.diasAntelacion} día${b.diasAntelacion===1?'':'s'} hábil${b.diasAntelacion===1?'':'es'}</p>${badge2}
            </div>
            <button class="mt-6 w-full text-center py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${disponible?'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm':'bg-slate-200 text-slate-400 cursor-not-allowed'}" ${!disponible?'disabled':''}>${btn}</button>`;
        if(disponible) card.querySelector('button').addEventListener('click', ()=>abrirPopup(b));
        gridBeneficios.appendChild(card);
    });
}

// ==========================================
// DASHBOARD MI EQUIPO
// ==========================================
function renderDashboardEquipo() {
    let hist = historicoPermisosEquipo;
    hist = aplicarFiltroFecha(hist, 'filtroEquipoDesde', 'filtroEquipoHasta');

    const busq  = (document.getElementById('filtroEquipoBusqueda')?.value||'').toLowerCase();
    const est   = (document.getElementById('filtroEquipoEstado')?.value||'').toLowerCase();
    const ben   = document.getElementById('filtroEquipoBeneficio')?.value||'';

    const histFiltrado = hist.filter(r => {
        const nom = getNombre(r.Title).toLowerCase();
        const ced = (r.Title||'').toLowerCase();
        return (!busq || nom.includes(busq) || ced.includes(busq))
            && (!est  || getEstado(r).toLowerCase()===est)
            && (!ben  || r.PermisoSolicitado===ben);
    });

    const total   = histFiltrado.length;
    const aprob   = histFiltrado.filter(r=>getEstado(r).toLowerCase()==='aprobado').length;
    const rech    = histFiltrado.filter(r=>getEstado(r).toLowerCase()==='rechazado').length;
    const pend    = total - aprob - rech;
    const tasa    = total>0 ? Math.round(aprob/total*100)+'%' : '—';

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
        const bgAv = sols.length===0?'#94a3b8':a>re?'#6366f1':'#f59e0b';
        return `<div style="background:white;border:1px solid #e2e8f0;border-radius:16px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,0.05)" onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.09)'" onmouseout="this.style.boxShadow='0 1px 3px rgba(0,0,0,0.05)'">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
                ${avatarDiv(nom,36,bgAv)}
                <div style="overflow:hidden"><div style="font-size:12px;font-weight:700;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${nom}">${nom}</div><div style="font-size:10px;color:#94a3b8">${ced}</div></div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;text-align:center">
                <div style="background:#f0fdf4;border-radius:8px;padding:6px"><div style="font-size:18px;font-weight:700;color:#15803d">${a}</div><div style="font-size:9px;color:#16a34a;font-weight:600;text-transform:uppercase">Aprobados</div></div>
                <div style="background:#fffbeb;border-radius:8px;padding:6px"><div style="font-size:18px;font-weight:700;color:#b45309">${pe}</div><div style="font-size:9px;color:#d97706;font-weight:600;text-transform:uppercase">Pendientes</div></div>
                <div style="background:#fef2f2;border-radius:8px;padding:6px"><div style="font-size:18px;font-weight:700;color:#b91c1c">${re}</div><div style="font-size:9px;color:#dc2626;font-weight:600;text-transform:uppercase">Rechazados</div></div>
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

    const histFiltrado = hist.filter(r => {
        const nom = getNombre(r.Title).toLowerCase();
        const ced = (r.Title||'').toLowerCase();
        return (!busq || nom.includes(busq) || ced.includes(busq))
            && (!est  || getEstado(r).toLowerCase()===est)
            && (!ben  || r.PermisoSolicitado===ben);
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
        .map(serverRow).join('') ||
        `<tr><td colspan="5" style="padding:32px;text-align:center;font-size:11px;color:#94a3b8;text-transform:uppercase">No hay registros que coincidan.</td></tr>`;
}

function renderRankingServidores(hist) {
    const el = document.getElementById('rankingServidoresTH');
    if(!el) return;
    const conteo = {};
    hist.forEach(r => { conteo[r.Title]=(conteo[r.Title]||0)+1; });
    const sorted = Object.entries(conteo).sort((a,b)=>b[1]-a[1]).slice(0,8);
    const maxVal = sorted[0]?.[1]||1;
    const medallas = ['🥇','🥈','🥉'];
    el.innerHTML = sorted.length===0
        ? '<p style="font-size:12px;color:#94a3b8;text-align:center;padding:16px">Sin datos en el período seleccionado.</p>'
        : sorted.map(([ced,val],i) => {
            const nom = getNombre(ced);
            const pct = Math.round(val/maxVal*100);
            const aprob = hist.filter(r=>r.Title===ced && getEstado(r).toLowerCase()==='aprobado').length;
            const rech  = hist.filter(r=>r.Title===ced && getEstado(r).toLowerCase()==='rechazado').length;
            return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #f1f5f9">
                <span style="font-size:18px;width:24px;text-align:center">${medallas[i]||`<span style='font-size:12px;color:#94a3b8;font-weight:700'>#${i+1}</span>`}</span>
                ${avatarDiv(nom,32,'#6366f1')}
                <div style="flex:1;min-width:0">
                    <div style="display:flex;justify-content:space-between;margin-bottom:3px">
                        <span style="font-size:12px;font-weight:700;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${nom}</span>
                        <span style="font-size:11px;font-weight:700;color:#6366f1;flex-shrink:0;margin-left:8px">${val} sol.</span>
                    </div>
                    <div style="background:#f1f5f9;border-radius:9999px;height:6px;overflow:hidden;margin-bottom:3px">
                        <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,#6366f1,#8b5cf6);border-radius:9999px"></div>
                    </div>
                    <div style="display:flex;gap:8px">
                        <span style="font-size:10px;color:#15803d;font-weight:600">✔ ${aprob} aprobados</span>
                        <span style="font-size:10px;color:#b91c1c;font-weight:600">✘ ${rech} rechazados</span>
                    </div>
                </div>
            </div>`;
        }).join('');
}

// ==========================================
// EXPONER FILTROS GLOBALMENTE
// ==========================================
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
    rolUsuarioActivo="EMPLEADO"; usadoEstaSemana=false; totalAnualUsado=0;
    txtCedulaIngreso.value="";
    mostrarEl(tabTiquetera); mostrarEl(tabAdministrativos); ocultarEl(tabEquipo); ocultarEl(tabAnaliticaTH);
    tabTiquetera.className=TAB_ACTIVO; tabAdministrativos.className=TAB_INACTIVO;
    ocultarEl(headerUsuario); ocultarEl(seccionContenidoPortal); ocultarEl(seccionDashboardEquipo); ocultarEl(seccionAnaliticaTH);
    mostrarEl(gridBeneficios); mostrarEl(seccionLogin);
}

function setupFormValidation() {
    const laf=document.getElementById('lblAlertaFecha');
    attSoportes.addEventListener('change', e=>{ if(e.target.files.length>0) document.getElementById('lblFileStatus').innerText=`✅ ${e.target.files[0].name}`; validar(); });
    [dtFechaInicio,txtJustificacion].forEach(el=>el.addEventListener('input',validar));
    document.getElementById('inputHoraCita')?.addEventListener('input', validar);
    function validar() {
        if(!beneficioSeleccionado) return;
        const jv=txtJustificacion.value.trim().length>0;
        let fv=false;
        if(dtFechaInicio.value) {
            const hoy=new Date(); hoy.setHours(0,0,0,0);
            fv=true;
            Math.ceil((new Date(dtFechaInicio.value+'T00:00:00')-hoy)/86400000)<beneficioSeleccionado.diasAntelacion ? mostrarEl(laf) : ocultarEl(laf);
        }
        const horaVal = esCitaMedica(beneficioSeleccionado)
            ? (document.getElementById('inputHoraCita')?.value?.trim().length > 0)
            : true;
        btnEnviarSolicitud.disabled=!(jv&&fv&&horaVal&&(!beneficioSeleccionado.requiereAdjunto||attSoportes.files.length>0));
    }
}
