/* OHJtrack database/storage layer and shared data helpers. */

/* =========================================================
   OJT MONITORING SYSTEM v2
   Roles: admin | coordinator | trainee
   ========================================================= */

const STORAGE_KEYS = {
  users:'ojt2_users', documents:'ojt2_documents', dtr:'ojt2_dtr',
  announcements:'ojt2_announcements', notifications:'ojt2_notifications',
  weeklyReports:'ojt2_weeklyreports', letters:'ojt2_letters',
  auditLog:'ojt2_auditlog', institution:'ojt2_institution'
};
let DB = { users:[], documents:[], dtr:[], announcements:[], notifications:[], weeklyReports:[], letters:[], auditLog:[], institution:null };
let session = { userId: null };
let ui = {
  view:'auth', authMode:'login', authError:'', authSuccess:'', forgotMsg:'', regRole:'trainee',
  adminTab:'dashboard',
  coordTrackTab:'dashboard', coordTraineeGroup:null, coordCompanySel:null, coordLetterFilter:'pending', coordArchiveTab:'trainees',
  traineeTab:'dashboard', dtrMonth: monthKey(new Date()), printingTrainee:null, printingMonth:null,
  reportPrintId:null,
  settingsMsg:'', pwMsg:'', menuOpen:false,
  modal:null
};

function uid(prefix){ return prefix+'_'+Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function monthKey(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }
function monthLabel(mk){ const [y,m]=mk.split('-').map(Number); return new Date(y,m-1,1).toLocaleString('en-US',{month:'long',year:'numeric'}); }
function daysInMonth(mk){ const [y,m]=mk.split('-').map(Number); return new Date(y,m,0).getDate(); }
function todayStr(){ return new Date().toISOString().slice(0,10); }
function nowIso(){ return new Date().toISOString(); }
function fmtDateShort(d){ return new Date(d+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); }
function fmtTime12(t){
  if(!t) return '';
  const [h,m] = t.split(':').map(Number);
  const suffix = h>=12 ? 'PM' : 'AM';
  const hour12 = h%12 === 0 ? 12 : h%12;
  return hour12+':'+String(m).padStart(2,'0')+' '+suffix;
}
function timeAgo(iso){
  const diff = (Date.now()-new Date(iso).getTime())/1000;
  if(diff<60) return 'just now';
  if(diff<3600) return Math.floor(diff/60)+'m ago';
  if(diff<86400) return Math.floor(diff/3600)+'h ago';
  return Math.floor(diff/86400)+'d ago';
}
function initials(name){ return (name||'?').split(' ').filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join(''); }
function esc(s){ return (s==null?'':String(s)).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ---------------- server storage layer (PostgreSQL API) ---------------- */
async function loadDB(){
  for(const key of Object.keys(STORAGE_KEYS)){
    const isObj = key==='institution';
    const response = await fetch(`/api/storage/${encodeURIComponent(key)}`);
    if(!response.ok) throw new Error(`Could not load ${key} from the server.`);
    const data = await response.json();
    DB[key] = data.value == null ? (isObj ? null : []) : data.value;
  }
  const demoAdminIndex = DB.users.findIndex(u=>u.role==='admin' && u.email==='admin@ojt.system' && u.password==='Admin@123');
  if(demoAdminIndex !== -1){
    DB.users.splice(demoAdminIndex, 1);
    await saveDB('users');
  }
  if(!DB.institution){
    DB.institution = { schoolName:'Your Institution Name', campus:'Main Campus', address:'', tagline:'', logo:null };
    await saveDB('institution');
  }
}
async function saveDB(key){
  const response = await fetch(`/api/storage/${encodeURIComponent(key)}`, {
    method:'PUT',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({ value:DB[key] })
  });
  if(!response.ok) throw new Error(`Could not save ${key} to the server.`);
}

/* ---------------- derived helpers ---------------- */
function currentUser(){ return DB.users.find(u=>u.id===session.userId) || null; }
function traineesAll(){ return DB.users.filter(u=>u.role==='trainee'); }
function traineesActive(){ return traineesAll().filter(t=>t.status==='approved' && !t.archived); }
function coordinatorsOf(){ return DB.users.filter(u=>u.role==='coordinator'); }
function pendingUsers(){ return DB.users.filter(u=>u.status==='pending'); }
function docsFor(traineeId){ return DB.documents.filter(d=>d.traineeId===traineeId); }
function pushAudit(action, targetName, details){
  const u = currentUser();
  DB.auditLog.unshift({ id: uid('log'), ts: nowIso(), actorName: u?u.name:'System', action, targetName, details: details||'' });
  return saveDB('auditLog');
}
function pushNotification(traineeId, title, message, source){
  DB.notifications.unshift({ id: uid('n'), traineeId, title, message, source: source||'system', createdAt: nowIso(), read:false });
}

function timeToHours(t){ if(!t) return 0; const [h,m]=t.split(':').map(Number); return h + m/60; }
function computeDayHours(e){
  if(!e) return {regular:0, ot:0, total:0};
  let regular=0;
  if(e.amIn && e.amOut) regular += Math.max(0, timeToHours(e.amOut)-timeToHours(e.amIn));
  if(e.pmIn && e.pmOut) regular += Math.max(0, timeToHours(e.pmOut)-timeToHours(e.pmIn));
  let ot=0;
  if(e.otIn && e.otOut) ot += Math.max(0, timeToHours(e.otOut)-timeToHours(e.otIn));
  return {regular, ot, total: regular+ot};
}
function dtrFor(traineeId, mk){ return DB.dtr.find(d=>d.traineeId===traineeId && d.month===mk); }
function getOrCreateDtr(traineeId, mk){
  let rec = dtrFor(traineeId, mk);
  if(!rec){ rec = { id: uid('dtr'), traineeId, month: mk, entries:{} }; DB.dtr.push(rec); }
  return rec;
}
function monthAggregate(rec){
  let regular=0, ot=0, daysLogged=0;
  if(rec){ Object.values(rec.entries).forEach(e=>{ const h=computeDayHours(e); if(h.total>0) daysLogged++; regular+=h.regular; ot+=h.ot; }); }
  return { regular, ot, total: regular+ot, daysLogged };
}
function lifetimeHours(traineeId){
  let total=0;
  DB.dtr.filter(d=>d.traineeId===traineeId).forEach(rec=>{ const a=monthAggregate(rec); total+=a.total; });
  return total;
}
