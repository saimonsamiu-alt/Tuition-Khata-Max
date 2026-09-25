// ============================================================================
// notes.js -- part of the পরীক্ষার খাতা frontend, split out of the original
// single inline <script> in index.html for readability. Loaded via plain
// <script src="js/notes.js"> tags (in the order listed in index.html), which
// all share one global scope in the browser -- exactly like the original
// single script did, so nothing about how functions call each other changes.
// ============================================================================

// ================= CLASS NOTES / SLIDES =================
const NOTES_SUBJECTS = {
  chemistry: { label: 'রসায়ন (Chemistry)', icon: '🧪' },
  mathematics: { label: 'গণিত (Mathematics)', icon: '📐' },
  biology: { label: 'জীববিজ্ঞান (Biology)', icon: '🌿' }
};
async function getAllNotes(){
  try{
    const r = await fetch(`${SCRIPT_URL}?action=listNotes`);
    const json = await r.json();
    if(json.status==='success') return json.data;
  } catch(e){}
  return [];
}
async function saveNoteRemote(id, subject, title, type, content){
  const res = await postToScript('saveNote', { id: id||'', subject, title, type, content });
  return res;
}
async function deleteNoteRemote(id){
  try{ await fetch(`${SCRIPT_URL}?action=deleteNote&id=${encodeURIComponent(id)}`); }catch(e){}
}

// ---- Teacher: manage notes/slides ----
function renderNotesManage(){
  const btns = Object.keys(NOTES_SUBJECTS).map(subj=>{
    const s = NOTES_SUBJECTS[subj];
    return `<button class="btn btn-primary btn-block" style="margin-top:8px;" onclick="go('notesManageSubject',{subject:'${subj}'})">${s.icon} ${s.label}</button>`;
  }).join('');
  app.innerHTML = `
    ${header('নোট/স্লাইড ম্যানেজ করো')}
    <div class="card">
      <h2>কোন বিষয়ের নোট/স্লাইড যোগ করবে?</h2>
      <p class="hint">দুইভাবে যোগ করা যায়: (১) Google Drive/Slides এর শেয়ার লিংক, অথবা (২) সরাসরি HTML কোড পেস্ট করে — সেটা অ্যাপের ভেতরেই স্লাইড আকারে দেখাবে। স্টুডেন্টরা পাসওয়ার্ড (${NOTES_PASSWORD}) দিয়ে ঢুকে এগুলো দেখতে পারবে।</p>
      ${btns}
    </div>
    <div class="center"><a class="link-back" onclick="go('teacherDashboard')">← ফিরে যাও</a></div>
    ${creditFooter()}
  `;
}
async function renderNotesManageSubject(subject){
  app.innerHTML = `${header('নোট/স্লাইড ম্যানেজ করো')}<div class="card center">লোড হচ্ছে...</div>`;
  const all = await getAllNotes();
  const mine = all.filter(n=> n.subject === subject);
  window.__notesManageCtx = { subject, items: mine };
  let rows = mine.map((n,idx)=> `
    <div class="exam-item">
      <h3 style="margin-bottom:6px;">${escapeHtml(n.title)} <span class="q-tag">${n.type==='html' ? 'HTML স্লাইড' : 'লিংক'}</span></h3>
      <div class="row">
        <button class="btn btn-outline" onclick="editNoteItem(${idx})">✏️ এডিট করো</button>
        <button class="btn btn-danger" onclick="deleteNoteItem('${n.id}','${subject}')">🗑️ মুছো</button>
      </div>
    </div>`).join('');
  if(mine.length===0) rows = `<div class="empty-state">এখনো কোনো নোট/স্লাইড যোগ করোনি।</div>`;
  app.innerHTML = `
    ${header('নোট/স্লাইড ম্যানেজ করো')}
    <div class="card">
      <h2>${NOTES_SUBJECTS[subject].label}</h2>
      ${rows}
      <div class="row" style="margin-top:10px;">
        <button class="btn btn-primary btn-block" onclick="go('notesEdit',{subject:'${subject}', noteId:null, mode:'link'})">🔗 + নতুন লিংক</button>
        <button class="btn btn-gold btn-block" onclick="go('notesEdit',{subject:'${subject}', noteId:null, mode:'html'})">✏️ + নতুন HTML স্লাইড</button>
      </div>
    </div>
    <div class="center"><a class="link-back" onclick="go('notesManage')">← ফিরে যাও</a></div>
    ${creditFooter()}
  `;
}
window.editNoteItem = function(idx){
  const { subject, items } = window.__notesManageCtx;
  const n = items[idx];
  go('notesEdit', { subject, noteId: n.id, mode: n.type||'link', existingTitle: n.title, existingContent: n.content });
}
window.deleteNoteItem = async function(id, subject){
  if(!confirm('এই নোট/স্লাইডটা মুছে ফেলতে চাও?')) return;
  await deleteNoteRemote(id);
  toast('মুছে ফেলা হয়েছে');
  go('notesManageSubject', { subject });
}
function renderNotesEdit(subject, noteId, mode, existingTitle, existingContent){
  const isHtml = mode === 'html';
  app.innerHTML = `
    ${header('নোট/স্লাইড')}
    <div class="card">
      <h2>${noteId ? 'এডিট করো' : (isHtml ? 'নতুন HTML স্লাইড' : 'নতুন লিংক')}</h2>
      <label class="field-label">শিরোনাম</label>
      <input type="text" id="noteTitle" value="${escapeHtml(existingTitle||'')}" placeholder="যেমন: অধ্যায় ৩ — ক্লাস স্লাইড">
      ${isHtml ? `
        <label class="field-label">HTML কোড / স্লাইড কনটেন্ট</label>
        <p class="hint">সরাসরি HTML লিখতে/পেস্ট করতে পারো (হেডিং, বোল্ড, ছবি, টেবিল ইত্যাদি)। একাধিক স্লাইড বানাতে চাইলে প্রতিটা স্লাইডের মাঝে একটা আলাদা লাইনে <code>---</code> লিখে ভাগ করো।</p>
        <textarea id="noteContent" style="min-height:280px; font-family:var(--font-mono); font-size:13px;" placeholder="<h2>শিরোনাম</h2>&#10;<p>এখানে কনটেন্ট লেখো...</p>&#10;&#10;---&#10;&#10;<h2>দ্বিতীয় স্লাইড</h2>&#10;<p>...</p>">${escapeHtml(existingContent||'')}</textarea>
      ` : `
        <label class="field-label">লিংক (Google Drive/Slides শেয়ার লিংক)</label>
        <input type="text" id="noteContent" value="${escapeHtml(existingContent||'')}" placeholder="https://drive.google.com/...">
      `}
      <button class="btn btn-primary btn-block" onclick="saveNoteItem('${subject}','${noteId||''}','${mode}')">✅ সেভ করো</button>
    </div>
    <div class="center"><a class="link-back" onclick="go('notesManageSubject',{subject:'${subject}'})">← ফিরে যাও</a></div>
    ${creditFooter()}
  `;
}
window.saveNoteItem = async function(subject, noteId, mode){
  const title = document.getElementById('noteTitle').value.trim();
  const content = document.getElementById('noteContent').value.trim();
  if(!title || !content){ toast('শিরোনাম ও কনটেন্ট দুটোই দাও'); return; }
  toast('সেভ হচ্ছে...');
  await saveNoteRemote(noteId, subject, title, mode, content);
  toast('সেভ হয়েছে ✅');
  go('notesManageSubject', { subject });
}

// ---- Student: password-gated viewing ----
function renderNotesGate(){
  app.innerHTML = `
    ${header('ক্লাস নোট / স্লাইড')}
    <div class="card">
      <h2>পাসওয়ার্ড দাও</h2>
      <input type="password" id="notesPass" placeholder="পাসওয়ার্ড" onkeydown="if(event.key==='Enter') checkNotesPassword()">
      <button class="btn btn-primary btn-block" onclick="checkNotesPassword()">দেখো</button>
      <div style="margin-top:14px;"><a class="link-back" onclick="go('landing')">← ফিরে যাও</a></div>
    </div>
    ${creditFooter()}
  `;
}
window.checkNotesPassword = function(){
  const v = document.getElementById('notesPass').value.trim();
  if(v === NOTES_PASSWORD) go('notesSubject');
  else toast('পাসওয়ার্ড ভুল হয়েছে');
}
function renderNotesSubject(){
  const btns = Object.keys(NOTES_SUBJECTS).map(subj=>{
    const s = NOTES_SUBJECTS[subj];
    return `<button class="btn btn-primary btn-block" style="margin-top:8px;" onclick="go('notesList',{subject:'${subj}'})">${s.icon} ${s.label}</button>`;
  }).join('');
  app.innerHTML = `
    ${header('ক্লাস নোট / স্লাইড')}
    <div class="card">
      <h2>কোন বিষয়ের নোট দেখতে চাও?</h2>
      ${btns}
    </div>
    <div class="center"><a class="link-back" onclick="go('landing')">← মূল পাতায় ফিরে যাও</a></div>
    ${creditFooter()}
  `;
}
async function renderNotesList(subject){
  app.innerHTML = `${header('ক্লাস নোট / স্লাইড')}<div class="card center">লোড হচ্ছে...</div>`;
  const all = await getAllNotes();
  const mine = all.filter(n=> n.subject === subject);
  window.__notesListCtx = { subject, items: mine };
  let rows = mine.map((n,idx)=> {
    if(n.type === 'html'){
      return `<div class="exam-item">
        <h3 style="margin-bottom:8px;">${escapeHtml(n.title)}</h3>
        <button class="btn btn-outline btn-block" onclick="viewNoteSlide(${idx})">📄 দেখো</button>
      </div>`;
    }
    return `<div class="exam-item">
      <h3 style="margin-bottom:8px;">${escapeHtml(n.title)}</h3>
      <a href="${escapeHtml(n.content)}" target="_blank" rel="noopener" class="btn btn-outline btn-block" style="text-decoration:none;">📄 খোলো</a>
    </div>`;
  }).join('');
  if(mine.length===0) rows = `<div class="empty-state">এখনো এই বিষয়ে কোনো নোট/স্লাইড যোগ করা হয়নি।</div>`;
  app.innerHTML = `
    ${header('ক্লাস নোট / স্লাইড')}
    <div class="card">
      <h2>${NOTES_SUBJECTS[subject].label}</h2>
      ${rows}
    </div>
    <div class="center"><a class="link-back" onclick="go('notesSubject')">← ফিরে যাও</a></div>
    ${creditFooter()}
  `;
}
window.viewNoteSlide = function(idx){
  const { subject, items } = window.__notesListCtx;
  const n = items[idx];
  const slides = n.content.split(/\n\s*---\s*\n/);
  go('notesSlideView', { subject, title: n.title, slides, slideIndex: 0 });
}
function renderNotesSlideView(subject, title, slides, slideIndex){
  const total = slides.length;
  app.innerHTML = `
    ${header('ক্লাস নোট / স্লাইড')}
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <h2 style="margin-bottom:0;">${escapeHtml(title)}</h2>
        ${total>1 ? `<span class="q-tag">${slideIndex+1} / ${total}</span>` : ''}
      </div>
      <div id="slideFrame" style="border:1px solid var(--paper-edge); border-radius:8px; padding:18px; min-height:200px; background:#fff;">${slides[slideIndex]}</div>
      ${total>1 ? `
      <div class="row" style="margin-top:14px;">
        <button class="btn btn-outline btn-block" ${slideIndex===0?'disabled':''} onclick="goNoteSlideNav(${slideIndex-1})">← আগের স্লাইড</button>
        <button class="btn btn-outline btn-block" ${slideIndex===total-1?'disabled':''} onclick="goNoteSlideNav(${slideIndex+1})">পরের স্লাইড →</button>
      </div>` : ''}
    </div>
    <div class="center"><a class="link-back" onclick="go('notesList',{subject:'${subject}'})">← তালিকায় ফিরে যাও</a></div>
    ${creditFooter()}
  `;
}
window.goNoteSlideNav = function(newIndex){
  state.slideIndex = newIndex;
  renderNotesSlideView(state.subject, state.title, state.slides, newIndex);
}
