// ============================================================================
// faq.js -- part of the পরীক্ষার খাতা frontend, split out of the original
// single inline <script> in index.html for readability. Loaded via plain
// <script src="js/faq.js"> tags (in the order listed in index.html), which
// all share one global scope in the browser -- exactly like the original
// single script did, so nothing about how functions call each other changes.
// ============================================================================

// ================= FAQ / সাধারণ জিজ্ঞাসা =================
const DEFAULT_FAQ = [
  {
    id: 'default_uni_list',
    question: 'বাংলাদেশের বিশ্ববিদ্যালয়সমূহ: সরকারি, বেসরকারি ও আন্তর্জাতিক তালিকা (বিশ্ববিদ্যালয় মঞ্জুরি কমিশন অনুযায়ী)',
    answer: `বিশ্ববিদ্যালয় মঞ্জুরি কমিশনের তালিকা অনুযায়ী বাংলাদেশের বিশ্ববিদ্যালয়গুলো ৩ ভাগে বিভক্ত:

🏛️ সরকারি বিশ্ববিদ্যালয়: ৫৯টি
সম্পূর্ণ তালিকা দেখতে ক্লিক করুন: http://www.ugc-universities.gov.bd/public-universities

🏢 বেসরকারি বিশ্ববিদ্যালয়: ১১৬টি
সম্পূর্ণ তালিকা দেখতে ক্লিক করুন: http://www.ugc-universities.gov.bd/private-universities

🌍 আন্তর্জাতিক বিশ্ববিদ্যালয়: ৩টি
সম্পূর্ণ তালিকা দেখতে ক্লিক করুন: http://www.ugc-universities.gov.bd/international-universities

সূত্র: বিশ্ববিদ্যালয় মঞ্জুরি কমিশনের অফিসিয়াল ওয়েবসাইট`
  },
  {
    id: 'default_iut_status',
    question: 'IUT কি একটি প্রাইভেট বিশ্ববিদ্যালয়?',
    answer: `না। IUT (Islamic University of Technology) প্রাইভেট বিশ্ববিদ্যালয় নয় — বিশ্ববিদ্যালয় মঞ্জুরি কমিশনের তালিকায় একে "Public" বা "Private" কোনোটাতেই না রেখে আলাদা "International Universities" ক্যাটাগরিতে রাখা হয়েছে (এই ক্যাটাগরিতে মোট ৩টি বিশ্ববিদ্যালয় আছে, তালিকা উপরের প্রশ্নে আছে)।

সহজ কথায়: IUT একটি International Public University — এটা ৫৭টি দেশের যৌথ অর্থায়নে পরিচালিত হয় এবং বাংলাদেশ সরকার ও বিশ্ববিদ্যালয় মঞ্জুরি কমিশন এটাকে স্বীকৃতি দিয়েছে।

সূত্র: বিশ্ববিদ্যালয় মঞ্জুরি কমিশনের ওয়েবসাইট — http://www.ugc-universities.gov.bd/university-detail/8

📊 প্রকৌশল বিশ্ববিদ্যালয়সমূহের মধ্যে র‍্যাংক (শুধু প্রকৌশল বিশ্ববিদ্যালয়গুলো মিলিয়ে, এবং সাথে গ্লোবাল ব্র্যাকেট):

BUET — প্রকৌশল বিশ্ববিদ্যালয়ের মধ্যে ১ম, গ্লোবাল র‍্যাংক ৭৬১–৭৭০
CUET — প্রকৌশল বিশ্ববিদ্যালয়ের মধ্যে ২য়, গ্লোবাল র‍্যাংক ১৪০১+
IUT — প্রকৌশল বিশ্ববিদ্যালয়ের মধ্যে ৩য়, গ্লোবাল র‍্যাংক ১২০১–১৪০০
KUET — প্রকৌশল বিশ্ববিদ্যালয়ের মধ্যে ৪র্থ, গ্লোবাল র‍্যাংক ১৪০১+

(এই র‍্যাংকটা সব বিশ্ববিদ্যালয় মিলিয়ে না, শুধু প্রকৌশল বিশ্ববিদ্যালয়গুলোর মধ্যে আপেক্ষিক অবস্থান। RUET ও DUET এই বছরের QS তালিকায় আসেনি)

সূত্র: QS World Ranking`
  }
];
async function getAllFAQ(){
  try{
    const r = await fetch(`${SCRIPT_URL}?action=listFAQ`);
    const json = await r.json();
    if(json.status==='success') return json.data;
  } catch(e){}
  return [];
}
async function getAllFAQCombined(){
  const sheetItems = await getAllFAQ();
  return [...DEFAULT_FAQ, ...sheetItems];
}
async function saveFAQRemote(id, question, answer){
  const res = await postToScript('saveFAQ', { id: id||'', question, answer });
  return res;
}
async function deleteFAQRemote(id){
  try{ await fetch(`${SCRIPT_URL}?action=deleteFAQ&id=${encodeURIComponent(id)}`); }catch(e){}
}

// ---- Teacher: manage FAQ ----
async function renderFAQManage(){
  app.innerHTML = `${header('প্রশ্নোত্তর ম্যানেজ করো')}<div class="card center">লোড হচ্ছে...</div>`;
  const items = await getAllFAQ();
  window.__faqItems = items;
  const defaultRows = DEFAULT_FAQ.map(it=> `
    <div class="exam-item">
      <h3 style="margin-bottom:6px;">${escapeHtml(it.question)} <span class="q-tag">বিল্ট-ইন</span></h3>
      <div class="meta">এটা অ্যাপের সাথেই যুক্ত করা আছে, এডিট/মুছা যাবে না।</div>
    </div>`).join('');
  let rows = items.map((it,idx)=> `
    <div class="exam-item">
      <h3 style="margin-bottom:6px;">${escapeHtml(it.question)}</h3>
      <div class="row">
        <button class="btn btn-outline" onclick="go('faqEdit',{id:'${it.id}'})">✏️ এডিট করো</button>
        <button class="btn btn-danger" onclick="deleteFAQItem('${it.id}')">🗑️ মুছো</button>
      </div>
    </div>`).join('');
  if(items.length===0) rows = `<div class="empty-state">এখনো তুমি নিজে কোনো প্রশ্নোত্তর যোগ করোনি।</div>`;
  app.innerHTML = `
    ${header('প্রশ্নোত্তর ম্যানেজ করো')}
    <div class="card">
      <h2>সব প্রশ্নোত্তর</h2>
      <p class="hint">সাধারণ জ্ঞান, ভর্তি সংক্রান্ত তথ্য, বা যেকোনো গুরুত্বপূর্ণ প্রশ্ন-উত্তর এখানে যোগ করো — স্টুডেন্টরা মূল পাতা থেকে "❓ সাধারণ জিজ্ঞাসা"-তে গিয়ে দেখতে পারবে।</p>
      ${defaultRows}
      ${rows}
      <button class="btn btn-primary btn-block" style="margin-top:10px;" onclick="go('faqEdit',{id:null})">+ নতুন প্রশ্নোত্তর যোগ করো</button>
    </div>
    <div class="center"><a class="link-back" onclick="go('teacherDashboard')">← ফিরে যাও</a></div>
    ${creditFooter()}
  `;
}
window.deleteFAQItem = async function(id){
  if(!confirm('এই প্রশ্নোত্তরটা মুছে ফেলতে চাও?')) return;
  await deleteFAQRemote(id);
  toast('মুছে ফেলা হয়েছে');
  go('faqManage');
}
async function renderFAQEdit(id){
  let question = '', answer = '';
  if(id){
    const items = window.__faqItems && window.__faqItems.length ? window.__faqItems : await getAllFAQ();
    const it = items.find(x=> x.id === id);
    if(it){ question = it.question; answer = it.answer; }
  }
  app.innerHTML = `
    ${header('প্রশ্নোত্তর')}
    <div class="card">
      <h2>${id ? 'এডিট করো' : 'নতুন প্রশ্নোত্তর'}</h2>
      <label class="field-label">প্রশ্ন</label>
      <input type="text" id="faqQ" value="${escapeHtml(question)}" placeholder="যেমন: IUT কি প্রাইভেট বিশ্ববিদ্যালয়?">
      <label class="field-label">উত্তর (রেফারেন্সসহ লিখতে পারো)</label>
      <textarea id="faqA" style="min-height:260px;" placeholder="বিস্তারিত উত্তর লেখো...">${escapeHtml(answer)}</textarea>
      <button class="btn btn-primary btn-block" onclick="saveFAQItem('${id||''}')">✅ সেভ করো</button>
    </div>
    <div class="center"><a class="link-back" onclick="go('faqManage')">← ফিরে যাও</a></div>
    ${creditFooter()}
  `;
}
window.saveFAQItem = async function(id){
  const question = document.getElementById('faqQ').value.trim();
  const answer = document.getElementById('faqA').value.trim();
  if(!question || !answer){ toast('প্রশ্ন ও উত্তর দুটোই লেখো'); return; }
  toast('সেভ হচ্ছে...');
  await saveFAQRemote(id, question, answer);
  toast('সেভ হয়েছে ✅');
  go('faqManage');
}

// ---- Student: browse FAQ ----
async function renderFAQList(){
  app.innerHTML = `${header('সাধারণ জিজ্ঞাসা')}<div class="card center">লোড হচ্ছে...</div>`;
  const items = await getAllFAQCombined();
  window.__faqItemsStudent = items;
  let rows = items.map(it=> `
    <div class="exam-item">
      <h3 style="margin-bottom:8px;">${escapeHtml(it.question)}</h3>
      <button class="btn btn-outline btn-block" onclick="go('faqView',{id:'${it.id}'})">উত্তর দেখো</button>
    </div>`).join('');
  if(items.length===0) rows = `<div class="empty-state">এখনো কোনো প্রশ্নোত্তর যোগ করা হয়নি।</div>`;
  app.innerHTML = `
    ${header('সাধারণ জিজ্ঞাসা')}
    <div class="card">
      <h2>প্রশ্নোত্তর তালিকা</h2>
      ${rows}
    </div>
    <div class="center"><a class="link-back" onclick="go('landing')">← মূল পাতায় ফিরে যাও</a></div>
    ${creditFooter()}
  `;
}
async function renderFAQView(id){
  const items = window.__faqItemsStudent && window.__faqItemsStudent.length ? window.__faqItemsStudent : await getAllFAQCombined();
  const it = items.find(x=> x.id === id);
  if(!it){ app.innerHTML = `${header()}<div class="card center">পাওয়া যায়নি।</div>`; return; }
  app.innerHTML = `
    ${header('সাধারণ জিজ্ঞাসা')}
    <div class="card">
      <h2>${escapeHtml(it.question)}</h2>
      <div style="white-space:pre-wrap; font-size:15px; line-height:1.7;">${linkifyText(it.answer)}</div>
    </div>
    <div class="center"><a class="link-back" onclick="go('faqList')">← তালিকায় ফিরে যাও</a></div>
    ${creditFooter()}
  `;
}
