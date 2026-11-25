/* ========= Datos simulados (siguen el modelo KISS: negocios, usuarios, clientes, campanas, tarjetas, movimientos) ========= */
const iso = d => { const z = new Date(d.getTime() - d.getTimezoneOffset()*60000); return z.toISOString().slice(0,10); };
const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const C = (id, nombre, tel, ultima, visitas, cards, nuevo=false, bonos={}) => ({id, nombre, tel, ultima, visitas, cards, nuevo, bonos:{ig:false, fotos:0, ...bonos}, compraHoy: ultima === 0});

/* Campaña SPINTA: 1 punto por compra al día, 8 puntos = café gratis. Puntos extra: +1 seguir en Instagram (una vez), +2 por foto etiquetando a @spintacafe. */
const SPINTA = {ig:'spintacafe', igUrl:'https://www.instagram.com/spintacafe/', registro:'https://docs.google.com/forms/d/e/1FAIpQLSclrjHkpHVACErEe6dL4P0wNfwBS5CH3YSIS2PRHRIk9HVA2A/viewform', tienda:'https://spintacafe.myshopify.com'};
const BONOS = {ig:{pts:1, label:'Nos sigue en Instagram', sub:'+1 punto, una sola vez'}, foto:{pts:2, label:'Subió foto y nos etiquetó', sub:'+2 puntos por foto con su café'}};

const DATA = {
  campaigns: [
    {id:1, titulo:'Tarjeta Spinta', descripcion:'1 punto por compra al día. Con 8 puntos te invitamos el próximo café.', meta:8, premio:'un café gratis', inicio:iso(daysAgo(21)), fin:'', activa:true, entregados:9}
  ],
  clients: [
    C(1,'Camila Rodríguez','3004567812',2,9,{1:5},false,{ig:true}),
    C(2,'Andrés Gómez','3157780921',34,6,{1:6}),
    C(3,'Valentina Ruiz','3209981245',1,12,{1:8},false,{ig:true, fotos:1}),
    C(4,'Santiago Pérez','3012245566',41,3,{1:3}),
    C(5,'Mariana López','3176654321',0,1,{1:2},true,{ig:true}),
    C(6,'Julián Herrera','3108873210',38,7,{1:7}),
    C(7,'Daniela Torres','3045512398',5,10,{1:1},false,{ig:true}),
    C(8,'Felipe Castro','3122234455',52,4,{1:4}),
    C(9,'Isabella Moreno','3189907766',1,1,{1:1},true),
    C(10,'Tomás Restrepo','3006671234',33,5,{1:5}),
    C(11,'Sara Jiménez','3193345678',3,11,{1:8},false,{ig:true, fotos:2}),
    C(12,'Mateo Vargas','3014456789',45,2,{1:2}),
    C(13,'Luisa Fernanda Ortiz','3167789012',2,15,{1:6},false,{ig:true, fotos:1}),
    C(14,'Juan Pablo Mejía','3051123344',31,5,{1:5})
  ],
  delivered: [
    {nombre:'Daniela Torres', premio:'un café gratis', camp:'Tarjeta Spinta', when:'Ayer'},
    {nombre:'Luisa Fernanda Ortiz', premio:'un café gratis', camp:'Tarjeta Spinta', when:'Hace 3 días'},
    {nombre:'Sara Jiménez', premio:'un café gratis', camp:'Tarjeta Spinta', when:'Domingo, ciclovía'}
  ],
  activity: [
    {t:'Camila Rodríguez sumó un punto', w:'Hace 2 días'},
    {t:'Mariana López se unió a Tarjeta Spinta', w:'Hoy, 7:42 a. m.'},
    {t:'Luisa Fernanda Ortiz subió foto con @spintacafe (+2)', w:'Hace 2 días'},
    {t:'Valentina Ruiz completó su tarjeta', w:'Ayer'},
    {t:'Daniela Torres recibió un café gratis', w:'Ayer'}
  ],
  week: {nuevos:14, volvieron:31, recompensas:4},
  todayVisits: 18
};
const EMPTY = {campaigns:[], clients:[], delivered:[], activity:[], week:{nuevos:0, volvieron:0, recompensas:0}, todayVisits:0};

const CAMILA_HIST = [
  {t:'Sumaste un punto', c:'Tarjeta Spinta', w:'Hace 2 días, 7:14 a. m.'},
  {t:'Sumaste un punto', c:'Tarjeta Spinta', w:'Domingo, stand ciclovía'},
  {t:'+1 punto por seguir a @spintacafe', c:'Tarjeta Spinta', w:'Hace 9 días'},
  {t:'Sumaste un punto', c:'Tarjeta Spinta', w:'Hace 9 días, 8:30 a. m.'},
  {t:'Te uniste a Tarjeta Spinta', c:'Tarjeta Spinta', w:'Hace 3 semanas'}
];

const OTHER_BIZ = [];

/* ========= Estado ========= */
const S = {
  role:'owner', view:'home', empty:false,
  bizName:'Spinta Café', brand:'#DD4C28', logo:'/marcas/spinta/logo-blanco.png',
  sello:'/marcas/spinta/logo-blanco.png', eslogan:'Café y movimiento', bienvenida:'Premiamos que elijas buen café en tus días 🔥☕',
  filter:'todos', search:'', rewardTab:'pend', period:'semana',
  campId:1, wz:null,
  emp:{step:'home', q:'', clientId:null, campId:null, newName:'', err:''},
  cbiz:0, ctab:'progreso', loginTab:'negocio', loginErr:{},
  logoErr:'', cardStyle:'marca', revealed:{}
};
const D = () => S.empty ? EMPTY : DATA;

/* ========= Utilidades ========= */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
const first = n => n.split(' ')[0];
const initials = n => n.split(' ').filter(Boolean).slice(0,2).map(w => w[0]).join('').toUpperCase();
const fmtTel = t => t.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
const fmtDays = d => d === 0 ? 'Hoy' : d === 1 ? 'Ayer' : `Hace ${d} días`;
const fmtDate = s => s ? new Date(s + 'T12:00:00').toLocaleDateString('es-CO', {day:'numeric', month:'short'}) : '';
const plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;
const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'; };
const camp = id => D().campaigns.find(c => c.id == id) || DATA.campaigns.find(c => c.id == id);
const activeCamps = () => D().campaigns.filter(c => c.activa);
const mainCamp = () => activeCamps()[0];

function lum(hex){
  const n = hex.replace('#','');
  const [r,g,b] = [0,2,4].map(i => parseInt(n.substr(i,2),16)/255).map(v => v <= .03928 ? v/12.92 : Math.pow((v+.055)/1.055, 2.4));
  return .2126*r + .7152*g + .0722*b;
}
const contrastWhite = hex => 1.05 / (lum(hex) + .05);
const onBrand = hex => contrastWhite(hex) >= 3 ? '#FFFFFF' : '#14161B';
const bv = hex => `--brand:${hex};--on-brand:${onBrand(hex)};`;

const ICONS = {
  home:'M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.6 14.8c1.6.8 2.5 2.6 2.9 5.2"/>',
  ticket:'M4 6.5h16v3.5a2 2 0 0 0 0 4v3.5H4V14a2 2 0 0 0 0-4zM14 7v10',
  gift:'<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v8h14v-8M12 8v12M12 8c-1-3-3.5-4.5-5-3.2C5.6 6 7.5 8 12 8zm0 0c1-3 3.5-4.5 5-3.2C18.4 6 16.5 8 12 8z"/>',
  chart:'M4 20V11M10 20V5M16 20v-6M3 20h18',
  palette:'<circle cx="12" cy="12" r="8.5"/><circle cx="8.2" cy="10" r="1.2"/><circle cx="12" cy="7.4" r="1.2"/><circle cx="15.8" cy="10" r="1.2"/><path d="M12 20.5c-1.5 0-2-1.2-1.3-2.3.9-1.4.2-2.7 1.8-2.7H15"/>',
  plus:'M12 5v14M5 12h14',
  scan:'<path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16M4 12h16"/>',
  phone:'<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  search:'<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  check:'M5 12.5l4.5 4.5L19 7.5',
  x:'M6 6l12 12M18 6 6 18',
  chev:'M9 6l6 6-6 6',
  back:'M15 6l-6 6 6 6',
  more:'<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
  chat:'M4.5 19.5l1.2-3.6A8 8 0 1 1 8.3 18.4z',
  wallet:'<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18M15.5 14.5h2.5"/>',
  qr:'<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 19h2M19 14h1"/>',
  clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  logout:'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l4-4-4-4M14 12H4',
  upload:'M12 15.5V4M7.5 8.5 12 4l4.5 4.5M4 15.5V19a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3.5',
  alert:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v5.5M12 16.5h.01"/>',
  download:'M12 4v11.5M7.5 11 12 15.5l4.5-4.5M4 20h16',
  calendar:'<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  heart:'M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z',
  edit:'M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16zM13.5 6.5l4 4',
  pause:'M8 5v14M16 5v14',
  play:'M7 5l12 7-12 7z',
  minus:'M5 12h14',
  'refresh-hint':'M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4',
  store:'M4 9.5 5.5 4h13L20 9.5M4 9.5V20h16V9.5M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0M10 20v-5h4v5'
};
function icon(n, s=22, sw=1.9){
  const v = ICONS[n] || '';
  const inner = v.startsWith('<') ? v : `<path d="${v}"/>`;
  return `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

function logoMark(size, name=S.bizName, logo=S.logo){
  return `<span class="logo" style="width:${size}px;height:${size}px;font-size:${Math.round(size*.42)}px">${logo ? `<img src="${logo}" alt="">` : esc(initials(name).slice(0,1))}</span>`;
}

function qrSvg(seed='x', size=200){
  let h = 0; for (const ch of String(seed)) h = (h*31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => (h = (h*1664525 + 1013904223) >>> 0) / 4294967296;
  const N = 29; let r = '';
  const inFinder = (x,y) => (x<8&&y<8)||(x>N-9&&y<8)||(x<8&&y>N-9);
  for (let y=0;y<N;y++) for (let x=0;x<N;x++) if (!inFinder(x,y) && rnd() > .52) r += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
  const f = (x,y) => `<rect x="${x}" y="${y}" width="7" height="7"/><rect x="${x+1}" y="${y+1}" width="5" height="5" fill="#fff"/><rect x="${x+2}" y="${y+2}" width="3" height="3"/>`;
  return `<svg width="${size}" height="${size}" viewBox="-2 -2 33 33" role="img" aria-label="Código QR" xmlns="http://www.w3.org/2000/svg"><rect x="-2" y="-2" width="33" height="33" fill="#fff" rx="2"/><g fill="#14161B">${r}${f(0,0)}${f(N-7,0)}${f(0,N-7)}</g></svg>`;
}


function hexToHsl(hex){
  const r = parseInt(hex.substr(1,2),16)/255, g = parseInt(hex.substr(3,2),16)/255, b = parseInt(hex.substr(5,2),16)/255;
  const mx = Math.max(r,g,b), mn = Math.min(r,g,b); let h = 0, s = 0; const l = (mx+mn)/2;
  if (mx !== mn) { const d = mx-mn; s = l > .5 ? d/(2-mx-mn) : d/(mx+mn); h = (mx===r ? (g-b)/d + (g<b?6:0) : mx===g ? (b-r)/d + 2 : (r-g)/d + 4) * 60; }
  return [Math.round(h), Math.round(s*100), Math.round(l*100)];
}
const PRESETS = {amanecer:['#FF9A8B','#FFC3A0','#FECF6A','#A1E3FF'], aurora:['#7DF2C9','#A99CFF','#7FCBFF','#DCCBFF']};
const STYLE_NAMES = {marca:'Degradado de tu marca', amanecer:'Amanecer', aurora:'Aurora', solido:'Color sólido'};
function meshColors(style, brand){
  if (PRESETS[style]) return PRESETS[style];
  const [h,s] = hexToHsl(brand), sat = Math.max(55, Math.min(s, 88));
  return [`hsl(${h} ${sat}% 80%)`, `hsl(${(h+40)%360} ${sat}% 84%)`, `hsl(${(h+320)%360} ${sat}% 86%)`, `hsl(${(h+190)%360} 70% 88%)`];
}
function meshBg(style, brand){
  const [a,b,c,d] = meshColors(style, brand);
  return `radial-gradient(at 8% 6%, ${a} 0, transparent 58%),radial-gradient(at 92% 16%, ${b} 0, transparent 55%),radial-gradient(at 12% 96%, ${c} 0, transparent 60%),radial-gradient(at 94% 92%, ${d} 0, transparent 58%),#FFFFFF`;
}
const gradAttr = (style, brand) => style === 'solido' ? '' : `--mesh:${meshBg(style, brand)};`;

function stamps(n, total, popIndex=-1){
  const cols = total <= 5 ? total : Math.ceil(total/2);
  let o = `<div class="stamps" style="grid-template-columns:repeat(${cols},1fr)" role="img" aria-label="${n} de ${total} puntos">`;
  for (let i=0;i<total;i++){
    const rot = ((i*37) % 13) - 6;
    o += i < n ? `<span class="st on${i===popIndex?' pop':''}" style="--rot:${rot}deg">${S.sello ? `<img class="st-img" src="${esc(S.sello)}" alt="">` : icon('check',24,3)}</span>` : `<span class="st"></span>`;
  }
  return o + '</div>';
}

function remainingText(n, meta, premio){
  const left = Math.max(meta - n, 0);
  if (left === 0) return `¡Completaste tu tarjeta! Ya puedes reclamar ${premio}.`;
  return `Te ${left === 1 ? 'falta 1 punto' : `faltan ${left} puntos`} para obtener ${premio}.`;
}

function pcard({cap:c='', titulo, n, meta, premio, foot='', compact=false, pop=-1, style=S.cardStyle, brand=S.brand}){
  const g = style !== 'solido';
  return `<div class="pcard${compact?' compact':''}${g?' grad':''}${n>=meta?' full':''}" style="${gradAttr(style, brand)}">
    ${c ? `<div class="cap">${esc(c)}</div>` : ''}
    <div class="ttl">${esc(titulo)}</div>
    ${stamps(n, meta, pop)}
    <div class="perf"></div>
    <div class="count">${n} de ${meta} puntos</div>
    <p class="hint">${esc(remainingText(n, meta, premio))}</p>
    ${foot}
  </div>`;
}

function pendingRewards(){
  const out = [];
  D().clients.forEach(c => Object.entries(c.cards).forEach(([cid, n]) => {
    const k = D().campaigns.find(x => x.id == cid);
    if (k && n >= k.meta) out.push({c, k, key:`${c.id}-${cid}`});
  }));
  return out;
}
const atRisk = () => D().clients.filter(c => c.ultima > 30);
const waLink = (c, msg) => `https://wa.me/57${c.tel}?text=${encodeURIComponent(msg)}`;
const recoverMsg = c => {
  const k = mainCamp(); const n = k ? (c.cards[k.id] || 0) : 0;
  return `Hola ${first(c.nombre)}, te extrañamos en ${S.bizName}. ` + (k ? `Llevas ${n} de ${k.meta} puntos en tu ${k.titulo}. ¡Pasa por tu café y suma el siguiente! ☕🔥` : '¡Esperamos verte pronto!');
};

/* ========= Capas: hoja inferior, confirmación, aviso ========= */
const layer = () => $('#layer');
function sheet(html, brand=S.brand){
  layer().innerHTML = `<div class="scrim bs" style="${bv(brand)}" data-act="scrim"><div class="sheet" role="dialog" aria-modal="true"><div class="handle"></div><div class="sheet-x"><button class="iconbtn" data-act="close" aria-label="Cerrar">${icon('x')}</button></div>${html}</div></div>`;
  const f = layer().querySelector('.sheet button, .sheet a, .sheet input'); f && f.focus();
}
function success({title, text='', extra='', actions='', brand=S.brand}){
  layer().innerHTML = `<div class="succ bs" style="${bv(brand)}" role="dialog" aria-modal="true" aria-live="polite"><div class="succ-in">
    <div class="checkc"><svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
    <h1>${title}</h1>${text ? `<p>${text}</p>` : ''}${extra}<div class="succ-actions">${actions}</div></div></div>`;
}
function closeLayer(){ layer().innerHTML = ''; }
let toastT;
function toast(msg){
  $('#toastbox').innerHTML = `<div class="toast" role="status">${icon('check',20,2.4)}${esc(msg)}</div>`;
  clearTimeout(toastT); toastT = setTimeout(() => $('#toastbox').innerHTML = '', 2600);
}
function downloadQR(name){
  const blob = new Blob([qrSvg(name, 600)], {type:'image/svg+xml'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `qr-${name.toLowerCase().normalize('NFD').replace(/[^\w]+/g,'-')}.svg`; a.click();
  toast('QR descargado');
}

/* ========= Barra de demostración ========= */
function demoBar(){
  const r = [['owner','Dueño'],['employee','Empleado'],['client','Cliente'],['login','Login']];
  return `<div class="demo" role="toolbar" aria-label="Vista de demostración">
    <span class="tag">Ver como</span>
    <div class="seg">${r.map(([k,l]) => `<button class="${S.role===k?'on':''}" data-act="role" data-v="${k}">${l}</button>`).join('')}</div>
    <button class="tog${S.empty?' on':''}" data-act="empty" aria-pressed="${S.empty}"><span class="sw"></span>Estados vacíos</button>
  </div>`;
}

/* ========= Dueño: estructura ========= */
const NAV = [['home','Inicio','home'],['clientes','Clientes','users'],['campanas','Campañas','ticket'],['recompensas','Recompensas','gift'],['metricas','Métricas','chart'],['personalizar','Personalización','palette']];
function ownerShell(){
  const cur = ['campana','crear'].includes(S.view) ? 'campanas' : S.view;
  const hideNav = S.view === 'crear';
  return `<div class="owner">
    <aside class="side">
      <div class="side-biz">${logoMark(40)}<div><b>${esc(S.bizName)}</b><span class="muted small">Plan Básico</span></div></div>
      <button class="btn btn-primary btn-block" data-act="go" data-v="registrar">${icon('plus')}Registrar visita</button>
      <nav class="side-nav" aria-label="Menú">${NAV.map(n => `<button class="${cur===n[0]?'on':''}" data-act="go" data-v="${n[0]}">${icon(n[2])}${n[1]}</button>`).join('')}</nav>
      <div class="side-foot"><span class="av sm">SP</span><div><b>Equipo Spinta</b><span class="muted small">Administrador</span></div><button class="iconbtn" data-act="role" data-v="login" aria-label="Cerrar sesión">${icon('logout',20)}</button></div>
    </aside>
    <main class="main" id="main">${ownerView()}</main>
    ${hideNav ? '' : `<nav class="bnav" aria-label="Menú">
      ${[['home','Inicio','home'],['clientes','Clientes','users']].map(n => `<button class="${cur===n[0]?'on':''}" data-act="go" data-v="${n[0]}">${icon(n[2],24)}${n[1]}</button>`).join('')}
      <button class="fab" data-act="go" data-v="registrar"><span class="fabc">${icon('plus',28,2.4)}</span>Visita</button>
      <button class="${cur==='campanas'?'on':''}" data-act="go" data-v="campanas">${icon('ticket',24)}Campañas</button>
      <button class="${['recompensas','metricas','personalizar'].includes(cur)?'on':''}" data-act="more">${icon('more',24)}Más</button>
    </nav>`}
  </div>`;
}
function ownerView(){
  switch(S.view){
    case 'clientes': return vClientes();
    case 'campanas': return vCampanas();
    case 'campana': return vCampana();
    case 'crear': return vCrear();
    case 'recompensas': return vRecompensas();
    case 'metricas': return vMetricas();
    case 'personalizar': return vPersonalizar();
    case 'registrar': return `<button class="back" data-act="go" data-v="home">${icon('back',20)}Inicio</button><div style="max-width:520px">${empFlow(true)}</div>`;
    default: return vHome();
  }
}
const mobileTop = () => `<div class="mtop"><div class="bizline">${logoMark(36)}${esc(S.bizName)}</div><button class="av sm" data-act="go" data-v="personalizar" aria-label="Perfil">SP</button></div>`;
const phead = (t, sub='', right='', back='') => `${back}<div class="phead"><div><h1>${t}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${right}</div>`;

/* ========= Inicio ========= */
function vHome(){
  const d = D(), k = mainCamp(), risk = atRisk(), pend = pendingRewards();
  if (!d.campaigns.length) return mobileTop() + `
    <h1>Hola, equipo Spinta</h1><p class="ink2 mt8">Vamos a preparar tu negocio para que tus clientes vuelvan. Son tres pasos.</p>
    <div class="steps mt24" style="max-width:560px">
      <button class="stp" data-act="newCamp"><span class="n">1</span><span class="grow"><b>Crea tu primera campaña</b><br><span class="muted small">Elige cuántas visitas y qué premio das</span></span>${icon('chev',20)}</button>
      <div class="stp"><span class="n">2</span><span><b>Imprime tu QR</b><br><span class="muted small">Ponlo en el mostrador para que tus clientes se unan</span></span></div>
      <div class="stp"><span class="n">3</span><span><b>Registra la primera visita</b><br><span class="muted small">Escanea el código del cliente cuando compre</span></span></div>
    </div>
    <button class="btn btn-primary btn-lg btn-block mt24" style="max-width:560px" data-act="newCamp">${icon('plus')}Crear campaña</button>`;

  const tiles = [
    ['nuevos', d.week.nuevos, 'clientes nuevos', ''],
    ['volvieron', d.week.volvieron, 'clientes que volvieron', ''],
    ['riesgo', risk.length, 'clientes en riesgo', 'warn'],
    ['recompensas', d.week.recompensas, 'recompensas entregadas', '']
  ];
  const sample = k ? Math.max(k.meta - 3, 0) : 0;
  const inscritos = k ? d.clients.filter(c => c.cards[k.id] !== undefined).length : 0;

  const recover = risk.length ? `<section class="recover">
      <h2>Clientes que podrías recuperar</h2>
      <p class="big mt12">${plural(risk.length,'cliente lleva','clientes llevan')} más de 30 días sin visitarte.</p>
      <div class="row-between mt16"><div class="avstack">${risk.slice(0,5).map(c => `<span class="av">${initials(c.nombre)}</span>`).join('')}</div><button class="link" data-act="recover">Ver quiénes son${icon('chev',18)}</button></div>
      <button class="btn btn-primary btn-lg btn-block mt20" data-act="newCamp" data-v="recuperar">Crear campaña</button>
      <p class="muted small mt12" style="text-align:center">Te ayudamos a armar una oferta y el mensaje para WhatsApp.</p>
    </section>` : d.clients.length ? `<section class="recover"><h2>Clientes que podrías recuperar</h2><p class="ink2 mt8">Nadie lleva más de 30 días sin venir. Tus clientes están volviendo.</p></section>`
    : `<section class="recover"><h2>Recibe a tus primeros clientes</h2><p class="ink2 mt8">Imprime tu QR y ponlo junto a la caja. Cuando un cliente lo escanee, aparecerá aquí.</p><button class="btn btn-primary btn-block mt16" data-act="dlqr" data-v="${k ? esc(k.titulo) : 'negocio'}">${icon('download')}Descargar mi QR</button></section>`;

  return mobileTop() + `
    <h1>${greet()}, equipo Spinta</h1>
    <h2 class="mt24" style="margin-bottom:12px">Esta semana</h2>
    <div class="stats">${tiles.map(([v,n,l,cls]) => `<button class="tile ${cls}" data-act="tile" data-v="${v}"><span class="num">${n}</span><span class="lbl">${l}</span></button>`).join('')}</div>
    <div class="home-grid">
      <div class="stack-y gap16">
        ${recover}
        ${k ? `<section class="card">
          <div class="row-between"><h2>Tu programa</h2><button class="link" data-act="openCamp" data-v="${k.id}">Ver detalle</button></div>
          <p class="muted small mt4">Así ven tus clientes su tarjeta</p>
          <div class="mt12" style="--hole:var(--surface)">${pcard({titulo:k.titulo, n:sample, meta:k.meta, premio:k.premio, compact:true})}</div>
          <p class="ink2 mt12">${plural(inscritos,'cliente participa','clientes participan')} y ya entregaste ${plural(k.entregados,'premio','premios')}.</p>
          <button class="btn btn-primary btn-lg btn-block mt16" data-act="go" data-v="registrar">${icon('plus')}Registrar visita</button>
        </section>` : ''}
      </div>
      <div class="stack-y gap16">
        <section class="card">
          <div class="row-between"><h2>Premios por entregar</h2>${pend.length ? `<span class="badge brand">${pend.length}</span>` : ''}</div>
          ${pend.length ? `<div class="list mt8">${pend.slice(0,4).map(p => `<div class="lrow"><span class="av">${initials(p.c.nombre)}</span><div class="grow"><b>${esc(p.c.nombre)}</b><span class="sub">${esc(cap(p.k.premio))}</span></div><button class="btn btn-ghost btn-sm" data-act="deliver" data-v="${p.key}">Entregar</button></div>`).join('')}</div>`
            : `<p class="ink2 mt8">Cuando un cliente complete su tarjeta, lo verás aquí para entregarle su premio.</p>`}
        </section>
        <section class="card">
          <h2>Lo último</h2>
          ${d.activity.length ? `<div class="list mt8">${d.activity.slice(0,5).map(a => `<div class="lrow" style="min-height:56px"><span class="iconbtn" style="background:var(--brand-soft);color:var(--brand-deep)">${icon('heart',18)}</span><div class="grow"><span style="font-weight:500">${esc(a.t)}</span><span class="sub" style="display:block">${esc(a.w)}</span></div></div>`).join('')}</div>`
            : `<p class="ink2 mt8">Aquí verás cada visita y cada premio entregado.</p>`}
        </section>
      </div>
    </div>`;
}

/* ========= Clientes ========= */
function clientMatches(){
  const q = S.search.trim().toLowerCase(); const k = mainCamp();
  return D().clients.filter(c => {
    if (q && !c.nombre.toLowerCase().includes(q) && !c.tel.includes(q.replace(/\s/g,''))) return false;
    if (S.filter === 'nuevos') return c.nuevo;
    if (S.filter === 'frecuentes') return c.visitas >= 10;
    if (S.filter === 'riesgo') return c.ultima > 30;
    if (S.filter === 'premio') return Object.entries(c.cards).some(([cid,n]) => { const x = camp(cid); return x && n >= x.meta; });
    return true;
  }).sort((a,b) => a.ultima - b.ultima);
}
function clientList(){
  const list = clientMatches(), k = mainCamp();
  if (!list.length) return `<div class="empty"><div class="eic">${icon('search',30)}</div><h3>No encontramos clientes</h3><p>Prueba con otro nombre o número, o cambia el filtro.</p></div>`;
  return `<div class="ccards">${list.map(c => {
    const n = k ? (c.cards[k.id] || 0) : 0;
    const prize = Object.entries(c.cards).some(([cid,v]) => { const x = camp(cid); return x && v >= x.meta; });
    const badge = prize ? `<span class="badge ok">Premio listo</span>` : c.ultima > 30 ? `<span class="badge warn">En riesgo</span>` : c.nuevo ? `<span class="badge brand">Nuevo</span>` : '';
    return `<button class="ccard" data-act="openClient" data-v="${c.id}"><span class="av">${initials(c.nombre)}</span><div class="grow"><b>${esc(c.nombre)}</b>
      <div class="mini">${k ? `<span class="bar"><i style="width:${Math.min(n/k.meta,1)*100}%"></i></span>${n}/${k.meta}` : ''}<span class="muted">${fmtDays(c.ultima)}</span></div></div>${badge}</button>`;
  }).join('')}</div>`;
}
function vClientes(){
  const d = D();
  if (!d.clients.length) return mobileTop() + phead('Clientes') + `<div class="empty card"><div class="eic">${icon('users',32)}</div><h3>Aún no tienes clientes</h3><p>Cuando alguien escanee tu QR o registres su primera visita, aparecerá aquí.</p><button class="btn btn-primary mt8" data-act="go" data-v="registrar">${icon('plus')}Registrar primera visita</button></div>`;
  const cnt = {todos:d.clients.length, nuevos:d.clients.filter(c=>c.nuevo).length, frecuentes:d.clients.filter(c=>c.visitas>=10).length, riesgo:atRisk().length, premio:pendingRewards().length};
  const f = [['todos','Todos'],['riesgo','En riesgo'],['nuevos','Nuevos'],['frecuentes','Frecuentes'],['premio','Con premio']];
  return mobileTop() + phead('Clientes', `${d.clients.length} personas han visitado ${esc(S.bizName)}`) + `
    <div class="searchbox">${icon('search',20)}<input class="input" type="search" placeholder="Buscar por nombre o celular" value="${esc(S.search)}" data-in="search" aria-label="Buscar cliente"></div>
    <div class="chips mt12">${f.map(([v,l]) => `<button class="chip${S.filter===v?' on':''}" data-act="filter" data-v="${v}">${l}<span class="n">${cnt[v]}</span></button>`).join('')}</div>
    <div class="mt16" id="cl-list">${clientList()}</div>`;
}
function openClient(id){
  const c = D().clients.find(x => x.id == id); if (!c) return;
  const cards = Object.entries(c.cards).map(([cid,n]) => ({k:camp(cid), n})).filter(x => x.k);
  sheet(`<div style="display:flex;gap:14px;align-items:center"><span class="av lg">${initials(c.nombre)}</span><div><h2>${esc(c.nombre)}</h2><p class="muted">${fmtTel(c.tel)}</p></div></div>
    <div class="kv mt20"><div><b>${c.visitas}</b><span>visitas</span></div><div><b>${fmtDays(c.ultima)}</b><span>última visita</span></div><div><b>${cards.length}</b><span>${cards.length===1?'tarjeta':'tarjetas'}</span></div></div>
    <h3 class="mt20">Sus tarjetas</h3>
    <div class="list mt4">${cards.map(({k,n}) => `<div class="lrow"><div class="grow"><b>${esc(k.titulo)}</b><div class="mini"><span class="bar"><i style="width:${Math.min(n/k.meta,1)*100}%"></i></span>${n} de ${k.meta}</div></div>${n >= k.meta ? `<button class="btn btn-ghost btn-sm" data-act="deliver" data-v="${c.id}-${k.id}">Entregar premio</button>` : ''}</div>`).join('')}</div>
    <div class="stack-y gap8 mt20">
      <button class="btn btn-primary btn-lg btn-block" data-act="registerFor" data-v="${c.id}">${icon('plus')}Registrar visita</button>
      <a class="btn btn-wa btn-block" href="${waLink(c, recoverMsg(c))}" target="_blank" rel="noopener">${icon('chat')}Escribir por WhatsApp</a>
    </div>`);
}
function openRecover(){
  const risk = atRisk();
  sheet(`<h2>Clientes que podrías recuperar</h2><p class="ink2 mt8">Llevan más de 30 días sin venir. Escríbeles con un toque: el mensaje ya está listo.</p>
    <div class="list mt12">${risk.map(c => `<div class="lrow"><span class="av">${initials(c.nombre)}</span><div class="grow"><b>${esc(c.nombre)}</b><span class="sub">${fmtDays(c.ultima)}</span></div><a class="btn btn-wa btn-sm" href="${waLink(c, recoverMsg(c))}" target="_blank" rel="noopener">${icon('chat',18)}Escribir</a></div>`).join('')}</div>
    <button class="btn btn-primary btn-block mt16" data-act="newCamp" data-v="recuperar">Crear una oferta para ellos</button>`);
}

/* ========= Campañas ========= */
function vCampanas(){
  const cs = D().campaigns;
  const btn = `<button class="btn btn-primary" data-act="newCamp">${icon('plus')}Crear campaña</button>`;
  if (!cs.length) return mobileTop() + phead('Campañas') + `<div class="empty card"><div class="eic">${icon('ticket',32)}</div><h3>Crea tu primera campaña</h3><p>Una campaña es tu tarjeta de visitas: cada compra suma un sello y al completarla tu cliente gana un premio.</p>${btn}</div>`;
  const inscr = k => D().clients.filter(c => c.cards[k.id] !== undefined).length;
  return mobileTop() + phead('Campañas', 'Tus tarjetas de visitas y promociones', `<div class="hide-m">${btn}</div>`) + `
    <div class="camps">${cs.map(k => `<button class="camp${k.activa?'':' off'}" data-act="openCamp" data-v="${k.id}">
      <div class="band"><div><div class="ttl">${esc(k.titulo)}</div><div class="small" style="opacity:.85">${k.meta === 1 ? 'Premio en la próxima visita' : `${k.meta} visitas`}: ${esc(k.premio)}</div></div><span class="badge" style="background:color-mix(in srgb,currentColor 16%,transparent);color:inherit">${k.activa ? 'Activa' : 'Terminada'}</span></div>
      <div class="body"><div class="facts"><div><b>${inscr(k)}</b>participan</div><div><b>${k.entregados}</b>premios</div></div>
      <span class="muted small">${k.fin ? `Del ${fmtDate(k.inicio)} al ${fmtDate(k.fin)}` : `Desde el ${fmtDate(k.inicio)}, sin fecha de fin`}</span></div></button>`).join('')}</div>
    <button class="btn btn-primary btn-lg btn-block mt20 show-m" data-act="newCamp">${icon('plus')}Crear campaña</button>`;
}
function vCampana(){
  const k = camp(S.campId); if (!k) { S.view = 'campanas'; return vCampanas(); }
  const cl = D().clients.filter(c => c.cards[k.id] !== undefined);
  const half = cl.filter(c => c.cards[k.id] >= k.meta/2 && c.cards[k.id] < k.meta).length;
  return phead(esc(k.titulo), esc(k.descripcion), `<span class="badge ${k.activa?'ok':''}">${k.activa?'Activa':'Terminada'}</span>`, `<button class="back" data-act="go" data-v="campanas">${icon('back',20)}Campañas</button>`) + `
    <div class="home-grid" style="margin-top:0">
      <div class="stack-y gap16">
        ${pcard({cap:'Vista previa', titulo:k.titulo, n:Math.max(k.meta-3,0), meta:k.meta, premio:k.premio})}
        <section class="card"><h2>Cómo funciona</h2><p class="ink2 mt8">${k.meta === 1 ? `En su próxima visita, tu cliente recibe ${esc(k.premio)}.` : `Cada compra suma una visita. Con ${k.meta} visitas, tu cliente recibe ${esc(k.premio)}.`} ${k.fin ? `Válida del ${fmtDate(k.inicio)} al ${fmtDate(k.fin)}.` : 'No tiene fecha de fin.'}</p></section>
        <div class="stats" style="grid-template-columns:repeat(3,1fr)">
          <div class="tile"><span class="num">${cl.length}</span><span class="lbl">participan</span></div>
          <div class="tile"><span class="num">${half}</span><span class="lbl">a mitad de camino</span></div>
          <div class="tile"><span class="num">${k.entregados}</span><span class="lbl">premios entregados</span></div>
        </div>
      </div>
      <div class="stack-y gap16">
        <section class="card" style="text-align:center"><h2>Tu QR</h2><p class="ink2 mt8">Ponlo en el mostrador. Tus clientes lo escanean para unirse a esta campaña.</p><div class="mt16" style="display:flex;justify-content:center">${qrSvg(k.titulo, 190)}</div>
          <button class="btn btn-primary btn-block mt16" data-act="dlqr" data-v="${esc(k.titulo)}">${icon('download')}Descargar QR para imprimir</button></section>
        <div class="stack-y gap8">
          <button class="btn btn-outline btn-block" data-act="editCamp" data-v="${k.id}">${icon('edit',20)}Editar campaña</button>
          <button class="btn btn-ghost btn-block" data-act="toggleCamp" data-v="${k.id}">${icon(k.activa?'pause':'play',20)}${k.activa?'Terminar campaña':'Volver a activar'}</button>
        </div>
      </div>
    </div>`;
}

/* ========= Asistente para crear campaña ========= */
const OBJ = {
  fieles:{label:'Premiar a mis clientes frecuentes', sub:'Una tarjeta de visitas con premio', set:{meta:10, cuando:'siempre', avisar:'nadie'}, ph:'Ej: Tarjeta Spinta', sug:['Tarjeta Spinta','Cliente frecuente','Club del café']},
  recuperar:{label:'Recuperar clientes que no vienen', sub:'Una oferta especial para que vuelvan', set:{meta:1, cuando:'dias', avisar:'riesgo', titulo:'Te extrañamos', premio:'15% de descuento'}, ph:'Ej: Te extrañamos', sug:['Te extrañamos','Vuelve y gana','Regalo de regreso']},
  temporada:{label:'Una promoción de temporada', sub:'Halloween, Navidad, aniversario', set:{meta:5, cuando:'dias', avisar:'todos'}, ph:'Ej: Noche de brujas', sug:['Noche de brujas','Navidad dulce','Aniversario']}
};
function newWz(obj, edit){
  const w = {step:0, obj:'', titulo:'', descripcion:'', meta:10, premio:'', cuando:'siempre', inicio:iso(new Date()), fin:'', img:null, avisar:'nadie', err:'', editId:null, imgErr:''};
  if (obj && OBJ[obj]) { w.obj = obj; Object.assign(w, OBJ[obj].set); if (obj === 'recuperar') { const e = new Date(); e.setDate(e.getDate()+14); w.fin = iso(e); } w.step = 1; }
  if (edit) { Object.assign(w, {obj:'fieles', titulo:edit.titulo, descripcion:edit.descripcion, meta:edit.meta, premio:edit.premio, cuando:edit.fin?'dias':'siempre', inicio:edit.inicio, fin:edit.fin, editId:edit.id, step:1}); }
  return w;
}
const WZ_STEPS = ['obj','nombre','visitas','premio','cuando','avisar'];
function wzSteps(){ return S.wz.editId ? WZ_STEPS.slice(1,5) : WZ_STEPS; }
function wzPreview(){
  const w = S.wz;
  return pcard({cap:esc(S.bizName), titulo:w.titulo || 'Tu campaña', n:Math.min(Math.floor(w.meta*.4), w.meta-1 < 0 ? 0 : w.meta-1), meta:w.meta, premio:w.premio || 'tu premio'});
}
function vCrear(){
  const w = S.wz, steps = wzSteps(), cur = steps.indexOf(WZ_STEPS[w.step]), total = steps.length;
  const last = cur === total - 1, o = OBJ[w.obj] || OBJ.fieles;
  const nRisk = atRisk().length, nAll = D().clients.length;
  let body = '';
  switch (WZ_STEPS[w.step]){
    case 'obj': body = `<h1>¿Qué quieres lograr?</h1><p class="ink2 mt8">Elige una opción y te guiamos con el resto.</p>
      <div class="opts mt20">${Object.entries(OBJ).map(([k,v]) => `<button class="opt${w.obj===k?' on':''}" data-act="wzObj" data-v="${k}"><span class="radio">${w.obj===k?icon('check',14,3):''}</span><span class="grow"><b>${v.label}</b><span class="sub">${v.sub}</span></span></button>`).join('')}</div>`; break;
    case 'nombre': body = `<h1>¿Cómo se llama tu campaña?</h1><p class="ink2 mt8">Así la verán tus clientes en su celular.</p>
      <div class="field mt20"><label for="wz-t">Nombre</label><input id="wz-t" class="input" maxlength="40" placeholder="${o.ph}" value="${esc(w.titulo)}" data-in="wz" data-k="titulo"></div>
      <div class="chips mt12">${o.sug.map(s => `<button class="chip" data-act="wzSet" data-k="titulo" data-v="${esc(s)}">${esc(s)}</button>`).join('')}</div>
      <div class="field mt20"><label for="wz-d">Cuéntales de qué se trata <span class="muted">(opcional)</span></label><textarea id="wz-d" class="input" maxlength="120" placeholder="Ej: Por cada compra sumas una visita." data-in="wz" data-k="descripcion">${esc(w.descripcion)}</textarea></div>
      <div class="field mt20"><span class="flabel">Imagen <span class="muted">(opcional)</span></span>
        <label class="upload"><input type="file" accept="image/png,image/jpeg,image/webp" data-file="wzimg"><span class="thumb">${w.img ? `<img src="${w.img}" alt="">` : icon('upload')}</span><span><b>${w.img ? 'Cambiar imagen' : 'Agregar imagen'}</b><br><span class="muted small">PNG, JPG o WebP de máximo 1 MB</span></span></label>
        ${w.imgErr ? `<p class="err">${icon('alert',18)}${esc(w.imgErr)}</p>` : ''}</div>`; break;
    case 'visitas': body = `<h1>¿Cuántas visitas para ganar el premio?</h1><p class="ink2 mt8">Cada compra suma una visita.</p>
      <div class="stepper mt12"><button data-act="wzMeta" data-v="-1" aria-label="Menos">${icon('minus',26,2.4)}</button><span class="val" id="wz-meta">${w.meta}</span><button data-act="wzMeta" data-v="1" aria-label="Más">${icon('plus',26,2.4)}</button></div>
      <div class="chips" style="justify-content:center">${[1,5,8,10].map(n => `<button class="chip${w.meta===n?' on':''}" data-act="wzSet" data-k="meta" data-v="${n}">${n === 1 ? 'Próxima visita' : `${n} visitas`}</button>`).join('')}</div>
      <p class="ink2 mt20" style="text-align:center" id="wz-metahint">${w.meta === 1 ? 'El premio se entrega en la próxima visita. Ideal para recuperar clientes.' : `Al completar ${w.meta} visitas, tu cliente gana su premio.`}</p>`; break;
    case 'premio': body = `<h1>¿Qué vas a regalar?</h1><p class="ink2 mt8">Algo que tus clientes quieran de verdad.</p>
      <div class="field mt20"><label for="wz-p">Premio</label><input id="wz-p" class="input" maxlength="50" placeholder="Ej: un café gratis" value="${esc(w.premio)}" data-in="wz" data-k="premio"></div>
      <div class="chips mt12" style="flex-wrap:wrap">${['un café gratis','un postre gratis','15% de descuento','un 2x1 en bebidas'].map(s => `<button class="chip${w.premio===s?' on':''}" data-act="wzSet" data-k="premio" data-v="${s}">${cap(s)}</button>`).join('')}</div>`; break;
    case 'cuando': body = `<h1>¿Cuándo?</h1><p class="ink2 mt8">Puedes terminarla cuando quieras.</p>
      <div class="opts mt20">
        <button class="opt${w.cuando==='siempre'?' on':''}" data-act="wzSet" data-k="cuando" data-v="siempre"><span class="radio">${w.cuando==='siempre'?icon('check',14,3):''}</span><span class="grow"><b>Desde hoy, sin fecha de fin</b><span class="sub">Ideal para tu tarjeta de siempre</span></span></button>
        <button class="opt${w.cuando==='dias'?' on':''}" data-act="wzSet" data-k="cuando" data-v="dias"><span class="radio">${w.cuando==='dias'?icon('check',14,3):''}</span><span class="grow"><b>Solo por unos días</b><span class="sub">Para promociones y temporadas</span></span></button>
      </div>
      ${w.cuando==='dias' ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px" class="mt16"><div class="field"><label for="wz-i">Desde</label><input id="wz-i" type="date" class="input" value="${w.inicio}" data-in="wz" data-k="inicio"></div><div class="field"><label for="wz-f">Hasta</label><input id="wz-f" type="date" class="input" value="${w.fin}" data-in="wz" data-k="fin"></div></div>` : ''}`; break;
    case 'avisar': body = `<h1>¿A quién le avisamos?</h1><p class="ink2 mt8">Te dejamos el mensaje listo para enviarlo por WhatsApp.</p>
      <div class="opts mt20">${[['riesgo',`Clientes que no vienen hace 30 días`, plural(nRisk,'persona','personas')],['todos','Todos mis clientes', plural(nAll,'persona','personas')],['nadie','No avisar por ahora','Solo con el QR del mostrador']].map(([v,l,s]) => `<button class="opt${w.avisar===v?' on':''}" data-act="wzSet" data-k="avisar" data-v="${v}"><span class="radio">${w.avisar===v?icon('check',14,3):''}</span><span class="grow"><b>${l}</b><span class="sub">${s}</span></span></button>`).join('')}</div>`; break;
  }
  return `<div class="wz-top"><button class="iconbtn" data-act="wzExit" aria-label="Salir">${icon('x')}</button><div class="prog" aria-label="Paso ${cur+1} de ${total}"><i style="width:${(cur+1)/total*100}%"></i></div><span class="muted small">${cur+1} de ${total}</span></div>
    <div class="wz"><div>${body}${w.err ? `<p class="err mt12">${icon('alert',18)}${esc(w.err)}</p>` : ''}
      <div class="wz-foot">${cur > 0 ? `<button class="btn btn-ghost back" data-act="wzBack" aria-label="Atrás">${icon('back')}</button>` : ''}<button class="btn btn-primary btn-lg" data-act="wzNext">${last ? (w.editId ? 'Guardar cambios' : 'Crear campaña') : 'Continuar'}</button></div></div>
      <aside class="wz-side" style="padding-bottom:96px"><p class="prevlabel">Así la verán tus clientes</p><div id="wz-prev">${wzPreview()}</div></aside></div>`;
}
function wzNext(){
  const w = S.wz; w.err = '';
  const k = WZ_STEPS[w.step];
  if (k === 'obj' && !w.obj) w.err = 'Elige una opción para continuar.';
  if (k === 'nombre' && !w.titulo.trim()) w.err = 'Escribe un nombre para tu campaña.';
  if (k === 'premio' && !w.premio.trim()) w.err = 'Escribe qué vas a regalar.';
  if (k === 'cuando' && w.cuando === 'dias') { if (!w.fin) w.err = 'Elige hasta cuándo dura la campaña.'; else if (w.fin < w.inicio) w.err = 'La fecha de fin debe ser después de la de inicio.'; }
  if (w.err) return render();
  const steps = wzSteps(), cur = steps.indexOf(k);
  if (cur < steps.length - 1) { w.step = WZ_STEPS.indexOf(steps[cur+1]); render(); window.scrollTo(0,0); return; }
  saveCampaign();
}
function saveCampaign(){
  const w = S.wz, d = D();
  const fields = {titulo:w.titulo.trim(), descripcion:w.descripcion.trim() || (w.meta === 1 ? 'Una oferta especial para ti.' : 'Cada compra suma una visita.'), meta:w.meta, premio:w.premio.trim(), inicio:w.cuando==='dias' ? w.inicio : iso(new Date()), fin:w.cuando==='dias' ? w.fin : ''};
  if (w.editId) { Object.assign(camp(w.editId), fields); S.view = 'campana'; S.campId = w.editId; S.wz = null; render(); toast('Cambios guardados'); return; }
  const k = {id:Date.now(), ...fields, activa:true, entregados:0};
  d.campaigns.unshift(k); S.campId = k.id;
  const targets = w.avisar === 'riesgo' ? atRisk() : w.avisar === 'todos' ? d.clients : [];
  S.notify = targets.map(c => c.id); S.wz = null; S.view = 'campana'; render();
  success({title:'¡Tu campaña está lista!', text:`${esc(k.titulo)} ya está activa. Imprime el QR y ponlo en el mostrador.`,
    extra:`<div class="mt8">${qrSvg(k.titulo, 150)}</div>`,
    actions:`${targets.length ? `<button class="btn btn-primary btn-lg btn-block" data-act="notify">${icon('chat')}Avisar a ${plural(targets.length,'cliente','clientes')} por WhatsApp</button>` : ''}
      <button class="btn ${targets.length ? 'btn-outline' : 'btn-primary btn-lg'} btn-block" data-act="dlqr" data-v="${esc(k.titulo)}">${icon('download')}Descargar QR</button>
      <button class="btn btn-ghost btn-block" data-act="close">Ver mi campaña</button>`});
}
function openNotify(){
  const k = camp(S.campId), list = D().clients.filter(c => (S.notify||[]).includes(c.id));
  const msg = c => `Hola ${first(c.nombre)}, en ${S.bizName} tenemos algo para ti: ${k.titulo}. ${k.meta === 1 ? `En tu próxima visita recibes ${k.premio}.` : `Con ${k.meta} visitas recibes ${k.premio}.`} ¡Te esperamos!`;
  sheet(`<h2>Avisar por WhatsApp</h2><p class="ink2 mt8">Toca “Enviar” en cada cliente. El mensaje ya está escrito.</p>
    <div class="card mt12" style="background:var(--soft);border:0"><p class="small ink2">${esc(list[0] ? msg(list[0]) : '')}</p></div>
    <div class="list mt8">${list.map(c => `<div class="lrow"><span class="av">${initials(c.nombre)}</span><div class="grow"><b>${esc(c.nombre)}</b><span class="sub">${fmtTel(c.tel)}</span></div><a class="btn btn-wa btn-sm" href="${waLink(c, msg(c))}" target="_blank" rel="noopener">${icon('chat',18)}Enviar</a></div>`).join('')}</div>`);
}

/* ========= Recompensas ========= */
function vRecompensas(){
  const pend = pendingRewards(), done = D().delivered;
  const tabs = `<div class="tabs" style="max-width:420px"><button class="${S.rewardTab==='pend'?'on':''}" data-act="rtab" data-v="pend">Por entregar (${pend.length})</button><button class="${S.rewardTab==='done'?'on':''}" data-act="rtab" data-v="done">Entregadas</button></div>`;
  let body;
  if (S.rewardTab === 'pend') body = pend.length ? `<div class="ccards mt16">${pend.map(p => `<div class="ccard"><span class="av">${initials(p.c.nombre)}</span><div class="grow"><b>${esc(p.c.nombre)}</b><span class="mini">${esc(cap(p.k.premio))}</span><span class="muted small">${esc(p.k.titulo)}</span></div><button class="btn btn-primary btn-sm" data-act="deliver" data-v="${p.key}">Entregar</button></div>`).join('')}</div>
      <p class="muted small mt16">También puedes entregarlo al escanear el código del cliente en caja.</p>`
    : `<div class="empty card mt16"><div class="eic">${icon('gift',32)}</div><h3>No hay premios pendientes</h3><p>Cuando un cliente complete su tarjeta, aparecerá aquí para que le entregues su premio.</p></div>`;
  else body = done.length ? `<div class="card mt16"><div class="list">${done.map(r => `<div class="lrow"><span class="av">${initials(r.nombre)}</span><div class="grow"><b>${esc(r.nombre)}</b><span class="sub">${esc(cap(r.premio))}, ${esc(r.camp)}</span></div><span class="muted small">${esc(r.when)}</span></div>`).join('')}</div></div>`
    : `<div class="empty card mt16"><div class="eic">${icon('gift',32)}</div><h3>Todavía no has entregado premios</h3><p>Aquí verás el historial de cada premio que entregues.</p></div>`;
  return mobileTop() + phead('Recompensas', 'Premios ganados por tus clientes') + tabs + body;
}
function askDeliver(key){
  const [cid, kid] = key.split('-'); const c = D().clients.find(x => x.id == cid), k = camp(kid);
  sheet(`<div style="text-align:center"><div class="empty" style="padding:8px 0 0"><div class="eic">${icon('gift',32)}</div></div>
    <h2>¿Entregar ${esc(k.premio)} a ${esc(first(c.nombre))}?</h2><p class="ink2 mt8">Su tarjeta de ${esc(k.titulo)} vuelve a empezar en cero.</p></div>
    <div class="stack-y gap8 mt20"><button class="btn btn-primary btn-lg btn-block" data-act="doDeliver" data-v="${key}">Sí, entregar premio</button><button class="btn btn-ghost btn-block" data-act="close">Cancelar</button></div>`);
}
function doDeliver(key, quiet){
  const [cid, kid] = key.split('-'); const d = D(); const c = d.clients.find(x => x.id == cid), k = camp(kid);
  c.cards[kid] = 0; k.entregados++; d.week.recompensas++;
  d.delivered.unshift({nombre:c.nombre, premio:k.premio, camp:k.titulo, when:'Ahora'});
  d.activity.unshift({t:`${c.nombre} recibió ${k.premio}`, w:'Ahora'});
  if (c.id === 1) CAMILA_HIST.unshift({t:`Recibiste ${k.premio}`, c:k.titulo, w:'Ahora'});
  if (!quiet) { closeLayer(); render(); toast('Premio entregado'); }
}

/* ========= Métricas ========= */
function vMetricas(){
  const d = D();
  if (!d.clients.length) return mobileTop() + phead('Métricas') + `<div class="empty card"><div class="eic">${icon('chart',32)}</div><h3>Tus números aparecerán pronto</h3><p>Después de tus primeras visitas registradas verás aquí cuántos clientes vuelven y qué campañas funcionan mejor.</p></div>`;
  const m = S.period === 'semana' ? {visitas:156, regreso:62, nuevos:12, bars:[31,38,35,44,40,52,47,56], labels:['L','M','M','J','V','S','D','Hoy']} : {visitas:612, regreso:58, nuevos:41, bars:[118,131,140,156,149,162,170,156], labels:['jun','jul','ago','sep','S1','S2','S3','S4']};
  const max = Math.max(...m.bars);
  const top = [...d.clients].sort((a,b) => b.visitas - a.visitas).slice(0,3);
  return mobileTop() + phead('Métricas', 'Cómo va tu negocio, en palabras simples') + `
    <div class="chips"><button class="chip${S.period==='semana'?' on':''}" data-act="period" data-v="semana">Esta semana</button><button class="chip${S.period==='mes'?' on':''}" data-act="period" data-v="mes">Últimos meses</button></div>
    <div class="mgrid mt16">
      <div class="stack-y gap16">
        <section class="card"><p class="say">${Math.round(m.regreso/10)} de cada 10 clientes volvieron al menos una vez.</p><p class="ink2 mt8">Registraste ${m.visitas} visitas y llegaron ${m.nuevos} clientes nuevos.</p></section>
        <section class="card"><h2>Visitas</h2><div class="bars mt12" role="img" aria-label="Visitas por periodo">${m.bars.map((v,i) => `<div class="b${i===m.bars.length-1?' last':''}"><em>${v}</em><i style="height:${v/max*100}%"></i><span>${m.labels[i]}</span></div>`).join('')}</div>
          <p class="ink2 mt12">Tu mejor día es el sábado. Es buen momento para una promoción.</p></section>
      </div>
      <div class="stack-y gap16">
        <section class="card"><h2>Campañas</h2><div class="list mt4">${d.campaigns.map(k => `<div class="lrow"><div class="grow"><b>${esc(k.titulo)}</b><div class="mini"><span class="bar" style="max-width:none"><i style="width:${Math.min(k.entregados/25,1)*100}%"></i></span>${plural(k.entregados,'premio','premios')}</div></div></div>`).join('')}</div></section>
        <section class="card"><h2>Tus clientes más fieles</h2><div class="list mt4">${top.map(c => `<button class="lrow" data-act="openClient" data-v="${c.id}"><span class="av">${initials(c.nombre)}</span><div class="grow"><b>${esc(c.nombre)}</b><span class="sub">${c.visitas} visitas</span></div>${icon('chev',18)}</button>`).join('')}</div></section>
      </div>
    </div>`;
}

/* ========= Personalización ========= */
const SWATCHES = ['#DD4C28','#0E7C66','#2F6FED','#7C3AED','#C2185B','#E4572E','#D99A00','#1F2937'];
function contrastNote(hex){ return contrastWhite(hex) < 3 ? `<div class="note" id="cnote">${icon('alert',20)}<span>Este color es claro, así que usaremos texto oscuro encima para que se lea bien.</span></div>` : `<div id="cnote"></div>`; }
function vPersonalizar(){
  const k = mainCamp() || {titulo:'Tu tarjeta', meta:10, premio:'un café gratis'};
  return mobileTop() + phead('Personalización', 'Haz que tus clientes reconozcan tu marca') + `
  <div class="pgrid">
    <div class="stack-y gap20">
      <section class="card stack-y gap16"><div class="field"><label for="p-n">Nombre del negocio</label><input id="p-n" class="input" maxlength="40" value="${esc(S.bizName)}" data-in="bizName"></div></section>
      <section class="card stack-y gap12"><h2>Logo</h2>
        <label class="upload"><input type="file" accept="image/png,image/jpeg,image/webp" data-file="logo"><span class="thumb">${S.logo ? `<img src="${S.logo}" alt="">` : icon('upload')}</span><span class="grow"><b>${S.logo ? 'Cambiar logo' : 'Subir logo'}</b><br><span class="muted small">PNG, JPG o WebP de máximo 1 MB. Lo optimizamos automáticamente.</span></span></label>
        ${S.logoErr ? `<p class="err">${icon('alert',18)}${esc(S.logoErr)}</p>` : ''}
        ${S.logo ? `<button class="link" data-act="rmLogo">Quitar logo</button>` : ''}
      </section>
      <section class="card stack-y gap12"><h2>Color principal</h2><p class="ink2">Se usa en botones, tarjetas y en todo lo que ven tus clientes.</p>
        <div class="swatches">${SWATCHES.map(c => `<button class="swatch${S.brand.toLowerCase()===c.toLowerCase()?' on':''}" style="--c:${c};color:${onBrand(c)}" data-act="swatch" data-v="${c}" aria-label="Color ${c}">${S.brand.toLowerCase()===c.toLowerCase()?icon('check',22,3):''}</button>`).join('')}
          <label class="swatch custom${SWATCHES.map(s=>s.toLowerCase()).includes(S.brand.toLowerCase())?'':' on'}" aria-label="Elegir otro color"><input type="color" value="${S.brand}" data-color="1"></label></div>
        ${contrastNote(S.brand)}
      </section>
      <section class="card stack-y gap12"><h2>Estilo de la tarjeta</h2><p class="ink2">Cómo ven tus clientes su tarjeta y sus cupones.</p>
        <div class="styles">${Object.entries(STYLE_NAMES).map(([k,l]) => `<button class="stylebtn${S.cardStyle===k?' on':''}" data-act="cardStyle" data-v="${k}"><div class="sw2" style="background:${k==='solido' ? S.brand : meshBg(k, S.brand)}"></div>${l}</button>`).join('')}</div></section>
      <button class="btn btn-primary btn-lg btn-block" data-act="saveBrand">Guardar cambios</button>
    </div>
    <div class="sticky"><p class="prevlabel">Vista previa en el celular de tu cliente</p>
      <div class="minip" id="pprev"><div class="bizline" style="margin-bottom:14px">${logoMark(36)}<span>${esc(S.bizName)}</span></div>
        <p style="font-family:var(--display);font-weight:700;font-size:20px;margin-bottom:12px">Hola, Camila</p>
        ${pcard({titulo:k.titulo, n:4, meta:k.meta, premio:k.premio, compact:true})}
        <button class="btn btn-primary btn-block mt12" tabindex="-1">Ver recompensa</button></div></div>
  </div>`;
}
function readImage(file, cb, errCb){
  if (!file) return;
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return errCb('Ese formato no sirve. Usa una imagen PNG, JPG o WebP.');
  if (file.size > 1024*1024) return errCb(`Tu imagen pesa ${(file.size/1024/1024).toFixed(1).replace('.',',')} MB y el máximo es 1 MB. Prueba con una versión más liviana.`);
  const r = new FileReader(); r.onload = () => cb(r.result); r.readAsDataURL(file);
}

/* ========= Empleado (también lo usa el dueño en "Registrar visita") ========= */
let scanT;
function empFlow(inOwner){
  const e = S.emp, d = D();
  if (e.step === 'scan') return `<h1>Escanear cliente</h1><p class="ink2 mt8">Apunta la cámara al código del celular del cliente.</p>
    <div class="viewfinder mt20"><div class="frame"><i></i><i></i><i></i><i></i></div><div class="line"></div></div>
    <p class="muted small mt12" style="text-align:center">Demostración: se leerá el código de Camila en un momento.</p>
    <button class="btn btn-ghost btn-block mt16" data-act="empGo" data-v="home">Cancelar</button>`;
  if (e.step === 'search') return `<button class="back" data-act="empGo" data-v="home">${icon('back',20)}Volver</button><h1>Buscar por celular</h1>
    <div class="field mt20"><label for="e-q">Número de celular</label><input id="e-q" class="input big" type="tel" inputmode="numeric" maxlength="12" placeholder="300 123 4567" value="${esc(e.q)}" data-in="empq" autofocus></div>
    <div id="emp-res" class="mt16">${empResults()}</div>`;
  if (e.step === 'new') return `<button class="back" data-act="empGo" data-v="search">${icon('back',20)}Volver</button><h1>Cliente nuevo</h1><p class="ink2 mt8">Celular ${fmtTel(e.q.replace(/\D/g,''))}</p>
    <div class="field mt20"><label for="e-n">Nombre</label><input id="e-n" class="input" maxlength="40" placeholder="Ej: Camila Rodríguez" value="${esc(e.newName)}" data-in="empname" autofocus></div>
    ${e.err ? `<p class="err mt8">${icon('alert',18)}${esc(e.err)}</p>` : ''}
    <button class="btn btn-primary btn-lg btn-block mt20" data-act="empCreate">Inscribir cliente</button>`;
  if (e.step === 'client') {
    const c = d.clients.find(x => x.id == e.clientId);
    const cs = activeCamps(); if (!cs.length) return `<div class="empty"><div class="eic">${icon('ticket',30)}</div><h3>No hay campañas activas</h3><p>Pide al dueño del negocio que active una campaña para poder registrar visitas.</p></div>`;
    if (!e.campId || !cs.find(k => k.id == e.campId)) e.campId = cs[0].id;
    const k = camp(e.campId), n = c.cards[k.id] || 0, full = n >= k.meta;
    return `<button class="back" data-act="empGo" data-v="home">${icon('back',20)}Volver</button>
      <div style="display:flex;gap:14px;align-items:center"><span class="av lg">${initials(c.nombre)}</span><div><h1 style="font-size:26px">${esc(c.nombre)}</h1><p class="muted">${fmtTel(c.tel)}</p></div></div>
      ${cs.length > 1 ? `<div class="chips mt16">${cs.map(x => `<button class="chip${x.id==k.id?' on':''}" data-act="empCamp" data-v="${x.id}">${esc(x.titulo)} <span class="n">${c.cards[x.id]||0}/${x.meta}</span></button>`).join('')}</div>` : ''}
      <div class="kv mt16" style="grid-template-columns:1fr 1fr"><div><span>Programa</span><b>${k.meta === 1 ? 'Próxima visita' : `${k.meta} puntos`}</b></div><div><span>Actualmente</span><b>${n}/${k.meta}</b></div></div>
      <div class="mt16">${pcard({titulo:k.titulo, n, meta:k.meta, premio:k.premio, compact:true, pop:e.pop ?? -1})}</div>
      <div class="sticky-bottom mt16">${full ? `<button class="btn btn-primary btn-lg btn-block" data-act="empDeliver">${icon('gift')}Entregar ${esc(k.premio)}</button>`
        : c.compraHoy ? `<button class="btn btn-ghost btn-lg btn-block" disabled>${icon('check',22)}Ya sumó su punto de hoy</button>`
        : `<button class="btn btn-primary btn-lg btn-block" style="min-height:68px;font-size:20px" data-act="plusOne">${icon('plus',26,2.6)}+1 punto (compra de hoy)</button>`}</div>
      ${full ? '' : `<section class="card mt16"><h3>Puntos extra</h3><p class="muted small mt4">Acelera el premio de ${esc(first(c.nombre))}</p><div class="list mt8">
        <button class="lrow" data-act="bonus" data-v="ig" ${c.bonos.ig ? 'disabled style="opacity:.5"' : ''}><span class="iconbtn" style="background:var(--brand-soft);color:var(--brand-deep)">${icon('heart',18)}</span><div class="grow"><b>${BONOS.ig.label}</b><span class="sub">${c.bonos.ig ? 'Ya recibió este punto' : `${BONOS.ig.sub} · @${SPINTA.ig}`}</span></div><span class="badge brand">+1</span></button>
        <button class="lrow" data-act="bonus" data-v="foto"><span class="iconbtn" style="background:var(--brand-soft);color:var(--brand-deep)">${icon('upload',18)}</span><div class="grow"><b>${BONOS.foto.label}</b><span class="sub">${BONOS.foto.sub}${c.bonos.fotos ? ` · lleva ${c.bonos.fotos}` : ''}</span></div><span class="badge brand">+2</span></button>
      </div></section>`}`;
  }
  return `${inOwner ? '' : ''}<h1>Registrar visita</h1><p class="ink2 mt8">Pide al cliente su código o su número de celular.</p>
    <div class="mt20 stack-y"><button class="bigtile primary" data-act="empGo" data-v="scan"><span class="ico">${icon('scan',30)}</span><span><b>Escanear cliente</b><span>Usa la cámara del celular</span></span></button>
    <div class="or">o</div>
    <button class="bigtile" data-act="empGo" data-v="search"><span class="ico">${icon('phone',28)}</span><span><b>Buscar por celular</b><span>Si no tiene el código a mano</span></span></button></div>
    <p class="muted mt24" style="text-align:center">${d.todayVisits ? `Hoy van ${d.todayVisits} puntos registrados` : 'Todavía no hay visitas hoy'}</p>`;
}
function empResults(){
  const q = S.emp.q.replace(/\D/g,'');
  if (q.length < 3) return `<p class="muted">Escribe al menos 3 números.</p>`;
  const r = D().clients.filter(c => c.tel.includes(q));
  if (r.length) return `<div class="card" style="padding:4px 14px"><div class="list">${r.slice(0,5).map(c => `<button class="lrow" data-act="empPick" data-v="${c.id}"><span class="av">${initials(c.nombre)}</span><div class="grow"><b>${esc(c.nombre)}</b><span class="sub">${fmtTel(c.tel)}</span></div>${icon('chev',20)}</button>`).join('')}</div></div>`;
  if (q.length >= 10) return `<div class="empty card"><div class="eic">${icon('users',30)}</div><h3>No encontramos ese número</h3><p>Puede ser un cliente nuevo. Inscríbelo en segundos.</p><button class="btn btn-primary" data-act="empGo" data-v="new">${icon('plus')}Inscribir cliente nuevo</button></div>`;
  return `<p class="muted">Sin coincidencias todavía. Sigue escribiendo.</p>`;
}
function employeeShell(){
  return `<div class="phone"><header class="ehead">${logoMark(40)}<div class="grow"><b>${esc(S.bizName)}</b><span class="muted small">Stand Spinta</span></div><button class="btn btn-ghost btn-sm" data-act="role" data-v="login">Salir</button></header><div class="pad">${empFlow(false)}</div></div>`;
}
function plusOne(){
  const e = S.emp, d = D(), c = d.clients.find(x => x.id == e.clientId), k = camp(e.campId);
  const n = (c.cards[k.id] || 0) + 1; c.cards[k.id] = n; c.visitas++; c.ultima = 0; c.compraHoy = true; c.nuevo = c.nuevo && c.visitas <= 2;
  d.todayVisits++; d.activity.unshift({t:`${c.nombre} sumó un punto`, w:'Ahora'});
  if (c.id === 1) CAMILA_HIST.unshift({t:'Sumaste un punto', c:k.titulo, w:'Ahora'});
  e.pop = n - 1;
  pointsSuccess(c, k, n, '¡Punto sumado!');
}
function addBonus(tipo){
  const e = S.emp, d = D(), c = d.clients.find(x => x.id == e.clientId), k = camp(e.campId), b = BONOS[tipo];
  if (!c || !k || (tipo === 'ig' && c.bonos.ig)) return;
  if (tipo === 'ig') c.bonos.ig = true; else c.bonos.fotos++;
  const prev = c.cards[k.id] || 0, n = Math.min(prev + b.pts, k.meta); c.cards[k.id] = n;
  const txt = tipo === 'ig' ? `siguió a @${SPINTA.ig}` : `subió foto con @${SPINTA.ig}`;
  d.activity.unshift({t:`${c.nombre} ${txt} (+${b.pts})`, w:'Ahora'});
  if (c.id === 1) CAMILA_HIST.unshift({t:`+${b.pts} ${b.pts === 1 ? 'punto' : 'puntos'}: ${tipo === 'ig' ? `seguir a @${SPINTA.ig}` : 'foto etiquetada'}`, c:k.titulo, w:'Ahora'});
  e.pop = n - 1;
  pointsSuccess(c, k, n, `¡+${b.pts} ${b.pts === 1 ? 'punto extra' : 'puntos extra'}!`);
}
function pointsSuccess(c, k, n, title){
  const done = n >= k.meta, left = k.meta - n;
  success({title: done ? `¡${esc(first(c.nombre))} completó su tarjeta!` : title,
    text: done ? `Entrégale ${esc(k.premio)}.` : `${esc(first(c.nombre))} lleva ${n} de ${k.meta}. ${left === 1 ? 'Le falta 1 punto' : `Le faltan ${left} puntos`} para ${esc(k.premio)}.`,
    extra: `<div style="width:100%;max-width:340px;--hole:var(--surface)" class="mt8">${pcard({titulo:k.titulo, n, meta:k.meta, premio:k.premio, compact:true, pop:n-1})}</div>`,
    actions: done ? `<button class="btn btn-primary btn-lg btn-block" data-act="empDeliver">${icon('gift')}Entregar premio ahora</button><button class="btn btn-ghost btn-block" data-act="empReset">Después</button>`
      : `<button class="btn btn-primary btn-lg btn-block" data-act="empBack">Seguir con ${esc(first(c.nombre))}</button><button class="btn btn-ghost btn-block" data-act="empReset">Atender otro cliente</button>`});
}
function empDeliver(){
  const e = S.emp, c = D().clients.find(x => x.id == e.clientId), k = camp(e.campId);
  doDeliver(`${c.id}-${k.id}`, true);
  success({title:'¡Premio entregado!', text:`${esc(first(c.nombre))} recibió ${esc(k.premio)}. Su tarjeta empieza de nuevo.`, actions:`<button class="btn btn-primary btn-lg btn-block" data-act="empReset">Registrar otra visita</button>`});
}

/* ========= Cliente ========= */
function clientData(){
  const cam = (S.empty ? null : DATA.clients.find(c => c.id === 1)) || {nombre:'Camila Rodríguez', cards:{}};
  const cs = DATA.campaigns.filter(k => k.activa);
  const k = cs[0];
  const laurel = {key:'laurel', nombre:S.bizName, color:S.brand, style:S.cardStyle, logo:S.logo,
    main: k ? {titulo:k.titulo, meta:k.meta, n:Math.min(cam.cards[k.id]||0, k.meta), premio:k.premio, descripcion:k.descripcion} : null,
    rewards: cs.filter(x => (cam.cards[x.id]||0) >= x.meta).map(x => ({premio:x.premio, c:x.titulo, code:(x.titulo.slice(0,4).toUpperCase().normalize('NFD').replace(/[^\w]/g,'X'))+'-4K7P'})),
    used: S.empty ? [] : [{premio:'un café gratis', c:'Tarjeta Spinta', w:'Hace 2 semanas'}],
    hist: S.empty ? [] : CAMILA_HIST,
    benefits: cs.map(x => ({titulo:x.titulo, meta:x.meta, n:Math.min(cam.cards[x.id]||0,x.meta), premio:x.premio, hasta:x.fin ? fmtDate(x.fin) : ''}))};
  const others = S.empty ? [] : OTHER_BIZ.map(b => ({...b, rewards:[]}));
  return {nombre: first(cam.nombre), list:[laurel, ...others]};
}
function clientShell(){
  const cd = clientData(); if (S.cbiz >= cd.list.length) S.cbiz = 0;
  const b = cd.list[S.cbiz];
  const tabs = [['progreso','Mi progreso'],['recompensas','Mis recompensas'],['historial','Historial'],['beneficios','Beneficios']];
  let body = '';
  if (S.ctab === 'progreso') {
    const back = `<div class="backcard${b.style==='solido'?' solid':''}" style="${gradAttr(b.style, b.color)}"><b style="font-family:var(--display);font-size:19px">Tu código</b><div class="qrwrap">${qrSvg('camila-' + b.key, 168)}</div><span class="small" style="opacity:.75">Muéstralo en el stand para sumar tu punto</span></div>`;
    body = b.main ? `<div class="flip" data-act="flipCard" role="button" tabindex="0" aria-label="Voltear tarjeta para ver tu código"><div class="flip-in">
        <div class="face front">${pcard({cap:'Tu progreso', titulo:b.main.titulo, n:b.main.n, meta:b.main.meta, premio:b.main.premio, style:b.style, brand:b.color,
          foot:`<div style="display:flex;gap:8px;margin-top:16px"><button class="btn btn-on btn-block" data-act="cReward">Ver recompensa</button><button class="btn btn-onghost" data-act="flipCard" aria-label="Ver mi código">${icon('qr',24)}</button></div>`})}</div>
        <div class="face face-back">${back}</div></div></div>
      <p class="fliphint">${icon('refresh-hint',16)}Toca la tarjeta para ver tu código</p>
      ${b.main.n === 0 ? `<div class="card mt12" style="display:flex;gap:12px;align-items:center">${icon('scan',24)}<p class="ink2">Aún no tienes puntos. En tu próxima compra, muestra tu código o di tu número en el stand.</p></div>` : ''}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px" class="mt12">
        <button class="btn btn-outline" data-act="flipCard">${icon('qr',20)}Mi código</button>
        <button class="btn btn-dark" data-act="wallet">${icon('wallet',20)}Guardar en Wallet</button></div>
      <section class="card mt16"><h2>Acelera tu premio 🔥</h2><p class="ink2 mt4">1 punto por compra al día. Además:</p><div class="list mt8">
        <a class="lrow" href="${SPINTA.igUrl}" target="_blank" rel="noopener"><span class="iconbtn" style="background:var(--brand-soft);color:var(--brand-deep)">${icon('heart',18)}</span><div class="grow"><b>Síguenos en Instagram</b><span class="sub">@${SPINTA.ig}</span></div><span class="badge brand">+1</span></a>
        <div class="lrow"><span class="iconbtn" style="background:var(--brand-soft);color:var(--brand-deep)">${icon('upload',18)}</span><div class="grow"><b>Sube una foto con tu café</b><span class="sub">Etiquétanos y muéstrala en el stand</span></div><span class="badge brand">+2</span></div>
      </div><p class="muted small mt8">📍 Encuéntranos los domingos en la ciclovía. Recuerda decir tu número cada vez que pidas tu bebida.</p></section>
      ${cd.list.length > 1 ? `<h2 class="mt32" style="margin-bottom:12px">Mis otras tarjetas</h2><div class="others">${cd.list.map((o,i) => i === S.cbiz ? '' : `<button class="oc bs${o.style!=='solido'?' grad':''}" style="${bv(o.color)}${gradAttr(o.style, o.color)}" data-act="cBiz" data-v="${i}"><span class="small" style="opacity:.85">${esc(o.nombre)}</span><b>${esc(o.main ? o.main.titulo : '')}</b><span class="bar"><i style="width:${o.main ? o.main.n/o.main.meta*100 : 0}%"></i></span><span class="small">${o.main ? `${o.main.n} de ${o.main.meta}` : ''}</span></button>`).join('')}</div>` : ''}`
      : `<div class="empty"><div class="eic">${icon('store',30)}</div><h3>Este negocio aún no tiene una campaña activa</h3><p>Vuelve pronto, seguro preparan algo para ti.</p></div>`;
  } else if (S.ctab === 'recompensas') {
    body = (b.rewards.length ? `<div class="stack-y gap12">${b.rewards.map(r => {
        const open = S.revealed[r.code];
        return `<div class="coupon${b.style==='solido'?' solid':''}" style="${gradAttr(b.style, b.color)}"><span class="badge ok">Listo para usar</span><h2 class="mt12">${esc(cap(r.premio))}</h2><p class="mt4" style="opacity:.75">${esc(r.c)}, ${esc(b.nombre)}</p><div class="perf"></div>
          ${open ? revealedHtml(r.code) : `<div class="slide" data-code="${esc(r.code)}"><span class="fill"></span><span class="lbl">Desliza para mostrar tu código</span><button class="thumb" data-act="slideTap" aria-label="Mostrar código del cupón">${icon('chev',24,2.6)}</button></div>`}</div>`; }).join('')}</div>`
      : `<div class="empty"><div class="eic">${icon('gift',30)}</div><h3>Todavía no tienes premios</h3><p>${b.main ? esc(remainingText(b.main.n, b.main.meta, b.main.premio)) : 'Completa una tarjeta para ganar tu primer premio.'}</p></div>`)
      + (b.used.length ? `<h3 class="mt24">Ya usados</h3><div class="card mt8 used" style="padding:4px 16px"><div class="list">${b.used.map(u => `<div class="lrow"><div class="grow"><b>${esc(cap(u.premio))}</b><span class="sub">${esc(u.c)}</span></div><span class="muted small">${esc(u.w)}</span></div>`).join('')}</div></div>` : '');
  } else if (S.ctab === 'historial') {
    body = b.hist.length ? `<div class="card" style="padding:4px 16px"><div class="list">${b.hist.map(h => `<div class="lrow"><span class="iconbtn" style="background:var(--brand-soft);color:var(--brand-deep)">${icon(h.t.startsWith('Recibiste') ? 'gift' : 'check',18,2.2)}</span><div class="grow"><b>${esc(h.t)}</b><span class="sub">${esc(h.c)}</span></div><span class="muted small" style="text-align:right">${esc(h.w)}</span></div>`).join('')}</div></div>`
      : `<div class="empty"><div class="eic">${icon('clock',30)}</div><h3>Aún no hay historial</h3><p>Cada visita y cada premio quedarán guardados aquí.</p></div>`;
  } else {
    body = b.benefits.length ? `<p class="ink2" style="margin-bottom:12px">Promociones activas en ${esc(b.nombre)}</p><div class="stack-y gap12">${b.benefits.map(x => `<div class="card"><div class="row-between"><h3>${esc(x.titulo)}</h3>${x.n >= x.meta ? '<span class="badge ok">Completada</span>' : x.n > 0 ? '<span class="badge brand">Participando</span>' : '<span class="badge">Nueva</span>'}</div><p class="ink2 mt8">${x.meta === 1 ? `En tu próxima visita recibes ${esc(x.premio)}.` : `Con ${x.meta} puntos recibes ${esc(x.premio)}.`}${x.hasta ? ` Hasta el ${esc(x.hasta)}.` : ''}</p><div class="mini mt8"><span class="bar" style="max-width:none"><i style="width:${x.n/x.meta*100}%"></i></span>${x.n}/${x.meta}</div></div>`).join('')}</div>`
      : `<div class="empty"><div class="eic">${icon('heart',30)}</div><h3>Sin beneficios por ahora</h3><p>Cuando ${esc(b.nombre)} lance una promoción, la verás aquí.</p></div>`;
  }
  return `<div class="phone bs" style="${bv(b.color)}">
    <header class="chead">${logoMark(40, b.nombre, b.logo)}<div class="grow"><b>${esc(b.nombre)}</b><span class="muted small">Tu tarjeta de cliente</span></div><span class="av sm">${initials(cd.nombre)}</span></header>
    <div class="pad"><h1>Hola, ${esc(cd.nombre)}</h1>
      <div class="tabs mt16" role="tablist">${tabs.map(([v,l]) => `<button role="tab" aria-selected="${S.ctab===v}" class="${S.ctab===v?'on':''}" data-act="cTab" data-v="${v}">${l}</button>`).join('')}</div>
      <div class="mt16">${body}</div></div></div>`;
}
const revealedHtml = code => `<div class="revealed"><div class="qr">${qrSvg(code, 92)}</div><div><span class="muted small">Muéstraselo al cajero</span><div class="code">${esc(code)}</div></div></div>`;
function curClientBiz(){ return clientData().list[S.cbiz]; }

/* ========= Login ========= */
function loginView(){
  const negocio = S.loginTab === 'negocio', cliente = S.loginTab === 'cliente', er = S.loginErr;
  return `<div class="login bs" style="${bv(S.brand)}"><div class="login-box">
    <div class="wordmark"><i>${S.logo ? `<img src="${esc(S.logo)}" alt="">` : esc(initials(S.bizName).slice(0,1))}</i><span>${esc(S.bizName)}${S.eslogan ? `<small>${esc(S.eslogan)}</small>` : ''}</span></div>
    <h1 class="mt24">Tu tarjeta de ${esc(S.bizName)}</h1>${S.bienvenida ? `<p class="ink2 mt8">${esc(S.bienvenida)}</p>` : ''}
    <div class="tabs mt24"><button class="${negocio?'on':''}" data-act="loginTab" data-v="negocio">Dueño</button><button class="${cliente?'on':''}" data-act="loginTab" data-v="cliente">Cliente</button><button class="${S.loginTab==='empleado'?'on':''}" data-act="loginTab" data-v="empleado">Empleado</button></div>
    ${negocio ? `<div class="stack-y gap16 mt20">
        <div class="field"><label for="l-e">Correo</label><input id="l-e" class="input" type="email" autocomplete="email" placeholder="hola@spintacafe.com" data-in="lmail">${er.mail ? `<p class="err">${icon('alert',18)}${er.mail}</p>` : ''}</div>
        <div class="field"><label for="l-p">Contraseña</label><input id="l-p" class="input" type="password" autocomplete="current-password" placeholder="Tu contraseña" data-in="lpass">${er.pass ? `<p class="err">${icon('alert',18)}${er.pass}</p>` : ''}</div>
        <button class="btn btn-primary btn-lg btn-block" data-act="doLogin">Entrar</button>
        <button class="link" style="justify-content:center">Olvidé mi contraseña</button>
        <p class="muted small" style="text-align:center">Acceso de demostración: usa cualquier correo válido y una contraseña de 6 caracteres.</p></div>`
    : cliente ? `<div class="stack-y gap16 mt20">
        <div class="field"><label for="l-t">Tu celular</label><input id="l-t" class="input big" type="tel" inputmode="numeric" placeholder="300 123 4567" data-in="ltel">${er.tel ? `<p class="err">${icon('alert',18)}${er.tel}</p>` : ''}</div>
        <button class="btn btn-primary btn-lg btn-block" data-act="doClient">Ver mis tarjetas</button>
        <p class="muted small" style="text-align:center">Sin contraseñas ni descargas. Usa el mismo número que das en el stand.</p>
        <a class="btn btn-outline btn-block" href="${SPINTA.registro}" target="_blank" rel="noopener">¿Primera vez? Regístrate aquí</a></div>`
      : `<div class="stack-y gap16 mt20"><p class="ink2">Accede a la pantalla de caja para registrar visitas, buscar clientes e inscribir nuevos participantes.</p><button class="btn btn-primary btn-lg btn-block" data-act="employeeLogin">Entrar a caja (demo)</button><p class="muted small" style="text-align:center">Acceso de demostración, sin contraseña.</p></div>`}
  </div></div>`;
}
const LOGIN = {mail:'', pass:'', tel:''};

/* ========= Render y eventos ========= */
function render(){
  const app = $('#app');
  app.className = 'bs'; app.setAttribute('style', bv(S.brand));
  app.innerHTML = S.role === 'owner' ? ownerShell() : S.role === 'employee' ? employeeShell() : S.role === 'client' ? clientShell() : loginView();
  const path = routeForState();
  if (path && path !== window.location.pathname) window.__VUELVE_NAVIGATE__?.(path);
  clearTimeout(scanT);
  if (S.emp.step === 'scan' && (S.role === 'employee' || (S.role === 'owner' && S.view === 'registrar'))) {
    scanT = setTimeout(() => { const c = D().clients[0]; if (c) { S.emp = {...S.emp, step:'client', clientId:c.id, campId:null, pop:-1}; } else { S.emp.step = 'search'; toast('No hay clientes todavía. Búscalo por celular.'); } render(); }, 1800);
  }
  S.emp.pop = -1;
}
function routeForState(){
  if (S.role === 'login') return '/login';
  if (S.role === 'client') return `/cliente/${S.ctab}`;
  if (S.role === 'employee') {
    const paths = {home:'caja', scan:'escanear', search:'buscar', new:'nuevo-cliente'};
    return S.emp.step === 'client' ? `/empleado/cliente/${S.emp.clientId}` : `/empleado/${paths[S.emp.step] || 'caja'}`;
  }
  if (S.view === 'campana') return `/dueno/campanas/${S.campId}`;
  if (S.view === 'crear') return '/dueno/campanas/nueva';
  if (S.view === 'registrar') {
    const paths = {home:'', scan:'escanear', search:'buscar', new:'nuevo-cliente'};
    return S.emp.step === 'client' ? `/dueno/visitas/cliente/${S.emp.clientId}` : `/dueno/visitas${paths[S.emp.step] ? `/${paths[S.emp.step]}` : ''}`;
  }
  const paths = {home:'inicio', clientes:'clientes', campanas:'campanas', recompensas:'recompensas', metricas:'metricas', personalizar:'personalizacion'};
  return `/dueno/${paths[S.view] || 'inicio'}`;
}
function applyRoute(path){
  const pathname = path.split('?')[0].replace(/\/+$/, '') || '/';
  if (!['/login', '/'].includes(pathname) && !pathname.startsWith('/dueno/') && !pathname.startsWith('/empleado/') && !pathname.startsWith('/cliente/')) return;
  if (pathname === '/login') {
    S.role = 'login';
    S.view = 'home';
  } else if (pathname.startsWith('/dueno/')) {
    S.role = 'owner';
    const route = pathname.slice('/dueno/'.length).split('/');
    if (route[0] === 'campanas' && route[1] === 'nueva') {
      S.view = 'crear';
      S.wz ||= newWz();
    } else if (route[0] === 'campanas' && route[1]) {
      S.view = 'campana';
      S.campId = Number(route[1]);
    } else if (route[0] === 'visitas') {
      S.view = 'registrar';
      const step = route[1];
      if (step === 'cliente' && route[2]) S.emp = {...S.emp, step:'client', clientId:Number(route[2])};
      else S.emp = {...S.emp, step:({escanear:'scan', buscar:'search', 'nuevo-cliente':'new'})[step] || 'home'};
    } else {
      S.view = ({inicio:'home', clientes:'clientes', campanas:'campanas', recompensas:'recompensas', metricas:'metricas', personalizacion:'personalizar'})[route[0]] || 'home';
    }
  } else if (pathname.startsWith('/empleado/')) {
    S.role = 'employee';
    const route = pathname.slice('/empleado/'.length).split('/');
    if (route[0] === 'cliente' && route[1]) S.emp = {...S.emp, step:'client', clientId:Number(route[1])};
    else S.emp = {...S.emp, step:({escanear:'scan', buscar:'search', 'nuevo-cliente':'new'})[route[0]] || 'home'};
  } else if (pathname.startsWith('/cliente/')) {
    S.role = 'client';
    S.ctab = ({progreso:'progreso', recompensas:'recompensas', historial:'historial', beneficios:'beneficios'})[pathname.slice('/cliente/'.length)] || 'progreso';
  }
  if (pathname !== '/') render();
}
window.__VUELVE_SET_ROUTE__ = applyRoute;

/* ========= Marca blanca: el tema llega del servicio de marcas según el dominio ========= */
function aplicarMarca(m){
  const t = m.tema || {};
  S.bizName = m.nombre;
  S.brand = t.colores?.primario || S.brand;
  S.logo = t.logo?.sobreColor || t.logo?.principal || null;
  S.sello = t.sello?.llenoUrl || null;
  S.cardStyle = STYLE_NAMES[t.tarjeta?.estilo] ? t.tarjeta.estilo : 'marca';
  S.eslogan = t.textos?.eslogan || '';
  S.bienvenida = t.textos?.bienvenida || '';
  if (t.colores?.fondo) document.documentElement.style.setProperty('--bg', t.colores.fondo);
  const fav = document.querySelector('link[rel="icon"]'); if (fav && t.logo?.principal) fav.href = t.logo.principal;
  const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = S.brand;
}
async function cargarMarca(){
  try {
    const r = await fetch('/api/marcas/actual', {headers:{Accept:'application/json'}});
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    aplicarMarca(await r.json());
    render();
  } catch (err) {
    console.warn('No se pudo cargar la marca desde la API; se usa la configuración incluida.', err);
  }
}
window.__VUELVE_ROUTE__ = window.location.pathname;
function go(v){ S.view = v; if (v === 'registrar') S.emp = {step:'home', q:'', clientId:null, campId:null, newName:'', err:''}; closeLayer(); render(); window.scrollTo(0,0); }

const ACT = {
  role:v => { S.role = v; S.loginErr = {}; if (v === 'employee') S.emp = {step:'home', q:'', clientId:null, campId:null, newName:'', err:''}; if (v === 'owner' && S.view === 'registrar') S.view = 'home'; closeLayer(); render(); window.scrollTo(0,0); },
  empty:() => { S.empty = !S.empty; S.search = ''; S.filter = 'todos'; S.cbiz = 0; if (['campana','crear'].includes(S.view)) S.view = 'home'; S.wz = null; S.emp.step = 'home'; closeLayer(); render(); },
  go:v => go(v),
  more:() => sheet(`<h2>Más opciones</h2><div class="list mt12">${NAV.slice(3).map(n => `<button class="lrow" data-act="go" data-v="${n[0]}"><span class="iconbtn" style="background:var(--brand-soft);color:var(--brand-deep)">${icon(n[2])}</span><div class="grow"><b>${n[1]}</b></div>${icon('chev',20)}</button>`).join('')}<button class="lrow" data-act="role" data-v="login"><span class="iconbtn">${icon('logout')}</span><div class="grow"><b>Cerrar sesión</b></div></button></div>`),
  close:() => closeLayer(),
  scrim:(v,t,e) => { if (e.target === t) closeLayer(); },
  tile:v => { if (v === 'recompensas') { S.rewardTab = 'done'; go('recompensas'); } else { S.filter = v === 'riesgo' ? 'riesgo' : v === 'nuevos' ? 'nuevos' : 'todos'; S.search = ''; go('clientes'); } },
  filter:v => { S.filter = v; render(); },
  openClient:v => openClient(v),
  recover:() => openRecover(),
  registerFor:v => { closeLayer(); if (S.role === 'owner') { S.view = 'registrar'; } S.emp = {step:'client', q:'', clientId:+v, campId:null, newName:'', err:''}; render(); window.scrollTo(0,0); },
  newCamp:v => { S.wz = newWz(v); S.view = 'crear'; closeLayer(); render(); window.scrollTo(0,0); },
  editCamp:v => { S.wz = newWz(null, camp(v)); S.view = 'crear'; render(); window.scrollTo(0,0); },
  openCamp:v => { S.campId = +v; go('campana'); },
  toggleCamp:v => { const k = camp(v); k.activa = !k.activa; if (!k.activa && !k.fin) k.fin = iso(new Date()); if (k.activa) k.fin = ''; render(); toast(k.activa ? 'Campaña activada' : 'Campaña terminada'); },
  dlqr:v => downloadQR(v),
  notify:() => openNotify(),
  wzObj:v => { const w = S.wz; w.obj = v; const keep = {titulo:w.titulo, premio:w.premio}; Object.assign(w, OBJ[v].set); if (v !== 'recuperar') { w.titulo = keep.titulo; w.premio = keep.premio; } if (w.cuando === 'dias' && !w.fin) { const e = new Date(); e.setDate(e.getDate() + (v === 'recuperar' ? 14 : 30)); w.fin = iso(e); } w.err = ''; render(); },
  wzSet:(v,t) => { const k = t.dataset.k; S.wz[k] = k === 'meta' ? +v : v; if (k === 'cuando' && v === 'dias' && !S.wz.fin) { const e = new Date(); e.setDate(e.getDate()+30); S.wz.fin = iso(e); } S.wz.err = ''; render(); },
  wzMeta:v => { S.wz.meta = Math.min(20, Math.max(1, S.wz.meta + +v)); render(); },
  wzNext:() => wzNext(),
  wzBack:() => { const steps = wzSteps(), cur = steps.indexOf(WZ_STEPS[S.wz.step]); if (cur > 0) S.wz.step = WZ_STEPS.indexOf(steps[cur-1]); S.wz.err = ''; render(); },
  wzExit:() => { const back = S.wz && S.wz.editId ? 'campana' : 'campanas'; S.wz = null; go(back); },
  rtab:v => { S.rewardTab = v; render(); },
  deliver:v => askDeliver(v),
  doDeliver:v => doDeliver(v),
  period:v => { S.period = v; render(); },
  swatch:v => { S.brand = v; render(); },
  rmLogo:() => { S.logo = null; S.logoErr = ''; render(); },
  saveBrand:() => { S.bizName = S.bizName.trim() || 'Mi negocio'; render(); toast('Cambios guardados'); },
  empGo:v => { S.emp.step = v; S.emp.err = ''; if (v === 'home') { S.emp.q = ''; S.emp.newName = ''; } render(); },
  empPick:v => { S.emp = {...S.emp, step:'client', clientId:+v, campId:null}; render(); },
  empCamp:v => { S.emp.campId = +v; render(); },
  empCreate:() => { const e = S.emp, n = e.newName.trim(); if (n.length < 2) { e.err = 'Escribe el nombre del cliente.'; return render(); }
    const d = D(); const c = C(Date.now(), n, e.q.replace(/\D/g,'').slice(-10), 0, 0, {}, true); d.clients.push(c); d.week.nuevos++;
    d.activity.unshift({t:`${n} se unió`, w:'Ahora'}); S.emp = {...e, step:'client', clientId:c.id, campId:null, err:''}; render(); toast('Cliente inscrito'); },
  plusOne:(v,t) => { t.disabled = true; plusOne(); },
  bonus:v => addBonus(v),
  empBack:() => { closeLayer(); render(); },
  empDeliver:() => empDeliver(),
  empReset:() => { closeLayer(); S.emp = {step:'home', q:'', clientId:null, campId:null, newName:'', err:''}; render(); },
  cTab:v => { S.ctab = v; render(); },
  cBiz:v => { S.cbiz = +v; S.ctab = 'progreso'; render(); window.scrollTo(0,0); },
  cCode:() => { const b = curClientBiz(); sheet(`<div style="text-align:center"><h2>Tu código</h2><p class="ink2 mt8">Muéstralo en el stand para sumar tu punto o reclamar tu premio.</p><div class="mt20" style="display:flex;justify-content:center">${qrSvg('camila-' + b.key, 240)}</div><p class="muted mt12">Camila, ${fmtTel('3004567812')}</p></div>`, b.color); },
  cReward:() => { const b = curClientBiz(), m = b.main; sheet(`<div style="text-align:center"><div class="empty" style="padding:8px 0 0"><div class="eic">${icon('gift',32)}</div></div><h2>${esc(cap(m.premio))}</h2><p class="ink2 mt8">${esc(m.descripcion || '')} ${esc(remainingText(m.n, m.meta, m.premio))}</p></div><div class="mt20">${pcard({titulo:m.titulo, n:m.n, meta:m.meta, premio:m.premio, compact:true, style:b.style, brand:b.color})}</div><button class="btn btn-primary btn-lg btn-block mt16" data-act="close">Entendido</button>`, b.color); },
  copyWa:() => copyText(S.waMsg || '').then(ok => toast(ok ? 'Mensaje copiado' : 'No pudimos copiar. Selecciona el texto y cópialo.')),
  flipCard:(v,t,e) => { const f = $('.flip'); if (f) { f.classList.toggle('on'); if (t !== f) f.scrollIntoView({behavior:'smooth', block:'center'}); } },
  cardStyle:v => { S.cardStyle = v; render(); },
  slideTap:(v,t,e) => { if (dragMoved) return; const sl = t.closest('.slide'); if (e.detail === 0) return revealCoupon(sl); sl.classList.remove('nudge'); void sl.offsetWidth; sl.classList.add('nudge'); },
  wallet:() => toast('Tarjeta guardada en tu Wallet'),
  loginTab:v => { S.loginTab = v; S.loginErr = {}; render(); },
  doLogin:() => { const er = {}; if (!/^\S+@\S+\.\S+$/.test(LOGIN.mail)) er.mail = 'Escribe un correo válido, por ejemplo hola@spintacafe.com.'; if (LOGIN.pass.length < 6) er.pass = 'La contraseña debe tener al menos 6 caracteres.'; S.loginErr = er; if (Object.keys(er).length) return render(); S.role = 'owner'; S.view = 'home'; render(); toast('Hola de nuevo, equipo Spinta'); },
  employeeLogin:() => { S.role = 'employee'; S.emp = {step:'home', q:'', clientId:null, campId:null, newName:'', err:''}; render(); },
  doClient:() => { const t = LOGIN.tel.replace(/\D/g,''); if (t.length !== 10) { S.loginErr = {tel:'Escribe tu número de 10 dígitos, por ejemplo 300 123 4567.'}; return render(); } S.loginErr = {}; S.role = 'client'; S.cbiz = 0; S.ctab = 'progreso'; render(); }
};
function copyText(txt){
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(txt).then(() => true).catch(() => legacyCopy(txt));
  return Promise.resolve(legacyCopy(txt));
}
function legacyCopy(txt){
  const ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch(_) {} ta.remove(); return ok;
}
function openWhatsApp(href){
  const u = new URL(href);
  const phone = u.pathname.replace(/\D/g,''), msg = u.searchParams.get('text') || '';
  const api = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`;
  const inFrame = (() => { try { return window.self !== window.top; } catch(_) { return true; } })();
  if (!inFrame) { window.location.href = api; return; }
  S.waMsg = msg;
  sheet(`<h2>Enviar por WhatsApp</h2>
    <p class="ink2 mt8">Esta vista previa no permite abrir WhatsApp. Copia el mensaje y pégalo en el chat, o abre el archivo en tu navegador para que se abra solo.</p>
    <div class="card mt16" style="background:var(--soft);border:0"><p style="white-space:pre-wrap">${esc(msg)}</p></div>
    <p class="muted small mt8">Para: +${phone.replace(/^57/,'57 ')}</p>
    <div class="stack-y gap8 mt16"><button class="btn btn-primary btn-lg btn-block" data-act="copyWa">Copiar mensaje</button>
    <a class="btn btn-wa btn-block" href="${api}" target="_blank" rel="noopener noreferrer" data-direct="1">Intentar abrir WhatsApp</a></div>`);
}
document.addEventListener('click', e => {
  const wa = e.target.closest('a[href^="https://wa.me"]:not([data-direct])');
  if (wa) { e.preventDefault(); openWhatsApp(wa.href); return; }
  const t = e.target.closest('[data-act]'); if (!t) return;
  const f = ACT[t.dataset.act]; if (f) { if (t.tagName === 'BUTTON') e.preventDefault(); f(t.dataset.v, t, e); }
});
let drag = null, dragMoved = false;
function revealCoupon(sl){ const code = sl.dataset.code; S.revealed[code] = true; sl.outerHTML = revealedHtml(code); toast('Cupón listo para mostrar'); }
document.addEventListener('pointerdown', e => {
  const th = e.target.closest('.slide .thumb'); if (!th) return;
  const sl = th.closest('.slide'); sl.classList.remove('back','nudge');
  drag = {sl, th, fill:sl.querySelector('.fill'), x0:e.clientX, max:sl.clientWidth - th.offsetWidth - 8}; dragMoved = false;
  th.setPointerCapture(e.pointerId);
});
document.addEventListener('pointermove', e => {
  if (drag) {
    const dx = Math.max(0, Math.min(e.clientX - drag.x0, drag.max)); if (dx > 4) dragMoved = true;
    drag.th.style.transform = `translateX(${dx}px)`; drag.fill.style.width = `${dx + 60}px`; return;
  }
  const c = e.target.closest('.pcard.grad, .coupon, .backcard'); if (!c) return;
  const r = c.getBoundingClientRect();
  c.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
  c.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
});
document.addEventListener('pointerup', e => {
  if (!drag) return; const d = drag; drag = null;
  const dx = parseFloat((d.th.style.transform.match(/[\d.]+/) || [0])[0]);
  if (dx >= d.max * .85) { revealCoupon(d.sl); }
  else { d.sl.classList.add('back'); d.th.style.transform = ''; d.fill.style.width = ''; }
  setTimeout(() => dragMoved = false, 0);
});
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('flip')) { e.preventDefault(); e.target.classList.toggle('on'); return; } if (e.key === 'Escape' && $('#layer').innerHTML) closeLayer(); });
document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.color) { S.brand = t.value; $('#app').style.setProperty('--brand', t.value); $('#app').style.setProperty('--on-brand', onBrand(t.value)); const n = $('#cnote'); if (n) n.outerHTML = contrastNote(t.value); return; }
  switch (t.dataset.in){
    case 'search': S.search = t.value; $('#cl-list').innerHTML = clientList(); break;
    case 'wz': S.wz[t.dataset.k] = t.value; const p = $('#wz-prev'); if (p) p.innerHTML = wzPreview(); break;
    case 'bizName': S.bizName = t.value; const pp = $('#pprev .bizline span'); if (pp) pp.textContent = t.value || 'Mi negocio'; break;
    case 'empq': S.emp.q = t.value; $('#emp-res').innerHTML = empResults(); break;
    case 'empname': S.emp.newName = t.value; break;
    case 'lmail': LOGIN.mail = t.value.trim(); break;
    case 'lpass': LOGIN.pass = t.value; break;
    case 'ltel': LOGIN.tel = t.value; break;
  }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.color) { render(); return; }
  if (t.dataset.file === 'logo') readImage(t.files[0], url => { S.logo = url; S.logoErr = ''; render(); toast('Logo actualizado'); }, err => { S.logoErr = err; render(); });
  if (t.dataset.file === 'wzimg') readImage(t.files[0], url => { S.wz.img = url; S.wz.imgErr = ''; render(); }, err => { S.wz.imgErr = err; render(); });
});
applyRoute(window.location.pathname);
cargarMarca();