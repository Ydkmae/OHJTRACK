/* OHJtrack OJT Coordinator Dashboard */

/* ================= COORDINATOR ================= */
function renderCoordinator(user){
  if(ui.coordTrackTab==='announcements') return renderCoordAnnouncements(user);
  if(ui.coordTrackTab==='trainees') return renderCoordTrainees(user);
  if(ui.coordTrackTab==='companies') return renderCoordCompanies(user);
  if(ui.coordTrackTab==='letters') return renderCoordLetters(user);
  if(ui.coordTrackTab==='weeklyreports') return renderCoordWeeklyReports(user);
  if(ui.coordTrackTab==='archive') return renderCoordArchive(user);
  return renderCoordOverview(user);
}
function renderCoordOverview(user){
  const trainees = traineesActive();
  const pendingLetters = DB.letters.filter(l=>l.status==='pending').length;
  const pendingReports = DB.weeklyReports.filter(r=>r.status==='pending').length;
  const companies = [...new Set(trainees.map(t=>t.company).filter(Boolean))];
  const recentAnn = DB.announcements.slice(0,3);
  return `
  <div class="page-head"><div><div class="eyebrow">Coordinator</div><h1>Welcome, ${esc(user.name.split(' ')[0])}</h1><p>Monitor trainee submissions and program activity.</p></div></div>
  <div class="stat-grid">
    <div class="stat-card"><div class="num">${trainees.length}</div><div class="lbl">Active trainees</div></div>
    <div class="stat-card accent"><div class="num">${pendingLetters}</div><div class="lbl">Letters to review</div></div>
    <div class="stat-card accent"><div class="num">${pendingReports}</div><div class="lbl">Reports to grade</div></div>
    <div class="stat-card"><div class="num">${companies.length}</div><div class="lbl">Partner companies</div></div>
  </div>
  <div class="card">
    <div class="card-head"><h2>Recent Announcements</h2><button class="btn btn-outline btn-sm" data-nav="announcements">Manage</button></div>
    <div class="card-body">
      ${recentAnn.length? recentAnn.map(a=>`<div style="margin-bottom:10px;"><strong>${esc(a.title)}</strong><div class="doc-notes">${esc(a.message)}</div><div class="notif-time">${timeAgo(a.createdAt)} &middot; sent to ${a.audienceCount} trainee${a.audienceCount===1?'':'s'}</div></div>`).join('') : `<div class="empty-row">No announcements yet.</div>`}
    </div>
  </div>`;
}
function renderCoordAnnouncements(user){
  return `
  <div class="page-head"><div><div class="eyebrow">Coordinator</div><h1>Announcements</h1><p>Post updates &mdash; trainees are notified in-app and via email.</p></div></div>
  <div class="card"><div class="card-head"><h2>New Announcement</h2></div>
    <div class="card-body">
      <form id="annForm">
        <div class="field"><label>Title</label><input type="text" name="title" required placeholder="e.g. Deadline for Weekly Reports"></div>
        <div class="field"><label>Message</label><textarea name="message" required placeholder="Write your announcement..."></textarea></div>
        <button type="submit" class="btn btn-gold">Post &amp; Notify Trainees</button>
      </form>
    </div>
  </div>
  <div class="card"><div class="card-head"><h2>Sent Announcements</h2></div>
    <div class="card-body">
      <table>
        <thead><tr><th>Title</th><th>Message</th><th>Recipients</th><th>Posted</th></tr></thead>
        <tbody>${DB.announcements.length? DB.announcements.map(a=>`
          <tr><td><strong>${esc(a.title)}</strong></td><td class="doc-notes">${esc(a.message)}</td><td>${a.audienceCount} trainee${a.audienceCount===1?'':'s'} emailed</td><td>${timeAgo(a.createdAt)}</td></tr>
        `).join('') : `<tr><td colspan="4" class="empty-row">No announcements yet.</td></tr>`}</tbody>
      </table>
    </div>
  </div>`;
}
function groupTrainees(){
  const groups = {};
  traineesActive().forEach(t=>{
    const key = (t.program||'Unassigned Program')+' — '+(t.block||'No Block');
    (groups[key] = groups[key]||[]).push(t);
  });
  return groups;
}
function renderCoordTrainees(user){
  const groups = groupTrainees();
  const keys = Object.keys(groups).sort();
  return `
  <div class="page-head">
    <div><div class="eyebrow">Coordinator</div><h1>Trainee Management</h1><p>Grouped by program and block.</p></div>
    <div class="head-actions"><button class="btn btn-gold" data-action="addTrainee">+ Add Trainee</button></div>
  </div>
  ${keys.length? keys.map(k=>`
    <div class="card">
      <div class="card-head"><h2>${esc(k)}</h2><span class="badge info">${groups[k].length} trainee${groups[k].length===1?'':'s'}</span></div>
      <div class="card-body">
        <table>
          <thead><tr><th>ID #</th><th>Name</th><th>Company</th><th>Hours Logged</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${groups[k].map(t=>{
              const hrs = lifetimeHours(t.id);
              return `<tr>
                <td class="doc-notes">${esc(t.studentId||t.id.slice(-6).toUpperCase())}</td>
                <td><strong>${esc(t.name)}</strong><div class="doc-notes">${esc(t.email)}</div></td>
                <td>${esc(t.company||'—')}</td>
                <td>${hrs.toFixed(1)} / ${t.requiredHours||486} hrs</td>
                <td><button class="toggle-switch ${t.active!==false?'on':''}" data-toggleactive="${t.id}" title="Toggle active status"><span class="knob"></span></button>
                    <span class="badge ${t.active!==false?'active':'inactive'}" style="margin-left:6px;">${t.active!==false?'Active':'Inactive'}</span></td>
                <td style="display:flex;gap:6px;">
                  <button class="btn btn-outline btn-sm" data-edittrainee="${t.id}">Edit</button>
                  <button class="btn btn-red btn-sm" data-deletetrainee="${t.id}">Remove</button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`).join('') : `<div class="card"><div class="card-body empty-row">No trainees yet. Add one to get started.</div></div>`}
  `;
}
function renderCoordCompanies(user){
  const trainees = traineesActive();
  const byCompany = {};
  trainees.forEach(t=>{ const c = t.company||'Unassigned'; (byCompany[c]=byCompany[c]||[]).push(t); });
  const names = Object.keys(byCompany).sort();
  return `
  <div class="page-head"><div><div class="eyebrow">Coordinator</div><h1>Companies</h1><p>Partner companies based on trainee registrations.</p></div></div>
  ${names.length? names.map(c=>`
    <div class="company-card">
      <div class="ch"><strong>${esc(c)}</strong><span class="badge info">${byCompany[c].length} trainee${byCompany[c].length===1?'':'s'}</span></div>
      <div class="card-body">
        <table>
          <thead><tr><th>Name</th><th>Program / Block</th><th>Hours Logged</th></tr></thead>
          <tbody>${byCompany[c].map(t=>`<tr><td>${esc(t.name)}</td><td>${esc(t.program||'—')} ${t.block?'/ '+esc(t.block):''}</td><td>${lifetimeHours(t.id).toFixed(1)} hrs</td></tr>`).join('')}</tbody>
        </table>
      </div>
    </div>`).join('') : `<div class="card"><div class="card-body empty-row">No companies on file yet.</div></div>`}
  `;
}
function renderCoordLetters(user){
  const filter = ui.coordLetterFilter;
  let letters = filter==='all'? DB.letters : DB.letters.filter(l=>l.status===filter);
  letters = [...letters].sort((a,b)=>b.submittedAt.localeCompare(a.submittedAt));
  const byCompany = {};
  DB.letters.filter(l=>l.status==='pending').forEach(l=>{
    const t = DB.users.find(u=>u.id===l.traineeId); const c = t?t.company||'Unassigned':'Unassigned';
    byCompany[c] = byCompany[c] || {ot:0, excuse:0};
    if(l.type==='OT') byCompany[c].ot++; else byCompany[c].excuse++;
  });
  const compNames = Object.keys(byCompany);
  return `
  <div class="page-head"><div><div class="eyebrow">Coordinator</div><h1>Trainee Letters</h1><p>Approve or decline OT and excuse letters.</p></div></div>
  <div class="card"><div class="card-head"><h2>Pending by Company</h2></div>
    <div class="card-body">
      <table>
        <thead><tr><th>Company</th><th>OT Letters Pending</th><th>Excuse Letters Pending</th></tr></thead>
        <tbody>${compNames.length? compNames.map(c=>`<tr><td>${esc(c)}</td><td>${byCompany[c].ot}</td><td>${byCompany[c].excuse}</td></tr>`).join('') : `<tr><td colspan="3" class="empty-row">Nothing pending.</td></tr>`}</tbody>
      </table>
    </div>
  </div>
  <div class="pill-tabs">${['pending','approved','declined','all'].map(f=>`<button class="pill-tab ${filter===f?'active':''}" data-letterfilter="${f}">${f[0].toUpperCase()+f.slice(1)}</button>`).join('')}</div>
  <div class="card"><div class="card-body">
    <table>
      <thead><tr><th>Trainee</th><th>Type</th><th>Date</th><th>Reason</th><th>Status</th><th></th></tr></thead>
      <tbody>${letters.length? letters.map(l=>{
        const t = DB.users.find(u=>u.id===l.traineeId);
        return `<tr>
          <td>${esc(t?t.name:'—')}</td>
          <td><span class="badge info">${l.type}</span></td>
          <td>${l.date}</td>
          <td class="doc-notes">${esc(l.reason)}${l.remark?`<br><em>Remark: ${esc(l.remark)}</em>`:''}</td>
          <td><span class="badge ${l.status}">${l.status}</span></td>
          <td style="display:flex;gap:6px;">
            <button class="btn btn-green btn-sm" data-letterapprove="${l.id}" ${l.status==='approved'?'disabled':''}>Approve</button>
            <button class="btn btn-red btn-sm" data-letterdecline="${l.id}" ${l.status==='declined'?'disabled':''}>Decline</button>
          </td>
        </tr>`;
      }).join('') : `<tr><td colspan="6" class="empty-row">No letters in this filter.</td></tr>`}</tbody>
    </table>
  </div></div>`;
}
function weekKeyOf(r){ return r.startDate+'_'+r.endDate; }
function renderCoordWeeklyReports(user){
  const groups = {};
  DB.weeklyReports.forEach(r=>{ const k = weekKeyOf(r); (groups[k]=groups[k]||[]).push(r); });
  const weekKeys = Object.keys(groups).sort((a,b)=> a.split('_')[0].localeCompare(b.split('_')[0]));
  return `
  <div class="page-head"><div><div class="eyebrow">Coordinator</div><h1>Weekly Reports</h1><p>Grade trainee submissions, grouped by reporting week.</p></div></div>
  ${weekKeys.length? weekKeys.map((k,idx)=>{
    const reports = groups[k].sort((a,b)=>a.submittedAt.localeCompare(b.submittedAt));
    const [start,end] = k.split('_');
    const passed = reports.filter(r=>r.status==='passed').length;
    return `
    <div class="week-block">
      <h3>Week ${idx+1}</h3>
      <div class="wsub">${fmtDateShort(start)} &ndash; ${fmtDateShort(end)} &middot; ${reports.length} submission${reports.length===1?'':'s'} &middot; ${passed} passed</div>
      <div class="card"><div class="card-body">
        <table>
          <thead><tr><th>Trainee</th><th>Title</th><th>Attachment</th><th>Status</th><th>Grade / Feedback</th><th></th></tr></thead>
          <tbody>${reports.map(r=>{
            const t = DB.users.find(u=>u.id===r.traineeId);
            return `<tr>
              <td>${esc(t?t.name:'—')}</td>
              <td><strong>${esc(r.title)}</strong><div class="doc-notes">${esc((r.content||'').slice(0,60))}${(r.content||'').length>60?'…':''}</div></td>
              <td>${r.attachmentName? `<a href="${r.attachment}" download="${esc(r.attachmentName)}" class="btn btn-outline btn-sm">${esc(r.attachmentName.slice(0,16))}</a>` : '—'}</td>
              <td><span class="badge ${r.status}">${r.status}</span></td>
              <td class="doc-notes">${r.score!=null? 'Score: '+r.score+'<br>':''}${esc(r.feedback||'')}</td>
              <td style="display:flex;flex-direction:column;gap:4px;">
                <button class="btn btn-green btn-sm" data-gradereport="${r.id}" data-grade="passed">Mark Passed</button>
                <button class="btn btn-red btn-sm" data-gradereport="${r.id}" data-grade="failed">Mark Failed</button>
              </td>
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div></div>
    </div>`;
  }).join('') : `<div class="card"><div class="card-body empty-row">No weekly reports submitted yet.</div></div>`}
  `;
}
function renderCoordArchive(user){
  const tab = ui.coordArchiveTab;
  const archived = traineesAll().filter(t=>t.archived);
  return `
  <div class="page-head"><div><div class="eyebrow">Coordinator</div><h1>Archive</h1><p>Soft-deleted trainees and the full update history.</p></div></div>
  <div class="pill-tabs">
    <button class="pill-tab ${tab==='trainees'?'active':''}" data-archivetab="trainees">Archived Trainees</button>
    <button class="pill-tab ${tab==='log'?'active':''}" data-archivetab="log">Update History</button>
  </div>
  ${tab==='trainees'? `
  <div class="card"><div class="card-body">
    <table>
      <thead><tr><th>Name</th><th>Program / Block</th><th>Company</th><th></th></tr></thead>
      <tbody>${archived.length? archived.map(t=>`
        <tr><td>${esc(t.name)}</td><td>${esc(t.program||'—')} ${t.block?'/ '+esc(t.block):''}</td><td>${esc(t.company||'—')}</td>
        <td><button class="btn btn-green btn-sm" data-restoretrainee="${t.id}">Restore</button></td></tr>
      `).join('') : `<tr><td colspan="4" class="empty-row">No archived trainees.</td></tr>`}</tbody>
    </table>
  </div></div>` : `
  <div class="card"><div class="card-body">
    <table>
      <thead><tr><th>Action</th><th>Target</th><th>By</th><th>Details</th><th>When</th></tr></thead>
      <tbody>${DB.auditLog.length? DB.auditLog.map(l=>`
        <tr><td><strong>${esc(l.action)}</strong></td><td>${esc(l.targetName)}</td><td>${esc(l.actorName)}</td><td class="doc-notes">${esc(l.details)}</td><td>${timeAgo(l.ts)}</td></tr>
      `).join('') : `<tr><td colspan="5" class="empty-row">No update history yet.</td></tr>`}</tbody>
    </table>
  </div></div>`}
  `;
}
function bindCoordinatorEvents(user){
  document.querySelectorAll('[data-action="addTrainee"]').forEach(b=> b.onclick=()=>{ ui.modal={type:'addTrainee', error:''}; render(); });
  document.querySelectorAll('[data-edittrainee]').forEach(b=> b.onclick=()=>{ ui.modal={type:'editTrainee', id:b.dataset.edittrainee, error:''}; render(); });
  document.querySelectorAll('[data-deletetrainee]').forEach(b=> b.onclick=async ()=>{
    const t = DB.users.find(u=>u.id===b.dataset.deletetrainee);
    if(t){ t.archived = true; await saveDB('users'); await pushAudit('Soft-deleted trainee', t.name, `Removed by ${user.name}`); render(); }
  });
  document.querySelectorAll('[data-toggleactive]').forEach(b=> b.onclick=async ()=>{
    const t = DB.users.find(u=>u.id===b.dataset.toggleactive);
    if(t){ t.active = t.active===false? true:false; await saveDB('users'); await pushAudit(t.active?'Set active':'Set inactive', t.name, `By ${user.name}`); render(); }
  });
  document.querySelectorAll('[data-restoretrainee]').forEach(b=> b.onclick=async ()=>{
    const t = DB.users.find(u=>u.id===b.dataset.restoretrainee);
    if(t){ t.archived=false; await saveDB('users'); await pushAudit('Restored trainee', t.name, `Restored by ${user.name}`); render(); }
  });
  document.querySelectorAll('[data-archivetab]').forEach(b=> b.onclick=()=>{ ui.coordArchiveTab=b.dataset.archivetab; render(); });
  document.querySelectorAll('[data-letterfilter]').forEach(b=> b.onclick=()=>{ ui.coordLetterFilter=b.dataset.letterfilter; render(); });
  document.querySelectorAll('[data-letterapprove]').forEach(b=> b.onclick=async ()=>{
    const l = DB.letters.find(x=>x.id===b.dataset.letterapprove);
    if(l){ l.status='approved'; l.remark=''; await saveDB('letters');
      pushNotification(l.traineeId, `${l.type} Letter Approved`, `Your ${l.type} letter for ${l.date} was approved.`, 'letter');
      await saveDB('notifications'); render(); }
  });
  document.querySelectorAll('[data-letterdecline]').forEach(b=> b.onclick=async ()=>{
    const l = DB.letters.find(x=>x.id===b.dataset.letterdecline);
    if(l){ const remark = prompt('Reason for declining (optional):','')||'';
      l.status='declined'; l.remark=remark; await saveDB('letters');
      pushNotification(l.traineeId, `${l.type} Letter Declined`, `Your ${l.type} letter for ${l.date} was declined.${remark?' Reason: '+remark:''}`, 'letter');
      await saveDB('notifications'); render(); }
  });
  document.querySelectorAll('[data-gradereport]').forEach(b=> b.onclick=async ()=>{
    const r = DB.weeklyReports.find(x=>x.id===b.dataset.gradereport);
    if(r){
      r.status = b.dataset.grade;
      const score = prompt('Score (0-100), optional:', r.score||'');
      if(score!==null && score!=='') r.score = Number(score);
      const feedback = prompt('Feedback for the trainee (optional):', r.feedback||'')||'';
      r.feedback = feedback; r.gradedAt = nowIso();
      await saveDB('weeklyReports');
      pushNotification(r.traineeId, `Weekly Report Graded: ${r.title}`, `Your report was marked ${r.status}.${feedback?' Feedback: '+feedback:''}`, 'report');
      await saveDB('notifications'); render();
    }
  });
  const annForm = document.getElementById('annForm');
  if(annForm) annForm.onsubmit = async (e)=>{
    e.preventDefault();
    const fd = new FormData(annForm);
    const title = fd.get('title').trim(), message = fd.get('message').trim();
    const audience = traineesActive();
    DB.announcements.unshift({ id: uid('ann'), coordinatorId:user.id, title, message, createdAt: nowIso(), audienceCount: audience.length });
    audience.forEach(t=> pushNotification(t.id, title, message, 'announcement'));
    await saveDB('announcements'); await saveDB('notifications');
    render();
  };
}
