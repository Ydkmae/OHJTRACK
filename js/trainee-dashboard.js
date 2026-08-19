/* OHJtrack Trainee Dashboard */

/* ================= TRAINEE ================= */
function renderTrainee(user){
  if(ui.traineeTab==='notifications') return renderTraineeNotifications(user);
  if(ui.traineeTab==='dtr') return renderTraineeDtr(user);
  if(ui.traineeTab==='weeklyreport') return renderTraineeWeeklyReport(user);
  if(ui.traineeTab==='letters') return renderTraineeLetters(user);
  if(ui.traineeTab==='history') return renderTraineeHistory(user);
  if(ui.traineeTab==='settings') return renderTraineeSettings(user);
  return renderTraineeOverview(user);
}
function renderTraineeOverview(user){
  const rec = getOrCreateDtr(user.id, ui.dtrMonth);
  const agg = monthAggregate(rec);
  const required = user.requiredHours||486;
  const lifetime = lifetimeHours(user.id);
  const remaining = Math.max(0, required-lifetime);
  const pct = Math.min(100, Math.round((lifetime/required)*100));
  const today = todayStr();
  const todayEntry = rec.entries[String(new Date().getDate())];
  const todayHrs = computeDayHours(todayEntry);
  const status = todayHrs.total>0 ? 'Present' : 'Not yet logged';
  return `
  <div class="page-head"><div><div class="eyebrow">Trainee</div><h1>Welcome, ${esc(user.name.split(' ')[0])}</h1><p>Your OJT progress at a glance.</p></div></div>
  <div class="stat-grid">
    <div class="stat-card accent"><div class="num">${pct}%</div><div class="lbl">Overall progress</div><div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div></div>
    <div class="stat-card"><div class="num">${remaining.toFixed(1)}</div><div class="lbl">Hours remaining</div></div>
    <div class="stat-card"><div class="num">${agg.regular.toFixed(1)}</div><div class="lbl">Regular hrs (this month)</div></div>
    <div class="stat-card"><div class="num">${agg.ot.toFixed(1)}</div><div class="lbl">Overtime hrs (this month)</div></div>
    <div class="stat-card"><div class="num">${agg.daysLogged}</div><div class="lbl">Days logged this month</div></div>
    <div class="stat-card"><div class="num" style="font-size:16px;">${status}</div><div class="lbl">Attendance status today</div></div>
  </div>
  <div class="card"><div class="card-head"><h2>Internship Profile</h2></div>
    <div class="card-body">
      <table><tbody>
        <tr><td style="color:var(--text-muted)">Campus</td><td>${esc(user.campus||'—')}</td></tr>
        <tr><td style="color:var(--text-muted)">Program</td><td>${esc(user.program||'—')}</td></tr>
        <tr><td style="color:var(--text-muted)">Block / Section</td><td>${esc(user.block||'—')}</td></tr>
        <tr><td style="color:var(--text-muted)">HTE / Company</td><td>${esc(user.company||'—')}</td></tr>
        <tr><td style="color:var(--text-muted)">Required Hours</td><td>${required}</td></tr>
        <tr><td style="color:var(--text-muted)">Total Hours Logged (lifetime)</td><td>${lifetime.toFixed(1)}</td></tr>
      </tbody></table>
    </div>
  </div>`;
}
function renderTraineeNotifications(user){
  const notifs = DB.notifications.filter(n=>n.traineeId===user.id);
  return `
  <div class="page-head"><div><div class="eyebrow">Trainee</div><h1>Notifications</h1><p>Announcements from your coordinator and system updates.</p></div>
    ${notifs.some(n=>!n.read)?`<button class="btn btn-outline btn-sm" data-action="markallread">Mark all as read</button>`:''}
  </div>
  <div class="card"><div class="card-body" style="padding:0;">
    ${notifs.length? notifs.map(n=>`
      <div class="notif-item ${n.read?'read':'unread'}">
        <div class="notif-dot"></div>
        <div><div class="notif-title">${esc(n.title)}</div><div class="notif-msg">${esc(n.message)}</div><div class="notif-time">${timeAgo(n.createdAt)} &middot; sent to ${esc(user.email)}</div></div>
      </div>`).join('') : `<div class="empty-row">No notifications yet.</div>`}
  </div></div>`;
}
function renderTraineeDtr(user){
  const mk = ui.dtrMonth;
  const rec = getOrCreateDtr(user.id, mk);
  const nDays = daysInMonth(mk);
  let rows = '';
  let totalAll = 0;
  for(let d=1; d<=nDays; d++){
    const e = rec.entries[d] || {};
    const h = computeDayHours(e);
    totalAll += h.total;
    rows += `<tr>
      <td class="day-cell">${d}</td>
      <td><input type="time" data-day="${d}" data-field="amIn" value="${e.amIn||''}"></td>
      <td><input type="time" data-day="${d}" data-field="amOut" value="${e.amOut||''}"></td>
      <td><input type="time" data-day="${d}" data-field="pmIn" value="${e.pmIn||''}"></td>
      <td><input type="time" data-day="${d}" data-field="pmOut" value="${e.pmOut||''}"></td>
      <td><input type="time" data-day="${d}" data-field="otIn" value="${e.otIn||''}"></td>
      <td><input type="time" data-day="${d}" data-field="otOut" value="${e.otOut||''}"></td>
      <td class="hrs-cell">${h.total? h.total.toFixed(2):''}</td>
      <td>
        ${e.photo?`<img src="${e.photo}" class="thumb" data-viewphoto="${e.photo}">`:''}
        <label class="btn btn-outline photo-btn" style="cursor:pointer;">${e.photo?'Change':'+'}<input type="file" accept="image/*" data-photoday="${d}" style="display:none;"></label>
      </td>
    </tr>`;
  }
  const monthOptions = lastSixMonths().map(mk2=>`<option value="${mk2}" ${mk2===mk?'selected':''}>${monthLabel(mk2)}</option>`).join('');
  const agg = monthAggregate(rec);
  return `
  <div class="page-head"><div><div class="eyebrow">Trainee</div><h1>Attendance / Daily Time Record</h1><p>Log your daily attendance with optional photo proof.</p></div>
    <div style="display:flex;gap:10px;align-items:center;">
      <select id="dtrMonthSelect" class="small-select">${monthOptions}</select>
      <button class="btn btn-ink" data-action="printdtr">Print DTR</button>
    </div>
  </div>
  <div class="stat-grid">
    <div class="stat-card"><div class="num">${agg.regular.toFixed(1)}</div><div class="lbl">Regular hours</div></div>
    <div class="stat-card"><div class="num">${agg.ot.toFixed(1)}</div><div class="lbl">Overtime hours</div></div>
    <div class="stat-card"><div class="num">${agg.total.toFixed(1)}</div><div class="lbl">Total hours this month</div></div>
    <div class="stat-card"><div class="num">${agg.daysLogged}</div><div class="lbl">Days logged</div></div>
  </div>
  <div class="card"><div class="card-head"><h2>Daily Time Record &mdash; ${monthLabel(mk)}</h2></div>
    <div class="card-body" style="overflow-x:auto;">
      <div class="dtr-meta">
        <div><span>Name:</span> ${esc(user.name)}</div>
        <div><span>Course:</span> ${esc(user.program||'—')}</div>
        <div><span>Agency:</span> ${esc(user.company||'—')}</div>
        <div><span>Month:</span> ${monthLabel(mk)}</div>
        <div><span>Official Hours:</span> ${esc(user.officialHours||'—')}</div>
      </div>
      <table class="dtr-input-table">
        <thead>
          <tr><th rowspan="2">Day</th><th colspan="2">Morning</th><th colspan="2">Afternoon</th><th colspan="2">Overtime</th><th rowspan="2">Total Hours</th><th rowspan="2">Timemark Photo</th></tr>
          <tr><th>In</th><th>Out</th><th>In</th><th>Out</th><th>In</th><th>Out</th></tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td colspan="7" class="total-label">TOTAL HOURS</td><td class="hrs-cell">${totalAll.toFixed(2)}</td><td></td></tr></tfoot>
      </table>
    </div>
  </div>`;
}
function lastSixMonths(){ const arr=[]; const d=new Date(); for(let i=0;i<6;i++){ arr.push(monthKey(new Date(d.getFullYear(), d.getMonth()-i, 1))); } return arr; }

function renderDtrPrintView(user){
  const t = DB.users.find(u=>u.id===ui.printingTrainee) || user;
  const mk = ui.printingMonth || ui.dtrMonth;
  const rec = getOrCreateDtr(t.id, mk) || {entries:{}};
  const inst = DB.institution || {};
  const nDays = daysInMonth(mk);
  let rows=''; let totalAll=0;
  for(let d=1; d<=nDays; d++){
    const e = rec.entries[d] || {};
    const h = computeDayHours(e);
    totalAll += h.total;
    rows += `<tr>
      <td>${d}</td><td>${fmtTime12(e.amIn)}</td><td>${fmtTime12(e.amOut)}</td><td>${fmtTime12(e.pmIn)}</td><td>${fmtTime12(e.pmOut)}</td><td>${fmtTime12(e.otIn)}</td><td>${fmtTime12(e.otOut)}</td>
      <td>${h.total? h.total.toFixed(2):''}</td><td></td>
    </tr>`;
  }
  return `
  <div class="print-toolbar">
    <button class="btn btn-outline" data-action="backfromprint">&larr; Back</button>
    <button class="btn btn-gold" data-action="doprint">Print / Save as PDF</button>
  </div>
  <div id="dtrPrintArea"><div class="official-form">
    <div class="of-head">
      <div class="of-seal">${inst.logo?`<img src="${inst.logo}">`:'SEAL'}</div>
      <div class="of-headtext">
        <div class="rep">Republic of the Philippines</div>
        <div class="uni">${esc(inst.schoolName||'Your Institution Name')}</div>
        ${inst.tagline?`<div class="tag">${esc(inst.tagline)}</div>`:''}
        <div class="campus">${esc(inst.campus||'')}${inst.address?' — '+esc(inst.address):''}</div>
      </div>
      <div style="width:56px;"></div>
    </div>
    <div class="of-title">DAILY  TIME  RECORD</div>
    <div class="of-fields">
      <div class="of-row">
        <div class="of-fill grow"><span class="lbl">Name:</span><span class="val">${esc(t.name)}</span></div>
        <div class="of-fill"><span class="lbl">Course:</span><span class="val">${esc(t.program||'')}</span></div>
      </div>
      <div class="of-row">
        <div class="of-fill grow"><span class="lbl">Agency:</span><span class="val">${esc(t.company||'')}</span></div>
      </div>
      <div class="of-row">
        <div class="of-fill"><span class="lbl">Month:</span><span class="val">${monthLabel(mk)}</span></div>
        <div class="of-fill grow"><span class="lbl">Official Hours:</span><span class="val">${esc(t.officialHours||'')}</span></div>
      </div>
    </div>
    <table class="official">
      <thead>
        <tr><th rowspan="2">Day</th><th colspan="2">Morning</th><th colspan="2">Afternoon</th><th colspan="2">Overtime</th><th rowspan="2">Total Hours</th><th rowspan="2">Certified By</th></tr>
        <tr><th>In</th><th>Out</th><th>In</th><th>Out</th><th>In</th><th>Out</th></tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="7" class="total-label">TOTAL HOURS</td><td class="total-val">${totalAll.toFixed(2)}</td><td></td></tr></tfoot>
    </table>
    <div class="of-cert">I certify on my honor that the above is a true and correct report of the hours of work performed, which was made daily at the time of IN and OUT from office.</div>
    <div class="of-sign">
      <div class="line">STUDENT TRAINEE</div>
      <div class="line">IN-CHARGE</div>
    </div>
  </div></div>`;
}
function renderTraineeWeeklyReport(user){
  const mine = DB.weeklyReports.filter(r=>r.traineeId===user.id).sort((a,b)=>b.submittedAt.localeCompare(a.submittedAt));
  return `
  <div class="page-head"><div><div class="eyebrow">Trainee</div><h1>Weekly Progress Report</h1><p>Submit your weekly report for coordinator grading.</p></div></div>
  <div class="card"><div class="card-head"><h2>Submit New Report</h2></div>
    <div class="card-body">
      <form id="reportForm">
        <div class="form-grid">
          <div class="field"><label>Week Start Date</label><input type="date" name="startDate" required></div>
          <div class="field"><label>Week End Date</label><input type="date" name="endDate" required></div>
        </div>
        <div class="field"><label>Title</label><input type="text" name="title" required placeholder="e.g. Week 1 Progress Report"></div>
        <div class="field"><label>Report Content</label><textarea name="content" required placeholder="Summarize tasks accomplished this week..."></textarea></div>
        <div class="field"><label>Attachment (optional)</label><input type="file" name="attachment" id="reportAttachment"></div>
        <button type="submit" class="btn btn-gold">Submit Report</button>
      </form>
    </div>
  </div>
  <div class="card"><div class="card-head"><h2>My Submissions</h2></div>
    <div class="card-body">
      <table>
        <thead><tr><th>Week</th><th>Title</th><th>Status</th><th>Grade / Feedback</th><th></th></tr></thead>
        <tbody>${mine.length? mine.map(r=>`
          <tr><td>${fmtDateShort(r.startDate)} &ndash; ${fmtDateShort(r.endDate)}</td><td>${esc(r.title)}</td>
          <td><span class="badge ${r.status}">${r.status}</span></td>
          <td class="doc-notes">${r.score!=null?'Score: '+r.score+'<br>':''}${esc(r.feedback||'—')}</td>
          <td>${r.status!=='pending'?`<button class="btn btn-outline btn-sm" data-printreport="${r.id}">Print PDF</button>`:''}</td></tr>
        `).join('') : `<tr><td colspan="5" class="empty-row">No reports submitted yet.</td></tr>`}</tbody>
      </table>
    </div>
  </div>`;
}
function renderReportPrintView(user){
  const r = DB.weeklyReports.find(x=>x.id===ui.reportPrintId);
  if(!r) return `<div class="card-body empty-row">Report not found.</div>`;
  const t = DB.users.find(u=>u.id===r.traineeId) || user;
  const inst = DB.institution || {};
  return `
  <div class="print-toolbar">
    <button class="btn btn-outline" data-action="backfromreportprint">&larr; Back</button>
    <button class="btn btn-gold" data-action="doprint">Print / Save as PDF</button>
  </div>
  <div id="reportPrintArea"><div class="official-form">
    <div class="of-head">
      <div class="of-seal">${inst.logo?`<img src="${inst.logo}">`:'SEAL'}</div>
      <div class="of-headtext">
        <div class="rep">Republic of the Philippines</div>
        <div class="uni">${esc(inst.schoolName||'Your Institution Name')}</div>
        <div class="campus">${esc(inst.campus||'')}</div>
      </div>
      <div style="width:56px;"></div>
    </div>
    <div class="of-title">WEEKLY PROGRESS REPORT</div>
    <div class="of-namewrap"><div class="of-name">${esc(t.name)}</div></div>
    <div class="of-sub">${esc(t.program||'')} ${t.block?'— '+esc(t.block):''}</div>
    <div class="of-meta">
      <div>Company: ${esc(t.company||'—')}</div>
      <div>Period: ${fmtDateShort(r.startDate)} &ndash; ${fmtDateShort(r.endDate)}</div>
    </div>
    <div style="font-weight:700;margin-top:10px;">${esc(r.title)}</div>
    <div class="report-body-print">${esc(r.content)}</div>
    <div class="grade-box">
      <div>Status: <strong>${r.status.toUpperCase()}</strong></div>
      <div>Score: <strong>${r.score!=null? r.score : '—'}</strong></div>
    </div>
    ${r.feedback?`<div style="margin-top:8px;font-size:10.5px;"><em>Coordinator Feedback:</em> ${esc(r.feedback)}</div>`:''}
    <div class="of-sign">
      <div class="line">STUDENT TRAINEE</div>
      <div class="line">OJT COORDINATOR</div>
    </div>
  </div></div>`;
}
function renderTraineeLetters(user){
  const mine = DB.letters.filter(l=>l.traineeId===user.id).sort((a,b)=>b.submittedAt.localeCompare(a.submittedAt));
  return `
  <div class="page-head"><div><div class="eyebrow">Trainee</div><h1>Letters</h1><p>Submit overtime or excuse letters for coordinator approval.</p></div></div>
  <div class="card"><div class="card-head"><h2>Submit a Letter</h2></div>
    <div class="card-body">
      <form id="letterForm">
        <div class="form-grid">
          <div class="field"><label>Type</label><select name="type"><option value="OT">Overtime (OT) Letter</option><option value="Excuse">Excuse Letter</option></select></div>
          <div class="field"><label>Date</label><input type="date" name="date" required></div>
        </div>
        <div class="field"><label>Reason</label><textarea name="reason" required placeholder="Explain your request..."></textarea></div>
        <button type="submit" class="btn btn-gold">Submit Letter</button>
      </form>
    </div>
  </div>
  <div class="card"><div class="card-head"><h2>My Letters</h2></div>
    <div class="card-body">
      <table>
        <thead><tr><th>Type</th><th>Date</th><th>Reason</th><th>Status</th></tr></thead>
        <tbody>${mine.length? mine.map(l=>`
          <tr><td><span class="badge info">${l.type}</span></td><td>${l.date}</td><td class="doc-notes">${esc(l.reason)}${l.remark?`<br><em>Remark: ${esc(l.remark)}</em>`:''}</td><td><span class="badge ${l.status}">${l.status}</span></td></tr>
        `).join('') : `<tr><td colspan="4" class="empty-row">No letters submitted yet.</td></tr>`}</tbody>
      </table>
    </div>
  </div>`;
}
function renderTraineeHistory(user){
  const reports = DB.weeklyReports.filter(r=>r.traineeId===user.id).map(r=>({kind:'Weekly Report', title:r.title, status:r.status, date:r.submittedAt}));
  const letters = DB.letters.filter(l=>l.traineeId===user.id).map(l=>({kind:l.type+' Letter', title:l.reason.slice(0,40), status:l.status, date:l.submittedAt}));
  const all = [...reports, ...letters].sort((a,b)=>b.date.localeCompare(a.date));
  return `
  <div class="page-head"><div><div class="eyebrow">Trainee</div><h1>Document History</h1><p>All your uploaded documents and letters.</p></div></div>
  <div class="card"><div class="card-body">
    <table>
      <thead><tr><th>Type</th><th>Title / Reason</th><th>Status</th><th>Date</th></tr></thead>
      <tbody>${all.length? all.map(x=>`<tr><td>${esc(x.kind)}</td><td>${esc(x.title)}</td><td><span class="badge ${x.status}">${x.status}</span></td><td>${timeAgo(x.date)}</td></tr>`).join('') : `<tr><td colspan="4" class="empty-row">No documents yet.</td></tr>`}</tbody>
    </table>
  </div></div>`;
}
function renderTraineeSettings(user){
  return `
  <div class="page-head"><div><div class="eyebrow">Trainee</div><h1>Settings</h1><p>Manage your account preferences.</p></div></div>
  <div class="card"><div class="card-head"><h2>Profile</h2></div>
    <div class="card-body">
      <div class="photo-pick">
        <div class="avatar" style="width:56px;height:56px;font-size:16px;">${user.photo?`<img src="${user.photo}">`:initials(user.name)}</div>
        <label class="btn btn-outline btn-sm" style="display:inline-block;">Change Photo<input type="file" accept="image/*" id="profilePhotoInput" style="display:none;"></label>
      </div>
      <form id="profileForm">
        <div class="form-grid">
          <div class="field"><label>Full Name</label><input type="text" name="name" value="${esc(user.name)}"></div>
          <div class="field"><label>Email</label><input type="email" name="email" value="${esc(user.email)}"></div>
          <div class="field"><label>Campus</label><input type="text" name="campus" value="${esc(user.campus||'')}"></div>
          <div class="field"><label>Program</label><input type="text" name="program" value="${esc(user.program||'')}"></div>
          <div class="field"><label>Block / Section</label><input type="text" name="block" value="${esc(user.block||'')}"></div>
          <div class="field"><label>HTE / Company</label><input type="text" name="company" value="${esc(user.company||'')}"></div>
          <div class="field"><label>Official Hours</label><input type="text" name="officialHours" value="${esc(user.officialHours||'')}" placeholder="e.g. 8:00 AM - 5:00 PM"></div>
        </div>
        <button type="submit" class="btn btn-gold">Save Profile</button>
      </form>
      ${ui.settingsMsg?`<div class="success-box" style="margin-top:12px;">${esc(ui.settingsMsg)}</div>`:''}
    </div>
  </div>
  <div class="card"><div class="card-head"><h2>Change Password</h2></div>
    <div class="card-body">
      <form id="pwForm">
        <div class="form-grid">
          <div class="field"><label>Current Password</label><input type="password" name="current" required></div>
          <div class="field"><label>New Password</label><input type="password" name="next" required minlength="6"></div>
        </div>
        <button type="submit" class="btn btn-gold">Update Password</button>
      </form>
      ${ui.pwMsg?`<div class="${ui.pwMsg.startsWith('Password updated')?'success-box':'error-box'}" style="margin-top:12px;">${esc(ui.pwMsg)}</div>`:''}
    </div>
  </div>
  <div class="card"><div class="card-head"><h2>Appearance</h2></div>
    <div class="card-body" style="display:flex;align-items:center;gap:12px;">
      <button class="toggle-switch ${user.theme==='dark'?'on':''}" data-action="toggletheme"><span class="knob"></span></button>
      <span>${user.theme==='dark'?'Dark mode':'Light mode'}</span>
    </div>
  </div>
  <div class="card"><div class="card-body">
    <button class="btn btn-red" data-action="logout">Log Out</button>
  </div></div>`;
}
function bindTraineeEvents(user){
  const monthSelect = document.getElementById('dtrMonthSelect');
  if(monthSelect) monthSelect.onchange = ()=>{ ui.dtrMonth = monthSelect.value; render(); };

  document.querySelectorAll('.dtr-input-table input[type=time]').forEach(inp=>{
    inp.onchange = async ()=>{
      const rec = getOrCreateDtr(user.id, ui.dtrMonth);
      const day = inp.dataset.day, field = inp.dataset.field;
      rec.entries[day] = rec.entries[day] || {};
      rec.entries[day][field] = inp.value;
      await saveDB('dtr'); render();
    };
  });
  document.querySelectorAll('[data-photoday]').forEach(inp=>{
    inp.onchange = ()=>{
      const f = inp.files[0]; if(!f) return;
      const reader = new FileReader();
      reader.onload = async ()=>{
        const rec = getOrCreateDtr(user.id, ui.dtrMonth);
        const day = inp.dataset.photoday;
        rec.entries[day] = rec.entries[day] || {};
        rec.entries[day].photo = reader.result;
        await saveDB('dtr'); render();
      };
      reader.readAsDataURL(f);
    };
  });
  document.querySelectorAll('[data-viewphoto]').forEach(img=>{
    img.onclick = ()=>{ const w = window.open(); if(w) w.document.write('<img src="'+img.dataset.viewphoto+'" style="max-width:100%;">'); };
  });

  const printBtn = document.querySelector('[data-action="printdtr"]');
  if(printBtn) printBtn.onclick = ()=>{ ui.printingTrainee=user.id; ui.printingMonth=ui.dtrMonth; ui.view='dtrPrint'; render(); };
  const backBtn = document.querySelector('[data-action="backfromprint"]');
  if(backBtn) backBtn.onclick = ()=>{ ui.view='dashboard'; render(); };
  const backReportBtn = document.querySelector('[data-action="backfromreportprint"]');
  if(backReportBtn) backReportBtn.onclick = ()=>{ ui.view='dashboard'; render(); };
  const doPrint = document.querySelector('[data-action="doprint"]');
  if(doPrint) doPrint.onclick = ()=> window.print();

  document.querySelectorAll('[data-printreport]').forEach(b=> b.onclick=()=>{ ui.reportPrintId=b.dataset.printreport; ui.view='reportPrint'; render(); });

  const reportForm = document.getElementById('reportForm');
  if(reportForm) reportForm.onsubmit = async (e)=>{
    e.preventDefault();
    const fd = new FormData(reportForm);
    const fileInput = document.getElementById('reportAttachment');
    const f = fileInput.files[0];
    const finish = async (dataUrl, name)=>{
      DB.weeklyReports.push({
        id: uid('rep'), traineeId:user.id, startDate: fd.get('startDate'), endDate: fd.get('endDate'),
        title: fd.get('title').trim(), content: fd.get('content').trim(), attachment: dataUrl||null, attachmentName: name||null,
        status:'pending', score:null, feedback:'', submittedAt: nowIso(), gradedAt:null
      });
      await saveDB('weeklyReports'); render();
    };
    if(f){ const reader = new FileReader(); reader.onload=()=>finish(reader.result, f.name); reader.readAsDataURL(f); }
    else finish(null, null);
  };

  const letterForm = document.getElementById('letterForm');
  if(letterForm) letterForm.onsubmit = async (e)=>{
    e.preventDefault();
    const fd = new FormData(letterForm);
    DB.letters.push({ id: uid('let'), traineeId:user.id, type: fd.get('type'), date: fd.get('date'), reason: fd.get('reason').trim(), status:'pending', remark:'', submittedAt: nowIso() });
    await saveDB('letters'); render();
  };

  document.querySelectorAll('[data-action="markallread"]').forEach(b=> b.onclick=async ()=>{
    DB.notifications.filter(n=>n.traineeId===user.id).forEach(n=>n.read=true);
    await saveDB('notifications'); render();
  });

  const profileForm = document.getElementById('profileForm');
  if(profileForm) profileForm.onsubmit = async (e)=>{
    e.preventDefault();
    const fd = new FormData(profileForm);
    user.name = fd.get('name').trim(); user.email = fd.get('email').trim();
    user.campus = fd.get('campus')||''; user.program = fd.get('program')||''; user.block = fd.get('block')||''; user.company = fd.get('company')||''; user.officialHours = fd.get('officialHours')||'';
    await saveDB('users'); ui.settingsMsg='Profile updated.'; render();
  };
  const photoInput = document.getElementById('profilePhotoInput');
  if(photoInput) photoInput.onchange = ()=>{
    const f = photoInput.files[0]; if(!f) return;
    const reader = new FileReader();
    reader.onload = async ()=>{ user.photo = reader.result; await saveDB('users'); render(); };
    reader.readAsDataURL(f);
  };
  const pwForm = document.getElementById('pwForm');
  if(pwForm) pwForm.onsubmit = async (e)=>{
    e.preventDefault();
    const fd = new FormData(pwForm);
    if(fd.get('current')!==user.password){ ui.pwMsg='Current password is incorrect.'; render(); return; }
    user.password = fd.get('next');
    await saveDB('users'); ui.pwMsg='Password updated successfully.'; render();
  };
  document.querySelectorAll('[data-action="toggletheme"]').forEach(b=> b.onclick=async ()=>{
    user.theme = user.theme==='dark'? 'light':'dark';
    await saveDB('users'); render();
  });
}
