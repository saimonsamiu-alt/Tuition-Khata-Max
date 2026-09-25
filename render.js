// ============================================================================
// render.js -- part of the পরীক্ষার খাতা frontend, split out of the original
// single inline <script> in index.html for readability. Loaded via plain
// <script src="js/render.js"> tags (in the order listed in index.html), which
// all share one global scope in the browser -- exactly like the original
// single script did, so nothing about how functions call each other changes.
// ============================================================================

function syncLogoutFab(){
  const fab = document.getElementById('logoutFab');
  if(fab) fab.style.display = currentTeacher ? 'block' : 'none';
}

// (Small edits to existing functions are marked with "// [NEW]" comments.)

// POST that returns the server's JSON even on errors (postToScript() hides the error message)
async function postToScriptRaw(action, params){
  try{
    const r = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...params })
    });
    const text = await r.text();
    try{ return JSON.parse(text); }catch(e){ return { status:'error', message:'bad_response' }; }
  }catch(e){
    return { status:'error', message:'network' };
  }
}
async function getJson(action, params){
  try{
    const qs = Object.keys(params||{}).map(k=> k+'='+encodeURIComponent(params[k])).join('&');
    const r = await fetch(`${SCRIPT_URL}?action=${action}${qs?'&'+qs:''}`);
    return await r.json();
  }catch(e){ return null; }
}
function fmtBnDate(ms){
  if(!ms) return '';
  const d = new Date(ms);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('bn-BD', { day:'numeric', month:'long', year:'numeric' });
}
function monthKeyFromCal(){
  const now = new Date();
  const y = window.__calYear !== null && window.__calYear !== undefined ? window.__calYear : now.getFullYear();
  const m = window.__calMonth !== null && window.__calMonth !== undefined ? window.__calMonth : now.getMonth();
  return y + '-' + String(m+1).padStart(2,'0');
}
function normalizeWithdrawal(w){
  // Defensive: tolerates an older backend that used a different field name (bkashNumber)
  // or didn't send method/dueAt at all -- so the UI never shows "undefined" or "NaN".
  if(!w) return w;
  const requestedAt = w.requestedAt || Date.now();
  return { ...w,
    number: w.number || w.bkashNumber || '',
    method: w.method || 'bkash',
    requestedAt,
    dueAt: w.dueAt || (requestedAt + 14*86400000)
  };
}
function couponState(name, slug, data){
  return { name, slug, balance: data.balance, history: data.history,
           pendingWithdrawal: data.pendingWithdrawal ? normalizeWithdrawal(data.pendingWithdrawal) : null,
           withdrawals: (data.withdrawals || []).map(normalizeWithdrawal) };
}


// ================= SOUND SYNTHESIZER (Web Audio API) =================
let audioCtx = null;
let soundEnabled = true;
function getAudioCtx(){
  if(!audioCtx){
    const AudioC = window.AudioContext || window.webkitAudioContext;
    if(AudioC) audioCtx = new AudioC();
  }
  if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
window.toggleSound = function(){
  soundEnabled = !soundEnabled;
  toast(soundEnabled ? '🔊 সাউন্ড চালু' : '🔇 সাউন্ড বন্ধ');
  const btn = document.getElementById('soundToggleBtn');
  if(btn) btn.innerHTML = soundEnabled ? '🔊 সাউন্ড চালু' : '🔇 সাউন্ড বন্ধ';
};
function playSfx(type){
  if(!soundEnabled) return;
  try{
    const ctx = getAudioCtx();
    if(!ctx) return;
    const now = ctx.currentTime;
    if(type === 'slash'){
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(850, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(now); osc.stop(now + 0.12);
    } else if(type === 'hit'){
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(190, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(now); osc.stop(now + 0.2);
    } else if(type === 'combo'){
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.05);
        gain.gain.setValueAtTime(0.2, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.14);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(now + i * 0.05); osc.stop(now + i * 0.05 + 0.14);
      });
    } else if(type === 'victory'){
      [440, 554.37, 659.25, 880].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.25, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.25);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(now + i * 0.08); osc.stop(now + i * 0.08 + 0.25);
      });
    } else if(type === 'wrong'){
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(130, now);
      osc.frequency.setValueAtTime(95, now + 0.12);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(now); osc.stop(now + 0.28);
    }
  }catch(e){}
}


function render(){
  syncLogoutFab();
  const s = state.screen;
  if(s==='landing') renderLanding();
  else if(s==='studentAuth') renderStudentAuth();
  else if(s==='studentDashboard') renderStudentDashboard();
  else if(s==='teacherRegCodes') renderTeacherRegCodes();
  else if(s==='teacherBattleAudit') renderTeacherBattleAudit();
  else if(s==='battleWorldMap') renderBattleWorldMap();
  else if(s==='battleChapterSelect') renderBattleChapterSelect(state.courseId, state.subject, state.title);
  else if(s==='teacherGate') renderTeacherGate();
  else if(s==='teacherDashboard') renderTeacherDashboard();
  else if(s==='teacherNewExam') renderTeacherNewExam(state.editingExam);
  else if(s==='teacherResults') renderTeacherResults(state.code);
  else if(s==='studentEntry') renderStudentEntry();
  else if(s==='practiceList') renderPracticeList();
  else if(s==='practiceEntry') renderPracticeEntry(state.exam);
  else if(s==='treatBlocked') renderTreatBlocked(state.exam, state.attempt);
  else if(s==='studentChoice') renderStudentChoice(state.exam, state.slug, state.name, state.attempts);
  else if(s==='studentAlready') renderStudentAlready(state.exam, state.prev, state.tryNo, state.totalTries);
  else if(s==='studentExam') renderStudentExam();
  else if(s==='studentResult') renderStudentResult();
  else if(s==='topicsManage') renderTopicsManage();
  else if(s==='topicsManageSection') renderTopicsManageSection(state.subject);
  else if(s==='topicsManageChapters') renderTopicsManageChapters(state.subject, state.sectionKey);
  else if(s==='topicsEdit') renderTopicsEdit(state.subject, state.sectionKey, state.chNum, state.existingName, state.existingContent);
  else if(s==='topicsSubject') renderTopicsSubject();
  else if(s==='topicsSection') renderTopicsSection(state.subject);
  else if(s==='topicsChapterList') renderTopicsChapterList(state.subject, state.sectionKey);
  else if(s==='topicsView') renderTopicsView(state.chapName, state.content, state.subject, state.sectionKey);
  else if(s==='attendanceDashboard') renderAttendanceDashboard();
  else if(s==='attendanceMark') renderAttendanceMark(state.slug, state.studentName, state.records);
  else if(s==='attendanceStudentEntry') renderAttendanceStudentEntry();
  else if(s==='attendanceStudentView') renderAttendanceStudentView(state.slug, state.name, state.records);
  else if(s==='faqManage') renderFAQManage();
  else if(s==='faqEdit') renderFAQEdit(state.id);
  else if(s==='faqList') renderFAQList();
  else if(s==='faqView') renderFAQView(state.id);
  else if(s==='notesManage') renderNotesManage();
  else if(s==='notesManageSubject') renderNotesManageSubject(state.subject);
  else if(s==='notesEdit') renderNotesEdit(state.subject, state.noteId, state.mode, state.existingTitle, state.existingContent);
  else if(s==='notesGate') renderNotesGate();
  else if(s==='notesSubject') renderNotesSubject();
  else if(s==='notesList') renderNotesList(state.subject);
  else if(s==='notesSlideView') renderNotesSlideView(state.subject, state.title, state.slides, state.slideIndex);
  else if(s==='masteryManage') renderMasteryManage();
  else if(s==='masteryManageCourse') renderMasteryManageCourse();
  else if(s==='masteryCQManage') renderMasteryCQManage();
  else if(s==='masterySubmissions') renderMasterySubmissions();
  else if(s==='masteryEntry') renderMasteryEntry();
  else if(s==='masteryCourseList') renderMasteryCourseList();
  else if(s==='masteryTopicList') renderMasteryTopicList();
  else if(s==='masteryQuiz') renderMasteryQuiz(state.topicId);
  else if(s==='masteryQuizResult') renderMasteryQuizResult(state.resultTopic, state.score, state.total, state.pct);
  else if(s==='masteryUpload') renderMasteryUpload();
  else if(s==='couponEntry') renderCouponEntry();
  else if(s==='couponBalance') renderCouponBalance();
  else if(s==='couponManage') renderCouponManage();
  else if(s==='shopManage') renderShopManage();
  else if(s==='shopProductEdit') renderShopProductEdit(state.productId, state.existingTitle, state.existingDescription, state.existingPrice, state.existingImageUrl);
  else if(s==='shopOrders') renderShopOrders();
  else if(s==='shopList') renderShopList();
  else if(s==='writtenManage') renderWrittenManage();
  else if(s==='writtenEdit') renderWrittenEdit(state.examId, state.existing);
  else if(s==='writtenSubmissions') renderWrittenSubmissions(state.code);
  else if(s==='writtenEntry') renderWrittenEntry();
  else if(s==='writtenSolve') renderWrittenSolve(state.exam, state.slug, state.name);
  else if(s==='writtenResult') renderWrittenResult(state.earnedMarks, state.totalMarks, state.couponAmount, state.title);
  else if(s==='doubtEntry') renderDoubtEntry();
  else if(s==='pastExams') renderPastExams();
  else if(s==='pastExamDetail') renderPastExamDetail(state.exam, state.attempts);
  else if(s==='pastWrittenDetail') renderPastWrittenDetail(state.title, state.subs);
  else if(s==='withdrawManage') renderWithdrawManage();
  else if(s==='communityLounge') renderCommunityLounge();
  else if(s==='mistakeNotebook') renderMistakeNotebook();

  if(typeof updateBottomNav === 'function'){
    updateBottomNav();
  }

  if(deferredPwaPrompt){
    setTimeout(() => {
      document.querySelectorAll('.pwa-install-banner').forEach(el => el.style.display = 'flex');
      const hBtn = document.getElementById('headerInstallBtn');
      if(hBtn) hBtn.style.display = 'inline-flex';
    }, 50);
  }
  setTimeout(renderAllMath, 50);
}

render();
