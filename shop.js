// ============================================================================
// shop.js -- part of the পরীক্ষার খাতা frontend, split out of the original
// single inline <script> in index.html for readability. Loaded via plain
// <script src="js/shop.js"> tags (in the order listed in index.html), which
// all share one global scope in the browser -- exactly like the original
// single script did, so nothing about how functions call each other changes.
// ============================================================================

// ================= SHOP (spend Treat Coupon balance on products) =================
async function getShopProducts(){
  try{
    const r = await fetch(`${SCRIPT_URL}?action=listProducts`);
    const json = await r.json();
    if(json.status==='success') return json.data;
  } catch(e){}
  return [];
}
async function saveProductRemote(id, title, description, price, imageUrl){
  const res = await postToScript('saveProduct', { id: id||'', title, description, price, imageUrl });
  return res;
}
async function deleteProductRemote(id){
  try{ await fetch(`${SCRIPT_URL}?action=deleteProduct&id=${encodeURIComponent(id)}`); }catch(e){}
}
async function placeOrderRemote(slug, productId){
  const res = await postToScript('placeOrder', { slug, productId });
  return res;
}
async function getOrdersRemote(){
  try{
    const r = await fetch(`${SCRIPT_URL}?action=listOrders`);
    const json = await r.json();
    if(json.status==='success') return json.data;
  } catch(e){}
  return [];
}
async function updateOrderStatusRemote(id, status){
  const res = await postToScript('updateOrderStatus', { id, status });
  return res;
}

// ---- Teacher: manage shop products ----
async function renderShopManage(){
  app.innerHTML = `${header('শপ ম্যানেজ করো')}<div class="card center">লোড হচ্ছে...</div>`;
  const products = await getShopProducts();
  window.__shopProductsCache = products;
  let rows = products.map((p,idx)=> `
    <div class="exam-item">
      ${p.imageUrl ? `<img src="${escapeHtml(p.imageUrl)}" style="max-width:100%; border-radius:8px; margin-bottom:8px;" alt="${escapeHtml(p.title)}">`:''}
      <h3 style="margin-bottom:4px;">${escapeHtml(p.title)}</h3>
      <div class="meta">${escapeHtml(p.description||'')}</div>
      <div class="score-big score-pass" style="margin-top:6px;">৳${p.price}</div>
      <div class="row" style="margin-top:8px;">
        <button class="btn btn-outline" onclick="editShopProduct(${idx})">✏️ এডিট করো</button>
        <button class="btn btn-danger" onclick="deleteShopProductItem('${p.id}')">🗑️ মুছো</button>
      </div>
    </div>`).join('');
  if(products.length===0) rows = `<div class="empty-state">এখনো কোনো প্রোডাক্ট যোগ করোনি।</div>`;
  app.innerHTML = `
    ${header('শপ ম্যানেজ করো')}
    <div class="card">
      <h2>প্রোডাক্ট তালিকা</h2>
      <p class="hint">Student রা তাদের Treat Coupon ব্যালেন্স দিয়ে এই প্রোডাক্টগুলো "কিনতে" পারবে। অর্ডার এলে "🛍️ অর্ডার তালিকা" থেকে দেখে ডেলিভারি ব্যবস্থা করবে।</p>
      ${rows}
      <button class="btn btn-primary btn-block" style="margin-top:10px;" onclick="go('shopProductEdit',{productId:null})">+ নতুন প্রোডাক্ট যোগ করো</button>
      <button class="btn btn-outline btn-block" style="margin-top:10px;" onclick="go('shopOrders')">🛍️ অর্ডার তালিকা দেখো</button>
    </div>
    <div class="center"><a class="link-back" onclick="go('couponManage')">← ফিরে যাও</a></div>
    ${creditFooter()}
  `;
}
window.editShopProduct = function(idx){
  const p = window.__shopProductsCache[idx];
  go('shopProductEdit', { productId: p.id, existingTitle: p.title, existingDescription: p.description, existingPrice: p.price, existingImageUrl: p.imageUrl });
}
window.deleteShopProductItem = async function(id){
  if(!confirm('এই প্রোডাক্টটা মুছে ফেলতে চাও?')) return;
  await deleteProductRemote(id);
  toast('মুছে ফেলা হয়েছে');
  go('shopManage');
}
function renderShopProductEdit(productId, existingTitle, existingDescription, existingPrice, existingImageUrl){
  app.innerHTML = `
    ${header('প্রোডাক্ট')}
    <div class="card">
      <h2>${productId ? 'এডিট করো' : 'নতুন প্রোডাক্ট'}</h2>
      <label class="field-label">নাম</label>
      <input type="text" id="prodTitle" value="${escapeHtml(existingTitle||'')}" placeholder="যেমন: চকলেট কেক (৬ ইঞ্চি)">
      <label class="field-label">বিবরণ (ঐচ্ছিক)</label>
      <textarea id="prodDescription" style="min-height:80px;" placeholder="সংক্ষিপ্ত বিবরণ...">${escapeHtml(existingDescription||'')}</textarea>
      <label class="field-label">দাম (৳)</label>
      <input type="number" id="prodPrice" value="${existingPrice||''}" placeholder="যেমন: 150">
      <label class="field-label">ছবির লিংক</label>
      <input type="text" id="prodImageUrl" value="${escapeHtml(existingImageUrl||'')}" placeholder="https://...">
      <button class="btn btn-primary btn-block" onclick="saveShopProductItem('${productId||''}')">✅ সেভ করো</button>
    </div>
    <div class="center"><a class="link-back" onclick="go('shopManage')">← ফিরে যাও</a></div>
    ${creditFooter()}
  `;
}
window.saveShopProductItem = async function(productId){
  const title = document.getElementById('prodTitle').value.trim();
  const description = document.getElementById('prodDescription').value.trim();
  const price = parseInt(document.getElementById('prodPrice').value, 10);
  const imageUrl = document.getElementById('prodImageUrl').value.trim();
  if(!title || !price || price<=0){ toast('নাম ও সঠিক দাম দাও'); return; }
  toast('সেভ হচ্ছে...');
  await saveProductRemote(productId, title, description, price, imageUrl);
  toast('সেভ হয়েছে ✅');
  go('shopManage');
}

// ---- Teacher: view orders ----
async function renderShopOrders(){
  app.innerHTML = `${header('অর্ডার তালিকা')}<div class="card center">লোড হচ্ছে...</div>`;
  const orders = await getOrdersRemote();
  orders.sort((a,b)=> b.orderedAt - a.orderedAt);
  let rows = orders.map(o=> `
    <div class="exam-item">
      <div class="row-top">
        <div>
          <h3 style="margin-bottom:2px;">${escapeHtml(o.productTitle)}</h3>
          <div class="meta">স্টুডেন্ট: ${escapeHtml(o.slug)} · ৳${o.price} · ${new Date(o.orderedAt).toLocaleString('bn-BD')}</div>
        </div>
        <div class="q-tag">${o.status==='fulfilled' ? '✅ সম্পন্ন' : '⏳ বাকি'}</div>
      </div>
      ${o.status!=='fulfilled' ? `<button class="btn btn-primary btn-block" style="margin-top:8px;" onclick="markOrderFulfilled('${o.id}')">✅ ডেলিভারি সম্পন্ন হয়েছে</button>`:''}
    </div>`).join('');
  if(orders.length===0) rows = `<div class="empty-state">এখনো কোনো অর্ডার নেই।</div>`;
  app.innerHTML = `
    ${header('অর্ডার তালিকা')}
    <div class="card">${rows}</div>
    <div class="center"><a class="link-back" onclick="go('shopManage')">← ফিরে যাও</a></div>
    ${creditFooter()}
  `;
}
window.markOrderFulfilled = async function(id){
  toast('আপডেট হচ্ছে...');
  await updateOrderStatusRemote(id, 'fulfilled');
  toast('মার্ক করা হয়েছে ✅');
  go('shopOrders');
}

// ---- Student: browse & buy ----
async function renderShopList(){
  const { slug, name, balance } = state;
  app.innerHTML = `${header('শপ')}<div class="card center">লোড হচ্ছে...</div>`;
  const products = await getShopProducts();
  window.__shopProductsCache = products;
  let rows = products.map((p,idx)=> {
    const canAfford = balance >= p.price && !state.pendingWithdrawal; // [NEW]
    return `<div class="exam-item">
      ${p.imageUrl ? `<img src="${escapeHtml(p.imageUrl)}" style="max-width:100%; border-radius:8px; margin-bottom:8px;" alt="${escapeHtml(p.title)}">`:''}
      <h3 style="margin-bottom:4px;">${escapeHtml(p.title)}</h3>
      <div class="meta">${escapeHtml(p.description||'')}</div>
      <div class="score-big ${canAfford?'score-pass':'score-fail'}" style="margin-top:6px;">৳${p.price}</div>
      <button class="btn ${canAfford?'btn-primary':'btn-outline'} btn-block" style="margin-top:8px;" ${canAfford?'':'disabled'} onclick="buyProduct(${idx})">${canAfford ? '🛍️ কিনো' : (state.pendingWithdrawal ? 'Withdraw Pending — এখন কেনা যাবে না' : 'পর্যাপ্ত ব্যালেন্স নেই')}</button>
    </div>`;
  }).join('');
  if(products.length===0) rows = `<div class="empty-state">এখনো কোনো প্রোডাক্ট যোগ করা হয়নি।</div>`;
  app.innerHTML = `
    ${header('শপ')}
    <div class="card center">
      <h2>${escapeHtml(name)}</h2>
      <p class="hint">তোমার ব্যালেন্স: <b>৳${balance}</b></p>
    </div>
    <div class="card">${rows}</div>
    <div class="center"><a class="link-back" onclick="go('couponBalance', state)">← ফিরে যাও</a></div>
    ${creditFooter()}
  `;
}
window.buyProduct = async function(idx){
  const { slug, name } = state;
  const p = window.__shopProductsCache[idx];
  if(!confirm(`${p.title} — ৳${p.price} দিয়ে কিনতে চাও? তোমার ব্যালেন্স থেকে এই টাকা কেটে নেওয়া হবে।`)) return;
  toast('অর্ডার করা হচ্ছে...');
  const res = await postToScriptRaw('placeOrder', { slug, productId: p.id }); // [NEW] raw, so we can show the real reason
  if(res && res.status === 'success'){
    toast('অর্ডার সফল হয়েছে ✅');
    const data = await getCouponBalanceRemote(slug);
    go('shopList', couponState(name, slug, data));
    alert('অর্ডার সফল হয়েছে! তোমার শিক্ষক শীঘ্রই এটা পৌঁছে দেবেন।');
  } else {
    toast(res && res.message === 'withdraw_pending' ? 'Withdraw অনুরোধ Pending থাকায় এখন কেনা যাবে না' : 'ব্যর্থ হয়েছে — ব্যালেন্স যথেষ্ট নেই হয়তো');
  }
}
