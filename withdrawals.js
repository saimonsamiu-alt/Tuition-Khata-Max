// ============================================================================
// withdrawals.js -- part of the পরীক্ষার খাতা frontend, split out of the original
// single inline <script> in index.html for readability. Loaded via plain
// <script src="js/withdrawals.js"> tags (in the order listed in index.html), which
// all share one global scope in the browser -- exactly like the original
// single script did, so nothing about how functions call each other changes.
// ============================================================================

// ---------------- Withdraw (bKash / Nagad) — student ----------------
function normalizeBdPhone(raw){
  let n = String(raw||'').replace(/[০-৯]/g, d=> '০১২৩৪৫৬৭৮৯'.indexOf(d)).replace(/[^\d+]/g, '');
  return n.replace(/^\+?88/, '');
}
function withdrawPendingHtml(pw){
  const label = pw.method === 'nagad' ? 'Nagad' : 'bKash';
  const daysLeft = Math.max(0, Math.ceil((pw.dueAt - Date.now()) / 86400000));
  return `<div style="margin-top:14px; text-align:start; background:#FEF8EC; border:1.5px solid #F8DA9D; border-left:5px solid var(--gold); border-radius:10px; padding:12px 14px; line-height:1.7;">
    <div style="font-weight:700; color:#9B6A15; font-size:15px;">⏳ Withdraw অনুরোধ — Pending</div>
    <div>৳${pw.amount} → <b>${label}</b> <span style="font-family:var(--font-mono); font-weight:700;">${escapeHtml(pw.number)}</span></div>
    <div style="font-size:13px;">অনুরোধের তারিখ: ${fmtBnDate(pw.requestedAt)}</div>
    <div style="font-size:13.5px; margin-top:4px;"><b>১৪ দিনের মধ্যে</b> টাকা পাঠিয়ে দেওয়া হবে — সর্বোচ্চ <b>${fmtBnDate(pw.dueAt)}</b> পর্যন্ত (বাকি ${daysLeft} দিন)।</div>
    <div style="font-size:12px; color:var(--pencil); margin-top:4px;">শিক্ষক টাকা পাঠালে এটা "পরিশোধিত" হয়ে যাবে। শিক্ষককে ইতিমধ্যে জানানো হয়েছে।</div>
  </div>`;
}
function withdrawPanelHtml(balance){
  return `
    <button id="wdOpenBtn" class="btn btn-gold btn-block" style="font-size:18px; padding:18px;" onclick="wdToggle()">💸 Request Withdraw</button>
    <div id="wdPanel" style="display:none; text-align:start; margin-top:14px; border:1px solid var(--paper-edge); border-radius:12px; padding:14px; background:#FCFDFE;">
      <div class="field-label" style="margin-bottom:8px;">কোথায় টাকা নিতে চাও?</div>
      <div class="row">
        <button id="wdBtnBkash" class="btn btn-outline" onclick="wdPickMethod('bkash')">bKash</button>
        <button id="wdBtnNagad" class="btn btn-outline" onclick="wdPickMethod('nagad')">Nagad</button>
      </div>
      <div id="wdNumberBox" style="display:none; margin-top:14px;">
        <label class="field-label" id="wdNumLabel">নম্বর</label>
        <input type="tel" id="wdNumber" inputmode="numeric" maxlength="16" placeholder="01XXXXXXXXX" style="font-family:var(--font-mono); font-weight:700;">
        <p class="hint">পরিমাণ: <b>৳${balance}</b> (পুরো ব্যালেন্স)। নম্বরটা যে অ্যাকাউন্টে টাকা নেবে সেটার ব্যক্তিগত নম্বর হতে হবে।</p>
        <button id="wdSubmitBtn" class="btn btn-primary btn-block" onclick="wdSubmit()">✅ Request পাঠাও</button>
      </div>
      <div id="wdStatus" style="margin-top:10px;"></div>
    </div>`;
}
window.__wdMethod = null;
window.wdToggle = function(){
  const p = document.getElementById('wdPanel');
  if(p) p.style.display = (p.style.display === 'none') ? 'block' : 'none';
};
window.wdPickMethod = function(method){
  window.__wdMethod = method;
  const label = method === 'nagad' ? 'Nagad' : 'bKash';
  const colors = { bkash:'#E2136E', nagad:'#F6921E' };
  ['bkash','nagad'].forEach(m=>{
    const b = document.getElementById(m === 'bkash' ? 'wdBtnBkash' : 'wdBtnNagad');
    if(!b) return;
    const on = m === method;
    b.style.background = on ? colors[m] : 'transparent';
    b.style.color = on ? '#fff' : 'var(--ink)';
    b.style.borderColor = on ? colors[m] : 'var(--rule)';
  });
  document.getElementById('wdNumberBox').style.display = 'block';
  document.getElementById('wdNumLabel').textContent = `তোমার ${label} নম্বর`;
  const inp = document.getElementById('wdNumber'); if(inp) inp.focus();
};
window.wdSubmit = async function(){
  const { slug, name, balance } = state;
  const method = window.__wdMethod;
  if(!method){ toast('আগে bKash বা Nagad বাছো'); return; }
  const number = normalizeBdPhone((document.getElementById('wdNumber')||{}).value);
  if(!/^01[3-9]\d{8}$/.test(number)){ toast('সঠিক ১১ সংখ্যার মোবাইল নম্বর দাও (01XXXXXXXXX)'); return; }
  const label = method === 'nagad' ? 'Nagad' : 'bKash';
  if(!confirm(`৳${balance} — ${label} নম্বর ${number}-এ পাঠানোর অনুরোধ করবে? (১৪ দিনের মধ্যে পাঠানো হবে)`)) return;

  const btn = document.getElementById('wdSubmitBtn'), st = document.getElementById('wdStatus');
  if(btn) btn.disabled = true;
  if(st) st.innerHTML = `<div style="text-align:center; padding:10px;"><span style="font-size:22px; display:inline-block; animation:pulse 1s infinite;">⏳</span><div style="font-weight:700; margin-top:4px;">প্রসেসিং হচ্ছে...</div><div class="hint">একটু অপেক্ষা করো, পেজ বন্ধ কোরো না</div></div>`;

  const res = await postToScriptRaw('requestWithdrawal', { slug, studentName: name, method, number });
  if(res.status === 'success'){
    playSfx('victory');
    toast('✅ অনুরোধ জমা হয়েছে — Pending');
    const data = await getCouponBalanceRemote(slug);
    go('couponBalance', couponState(name, slug, data));
    return;
  }
  if(btn) btn.disabled = false;
  const msgs = {
    invalid_number: 'নম্বরটা সঠিক নয় — ১১ সংখ্যার (01XXXXXXXXX) নম্বর দাও',
    invalid_method: 'bKash বা Nagad বাছো',
    no_balance: 'তোমার ব্যালেন্স নেই',
    already_pending: 'তোমার একটা Withdraw অনুরোধ আগে থেকেই Pending আছে',
    network: 'ইন্টারনেট সমস্যা — আবার চেষ্টা করো',
  };
  if(st) st.innerHTML = `<div style="color:var(--red); font-weight:600;">❌ ${msgs[res.message] || 'অনুরোধ পাঠানো যায়নি, আবার চেষ্টা করো'}</div>`;
  if(res.message === 'already_pending'){
    const data = await getCouponBalanceRemote(slug);
    go('couponBalance', couponState(name, slug, data));
  }
};

// ---------------- Withdraw (bKash / Nagad) — teacher ----------------
async function getWithdrawRequestsRemote(){
  const r = await getJson('listWithdrawRequests', {});
  return (r && r.status === 'success') ? r.data.map(normalizeWithdrawal) : [];
}
async function renderWithdrawManage(){
  app.innerHTML = `${header('Withdraw অনুরোধ')}<div class="card center">লোড হচ্ছে...</div>`;
  const list = await getWithdrawRequestsRemote();
  const pending = list.filter(w=> w.status === 'pending').sort((a,b)=> a.dueAt - b.dueAt);
  const paid = list.filter(w=> w.status === 'paid').slice(0, 15);
  const total = pending.reduce((a,w)=> a + w.amount, 0);
  const now = Date.now();
  window.__wdList = pending;

  const pendingRows = pending.map((w,idx)=>{
    const late = w.dueAt < now;
    const days = Math.ceil(Math.abs(w.dueAt - now) / 86400000);
    const label = w.method === 'nagad' ? 'Nagad' : 'bKash';
    const color = w.method === 'nagad' ? '#F6921E' : '#E2136E';
    return `<div class="exam-item" style="border:1.5px solid ${late ? 'var(--red)' : '#F8DA9D'}; background:${late ? '#FFF6F5' : '#FFFBF3'};">
      <div class="row-top">
        <div>
          <h3 style="margin-bottom:2px;">${escapeHtml(w.studentName)}</h3>
          <div class="meta"><span style="background:${color}; color:#fff; border-radius:10px; padding:1px 9px; font-weight:700; font-size:11.5px;">${label}</span>
            <span style="font-family:var(--font-mono); font-weight:700; font-size:14.5px; color:var(--ink);">${escapeHtml(w.number)}</span>
            <a class="link-back" onclick="copyWdNumber(${idx})">📋 কপি</a></div>
        </div>
        <div class="score-big score-pass" style="font-size:19px;">৳${w.amount}</div>
      </div>
      <div class="meta" style="margin-top:6px;">অনুরোধ: ${fmtBnDate(w.requestedAt)} · শেষ তারিখ: <b>${fmtBnDate(w.dueAt)}</b> ·
        ${late ? `<b style="color:var(--red);">⚠️ ${days} দিন দেরি হয়েছে</b>` : `বাকি ${days} দিন`}</div>
      <button class="btn btn-primary btn-block" style="margin-top:10px;" onclick="markWdPaid('${w.id}', ${idx})">✅ টাকা পাঠিয়েছি (Paid)</button>
    </div>`;
  }).join('');
  const paidRows = paid.map(w=> `
    <div class="review-block" style="display:flex; justify-content:space-between; gap:10px;">
      <div><b>${escapeHtml(w.studentName)}</b> <span class="meta">· ${w.method==='nagad'?'Nagad':'bKash'} ${escapeHtml(w.number)}</span><br>
        <span class="meta">পাঠানো: ${fmtBnDate(w.paidAt || w.requestedAt)}</span></div>
      <div class="score-big score-pass">৳${w.amount} ✓</div>
    </div>`).join('');

  app.innerHTML = `
    ${header('Withdraw অনুরোধ')}
    <div class="card">
      <h2>💸 Pending অনুরোধ ${pending.length ? `<span class="q-tag">${pending.length}টি · মোট ৳${total}</span>` : ''}</h2>
      <p class="hint">স্টুডেন্ট bKash/Nagad নম্বর দিয়ে অনুরোধ করলে এখানে আসে (সাথে তোমার ইমেইলেও নোটিফিকেশন যায়)। অনুরোধের পর <b>১৪ দিনের মধ্যে</b> টাকা পাঠাতে হবে — সবচেয়ে আগে শেষ হবে যেটা সেটা উপরে দেখানো হয়। টাকা পাঠানোর পর "Paid" চাপো।</p>
      ${pendingRows || `<div class="empty-state">এখন কোনো Pending অনুরোধ নেই ✅</div>`}
    </div>
    ${paidRows ? `<div class="card"><h3>সর্বশেষ পরিশোধিত</h3>${paidRows}</div>` : ''}
    <div class="center"><a class="link-back" onclick="go('teacherDashboard')">← ফিরে যাও</a></div>
    ${creditFooter()}
  `;
}
window.copyWdNumber = function(idx){
  const w = (window.__wdList||[])[idx]; if(!w) return;
  navigator.clipboard.writeText(w.number).then(()=> toast('নম্বর কপি হয়েছে')).catch(()=> toast('কপি করা যায়নি'));
};
window.markWdPaid = async function(id, idx){
  const w = (window.__wdList||[])[idx];
  if(!confirm(`${w ? w.studentName + ' — ৳' + w.amount + ' ' + (w.method==='nagad'?'Nagad':'bKash') + ' ' + w.number + '-এ' : ''} টাকা পাঠিয়ে দিয়েছো? এটা "পরিশোধিত" হয়ে যাবে।`)) return;
  toast('আপডেট হচ্ছে...');
  const res = await postToScript('markWithdrawalPaid', { id });
  if(res){ toast('পরিশোধিত হিসেবে মার্ক হয়েছে ✅'); go('withdrawManage'); }
};
// ===================================================================================
