// ============================================================================
// exams.js -- part of the পরীক্ষার খাতা frontend, split out of the original
// single inline <script> in index.html for readability. Loaded via plain
// <script src="js/exams.js"> tags (in the order listed in index.html), which
// all share one global scope in the browser -- exactly like the original
// single script did, so nothing about how functions call each other changes.
// ============================================================================

let currentTeacher = null; // { id, name } -- persists across teacher screens regardless of state resets

function renderTeacherGate(){
  app.innerHTML = `
    ${header('শিক্ষক প্যানেল')}
    <div class="card">
      <h2>পাসওয়ার্ড দাও</h2>
      <p class="hint">এটা শুধু তোমার জন্য — স্টুডেন্টদের সাথে শেয়ার কোরো না।</p>
      <input type="password" id="enterPin" maxlength="10" placeholder="পাসওয়ার্ড" onkeydown="if(event.key==='Enter') checkTeacherPin()">
      <button class="btn btn-primary btn-block" onclick="checkTeacherPin()">প্রবেশ করো</button>
      <div style="margin-top:14px;"><a class="link-back" onclick="go('landing')">← ফিরে যাও</a></div>
    </div>
    ${creditFooter()}
  `;
  setTimeout(() => document.getElementById('enterPin').focus(), 100);
}
function checkTeacherPin(){
  const v = document.getElementById('enterPin').value.trim();
  if(v === TEACHER_PASSWORD){
    currentTeacher = { id: 'admin', name: CREATOR_NAME };
    go('teacherDashboard');
  }
  else toast('পাসওয়ার্ড ভুল হয়েছে');
}

async function getExamsByTeacher(teacherId){
  try{
    const r = await fetch(`${SCRIPT_URL}?action=listMine&teacherId=${encodeURIComponent(teacherId)}`);
    const json = await r.json();
    if(json.status === 'success') return json.data;
  } catch(e){}
  return [];
}

async function renderTeacherDashboard(){
  app.innerHTML = ` ${header('শিক্ষক প্যানেল')} <div class="card center">পরীক্ষার তালিকা লোড হচ্ছে...</div>`;
  const teacherId = currentTeacher ? currentTeacher.id : 'admin';
  const teacherName = currentTeacher ? currentTeacher.name : CREATOR_NAME;
  const [exams, wdAll] = await Promise.all([getExamsByTeacher(teacherId), getWithdrawRequestsRemote()]); // [NEW] also load withdraw requests
  const wdPending = wdAll.filter(w=> w.status === 'pending');
  const wdLate = wdPending.filter(w=> w.dueAt < Date.now()).length;
  exams.sort((a,b)=> (b.createdAt||0) - (a.createdAt||0));
  window.__examListCache = exams;

  let listHtml = '';
  if(exams.length === 0){
    listHtml = `<div class="empty-state">এখনো কোনো পরীক্ষা তৈরি করোনি।<br>নিচ থেকে প্রথম পরীক্ষাটি সাজাও।</div>`;
  } else {
    for(const ex of exams){
      const timerLabel = ex.timerMode === 'perQuestion' ? `প্রতি প্রশ্নে ${ex.perQuestionSeconds} সেকেন্ড` : `মোট ${ex.duration} মিনিট`;
      listHtml += `
        <div class="exam-item">
          <div class="row-top">
            <div>
              <h3 style="margin-bottom:4px;">${escapeHtml(ex.title)} ${ex.isPublic ? '<span class="q-tag">🎯 উন্মুক্ত প্র্যাকটিস</span>':''} ${ex.isTreat ? '<span class="q-tag">🎁 Treat</span>':''}</h3>
              <div class="meta">${escapeHtml(ex.subject)} · ${ex.questions.length}টি প্রশ্ন · ${timerLabel}</div>
            </div>
            <div class="code-chip">${ex.code}</div>
          </div>
          <div class="row" style="margin-top:12px;">
            <button class="btn btn-outline" onclick="viewEditExam('${ex.code}')">✏️ দেখো/এডিট করো</button>
            <button class="btn btn-outline" onclick="go('teacherResults',{code:'${ex.code}'})">📊 রেজাল্ট</button>
            <button class="btn btn-outline" onclick="shareExamByCode('${ex.code}')">🔗 শেয়ার</button>
            <button class="btn btn-danger" onclick="deleteExam('${ex.code}')">মুছে ফেলো</button>
          </div>
        </div>`;
    }
  }

  app.innerHTML = `
    ${header('শিক্ষক প্যানেল · ' + escapeHtml(teacherName))}
    ${wdPending.length ? `
    <div onclick="go('withdrawManage')" style="cursor:pointer; background:linear-gradient(135deg,#FFF3D6,#FFE4A8); border:1.5px solid #E9B949; border-radius:12px; padding:14px 16px; margin-bottom:16px; display:flex; align-items:center; gap:12px;">
      <div style="font-size:28px;">🔔</div>
      <div style="flex:1;">
        <div style="font-weight:700; color:#6B4A05;">${wdPending.length}টি Withdraw অনুরোধ Pending — মোট ৳${wdPending.reduce((a,w)=> a + w.amount, 0)}</div>
        <div style="font-size:12.5px; color:#7B5A10;">${wdLate ? `⚠️ ${wdLate}টির ১৪ দিন পার হয়ে গেছে! ` : ''}চাপ দিয়ে নম্বর দেখো ও টাকা পাঠাও →</div>
      </div>
    </div>` : ''}
    <div class="card">
      <h2>⚡ দ্রুত অ্যাকশন</h2>
      <button class="btn btn-primary btn-block" onclick="draftQuestions=[]; go('teacherNewExam')">+ নতুন পরীক্ষা সাজাও</button>
      <div class="row" style="margin-top:10px;">
        <button class="btn btn-outline btn-block" onclick="go('attendanceDashboard')">📅 উপস্থিতি ও বেতন</button>
        <button class="btn btn-outline btn-block" onclick="go('notesManage')">📝 নোট/স্লাইড যোগ করো</button>
      </div>
      <div class="row" style="margin-top:10px;">
        <button class="btn btn-outline btn-block" onclick="go('topicsManage')">📚 Topics ম্যানেজ করো</button>
        <button class="btn btn-outline btn-block" onclick="go('faqManage')">❓ প্রশ্নোত্তর ম্যানেজ করো</button>
      </div>
      <div class="row" style="margin-top:10px;">
        <button class="btn btn-outline btn-block" onclick="go('masteryManage')">🎯 Mastery কোর্স</button>
        <button class="btn btn-gold btn-block" onclick="go('couponManage')">🎁 Treat Coupon</button>
      </div>
      <div class="row" style="margin-top:10px;">
        <button class="btn btn-gold btn-block" onclick="go('withdrawManage')">💸 Withdraw অনুরোধ${wdPending.length ? ` (${wdPending.length})` : ''}</button>
      </div>
      <div class="row" style="margin-top:10px;">
        <button class="btn btn-outline btn-block" onclick="go('teacherRegCodes')">🔑 রেজিস্ট্রেশন কোড জেনারেটর</button>
        <button class="btn btn-outline btn-block" onclick="go('teacherBattleAudit')">🛡️ ব্যাটেল অডিট ও অ্যান্টি-চিট</button>
      </div>
      <div class="row" style="margin-top:10px;">
        <button class="btn btn-gold btn-block" onclick="openTeacherVerifiedRequestsModal()">⭐ ভেরিফাইড ব্যাচের আবেদনসমূহ</button>
        <button class="btn btn-outline btn-block" onclick="openChatInboxModal()">💬 শিক্ষার্থীদের সাথে সরাসরি চ্যাট</button>
      </div>
    </div>
    <div class="card">
      <h2>তোমার পরীক্ষাসমূহ</h2>
      <p class="hint">${teacherId==='admin' ? '' : 'এটা শুধু তোমার নিজের আলাদা সেকশন — অন্য শিক্ষকরা তোমার এই পরীক্ষাগুলো দেখতে পাবে না।'} পরীক্ষার কোড আর এই অ্যাপের লিংক স্টুডেন্টদের পাঠিয়ে দাও। স্টুডেন্টদের পাসওয়ার্ড: <b>${STUDENT_PASSWORD}</b></p>
      ${listHtml}
    </div>
    <div class="center"><a class="link-back" onclick="currentTeacher=null; go('landing')">← মূল পাতায় ফিরে যাও (লগ-আউট)</a></div>
    ${creditFooter()}
  `;
}

function shareExam(code, title){
  const url = window.location.href.split('?')[0];
  const msg = `${title}\nএক্সাম কোড: ${code}\nস্টুডেন্ট পাসওয়ার্ড: ${STUDENT_PASSWORD}\nএই লিংকে গিয়ে পরীক্ষা দাও:\n${url}`;
  navigator.clipboard.writeText(msg).then(()=> toast('লিংক ও কোড কপি হয়েছে')).catch(()=> toast('কপি করতে সমস্যা হয়েছে'));
}
window.shareExamByCode = function(code){
  const ex = (window.__examListCache||[]).find(e=> e.code === code);
  shareExam(code, ex ? ex.title : code);
}
window.viewEditExam = async function(code){
  toast('লোড হচ্ছে...');
  const examRaw = await sget('exam:'+code);
  if(!examRaw){ toast('পরীক্ষা পাওয়া যায়নি'); return; }
  const exam = JSON.parse(examRaw.value);
  draftQuestions = exam.questions.map(q=>({...q}));
  go('teacherNewExam', { editingExam: exam });
}

async function deleteExam(code){
  if(!confirm('এই পরীক্ষাটা স্থায়ীভাবে মুছে ফেলতে চাও?')) return;
  await sdel('exam:'+code);
  try{ await fetch(`${SCRIPT_URL}?action=deleteExam&code=${encodeURIComponent(code)}`); }catch(e){}
  toast('পরীক্ষা মুছে ফেলা হয়েছে');
  go('teacherDashboard');
}

let draftQuestions = [];
function renderTeacherNewExam(editingExam){
  window.__editingExam = editingExam || null;
  draftQuestions = draftQuestions.length ? draftQuestions : [ blankQuestion() ];
  const ex = editingExam || {};
  const timerMode = ex.timerMode || 'total';
  app.innerHTML = `
    ${header(editingExam ? 'পরীক্ষা এডিট করো' : 'নতুন পরীক্ষা')}
    <div class="card">
      <h2>পরীক্ষার তথ্য ${editingExam ? `<span class="code-chip">${ex.code}</span>` : ''}</h2>
      <label class="field-label">পরীক্ষার নাম</label>
      <input type="text" id="examTitle" value="${escapeHtml(ex.title||'')}" placeholder="যেমন: পরমাণুর গঠন — MCQ টেস্ট">
      <label class="field-label">বিষয়</label>
      <input type="text" id="examSubject" value="${escapeHtml(ex.subject||'')}" placeholder="যেমন: রসায়ন">
      <label class="field-label">সময়ের ধরন</label>
      <select id="timerMode" onchange="toggleTimerFields()">
        <option value="total" ${timerMode==='total'?'selected':''}>পুরো পরীক্ষার জন্য মোট সময় (মিনিট)</option>
        <option value="perQuestion" ${timerMode==='perQuestion'?'selected':''}>প্রতিটা প্রশ্নের জন্য আলাদা সময় (সেকেন্ড)</option>
      </select>
      <div id="totalField" style="${timerMode==='perQuestion'?'display:none;':''}">
        <label class="field-label">মোট সময় (মিনিট)</label>
        <input type="number" id="examDuration" value="${ex.duration||7}" min="1" max="180">
      </div>
      <div id="perQField" style="${timerMode==='perQuestion'?'':'display:none;'}">
        <label class="field-label">প্রশ্ন প্রতি সময় (সেকেন্ড)</label>
        <input type="number" id="perQSeconds" value="${ex.perQuestionSeconds||36}" min="5" max="600">
      </div>
      <label class="bubble-opt" style="padding-left:0;">
        <input type="checkbox" id="isPublic" ${ex.isPublic?'checked':''} style="display:inline-block; width:auto; margin:0;">
        <span>🎯 এটা সবার জন্য উন্মুক্ত প্র্যাকটিস এক্সাম রাখো (কোড/পাসওয়ার্ড ছাড়াই, "প্র্যাকটিস করো" সেকশনে দেখাবে)</span>
      </label>
      <label class="bubble-opt" style="padding-left:0; margin-top:8px;">
        <input type="checkbox" id="isTreat" ${ex.isTreat?'checked':''} style="display:inline-block; width:auto; margin:0;">
        <span>🎁 এটা একটা Treat Coupon পরীক্ষা ${ex.isTreat ? `(বর্তমান পাসওয়ার্ড: <b>${ex.treatPassword}</b>)` : '(নিজস্ব পাসওয়ার্ড হবে, ৮০%+ পেলে কুপন পাবে, একই নামে একবারই দেওয়া যাবে)'}</span>
      </label>
    </div>
    <div class="card">
      <h2>দ্রুত ইম্পোর্ট (ঐচ্ছিক)</h2>
      <p class="hint">একসাথে অনেক প্রশ্ন থাকলে নিচের ফরম্যাটে পেস্ট করে "ইম্পোর্ট করো" চাপো (বিদ্যমান প্রশ্নের সাথে যোগ হবে):<br>
      <code>Q: প্রশ্ন লেখো [ট্যাগ]<br>A) অপশন ১<br>B) অপশন ২<br>C) অপশন ৩<br>D) অপশন ৪<br>ANS: A</code></p>
      <textarea id="bulkText" placeholder="এখানে পেস্ট করো..."></textarea>
      <button class="btn btn-outline btn-block" onclick="importBulk()">📥 ইম্পোর্ট করো</button>
      <button class="btn btn-gold btn-block" style="margin-top:10px;" onclick="openLibraryPicker()">📚 লাইব্রেরি থেকে বাছো</button>
    </div>
    <div class="card">
      <h2>প্রশ্নসমূহ</h2>
      <div id="qList"></div>
      <button class="btn btn-outline btn-block" style="margin-top:10px;" onclick="addQuestion()">+ আরেকটি প্রশ্ন যোগ করো</button>
    </div>
    <div class="row">
      <button class="btn btn-outline" onclick="cancelNewExam()">বাতিল</button>
      <button class="btn btn-primary" onclick="saveExam()">✅ পরীক্ষা সেভ করো</button>
    </div>
    ${creditFooter()}
  `;
  renderQList();
}
window.toggleTimerFields = function(){
  const mode = document.getElementById('timerMode').value;
  document.getElementById('totalField').style.display = mode === 'total' ? 'block' : 'none';
  document.getElementById('perQField').style.display = mode === 'perQuestion' ? 'block' : 'none';
}
function blankQuestion(){ return { text:'', tag:'', options:['','','',''], correct:0 }; }
function addQuestion(){ draftQuestions.push(blankQuestion()); renderQList(); }
window.removeQuestion = function(i){ draftQuestions.splice(i,1); if(draftQuestions.length===0) draftQuestions.push(blankQuestion()); renderQList(); }

// ================= প্রশ্ন লাইব্রেরি — পরীক্ষার ফর্মের পাশেই সাইড প্যানেল (আলাদা পেজে যেতে হয় না) =================
window.__lib = null;
window.openLibraryPicker = function(){
  if(document.getElementById('libPanel')){ closeLibraryPanel(); return; } // আবার চাপলে বন্ধ হবে
  const p = document.createElement('div');
  p.id = 'libPanel';
  p.className = 'lib-panel';
  p.innerHTML = `
    <div class="lib-panel-head">
      <div style="min-width:0;">
        <div style="font-weight:700; font-size:15px;">📚 প্রশ্ন লাইব্রেরি</div>
        <div class="meta" id="libCrumb" style="margin-top:2px;"></div>
      </div>
      <button class="info-btn" onclick="closeLibraryPanel()">✕ বন্ধ</button>
    </div>
    <div class="lib-panel-body" id="libBody"></div>
    <div class="lib-panel-foot">এই পরীক্ষায় এখন মোট <b id="libCount">0</b>টা প্রশ্ন আছে</div>`;
  document.body.appendChild(p);
  document.body.classList.add('lib-open');
  window.__lib = { step:'subject', courses:null, subjects:[], subjectVal:'', courseList:[], course:null, topics:[], topic:null };
  libUpdateCount();
  libRender();
};
window.closeLibraryPanel = function(){
  const p = document.getElementById('libPanel');
  if(p) p.remove();
  document.body.classList.remove('lib-open');
  window.__lib = null;
};
function libUpdateCount(){
  const el = document.getElementById('libCount');
  if(el) el.textContent = draftQuestions.filter(q=> q.text && q.text.trim()).length;
}
function libBackBtn(){
  return `<button class="btn btn-outline" style="padding:7px 12px; font-size:12.5px; margin-bottom:10px;" onclick="libBack()">← পেছনে</button>`;
}
window.libBack = function(){
  const L = window.__lib; if(!L) return;
  if(L.step==='questions') L.step='chapter';
  else if(L.step==='chapter') L.step='course';
  else if(L.step==='course') L.step='subject';
  libRender();
};
async function libRender(){
  const L = window.__lib;
  const body = document.getElementById('libBody');
  const crumb = document.getElementById('libCrumb');
  if(!L || !body) return;

  if(L.step==='subject'){
    crumb.textContent = 'বিষয় বাছো';
    if(!L.courses){
      body.innerHTML = `<div class="empty-state">লোড হচ্ছে...</div>`;
      const courses = await getMasteryCourses();
      if(window.__lib !== L || !document.getElementById('libBody')) return;
      L.courses = courses;
      L.subjects = [...new Set(courses.map(c=> c.subject))];
    }
    body.innerHTML = L.subjects.length
      ? L.subjects.map((sub,i)=> `<button class="btn btn-primary btn-block" style="margin-bottom:8px;" onclick="libPickSubject(${i})">${escapeHtml(sub)}</button>`).join('')
      : `<div class="empty-state">Mastery-তে এখনো কোনো কোর্স/চ্যাপ্টার যোগ করা হয়নি — আগে ওখানে (বা import_to_app.py দিয়ে) প্রশ্ন যোগ করো।</div>`;
    return;
  }

  if(L.step==='course'){
    crumb.textContent = L.subjectVal;
    body.innerHTML = libBackBtn() + (L.courseList.map((c,i)=> `<button class="btn btn-primary btn-block" style="margin-bottom:8px;" onclick="libPickCourse(${i})">${escapeHtml(c.title)}</button>`).join('') || `<div class="empty-state">কোনো কোর্স নেই।</div>`);
    return;
  }

  if(L.step==='chapter'){
    crumb.textContent = L.subjectVal + ' › ' + L.course.title;
    body.innerHTML = libBackBtn() + (L.topics.map((t,i)=> `<button class="btn btn-primary btn-block" style="margin-bottom:8px; text-align:start; justify-content:flex-start;" onclick="libPickTopic(${i})">${t.order}. ${escapeHtml(t.title)} (${t.questions.length}টা)</button>`).join('') || `<div class="empty-state">এই কোর্সে এখনো কোনো চ্যাপ্টার নেই।</div>`);
    return;
  }

  if(L.step==='questions'){
    const topic = L.topic;
    crumb.textContent = L.course.title + ' › ' + topic.title;
    const already = new Set(draftQuestions.map(d=> (d.text||'').trim()));
    const rows = topic.questions.map((q,i)=>{
      const dup = already.has((q.text||'').trim());
      return `<label class="lib-q ${dup?'dup':''}">
        <input type="checkbox" id="libq${i}" ${dup?'disabled':''}>
        <div>
          <div class="lib-q-text">${i+1}. ${escapeHtml(q.text)}</div>
          <div class="meta">সঠিক: ${['ক','খ','গ','ঘ'][q.correct]}) ${escapeHtml(q.options[q.correct])}${dup?' · ✓ যোগ করা আছে':''}</div>
        </div>
      </label>`;
    }).join('');
    body.innerHTML = libBackBtn() + `
      <div class="lib-actions">
        <button class="btn btn-outline" onclick="libToggleAll()">☑️ সব বাছো</button>
        <button class="btn btn-primary" onclick="libAddSelected()">✅ পরীক্ষায় যোগ করো</button>
      </div>
      ${rows || `<div class="empty-state">এই চ্যাপ্টারে কোনো প্রশ্ন নেই।</div>`}`;
    renderAllMath(body);
    return;
  }
}
window.libPickSubject = function(i){
  const L = window.__lib; if(!L) return;
  L.subjectVal = L.subjects[i];
  L.courseList = L.courses.filter(c=> c.subject === L.subjectVal);
  L.step = 'course';
  libRender();
};
window.libPickCourse = async function(i){
  const L = window.__lib; if(!L) return;
  L.course = L.courseList[i];
  L.step = 'chapter';
  const body = document.getElementById('libBody');
  if(body) body.innerHTML = `<div class="empty-state">লোড হচ্ছে...</div>`;
  const topics = await getMasteryTopics(L.course.id);
  if(window.__lib !== L) return;
  topics.sort((a,b)=> a.order - b.order);
  L.topics = topics;
  libRender();
};
window.libPickTopic = function(i){
  const L = window.__lib; if(!L) return;
  L.topic = L.topics[i];
  L.step = 'questions';
  libRender();
};
window.libToggleAll = function(){
  const L = window.__lib; if(!L || !L.topic) return;
  const boxes = L.topic.questions.map((q,i)=> document.getElementById('libq'+i)).filter(cb=> cb && !cb.disabled);
  const allOn = boxes.length && boxes.every(cb=> cb.checked);
  boxes.forEach(cb=> cb.checked = !allOn);
};
window.libAddSelected = function(){
  const L = window.__lib; if(!L || !L.topic) return;
  let added = 0;
  L.topic.questions.forEach((q,i)=>{
    const cb = document.getElementById('libq'+i);
    if(cb && cb.checked && !cb.disabled){
      const newQ = { text: q.text, tag: '', options: [...q.options], correct: q.correct };
      const blankIdx = draftQuestions.findIndex(dq=> !(dq.text||'').trim() && dq.options.every(o=> !(o||'').trim()));
      if(blankIdx !== -1) draftQuestions[blankIdx] = newQ; else draftQuestions.push(newQ);
      added++;
    }
  });
  if(!added){ toast('আগে অন্তত একটা প্রশ্নে টিক দাও'); return; }
  renderQList();        // পরীক্ষার নাম/বিষয়/সময় ঠিক থাকে, শুধু প্রশ্নের তালিকা আপডেট হয়
  libUpdateCount();
  libRender();          // যোগ হওয়া প্রশ্নগুলো "✓ যোগ করা আছে" দেখাবে
  toast(added + 'টা প্রশ্ন যোগ হয়েছে ✅');
};

window.importBulk = function(){
  const raw = document.getElementById('bulkText').value;
  if(!raw.trim()){ toast('আগে টেক্সট পেস্ট করো'); return; }
  const blocks = raw.split(/\n\s*\n/).map(b=>b.trim()).filter(Boolean);
  const parsed = [];
  const letterMap = {'A':0,'B':1,'C':2,'D':3,'ক':0,'খ':1,'গ':2,'ঘ':3,'a':0,'b':1,'c':2,'d':3};
  for(const block of blocks){
    const lines = block.split('\n').map(l=>l.trim()).filter(Boolean);
    let qtext='', tag='', options=['','','',''], correct=0;
    for(const line of lines){
      const qm = line.match(/^Q[:.]?\s*(.*)$/i);
      const om = line.match(/^([A-Dকখগঘ])[).]\s*(.*)$/i);
      const am = line.match(/^ANS[:.]?\s*([A-Dকখগঘ])/i);
      if(qm){
        let t = qm[1];
        const tagm = t.match(/\[([^\]]+)\]\s*$/);
        if(tagm){ tag = tagm[1]; t = t.replace(/\s*\[[^\]]+\]\s*$/,'').trim(); }
        qtext = t;
      } else if(om){
        const realIdx = (om[1] in letterMap) ? letterMap[om[1]] : letterMap[om[1].toUpperCase()];
        options[realIdx] = om[2].trim();
      } else if(am){
        correct = (am[1] in letterMap) ? letterMap[am[1]] : letterMap[am[1].toUpperCase()];
      }
    }
    if(qtext && options.every(o=>o)){
      parsed.push({ text: qtext, tag, options, correct });
    }
  }
  if(parsed.length === 0){ toast('ফরম্যাট মেলেনি'); return; }
  draftQuestions = parsed;
  renderQList();
  toast(parsed.length + 'টি প্রশ্ন ইম্পোর্ট হয়েছে');
  document.getElementById('bulkText').value = '';
}

function renderQList(){
  const el = document.getElementById('qList');
  el.innerHTML = draftQuestions.map((q,i)=> `
    <div class="q-block">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span class="q-num">${i+1}</span>
        ${draftQuestions.length>1 ? `<a class="link-back" onclick="removeQuestion(${i})">মুছো</a>`:''}
      </div>
      <label class="field-label">প্রশ্ন</label>
      <input type="text" value="${escapeHtml(q.text)}" oninput="draftQuestions[${i}].text=this.value">
      <label class="field-label">ট্যাগ (ঐচ্ছিক)</label>
      <input type="text" value="${escapeHtml(q.tag||'')}" oninput="draftQuestions[${i}].tag=this.value">
      ${[0,1,2,3].map(j=>`
        <div class="bubble-opt">
          <input type="radio" name="correct${i}" ${q.correct===j?'checked':''} onchange="draftQuestions[${i}].correct=${j}">
          <div class="bubble">${['ক','খ','গ','ঘ'][j]}</div>
          <input type="text" class="opt-input" value="${escapeHtml(q.options[j])}" oninput="draftQuestions[${i}].options[${j}]=this.value">
        </div>`).join('')}
    </div>
  `).join('');
}
function cancelNewExam(){ draftQuestions = []; window.__editingExam = null; go('teacherDashboard'); }
async function saveExam(){
  const title = document.getElementById('examTitle').value.trim();
  const subject = document.getElementById('examSubject').value.trim();
  const timerMode = document.getElementById('timerMode').value;
  const duration = parseInt(document.getElementById('examDuration').value, 10) || 7;
  const perQuestionSeconds = parseInt(document.getElementById('perQSeconds').value, 10) || 36;
  const isPublic = document.getElementById('isPublic').checked;
  const isTreat = document.getElementById('isTreat').checked;
  if(!title || !subject){ toast('নাম ও বিষয় পূরণ করো'); return; }
  for(const q of draftQuestions){
    if(!q.text.trim() || q.options.some(o=>!o.trim())){ toast('সব পূরণ করো'); return; }
  }
  const editingExam = window.__editingExam;
  const code = editingExam ? editingExam.code : genCode();
  const teacherId = currentTeacher ? currentTeacher.id : 'admin';
  const treatPassword = isTreat ? (editingExam && editingExam.isTreat ? editingExam.treatPassword : genTreatPassword()) : null;
  const createdAt = editingExam ? editingExam.createdAt : Date.now();
  const exam = { code, title, subject, timerMode, duration, perQuestionSeconds, isPublic, isTreat, treatPassword, teacherId, questions: draftQuestions, createdAt };
  toast('গুগল শিটে সেভ হচ্ছে...');
  const res = await sset('exam:'+code, JSON.stringify(exam));
  if(!res){ return; } // sset already showed a toast explaining what went wrong; keep draftQuestions so nothing is lost
  draftQuestions = [];
  window.__editingExam = null;
  alert((editingExam ? 'পরীক্ষা আপডেট হয়েছে! কোড: ' : 'পরীক্ষা তৈরি হয়েছে এবং গুগল শিটে সেভ হয়েছে! কোড: ')+code
    + (isPublic ? '\n\nএটা "প্র্যাকটিস করো" সেকশনে সবার জন্য উন্মুক্ত থাকবে।' : '')
    + (isTreat ? `\n\nTreat Coupon পাসওয়ার্ড: ${treatPassword}` : ''));
  go('teacherDashboard');
}
function genTreatPassword(){
  return String(Math.floor(1000 + Math.random()*9000)); // 4-digit numeric, easy to share
}

async function renderTeacherResults(code){
  app.innerHTML = `${header('রেজাল্ট')}<div class="card center">গুগল শিট থেকে রেজাল্ট লোড হচ্ছে...</div>`;
  const examRaw = await sget('exam:'+code);
  if(!examRaw){ app.innerHTML = `${header()}<div class="card center">পরীক্ষা পাওয়া যায়নি।</div>`; return; }
  const exam = JSON.parse(examRaw.value);

  const rawResults = await getRemoteResults(code);
  // group multiple practice attempts per student into one row (student can attempt unlimited times)
  const groups = {};
  rawResults.forEach(r=>{
    const key = r.slug || slugify(r.studentName||'');
    if(!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  const grouped = Object.values(groups).map(list=>{
    list.sort((a,b)=> b.submittedAt - a.submittedAt);
    const best = list.reduce((m,r)=> (r.score > m.score ? r : m), list[0]);
    return { studentName: list[0].studentName, attempts: list, best, count: list.length };
  });
  grouped.sort((a,b)=> b.best.score - a.best.score || a.best.submittedAt - b.best.submittedAt);
  window.__lastGrouped = grouped;
  window.__lastExam = exam;

  let rows = grouped.map((g,i)=>{
    const pct = Math.round((g.best.score/g.best.total)*100);
    return `<tr>
      <td class="${i===0?'rank1':''}">${i+1}</td>
      <td>${escapeHtml(g.studentName)}${g.count>1?` <span class="q-tag">${g.count}বার চেষ্টা</span>`:''}</td>
      <td class="score-big ${pct>=50?'score-pass':'score-fail'}">${g.best.score}/${g.best.total}</td>
      <td>${pct}%</td>
      <td>${new Date(g.best.submittedAt).toLocaleTimeString('bn-BD')}</td>
      <td><a class="link-back" onclick="toggleDetail(${i})">খাতা দেখো</a></td>
    </tr>
    <tr><td colspan="6" style="border-bottom:none; padding:0;"><div class="detail-wrap" id="detail${i}"></div></td></tr>`;
  }).join('');

  app.innerHTML = `
    ${header('রেজাল্ট')}
    <div class="card">
      <h2>${escapeHtml(exam.title)}</h2>
      <p class="hint">কোড: <span class="code-chip">${exam.code}</span> · মোট স্টুডেন্ট: ${grouped.length} · মোট জমা (সব attempt মিলিয়ে): ${rawResults.length}</p>
      <p class="hint">এখানে প্রতিটা স্টুডেন্টের সবচেয়ে ভালো স্কোরটা দেখানো হচ্ছে (একাধিকবার practice করলেও)।</p>
      ${grouped.length===0 ? `<div class="empty-state">এখনো কেউ পরীক্ষা দেয়নি বা লোড হতে পারছে না।</div>` : `
      <table class="results">
        <thead><tr><th>#</th><th>নাম</th><th>সেরা স্কোর</th><th>%</th><th>সময়</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`}
    </div>
    <div class="center"><a class="link-back" onclick="go('teacherDashboard')">← ফিরে যাও</a></div>
    ${creditFooter()}
  `;
}

window.toggleDetail = function(i){
  const el = document.getElementById('detail'+i);
  const grouped = window.__lastGrouped, exam = window.__lastExam;
  if(!el || !grouped || !exam) return;
  if(el.classList.contains('open')){ el.classList.remove('open'); el.innerHTML=''; return; }
  el.classList.add('open');
  renderAttemptList(i);
}
function renderAttemptList(i){
  const el = document.getElementById('detail'+i);
  const g = window.__lastGrouped[i];
  const sortedAsc = [...g.attempts].sort((a,b)=> a.submittedAt - b.submittedAt);
  g.__sortedAsc = sortedAsc;
  const listHtml = [...sortedAsc].reverse().map((r,idxRev)=>{
    const tryNo = sortedAsc.length - idxRev;
    const pct = Math.round((r.score/r.total)*100);
    return `<div class="review-block" style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
      <div>চেষ্টা ${tryNo} · <span class="score-big ${pct>=50?'score-pass':'score-fail'}">${r.score}/${r.total}</span><br><span class="meta">${new Date(r.submittedAt).toLocaleString('bn-BD')}</span></div>
      <a class="link-back" onclick="showTeacherAttempt(${i},${tryNo})">খাতা দেখো</a>
    </div>`;
  }).join('');
  el.innerHTML = `<div style="padding-top:8px;">${listHtml}</div>`;
}
window.showTeacherAttempt = function(i, tryNo){
  const el = document.getElementById('detail'+i);
  const g = window.__lastGrouped[i];
  const exam = window.__lastExam;
  const r = g.__sortedAsc[tryNo-1];
  const hasId = !!r.id;
  el.innerHTML = `<div style="padding-top:8px;">
    <a class="link-back" onclick="renderAttemptList(${i})">← সব চেষ্টার তালিকায় ফিরে যাও</a>
    <div class="card" style="margin-top:10px; padding:14px;">
      <label class="field-label">নম্বর ঠিক করো (manual recheck)</label>
      <div class="row">
        <input type="number" id="manualScoreInput" value="${r.score}" min="0" max="${r.total}" style="margin-bottom:0;">
        <button class="btn btn-outline" onclick="saveManualScore('${r.id||''}','${exam.code}','${r.slug}',${exam.questions.length})">✅ সেভ করো</button>
      </div>
      ${!hasId ? `<p class="hint" style="margin-top:6px;">এই পুরনো attempt-এ কোনো unique ID নেই, তাই ম্যানুয়াল correction এখানে কাজ করবে না — শুধু নতুন attempt থেকে এটা কাজ করবে।</p>`:''}
    </div>
    <div style="margin-top:10px;">${buildAnswerReview(exam, r.answers||[])}</div>
  </div>`;
}
window.saveManualScore = async function(resultId, examCode, slug, total){
  if(!resultId){ toast('এই পুরনো attempt-এ ID নেই, ঠিক করা যাবে না'); return; }
  const newScore = parseInt(document.getElementById('manualScoreInput').value, 10);
  if(isNaN(newScore) || newScore < 0 || newScore > total){ toast('সঠিক নম্বর দাও'); return; }
  toast('আপডেট হচ্ছে...');
  const res = await postToScript('updateResultScore', { resultId, examCode, slug, newScore, total });
  if(res){
    toast('নম্বর আপডেট হয়েছে ✅');
    go('teacherResults', { code: examCode });
  }
}

function renderStudentEntry(){
  const loggedStud = getLoggedStudent(); // [NEW] logged-in students keep their own account; others just type a name (no login needed)
  app.innerHTML = `
    ${header('স্টুডেন্ট')}
    <div class="card">
      <h2>পরীক্ষা শুরু করো</h2>
      <p class="hint">লগইন না করেই শিক্ষকের দেওয়া এক্সাম কোড ও পাসওয়ার্ড দিয়ে পরীক্ষা দিতে পারো। পরীক্ষা দিলে সেদিনের উপস্থিতিও নিজে থেকে মার্ক হয়ে যাবে।</p>
      ${loggedStud ? `<div class="hint" style="margin-bottom:12px;">🧑‍🎓 <b>${escapeHtml(loggedStud.name)}</b> হিসেবে পরীক্ষা দিচ্ছো</div>` : `
      <label class="field-label">তোমার নাম</label>
      <input type="text" id="studName" placeholder="পুরো নাম লেখো">`}
      <label class="field-label">এক্সাম কোড</label>
      <input type="text" id="studCode" placeholder="যেমন: 7K3PQ" style="text-transform:uppercase;">
      <label class="field-label">পাসওয়ার্ড</label>
      <input type="password" id="studPass" placeholder="শিক্ষকের দেওয়া পরীক্ষার পাসওয়ার্ড">
      <button class="btn btn-primary btn-block" onclick="verifyStudentLogin()">পরীক্ষা শুরু করো</button>
      <div style="margin-top:14px;"><a class="link-back" onclick="go('landing')">← ফিরে যাও</a></div>
    </div>
    ${creditFooter()}
  `;
}
async function verifyStudentLogin(){
  const loggedStud = getLoggedStudent(); // [NEW]
  const name = loggedStud ? loggedStud.name : ((document.getElementById('studName')||{}).value||'').trim();
  const code = document.getElementById('studCode').value.trim().toUpperCase();
  const pass = document.getElementById('studPass').value.trim();
  if(!name || !code || !pass){ toast('সবগুলো পূরণ করো'); return; }

  toast('গুগল শিট থেকে পরীক্ষা খোঁজা হচ্ছে...');
  const examRaw = await sget('exam:'+code);
  if(!examRaw){ alert('পরীক্ষা পাওয়া যায়নি! কোডটি সঠিক কিনা যাচাই করো বা একটি নতুন এক্সাম তৈরি করে ট্রাই করো।'); return; }

  const exam = JSON.parse(examRaw.value);

  const requiredPassword = exam.isTreat ? exam.treatPassword : STUDENT_PASSWORD;
  if(pass !== requiredPassword){ toast('পাসওয়ার্ড ভুল হয়েছে'); return; }

  const slug = loggedStud ? loggedStud.slug : slugify(name); // [NEW]

  const existingResults = await getRemoteResults(code);
  const myAttempts = existingResults.filter(r => (r.slug ? r.slug === slug : slugify(r.studentName||'') === slug));
  if(myAttempts.length > 0){
    myAttempts.sort((a,b)=> b.submittedAt - a.submittedAt);
    if(exam.isTreat){
      // Treat exams are tied to real money rewards - no retries allowed once
      // a given name has completed it (this replaces the old password-rotation
      // approach, which was causing confusion).
      go('treatBlocked', { exam, attempt: myAttempts[0] });
      return;
    }
    go('studentChoice', { exam, slug, name, attempts: myAttempts });
    return;
  }

  runCheckingSequence(exam, slug, name, 1); // code exam -> counts as attendance
}

function renderTreatBlocked(exam, attempt){
  const pct = Math.round((attempt.score/attempt.total)*100);
  app.innerHTML = `
    ${header('আগেই সম্পন্ন হয়েছে')}
    <div class="card center">
      <h2>${escapeHtml(exam.title)}</h2>
      <p class="hint">এটা একটা 🎁 Treat Coupon পরীক্ষা — টাকার সাথে যুক্ত থাকায় একই নামে একবারই দেওয়া যায়, আবার দেওয়া যাবে না।</p>
      <div class="stamp ${pct>=50?'':'fail'}">${attempt.score}/${attempt.total}</div>
      <p class="hint" style="margin-top:10px;">তোমার আগের ফলাফল উপরে দেখানো হলো। কোনো ভুল মনে হলে শিক্ষকের সাথে কথা বলো।</p>
    </div>
    <div class="center"><a class="link-back" onclick="go('landing')">← মূল পাতায় ফিরে যাও</a></div>
    ${creditFooter()}
  `;
}
function renderStudentChoice(exam, slug, name, attempts){
  const sortedAsc = [...attempts].sort((a,b)=> a.submittedAt - b.submittedAt);
  const best = attempts.reduce((m,r)=> r.score > m.score ? r : m, attempts[0]);
  const listHtml = [...sortedAsc].reverse().map((r,idxRev)=>{
    const tryNo = sortedAsc.length - idxRev;
    const pct = Math.round((r.score/r.total)*100);
    return `<div class="exam-item">
      <div class="row-top">
        <div>
          <h3 style="margin-bottom:2px;">চেষ্টা ${tryNo}</h3>
          <div class="meta">${new Date(r.submittedAt).toLocaleString('bn-BD')}</div>
        </div>
        <div class="score-big ${pct>=50?'score-pass':'score-fail'}">${r.score}/${r.total}</div>
      </div>
      <button class="btn btn-outline btn-block" style="margin-top:8px;" onclick="viewAttemptDetail(${tryNo})">এই খাতাটা দেখো</button>
    </div>`;
  }).join('');

  app.innerHTML = `
    ${header('আগে থেকেই পরীক্ষা দিয়েছো')}
    <div class="card center">
      <h2>${escapeHtml(exam.title)}</h2>
      <p class="hint">তুমি এই পরীক্ষাটা আগে ${attempts.length} বার দিয়েছো। এটা practice এর জন্য, তাই চাইলে আবার দিতে পারো — অথবা যেকোনো আগের চেষ্টার খাতা দেখতে পারো।</p>
      <p class="hint">সেরা স্কোর: <b>${best.score}/${best.total}</b></p>
      <button class="btn btn-gold btn-block" onclick="startPracticeAttempt()">✍️ আবার পরীক্ষা দাও (Practice)</button>
    </div>
    <div class="card">
      <h3 style="margin-bottom:10px;">সব চেষ্টার তালিকা</h3>
      ${listHtml}
    </div>
    <div class="center"><a class="link-back" onclick="go('landing')">← মূল পাতায় ফিরে যাও</a></div>
    ${creditFooter()}
  `;
  window.__choiceCtx = { exam, slug, name, attempts, sortedAsc };
}
window.viewAttemptDetail = function(tryNo){
  const { exam, sortedAsc } = window.__choiceCtx;
  const attempt = sortedAsc[tryNo - 1];
  go('studentAlready', { exam, prev: attempt, tryNo, totalTries: sortedAsc.length });
}
window.startPracticeAttempt = function(){
  const { exam, slug, name, attempts } = window.__choiceCtx;
  runCheckingSequence(exam, slug, name, attempts.length + 1, { practice: true }); // [NEW] re-takes are practice
}

function renderStudentAlready(exam, prev, tryNo, totalTries){
  const pct = Math.round((prev.score/prev.total)*100);
  const answers = prev.answers || [];
  const detail = buildAnswerReview(exam, answers);
  const hasCtx = !!window.__choiceCtx;
  app.innerHTML = `
    ${header('আগের ফলাফল')}
    <div class="card center">
      <h2>${escapeHtml(exam.title)}</h2>
      <p class="hint">${tryNo ? `চেষ্টা ${tryNo} / ${totalTries} — ` : ''}এই attempt-এ তুমি যা দাগিয়েছিলে, নিচে দেখানো হলো।</p>
      <div class="stamp ${pct>=50?'':'fail'}">${prev.score}/${prev.total}</div>
    </div>
    <div class="card" style="text-align:start;">${detail}</div>
    <div class="row">
      ${hasCtx ? `<button class="btn btn-outline btn-block" onclick="go('studentChoice', window.__choiceCtx)">← সব চেষ্টার তালিকায় ফিরে যাও</button>`:''}
      <button class="btn btn-outline btn-block" onclick="go('landing')">মূল পাতায় ফিরে যাও</button>
    </div>
    ${creditFooter()}
  `;
}

function runCheckingSequence(exam, slug, name, attemptNumber, opts){
  app.innerHTML = `
    ${header('যাচাই হচ্ছে')}
    <div class="card check-seq">
      <div id="cLine0" class="check-line">গুগল ডাটাবেজ কানেক্ট করা হচ্ছে...</div>
      <div id="cLine1" class="check-line"><span class="tick">✓</span> নাম নিবন্ধন সম্পন্ন</div>
      <div id="cLine2" class="check-line"><span class="tick">✓</span> পরীক্ষা শুরু করার জন্য প্রস্তুত</div>
    </div>
    ${creditFooter()}
  `;
  setTimeout(()=> document.getElementById('cLine0').classList.add('show'), 150);
  setTimeout(()=> document.getElementById('cLine1').classList.add('show'), 600);
  setTimeout(()=> document.getElementById('cLine2').classList.add('show'), 1100);
  setTimeout(async ()=>{
    go('studentExam', {
      exam, slug, name, attemptNumber: attemptNumber || 1,
      viaCode: !(opts && opts.practice), // [NEW] only code-based exams mark attendance
      answers: new Array(exam.questions.length).fill(null),
      locked: new Array(exam.questions.length).fill(false),
      startedAt: Date.now(),
      qIndex: 0
    });
  }, 1600);
}

function renderStudentExam(){
  if(state.exam.timerMode === 'total') renderStudentExamTotal();
  else renderStudentExamPerQ();
}

function renderStudentExamTotal(){
  const { exam, answers, locked } = state;
  const totalSec = exam.duration*60;
  const qHtml = exam.questions.map((q,i)=> `
    <div class="q-block">
      <div style="display:flex; align-items:flex-start; gap:2px;">
        <span class="q-num">${i+1}</span>
        <div style="margin-inline-start:4px;">
          <div class="q-text">${escapeHtml(q.text)}</div>
          ${q.tag ? `<span class="q-tag">${escapeHtml(q.tag)}</span>`:''}
        </div>
      </div>
      ${q.options.map((opt,j)=> `
        <label class="bubble-opt ${locked[i]?'locked':''}">
          <input type="radio" name="ans${i}" ${answers[i]===j?'checked':''} ${locked[i]?'disabled':''} onchange="setAnswerTotal(${i},${j})">
          <div class="bubble">${['ক','খ','গ','ঘ'][j]}</div>
          <div class="opt-text">${escapeHtml(opt)}</div>
        </label>
      `).join('')}
    </div>
  `).join('');

  app.innerHTML = `
    <div>
      <div class="timer-chip" id="timerChip"><span class="timer-dot"></span><span id="timerText">${fmtTime(totalSec)}</span></div>
      <header class="top" style="margin-bottom:8px;"><div class="logo" style="font-size:22px;">${escapeHtml(exam.title)}</div></header>
    </div>
    <div class="card">${qHtml}</div>
    <button class="btn btn-primary btn-block" onclick="submitExam(false)">✅ খাতা জমা দাও</button>
    ${creditFooter()}
  `;

  let remaining = totalSec - Math.floor((Date.now()-state.startedAt)/1000);
  if(remaining < 0) remaining = 0;
  updateTimerDisplay(remaining);
  timerInterval = setInterval(()=>{
    remaining -= 1;
    updateTimerDisplay(remaining);
    if(remaining <= 0){
      clearInterval(timerInterval); timerInterval = null;
      submitExam(true);
    }
  }, 1000);
}
window.setAnswerTotal = function(qi, oi){
  window.__lastFocusedQ = qi;
  state.answers[qi] = oi;
  state.locked[qi] = true;
  renderStudentExamTotal();
}

function renderStudentExamPerQ(){
  const { exam, answers, qIndex } = state;
  const q = exam.questions[qIndex];
  const secPerQ = exam.perQuestionSeconds;
  const answered = answers[qIndex] !== null;

  app.innerHTML = `
    <div>
      <div class="timer-chip" id="timerChip"><span class="timer-dot"></span><span id="timerText">${fmtTime(secPerQ)}</span></div>
      <header class="top" style="margin-bottom:8px;"><div class="logo" style="font-size:22px;">${escapeHtml(exam.title)}</div></header>
    </div>
    <div class="qprog">প্রশ্ন ${qIndex+1} / ${exam.questions.length}</div>
    <div class="card">
      <div class="q-block" style="border-bottom:none; padding-bottom:0;">
        <div style="display:flex; align-items:flex-start; gap:2px;">
          <span class="q-num">${qIndex+1}</span>
          <div style="margin-inline-start:4px;">
            <div class="q-text">${escapeHtml(q.text)}</div>
            ${q.tag ? `<span class="q-tag">${escapeHtml(q.tag)}</span>`:''}
          </div>
        </div>
        ${q.options.map((opt,j)=> `
          <label class="bubble-opt ${answered?'locked':''}">
            <input type="radio" name="ansq" ${answers[qIndex]===j?'checked':''} ${answered?'disabled':''} onchange="setAnswerPerQ(${j})">
            <div class="bubble">${['ক','খ','গ','ঘ'][j]}</div>
            <div class="opt-text">${escapeHtml(opt)}</div>
          </label>
        `).join('')}
      </div>
    </div>
    ${creditFooter()}
  `;

  let remaining = secPerQ;
  updateTimerDisplay(remaining);
  timerInterval = setInterval(()=>{
    remaining -= 1;
    updateTimerDisplay(remaining);
    if(remaining <= 0){
      clearInterval(timerInterval); timerInterval = null;
      advanceQuestion();
    }
  }, 1000);
}
window.setAnswerPerQ = function(oi){
  if(timerInterval){ clearInterval(timerInterval); timerInterval = null; }
  state.answers[state.qIndex] = oi;
  setTimeout(()=> advanceQuestion(), 450);
}
function advanceQuestion(){
  if(state.qIndex >= state.exam.questions.length - 1){
    submitExam(false);
  } else {
    state.qIndex += 1;
    render();
  }
}

function updateTimerDisplay(sec){
  const chip = document.getElementById('timerChip');
  const txt = document.getElementById('timerText');
  if(!txt) return;
  txt.textContent = fmtTime(Math.max(sec,0));
  if(chip && sec <= 8) chip.classList.add('low');
}

window.submitExam = async function(auto){
  if(timerInterval){ clearInterval(timerInterval); timerInterval=null; }
  const { exam, slug, name, answers, attemptNumber, viaCode } = state;
  let score = 0;
  exam.questions.forEach((q,i)=>{ if(answers[i] === q.correct) score++; });
  const resultObj = { id: genId('res'), studentName: name, slug, score, total: exam.questions.length, submittedAt: Date.now(), answers, attemptNumber: attemptNumber||1 };

  if(typeof recordExamMistakes === 'function'){
    recordExamMistakes(exam, answers);
  }

  app.innerHTML = `${header('জমা হচ্ছে')} <div class="card center">গুগল শিটে আপনার উত্তরপত্র জমা হচ্ছে, দয়া করে অপেক্ষা করুন...</div>`;

  const res = await sset('result:'+exam.code+':'+slug, JSON.stringify(resultObj));
  if(!res){
    window.__pendingResult = { exam, slug, resultObj, auto, viaCode };
    app.innerHTML = `
      ${header('জমা ব্যর্থ হয়েছে')}
      <div class="card center">
        <p class="hint">তোমার উত্তরপত্র জমা দিতে সমস্যা হয়েছে (ইন্টারনেট বা সার্ভার সমস্যা)। তোমার উত্তরগুলো এখনো এই ডিভাইসে সেভ আছে, হারিয়ে যায়নি — নিচে আবার চেষ্টা করো।</p>
        <button class="btn btn-primary btn-block" onclick="retrySubmit()">🔁 আবার জমা দাও</button>
      </div>
      ${creditFooter()}
    `;
    return;
  }
  await finalizeExamSubmission(exam, slug, resultObj, auto, viaCode);
}
window.retrySubmit = async function(){
  const { exam, slug, resultObj, auto, viaCode } = window.__pendingResult;
  app.innerHTML = `${header('জমা হচ্ছে')} <div class="card center">আবার চেষ্টা করা হচ্ছে...</div>`;
  const res = await sset('result:'+exam.code+':'+slug, JSON.stringify(resultObj));
  if(!res){
    app.innerHTML = `
      ${header('জমা ব্যর্থ হয়েছে')}
      <div class="card center">
        <p class="hint">আবারও ব্যর্থ হয়েছে। ইন্টারনেট কানেকশন চেক করে আবার চেষ্টা করো।</p>
        <button class="btn btn-primary btn-block" onclick="retrySubmit()">🔁 আবার জমা দাও</button>
      </div>
      ${creditFooter()}
    `;
    return;
  }
  await finalizeExamSubmission(exam, slug, resultObj, auto, viaCode);
}
async function finalizeExamSubmission(exam, slug, resultObj, auto, viaCode){
  let couponAmount = 0;
  if(exam.isTreat && (resultObj.attemptNumber||1) === 1){
    const percent = Math.round((resultObj.score/exam.questions.length)*100);
    const couponRes = await awardCouponRemote(slug, exam.code, percent);
    if(couponRes && couponRes.amount) couponAmount = couponRes.amount;
    // NOTE: password is no longer rotated after use - once someone with a given
    // name has completed this Treat exam, they're blocked from re-entering
    // (checked in verifyStudentLogin), so a fixed shared password is safe.
  }
  // [NEW] taking a CODE exam today counts as proof of attendance (blue). Practice exams / retakes do not.
  if(viaCode) markAttendanceRemote(slug, todayStr(), 'exam').catch(()=>{});
  go('studentResult', { exam, result: resultObj, auto, couponAmount });
}

function buildAnswerReview(exam, answers){
  return exam.questions.map((q,qi)=>{
    const given = answers[qi];
    const correct = q.correct;
    const isRight = given === correct;
    const givenLabel = (given===null||given===undefined) ? 'উত্তর দেওনি' : `${['ক','খ','গ','ঘ'][given]}) ${escapeHtml(q.options[given])}`;
    const correctLabel = `${['ক','খ','গ','ঘ'][correct]}) ${escapeHtml(q.options[correct])}`;
    return `<div class="review-block">
      <div class="q-text" style="font-size:14px;">${qi+1}. ${escapeHtml(q.text)}</div>
      <div class="review-ans ${isRight?'right':'wrong'}">তুমি দিয়েছিলে: ${givenLabel} ${isRight?'✓':'✗'}</div>
      ${!isRight ? `<div class="review-ans right">সঠিক উত্তর: ${correctLabel}</div>` : ''}
    </div>`;
  }).join('');
}

function renderStudentResult(){
  const { exam, result, auto, couponAmount } = state;
  const pct = Math.round((result.score/result.total)*100);
  app.innerHTML = `
    ${header('ফলাফল')}
    <div class="card center">
      <h2>${escapeHtml(exam.title)}</h2>
      ${auto ? `<p class="hint">⏱️ সময় শেষ হয়ে যাওয়ায় স্বয়ংক্রিয়ভাবে জমা হয়েছে।</p>`:''}
      <div class="stamp ${pct>=50?'':'fail'}">${result.score}/${result.total}</div>
      ${couponAmount>0 ? `<div class="say" style="margin-top:14px;">🎁 <b>অভিনন্দন!</b> তুমি ৳${couponAmount} Treat Coupon পেয়েছো! "🎁 আমার Treat Coupon" থেকে দেখতে পারবে।</div>` : ''}
      <p class="hint" style="margin-top:10px;">নিচে দেখো কোন প্রশ্নে কী দাগিয়েছিলে — এখনই দেখে নাও, পরে আবার লগইন করার দরকার নেই।</p>
    </div>
    <div class="card" style="text-align:start;">${buildAnswerReview(exam, result.answers)}</div>
    <div class="center">
      <button class="btn btn-primary" onclick="go('landing')">মূল পাতায় যাও</button>
    </div>
    ${creditFooter()}
  `;
}


// ---------------- Past Exams (student) ----------------
async function renderPastExams(){
  const stud = getLoggedStudent();
  if(!stud){ go('studentAuth'); return; }
  app.innerHTML = `${header('Past Exams')}<div class="card center">তোমার আগের পরীক্ষাগুলো লোড হচ্ছে...</div>`;
  const [mcqRes, wrRes] = await Promise.all([
    getJson('listMyResults', { slug: stud.slug }),
    getJson('listMyWrittenResults', { slug: stud.slug })
  ]);
  const mcq = (mcqRes && mcqRes.status === 'success') ? mcqRes.data : [];
  const wr = (wrRes && wrRes.status === 'success') ? wrRes.data : [];

  // one row per exam (best attempt shown); open practice exams are not listed here
  const groups = {};
  mcq.filter(r=> !r.isPublic).forEach(r=>{ (groups[r.examCode] = groups[r.examCode] || []).push(r); });
  const items = Object.keys(groups).map(code=>{
    const list = groups[code].sort((a,b)=> b.submittedAt - a.submittedAt);
    const best = list.reduce((m,r)=> (r.score/r.total > m.score/m.total ? r : m), list[0]);
    return { kind:'mcq', code, title:list[0].title, subject:list[0].subject, isTreat:!!list[0].isTreat,
             attempts:list.length, score:best.score, total:best.total,
             pct: best.total ? Math.round((best.score/best.total)*100) : 0, when:list[0].submittedAt };
  });
  wr.forEach(w=>{
    const answered = w.answeredCount || 0;
    const marks = percentToMarks(w.avgPercent) * answered;
    items.push({ kind:'written', code:w.examCode, title:w.title, subject:w.subject, isTreat:true,
                 attempts:1, score:marks, total:answered*5, pct:w.avgPercent, when:w.lastSubmittedAt,
                 answered, totalQ:w.totalQ });
  });
  items.sort((a,b)=> (b.when||0) - (a.when||0));
  window.__pastItems = items;

  const avg = items.length ? Math.round(items.reduce((a,b)=> a + b.pct, 0) / items.length) : 0;
  const rows = items.map((it,idx)=> `
    <div class="exam-item">
      <div class="row-top">
        <div style="min-width:0;">
          <h3 style="margin-bottom:4px;">${escapeHtml(it.title)}</h3>
          <div class="meta">
            <span class="q-tag">${it.kind==='written' ? '✍️ Written' : '📝 MCQ'}</span>
            ${it.isTreat && it.kind==='mcq' ? '<span class="q-tag">🎁 Treat</span>' : ''}
            ${escapeHtml(it.subject||'')} · ${it.when ? new Date(it.when).toLocaleDateString('bn-BD') : ''}
            ${it.attempts>1 ? ` · ${it.attempts}বার দিয়েছো` : ''}
            ${it.kind==='written' && it.answered < it.totalQ ? ` · ${it.answered}/${it.totalQ} প্রশ্ন জমা` : ''}
          </div>
        </div>
        <div style="text-align:end;">
          <div class="score-big ${it.pct>=50?'score-pass':'score-fail'}" style="font-size:18px;">${it.score}/${it.total}</div>
          <div class="meta" style="margin-top:0;">${it.pct}%</div>
        </div>
      </div>
      <button class="btn btn-outline btn-block" style="margin-top:10px;" onclick="${it.kind==='written' ? 'openPastWritten' : 'openPastExam'}(${idx})">📄 খাতা ও নম্বর দেখো</button>
    </div>`).join('');

  app.innerHTML = `
    ${header('Past Exams')}
    <div class="card">
      <h2>📜 আমার আগের পরীক্ষা</h2>
      <p class="hint">কোড দিয়ে দেওয়া পরীক্ষা ও Written পরীক্ষার নম্বর এখানে থাকে। (প্র্যাকটিস পরীক্ষা এখানে দেখানো হয় না — সেগুলো ড্যাশবোর্ডের "প্র্যাকটিস" অংশে আছে।)</p>
      ${items.length ? `<div class="meta" style="margin-bottom:12px;">মোট <b>${items.length}</b>টা পরীক্ষা · গড় <b>${avg}%</b></div>` : ''}
      ${rows || `<div class="empty-state">এখনো কোনো পরীক্ষা দাওনি।<br>শিক্ষকের দেওয়া কোড দিয়ে পরীক্ষা দিলে এখানে নম্বর জমা থাকবে।</div>`}
    </div>
    <div class="center"><a class="link-back" onclick="go('studentDashboard')">← ড্যাশবোর্ডে ফিরে যাও</a></div>
    ${creditFooter()}
  `;
}
window.openPastExam = async function(idx){
  const it = (window.__pastItems||[])[idx];
  const stud = getLoggedStudent();
  if(!it || !stud) return;
  toast('খাতা লোড হচ্ছে...');
  const examRaw = await sget('exam:'+it.code);
  if(!examRaw){ toast('এই পরীক্ষাটা আর পাওয়া যাচ্ছে না'); return; }
  const exam = JSON.parse(examRaw.value);
  const all = await getRemoteResults(it.code);
  const mine = all.filter(r=> (r.slug ? r.slug === stud.slug : slugify(r.studentName||'') === stud.slug))
                  .sort((a,b)=> b.submittedAt - a.submittedAt);
  if(!mine.length){ toast('খাতা পাওয়া যায়নি'); return; }
  go('pastExamDetail', { exam, attempts: mine });
};
function renderPastExamDetail(exam, attempts){
  const blocks = attempts.map((r,i)=>{
    const pct = Math.round((r.score/r.total)*100);
    const tryNo = attempts.length - i;
    return `<details ${i===0?'open':''} style="border:1px solid var(--paper-edge); border-radius:10px; padding:10px 14px; margin-bottom:10px; background:#FCFDFE;">
      <summary style="cursor:pointer; font-weight:700; list-style-position:inside;">
        চেষ্টা ${tryNo} · <span class="score-big ${pct>=50?'score-pass':'score-fail'}">${r.score}/${r.total}</span> (${pct}%)
        <span class="meta" style="font-weight:400;"> · ${new Date(r.submittedAt).toLocaleString('bn-BD')}</span>
      </summary>
      <div style="margin-top:10px;">${buildAnswerReview(exam, r.answers || [])}</div>
    </details>`;
  }).join('');
  app.innerHTML = `
    ${header('Past Exams')}
    <div class="card">
      <h2>${escapeHtml(exam.title)}</h2>
      <p class="hint">${escapeHtml(exam.subject||'')} · কোন প্রশ্নে কী দাগিয়েছিলে আর সঠিক উত্তর কী ছিল নিচে দেখো।</p>
      ${blocks}
    </div>
    <div class="center"><a class="link-back" onclick="go('pastExams')">← Past Exams-এ ফিরে যাও</a></div>
    ${creditFooter()}
  `;
  renderAllMath(document.getElementById('app'));
}
window.openPastWritten = async function(idx){
  const it = (window.__pastItems||[])[idx];
  const stud = getLoggedStudent();
  if(!it || !stud) return;
  toast('লোড হচ্ছে...');
  const subs = (await getWrittenSubmissionsRemote(it.code)).filter(s=> s.slug === stud.slug).sort((a,b)=> a.questionIndex - b.questionIndex);
  go('pastWrittenDetail', { title: it.title, subs });
};
function renderPastWrittenDetail(title, subs){
  const rows = (subs||[]).map(s=> `
    <div class="review-block">
      <div class="q-text" style="font-size:14px;">প্রশ্ন ${s.questionIndex+1} · ${percentToMarks(s.percent)}/৫ নম্বর <span class="meta">(AI ${s.percent}%)</span>
        ${s.driveUrl ? ` · <a href="${escapeHtml(s.driveUrl)}" target="_blank" rel="noopener">তোমার খাতার ছবি</a>` : ''}</div>
      <div class="review-ans ${s.percent>=50?'right':'wrong'}">${escapeHtml(s.aiFeedback||'')}</div>
    </div>`).join('');
  app.innerHTML = `
    ${header('Past Exams')}
    <div class="card">
      <h2>${escapeHtml(title)}</h2>
      ${rows || `<div class="empty-state">কোনো উত্তর পাওয়া যায়নি।</div>`}
    </div>
    <div class="center"><a class="link-back" onclick="go('pastExams')">← Past Exams-এ ফিরে যাও</a></div>
    ${creditFooter()}
  `;
}
// Mastery progress for the logged-in student without asking for the name again
window.openMyMastery = function(){
  const stud = getLoggedStudent();
  if(!stud){ go('masteryEntry'); return; }
  window.__masterySession = { slug: stud.slug, name: stud.name };
  go('masteryCourseList');
};
