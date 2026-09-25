// ============================================================================
// attendance.js -- part of the পরীক্ষার খাতা frontend, split out of the original
// single inline <script> in index.html for readability. Loaded via plain
// <script src="js/attendance.js"> tags (in the order listed in index.html), which
// all share one global scope in the browser -- exactly like the original
// single script did, so nothing about how functions call each other changes.
// ============================================================================

// ================= ATTENDANCE & FEE TRACKING (name-only, no ID/password needed) =================
async function addStudentRemote(name){
  const slug = slugify(name);
  const res = await postToScript('addStudent', { name, slug });
  return res ? slug : null;
}
async function listStudentsRemote(){
  try{
    const r = await fetch(`${SCRIPT_URL}?action=listStudents`);
    const json = await r.json();
    if(json.status==='success') return json.data;
  }catch(e){}
  return [];
}
async function markAttendanceRemote(slug, dateStr, source){
  const res = await postToScript('markAttendance', { slug, date: dateStr, source: source||'manual' });
  return !!res;
}
async function cancelAttendanceRemote(slug, dateStr){
  const res = await postToScript('cancelAttendance', { slug, date: dateStr });
  return !!res;
}
async function listAttendanceRemote(slug){
  try{
    const r = await fetch(`${SCRIPT_URL}?action=listAttendance&slug=${encodeURIComponent(slug)}`);
    const json = await r.json();
    if(json.status==='success') return json.data;
  }catch(e){}
  return [];
}
async function approveAttendanceRemote(slug, dateStr){
  const res = await postToScript('approveAttendance', { slug, date: dateStr });
  return !!res;
}
function todayStr(){
  const d = new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function monthKeyOf(dateStr){ return dateStr.slice(0,7); }
const BN_MONTHS = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
const BN_WEEKDAYS = ['রবি','সোম','মঙ্গল','বুধ','বৃহ','শুক্র','শনি'];

// ---- Mini calendar builder ----
function buildMiniCalendar(year, month, records, onDayClickFn, navTargetScreen, navCtx){
  window.__calNavCtx = navCtx; // stash instead of inlining (names/records could contain quotes)
  const recByDate = {};
  records.forEach(r=> recByDate[r.date] = r);
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const todayS = todayStr();

  let cells = '';
  for(let i=0;i<startWeekday;i++){ cells += `<div></div>`; }
  for(let d=1; d<=daysInMonth; d++){
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const rec = recByDate[dateStr];
    let bg = '#F5F9FE', color = 'var(--ink)', border = '1px solid var(--rule)';
    if(rec){
      if(rec.source === 'exam'){ bg = '#3B82F6'; color = '#fff'; border = 'none'; }        // blue: confirmed by taking an exam
      else if(rec.status === 'approved'){ bg = 'var(--green)'; color = '#fff'; border = 'none'; } // green: manually confirmed by student
      else if(rec.status === 'pending'){ bg = 'var(--gold)'; color = '#3a2a06'; border = 'none'; } // gold: awaiting student confirmation
    }
    const isToday = dateStr === todayS;
    const clickable = onDayClickFn ? `onclick="${onDayClickFn}('${dateStr}')" style="cursor:pointer;` : `style="cursor:default;`;
    cells += `<div ${clickable} background:${bg}; color:${color}; border:${border}; ${isToday?'outline:2px solid var(--margin-red);':''} border-radius:7px; display:flex; align-items:center; justify-content:center; height:34px; font-size:13px; font-family:var(--font-mono);">${d}</div>`;
  }

  const prevM = month===0 ? 11 : month-1;
  const prevY = month===0 ? year-1 : year;
  const nextM = month===11 ? 0 : month+1;
  const nextY = month===11 ? year+1 : year;

  return `
    <div class="card" style="padding:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <a class="link-back" onclick="goCalNav(${prevY},${prevM},'${navTargetScreen}')">‹</a>
        <b style="font-family:var(--font-display); font-size:16px;">${BN_MONTHS[month]} ${year}</b>
        <a class="link-back" onclick="goCalNav(${nextY},${nextM},'${navTargetScreen}')">›</a>
      </div>
      <div style="display:grid; grid-template-columns:repeat(7,1fr); gap:4px; margin-bottom:6px;">
        ${BN_WEEKDAYS.map(w=>`<div style="text-align:center; font-size:11px; color:var(--pencil); font-weight:600;">${w}</div>`).join('')}
      </div>
      <div style="display:grid; grid-template-columns:repeat(7,1fr); gap:4px;">
        ${cells}
      </div>
      <div style="margin-top:12px; font-size:12px; color:var(--pencil); display:flex; gap:14px; flex-wrap:wrap;">
        <span>🟦 exam দিয়ে confirm</span><span>🟩 নিজে confirm করেছে</span><span>🟨 confirm করার অপেক্ষায়</span>
      </div>
    </div>
  `;
}
window.__calYear = null; window.__calMonth = null;
window.goCalNav = function(y, m, targetScreen){
  window.__calYear = y; window.__calMonth = m;
  go(targetScreen, window.__calNavCtx);
}

// ---- Teacher: attendance dashboard ----
async function renderAttendanceDashboard(){
  window.__calYear = null; window.__calMonth = null;
  app.innerHTML = `${header('উপস্থিতি ও বেতন')}<div class="card center">লোড হচ্ছে...</div>`;
  const [students, sumRes] = await Promise.all([listStudentsRemote(), FEATURE_CLASS_PLAN ? getJson('listClassSummaries', { month: todayStr().slice(0,7) }) : Promise.resolve(null)]); // [NEW]
  window.__attendanceStudents = students;
  const sumBySlug = {};
  ((sumRes && sumRes.status === 'success') ? sumRes.data : []).forEach(x=>{ sumBySlug[x.slug] = x; });

  let studentRows = '';
  if(students.length === 0){
    studentRows = `<div class="empty-state">এখনো কোনো স্টুডেন্ট যোগ করোনি। নিচ থেকে যোগ করো।</div>`;
  } else {
    studentRows = students.map(s=>{
      return `<div class="exam-item">
        <div class="row-top">
          <div><h3 style="margin-bottom:2px;">${escapeHtml(s.name)}</h3>
            ${(()=>{ const c = sumBySlug[s.slug]; if(!c) return ''; if(!c.hasPlan) return `<div class="meta">এই মাসে ক্লাস: ${c.held} দিন · পরিকল্পনা ঠিক করা হয়নি</div>`;
              return `<div class="meta">📘 এই মাস: <b>${c.held}/${c.planned}</b> দিন · ${c.remaining>0 ? `বাকি <b>${c.remaining}</b>` : (c.extraThisMonth>0 ? `extra <b>+${c.extraThisMonth}</b>` : '✓ সম্পূর্ণ')}${c.extraCarriedIn>0 ? ` · আগের extra <b>${c.extraCarriedIn}</b>` : ''}</div>`; })()}
          </div>
        </div>
        <button class="btn btn-outline btn-block" style="margin-top:8px;" onclick="openAttendanceMark('${s.slug}')">📅 ক্যালেন্ডার খোলো</button>
      </div>`;
    }).join('');
  }

  app.innerHTML = `
    ${header('উপস্থিতি ও বেতন')}
    <div class="card">
      <h2>স্টুডেন্ট তালিকা</h2>
      <p class="hint">নতুন স্টুডেন্ট যোগ করো, তারপর ক্যালেন্ডারে ক্লিক করে যেদিন ক্লাস হয়েছে সেটা মার্ক করো। Student শুধু নিজের নাম লিখে ঢুকে সেটা confirm করবে — কোনো ID/পাসওয়ার্ড লাগবে না।</p>
      <div class="row">
        <input type="text" id="newStudentName" placeholder="নতুন স্টুডেন্টের নাম" style="margin-bottom:0;">
        <button class="btn btn-outline" onclick="addNewStudent()">+ যোগ করো</button>
      </div>
      <div style="margin-top:14px;">${studentRows}</div>
    </div>
    <div class="center"><a class="link-back" onclick="go('teacherDashboard')">← ফিরে যাও</a></div>
    ${creditFooter()}
  `;
}
window.addNewStudent = async function(){
  const name = document.getElementById('newStudentName').value.trim();
  if(!name){ toast('নাম লেখো'); return; }
  toast('যোগ করা হচ্ছে...');
  const slug = await addStudentRemote(name);
  if(slug) toast('স্টুডেন্ট যোগ হয়েছে ✅');
  go('attendanceDashboard');
}
window.openAttendanceMark = function(slug){
  const s = (window.__attendanceStudents||[]).find(x=> x.slug === slug);
  go('attendanceMark', { slug, studentName: s ? s.name : slug });
}

async function renderAttendanceMark(slug, studentName, records){
  app.innerHTML = `${header('উপস্থিতি মার্ক করো')}<div class="card center">লোড হচ্ছে...</div>`;
  records = records || await listAttendanceRemote(slug);
  const now = new Date();
  const year = window.__calYear !== null ? window.__calYear : now.getFullYear();
  const month = window.__calMonth !== null ? window.__calMonth : now.getMonth();
  window.__calYear = year; window.__calMonth = month;

  const curMonthKey = todayStr().slice(0,7);
  const approvedThisMonth = records.filter(r=> (r.status==='approved' || r.source==='exam') && monthKeyOf(r.date)===curMonthKey).length;

  const calHtml = buildMiniCalendar(year, month, records, 'teacherToggleDay', 'attendanceMark', { slug, studentName });
  state.records = records; // stash so teacherToggleDay can inspect the clicked day's current state
  const planCardHtml = !FEATURE_CLASS_PLAN ? '' : await buildClassPlanCard(slug, `${year}-${String(month+1).padStart(2,'0')}`, year, month); // [NEW]

  app.innerHTML = `
    ${header('উপস্থিতি মার্ক করো')}
    <div class="card center">
      <h2>${escapeHtml(studentName)}</h2>
      <p class="hint">ফাঁকা দিনে ক্লিক করলে মার্ক হবে। ইতিমধ্যে মার্ক করা দিনে ক্লিক করলে বাতিল করার অপশন আসবে। এই মাসে অনুমোদিত: <b>${approvedThisMonth}</b>টা।</p>
    </div>
    ${planCardHtml}
    ${calHtml}
    <div class="center"><a class="link-back" onclick="go('attendanceDashboard')">← স্টুডেন্ট তালিকায় ফিরে যাও</a></div>
    ${creditFooter()}
  `;
}
window.teacherToggleDay = async function(dateStr){
  const { slug, studentName, records } = state;
  const existing = (records||[]).find(r=> r.date === dateStr);
  if(existing){
    if(!confirm(`${dateStr} তারিখের উপস্থিতি বাতিল করতে চাও?`)) return;
    toast('বাতিল করা হচ্ছে...');
    await cancelAttendanceRemote(slug, dateStr);
    toast('বাতিল হয়েছে');
  } else {
    toast('মার্ক করা হচ্ছে...');
    const ok = await markAttendanceRemote(slug, dateStr, 'manual');
    if(ok) toast('মার্ক হয়েছে ✅');
  }
  const freshRecords = await listAttendanceRemote(slug);
  go('attendanceMark', { slug, studentName, records: freshRecords });
}

// ---- Student: confirm attendance (just name, nothing else) ----
function renderAttendanceStudentEntry(){
  app.innerHTML = `
    ${header('উপস্থিতি নিশ্চিত করো')}
    <div class="card">
      <h2>তোমার নাম লেখো</h2>
      <p class="hint">শিক্ষকের কাছে যেই নামে দিয়েছিলে, ঠিক সেই নামটাই লেখো — আর কিছু লাগবে না।</p>
      <input type="text" id="attStudName" placeholder="তোমার নাম" onkeydown="if(event.key==='Enter') loadAttendanceForStudent()">
      <button class="btn btn-primary btn-block" onclick="loadAttendanceForStudent()">দেখো</button>
      <div style="margin-top:14px;"><a class="link-back" onclick="go('landing')">← ফিরে যাও</a></div>
    </div>
    ${creditFooter()}
  `;
}
window.loadAttendanceForStudent = async function(){
  const name = document.getElementById('attStudName').value.trim();
  if(!name){ toast('নাম লেখো'); return; }
  const slug = slugify(name);
  toast('লোড হচ্ছে...');
  const records = await listAttendanceRemote(slug);
  window.__calYear = null; window.__calMonth = null;
  go('attendanceStudentView', { slug, name, records });
}
function renderAttendanceStudentView(slug, name, records){
  const now = new Date();
  const year = window.__calYear !== null ? window.__calYear : now.getFullYear();
  const month = window.__calMonth !== null ? window.__calMonth : now.getMonth();
  window.__calYear = year; window.__calMonth = month;

  const curMonthKey = todayStr().slice(0,7);
  const approvedThisMonth = records.filter(r=> (r.status==='approved' || r.source==='exam') && monthKeyOf(r.date)===curMonthKey).length;
  const calHtml = buildMiniCalendar(year, month, records, 'studentToggleDay', 'attendanceStudentView', { slug, name, records });

  app.innerHTML = `
    ${header('উপস্থিতি')}
    <div class="card center">
      <h2>${escapeHtml(name)}</h2>
      <p class="hint">এই মাসে অনুমোদিত ক্লাস: <b>${approvedThisMonth}</b>টা</p>
      <p class="hint">🟨 হলুদ দিনে ক্লিক করে confirm করো যে সেদিন ক্লাস হয়েছিল। 🟦 নীল দিন মানে সেদিন পরীক্ষা দিয়েছো, তাই স্বয়ংক্রিয়ভাবে উপস্থিতি নিশ্চিত হয়ে গেছে।</p>
      <div id="clsSummarySlot"></div>
    </div>
    ${calHtml}
    <div class="center"><a class="link-back" onclick="go(getLoggedStudent()?'studentDashboard':'landing')">← ফিরে যাও</a></div>
    ${creditFooter()}
  `;
  if(FEATURE_CLASS_PLAN) fillClassSummary(slug, `${year}-${String(month+1).padStart(2,'0')}`, 'clsSummarySlot'); // [NEW]
}
window.studentToggleDay = async function(dateStr){
  const { slug, name, records } = state;
  const rec = records.find(r=> r.date === dateStr);
  if(!rec || rec.status !== 'pending'){ return; }
  toast('নিশ্চিত করা হচ্ছে...');
  await approveAttendanceRemote(slug, dateStr);
  toast('ধন্যবাদ, নিশ্চিত করা হলো ✅');
  const newRecords = await listAttendanceRemote(slug);
  go('attendanceStudentView', { slug, name, records: newRecords });
}



// ---------------- Class plan: days per month, remaining / extra ----------------
function classSummaryHtml(cs){
  if(!cs) return '';
  const monthName = BN_MONTHS[Number(String(cs.month).slice(5,7)) - 1] || '';
  if(!cs.hasPlan){
    return `<div style="margin-top:12px; background:#F5F9FE; border:1px solid var(--paper-edge); border-radius:10px; padding:10px 12px; font-size:13.5px;">
      📚 ${monthName} মাসে মোট ক্লাস হয়েছে: <b>${cs.held}</b> দিন</div>`;
  }
  const done = cs.held + cs.extraApplied;
  const pct = cs.planned > 0 ? Math.min(100, Math.round((done / cs.planned) * 100)) : 100;
  let third;
  if(cs.remaining > 0)          third = `<div class="cls-chip" style="background:#FEF6E8; color:#9B6A15;"><b>${cs.remaining}</b><span>⏳ বাকি (দিন)</span></div>`;
  else if(cs.extraThisMonth > 0) third = `<div class="cls-chip" style="background:#E8F6EF; color:var(--green);"><b>+${cs.extraThisMonth}</b><span>➕ Extra (দিন)</span></div>`;
  else                           third = `<div class="cls-chip" style="background:#E8F6EF; color:var(--green);"><b>✓</b><span>🎉 সম্পূর্ণ</span></div>`;
  const notes = [];
  if(cs.extraCarriedIn > 0) notes.push(`আগের মাস(গুলো) থেকে extra জমা আছে: <b>${cs.extraCarriedIn} দিন</b>`);
  if(cs.extraApplied > 0)   notes.push(`extra থেকে <b>${cs.extraApplied} দিন</b> যোগ করে এই মাসের হিসাব মেলানো হয়েছে`);
  if(cs.extraThisMonth > 0) notes.push(`এই মাসের বাড়তি <b>${cs.extraThisMonth} দিন</b> পরের মাসে extra হিসেবে যাবে`);
  return `
    <div style="margin-top:12px; border:1px solid var(--paper-edge); border-radius:12px; padding:12px; background:#FCFDFE;">
      <div style="font-weight:700; font-size:14px; margin-bottom:8px;">📘 ${monthName} মাসের ক্লাস হিসাব</div>
      <div class="cls-chips">
        <div class="cls-chip" style="background:#EDF3FC; color:#2B5797;"><b>${cs.held}</b><span>✅ ক্লাস হয়েছে (দিন)</span></div>
        <div class="cls-chip" style="background:#F1F3F8; color:var(--ink);"><b>${cs.planned}</b><span>🎯 পরিকল্পিত (দিন)</span></div>
        ${third}
      </div>
      <div class="hp-bar-wrap" style="max-width:100%; height:8px; margin:10px 0 0 0; background:#E3E8F1; border-color:#E3E8F1;">
        <div class="hp-bar-fill" style="width:${pct}%;"></div>
      </div>
      ${notes.length ? `<div style="font-size:12.5px; color:var(--pencil); margin-top:8px; line-height:1.6;">${notes.map(n=> '• ' + n).join('<br>')}</div>` : ''}
    </div>`;
}
async function fillClassSummary(slug, monthKey, slotId){
  const res = await getJson('getClassSummary', { slug, month: monthKey });
  const slot = document.getElementById(slotId);
  if(slot && res && res.status === 'success') slot.innerHTML = classSummaryHtml(res.summary);
}
async function refreshStudentDashboard(slug){
  const fresh = await postToScript('getStudentDashboard', { slug });
  if(fresh){
    if(fresh.couponBalance === null || fresh.couponBalance === undefined || !isFinite(Number(fresh.couponBalance))){
      const cb = await getCouponBalanceRemote(slug);
      fresh.couponBalance = cb.balance;
    }
    window.__studentDashCache = { ...fresh, slug };
  }
  renderStudentDashboard();
}

// teacher: card on a student's calendar page
async function buildClassPlanCard(slug, monthKey, year, month){
  const res = await getJson('getClassSummary', { slug, month: monthKey });
  const cs = (res && res.status === 'success') ? res.summary : null;
  const title = `📘 মাসিক ক্লাস পরিকল্পনা — ${BN_MONTHS[month]} ${year}`;
  if(!cs){
    return `<div class="card"><h3>${title}</h3><p class="hint">হিসাব লোড করা যায়নি, পেজ রিফ্রেশ করে দেখো।</p></div>`;
  }
  if(!cs.hasPlan){
    return `<div class="card">
      <h3>${title}</h3>
      <p class="hint">এই স্টুডেন্টকে প্রতি মাসে কতদিন পড়ানোর কথা সেটা ঠিক করে দাও — তাহলে বাকি বা extra দিনের হিসাব নিজে থেকেই চলবে, আর স্টুডেন্টও তার ড্যাশবোর্ডে দেখতে পাবে। (এই মাসে এখন পর্যন্ত মার্ক করা ক্লাস: <b>${cs.held}</b> দিন)</p>
      <div class="row">
        <div><label class="field-label">প্রতি মাসে কত দিন?</label><input type="number" id="planDays" min="0" max="31" value="12"></div>
        <div><label class="field-label">হিসাব শুরুর মাস</label><input type="month" id="planStart" value="${monthKey}"></div>
      </div>
      <button class="btn btn-primary btn-block" onclick="saveClassPlanUI()">✅ পরিকল্পনা সেভ করো</button>
    </div>`;
  }
  const canApply = cs.remaining > 0 && cs.extraCarriedIn > 0;
  const maxApply = Math.min(cs.extraCarriedIn, cs.planned - cs.held);
  return `<div class="card">
    <h3>${title}</h3>
    ${classSummaryHtml(cs)}

    ${canApply || cs.extraApplied > 0 ? `
    <div style="margin-top:14px; padding-top:12px; border-top:1px dashed var(--rule);">
      <label class="field-label">➕ জমানো extra থেকে এই মাসে কত দিন যোগ করবে? (সর্বোচ্চ ${Math.max(maxApply, cs.extraApplied)})</label>
      <div class="row">
        <input type="number" id="extraDays" min="0" max="${Math.max(maxApply, cs.extraApplied)}" value="${cs.extraApplied || maxApply}" style="margin-bottom:0;">
        <button class="btn btn-gold" onclick="applyExtraUI()">extra ব্যবহার করো</button>
      </div>
      <p class="hint" style="margin-top:6px;">ইচ্ছা না হলে কিছু না করলেই হয় — extra যেমন আছে তেমনই জমা থাকবে। ${cs.extraApplied>0 ? '০ দিয়ে সেভ করলে আগের যোগ করা extra ফেরত যাবে।' : ''}</p>
    </div>` : ''}

    <div style="margin-top:14px; padding-top:12px; border-top:1px dashed var(--rule);">
      <div class="row">
        <div><label class="field-label">প্রতি মাসে কত দিন (ডিফল্ট)</label><input type="number" id="planDays" min="0" max="31" value="${cs.defaultPlanned}" style="margin-bottom:0;"></div>
        <div><label class="field-label">হিসাব শুরুর মাস</label><input type="month" id="planStart" value="${cs.startMonth}" style="margin-bottom:0;"></div>
      </div>
      <button class="btn btn-outline btn-block" style="margin-top:8px;" onclick="saveClassPlanUI()">💾 ডিফল্ট পরিকল্পনা আপডেট করো</button>
    </div>

    <div style="margin-top:14px; padding-top:12px; border-top:1px dashed var(--rule);">
      <label class="field-label">শুধু এই মাসের জন্য আলাদা দিন (ঐচ্ছিক, যেমন ছুটির মাস)</label>
      <div class="row">
        <input type="number" id="monthPlanDays" min="0" max="31" placeholder="${cs.planned}" value="${cs.hasOverride ? cs.planned : ''}" style="margin-bottom:0;">
        <button class="btn btn-outline" onclick="saveMonthPlanUI(false)">সেট করো</button>
        ${cs.hasOverride ? `<button class="btn btn-danger" onclick="saveMonthPlanUI(true)">মুছো</button>` : ''}
      </div>
      <p class="hint" style="margin-top:6px;">হিসাব: মার্ক করা প্রতিটা ক্লাস-দিন গোনা হয়। পরিকল্পিতের চেয়ে বেশি হলে বাড়তি দিন পরের মাসে extra হিসেবে জমা হয়।</p>
    </div>
  </div>`;
}
window.saveClassPlanUI = async function(){
  const { slug, studentName } = state;
  const days = parseInt((document.getElementById('planDays')||{}).value, 10);
  const start = (((document.getElementById('planStart')||{}).value) || '').trim();
  if(isNaN(days) || days < 0 || days > 31){ toast('০ থেকে ৩১ এর মধ্যে দিন দাও'); return; }
  if(start && !/^\d{4}-\d{2}$/.test(start)){ toast('শুরুর মাস 2026-09 এই ফরম্যাটে দাও'); return; }
  toast('সেভ হচ্ছে...');
  const res = await postToScript('saveClassPlan', { slug, planned: days, startMonth: start, month: monthKeyFromCal() });
  if(res){ toast('পরিকল্পনা সেভ হয়েছে ✅'); go('attendanceMark', { slug, studentName }); }
};
window.saveMonthPlanUI = async function(clear){
  const { slug, studentName } = state;
  let planned = '';
  if(!clear){
    planned = parseInt((document.getElementById('monthPlanDays')||{}).value, 10);
    if(isNaN(planned) || planned < 0 || planned > 31){ toast('০ থেকে ৩১ এর মধ্যে দিন দাও'); return; }
  }
  toast('সেভ হচ্ছে...');
  const res = await postToScript('saveMonthPlan', { slug, month: monthKeyFromCal(), planned });
  if(res){ toast(clear ? 'আলাদা দিন মুছে ফেলা হয়েছে' : 'এই মাসের দিন সেট হয়েছে ✅'); go('attendanceMark', { slug, studentName }); }
};
window.applyExtraUI = async function(){
  const { slug, studentName } = state;
  const days = parseInt((document.getElementById('extraDays')||{}).value, 10);
  if(isNaN(days) || days < 0){ toast('সঠিক দিন সংখ্যা দাও'); return; }
  toast('আপডেট হচ্ছে...');
  const res = await postToScript('setExtraUsed', { slug, month: monthKeyFromCal(), days });
  if(res){
    toast(res.summary && res.summary.extraApplied ? `extra থেকে ${res.summary.extraApplied} দিন যোগ হয়েছে ✅` : 'extra যোগ করা হয়নি');
    go('attendanceMark', { slug, studentName });
  }
};
