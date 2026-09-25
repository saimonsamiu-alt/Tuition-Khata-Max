// ============================================================================
// keyboardNav.js -- কিবোর্ড নেভিগেশন (PC & Mobile), নাইট মোড এবং বটম বার
// 100% Free, Secure, Client-side with Full Cross-device compatibility
// ============================================================================

// ----------------------------------------------------------------------------
// 1. Theme Management (Night / Dark Mode)
// ----------------------------------------------------------------------------
window.initAppTheme = function(){
  const saved = localStorage.getItem('tuition_theme');
  if(saved === 'dark' || (!saved && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)){
    document.body.classList.add('dark');
  } else {
    document.body.classList.remove('dark');
  }
  updateThemeToggleUi();
};

window.toggleDarkMode = function(){
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('tuition_theme', isDark ? 'dark' : 'light');
  playSfx('hit');
  toast(isDark ? '🌙 নাইট স্টাডি মোড অন' : '☀️ লাইট মোড অন');
  updateThemeToggleUi();
};

function updateThemeToggleUi(){
  const isDark = document.body.classList.contains('dark');
  const btns = document.querySelectorAll('.theme-toggle-btn');
  btns.forEach(b => {
    b.innerHTML = isDark ? '☀️ লাইট' : '🌙 ডার্ক';
  });
  const bottomThemeIcon = document.getElementById('bottomThemeIcon');
  if(bottomThemeIcon){
    bottomThemeIcon.innerHTML = isDark ? '☀️' : '🌙';
  }
}

// ----------------------------------------------------------------------------
// 2. Keyboard Hotkeys Listener (Exams & Global Shortcuts)
// ----------------------------------------------------------------------------
window.addEventListener('keydown', function(e){
  // Do not intercept if user is typing in form inputs or textareas
  const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
  const isEditing = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';

  // Modal / Escape key: Always closes modals/overlays
  if(e.key === 'Escape'){
    const aboutOv = document.getElementById('aboutOverlay');
    if(aboutOv){ aboutOv.remove(); return; }
    const shortcutOv = document.getElementById('shortcutOverlay');
    if(shortcutOv){ shortcutOv.remove(); return; }
    const iosOv = document.getElementById('iosInstallOverlay');
    if(iosOv){ iosOv.remove(); return; }
  }

  if(isEditing) return;

  // Help Modal shortcut
  if(e.key === '?' || (e.shiftKey && e.key === '/')){
    e.preventDefault();
    toggleShortcutCheatSheet();
    return;
  }

  // Alt + Shortcuts
  if(e.altKey){
    const k = e.key.toLowerCase();
    if(k === 'h'){
      e.preventDefault();
      go(getLoggedStudent() ? 'studentDashboard' : 'landing');
    } else if(k === 'e'){
      e.preventDefault();
      go('practiceList');
    } else if(k === 'c'){
      e.preventDefault();
      go('communityLounge');
    } else if(k === 'm'){
      e.preventDefault();
      go('mistakeNotebook');
    } else if(k === 't'){
      e.preventDefault();
      toggleDarkMode();
    }
    return;
  }

  // ================= EXAM SPECIFIC HOTKEYS =================
  if(state && state.screen === 'studentExam'){
    const isTotal = state.exam && state.exam.timerMode === 'total';
    const isPerQ = !isTotal;
    const k = e.key.toLowerCase();

    // Option mapping: 1/a/ক -> 0, 2/b/খ -> 1, 3/c/গ -> 2, 4/d/ঘ -> 3
    let optIdx = -1;
    if(k === '1' || k === 'a' || k === '১' || k === 'ক') optIdx = 0;
    else if(k === '2' || k === 'b' || k === '২' || k === 'খ') optIdx = 1;
    else if(k === '3' || k === 'c' || k === '৩' || k === 'গ') optIdx = 2;
    else if(k === '4' || k === 'd' || k === '৪' || k === 'ঘ') optIdx = 3;

    if(optIdx !== -1){
      e.preventDefault();
      if(isPerQ){
        // Per question mode
        const curQ = state.qIndex || 0;
        if(!state.locked[curQ]){
          window.setAnswerPerQ(optIdx);
          playSfx('slash');
          toast(`অপশন ${['ক','খ','গ','ঘ'][optIdx]} সিলেক্ট হয়েছে`);
        }
      } else {
        // Total mode - select on the nearest visible or focused question
        // or toggle on current hovered question
        const curQ = window.__lastFocusedQ !== undefined ? window.__lastFocusedQ : 0;
        if(!state.locked[curQ]){
          window.setAnswerTotal(curQ, optIdx);
          const radio = document.querySelector(`input[name="ans${curQ}"][value="${optIdx}"]`);
          if(radio) radio.checked = true;
          playSfx('slash');
        }
      }
      return;
    }

    // Per-question navigation (ArrowRight / ArrowLeft / Enter / Space)
    if(isPerQ){
      if(e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter'){
        e.preventDefault();
        const curQ = state.qIndex || 0;
        if(curQ < state.exam.questions.length - 1){
          window.nextQuestionPerQ();
        } else {
          submitExam(false);
        }
      } else if(e.key === 'ArrowLeft'){
        e.preventDefault();
        const curQ = state.qIndex || 0;
        if(curQ > 0){
          state.qIndex = curQ - 1;
          render();
        }
      }
    }
  }
});

// ----------------------------------------------------------------------------
// 3. Keyboard Shortcut Guide Modal
// ----------------------------------------------------------------------------
window.toggleShortcutCheatSheet = function(){
  let ov = document.getElementById('shortcutOverlay');
  if(ov){ ov.remove(); return; }
  ov = document.createElement('div');
  ov.id = 'shortcutOverlay';
  ov.className = 'about-overlay';
  ov.onclick = (e) => { if(e.target === ov) ov.remove(); };
  ov.innerHTML = `
    <div class="about-card" style="max-width:440px; text-align:left;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <h3 style="margin:0;">⌨️ কিবোর্ড শর্টকাট গাইড</h3>
        <button class="info-btn" onclick="document.getElementById('shortcutOverlay').remove()">✕</button>
      </div>
      <p class="hint" style="margin-bottom:14px;">মোবাইল বা কম্পিউটারের কিবোর্ড দিয়ে খুব দ্রুত পরীক্ষার খাতা ব্যবহার করতে নিচের কিগুলো চাপুন:</p>
      
      <div style="font-size:13px; line-height:1.8; margin-bottom:16px;">
        <div style="border-bottom:1px dashed var(--rule); padding-bottom:8px; margin-bottom:8px;">
          <b style="color:var(--ink);">📝 পরীক্ষার সময় অপশন বাছুন:</b><br>
          <kbd class="hotkey-kbd">1</kbd> বা <kbd class="hotkey-kbd">A</kbd> বা <kbd class="hotkey-kbd">ক</kbd> : প্রথম অপশন<br>
          <kbd class="hotkey-kbd">2</kbd> বা <kbd class="hotkey-kbd">B</kbd> বা <kbd class="hotkey-kbd">খ</kbd> : দ্বিতীয় অপশন<br>
          <kbd class="hotkey-kbd">3</kbd> বা <kbd class="hotkey-kbd">C</kbd> বা <kbd class="hotkey-kbd">গ</kbd> : তৃতীয় অপশন<br>
          <kbd class="hotkey-kbd">4</kbd> বা <kbd class="hotkey-kbd">D</kbd> বা <kbd class="hotkey-kbd">ঘ</kbd> : চতুর্থ অপশন<br>
          <kbd class="hotkey-kbd">Enter</kbd> বা <kbd class="hotkey-kbd">Space</kbd> : পরের প্রশ্নে যাও
        </div>

        <div>
          <b style="color:var(--ink);">⚡ অ্যাপ শর্টকাট:</b><br>
          <kbd class="hotkey-kbd">Alt</kbd> + <kbd class="hotkey-kbd">H</kbd> : হোম বা ড্যাশবোর্ড<br>
          <kbd class="hotkey-kbd">Alt</kbd> + <kbd class="hotkey-kbd">C</kbd> : স্টাডি আড্ডা (কমিউনিটি)<br>
          <kbd class="hotkey-kbd">Alt</kbd> + <kbd class="hotkey-kbd">M</kbd> : ভুল খাতা (রিভিশন)<br>
          <kbd class="hotkey-kbd">Alt</kbd> + <kbd class="hotkey-kbd">T</kbd> : ডার্ক / নাইট মোড<br>
          <kbd class="hotkey-kbd">?</kbd> : এই কিবোর্ড গাইড
        </div>
      </div>

      <button class="btn btn-gold btn-block" onclick="document.getElementById('shortcutOverlay').remove()">বুঝেছি 👍</button>
    </div>
  `;
  document.body.appendChild(ov);
};

// ----------------------------------------------------------------------------
// 4. One-Thumb Mobile Bottom Navigation Bar
// ----------------------------------------------------------------------------
window.updateBottomNav = function(){
  let nav = document.getElementById('appBottomNav');
  if(!nav){
    nav = document.createElement('nav');
    nav.id = 'appBottomNav';
    nav.className = 'bottom-nav';
    document.body.appendChild(nav);
  }

  // Hide bottom bar during active exam to avoid blocking questions/answers
  const s = state ? state.screen : '';
  if(s === 'studentExam'){
    nav.style.display = 'none';
    return;
  }
  nav.style.display = 'flex';

  const isDark = document.body.classList.contains('dark');
  const isHome = s === 'landing' || s === 'studentDashboard';
  const isExam = s === 'practiceList' || s === 'studentEntry' || s === 'pastExams';
  const isLounge = s === 'communityLounge';
  const isMistakes = s === 'mistakeNotebook';

  nav.innerHTML = `
    <button class="bottom-nav-item ${isHome ? 'active' : ''}" onclick="go(getLoggedStudent()?'studentDashboard':'landing')">
      <span class="nav-icon">🏠</span>
      <span>হোম</span>
    </button>
    <button class="bottom-nav-item ${isExam ? 'active' : ''}" onclick="go('practiceList')">
      <span class="nav-icon">📝</span>
      <span>পরীক্ষা</span>
    </button>
    <button class="bottom-nav-item ${isLounge ? 'active' : ''}" onclick="go('communityLounge')">
      <span class="nav-icon">💬</span>
      <span>আড্ডা</span>
    </button>
    <button class="bottom-nav-item ${isMistakes ? 'active' : ''}" onclick="go('mistakeNotebook')">
      <span class="nav-icon">📖</span>
      <span>ভুল খাতা</span>
    </button>
    <button class="bottom-nav-item" onclick="toggleDarkMode()">
      <span class="nav-icon" id="bottomThemeIcon">${isDark ? '☀️' : '🌙'}</span>
      <span class="theme-toggle-btn">${isDark ? 'লাইট' : 'ডার্ক'}</span>
    </button>
  `;
};

// ----------------------------------------------------------------------------
// 5. iOS / Android Smart Install Experience
// ----------------------------------------------------------------------------
window.showIosInstallGuide = function(){
  let ov = document.getElementById('iosInstallOverlay');
  if(ov){ ov.remove(); return; }
  ov = document.createElement('div');
  ov.id = 'iosInstallOverlay';
  ov.className = 'about-overlay';
  ov.onclick = (e) => { if(e.target === ov) ov.remove(); };
  ov.innerHTML = `
    <div class="about-card" style="text-align:center;">
      <div style="font-size:36px; margin-bottom:6px;">🍎</div>
      <h3 style="margin-bottom:6px;">iPhone / iPad-এ অ্যাপ হিসেবে ব্যবহার করুন</h3>
      <p class="hint">খুব সহজেই Safari থেকে কোনো ব্রাউজার বার ছাড়া ফুলস্ক্রিন অ্যাপ বানাতে নিচের ২টি ধাপ অনুসরণ করুন:</p>
      
      <div style="background:var(--paper); border:1px solid var(--paper-edge); border-radius:10px; padding:12px; text-align:left; font-size:13.5px; line-height:1.6; margin-bottom:16px;">
        <b>১.</b> Safari ব্রাউজারের নিচে থাকা <b>Share</b> বাটনে চাপুন (একটি তীরচিহ্নযুক্ত বক্স 📤)।<br>
        <b>২.</b> সামান্য নিচে স্ক্রোল করে <b>"Add to Home Screen"</b> (হোম স্ক্রিনে যোগ করুন) বেছে নিন।
      </div>

      <button class="btn btn-gold btn-block" onclick="document.getElementById('iosInstallOverlay').remove()">বুঝেছি 👍</button>
    </div>
  `;
  document.body.appendChild(ov);
};

// Initialize theme on load
document.addEventListener('DOMContentLoaded', () => {
  initAppTheme();
});
