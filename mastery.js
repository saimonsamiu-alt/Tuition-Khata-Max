// ============================================================================
// mastery.js -- part of the পরীক্ষার খাতা frontend, split out of the original
// single inline <script> in index.html for readability. Loaded via plain
// <script src="js/mastery.js"> tags (in the order listed in index.html), which
// all share one global scope in the browser -- exactly like the original
// single script did, so nothing about how functions call each other changes.
// ============================================================================

// NOTE: this file intentionally bundles Mastery/Progress + the Boss Battle world
// map/combat arena + battle audit + anti-cheat together, unsplit, because this
// whole area is what's actively being redesigned (subject/paper/chapter
// selection, world map, the new 3D game). Drop the new version in here wholesale
// rather than re-diffing it into the pieces below.

// ================= MASTERY / PROGRESS SYSTEM =================
async function getMasteryCourses(){
  try{
    const r = await fetch(`${SCRIPT_URL}?action=listMasteryCourses`);
    const json = await r.json();
    if(json.status==='success') return json.data;
  } catch(e){}
  return [];
}
async function saveMasteryCourseRemote(id, subject, title){
  const res = await postToScript('saveMasteryCourse', { id: id||'', subject, title });
  return res;
}
async function deleteMasteryCourseRemote(id){
  try{ await fetch(`${SCRIPT_URL}?action=deleteMasteryCourse&id=${encodeURIComponent(id)}`); }catch(e){}
}
async function getMasteryTopics(courseId){
  try{
    const r = await fetch(`${SCRIPT_URL}?action=listMasteryTopics&courseId=${encodeURIComponent(courseId)}`);
    const json = await r.json();
    if(json.status==='success') return json.data;
  } catch(e){}
  return [];
}
async function saveMasteryTopicRemote(courseId, order, title, questions, passPercent){
  const res = await postToScript('saveMasteryTopic', { courseId, order, title, questions: JSON.stringify(questions), passPercent });
  return res;
}
async function deleteMasteryTopicRemote(id){
  try{ await fetch(`${SCRIPT_URL}?action=deleteMasteryTopic&id=${encodeURIComponent(id)}`); }catch(e){}
}
async function getMasteryProgressRemote(slug, courseId){
  try{
    const r = await fetch(`${SCRIPT_URL}?action=getMasteryProgress&slug=${encodeURIComponent(slug)}&courseId=${encodeURIComponent(courseId)}`);
    const json = await r.json();
    if(json.status==='success') return json.data;
  } catch(e){}
  return [];
}
async function submitMasteryAttemptRemote(slug, topicId, score, total){
  const res = await postToScript('submitMasteryAttempt', { slug, topicId, score, total });
  return res;
}
async function uploadSubmissionRemote(slug, courseId, topicId, base64, mimeType, fileName){
  const res = await postToScript('uploadSubmission', { slug, courseId, topicId, base64, mimeType, fileName });
  return res;
}
async function getSubmissionsRemote(courseId, topicId){
  try{
    const r = await fetch(`${SCRIPT_URL}?action=listSubmissions&courseId=${encodeURIComponent(courseId)}&topicId=${encodeURIComponent(topicId||'')}`);
    const json = await r.json();
    if(json.status==='success') return json.data;
  } catch(e){}
  return [];
}
async function getCQPrompts(courseId){
  try{
    const r = await fetch(`${SCRIPT_URL}?action=listCQPrompts&courseId=${encodeURIComponent(courseId)}`);
    const json = await r.json();
    if(json.status==='success') return json.data;
  } catch(e){}
  return [];
}
async function saveCQPromptRemote(courseId, title, imageUrl, instruction){
  const res = await postToScript('saveCQPrompt', { courseId, title, imageUrl, instruction });
  return res;
}
async function deleteCQPromptRemote(id){
  try{ await fetch(`${SCRIPT_URL}?action=deleteCQPrompt&id=${encodeURIComponent(id)}`); }catch(e){}
}

// ---- Safe navigation state (never inline user-typed text like titles/names into onclick attributes) ----
window.__masterySession = null;      // { slug, name }
window.__masteryCourseCtx = null;    // { courseId, courseTitle }
window.__masteryCoursesCache = [];   // last-fetched course list, for id->title lookups
window.__masteryTopicsCache = [];    // last-fetched topics for the current course

// ---- Teacher: manage mastery courses ----
async function renderMasteryManage(){
  app.innerHTML = `${header('Mastery ম্যানেজ করো')}<div class="card center">লোড হচ্ছে...</div>`;
  const courses = await getMasteryCourses();
  window.__masteryCoursesCache = courses;
  let rows = courses.map(c=> `
    <div class="exam-item">
      <h3 style="margin-bottom:4px;">${escapeHtml(c.title)}</h3>
      <div class="meta">${escapeHtml(c.subject)}</div>
      <div class="row" style="margin-top:8px;">
        <button class="btn btn-outline" onclick="goMasteryManageCourse('${c.id}')">📋 টপিক/প্রশ্ন যোগ করো</button>
        <button class="btn btn-outline" onclick="goMasterySubmissions('${c.id}')">📸 জমা দেওয়া খাতা</button>
        <button class="btn btn-danger" onclick="deleteMasteryCourseItem('${c.id}')">🗑️ মুছো</button>
      </div>
    </div>`).join('');
  if(courses.length===0) rows = `<div class="empty-state">এখনো কোনো কোর্স বানাওনি।</div>`;
  app.innerHTML = `
    ${header('Mastery ম্যানেজ করো')}
    <div class="card">
      <h2>তোমার কোর্সসমূহ</h2>
      <p class="hint">একটা কোর্স মানে একটা বড় chapter (যেমন "Quantitative Chemistry") — এর ভেতরে অনেকগুলা ছোট topic থাকবে, প্রতিটাতে MCQ কুইজ, ${MASTERY_PASS_PERCENT}%+ পেলে পরের topic unlock হবে।</p>
      ${rows}
      <label class="field-label" style="margin-top:14px;">নতুন কোর্সের নাম</label>
      <input type="text" id="newCourseTitle" placeholder="যেমন: Quantitative Chemistry">
      <label class="field-label">বিষয়</label>
      <input type="text" id="newCourseSubject" placeholder="যেমন: Chemistry">
      <button class="btn btn-primary btn-block" onclick="createMasteryCourse()">+ নতুন কোর্স বানাও</button>
    </div>
    <div class="center"><a class="link-back" onclick="go('teacherDashboard')">← ফিরে যাও</a></div>
    ${creditFooter()}
  `;
}
window.createMasteryCourse = async function(){
  const title = document.getElementById('newCourseTitle').value.trim();
  const subject = document.getElementById('newCourseSubject').value.trim();
  if(!title || !subject){ toast('নাম ও বিষয় দুটোই দাও'); return; }
  toast('বানানো হচ্ছে...');
  await saveMasteryCourseRemote(null, subject, title);
  toast('কোর্স তৈরি হয়েছে ✅');
  go('masteryManage');
}
window.deleteMasteryCourseItem = async function(id){
  if(!confirm('এই কোর্সটা মুছে ফেলতে চাও? এর ভেতরের সব টপিকও অকার্যকর হয়ে যাবে।')) return;
  await deleteMasteryCourseRemote(id);
  toast('মুছে ফেলা হয়েছে');
  go('masteryManage');
}
window.goMasteryManageCourse = function(courseId){
  const c = window.__masteryCoursesCache.find(x=> x.id === courseId);
  window.__masteryCourseCtx = { courseId, courseTitle: c ? c.title : courseId };
  go('masteryManageCourse');
}
window.goMasterySubmissions = function(courseId){
  const c = window.__masteryCoursesCache.find(x=> x.id === courseId);
  window.__masteryCourseCtx = { courseId, courseTitle: c ? c.title : courseId };
  go('masterySubmissions');
}

async function renderMasteryManageCourse(){
  const { courseId, courseTitle } = window.__masteryCourseCtx;
  app.innerHTML = `${header('টপিক ম্যানেজ করো')}<div class="card center">লোড হচ্ছে...</div>`;
  const topics = await getMasteryTopics(courseId);
  topics.sort((a,b)=> a.order - b.order);
  window.__masteryTopicsCache = topics;
  let rows = topics.map(t=> `
    <div class="exam-item">
      <h3 style="margin-bottom:4px;">${t.order}. ${escapeHtml(t.title)}</h3>
      <div class="meta">${t.questions.length}টা প্রশ্ন · Pass: ${t.passPercent}%</div>
      <button class="btn btn-danger" style="margin-top:8px;" onclick="deleteMasteryTopicItem('${t.id}')">🗑️ মুছো</button>
    </div>`).join('');
  if(topics.length===0) rows = `<div class="empty-state">এখনো কোনো টপিক যোগ করোনি।</div>`;
  app.innerHTML = `
    ${header('টপিক ম্যানেজ করো')}
    <div class="card">
      <h2>${escapeHtml(courseTitle)}</h2>
      ${rows}
    </div>
    <div class="card">
      <h2>📸 ছবি-সহ CQ প্র্যাকটিস প্রশ্ন</h2>
      <p class="hint">এগুলো MCQ না — student ছবি দেখে খাতায় সমাধান করে ছবি তুলে জমা দেবে (AI ফিডব্যাক পাবে)।</p>
      <button class="btn btn-outline btn-block" onclick="go('masteryCQManage')">CQ প্রশ্ন ম্যানেজ করো</button>
    </div>
    <div class="card">
      <h2>📥 একসাথে অনেক টপিক বসাও (Bulk Import)</h2>
      <p class="hint">প্রতিটা টপিক <code>##</code> দিয়ে শুরু করো, তারপর সেই টপিকের প্রশ্নগুলো নিচের ফরম্যাটে দাও:<br>
      <code>## টপিকের নাম<br>Q: প্রশ্ন লেখো<br>IMG: (ঐচ্ছিক) ছবির লিংক<br>A) অপশন ১<br>B) অপশন ২<br>C) অপশন ৩<br>D) অপশন ৪<br>ANS: A<br><br>Q: পরের প্রশ্ন...</code><br>
      প্রতিটা প্রশ্নের মাঝে একটা ফাঁকা লাইন রাখবে। <b>একটামাত্র টপিকে ২০০-৩০০টা প্রশ্নও দেওয়া যায়</b> — আলাদা আলাদা ভাগ করা বাধ্যতামূলক না, চাইলে একটাই <code>##</code> দিয়ে সব প্রশ্ন এক টপিকে রাখতে পারো।</p>
      <textarea id="masteryBulkText" placeholder="এখানে পেস্ট করো..."></textarea>
      <button class="btn btn-outline btn-block" onclick="importMasteryBulk()">📥 ইম্পোর্ট করো ও সেভ করো</button>
    </div>
    <div class="center"><a class="link-back" onclick="go('masteryManage')">← ফিরে যাও</a></div>
    ${creditFooter()}
  `;
}
window.deleteMasteryTopicItem = async function(id){
  if(!confirm('এই টপিকটা মুছে ফেলতে চাও?')) return;
  await deleteMasteryTopicRemote(id);
  toast('মুছে ফেলা হয়েছে');
  go('masteryManageCourse');
}
window.importMasteryBulk = async function(){
  const { courseId } = window.__masteryCourseCtx;
  const raw = document.getElementById('masteryBulkText').value;
  if(!raw.trim()){ toast('আগে টেক্সট পেস্ট করো'); return; }
  const topicBlocks = raw.split(/\n(?=##\s)/).map(b=>b.trim()).filter(Boolean);
  const letterMap = {'A':0,'B':1,'C':2,'D':3,'ক':0,'খ':1,'গ':2,'ঘ':3,'a':0,'b':1,'c':2,'d':3};
  const parsedTopics = [];
  for(const tblock of topicBlocks){
    const lines = tblock.split('\n');
    const topicTitle = lines[0].replace(/^##\s*/, '').trim();
    const rest = lines.slice(1).join('\n');
    const qBlocks = rest.split(/\n\s*\n/).map(b=>b.trim()).filter(Boolean);
    const questions = [];
    for(const block of qBlocks){
      const qlines = block.split('\n').map(l=>l.trim()).filter(Boolean);
      let qtext='', options=['','','',''], correct=0, image='';
      for(const line of qlines){
        const qm = line.match(/^Q[:.]?\s*(.*)$/i);
        const om = line.match(/^([A-Dকখগঘ])[).]\s*(.*)$/i);
        const am = line.match(/^ANS[:.]?\s*([A-Dকখগঘ])/i);
        const im = line.match(/^IMG[:.]?\s*(.*)$/i);
        if(qm){ qtext = qm[1]; }
        else if(im){ image = im[1].trim(); }
        else if(om){ const idx = (om[1] in letterMap) ? letterMap[om[1]] : letterMap[om[1].toUpperCase()]; options[idx] = om[2].trim(); }
        else if(am){ correct = (am[1] in letterMap) ? letterMap[am[1]] : letterMap[am[1].toUpperCase()]; }
      }
      if(qtext && options.every(o=>o)) questions.push({ text: qtext, options, correct, image });
    }
    if(topicTitle && questions.length>0) parsedTopics.push({ title: topicTitle, questions });
  }
  if(parsedTopics.length===0){ toast('কোনো টপিক পার্স করা যায়নি, ফরম্যাট চেক করো'); return; }
  const existing = await getMasteryTopics(courseId);
  let nextOrder = existing.length + 1;
  toast(`${parsedTopics.length}টা টপিক সেভ হচ্ছে...`);
  for(const t of parsedTopics){
    await saveMasteryTopicRemote(courseId, nextOrder, t.title, t.questions, MASTERY_PASS_PERCENT);
    nextOrder++;
  }
  toast(`${parsedTopics.length}টা টপিক সেভ হয়েছে ✅`);
  go('masteryManageCourse');
}

// ---- Teacher: manage CQ (image-based) practice prompts ----
async function renderMasteryCQManage(){
  const { courseId, courseTitle } = window.__masteryCourseCtx;
  app.innerHTML = `${header('CQ প্রশ্ন ম্যানেজ করো')}<div class="card center">লোড হচ্ছে...</div>`;
  const prompts = await getCQPrompts(courseId);
  window.__masteryCQCache = prompts;
  let rows = prompts.map((p,idx)=> `
    <div class="exam-item">
      <h3 style="margin-bottom:6px;">${escapeHtml(p.title)}</h3>
      ${p.imageUrl ? `<img src="${escapeHtml(p.imageUrl)}" style="max-width:100%; border-radius:8px; margin-bottom:8px;" alt="CQ ছবি">`:''}
      <p class="hint">${escapeHtml(p.instruction||'')}</p>
      <button class="btn btn-danger btn-block" style="margin-top:8px;" onclick="deleteCQPromptItem('${p.id}')">🗑️ মুছো</button>
    </div>`).join('');
  if(prompts.length===0) rows = `<div class="empty-state">এখনো কোনো CQ প্রশ্ন যোগ করোনি।</div>`;
  app.innerHTML = `
    ${header('CQ প্রশ্ন ম্যানেজ করো')}
    <div class="card">
      <h2>${escapeHtml(courseTitle)}</h2>
      ${rows}
    </div>
    <div class="card">
      <h2>+ নতুন CQ প্রশ্ন যোগ করো</h2>
      <label class="field-label">শিরোনাম</label>
      <input type="text" id="cqTitle" placeholder="যেমন: মোলার ভর সংক্রান্ত সৃজনশীল প্রশ্ন ১">
      <label class="field-label">ছবির লিংক (Google Drive শেয়ার লিংক)</label>
      <input type="text" id="cqImageUrl" placeholder="https://drive.google.com/...">
      <label class="field-label">নির্দেশনা (ঐচ্ছিক)</label>
      <textarea id="cqInstruction" style="min-height:100px;" placeholder="খাতায় সমাধান করে ছবি তুলে জমা দাও..."></textarea>
      <button class="btn btn-primary btn-block" onclick="addCQPrompt()">✅ যোগ করো</button>
    </div>
    <div class="center"><a class="link-back" onclick="go('masteryManageCourse')">← ফিরে যাও</a></div>
    ${creditFooter()}
  `;
}
window.addCQPrompt = async function(){
  const { courseId } = window.__masteryCourseCtx;
  const title = document.getElementById('cqTitle').value.trim();
  const imageUrl = document.getElementById('cqImageUrl').value.trim();
  const instruction = document.getElementById('cqInstruction').value.trim();
  if(!title){ toast('শিরোনাম দাও'); return; }
  toast('যোগ করা হচ্ছে...');
  await saveCQPromptRemote(courseId, title, imageUrl, instruction);
  toast('যোগ হয়েছে ✅');
  go('masteryCQManage');
}
window.deleteCQPromptItem = async function(id){
  if(!confirm('এই CQ প্রশ্নটা মুছে ফেলতে চাও?')) return;
  await deleteCQPromptRemote(id);
  toast('মুছে ফেলা হয়েছে');
  go('masteryCQManage');
}

// ---- Teacher: view submitted written work ----
async function renderMasterySubmissions(){
  const { courseId, courseTitle } = window.__masteryCourseCtx;
  app.innerHTML = `${header('জমা দেওয়া খাতা')}<div class="card center">লোড হচ্ছে...</div>`;
  const subs = await getSubmissionsRemote(courseId, null);
  subs.sort((a,b)=> b.submittedAt - a.submittedAt);
  let rows = subs.map(s=> `
    <div class="exam-item">
      <h3 style="margin-bottom:4px;">${escapeHtml(s.studentSlug)}</h3>
      <div class="meta">${new Date(s.submittedAt).toLocaleString('bn-BD')}</div>
      <a href="${escapeHtml(s.driveUrl)}" target="_blank" rel="noopener" class="btn btn-outline btn-block" style="text-decoration:none; margin-top:8px;">🖼️ ছবি দেখো</a>
      <div class="say" style="margin-top:8px;">🤖 <b>AI ফিডব্যাক:</b> ${escapeHtml(s.aiFeedback||'')}</div>
    </div>`).join('');
  if(subs.length===0) rows = `<div class="empty-state">এখনো কেউ খাতা জমা দেয়নি।</div>`;
  app.innerHTML = `
    ${header('জমা দেওয়া খাতা')}
    <div class="card">
      <h2>${escapeHtml(courseTitle)}</h2>
      ${rows}
    </div>
    <div class="center"><a class="link-back" onclick="go('masteryManage')">← ফিরে যাও</a></div>
    ${creditFooter()}
  `;
}

// ---- Student: entry + progress ----
function renderMasteryEntry(){
  app.innerHTML = `
    ${header('আমার প্রোগ্রেস')}
    <div class="card">
      <h2>তোমার নাম লেখো</h2>
      <input type="text" id="masteryStudName" placeholder="নাম লেখো" onkeydown="if(event.key==='Enter') startMasteryFlow()">
      <button class="btn btn-primary btn-block" onclick="startMasteryFlow()">শুরু করো</button>
      <div style="margin-top:14px;"><a class="link-back" onclick="go('landing')">← ফিরে যাও</a></div>
    </div>
    ${creditFooter()}
  `;
}
window.startMasteryFlow = async function(){
  const name = document.getElementById('masteryStudName').value.trim();
  if(!name){ toast('নাম লেখো'); return; }
  window.__masterySession = { slug: slugify(name), name };
  go('masteryCourseList');
}
async function renderMasteryCourseList(){
  app.innerHTML = `${header('আমার প্রোগ্রেস')}<div class="card center">লোড হচ্ছে...</div>`;
  const courses = await getMasteryCourses();
  window.__masteryCoursesCache = courses;
  const { name } = window.__masterySession;
  let rows = courses.map(c=> `
    <div class="exam-item">
      <h3 style="margin-bottom:6px;">${escapeHtml(c.title)}</h3>
      <div class="meta">${escapeHtml(c.subject)}</div>
      <button class="btn btn-primary btn-block" style="margin-top:8px;" onclick="goMasteryTopicList('${c.id}')">দেখো</button>
    </div>`).join('');
  if(courses.length===0) rows = `<div class="empty-state">এখনো কোনো কোর্স নেই।</div>`;
  app.innerHTML = `
    ${header('আমার প্রোগ্রেস')}
    <div class="card">
      <h2>${escapeHtml(name)}, কোন কোর্স দেখতে চাও?</h2>
      ${rows}
    </div>
    <div class="center"><a class="link-back" onclick="go('landing')">← মূল পাতায় ফিরে যাও</a></div>
    ${creditFooter()}
  `;
}
window.goMasteryTopicList = function(courseId){
  const c = window.__masteryCoursesCache.find(x=> x.id === courseId);
  window.__masteryCourseCtx = { courseId, courseTitle: c ? c.title : courseId };
  go('masteryTopicList');
}
async function renderMasteryTopicList(){
  const { courseId, courseTitle } = window.__masteryCourseCtx;
  const { slug, name } = window.__masterySession;
  app.innerHTML = `${header('আমার প্রোগ্রেস')}<div class="card center">লোড হচ্ছে...</div>`;
  const topics = await getMasteryTopics(courseId);
  topics.sort((a,b)=> a.order - b.order);
  window.__masteryTopicsCache = topics;
  const progress = await getMasteryProgressRemote(slug, courseId);
  const progMap = {};
  progress.forEach(p=> progMap[p.topicId] = p);

  let passedCount = 0;
  let rows = topics.map((t,idx)=>{
    const p = progMap[t.id];
    const passed = p && p.passed;
    if(passed) passedCount++;
    const prevPassed = idx===0 || (progMap[topics[idx-1].id] && progMap[topics[idx-1].id].passed);
    const locked = !prevPassed && !passed;
    const statusIcon = passed ? '✅' : (locked ? '🔒' : '▶️');
    const scoreLine = p ? `<div class="meta">সেরা স্কোর: ${p.bestScore}%</div>` : '';
    return `<div class="exam-item">
      <h3 style="margin-bottom:4px;">${statusIcon} ${t.order}. ${escapeHtml(t.title)}</h3>
      ${scoreLine}
      ${locked
        ? `<div class="meta">আগের টপিক পাস করলে এটা খুলবে</div>`
        : `<button class="btn ${passed?'btn-outline':'btn-primary'} btn-block" style="margin-top:8px;" onclick="goMasteryQuiz('${t.id}')">${passed ? '🔁 আবার দাও' : '✍️ কুইজ শুরু করো'}</button>`}
    </div>`;
  }).join('');
  if(topics.length===0) rows = `<div class="empty-state">এখনো কোনো টপিক যোগ করা হয়নি।</div>`;

  const cqPrompts = await getCQPrompts(courseId);
  const cqHtml = cqPrompts.map(p=> `
    <div class="exam-item">
      <h3 style="margin-bottom:6px;">${escapeHtml(p.title)}</h3>
      ${p.imageUrl ? `<img src="${escapeHtml(p.imageUrl)}" style="max-width:100%; border-radius:8px; margin-bottom:8px;" alt="CQ ছবি">`:''}
      <p class="hint">${escapeHtml(p.instruction||'')}</p>
    </div>`).join('');

  app.innerHTML = `
    ${header('আমার প্রোগ্রেস')}
    <div class="card center">
      <h2>${escapeHtml(courseTitle)}</h2>
      <p class="hint">${passedCount} / ${topics.length} টপিক সম্পন্ন</p>
    </div>
    <div class="card">${rows}</div>
    ${cqPrompts.length ? `<div class="card"><h3>📸 CQ প্র্যাকটিস প্রশ্ন</h3>${cqHtml}</div>` : ''}
    <div class="card">
      <h3>📸 হাতে লেখা খাতা জমা দাও</h3>
      <p class="hint">উপরের প্রশ্নগুলো (বা যেকোনো অংশ) খাতায় সমাধান করে ছবি তুলে জমা দাও — AI সংক্ষিপ্ত ফিডব্যাক দেবে।</p>
      <button class="btn btn-gold btn-block" onclick="go('masteryUpload')">খাতা আপলোড করো</button>
    </div>
    <div class="center"><a class="link-back" onclick="go('masteryCourseList')">← কোর্স তালিকায় ফিরে যাও</a></div>
    ${creditFooter()}
  `;
}
window.goMasteryQuiz = function(topicId){
  go('masteryQuiz', { topicId });
}

// ---- Student: take a topic quiz (untimed, single page) ----
async function renderMasteryQuiz(topicId){
  const { courseId } = window.__masteryCourseCtx;
  app.innerHTML = `${header('কুইজ')}<div class="card center">লোড হচ্ছে...</div>`;
  let topic = window.__masteryTopicsCache.find(t=> t.id === topicId);
  if(!topic){
    const topics = await getMasteryTopics(courseId);
    window.__masteryTopicsCache = topics;
    topic = topics.find(t=> t.id === topicId);
  }
  if(!topic){ app.innerHTML = `${header()}<div class="card center">টপিক পাওয়া যায়নি।</div>`; return; }
  window.__masteryQuizCtx = { topic, answers: new Array(topic.questions.length).fill(null) };

  const qHtml = topic.questions.map((q,i)=> `
    <div class="q-block">
      <div class="q-text">${i+1}. ${escapeHtml(q.text)}</div>
      ${q.image ? `<img src="${escapeHtml(q.image)}" style="max-width:100%; border-radius:8px; margin-bottom:10px; display:block;" alt="প্রশ্নের ছবি">` : ''}
      ${q.options.map((opt,j)=> `
        <label class="bubble-opt">
          <input type="radio" name="mq${i}" onchange="setMasteryAnswer(${i},${j})">
          <div class="bubble">${['ক','খ','গ','ঘ'][j]}</div>
          <div class="opt-text">${escapeHtml(opt)}</div>
        </label>
      `).join('')}
    </div>
  `).join('');

  app.innerHTML = `
    ${header('কুইজ')}
    <div class="card">
      <h2>${escapeHtml(topic.title)}</h2>
      <p class="hint">পাস করতে লাগবে ${topic.passPercent}%+ — সব প্রশ্নের উত্তর দিয়ে জমা দাও।</p>
    </div>
    <div class="card">${qHtml}</div>
    <button class="btn btn-primary btn-block" onclick="submitMasteryQuiz()">✅ জমা দাও</button>
    ${creditFooter()}
  `;
}
window.setMasteryAnswer = function(qi, oi){
  window.__masteryQuizCtx.answers[qi] = oi;
}
window.submitMasteryQuiz = async function(){
  const { topic, answers } = window.__masteryQuizCtx;
  const { slug } = window.__masterySession;
  if(answers.some(a=> a===null)){ toast('সব প্রশ্নের উত্তর দাও'); return; }
  let score = 0;
  topic.questions.forEach((q,i)=>{ if(answers[i]===q.correct) score++; });
  toast('জমা হচ্ছে...');
  await submitMasteryAttemptRemote(slug, topic.id, score, topic.questions.length);
  const pct = Math.round((score/topic.questions.length)*100);
  go('masteryQuizResult', { resultTopic: topic, score, total: topic.questions.length, pct });
}
function renderMasteryQuizResult(resultTopic, score, total, pct){
  const passed = pct >= resultTopic.passPercent;
  app.innerHTML = `
    ${header('ফলাফল')}
    <div class="card center">
      <h2>${escapeHtml(resultTopic.title)}</h2>
      <div class="stamp ${passed?'':'fail'}">${score}/${total}</div>
      <p class="hint" style="margin-top:10px;">তুমি পেয়েছো ${pct}% ${passed ? '— পাস করেছো! 🎉 পরের টপিক খুলে গেছে।' : `— পাস করতে লাগবে ${resultTopic.passPercent}%+, আবার চেষ্টা করো।`}</p>
    </div>
    <div class="row">
      <button class="btn btn-outline btn-block" onclick="go('masteryTopicList')">← টপিক তালিকায় ফিরে যাও</button>
      ${!passed ? `<button class="btn btn-gold btn-block" onclick="goMasteryQuiz('${resultTopic.id}')">🔁 আবার চেষ্টা করো</button>`:''}
    </div>
    ${creditFooter()}
  `;
}

// ---- Student: upload handwritten work ----
function renderMasteryUpload(){
  const { courseTitle } = window.__masteryCourseCtx;
  app.innerHTML = `
    ${header('খাতা আপলোড করো')}
    <div class="card">
      <h2>${escapeHtml(courseTitle)}</h2>
      <p class="hint">তোমার হাতে লেখা সমাধানের একটা পরিষ্কার ছবি তুলে আপলোড করো। AI সংক্ষিপ্ত ফিডব্যাক দেবে।</p>
      <input type="file" id="masteryFileInput" accept="image/*" style="margin-bottom:14px;">
      <button class="btn btn-primary btn-block" onclick="submitMasteryUpload()">📤 জমা দাও</button>
      <div id="uploadStatus" style="margin-top:12px;"></div>
    </div>
    <div class="center"><a class="link-back" onclick="go('masteryTopicList')">← ফিরে যাও</a></div>
    ${creditFooter()}
  `;
}
window.submitMasteryUpload = async function(){
  const { courseId } = window.__masteryCourseCtx;
  const { slug } = window.__masterySession;
  const fileInput = document.getElementById('masteryFileInput');
  const file = fileInput.files[0];
  if(!file){ toast('আগে একটা ছবি বাছো'); return; }
  document.getElementById('uploadStatus').innerHTML = `<p class="hint">ছবি প্রস্তুত করা হচ্ছে...</p>`;

  const compressed = await compressImageFile(file, 1000, 0.7);
  document.getElementById('uploadStatus').innerHTML = `<p class="hint">আপলোড হচ্ছে ও AI দিয়ে চেক করা হচ্ছে, একটু অপেক্ষা করো...</p>`;

  const res = await uploadSubmissionRemote(slug, courseId, null, compressed.base64, compressed.mimeType, file.name);
  if(res && res.status === 'success'){
    document.getElementById('uploadStatus').innerHTML = `
      <div class="say">🤖 <b>AI ফিডব্যাক:</b> ${escapeHtml(res.aiFeedback||'ফিডব্যাক পাওয়া যায়নি')}</div>
      <p class="hint" style="margin-top:10px;">✅ জমা হয়ে গেছে — তোমার শিক্ষকও এটা দেখতে পাবেন।</p>
    `;
  } else {
    document.getElementById('uploadStatus').innerHTML = `<p class="hint">জমা দিতে সমস্যা হয়েছে, আবার চেষ্টা করো।</p>`;
  }
}
function compressImageFile(file, maxWidth, quality){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = (e)=>{
      const img = new Image();
      img.onload = ()=>{
        let w = img.width, h = img.height;
        if(w > maxWidth){ h = Math.round(h * (maxWidth/w)); w = maxWidth; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64 = dataUrl.split(',')[1];
        resolve({ base64, mimeType: 'image/jpeg' });
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}



// ================= TEACHER: BATTLE AUDIT & CHEAT LOGS =================
async function renderTeacherBattleAudit(){
  app.innerHTML = `${header('ব্যাটেল অডিট ও অ্যান্টি-চিট')}<div class="card center">অডিট লগ লোড হচ্ছে...</div>${creditFooter()}`;
  const res = await postToScript('getBattleSessions', {});
  const sessions = (res && res.status === 'success') ? res.data : [];

  const rowsHtml = sessions.map(s => `
    <div class="exam-item" style="margin-bottom:10px;">
      <div class="row-top">
        <div>
          <div style="font-weight:700; font-size:15px; color:var(--ink);">🧑‍🎓 ${escapeHtml(s.slug)}</div>
          <div class="meta">${escapeHtml(s.subject)} · ${s.monsterType==='boss'?'👑 বিশ্ব বস':'👾 চ্যাপ্টার দানব'} · ফলাফল: <span style="font-weight:700; color:${s.outcome==='won'?'var(--green)':'var(--red)'};">${s.outcome}</span></div>
          <div class="meta">প্রশ্ন: ${s.questionsAsked}টি | সঠিক: ${s.questionsCorrect}টি · ${formatDate(s.startedAt)}</div>
        </div>
        <button class="btn btn-outline" style="padding:6px 12px; font-size:12px;" onclick="drillIntoBattleSession('${s.id}', '${s.slug}')">🔍 বিস্তারিত</button>
      </div>
    </div>
  `).join('');

  app.innerHTML = `
    ${header('ব্যাটেল অডিট ও অ্যান্টি-চিট')}
    <div class="card">
      <h2>🛡️ ছাত্রছাত্রীদের ব্যাটেল সেশন রিপোর্ট</h2>
      <p class="hint">কোন ছাত্র কত দ্রুত উত্তর দিয়েছে বা পরীক্ষা চলাকালীন দৃষ্টি বাইরে রেখেছিল কি না তা এখানে অডিট করা যায়।</p>
      ${rowsHtml || '<div class="empty-state">এখনো কোনো ব্যাটেল সেশন খেলা হয়নি।</div>'}
    </div>
    <div class="center" style="margin-top:14px;"><a class="link-back" onclick="go('teacherDashboard')">← শিক্ষক ড্যাশবোর্ডে ফিরে যাও</a></div>
    ${creditFooter()}
  `;
}

window.drillIntoBattleSession = async function(sessionId, slug){
  toast('বিস্তারিত লোড হচ্ছে...');
  const res = await postToScript('getBattleSessions', { sessionId });
  const answers = (res && res.data) || [];
  const flags = (res && res.flags) || [];

  let flagsHtml = flags.length ? `
    <div style="background:#FDEEEE; border:1px solid #F5C6CB; border-radius:10px; padding:12px; margin-bottom:14px;">
      <div style="font-weight:700; color:var(--red); font-size:13.5px; margin-bottom:6px;">⚠️ অ্যান্টি-চিট অ্যালার্ট (${flags.length}টি ঘটনা):</div>
      ${flags.map(f => `<div style="font-size:12px; color:#721C24; margin-bottom:4px;">• <b>${escapeHtml(f.type)}</b>: ${escapeHtml(f.detail)} (${formatDate(f.flaggedAt)})</div>`).join('')}
    </div>
  ` : `<div style="background:#E8F6EF; border:1px solid #C3E6CB; border-radius:10px; padding:10px; margin-bottom:14px; color:var(--green); font-size:13px;">✅ কোনো সন্দেহজনক কর্মকাণ্ড বা চিটিং রেকর্ড পাওয়া যায়নি।</div>`;

  const tableRows = answers.map((a, i) => `
    <tr>
      <td>${i+1}</td>
      <td>${a.correct ? '✅ সঠিক' : '❌ ভুল'}</td>
      <td>${a.timeTakenSec} সেকেন্ড ${a.fastFlag ? '<span style="color:var(--red); font-weight:700;">(দ্রুত দাগানো!)</span>' : ''}</td>
      <td>${a.isReview ? 'রিভিউ রাউন্ড' : 'স্বাভাবিক'}</td>
    </tr>
  `).join('');

  app.innerHTML = `
    ${header('সেশন অডিট রিপোর্ট')}
    <div class="card">
      <h2>স্টুডেন্ট: ${escapeHtml(slug)}</h2>
      <div style="font-size:12.5px; color:var(--pencil); margin-bottom:14px;">সেশন আইডি: <code>${sessionId}</code></div>
      ${flagsHtml}
      <h3>প্রশ্নের উত্তর ও সময় পর্যালোচনা</h3>
      <table class="results" style="margin-top:8px;">
        <thead>
          <tr>
            <th>নং</th>
            <th>ফলাফল</th>
            <th>সময় (সেকেন্ড)</th>
            <th>ধরণ</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows || '<tr><td colspan="4" class="center">কোনো তথ্য নেই</td></tr>'}
        </tbody>
      </table>
    </div>
    <div class="center" style="margin-top:14px;"><a class="link-back" onclick="renderTeacherBattleAudit()">← অডিট তালিকায় ফিরে যাও</a></div>
    ${creditFooter()}
  `;
};

// ================= REALISTIC BOSS BATTLE: WORLD MAP & COMBAT ARENA =================
let battleWorldDataCache = null;
async function renderBattleWorldMap(){
  const stud = getLoggedStudent();
  if(!stud){ go('studentAuth'); return; }
  const slug = stud.slug;

  app.innerHTML = `
    ${header('বস ব্যাটেল মানচিত্র')}
    <div class="card center" style="padding:40px 20px;">
      <div style="font-size:32px; animation: pulse 1s infinite;">🗺️</div>
      <h3 style="margin-top:10px;">বিশ্ব মানচিত্র উন্মোচিত হচ্ছে...</h3>
      <p class="hint">বিষয়ভিত্তিক চ্যাপ্টার দানবদের অবস্থা যাচাই করা হচ্ছে</p>
    </div>
    ${creditFooter()}
  `;

  const res = await postToScript('getBattleWorldMap', { slug });
  const worlds = (res && res.status === 'success') ? res.worlds : [];
  battleWorldDataCache = worlds;

  const subjectIcons = {
    physics: '⚡',
    chemistry: '🧪',
    mathematics: '📐',
    math: '📐',
    biology: '🌿',
    ict: '💻'
  };

  const worldsHtml = worlds.map(w => {
    const sKey = (w.subject || '').toLowerCase();
    const icon = subjectIcons[sKey] || '🪐';
    const total = w.totalChapters || 0;
    const cleared = w.clearedChapters || 0;
    const pct = total > 0 ? Math.round((cleared / total) * 100) : 0;
    const isBossReady = w.bossUnlocked;

    return `
      <div class="world-card ${isBossReady?'boss-unlocked-glow':''}" onclick="go('battleChapterSelect', { courseId:'${w.id}', subject:'${escapeHtml(w.subject)}', title:'${escapeHtml(w.title)}' })">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="font-size:32px;">${icon}</div>
            <div>
              <h3 style="margin:0; font-size:17px; color:var(--ink);">${escapeHtml(w.title || w.subject)}</h3>
              <div style="font-size:12.5px; color:var(--pencil);">${total}টি অধ্যায়ের দানব · ${cleared}টি বধ হয়েছে</div>
            </div>
          </div>
          <div style="text-align:right;">
            <span class="widget-tag ${pct===100?'tag-gold':(pct>0?'tag-blue':'tag-red')}">${pct}% সম্পূর্ণ</span>
          </div>
        </div>
        
        <div class="hp-bar-wrap" style="max-width:100%; height:8px; margin-top:8px;">
          <div class="hp-bar-fill" style="width:${pct}%; background:linear-gradient(90deg, #2ecc71, #27ae60);"></div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; font-size:12px;">
          <span style="color:${isBossReady?'var(--gold)':'var(--pencil)'}; font-weight:600;">
            ${isBossReady ? '👑 বিশ্ব বস আনলক হয়েছে!' : '🔒 সব চ্যাপ্টার শেষ হলে বিশ্ব বস আসবে'}
          </span>
          <span style="color:var(--ink); font-weight:700;">যুদ্ধে প্রবেশ →</span>
        </div>
      </div>
    `;
  }).join('');

  app.innerHTML = `
    ${header('বস ব্যাটেল বিশ্ব মানচিত্র')}
    <div class="hero-card" style="margin-bottom:16px;">
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <div>
          <div style="font-size:12.5px; color:rgba(255,255,255,0.75);">মো: সায়মন সামিউ প্রণীত</div>
          <h2 style="color:#fff; margin:2px 0 4px 0; font-size:22px;">⚔️ মাস্টারি দানব ব্যাটেল</h2>
          <div style="font-size:12.5px; color:rgba(255,255,255,0.85);">যেকোনো অধ্যায়ের দানবের সাথে স্বাধীনভাবে লড়াই করো</div>
        </div>
        <div style="font-size:40px;">🏰</div>
      </div>
    </div>

    <div class="card">
      <h2>বিষয় ও বিশ্ব নির্বাচন করো</h2>
      <p class="hint">যে বিষয়ে যুদ্ধ করতে চাও তা স্পর্শ করো। প্রতিটি সঠিক উত্তর দানবকে ১ HP ক্ষতি করবে।</p>
      ${worldsHtml || '<div class="empty-state">মাস্টারিতে এখনো কোনো কোর্স যোগ করা হয়নি।</div>'}
    </div>

    <div class="center" style="margin-top:14px;"><a class="link-back" onclick="go('studentDashboard')">← ড্যাশবোর্ডে ফিরে যাও</a></div>
    ${creditFooter()}
  `;
}

function renderBattleChapterSelect(courseId, subject, title){
  const stud = getLoggedStudent();
  if(!stud){ go('studentAuth'); return; }
  const worlds = battleWorldDataCache || [];
  const currentWorld = worlds.find(w => w.id === courseId) || { chapters:[], bossUnlocked:false };
  const chapters = currentWorld.chapters || [];
  const bossUnlocked = currentWorld.bossUnlocked;

  const monsterTitles = [
    'অসুর', 'টাইটান', 'দানব', 'গলেম', 'ড্রাগন', 'রক্ষক', 'প্রেতাত্মা', 'জাদুকর'
  ];

  const monstersHtml = chapters.map((ch, idx) => {
    const mName = monsterTitles[idx % monsterTitles.length];
    const fullMonsterTitle = `${escapeHtml(ch.title)}-এর ${mName}`;
    const pct = ch.maxHp > 0 ? Math.round(((ch.maxHp - ch.hp) / ch.maxHp) * 100) : 0;
    const isDefeated = ch.defeated;

    return `
      <div class="exam-item" style="padding:14px; margin-bottom:12px; border:1.5px solid ${isDefeated?'#A3E0B5':'var(--paper-edge)'}; background:${isDefeated?'#F6FBF8':'#FCFDFE'};">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="font-size:32px;">${isDefeated ? '💀' : '👾'}</div>
            <div>
              <div style="font-weight:700; font-size:15px; color:var(--ink);">${fullMonsterTitle}</div>
              <div class="meta">অধ্যায়: ${escapeHtml(ch.title)} · বাকি HP: <b>${ch.hp}</b> / ${ch.maxHp}</div>
            </div>
          </div>
          <button class="btn ${isDefeated?'btn-outline':'btn-primary'}" style="padding:8px 16px; font-size:13px;" onclick="startBattleSessionHandler('${courseId}', '${escapeHtml(subject)}', '${ch.id}', 'chapter', '${escapeHtml(fullMonsterTitle)}', ${ch.hp}, ${ch.maxHp})">
            ${isDefeated ? 'রিপ্লে ⚔️' : 'আক্রমণ ⚔️'}
          </button>
        </div>

        <div class="hp-bar-wrap" style="max-width:100%; height:8px; margin-top:10px;">
          <div class="hp-bar-fill" style="width:${100-pct}%; background:${ch.hp<3?'linear-gradient(90deg, #e74c3c, #c0392b)':'linear-gradient(90deg, #2ecc71, #27ae60)'};"></div>
        </div>
      </div>
    `;
  }).join('');

  app.innerHTML = `
    ${header(title || subject)}
    
    ${bossUnlocked ? `
      <div class="hero-card boss-unlocked-glow" style="margin-bottom:16px; background:linear-gradient(135deg, #3d1b1b 0%, #1F2A44 100%);">
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <div>
            <span class="widget-tag tag-gold" style="margin-bottom:6px; display:inline-block;">👑 চূড়ান্ত যুদ্ধ</span>
            <h2 style="color:#fff; margin:0; font-size:22px;">বিশ্ব বস মনস্টার</h2>
            <p style="font-size:12.5px; color:rgba(255,255,255,0.85); margin:4px 0 10px 0;">সব অধ্যায়ের সম্মিলিত ও কঠিন প্রশ্ন নিয়ে চূড়ান্ত যুদ্ধ।</p>
          </div>
          <div style="font-size:46px;">🐉</div>
        </div>
        <button class="btn btn-gold btn-block" style="box-shadow:0 4px 16px rgba(229,142,38,0.5);" onclick="startBattleSessionHandler('${courseId}', '${escapeHtml(subject)}', 'boss', 'boss', '${escapeHtml(subject)} বিশ্ব বস', 35, 35)">👑 বিশ্ব বসের বিরুদ্ধে লড়াই করো ⚔️</button>
      </div>
    ` : ''}

    <div class="card">
      <h2>চ্যাপ্টার দানবদের তালিকা</h2>
      <p class="hint">যেকোনো অধ্যায় নির্বাচন করে লড়াই শুরু করতে পারো। তোমার অগ্রগতি সার্ভারে সংরক্ষিত থাকবে।</p>
      ${monstersHtml || '<div class="empty-state">এই কোর্সে কোনো অধ্যায় পাওয়া যায়নি।</div>'}
    </div>

    <div class="center" style="margin-top:14px;"><a class="link-back" onclick="go('battleWorldMap')">← বিশ্ব মানচিত্রে ফিরে যাও</a></div>
    ${creditFooter()}
  `;
}

// Global battle context
window.__battleCtx = null;

window.startBattleSessionHandler = async function(courseId, subject, monsterRef, monsterType, monsterTitle, hp, maxHp){
  const stud = getLoggedStudent();
  if(!stud){ go('studentAuth'); return; }
  const slug = stud.slug;

  toast('যুদ্ধক্ষেত্র তৈরি হচ্ছে...');
  const res = await postToScript('startBattleSession', {
    slug,
    subject,
    monsterType,
    monsterRef
  });

  if(!res || res.status !== 'success'){
    toast('যুদ্ধ শুরু করতে সমস্যা হয়েছে');
    return;
  }

  window.__battleCtx = {
    sessionId: res.sessionId,
    slug,
    courseId,
    subject,
    monsterRef,
    monsterType,
    monsterTitle,
    currentHp: hp || 10,
    maxHp: maxHp || 10,
    combo: 0,
    questionsAnswered: 0,
    recentBatchCorrect: 0,
    isReviewRound: false,
    reviewQuestionsPool: [],
    recentQuestionIds: [],
    currentQuestion: null,
    timerSeconds: 50,
    timerHandle: null
  };

  playSfx('combo');
  fetchNextBattleQuestion();
};

async function fetchNextBattleQuestion(){
  const ctx = window.__battleCtx;
  if(!ctx) return;

  if(ctx.timerHandle){ clearInterval(ctx.timerHandle); ctx.timerHandle = null; }

  // Check Review Round mechanic (§3.3): Every 5 questions within a battle
  if(!ctx.isReviewRound && ctx.questionsAnswered > 0 && ctx.questionsAnswered % 5 === 0 && ctx.reviewQuestionsPool.length > 0){
    ctx.isReviewRound = true;
    toast('⚡ কুইক রিকল / রিভিশন রাউন্ড!');
    playSfx('combo');
    // Pop a question from review pool
    const revItem = ctx.reviewQuestionsPool.shift();
    // the review question must become the "current" one, otherwise its answer would be
    // graded against the previous question
    ctx.currentQuestion = revItem.q;
    ctx.currentTopicId = revItem.topicId;
    renderBattleQuestionStage(revItem.q, true);
    return;
  }

  ctx.isReviewRound = false;
  app.innerHTML = `
    ${header('যুদ্ধ চলছে')}
    <div class="battle-stage center" style="padding:50px 20px;">
      <div style="font-size:36px; animation:pulse 1s infinite;">⚔️</div>
      <h3 style="color:#fff; margin-top:12px;">পরবর্তী প্রশ্ন আসছে...</h3>
    </div>
    ${creditFooter()}
  `;

  const excludeStr = ctx.recentQuestionIds.slice(-4).join(',');
  const params = {
    slug: ctx.slug,
    monsterType: ctx.monsterType,
    excludeIds: excludeStr
  };
  if(ctx.monsterType === 'chapter') params.topicId = ctx.monsterRef;
  if(ctx.monsterType === 'boss') params.courseId = ctx.courseId;

  const res = await postToScript('getQuestionForBattle', params);
  if(!res || res.status !== 'success'){
    toast('প্রশ্ন লোড করা যায়নি');
    go('battleWorldMap');
    return;
  }

  if(res.defeated){
    showMonsterDefeatedVictory(ctx);
    return;
  }

  if(res.hp !== undefined) ctx.currentHp = res.hp;
  if(res.maxHp !== undefined) ctx.maxHp = res.maxHp;

  ctx.currentQuestion = res.question;
  ctx.currentTopicId = res.topicId || ctx.monsterRef;
  ctx.recentQuestionIds.push(res.question.id);

  renderBattleQuestionStage(res.question, false);
}

function renderBattleQuestionStage(question, isReview){
  const ctx = window.__battleCtx;
  const hpPct = ctx.maxHp > 0 ? Math.max(0, Math.min(100, Math.round((ctx.currentHp / ctx.maxHp) * 100))) : 0;
  const hpClass = hpPct > 50 ? '' : (hpPct > 25 ? 'mid' : 'low');

  // Dynamic monster reaction quotes
  let monsterQuote = 'তুমি আমার প্রশ্নের উত্তর দিতে পারবে না!';
  if(ctx.currentHp <= 2) monsterQuote = 'আমার শক্তি প্রায় শেষ... এটাই তোমার শেষ সুযোগ!';
  else if(ctx.combo >= 2) monsterQuote = 'উফ! তোমার কম্বো আঘাত আমাকে দুর্বল করে দিচ্ছে!';
  else if(hpPct <= 50) monsterQuote = 'আহ! শক্তিশালী আক্রমণ!';

  const monsterAvatarIcon = ctx.monsterType === 'boss' ? '🐉' : '👹';
  const duration = isReview ? 30 : 50;
  ctx.timerSeconds = duration;

  const optionsHtml = (question.options || []).map((opt, idx) => `
    <div class="bubble-opt battle-opt-btn" id="optBtn${idx}" onclick="submitBattleAnswerOption(${idx})" style="background:#fff; border:1.5px solid var(--rule); margin-bottom:10px; padding:12px 14px; border-radius:10px; transition:all 0.1s ease;">
      <div class="bubble" id="bubble${idx}">${String.fromCharCode(65+idx)}</div>
      <div class="opt-text" style="font-weight:600;">${escapeHtml(opt)}</div>
    </div>
  `).join('');

  app.innerHTML = `
    ${header('বস ব্যাটেল')}

    <div class="battle-stage" id="battleArenaStage">
      <!-- Floating damage container -->
      <div id="damagePopupContainer"></div>

      <!-- Top HUD Bar -->
      <div class="battle-header-bar">
        <div style="display:flex; align-items:center; gap:8px;">
          <button class="audio-toggle-btn" id="soundToggleBtn" onclick="toggleSound()">${soundEnabled?'🔊 সাউন্ড চালু':'🔇 সাউন্ড বন্ধ'}</button>
          ${ctx.combo >= 2 ? `<span class="combo-streak">🔥 ${ctx.combo}x কম্বো!</span>` : ''}
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          ${isReview ? '<span class="widget-tag tag-gold" style="font-size:11px;">⚡ কুইক রিকল রাউন্ড</span>' : ''}
          <div class="timer-chip ${ctx.timerSeconds<=10?'low':''}" id="battleTimerBadge" style="position:static; padding:5px 12px; font-size:13px;">
            <span class="timer-dot"></span> <span id="timerNum">${ctx.timerSeconds}s</span>
          </div>
        </div>
      </div>

      <!-- Monster Avatar & Status -->
      <div class="monster-box">
        <div class="monster-avatar" id="monsterAvatarElem">${monsterAvatarIcon}</div>
        <div style="font-size:16px; font-weight:700; color:#fff; margin-bottom:6px;">${escapeHtml(ctx.monsterTitle)}</div>
        <div class="monster-speech" id="monsterSpeechBubble">"${monsterQuote}"</div>
        
        <div class="hp-bar-wrap">
          <div class="hp-bar-fill ${hpClass}" id="battleHpBarFill" style="width:${hpPct}%;"></div>
        </div>
        <div class="hp-label">HP: <span id="hpNumDisplay">${ctx.currentHp}</span> / ${ctx.maxHp}</div>
      </div>
    </div>

    <!-- Question Card -->
    <div class="card" style="margin-top:-6px; position:relative; z-index:2;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <span class="q-tag">প্রশ্ন #${ctx.questionsAnswered + 1}</span>
        <span style="font-size:12px; color:var(--pencil);">${isReview ? '৩০ সেকেন্ড দ্রুত রিটেনশন' : '৫০ সেকেন্ড সময়'}</span>
      </div>

      <div class="q-text" style="font-size:16.5px; line-height:1.5;">${escapeHtml(question.text || '')}</div>
      ${question.image ? `<img src="${escapeHtml(question.image)}" style="max-width:100%; border-radius:8px; margin-bottom:12px;" alt="প্রশ্নের ছবি">` : ''}

      <div style="margin-top:14px;" id="optionsGroup">
        ${optionsHtml}
      </div>

      <div style="margin-top:14px; text-align:center;">
        <a class="link-back" onclick="abandonBattlePrompt()">🏳️ যুদ্ধ ছেড়ে বের হও</a>
      </div>
    </div>

    ${creditFooter()}
  `;

  renderAllMath(document.getElementById('app'));

  // Start Countdown Timer
  const timerBadge = document.getElementById('battleTimerBadge');
  const timerNum = document.getElementById('timerNum');
  ctx.timerStartTime = Date.now();
  ctx.timerHandle = setInterval(() => {
    ctx.timerSeconds--;
    if(timerNum) timerNum.innerText = ctx.timerSeconds + 's';
    if(ctx.timerSeconds <= 10 && timerBadge) timerBadge.classList.add('low');
    if(ctx.timerSeconds <= 0){
      clearInterval(ctx.timerHandle);
      ctx.timerHandle = null;
      handleBattleTimeout();
    }
  }, 1000);
}

window.submitBattleAnswerOption = async function(chosenIndex){
  const ctx = window.__battleCtx;
  if(!ctx || ctx.isSubmitting) return;
  ctx.isSubmitting = true;

  if(ctx.timerHandle){ clearInterval(ctx.timerHandle); ctx.timerHandle = null; }

  const timeTakenSec = Math.max(1, Math.round((Date.now() - ctx.timerStartTime) / 1000));
  const q = ctx.currentQuestion;
  const isReview = ctx.isReviewRound;

  // Disable options visually
  const optBtns = document.querySelectorAll('.battle-opt-btn');
  optBtns.forEach(b => b.style.pointerEvents = 'none');

  const res = await postToScript('submitBattleAnswer', {
    sessionId: ctx.sessionId,
    slug: ctx.slug,
    topicId: ctx.currentTopicId,
    questionId: q.id,
    chosenIndex,
    timeTakenSec,
    isReview: isReview ? 'true' : 'false',
    monsterType: ctx.monsterType
  });

  ctx.isSubmitting = false;
  ctx.questionsAnswered++;

  const chosenBtn = document.getElementById('optBtn' + chosenIndex);
  const chosenBubble = document.getElementById('bubble' + chosenIndex);

  if(!res || res.status !== 'success'){
    toast('উত্তর যাচাই করতে সমস্যা হয়েছে');
    fetchNextBattleQuestion();
    return;
  }

  const isCorrect = res.correct;
  const correctIdx = res.correctIndex;

  if(isCorrect){
    // Play sound
    playSfx('slash');
    setTimeout(() => playSfx('hit'), 80);

    ctx.combo++;
    if(!isReview) ctx.reviewQuestionsPool.push({ q, topicId: ctx.currentTopicId });

    // Visual styles
    if(chosenBtn){
      chosenBtn.style.background = '#EBF7EE';
      chosenBtn.style.borderColor = 'var(--green)';
    }
    if(chosenBubble){
      chosenBubble.style.background = 'var(--green)';
      chosenBubble.style.color = '#fff';
    }

    // Monster hit reaction
    triggerMonsterDamageAnimation(ctx.combo >= 3);

    // Update HP locally
    if(res.hpUpdate){
      ctx.currentHp = res.hpUpdate.hp;
      ctx.maxHp = res.hpUpdate.maxHp;
      const hpFill = document.getElementById('battleHpBarFill');
      const hpNum = document.getElementById('hpNumDisplay');
      if(hpFill){
        const pct = Math.max(0, Math.round((ctx.currentHp / ctx.maxHp) * 100));
        hpFill.style.width = pct + '%';
        if(pct <= 25) hpFill.className = 'hp-bar-fill low';
        else if(pct <= 50) hpFill.className = 'hp-bar-fill mid';
      }
      if(hpNum) hpNum.innerText = ctx.currentHp;
    }

    // Check defeat
    if(res.hpUpdate && res.hpUpdate.defeated){
      setTimeout(() => {
        showMonsterDefeatedVictory(ctx);
      }, 700);
      return;
    }
  } else {
    // Wrong answer
    playSfx('wrong');
    ctx.combo = 0;

    if(chosenBtn){
      chosenBtn.style.background = '#FDEEEE';
      chosenBtn.style.borderColor = 'var(--red)';
    }
    if(chosenBubble){
      chosenBubble.style.background = 'var(--red)';
      chosenBubble.style.color = '#fff';
    }

    // Highlight correct answer
    const rightBtn = document.getElementById('optBtn' + correctIdx);
    if(rightBtn){
      rightBtn.style.background = '#EBF7EE';
      rightBtn.style.borderColor = 'var(--green)';
    }
  }

  // Next question after 1.4s delay
  setTimeout(() => {
    fetchNextBattleQuestion();
  }, 1400);
};

function triggerMonsterDamageAnimation(isCrit){
  const avatar = document.getElementById('monsterAvatarElem');
  if(avatar){
    avatar.classList.remove('shake-monster');
    void avatar.offsetWidth; // trigger reflow
    avatar.classList.add('shake-monster');
  }

  const container = document.getElementById('damagePopupContainer');
  if(container){
    const popup = document.createElement('div');
    popup.className = 'damage-popup' + (isCrit ? ' crit' : '');
    popup.innerText = isCrit ? '🔥 CRITICAL! -2 HP' : '-1 HP';
    container.appendChild(popup);
    setTimeout(() => popup.remove(), 800);
  }
}

function handleBattleTimeout(){
  toast('⏰ সময় শেষ!');
  playSfx('wrong');
  const ctx = window.__battleCtx;
  if(!ctx) return;
  ctx.combo = 0;
  ctx.questionsAnswered++;
  setTimeout(() => fetchNextBattleQuestion(), 1200);
}

window.abandonBattlePrompt = function(){
  if(confirm('তুমি কি নিশ্চিত যুদ্ধ ছেড়ে বের হতে চাও? (বর্তমান অগ্রগতি সংরক্ষিত থাকবে)')){
    const ctx = window.__battleCtx;
    if(ctx && ctx.timerHandle) clearInterval(ctx.timerHandle);
    if(ctx) postToScript('endBattleSession', { sessionId: ctx.sessionId, outcome: 'abandoned' });
    window.__battleCtx = null;
    go('battleWorldMap');
  }
};

function showMonsterDefeatedVictory(ctx){
  if(ctx.timerHandle) clearInterval(ctx.timerHandle);
  playSfx('victory');
  postToScript('endBattleSession', { sessionId: ctx.sessionId, outcome: 'won' });

  app.innerHTML = `
    ${header('বিজয় অর্জন!')}
    <div class="battle-stage center" style="padding:40px 20px;">
      <div style="font-size:64px; animation: fireGlow 1s infinite alternate;">🏆</div>
      <h1 style="color:var(--gold); margin:12px 0 6px 0;">মহাবিজয়! দানব পরাস্ত হয়েছে!</h1>
      <p style="color:#F5F7FB; font-size:15px; margin-bottom:18px;">
        অভিনন্দন! তুমি সফলভাবে <b>${escapeHtml(ctx.monsterTitle)}</b> কে বধ করেছ। এই অধ্যায়টি এখন জয় করা হয়েছে!
      </p>
      <div style="background:rgba(255,255,255,0.1); border-radius:12px; padding:12px; margin-bottom:20px; font-size:13px; color:#fff;">
        মোট উত্তর দেওয়া প্রশ্ন: <b>${ctx.questionsAnswered}</b>টি
      </div>
      <button class="btn btn-gold btn-block" onclick="go('battleWorldMap')">🗺️ বিশ্ব মানচিত্রে ফিরে যাও</button>
    </div>
    ${creditFooter()}
  `;
}

// ================= ANTI-CHEAT LOOK-AWAY DETECTOR =================
document.addEventListener('visibilitychange', function(){
  const ctx = window.__battleCtx;
  if(!ctx) return;
  if(document.hidden){
    ctx._hiddenStart = Date.now();
  } else if(ctx._hiddenStart){
    const elapsed = Math.round((Date.now() - ctx._hiddenStart) / 1000);
    ctx._hiddenStart = null;
    if(elapsed >= 3){
      postToScript('logCheatFlag', {
        sessionId: ctx.sessionId,
        type: 'lookAway',
        questionId: ctx.currentQuestion ? ctx.currentQuestion.id : '',
        detail: `ট্যাব পরিবর্তন বা স্ক্রিন থেকে দৃষ্টি সরানো (${elapsed} সেকেন্ড)`
      });
    }
  }
});
