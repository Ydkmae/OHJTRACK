/* OHJtrack Administrator Dashboard */

/* ================= ADMIN ================= */
function renderAdmin(user){
  if(ui.adminTab==='approvals') return renderAdminApprovals();
  if(ui.adminTab==='users') return renderAdminUsers();
  if(ui.adminTab==='institution') return renderAdminInstitution();
  return renderAdminOverview();
}
function renderAdminOverview(){
  const pending = pendingUsers().length;
  const trainees = traineesAll().length;
  const coords = coordinatorsOf().length;
  const recent = pendingUsers().slice(0,5);
  return `
  <div class="page-head"><div><div class="eyebrow">Admin</div><h1>Program Overview</h1><p>Registration approvals and system-wide activity at a glance.</p></div></div>
  <div class="stat-grid">
    <div class="stat-card accent"><div class="num">${pending}</div><div class="lbl">Pending approvals</div></div>
    <div class="stat-card"><div class="num">${trainees}</div><div class="lbl">Registered trainees</div></div>
    <div class="stat-card"><div class="num">${coords}</div><div class="lbl">Coordinators</div></div>
    <div class="stat-card"><div class="num">${DB.documents.length + DB.weeklyReports.length}</div><div class="lbl">Documents on file</div></div>
  </div>
  <div class="card">
    <div class="card-head"><h2>Awaiting Your Approval</h2><button class="btn btn-outline btn-sm" data-nav="approvals">View all</button></div>
    <div class="card-body">
      <table>
        <thead><tr><th>Name</th><th>Role</th><th>Email</th><th>Submitted</th><th></th></tr></thead>
        <tbody>${recent.length? recent.map(u=>adminUserRow(u)).join('') : `<tr><td colspan="5" class="empty-row">No pending registrations. All caught up.</td></tr>`}</tbody>
      </table>
    </div>
  </div>`;
}
function adminUserRow(u){
  return `<tr>
    <td><strong>${esc(u.name)}</strong></td>
    <td style="text-transform:capitalize">${u.role}</td>
    <td>${esc(u.email)}</td>
    <td>${u.createdAt}</td>
    <td style="display:flex;gap:6px;">
      <button class="btn btn-green btn-sm" data-approve="${u.id}">Approve</button>
      <button class="btn btn-red btn-sm" data-reject="${u.id}">Reject</button>
    </td>
  </tr>`;
}
function renderAdminApprovals(){
  const pending = pendingUsers();
  return `
  <div class="page-head"><div><div class="eyebrow">Admin</div><h1>Registration Approvals</h1><p>Review and approve coordinator and trainee sign-ups.</p></div></div>
  <div class="card"><div class="card-body">
    <table>
      <thead><tr><th>Name</th><th>Role</th><th>Email</th><th>Details</th><th>Submitted</th><th></th></tr></thead>
      <tbody>${pending.length? pending.map(u=>`
        <tr>
          <td><strong>${esc(u.name)}</strong></td>
          <td style="text-transform:capitalize">${u.role}</td>
          <td>${esc(u.email)}</td>
          <td class="doc-notes">${u.role==='trainee'? esc([u.program,u.company].filter(Boolean).join(' &middot; ')) : esc(u.department||'—')}</td>
          <td>${u.createdAt}</td>
          <td style="display:flex;gap:6px;">
            <button class="btn btn-green btn-sm" data-approve="${u.id}">Approve</button>
            <button class="btn btn-red btn-sm" data-reject="${u.id}">Reject</button>
          </td>
        </tr>`).join('') : `<tr><td colspan="6" class="empty-row">No pending registrations.</td></tr>`}</tbody>
    </table>
  </div></div>`;
}
function renderAdminUsers(){
  const all = DB.users.filter(u=>u.role!=='admin');
  return `
  <div class="page-head"><div><div class="eyebrow">Admin</div><h1>All Users</h1><p>Every coordinator and trainee account in the system.</p></div></div>
  <div class="card"><div class="card-body">
    <table>
      <thead><tr><th>Name</th><th>Role</th><th>Email</th><th>Status</th><th></th></tr></thead>
      <tbody>${all.length? all.map(u=>`
        <tr>
          <td><strong>${esc(u.name)}</strong></td>
          <td style="text-transform:capitalize">${u.role}</td>
          <td>${esc(u.email)}</td>
          <td><span class="badge ${u.status}">${u.status}</span></td>
          <td style="display:flex;gap:6px;">
            ${u.status!=='approved'?`<button class="btn btn-green btn-sm" data-approve="${u.id}">Approve</button>`:''}
            ${u.status!=='rejected'?`<button class="btn btn-red btn-sm" data-reject="${u.id}">Reject</button>`:''}
          </td>
        </tr>`).join('') : `<tr><td colspan="5" class="empty-row">No users registered yet.</td></tr>`}</tbody>
    </table>
  </div></div>`;
}
function renderAdminInstitution(){
  const inst = DB.institution || {};
  return `
  <div class="page-head"><div><div class="eyebrow">Admin</div><h1>Institution Details</h1><p>Used as the letterhead on printed DTRs and reports.</p></div></div>
  <div class="card"><div class="card-body">
    <form id="instForm">
      <div class="photo-pick">
        <div class="seal" style="width:56px;height:56px;">${inst.logo?`<img src="${inst.logo}">`:'SEAL'}</div>
        <label class="btn btn-outline btn-sm" style="display:inline-block;">Upload Seal / Logo<input type="file" id="instLogoInput" accept="image/*" style="display:none;"></label>
      </div>
      <div class="form-grid">
        <div class="field"><label>School / University Name</label><input type="text" name="schoolName" value="${esc(inst.schoolName||'')}"></div>
        <div class="field"><label>Campus</label><input type="text" name="campus" value="${esc(inst.campus||'')}"></div>
        <div class="field"><label>Address</label><input type="text" name="address" value="${esc(inst.address||'')}"></div>
        <div class="field"><label>Tagline</label><input type="text" name="tagline" value="${esc(inst.tagline||'')}"></div>
      </div>
      <button type="submit" class="btn btn-gold">Save Institution Details</button>
    </form>
  </div></div>`;
}
function bindAdminEvents(){
  document.querySelectorAll('[data-approve]').forEach(b=> b.onclick = async ()=>{
    const u = DB.users.find(x=>x.id===b.dataset.approve); if(u){ u.status='approved'; await saveDB('users'); render(); }
  });
  document.querySelectorAll('[data-reject]').forEach(b=> b.onclick = async ()=>{
    const u = DB.users.find(x=>x.id===b.dataset.reject); if(u){ u.status='rejected'; await saveDB('users'); render(); }
  });
  const instForm = document.getElementById('instForm');
  if(instForm) instForm.onsubmit = async (e)=>{
    e.preventDefault();
    const fd = new FormData(instForm);
    DB.institution = {
      ...DB.institution,
      schoolName: fd.get('schoolName')||'', campus: fd.get('campus')||'',
      address: fd.get('address')||'', tagline: fd.get('tagline')||''
    };
    await saveDB('institution'); render();
  };
  const logoInput = document.getElementById('instLogoInput');
  if(logoInput) logoInput.onchange = ()=>{
    const f = logoInput.files[0]; if(!f) return;
    const reader = new FileReader();
    reader.onload = async ()=>{ DB.institution.logo = reader.result; await saveDB('institution'); render(); };
    reader.readAsDataURL(f);
  };
}
