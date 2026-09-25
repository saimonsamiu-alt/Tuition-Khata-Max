// ============================================================================
// doubt.js -- part of the পরীক্ষার খাতা frontend, split out of the original
// single inline <script> in index.html for readability. Loaded via plain
// <script src="js/doubt.js"> tags (in the order listed in index.html), which
// all share one global scope in the browser -- exactly like the original
// single script did, so nothing about how functions call each other changes.
// ============================================================================

// ================= DOUBT SOLVING (AI — RAG দিয়ে শিক্ষকের নোট থেকে উত্তর) =================
const DOUBT_SUBJECTS = {
  chemistry: { label: 'রসায়ন (Chemistry)', icon: '🧪' },
  mathematics: { label: 'গণিত (Mathematics)', icon: '📐' },
  biology: { label: 'জীববিজ্ঞান (Biology)', icon: '🌿' }
};
function renderDoubtEntry(){
  const subjectOptions = Object.keys(DOUBT_SUBJECTS).map(key=>{
    const s = DOUBT_SUBJECTS[key];
    return `<option value="${key}">${s.icon} ${s.label}</option>`;
  }).join('');
  app.innerHTML = `
    ${header('Doubt জিজ্ঞেস করো')}
    <div class="card">
      <h2>তোমার প্রশ্নটা লেখো</h2>
      <p class="hint">যেকোনো doubt/প্রশ্ন এখানে লেখো — AI ধাপে ধাপে বুঝিয়ে দেবে, শিক্ষকের নোট থাকলে সেটার উপর ভিত্তি করেই উত্তর দেওয়ার চেষ্টা করবে।</p>
      <label class="field-label">বিষয় (ঐচ্ছিক, নির্দিষ্ট করলে উত্তর আরও প্রাসঙ্গিক হতে পারে)</label>
      <select id="doubtSubject">
        <option value="">— সব বিষয় —</option>
        ${subjectOptions}
      </select>
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; flex-wrap:wrap; gap:6px;">
        <label class="field-label" style="margin-bottom:0;">তোমার প্রশ্ন (সমীকরণও লিখতে পারো যেমন: $E=mc^2$)</label>
        <button type="button" class="voice-record-btn" id="voiceInputBtn" onclick="toggleVoiceInput()">🎙️ মুখে বলো (বাংলায়)</button>
      </div>
      <textarea id="doubtText" style="min-height:120px;" placeholder="যেমন: লা-শাতেলিয়ার নীতি ব্যাখ্যা করো... বা $x=\frac{-b\pm\sqrt{b^2-4ac}}{2a}$ বা \ce{H2SO4}"></textarea>
      <button class="btn btn-primary btn-block" onclick="submitDoubt()">🤔 উত্তর জিজ্ঞেস করো</button>
      <div id="doubtAnswerArea" style="margin-top:14px;"></div>
      <div style="margin-top:14px;"><a class="link-back" onclick="go('landing')">← মূল পাতায় ফিরে যাও</a></div>
    </div>
    ${creditFooter()}
  `;
}
window.submitDoubt = async function(){
  const doubtText = document.getElementById('doubtText').value.trim();
  const subject = document.getElementById('doubtSubject').value;
  if(!doubtText){ toast('আগে প্রশ্নটা লেখো'); return; }
  const areaEl = document.getElementById('doubtAnswerArea');
  areaEl.innerHTML = `<div class="card center" style="padding:20px;">AI উত্তর ভাবছে...</div>`;
  const res = await postToScript('aiSolveDoubt', { doubtText, subject });
  if(res && res.answer){
    areaEl.innerHTML = `
      <div class="card" style="background:#FBFDFF;" id="doubtAnswerCard">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; flex-wrap:wrap; gap:8px;">
          <h3 style="margin:0;">🤖 উত্তর</h3>
          <button class="read-aloud-btn" onclick="toggleReadAloud(document.getElementById('doubtAnswerContent').innerText)">🔊 বাংলায় পড়ে শোনাও</button>
        </div>
        <div id="doubtAnswerContent" style="white-space:pre-wrap; font-size:15px; line-height:1.7;">${linkifyText(res.answer)}</div>
      </div>
    `;
    renderAllMath(document.getElementById('doubtAnswerCard'));
  } else {
    areaEl.innerHTML = `<div class="empty-state">উত্তর পাওয়া যায়নি, আবার চেষ্টা করো।</div>`;
  }
}


async function getPublicExams(){
  try{
    const r = await fetch(`${SCRIPT_URL}?action=listPublic`);
    const json = await r.json();
    if(json.status === 'success') return json.data;
  } catch(e){}
  return [];
}
async function renderPracticeList(){
  app.innerHTML = `${header('প্র্যাকটিস')}<div class="card center">প্র্যাকটিস এক্সাম খোঁজা হচ্ছে...</div>`;
  const exams = await getPublicExams();
  let listHtml = '';
  if(exams.length === 0){
    listHtml = `<div class="empty-state">এখনো কোনো উন্মুক্ত প্র্যাকটিস এক্সাম নেই।<br>শিক্ষক এক্সাম বানানোর সময় "সবার জন্য উন্মুক্ত" অপশন বাছলে এখানে দেখাবে।</div>`;
  } else {
    listHtml = exams.map(ex=>{
      const timerLabel = ex.timerMode === 'perQuestion' ? `প্রতি প্রশ্নে ${ex.perQuestionSeconds} সেকেন্ড` : `মোট ${ex.duration} মিনিট`;
      return `
        <div class="exam-item">
          <div class="row-top">
            <div>
              <h3 style="margin-bottom:4px;">${escapeHtml(ex.title)}</h3>
              <div class="meta">${escapeHtml(ex.subject)} · ${ex.questions.length}টা প্রশ্ন · ${timerLabel}</div>
            </div>
          </div>
          <button class="btn btn-primary btn-block" style="margin-top:10px;" onclick='goPracticeEntry(${JSON.stringify(ex.code)})'>শুরু করো</button>
        </div>`;
    }).join('');
  }
  app.innerHTML = `
    ${header('প্র্যাকটিস')}
    <div class="card">
      <h2>উন্মুক্ত প্র্যাকটিস এক্সাম</h2>
      <p class="hint">কোনো কোড বা পাসওয়ার্ড লাগবে না — শুধু নাম দিয়ে সরাসরি শুরু করতে পারবে, যতবার খুশি প্র্যাকটিস করতে পারবে।</p>
      ${listHtml}
    </div>
    <div class="center"><a class="link-back" onclick="go('landing')">← মূল পাতায় ফিরে যাও</a></div>
    ${creditFooter()}
  `;
  window.__practiceExams = exams;
}
window.goPracticeEntry = function(code){
  const exam = (window.__practiceExams||[]).find(e=>e.code===code);
  if(!exam){ toast('এক্সাম খুঁজে পাওয়া যায়নি'); return; }
  go('practiceEntry', { exam });
}
function renderPracticeEntry(exam){
  app.innerHTML = `
    ${header('প্র্যাকটিস')}
    <div class="card">
      <h2>${escapeHtml(exam.title)}</h2>
      <p class="hint">শুধু তোমার নামটা লেখো, তাহলেই প্র্যাকটিস শুরু হয়ে যাবে।</p>
      <label class="field-label">তোমার নাম</label>
      <input type="text" id="practiceName" placeholder="নাম লেখো" onkeydown="if(event.key==='Enter') startPracticeFromEntry()">
      <button class="btn btn-primary btn-block" onclick="startPracticeFromEntry()">প্র্যাকটিস শুরু করো</button>
      <div style="margin-top:14px;"><a class="link-back" onclick="go('practiceList')">← তালিকায় ফিরে যাও</a></div>
    </div>
    ${creditFooter()}
  `;
}
window.startPracticeFromEntry = async function(){
  const name = document.getElementById('practiceName').value.trim();
  if(!name){ toast('নাম লেখো'); return; }
  const exam = state.exam;
  const slug = slugify(name);
  runCheckingSequence(exam, slug, name, 1, { practice: true }); // [NEW] practice never marks attendance
}
