// ============================================================================
// coupon.js -- part of the পরীক্ষার খাতা frontend, split out of the original
// single inline <script> in index.html for readability. Loaded via plain
// <script src="js/coupon.js"> tags (in the order listed in index.html), which
// all share one global scope in the browser -- exactly like the original
// single script did, so nothing about how functions call each other changes.
// ============================================================================

// ================= TREAT COUPON SYSTEM =================
// Formula: n = max(0, round(percent) - 80); coupon = n*(n+1)/2 taka.
// Only awarded once per exam, on the FIRST attempt of a non-public (real, coded) exam,
// to prevent farming via the unlimited-retry practice mechanism.
async function awardCouponRemote(slug, examCode, percent){
  const res = await postToScript('awardCoupon', { slug, examCode, percent });
  return res;
}
// সার্ভার থেকে balance null/NaN এলে (JSON-এ NaN হয়ে যায় null) ইতিহাস থেকে হিসাব করে নেয়
function safeCouponBalance(data){
  if(data && data.balance !== null && data.balance !== undefined && isFinite(Number(data.balance))) return Number(data.balance);
  return ((data && data.history) || []).filter(h=> h.status !== 'settled').reduce((a,h)=> a + (Number(h.amount)||0), 0);
}
async function getCouponBalanceRemote(slug){
  try{
    const r = await fetch(`${SCRIPT_URL}?action=getCouponBalance&slug=${encodeURIComponent(slug)}`);
    const json = await r.json();
    if(json.status==='success'){ json.balance = safeCouponBalance(json); return json; }
  } catch(e){}
  return { balance: 0, history: [] };
}
async function listAllCouponBalancesRemote(){
  try{
    const r = await fetch(`${SCRIPT_URL}?action=listAllCouponBalances`);
    const json = await r.json();
    if(json.status==='success') return json.data;
  } catch(e){}
  return [];
}
async function settleCouponsRemote(slug){
  const res = await postToScript('settleCoupons', { slug });
  return res;
}

// ---- Student: check balance ----
function renderCouponEntry(){
  app.innerHTML = `
    ${header('আমার Treat Coupon')}
    <div class="card">
      <h2>তোমার নাম লেখো</h2>
      <p class="hint">প্রতিটা আসল পরীক্ষায় (practice না) ৮০%-এর বেশি নম্বর পেলে Treat Coupon পাবে — যত বেশি নম্বর, তত বেশি কুপন!</p>
      <input type="text" id="couponStudName" placeholder="নাম লেখো" onkeydown="if(event.key==='Enter') checkCouponBalance()">
      <button class="btn btn-primary btn-block" onclick="checkCouponBalance()">ব্যালেন্স দেখো</button>
      <div style="margin-top:14px;"><a class="link-back" onclick="go('landing')">← ফিরে যাও</a></div>
    </div>
    ${creditFooter()}
  `;
}
window.checkCouponBalance = async function(){
  const name = document.getElementById('couponStudName').value.trim();
  if(!name){ toast('নাম লেখো'); return; }
  const slug = slugify(name);
  toast('লোড হচ্ছে...');
  const data = await getCouponBalanceRemote(slug);
  go('couponBalance', couponState(name, slug, data)); // [NEW]
}
function renderCouponBalance(){
  const { name, slug, balance, history } = state;
  const pw = state.pendingWithdrawal || null;          // [NEW]
  const wds = (state.withdrawals || []);                // [NEW]
  const rows = (history||[]).sort((a,b)=> b.createdAt - a.createdAt).map(h=> {
    const statusLabel = h.status==='settled' ? 'পরিশোধিত ✓' : (h.status==='requested' ? 'Withdraw অনুরোধ — Pending ⏳' : 'জমা আছে');
    return `<div class="review-block">
      <div class="q-text" style="font-size:14px;">পরীক্ষা: ${escapeHtml(h.examCode)} · স্কোর: ${h.percent}%</div>
      <div class="review-ans ${h.status==='settled'?'right':'wrong'}">৳${h.amount} — ${statusLabel}</div>
    </div>`;
  }).join('');
  const wdRows = wds.map(w=> `
    <div class="review-block" style="display:flex; justify-content:space-between; gap:10px;">
      <div><b>${w.method==='nagad'?'Nagad':'bKash'}</b> <span class="meta">${escapeHtml(w.number)} · ${fmtBnDate(w.requestedAt)}</span></div>
      <div class="review-ans ${w.status==='paid'?'right':'wrong'}" style="margin:0;">৳${w.amount} — ${w.status==='paid' ? 'পাঠানো হয়েছে ✓' : 'Pending ⏳'}</div>
    </div>`).join('');
  // old "gift box" request-code flow (only shown if such an old request is still open)
  const oldRequest = (history||[]).find(h=> h.status==='requested' && String(h.requestCode||'').indexOf('TREAT-') === 0);
  app.innerHTML = `
    ${header('আমার Treat Coupon')}
    <div class="card center">
      <h2>${escapeHtml(name)}</h2>
      <div class="stamp">৳${balance}</div>
      <p class="hint" style="margin-top:10px;">এই টাকা জমা রাখতে পারো (পরে বেশি জমিয়ে তুলতে পারবে), অথবা এখনই Withdraw করতে পারো।</p>
      ${pw ? withdrawPendingHtml(pw) : (balance>0 ? `
        <div id="giftBoxArea">
          ${withdrawPanelHtml(balance)}
          <button class="btn btn-outline btn-block" style="margin-top:10px;" onclick="go('shopList', state)">🛍️ প্রোডাক্ট কিনো</button>
          <a class="link-back" style="display:block; margin-top:12px; font-size:12.5px;" onclick="openGiftBox()">🎁 অথবা পুরনো নিয়মে নাও — একটা কোড জেনারেট করে শিক্ষককে দেখাও (নম্বর দেওয়ার দরকার নেই)</a>
        </div>
      ` : '')}
      ${pw ? `<p class="hint" style="margin-top:10px;">Withdraw অনুরোধ Pending থাকা অবস্থায় শপ থেকে কেনা যাবে না।</p>` : ''}
      ${oldRequest ? `
        <div style="margin-top:14px; text-align:start; font-size:13.5px; line-height:1.7; background:#F5F9FE; border-radius:10px; padding:12px;">
          🎁 <b>আগের অনুরোধের কোড:</b> ${escapeHtml(oldRequest.requestCode)} — শিক্ষক এই কোড মিলিয়ে টাকা পাঠাবেন।
        </div>` : ''}
    </div>
    ${wdRows ? `<div class="card" style="text-align:start;"><h3>Withdraw ইতিহাস</h3>${wdRows}</div>` : ''}
    <div class="card" style="text-align:start;">
      <h3>ইতিহাস</h3>
      ${rows || `<div class="empty-state">এখনো কোনো কুপন অর্জন করোনি।</div>`}
    </div>
    <div class="center"><a class="link-back" onclick="go(getLoggedStudent()?'studentDashboard':'landing')">← ফিরে যাও</a></div>
    ${creditFooter()}
  `;
}
window.openGiftBox = async function(){
  const { slug } = state;
  toast('কোড তৈরি হচ্ছে...');
  const res = await postToScript('requestRedemption', { slug });
  if(res){
    const data = await getCouponBalanceRemote(slug);
    state.balance = data.balance;
    state.history = data.history;
    render();
  }
}

// ---- Teacher: view & settle (mark as manually paid via bKash/Nagad) ----
async function renderCouponManage(){
  app.innerHTML = `${header('Treat Coupon ম্যানেজ করো')}<div class="card center">লোড হচ্ছে...</div>`;
  const balances = await listAllCouponBalancesRemote();
  balances.sort((a,b)=> b.balance - a.balance);
  window.__couponBalancesCache = balances;
  let rows = balances.filter(b=> b.balance > 0).map(b=> `
    <div class="exam-item">
      <div class="row-top">
        <div>
          <h3 style="margin-bottom:2px;">${escapeHtml(b.name)}</h3>
          ${b.requestCode ? (String(b.requestCode).indexOf('wd_') === 0 ? `<div class="meta">💸 Withdraw অনুরোধ Pending — <a class="link-back" onclick="go('withdrawManage')">নম্বর দেখো ও পাঠাও</a></div>` : `<div class="meta">🎁 ব্যবহারের অনুরোধ — কোড: <b>${escapeHtml(b.requestCode)}</b> (bKash-এ এই কোড রেফারেন্সে খুঁজো)</div>`) : `<div class="meta">এখনো জমা আছে, ব্যবহারের অনুরোধ করেনি</div>`}
        </div>
        <div class="score-big score-pass">৳${b.balance}</div>
      </div>
      <button class="btn btn-primary btn-block" style="margin-top:8px;" onclick="settleCouponItem('${b.slug}')">✅ bKash/Nagad-এ পাঠিয়েছি, পরিশোধ করা হলো</button>
    </div>`).join('');
  if(rows === '') rows = `<div class="empty-state">এখন কোনো অপরিশোধিত কুপন নেই।</div>`;
  app.innerHTML = `
    ${header('Treat Coupon ম্যানেজ করো')}
    <div class="card">
      <h2>অপরিশোধিত ব্যালেন্স</h2>
      <p class="hint">নিয়ম: শুধু "🎁 Treat" হিসেবে চিহ্নিত পরীক্ষায় প্রথমবার ৮০%-এর বেশি পেলে কুপন পাবে — সূত্র: n = (নম্বর% − ৮০), কুপন = n×(n+1)/2 টাকা। ১০০% পেলে সর্বোচ্চ ৳210। যখন কেউ "ব্যবহার করবো" চাপবে, একটা কোড দেখাবে — bKash Request Money-তে সেই কোড রেফারেন্সে থাকবে, মিলিয়ে দেখে তুমি পাঠিয়ে "পরিশোধ করা হলো" চাপবে।</p>
      ${rows}
      <button class="btn btn-gold btn-block" style="margin-top:14px;" onclick="go('withdrawManage')">💸 Withdraw অনুরোধ (bKash / Nagad)</button>
      <button class="btn btn-outline btn-block" style="margin-top:10px;" onclick="go('shopManage')">🛍️ শপ প্রোডাক্ট ম্যানেজ করো</button>
      <button class="btn btn-outline btn-block" style="margin-top:10px;" onclick="go('writtenManage')">✍️ Written CQ ম্যানেজ করো (AI দিয়ে খাতা চেক)</button>
    </div>
    <div class="center"><a class="link-back" onclick="go('teacherDashboard')">← ফিরে যাও</a></div>
    ${creditFooter()}
  `;
}
window.settleCouponItem = async function(slug){
  if(!confirm('তুমি কি নিশ্চিত যে bKash/Nagad দিয়ে টাকাটা পাঠিয়ে দিয়েছো? এই ব্যালেন্স এখন শূন্য করে দেওয়া হবে।')) return;
  toast('আপডেট হচ্ছে...');
  await settleCouponsRemote(slug);
  toast('পরিশোধ হিসেবে মার্ক করা হয়েছে ✅');
  go('couponManage');
}
