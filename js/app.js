/* OHJtrack shared application: rendering, authentication, shell, modals, and initialization. */

/* ================= RENDER ROOT ================= */
function render(){
  const app = document.getElementById('app');
  const user = currentUser();
  document.body.classList.toggle('dark', !!(user && user.theme==='dark'));
  if(!user || ui.view==='auth'){ app.innerHTML = renderAuth(); bindAuthEvents(); return; }
  app.innerHTML = renderShell(user) + renderModal(user);
  bindShellEvents(user);
  bindModalEvents(user);
}

/* ================= AUTH ================= */
function logoBadgeHtml(size){
  const s = size||64;
  return `<div class="logo-badge" style="width:${s}px;height:${s}px;">
    <img src="assets/ohjtrack-logo.png" alt="OHJTrack logo">
  </div>`;
}
function renderAuth(){
  const isLogin = ui.authMode === 'login';
  const inst = DB.institution || {};
  const rememberedEmail = localLoad2('ojt2_remember_email') || '';
  return `
  <div class="auth-wrap">
    <div class="auth-ring" style="width:640px;height:640px;top:-120px;left:-160px;"></div>
    <div class="auth-ring" style="width:460px;height:460px;bottom:-140px;right:-120px;"></div>
    <div class="float-icon" style="top:8%;left:9%;">&#128187;</div>
    <div class="float-icon" style="bottom:10%;left:7%;">&#9881;</div>
    <div class="float-icon" style="top:6%;right:9%;">&#128188;</div>
    <div class="float-icon" style="bottom:12%;right:8%;">&#128101;</div>
    <div class="auth-card">
      <div class="auth-brand">
        ${logoBadgeHtml(100)}
        <h1>${esc(inst.schoolName && inst.schoolName!=='Your Institution Name' ? inst.schoolName : 'OHJTrack')}</h1>
        <p>OJT MONITORING SYSTEM &middot; Internship Tracking &amp; Compliance</p>
      </div>
      <div class="auth-toggle">
        <button data-auth-mode="login" class="${isLogin?'active':''}">LOG IN</button>
        <button data-auth-mode="register" class="${!isLogin?'active':''}">REGISTER</button>
      </div>
      ${ui.authError? `<div class="error-box">${esc(ui.authError)}</div>`:''}
      ${ui.authSuccess? `<div class="success-box">${esc(ui.authSuccess)}</div>`:''}
      ${isLogin ? renderLoginForm(rememberedEmail) : renderRegisterForm()}
      <div class="demo-note">New coordinator and trainee accounts require administrator approval before they can log in.</div>
    </div>
  </div>`;
}
function localLoad2(key){ try{ return localStorage.getItem(key); }catch(e){ return null; } }
function renderLoginForm(rememberedEmail){
  return `
  <form id="loginForm">
    <div class="field"><label>Email</label><input type="email" name="email" required placeholder="you@example.com" value="${esc(rememberedEmail||'')}"></div>
    <div class="field"><label>Password</label><div class="password-field"><input type="password" name="password" required placeholder="••••••••"><button type="button" class="password-toggle" data-toggle-password aria-label="Show password" title="Show password">&#128065;</button></div></div>
    <div class="auth-row">
      <label><input type="checkbox" name="remember" ${rememberedEmail?'checked':''}> Remember me</label>
      <a data-action="forgotpw">Forgot Password?</a>
    </div>
    ${ui.forgotMsg? `<div class="success-box">${esc(ui.forgotMsg)}</div>`:''}
    <button type="submit" class="btn btn-gold full-w">LOG IN</button>
  </form>`;
}
function renderRegisterForm(){
  return `
  <form id="registerForm">
    <div class="photo-pick">
      <img class="prev" id="regPhotoPrev" src="" alt="" style="display:none;">
      <div class="avatar" id="regPhotoPlaceholder" style="width:56px;height:56px;font-size:16px;">?</div>
      <div><label class="btn btn-outline btn-sm" style="display:inline-block;">Upload Photo<input type="file" id="regPhotoInput" accept="image/*" style="display:none;"></label>
      <div class="hint">Profile picture (optional)</div></div>
    </div>
    <div class="field"><label>Full Name</label><input type="text" name="name" required placeholder="Juan Dela Cruz"></div>
    <div class="field"><label>Email</label><input type="email" name="email" required placeholder="you@example.com"></div>
    <div class="field"><label>Password</label><div class="password-field"><input type="password" name="password" required placeholder="Minimum 6 characters" minlength="6"><button type="button" class="password-toggle" data-toggle-password aria-label="Show password" title="Show password">&#128065;</button></div></div>
    <div class="field">
      <label>Register as</label>
      <select name="role" id="regRoleSelect">
        <option value="trainee" ${ui.regRole==='trainee'?'selected':''}>Trainee / Intern</option>
        <option value="coordinator" ${ui.regRole==='coordinator'?'selected':''}>OJT Coordinator</option>
      </select>
    </div>
    <div id="roleExtraFields"></div>
    <button type="submit" class="btn btn-gold full-w">Submit Registration</button>
  </form>`;
}
function roleExtraFieldsHTML(role){
  if(role==='trainee'){
    const coordOptions = coordinatorsOf().filter(c=>c.status==='approved')
      .map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');
    return `
    <div class="form-grid">
      <div class="field"><label>Student ID</label><input type="text" name="studentId" placeholder="23-A-1234"></div>
      <div class="field"><label>Program / Course</label><input type="text" name="program" placeholder="BS Information System"></div>
      <div class="field"><label>Campus</label><input type="text" name="campus" placeholder="Main Campus"></div>
      <div class="field"><label>Block / Section</label><input type="text" name="block" placeholder="BSIT-4A"></div>
      <div class="field"><label>HTE / Company Name</label><input type="text" name="company" placeholder="ZENITRAM"></div>
      <div class="field"><label>Company Supervisor</label><input type="text" name="supervisor" placeholder="Juvy Lito V. Martinez"></div>
    </div>
    <div class="field"><label>Assigned Coordinator</label>
      <select name="coordinatorId"><option value="">— Not yet assigned —</option>${coordOptions}</select>
    </div>`;
  }
  return `<div class="field"><label>Department / Office</label><input type="text" name="department" placeholder="College of Computer Studies"></div>`;
}
let regPhotoData = null;
function bindAuthEvents(){
  document.querySelectorAll('[data-toggle-password]').forEach(button=>{
    button.onclick = ()=>{
      const input = button.parentElement.querySelector('input');
      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      button.innerHTML = isHidden ? '&#128064;' : '&#128065;';
      button.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
      button.title = isHidden ? 'Hide password' : 'Show password';
    };
  });
  document.querySelectorAll('[data-auth-mode]').forEach(btn=>{
    btn.onclick = ()=>{ ui.authMode = btn.dataset.authMode; ui.authError=''; ui.authSuccess=''; ui.forgotMsg=''; render(); };
  });
  const roleSelect = document.getElementById('regRoleSelect');
  const extraWrap = document.getElementById('roleExtraFields');
  if(roleSelect && extraWrap){
    extraWrap.innerHTML = roleExtraFieldsHTML(roleSelect.value);
    roleSelect.onchange = ()=>{ ui.regRole = roleSelect.value; extraWrap.innerHTML = roleExtraFieldsHTML(roleSelect.value); };
  }
  const photoInput = document.getElementById('regPhotoInput');
  if(photoInput) photoInput.onchange = ()=>{
    const f = photoInput.files[0]; if(!f) return;
    const reader = new FileReader();
    reader.onload = ()=>{ regPhotoData = reader.result;
      const prev = document.getElementById('regPhotoPrev'); const ph = document.getElementById('regPhotoPlaceholder');
      prev.src = regPhotoData; prev.style.display='block'; if(ph) ph.style.display='none';
    };
    reader.readAsDataURL(f);
  };
  const loginForm = document.getElementById('loginForm');
  if(loginForm) loginForm.onsubmit = (e)=>{
    e.preventDefault();
    const fd = new FormData(loginForm);
    const email = fd.get('email').trim().toLowerCase();
    const password = fd.get('password');
    const user = DB.users.find(u=>u.email.toLowerCase()===email && u.password===password);
    if(!user){ ui.authError='Incorrect email or password.'; ui.authSuccess=''; render(); return; }
    if(user.archived){ ui.authError='This account has been archived. Contact your coordinator.'; render(); return; }
    if(user.status==='pending'){ ui.authError='Your account is awaiting admin approval.'; render(); return; }
    if(user.status==='rejected'){ ui.authError='Your registration was not approved. Contact the administrator.'; render(); return; }
    try{ if(fd.get('remember')) localStorage.setItem('ojt2_remember_email', email); else localStorage.removeItem('ojt2_remember_email'); }catch(err){}
    session.userId = user.id; ui.view='dashboard';
    if(user.role==='admin') ui.adminTab='dashboard';
    if(user.role==='coordinator') ui.coordTrackTab='dashboard';
    if(user.role==='trainee') ui.traineeTab='dashboard';
    ui.authError=''; ui.authSuccess=''; ui.forgotMsg='';
    render();
  };
  const forgotLink = document.querySelector('[data-action="forgotpw"]');
  if(forgotLink) forgotLink.onclick = ()=>{ ui.forgotMsg='Please contact your OJT coordinator or the system administrator to reset your password.'; render(); };
  const regForm = document.getElementById('registerForm');
  if(regForm) regForm.onsubmit = async (e)=>{
    e.preventDefault();
    const fd = new FormData(regForm);
    const email = fd.get('email').trim().toLowerCase();
    if(DB.users.some(u=>u.email.toLowerCase()===email)){ ui.authError='An account with that email already exists.'; render(); return; }
    const role = fd.get('role');
    const base = {
      id: uid('u'), role, name: fd.get('name').trim(), email,
      password: fd.get('password'), status:'pending', createdAt: todayStr(), theme:'light', photo: regPhotoData
    };
    if(role==='trainee'){
      Object.assign(base, {
        studentId: fd.get('studentId')||'', campus: fd.get('campus')||'', program: fd.get('program')||'', block: fd.get('block')||'',
        company: fd.get('company')||'', supervisor: fd.get('supervisor')||'', coordinatorId: fd.get('coordinatorId')||'',
        requiredHours: 486, active:true, archived:false
      });
    } else {
      Object.assign(base, { department: fd.get('department')||'' });
    }
    DB.users.push(base);
    await saveDB('users');
    regPhotoData = null;
    ui.authMode='login'; ui.authError=''; ui.authSuccess='Registration submitted. Please wait for admin approval before logging in.'; ui.regRole='trainee';
    render();
  };
}

/* ================= SHELL ================= */
function navItemsFor(role){
  if(role==='admin') return [
    ['dashboard','&#9737;','Overview',0],
    ['approvals','&#9989;','Approvals', pendingUsers().length],
    ['users','&#128101;','All Users',0],
    ['institution','&#127970;','Institution',0]
  ];
  if(role==='coordinator') return [
    ['dashboard','&#9737;','Overview',0],
    ['announcements','&#128227;','Announcements',0],
    ['trainees','&#128101;','Trainees',0],
    ['companies','&#127970;','Companies',0],
    ['letters','&#128196;','Letters', DB.letters.filter(l=>l.status==='pending').length],
    ['weeklyreports','&#128203;','Weekly Reports', DB.weeklyReports.filter(r=>r.status==='pending').length],
    ['archive','&#128451;','Archive',0]
  ];
  const u = currentUser();
  const unread = u? DB.notifications.filter(n=>n.traineeId===u.id && !n.read).length : 0;
  return [
    ['dashboard','&#9737;','Overview',0],
    ['notifications','&#128276;','Notifications', unread],
    ['dtr','&#128197;','Attendance / DTR',0],
    ['weeklyreport','&#128203;','Weekly Report',0],
    ['letters','&#9993;','Letters',0],
    ['history','&#128218;','History',0],
    ['settings','&#9881;','Settings',0]
  ];
}
function currentTabKey(role){
  if(role==='admin') return ui.adminTab;
  if(role==='coordinator') return ui.coordTrackTab;
  return ui.traineeTab;
}
function setTabKey(role, key){
  if(role==='admin') ui.adminTab=key;
  else if(role==='coordinator') ui.coordTrackTab=key;
  else ui.traineeTab=key;
}
function renderShell(user){
  const items = navItemsFor(user.role);
  const roleLabel = user.role==='admin'?'Administrator':user.role==='coordinator'?'Coordinator':'Trainee';
  const activeKey = currentTabKey(user.role);
  const idNum = user.role==='trainee' ? (user.studentId || user.id.slice(-8).toUpperCase()) : null;
  let metaLines = '';
  if(user.role==='trainee'){
    metaLines = `
      <div class="pmeta">
        <div><b>Email:</b> ${esc(user.email)}</div>
        <div><b>Campus:</b> ${esc(user.campus||'—')}</div>
        <div><b>HTE:</b> ${esc(user.company||'—')}</div>
        <div><b>Program:</b> ${esc(user.program||'—')}</div>
        <div><b>Block:</b> ${esc(user.block||'—')}</div>
      </div>`;
  } else if(user.role==='coordinator'){
    metaLines = `<div class="pmeta"><div><b>Email:</b> ${esc(user.email)}</div><div><b>Dept:</b> ${esc(user.department||'—')}</div></div>`;
  } else {
    metaLines = `<div class="pmeta"><div><b>Email:</b> ${esc(user.email)}</div></div>`;
  }
  return `
  <div class="shell">
    <aside class="sidebar ${ui.menuOpen?'menu-open':''}">
      <div class="mobile-nav-head">
        <div class="brand">
          ${logoBadgeHtml(54)}
          <div class="brand-text"><div class="t1">OHJTrack</div><div class="t2">${roleLabel}</div></div>
        </div>
        <button class="menu-toggle" type="button" data-action="toggle-menu" aria-label="Toggle navigation menu" aria-expanded="${ui.menuOpen}">&#9776;</button>
      </div>
      <div class="profile-block">
        <div class="avatar">${user.photo?`<img src="${user.photo}">`:initials(user.name)}</div>
        <div class="pname">${esc(user.name)}</div>
        ${idNum?`<div class="pid">${esc(idNum)}<br>ID Number</div>`:`<div class="pid">${roleLabel}</div>`}
        ${metaLines}
      </div>
      <nav class="nav">
        ${items.map(([key,icon,label,badge])=>`
          <button class="nav-item ${activeKey===key?'active':''}" data-nav="${key}">
            <span class="nav-icon">${icon}</span><span>${label}</span>
            ${badge?`<span class="nav-badge">${badge}</span>`:''}
          </button>`).join('')}
      </nav>
      <div class="sidebar-footer">
        <button class="logout-btn" data-action="logout">Log Out</button>
      </div>
    </aside>
    <main class="main">${renderView(user)}</main>
  </div>`;
}
function renderView(user){
  if(ui.view==='dtrPrint') return renderDtrPrintView(user);
  if(ui.view==='reportPrint') return renderReportPrintView(user);
  if(user.role==='admin') return renderAdmin(user);
  if(user.role==='coordinator') return renderCoordinator(user);
  return renderTrainee(user);
}
function bindShellEvents(user){
  document.querySelectorAll('[data-nav]').forEach(b=> b.onclick = ()=>{ setTabKey(user.role, b.dataset.nav); ui.view='dashboard'; ui.menuOpen=false; render(); });
  const menuToggle = document.querySelector('[data-action="toggle-menu"]');
  if(menuToggle) menuToggle.onclick = ()=>{ ui.menuOpen=!ui.menuOpen; render(); };
  const logout = document.querySelector('[data-action="logout"]');
  if(logout) logout.onclick = ()=>{ session.userId=null; ui.view='auth'; ui.authMode='login'; render(); };
  if(user.role==='admin') bindAdminEvents(user);
  if(user.role==='coordinator') bindCoordinatorEvents(user);
  if(user.role==='trainee') bindTraineeEvents(user);
}

/* ================= MODAL SYSTEM ================= */
function renderModal(user){
  if(!ui.modal) return '';
  if(ui.modal.type==='addTrainee' || ui.modal.type==='editTrainee') return modalTraineeForm();
  return '';
}
function modalTraineeForm(){
  const editing = ui.modal.type==='editTrainee';
  const t = editing ? DB.users.find(u=>u.id===ui.modal.id) : null;
  return `
  <div class="modal-overlay" data-modal-overlay>
    <div class="modal-box">
      <h2>${editing?'Edit Trainee':'Add Trainee'}</h2>
      ${ui.modal.error?`<div class="error-box">${esc(ui.modal.error)}</div>`:''}
      <form id="traineeModalForm">
        <div class="form-grid">
          <div class="field"><label>Full Name</label><input type="text" name="name" required value="${t?esc(t.name):''}"></div>
          <div class="field"><label>Email</label><input type="email" name="email" required value="${t?esc(t.email):''}"></div>
          <div class="field"><label>Student ID</label><input type="text" name="studentId" value="${t?esc(t.studentId||''):''}"></div>
          <div class="field"><label>Campus</label><input type="text" name="campus" value="${t?esc(t.campus||''):''}"></div>
          <div class="field"><label>Program</label><input type="text" name="program" value="${t?esc(t.program||''):''}"></div>
          <div class="field"><label>Block / Section</label><input type="text" name="block" value="${t?esc(t.block||''):''}"></div>
          <div class="field"><label>HTE / Company</label><input type="text" name="company" value="${t?esc(t.company||''):''}"></div>
          <div class="field"><label>Company Supervisor</label><input type="text" name="supervisor" value="${t?esc(t.supervisor||''):''}"></div>
          <div class="field"><label>Required Hours</label><input type="number" name="requiredHours" value="${t?t.requiredHours||486:486}"></div>
          <div class="field"><label>${editing?'New Password (optional)':'Temporary Password'}</label><input type="text" name="password" ${editing?'':'required'} placeholder="${editing?'Leave blank to keep current':'e.g. Welcome123'}"></div>
        </div>
        <div class="modal-close-row">
          <button type="button" class="btn btn-outline" data-modal-close>Cancel</button>
          <button type="submit" class="btn btn-gold">${editing?'Save Changes':'Add Trainee'}</button>
        </div>
      </form>
    </div>
  </div>`;
}
function bindModalEvents(user){
  document.querySelectorAll('[data-modal-close]').forEach(b=> b.onclick = ()=>{ ui.modal=null; render(); });
  const overlay = document.querySelector('[data-modal-overlay]');
  if(overlay) overlay.onclick = (e)=>{ if(e.target===overlay){ ui.modal=null; render(); } };
  const form = document.getElementById('traineeModalForm');
  if(form) form.onsubmit = async (e)=>{
    e.preventDefault();
    const fd = new FormData(form);
    const email = fd.get('email').trim().toLowerCase();
    if(ui.modal.type==='addTrainee'){
      if(DB.users.some(u=>u.email.toLowerCase()===email)){ ui.modal.error='An account with that email already exists.'; render(); return; }
      const nu = {
        id: uid('u'), role:'trainee', name: fd.get('name').trim(), email, password: fd.get('password')||'Welcome123',
        status:'approved', createdAt: todayStr(), theme:'light', photo:null,
        studentId: fd.get('studentId')||'', campus: fd.get('campus')||'', program: fd.get('program')||'', block: fd.get('block')||'',
        company: fd.get('company')||'', supervisor: fd.get('supervisor')||'', coordinatorId: user.id, requiredHours: Number(fd.get('requiredHours'))||486,
        active:true, archived:false, addedByCoordinator:true
      };
      DB.users.push(nu);
      await saveDB('users');
      await pushAudit('Added trainee', nu.name, `Added by coordinator ${user.name}`);
    } else {
      const t = DB.users.find(u=>u.id===ui.modal.id);
      if(t){
        t.name = fd.get('name').trim(); t.email = email; t.studentId = fd.get('studentId')||''; t.campus = fd.get('campus')||'';
        t.program = fd.get('program')||''; t.block = fd.get('block')||''; t.company = fd.get('company')||''; t.supervisor = fd.get('supervisor')||'';
        t.requiredHours = Number(fd.get('requiredHours'))||486;
        const pw = fd.get('password'); if(pw) t.password = pw;
        await saveDB('users');
        await pushAudit('Updated trainee', t.name, `Updated by coordinator ${user.name}`);
      }
    }
    ui.modal=null; render();
  };
}

/* ================= INIT ================= */
(async function init(){
  document.getElementById('app').innerHTML = `<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;color:#6B6E76;font-family:Inter,sans-serif;">Loading OJT Monitoring System…</div>`;
  try{ await loadDB(); render(); }
  catch(e){
    console.error('Initialization failed', e);
    if(!DB.users) DB.users=[];
    if(!DB.institution) DB.institution = { schoolName:'Your Institution Name', campus:'', address:'', tagline:'', logo:null };
    ui.authError='Unable to connect to the server. Start the backend and verify the PostgreSQL connection.';
    render();
  }
})();
