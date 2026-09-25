// ============================================================================
// topics.js -- part of the পরীক্ষার খাতা frontend, split out of the original
// single inline <script> in index.html for readability. Loaded via plain
// <script src="js/topics.js"> tags (in the order listed in index.html), which
// all share one global scope in the browser -- exactly like the original
// single script did, so nothing about how functions call each other changes.
// ============================================================================

// ================= TOPICS (chapter-wise study material) =================
const TOPIC_STRUCTURE = {
  physics: {
    label: 'পদার্থবিজ্ঞান (Physics)',
    sections: {
      paper1: { label: '১ম পত্র', count: 10 },
      paper2: { label: '২য় পত্র', count: 10 }
    }
  },
  chemistry: {
    label: 'রসায়ন (Chemistry)',
    sections: {
      paper1: { label: '১ম পত্র', count: 5 },
      paper2: { label: '২য় পত্র', count: 5 }
    }
  },
  mathematics: {
    label: 'গণিত (Mathematics)',
    sections: {
      paper1: { label: '১ম পত্র', count: 10 },
      paper2: { label: '২য় পত্র', count: 10 }
    }
  },
  biology: {
    label: 'জীববিজ্ঞান (Biology)',
    sections: {
      botany: { label: 'উদ্ভিদবিজ্ঞান (Botany)', count: 12 },
      zoology: { label: 'প্রাণিবিজ্ঞান (Zoology)', count: 12 }
    }
  },
  ict: {
    label: 'তথ্য ও যোগাযোগ প্রযুক্তি (ICT)',
    sections: {
      main: { label: 'সব অধ্যায়', count: 6 }
    }
  }
};
async function getAllTopics(){
  try{
    const r = await fetch(`${SCRIPT_URL}?action=listTopics`);
    const json = await r.json();
    if(json.status==='success') return json.data;
  } catch(e){}
  return [];
}
async function saveTopicRemote(key, name, content){
  const res = await postToScript('saveTopic', { key, name, content });
  return !!res;
}

// ---- Teacher: manage topics ----
function renderTopicsManage(){
  const btns = Object.keys(TOPIC_STRUCTURE).map(subject=>{
    const subj = TOPIC_STRUCTURE[subject];
    const icon = subject==='physics' ? '⚛️' : (subject==='chemistry' ? '🧪' : (subject==='biology' ? '🌿' : (subject==='ict' ? '💻' : '📐')));
    return `<button class="btn btn-primary btn-block" style="margin-top:8px;" onclick="go('topicsManageSection',{subject:'${subject}'})">${icon} ${subj.label}</button>`;
  }).join('');
  app.innerHTML = `
    ${header('Topics ম্যানেজ করো')}
    <div class="card">
      <h2>বিষয় বাছো</h2>
      <p class="hint">Physics/Chemistry/Mathematics-এ ১ম ও ২য় পত্র, Biology-তে Botany ও Zoology, ICT-তে সব অধ্যায় একসাথে। প্রতিটার নাম ও কনটেন্ট তুমি লিখে দিতে পারবে।</p>
      ${btns}
    </div>
    <div class="center"><a class="link-back" onclick="go('teacherDashboard')">← ফিরে যাও</a></div>
    ${creditFooter()}
  `;
}
function renderTopicsManageSection(subject){
  const subj = TOPIC_STRUCTURE[subject];
  const btns = Object.keys(subj.sections).map(secKey=>{
    const sec = subj.sections[secKey];
    return `<button class="btn btn-outline btn-block" style="margin-top:8px;" onclick="go('topicsManageChapters',{subject:'${subject}', sectionKey:'${secKey}'})">${sec.label} (${sec.count}টা অধ্যায়)</button>`;
  }).join('');
  app.innerHTML = `
    ${header('Topics ম্যানেজ করো')}
    <div class="card">
      <h2>${subj.label}</h2>
      ${btns}
    </div>
    <div class="center"><a class="link-back" onclick="go('topicsManage')">← ফিরে যাও</a></div>
    ${creditFooter()}
  `;
}
async function renderTopicsManageChapters(subject, sectionKey){
  app.innerHTML = `${header('Topics ম্যানেজ করো')}<div class="card center">লোড হচ্ছে...</div>`;
  const sec = TOPIC_STRUCTURE[subject].sections[sectionKey];
  const allTopics = await getAllTopics();
  const map = {};
  allTopics.forEach(t=>{ map[t.key] = t; });
  window.__topicsManageCtx = { subject, sectionKey, map };
  let rows = '';
  for(let i=1;i<=sec.count;i++){
    const key = `${subject}_${sectionKey}_${i}`;
    const existing = map[key];
    const name = existing ? existing.name : `অধ্যায় ${i}`;
    rows += `<div class="exam-item">
      <h3 style="margin-bottom:4px;">অধ্যায় ${i}: ${escapeHtml(name)}</h3>
      <div class="meta">${existing && existing.content ? 'কনটেন্ট যোগ করা আছে ✓' : 'এখনো কনটেন্ট যোগ করা হয়নি'}</div>
      <button class="btn btn-outline btn-block" style="margin-top:8px;" onclick="editTopicChapter(${i})">✏️ লেখো / এডিট করো</button>
    </div>`;
  }
  app.innerHTML = `
    ${header('Topics ম্যানেজ করো')}
    <div class="card">
      <h2>${TOPIC_STRUCTURE[subject].label} · ${sec.label}</h2>
      ${rows}
    </div>
    <div class="card">
      <h2>📥 একসাথে অনেক অধ্যায় বসাও (Bulk Import)</h2>
      <p class="hint">নিচের ফরম্যাটে পেস্ট করো — প্রতিটা অধ্যায়ের নাম লেখো <code>##</code> দিয়ে শুরু করে, তার নিচে কনটেন্ট লেখো। ক্রম অনুযায়ী অধ্যায় ১, ২, ৩... এ বসে যাবে:<br>
      <code>## অধ্যায়ের নাম ১<br>এখানে কনটেন্ট লেখো, একাধিক লাইনেও লেখা যাবে...<br><br>## অধ্যায়ের নাম ২<br>এই অধ্যায়ের কনটেন্ট...</code></p>
      <textarea id="topicBulkText" placeholder="এখানে পেস্ট করো..."></textarea>
      <button class="btn btn-outline btn-block" onclick="importTopicsBulk('${subject}','${sectionKey}',${sec.count})">📥 ইম্পোর্ট করো ও সেভ করো</button>
    </div>
    <div class="center"><a class="link-back" onclick="go('topicsManageSection',{subject:'${subject}'})">← ফিরে যাও</a></div>
    ${creditFooter()}
  `;
}
window.importTopicsBulk = async function(subject, sectionKey, maxCount){
  const raw = document.getElementById('topicBulkText').value;
  if(!raw.trim()){ toast('আগে টেক্সট পেস্ট করো'); return; }
  const blocks = raw.split(/\n(?=##\s)/).map(b=>b.trim()).filter(Boolean);
  const parsed = [];
  for(const block of blocks){
    const lines = block.split('\n');
    const headerLine = lines[0].replace(/^##\s*/, '').trim();
    const content = lines.slice(1).join('\n').trim();
    if(headerLine) parsed.push({ name: headerLine, content });
  }
  if(parsed.length === 0){ toast('কোনো অধ্যায় পার্স করা যায়নি, ফরম্যাট চেক করো'); return; }
  const toSave = parsed.slice(0, maxCount);
  toast(`${toSave.length}টা অধ্যায় সেভ হচ্ছে...`);
  for(let i=0;i<toSave.length;i++){
    const key = `${subject}_${sectionKey}_${i+1}`;
    await saveTopicRemote(key, toSave[i].name, toSave[i].content);
  }
  toast(`${toSave.length}টা অধ্যায় সেভ হয়েছে ✅`);
  go('topicsManageChapters', { subject, sectionKey });
}
window.editTopicChapter = function(chNum){
  const { subject, sectionKey, map } = window.__topicsManageCtx;
  const key = `${subject}_${sectionKey}_${chNum}`;
  const existing = map[key];
  const existingName = existing ? existing.name : `অধ্যায় ${chNum}`;
  const existingContent = existing ? existing.content : '';
  go('topicsEdit', { subject, sectionKey, chNum, existingName, existingContent });
}
function renderTopicsEdit(subject, sectionKey, chNum, existingName, existingContent){
  app.innerHTML = `
    ${header('অধ্যায় এডিট করো')}
    <div class="card">
      <h2>অধ্যায় ${chNum}</h2>
      <label class="field-label">অধ্যায়ের নাম</label>
      <input type="text" id="chapName" value="${escapeHtml(existingName)}">
      <label class="field-label">গুরুত্বপূর্ণ টপিক/কনটেন্ট</label>
      <textarea id="chapContent" style="min-height:220px;" placeholder="এখানে গুরুত্বপূর্ণ টপিক, সংজ্ঞা, পয়েন্ট লিখো...">${escapeHtml(existingContent)}</textarea>
      <button class="btn btn-primary btn-block" onclick="saveTopicChapter('${subject}','${sectionKey}',${chNum})">✅ সেভ করো</button>
    </div>
    <div class="center"><a class="link-back" onclick="go('topicsManageChapters',{subject:'${subject}', sectionKey:'${sectionKey}'})">← ফিরে যাও</a></div>
    ${creditFooter()}
  `;
}
window.saveTopicChapter = async function(subject, sectionKey, chNum){
  const name = document.getElementById('chapName').value.trim() || `অধ্যায় ${chNum}`;
  const content = document.getElementById('chapContent').value;
  const key = `${subject}_${sectionKey}_${chNum}`;
  toast('সেভ হচ্ছে...');
  await saveTopicRemote(key, name, content);
  toast('সেভ হয়েছে ✅');
  go('topicsManageChapters', { subject, sectionKey });
}

// ---- Student: browse topics ----
function renderTopicsSubject(){
  const btns = Object.keys(TOPIC_STRUCTURE).map(subject=>{
    const subj = TOPIC_STRUCTURE[subject];
    const icon = subject==='physics' ? '⚛️' : (subject==='chemistry' ? '🧪' : (subject==='biology' ? '🌿' : (subject==='ict' ? '💻' : '📐')));
    return `<button class="btn btn-primary btn-block" style="margin-top:8px;" onclick="go('topicsSection',{subject:'${subject}'})">${icon} ${subj.label}</button>`;
  }).join('');
  app.innerHTML = `
    ${header('গুরুত্বপূর্ণ Topics')}
    <div class="card">
      <h2>কোন বিষয়ের topics দেখতে চাও?</h2>
      ${btns}
    </div>
    <div class="center"><a class="link-back" onclick="go('landing')">← মূল পাতায় ফিরে যাও</a></div>
    ${creditFooter()}
  `;
}
function renderTopicsSection(subject){
  const subj = TOPIC_STRUCTURE[subject];
  const btns = Object.keys(subj.sections).map(secKey=>{
    const sec = subj.sections[secKey];
    return `<button class="btn btn-outline btn-block" style="margin-top:8px;" onclick="go('topicsChapterList',{subject:'${subject}', sectionKey:'${secKey}'})">${sec.label}</button>`;
  }).join('');
  app.innerHTML = `
    ${header('গুরুত্বপূর্ণ Topics')}
    <div class="card">
      <h2>${subj.label}</h2>
      ${btns}
    </div>
    <div class="center"><a class="link-back" onclick="go('topicsSubject')">← ফিরে যাও</a></div>
    ${creditFooter()}
  `;
}
async function renderTopicsChapterList(subject, sectionKey){
  app.innerHTML = `${header('গুরুত্বপূর্ণ Topics')}<div class="card center">লোড হচ্ছে...</div>`;
  const sec = TOPIC_STRUCTURE[subject].sections[sectionKey];
  const allTopics = await getAllTopics();
  const map = {};
  allTopics.forEach(t=>{ map[t.key] = t; });
  window.__topicsChapterCtx = { subject, sectionKey, map };
  let rows = '';
  for(let i=1;i<=sec.count;i++){
    const key = `${subject}_${sectionKey}_${i}`;
    const existing = map[key];
    const name = existing && existing.name ? existing.name : `অধ্যায় ${i}`;
    const hasContent = existing && existing.content && existing.content.trim();
    rows += `<div class="exam-item">
      <div class="row-top">
        <h3 style="margin-bottom:0;">অধ্যায় ${i}: ${escapeHtml(name)}</h3>
      </div>
      ${hasContent
        ? `<button class="btn btn-outline btn-block" style="margin-top:8px;" onclick="viewTopicChapter(${i})">পড়ো</button>`
        : `<div class="meta">এখনো কনটেন্ট যোগ করা হয়নি</div>`}
    </div>`;
  }
  app.innerHTML = `
    ${header('গুরুত্বপূর্ণ Topics')}
    <div class="card">
      <h2>${TOPIC_STRUCTURE[subject].label} · ${sec.label}</h2>
      ${rows}
    </div>
    <div class="center"><a class="link-back" onclick="go('topicsSection',{subject:'${subject}'})">← ফিরে যাও</a></div>
    ${creditFooter()}
  `;
}
window.viewTopicChapter = function(chNum){
  const { subject, sectionKey, map } = window.__topicsChapterCtx;
  const key = `${subject}_${sectionKey}_${chNum}`;
  const existing = map[key];
  const name = existing && existing.name ? existing.name : `অধ্যায় ${chNum}`;
  go('topicsView', { subject, sectionKey, chNum, chapName: name, content: existing ? existing.content : '' });
}
function renderTopicsView(chapName, content, subject, sectionKey){
  app.innerHTML = `
    ${header('গুরুত্বপূর্ণ Topics')}
    <div class="card">
      <h2>${escapeHtml(chapName)}</h2>
      <div style="white-space:pre-wrap; font-size:15px; line-height:1.7;">${linkifyText(content)}</div>
    </div>
    <div class="center"><a class="link-back" onclick="go('topicsChapterList',{subject:'${subject}', sectionKey:'${sectionKey}'})">← অধ্যায় তালিকায় ফিরে যাও</a></div>
    ${creditFooter()}
  `;
}
