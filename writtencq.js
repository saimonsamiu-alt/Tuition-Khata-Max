// ============================================================================
// writtencq.js -- part of the পরীক্ষার খাতা frontend, split out of the original
// single inline <script> in index.html for readability. Loaded via plain
// <script src="js/writtencq.js"> tags (in the order listed in index.html), which
// all share one global scope in the browser -- exactly like the original
// single script did, so nothing about how functions call each other changes.
// ============================================================================

// ================= WRITTEN CQ EXAM (multi-question, AI-graded against model answers) =================
async function getWrittenQuestions(){
  try{
    const r = await fetch(`${SCRIPT_URL}?action=listWrittenQuestions`);
    const json = await r.json();
    if(json.status==='success') return json.data;
  } catch(e){}
  return [];
}
async function saveWrittenExamRemote(id, title, subject, questions){
  const res = await postToScript('saveWrittenQuestion', { id: id||'', title, subject, questions: JSON.stringify(questions) });
  return res;
}
async function deleteWrittenQuestionRemote(id){
  try{ await fetch(`${SCRIPT_URL}?action=deleteWrittenQuestion&id=${encodeURIComponent(id)}`); }catch(e){}
}
async function getWrittenQuestionByCode(code){
  try{
    const r = await fetch(`${SCRIPT_URL}?action=getWrittenQuestion&code=${encodeURIComponent(code)}`);
    const json = await r.json();
    if(json.status==='success') return json.data;
  } catch(e){}
  return null;
}
async function submitWrittenAnswerRemote(code, slug, studentName, questionIndex, base64, mimeType, fileName){
  const res = await postToScript('submitWrittenAnswer', { code, slug, studentName, questionIndex, base64, mimeType, fileName });
  return res;
}
async function getWrittenSubmissionsRemote(code){
  try{
    const r = await fetch(`${SCRIPT_URL}?action=listWrittenSubmissions&code=${encodeURIComponent(code)}`);
    const json = await r.json();
    if(json.status==='success') return json.data;
  } catch(e){}
  return [];
}
async function updateWrittenScoreRemote(submissionId, newPercent){
  const res = await postToScript('updateWrittenScore', { submissionId, newPercent });
  return res;
}
function parseWrittenBulk(raw){
  const blocks = raw.split(/\n\s*\n/).map(b=>b.trim()).filter(Boolean);
  const questions = [];
  for(const block of blocks){
    const lines = block.split('\n').map(l=>l.trim()).filter(Boolean);
    let text='', imageUrl='', modelAnswerText='', modelAnswerImageUrl='';
    for(const line of lines){
      const qm = line.match(/^Q[:.]?\s*(.*)$/i);
      const qim = line.match(/^QIMG[:.]?\s*(.*)$/i);
      const mm = line.match(/^MODEL[:.]?\s*(.*)$/i);
      const mim = line.match(/^MIMG[:.]?\s*(.*)$/i);
      if(qm) text = qm[1];
      else if(qim) imageUrl = qim[1].trim();
      else if(mm) modelAnswerText = mm[1];
      else if(mim) modelAnswerImageUrl = mim[1].trim();
    }
    if(text || imageUrl){ questions.push({ text, imageUrl, modelAnswerText, modelAnswerImageUrl }); }
  }
  return questions;
}

// ---- Teacher: manage written CQ exams (each with many questions) ----
async function renderWrittenManage(){
  app.innerHTML = `${header('Written CQ ম্যানেজ করো')}<div class="card center">লোড হচ্ছে...</div>`;
  const exams = await getWrittenQuestions();
  window.__writtenExamsCache = exams;
  let rows = exams.map((q,idx)=> `
    <div class="exam-item">
      <div class="row-top">
        <div>
          <h3 style="margin-bottom:2px;">${escapeHtml(q.title)}</h3>
          <div class="meta">${escapeHtml(q.subject)} · কোড: <span class="code-chip">${q.code}</span> · পাসওয়ার্ড: <b>${q.treatPassword}</b> · ${q.questions.length}টা প্রশ্ন</div>
        </div>
      </div>
      <div class="row" style="margin-top:8px;">
        <button class="btn btn-outline" onclick="editWrittenExam(${idx})">✏️ এডিট করো</button>
        <button class="btn btn-outline" onclick="goWrittenSubmissions('${q.code}')">📸 জমা দেখো</button>
        <button class="btn btn-danger" onclick="deleteWrittenExamItem('${q.id}')">🗑️ মুছো</button>
      </div>
    </div>`).join('');
  if(exams.length===0) rows = `<div class="empty-state">এখনো কোনো Written exam যোগ করোনি।</div>`;
  app.innerHTML = `
    ${header('Written CQ ম্যানেজ করো')}
    <div class="card">
      <h2>Written CQ Exam সমূহ</h2>
      <p class="hint">একটা exam-এ একসাথে অনেকগুলো প্রশ্ন (২০+ ও রাখা যায়) থাকতে পারে — student প্রতিটার জন্য আলাদা ছবি আপলোড করবে। সব প্রশ্নের উত্তর জমা হলে গড় percentage থেকে একটামাত্র Treat Coupon পাবে। প্রশ্নের নিজস্ব password আছে, সব প্রশ্ন শেষ হলে বদলে যায়।</p>
      ${rows}
      <button class="btn btn-primary btn-block" style="margin-top:10px;" onclick="go('writtenEdit',{examId:null})">+ নতুন Written Exam যোগ করো</button>
    </div>
    <div class="center"><a class="link-back" onclick="go('couponManage')">← ফিরে যাও</a></div>
    ${creditFooter()}
  `;
}
window.editWrittenExam = function(idx){
  const q = window.__writtenExamsCache[idx];
  go('writtenEdit', { examId: q.id, existing: q });
}
window.deleteWrittenExamItem = async function(id){
  if(!confirm('এই exam-টা মুছে ফেলতে চাও?')) return;
  await deleteWrittenQuestionRemote(id);
  toast('মুছে ফেলা হয়েছে');
  go('writtenManage');
}
window.goWrittenSubmissions = function(code){
  go('writtenSubmissions', { code });
}
function questionsToBulkText(questions){
  return (questions||[]).map(q=>{
    let block = `Q: ${q.text||''}`;
    if(q.imageUrl) block += `\nQIMG: ${q.imageUrl}`;
    block += `\nMODEL: ${q.modelAnswerText||''}`;
    if(q.modelAnswerImageUrl) block += `\nMIMG: ${q.modelAnswerImageUrl}`;
    return block;
  }).join('\n\n');
}
let writtenDraftQuestions = [];
function blankWrittenQuestion(){ return { text:'', imageUrl:'', modelAnswerText:'', modelAnswerImageUrl:'' }; }
function renderWrittenEdit(examId, existing){
  existing = existing || {};
  writtenDraftQuestions = (existing.questions && existing.questions.length) ? existing.questions.map(q=>({...q})) : [ blankWrittenQuestion() ];
  window.__writtenEditCtx = { examId, title: existing.title||'', subject: existing.subject||'' };
  app.innerHTML = `
    ${header('Written CQ Exam')}
    <div class="card">
      <h2>${examId ? 'এডিট করো' : 'নতুন Written Exam'}</h2>
      <label class="field-label">শিরোনাম</label>
      <input type="text" id="wqTitle" value="${escapeHtml(existing.title||'')}" placeholder="যেমন: ইন্টিগ্রেশন — অনুশীলনী ৩ (২০টা প্রশ্ন)">
      <label class="field-label">বিষয়</label>
      <input type="text" id="wqSubject" value="${escapeHtml(existing.subject||'')}" placeholder="যেমন: গণিত">
    </div>
    <div class="card">
      <h2>📥 দ্রুত ইম্পোর্ট (ঐচ্ছিক)</h2>
      <p class="hint">অনেক প্রশ্ন একসাথে পেস্ট করতে চাইলে (ছবি ছাড়া, শুধু লেখা): দুইটা প্রশ্নের মাঝে ফাঁকা লাইন রাখো —<br>
      <code>Q: প্রশ্নের লেখা<br>MODEL: সঠিক সমাধানের বর্ণনা</code></p>
      <textarea id="wqBulkText" style="min-height:140px; font-family:var(--font-mono); font-size:13px;" placeholder="Q: প্রথম প্রশ্ন...&#10;MODEL: সমাধান...&#10;&#10;Q: দ্বিতীয় প্রশ্ন...&#10;MODEL: ..."></textarea>
      <button class="btn btn-outline btn-block" onclick="importWrittenBulk()">📥 ইম্পোর্ট করো (নিচে যোগ হবে)</button>
    </div>
    <div class="card">
      <h2>প্রশ্নসমূহ (প্রতিটার নিজস্ব ছবি আপলোড করা যায়)</h2>
      <p class="hint">প্রতিটা প্রশ্ন আলাদা বিষয়ের হতে পারে — যেমন ১ নম্বরে Chemistry, ২ নম্বরে Math। প্রশ্ন লেখা বা ছবি (বা দুটোই) দাও, মডেল উত্তরও একইভাবে।</p>
      <div id="wqList"></div>
      <button class="btn btn-outline btn-block" onclick="addWrittenQuestion()">+ আরেকটা প্রশ্ন যোগ করো</button>
    </div>
    <button class="btn btn-primary btn-block" onclick="saveWrittenExamItem('${examId||''}')">✅ সেভ করো</button>
    <div id="wqSaveStatus" style="margin-top:10px;"></div>
    <div class="center"><a class="link-back" onclick="go('writtenManage')">← ফিরে যাও</a></div>
    ${creditFooter()}
  `;
  renderWrittenQList();
}
window.addWrittenQuestion = function(){ writtenDraftQuestions.push(blankWrittenQuestion()); renderWrittenQList(); }
window.removeWrittenQuestion = function(i){ writtenDraftQuestions.splice(i,1); if(writtenDraftQuestions.length===0) writtenDraftQuestions.push(blankWrittenQuestion()); renderWrittenQList(); }
window.importWrittenBulk = function(){
  const raw = document.getElementById('wqBulkText').value;
  if(!raw.trim()){ toast('আগে টেক্সট পেস্ট করো'); return; }
  const parsed = parseWrittenBulk(raw);
  if(parsed.length === 0){ toast('কোনো প্রশ্ন পার্স করা যায়নি'); return; }
  // if the only existing row is still blank, replace it instead of leaving an empty row behind
  if(writtenDraftQuestions.length===1 && !writtenDraftQuestions[0].text && !writtenDraftQuestions[0].imageUrl){
    writtenDraftQuestions = parsed;
  } else {
    writtenDraftQuestions = writtenDraftQuestions.concat(parsed);
  }
  renderWrittenQList();
  toast(parsed.length + 'টা প্রশ্ন যোগ হয়েছে');
  document.getElementById('wqBulkText').value = '';
}
function renderWrittenQList(){
  const el = document.getElementById('wqList');
  el.innerHTML = writtenDraftQuestions.map((q,i)=> `
    <div class="q-block">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span class="q-num">${i+1}</span>
        ${writtenDraftQuestions.length>1 ? `<a class="link-back" onclick="removeWrittenQuestion(${i})">মুছো</a>`:''}
      </div>
      <label class="field-label">প্রশ্ন (লেখা, ঐচ্ছিক যদি ছবি দাও)</label>
      <textarea oninput="writtenDraftQuestions[${i}].text=this.value" style="min-height:70px;" placeholder="প্রশ্নটা লেখো...">${escapeHtml(q.text)}</textarea>
      <label class="field-label">প্রশ্নের ছবি আপলোড করো (ঐচ্ছিক)</label>
      <input type="file" accept="image/*" onchange="handleWrittenQImageUpload(this, ${i})" style="margin-bottom:6px;">
      <div id="wqImgPrev${i}">${q.imageUrl ? `<img src="${escapeHtml(q.imageUrl)}" style="max-width:100%; border-radius:8px; margin-bottom:10px;" alt="প্রশ্নের ছবি">`:''}</div>
      <label class="field-label">মডেল উত্তর (AI এটার সাথে তুলনা করবে)</label>
      <textarea oninput="writtenDraftQuestions[${i}].modelAnswerText=this.value" style="min-height:90px;" placeholder="ধাপে ধাপে সঠিক সমাধান লেখো...">${escapeHtml(q.modelAnswerText)}</textarea>
      <label class="field-label">মডেল উত্তরের ছবি আপলোড করো (ঐচ্ছিক)</label>
      <input type="file" accept="image/*" onchange="handleWrittenModelImageUpload(this, ${i})" style="margin-bottom:6px;">
      <div id="wqModelImgPrev${i}">${q.modelAnswerImageUrl ? `<img src="${escapeHtml(q.modelAnswerImageUrl)}" style="max-width:100%; border-radius:8px; margin-bottom:10px;" alt="মডেল উত্তরের ছবি">`:''}</div>
    </div>
  `).join('');
}
window.handleWrittenQImageUpload = async function(inputEl, idx){
  const file = inputEl.files[0];
  if(!file) return;
  document.getElementById('wqImgPrev'+idx).innerHTML = `<p class="hint">আপলোড হচ্ছে...</p>`;
  const compressed = await compressImageFile(file, 1200, 0.75);
  const res = await postToScript('uploadImage', { base64: compressed.base64, mimeType: compressed.mimeType, fileName: file.name });
  if(res && res.url){
    writtenDraftQuestions[idx].imageUrl = res.url;
    document.getElementById('wqImgPrev'+idx).innerHTML = `<img src="${escapeHtml(res.url)}" style="max-width:100%; border-radius:8px; margin-bottom:10px;" alt="প্রশ্নের ছবি">`;
  } else {
    document.getElementById('wqImgPrev'+idx).innerHTML = `<p class="hint">আপলোড ব্যর্থ হয়েছে</p>`;
  }
}
window.handleWrittenModelImageUpload = async function(inputEl, idx){
  const file = inputEl.files[0];
  if(!file) return;
  document.getElementById('wqModelImgPrev'+idx).innerHTML = `<p class="hint">আপলোড হচ্ছে...</p>`;
  const compressed = await compressImageFile(file, 1200, 0.75);
  const res = await postToScript('uploadImage', { base64: compressed.base64, mimeType: compressed.mimeType, fileName: file.name });
  if(res && res.url){
    writtenDraftQuestions[idx].modelAnswerImageUrl = res.url;
    document.getElementById('wqModelImgPrev'+idx).innerHTML = `<img src="${escapeHtml(res.url)}" style="max-width:100%; border-radius:8px; margin-bottom:10px;" alt="মডেল উত্তরের ছবি">`;
  } else {
    document.getElementById('wqModelImgPrev'+idx).innerHTML = `<p class="hint">আপলোড ব্যর্থ হয়েছে</p>`;
  }
}
window.saveWrittenExamItem = async function(examId){
  const title = document.getElementById('wqTitle').value.trim();
  const subject = document.getElementById('wqSubject').value.trim();
  if(!title || !subject){ toast('শিরোনাম ও বিষয় দাও'); return; }
  const questions = writtenDraftQuestions.filter(q=> (q.text && q.text.trim()) || q.imageUrl);
  if(questions.length === 0){ toast('অন্তত একটা প্রশ্নে লেখা বা ছবি দাও'); return; }
  for(const q of questions){
    if(!(q.modelAnswerText && q.modelAnswerText.trim()) && !q.modelAnswerImageUrl){
      toast('প্রতিটা প্রশ্নের মডেল উত্তর (লেখা বা ছবি) দাও');
      return;
    }
  }
  document.getElementById('wqSaveStatus').innerHTML = `<p class="hint">${questions.length}টা প্রশ্ন সেভ হচ্ছে...</p>`;
  const res = await saveWrittenExamRemote(examId, title, subject, questions);
  if(res && res.code){
    alert(`Exam সেভ হয়েছে!\nকোড: ${res.code}\nপাসওয়ার্ড: ${res.treatPassword}\n${questions.length}টা প্রশ্ন যোগ হয়েছে।\n\nএই দুটো student কে দাও।`);
  }
  writtenDraftQuestions = [];
  go('writtenManage');
}

// ---- Teacher: view written submissions with AI score + manual override ----
function percentToMarks(percent){ return Math.round((percent/100)*5*2)/2; } // nearest 0.5, out of 5
async function renderWrittenSubmissions(code){
  app.innerHTML = `${header('জমা দেওয়া খাতা')}<div class="card center">লোড হচ্ছে...</div>`;

  const subs = await getWrittenSubmissionsRemote(code);
  subs.sort((a,b)=> b.submittedAt - a.submittedAt);
  window.__writtenSubsCache = subs;

  const bySlug = {};
  subs.forEach(s=>{ (bySlug[s.slug] = bySlug[s.slug]||[]).push(s); });

  let rows = Object.keys(bySlug).map(slug=>{
    const list = bySlug[slug];
    const totalMarks = list.length * 5;
    const earnedMarks = list.reduce((a,b)=>a+percentToMarks(b.percent),0);
    const qRows = list.sort((a,b)=>a.questionIndex-b.questionIndex).map((s)=>{
      const idxInCache = window.__writtenSubsCache.indexOf(s);
      const marks = percentToMarks(s.percent);
      return `<div class="review-block">
        <div class="q-text" style="font-size:13.5px;">প্রশ্ন ${s.questionIndex+1} · <a href="${escapeHtml(s.driveUrl)}" target="_blank" rel="noopener">ছবি দেখো</a> ${s.reviewRequested ? '<span class="q-tag">🚩 রিভিউ চাওয়া হয়েছে</span>':''}</div>
        <div class="review-ans wrong">🤖 ${marks}/5 নম্বর (AI ${s.percent}%) — ${escapeHtml(s.aiFeedback||'')}</div>
        <div class="row" style="margin-top:6px;">
          <input type="number" id="wmarks${idxInCache}" value="${marks}" min="0" max="5" step="0.5" style="margin-bottom:0;">
          <button class="btn btn-outline" onclick="saveWrittenManualScore('${s.id}',${idxInCache},'${code}')">✅ নম্বর ঠিক করো</button>
        </div>
      </div>`;
    }).join('');
    return `<div class="exam-item">
      <h3 style="margin-bottom:4px;">${escapeHtml(list[0].studentName)}</h3>
      <div class="meta">মোট: <b>${earnedMarks} / ${totalMarks}</b> নম্বর (${list.length}টা প্রশ্নের ভিত্তিতে)</div>
      <div style="margin-top:8px;">${qRows}</div>
    </div>`;
  }).join('');
  if(subs.length===0) rows = `<div class="empty-state">এখনো কেউ জমা দেয়নি।</div>`;
  app.innerHTML = `
    ${header('জমা দেওয়া খাতা')}
    <div class="card">${rows}</div>
    <div class="center"><a class="link-back" onclick="go('writtenManage')">← ফিরে যাও</a></div>
    ${creditFooter()}
  `;
}
window.saveWrittenManualScore = async function(submissionId, idx, code){
  const marks = parseFloat(document.getElementById('wmarks'+idx).value);
  if(isNaN(marks) || marks<0 || marks>5){ toast('০ থেকে ৫ এর মধ্যে নম্বর দাও'); return; }
  const newPercent = Math.round((marks/5)*100);
  toast('আপডেট হচ্ছে...');
  await updateWrittenScoreRemote(submissionId, newPercent);
  toast('আপডেট হয়েছে ✅ (কুপনও পুনঃগণনা হয়েছে)');
  go('writtenSubmissions', { code });
}

// ---- Student: entry + solve multi-question written exam ----
function renderWrittenEntry(){
  app.innerHTML = `
    ${header('Written CQ পরীক্ষা')}
    <div class="card">
      <h2>তোমার তথ্য দাও</h2>
      <label class="field-label">তোমার নাম</label>
      <input type="text" id="wStudName" placeholder="নাম লেখো">
      <label class="field-label">এক্সাম কোড</label>
      <input type="text" id="wCode" placeholder="যেমন: 7K3PQ2" style="text-transform:uppercase;">
      <label class="field-label">পাসওয়ার্ড</label>
      <input type="text" id="wPass" placeholder="শিক্ষকের দেওয়া পাসওয়ার্ড" style="text-transform:uppercase;">
      <button class="btn btn-primary btn-block" onclick="startWrittenExam()">শুরু করো</button>
      <div style="margin-top:14px;"><a class="link-back" onclick="go('landing')">← ফিরে যাও</a></div>
    </div>
    ${creditFooter()}
  `;
}
window.startWrittenExam = async function(){
  const name = document.getElementById('wStudName').value.trim();
  const code = document.getElementById('wCode').value.trim().toUpperCase();
  const pass = document.getElementById('wPass').value.trim().toUpperCase();
  if(!name || !code || !pass){ toast('সবগুলো পূরণ করো'); return; }
  toast('খোঁজা হচ্ছে...');
  const q = await getWrittenQuestionByCode(code);
  if(!q){ toast('এই কোডে কোনো exam পাওয়া যায়নি'); return; }
  // compare as text, defensively, in case a password ever ends up stored/read as a different type
  if(String(pass).trim().toUpperCase() !== String(q.treatPassword).trim().toUpperCase()){ toast('পাসওয়ার্ড ভুল হয়েছে'); return; }

  const slug = slugify(name);
  // this is a Treat exam tied to money - block re-entry once this name has fully
  // completed it before; if partially done, resume exactly where they left off
  const mySubs = await getWrittenSubmissionsRemote(code);
  const mine = mySubs.filter(s=> s.slug === slug);
  const answered = {};
  mine.forEach(s=>{ answered[s.questionIndex] = { percent: s.percent, aiFeedback: s.aiFeedback }; });
  if(Object.keys(answered).length >= q.questions.length){
    const avgPercent = Math.round(mine.reduce((a,b)=>a+b.percent,0)/mine.length);
    go('treatBlocked', { exam: { title: q.title, isWritten: true }, attempt: { score: percentToMarks(avgPercent)*q.questions.length, total: q.questions.length*5 } });
    return;
  }
  window.__writtenSolveCtx = { exam: q, slug, name, answered };
  go('writtenSolve', { exam: q, slug, name });
}
function renderWrittenSolve(exam, slug, name){
  if(!window.__writtenSolveCtx || window.__writtenSolveCtx.exam.code !== exam.code){
    window.__writtenSolveCtx = { exam, slug, name, answered: {} };
  }
  redrawWrittenSolve();
}
function redrawWrittenSolve(){
  const { exam, answered } = window.__writtenSolveCtx;
  const total = exam.questions.length;
  const doneCount = Object.keys(answered).length;
  const qHtml = exam.questions.map((q,idx)=>{
    const done = answered[idx];
    const marks = done ? percentToMarks(done.percent) : null;
    return `<div class="q-block">
      <div class="q-text">${idx+1}. ${escapeHtml(q.text||'')}</div>
      ${q.imageUrl ? `<img src="${escapeHtml(q.imageUrl)}" style="max-width:100%; border-radius:8px; margin-bottom:10px;" alt="প্রশ্নের ছবি">`:''}
      ${done
        ? `<div class="say">✅ জমা হয়েছে — নম্বর: ${marks}/5<br>${escapeHtml(done.aiFeedback||'')}</div>
           ${!done.reviewRequested ? `<button class="btn btn-outline btn-block" style="margin-top:8px;" onclick="requestReviewForQuestion(${idx})">🚩 এই নম্বর নিয়ে রিভিউ চাও</button>` : `<p class="hint" style="margin-top:6px;">🚩 রিভিউ চাওয়া হয়েছে, শিক্ষক দেখবেন।</p>`}`
        : `<input type="file" id="wFile${idx}" accept="image/*" style="margin-bottom:8px;">
           <button class="btn btn-primary btn-block" onclick="submitWrittenQuestion(${idx})">📤 এই প্রশ্নের উত্তর জমা দাও</button>
           <div id="wStatus${idx}" style="margin-top:8px;"></div>`}
    </div>`;
  }).join('');

  app.innerHTML = `
    ${header('Written CQ পরীক্ষা')}
    <div class="card">
      <h2>${escapeHtml(exam.title)}</h2>
      <p class="hint">${doneCount} / ${total} প্রশ্নের উত্তর জমা দেওয়া হয়েছে (প্রতি প্রশ্ন ৫ নম্বর)। প্রতিটা প্রশ্নের ছবি আলাদাভাবে আপলোড করো।</p>
    </div>
    <div class="card">${qHtml}</div>
    <div class="center"><a class="link-back" onclick="go('landing')">← মূল পাতায় ফিরে যাও</a></div>
    ${creditFooter()}
  `;
}
window.submitWrittenQuestion = async function(idx){
  const { exam, slug, name } = window.__writtenSolveCtx;
  const fileInput = document.getElementById('wFile'+idx);
  const file = fileInput && fileInput.files[0];
  if(!file){ toast('আগে একটা ছবি বাছো'); return; }
  const statusEl = document.getElementById('wStatus'+idx);
  statusEl.innerHTML = `<p class="hint">ছবি প্রস্তুত করা হচ্ছে...</p>`;
  const compressed = await compressImageFile(file, 1200, 0.75);
  statusEl.innerHTML = `<p class="hint">AI দিয়ে চেক করা হচ্ছে, একটু অপেক্ষা করো...</p>`;
  const res = await submitWrittenAnswerRemote(exam.code, slug, name, idx, compressed.base64, compressed.mimeType, file.name);
  if(res && res.status === 'success'){
    window.__writtenSolveCtx.answered[idx] = { percent: res.percent, aiFeedback: res.aiFeedback, subId: res.subId };
    if(res.allDone){
      const totalMarks = exam.questions.length * 5;
      const earnedMarks = percentToMarks(res.avgPercent) * exam.questions.length;
      go('writtenResult', { earnedMarks, totalMarks, couponAmount: res.couponAmount, title: exam.title });
    } else {
      redrawWrittenSolve();
    }
  } else {
    statusEl.innerHTML = `<p class="hint">জমা দিতে সমস্যা হয়েছে, আবার চেষ্টা করো।</p>`;
  }
}
window.requestReviewForQuestion = async function(idx){
  const { answered } = window.__writtenSolveCtx;
  const sub = answered[idx];
  if(!sub || !sub.subId){ toast('এটা রিভিউ করা যাচ্ছে না'); return; }
  toast('রিভিউ চাওয়া হচ্ছে...');
  await postToScript('requestWrittenReview', { submissionId: sub.subId });
  answered[idx].reviewRequested = true;
  toast('রিভিউর অনুরোধ পাঠানো হয়েছে ✅');
  redrawWrittenSolve();
}
function renderWrittenResult(earnedMarks, totalMarks, couponAmount, title){
  const pct = Math.round((earnedMarks/totalMarks)*100);
  const passed = pct >= 50;
  app.innerHTML = `
    ${header('ফলাফল')}
    <div class="card center">
      <h2>${escapeHtml(title)}</h2>
      <p class="hint">সব প্রশ্ন জমা হয়ে গেছে ✅</p>
      <div class="stamp ${passed?'':'fail'}">${earnedMarks}/${totalMarks}</div>
      <p class="hint" style="margin-top:10px;">এটা তোমার সব প্রশ্নের মোট AI-মূল্যায়িত নম্বর (প্রতি প্রশ্নে ৫ নম্বর করে)।</p>
      ${couponAmount>0 ? `<div class="say" style="margin-top:10px;">🎁 <b>অভিনন্দন!</b> তুমি ৳${couponAmount} Treat Coupon পেয়েছো!</div>` : ''}
      <p class="hint" style="margin-top:10px;">কোনো প্রশ্নের নম্বর নিয়ে দ্বিমত থাকলে, ঐ প্রশ্নে গিয়ে "🚩 রিভিউ চাও" চাপতে পারতে — শিক্ষক ম্যানুয়ালি দেখে ঠিক করে দেবেন।</p>
    </div>
    <div class="center"><button class="btn btn-primary" onclick="go('landing')">মূল পাতায় যাও</button></div>
    ${creditFooter()}
  `;
}
