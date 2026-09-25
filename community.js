// ============================================================================
// community.js -- পরীক্ষার খাতা স্টাডি আড্ডা (Mini Educational Instagram & Social Media)
// Real-time Cloud Firestore sync + 24h Stories + Double-tap Likes + Saved Notes
// ============================================================================

const COMMUNITY_STORAGE_KEY = 'tuition_community_posts_v1';
const STORIES_STORAGE_KEY = 'tuition_study_stories_v1';
const SAVED_POSTS_KEY = 'tuition_saved_posts_v1';
let communityCooldown = 0;
let currentCommunityViewMode = 'feed'; // 'feed' | 'chats' | 'grid' | 'saved' | 'streaks'

// Pre-built aesthetic study snapshots (SVG Data URIs)
const STUDY_TEMPLATES = {
  physics: 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340"><rect width="600" height="340" fill="#0F172A"/><circle cx="300" cy="170" r="105" fill="none" stroke="#D9A441" stroke-width="2.5" stroke-dasharray="6,6"/><circle cx="300" cy="170" r="34" fill="#BF3A2C"/><circle cx="405" cy="170" r="15" fill="#38BDF8"/><line x1="300" y1="170" x2="405" y2="170" stroke="#38BDF8" stroke-width="2.5"/><text x="32" y="48" fill="#F8FAFC" font-family="sans-serif" font-size="20" font-weight="bold">⚡ মহাকর্ষ ও গতিবিদ্যা স্পেশাল ক্লাস নোটস</text><text x="32" y="80" fill="#94A3B8" font-family="sans-serif" font-size="14">F = G (m₁·m₂)/r²  |  g = GM/R²  |  v = u + at  |  s = ut + ½at²</text><rect x="32" y="270" width="160" height="36" rx="18" fill="rgba(217,164,65,0.2)" stroke="#D9A441"/><text x="48" y="293" fill="#FCD34D" font-family="sans-serif" font-size="13" font-weight="bold">#PhysicsMastery</text></svg>`),
  chemistry: 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340"><rect width="600" height="340" fill="#064E3B"/><polygon points="300,90 365,128 365,202 300,240 235,202 235,128" fill="none" stroke="#34D399" stroke-width="3.5"/><circle cx="300" cy="165" r="42" fill="none" stroke="#FCD34D" stroke-width="2.5"/><text x="32" y="48" fill="#ECFDF5" font-family="sans-serif" font-size="20" font-weight="bold">🧪 পর্যায়বৃত্ত ধর্ম ও জৈব রসায়ন বিক্রিয়া চার্ট</text><text x="32" y="80" fill="#A7F3D0" font-family="sans-serif" font-size="14">আয়নীকরণ শক্তি: পর্যায় বাম → ডানে বাড়ে, গ্রুপ নিচে নামলে কমে</text><rect x="32" y="270" width="160" height="36" rx="18" fill="rgba(52,211,153,0.2)" stroke="#34D399"/><text x="50" y="293" fill="#A7F3D0" font-family="sans-serif" font-size="13" font-weight="bold">#ChemistryRevise</text></svg>`),
  math: 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340"><rect width="600" height="340" fill="#18181B"/><path d="M 50 240 Q 200 40 350 190 T 550 110" fill="none" stroke="#F59E0B" stroke-width="4"/><line x1="50" y1="270" x2="550" y2="270" stroke="#52525B" stroke-width="1.5"/><line x1="80" y1="50" x2="80" y2="290" stroke="#52525B" stroke-width="1.5"/><text x="32" y="46" fill="#FAFAFA" font-family="sans-serif" font-size="20" font-weight="bold">📐 ক্যালকুলাস ও ইন্টিগ্রেশন রিভিশন শিট</text><text x="32" y="78" fill="#A1A1AA" font-family="sans-serif" font-size="14">d/dx(sin x) = cos x  |  ∫ eˣ dx = eˣ + C  |  dy/dx = tan θ</text><rect x="32" y="270" width="160" height="36" rx="18" fill="rgba(245,158,11,0.2)" stroke="#F59E0B"/><text x="52" y="293" fill="#FCD34D" font-family="sans-serif" font-size="13" font-weight="bold">#MathMastery</text></svg>`),
  studydesk: 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340"><rect width="600" height="340" fill="#312E81"/><circle cx="300" cy="165" r="76" fill="#4338CA" stroke="#818CF8" stroke-width="3"/><text x="300" y="160" fill="#FFFFFF" font-family="sans-serif" font-size="34" font-weight="bold" text-anchor="middle">25:00</text><text x="300" y="190" fill="#C7D2FE" font-family="sans-serif" font-size="13" text-anchor="middle">POMODORO FOCUS</text><text x="32" y="48" fill="#EEF2FF" font-family="sans-serif" font-size="20" font-weight="bold">🎯 ডেইলি স্টাডি গোল ও পমোডোরো ট্র্যাকার</text><text x="32" y="80" fill="#C7D2FE" font-family="sans-serif" font-size="14">আজকের টার্গেট: ৩টি অধ্যায় রিভিশন + ৫০টি বহুনির্বাচনী প্র্যাকটিস</text><rect x="32" y="270" width="160" height="36" rx="18" fill="rgba(129,140,248,0.25)" stroke="#818CF8"/><text x="50" y="293" fill="#E0E7FF" font-family="sans-serif" font-size="13" font-weight="bold">#DailyStreak7</text></svg>`)
};

// Initial default 24-hr stories (Instagram Stories Carousel)
const DEFAULT_STUDY_STORIES = [
  {
    id: 'story_teacher_1',
    authorName: 'সৈকত স্যার',
    authorRole: 'শিক্ষক',
    isTeacher: true,
    avatar: '👨‍🏫',
    title: 'ভেক্টর ও গতিবিদ্যা এক্সাম ফর্মুলা শিট আপলোড সম্পন্ন! 📚',
    timeAgo: '২ ঘণ্টা আগে',
    bgGradient: 'linear-gradient(135deg, #1E293B, #0F172A)',
    accentColor: '#D9A441',
    createdAt: Date.now() - 3600000 * 2,
    reactionsCount: 14
  },
  {
    id: 'story_stud_1',
    authorName: 'তানজিলা পারভীন',
    authorRole: 'প্রাইভেট শিক্ষার্থী',
    isTeacher: false,
    avatar: '👩‍🎓',
    title: 'আজকে ১০০টি রসায়ন MCQ রিভিশন ডান! 🔥',
    timeAgo: '৪ ঘণ্টা আগে',
    bgGradient: 'linear-gradient(135deg, #064E3B, #022C22)',
    accentColor: '#34D399',
    createdAt: Date.now() - 3600000 * 4,
    reactionsCount: 9
  },
  {
    id: 'story_stud_2',
    authorName: 'আরিয়ান রহমান',
    authorRole: 'প্রাইভেট শিক্ষার্থী',
    isTeacher: false,
    avatar: '🧑‍🎓',
    title: 'ক্যালকুলাস ডিফারেন্সিয়েশন ও ইন্টিগ্রেশন রিভিশন শেষ 📐',
    timeAgo: '৫ ঘণ্টা আগে',
    bgGradient: 'linear-gradient(135deg, #312E81, #1E1B4B)',
    accentColor: '#818CF8',
    createdAt: Date.now() - 3600000 * 5,
    reactionsCount: 12
  },
  {
    id: 'story_stud_3',
    authorName: 'সামিয়া ইসলাম',
    authorRole: 'প্রাইভেট শিক্ষার্থী',
    isTeacher: false,
    avatar: '⭐',
    title: 'টানা ৭ দিনের স্টাডি স্ট্রিক অর্জন! 🎯',
    timeAgo: '৭ ঘণ্টা আগে',
    bgGradient: 'linear-gradient(135deg, #7C2D12, #451A03)',
    accentColor: '#FB923C',
    createdAt: Date.now() - 3600000 * 7,
    reactionsCount: 18
  }
];

// Initial starter posts with photos/media for Instagram aesthetic feed
const DEFAULT_COMMUNITY_POSTS = [
  {
    id: 'post_starter_1',
    authorName: 'সৈকত স্যার',
    authorRole: 'শিক্ষক',
    isTeacher: true,
    isPrivateStudent: false,
    tag: '📢 নোটিশ',
    content: 'সকল শিক্ষার্থীদের অবগতির জন্য: আগামী শুক্রবার রাত ৮টায় পদার্থবিজ্ঞান ২য় পত্রের গতিবিদ্যা ও মহাকর্ষ অধ্যায়ের স্পেশাল MCQ ও Written এক্সাম অনুষ্ঠিত হবে। নিচে দেওয়া ফর্মুলা চার্টটি রিভিশন দিয়ে প্রস্তুত থেকো! #Physics #HSC2026',
    mediaUrl: STUDY_TEMPLATES.physics,
    timestamp: Date.now() - 3600000 * 5,
    reactions: { fire: 18, idea: 9, clap: 14, heart: 24 },
    userReactions: {},
    comments: [
      { id: 'c_1', authorName: 'তানভীর আহমেদ', isTeacher: false, isPrivateStudent: true, text: 'স্যার, মহাকর্ষের সূত্রের প্রমাণ কি পরীক্ষায় থাকবে?', timestamp: Date.now() - 3600000 * 3 },
      { id: 'c_2', authorName: 'সৈকত স্যার', isTeacher: true, isPrivateStudent: false, text: 'হ্যাঁ, বিশেষ করে জি-এর মান পরিবর্তনের সমীকরণগুলো দেখে রাখবে।', timestamp: Date.now() - 3600000 * 2, isBestAnswer: true }
    ]
  },
  {
    id: 'post_starter_2',
    authorName: 'আরিয়ান রহমান',
    authorRole: 'প্রাইভেট শিক্ষার্থী',
    isTeacher: false,
    isPrivateStudent: true,
    tag: '💡 ডাউট ও প্রশ্ন',
    content: 'রসায়ন ১ম পত্রের পর্যায়বৃত্ত ধর্ম অধ্যায়ে "আয়নীকরণ শক্তি" পর্যায় ও গ্রুপ ভিত্তিক কীভাবে পরিবর্তিত হয়? কেউ সহজে শর্টকাট মনে রাখার উপায় বলতে পারবে? #ChemistryDoubt',
    mediaUrl: STUDY_TEMPLATES.chemistry,
    timestamp: Date.now() - 3600000 * 12,
    reactions: { fire: 12, idea: 22, clap: 8, heart: 16 },
    userReactions: {},
    comments: [
      { id: 'c_3', authorName: 'ফারিয়া খানম', isTeacher: false, isPrivateStudent: true, text: 'পর্যায়ে বাম থেকে ডানে গেলে নিউক্লিয়ার চার্জ বাড়ে তাই আয়নীকরণ শক্তি বাড়ে। আর গ্রুপে নিচে নামলে নতুন শক্তিস্তর যুক্ত হওয়ায় দূরত্ব বাড়ে, ফলে আয়নীকরণ শক্তি কমে।', timestamp: Date.now() - 3600000 * 10, isBestAnswer: true }
    ]
  },
  {
    id: 'post_starter_3',
    authorName: 'তানজিলা পারভীন',
    authorRole: 'প্রাইভেট শিক্ষার্থী',
    isTeacher: false,
    isPrivateStudent: true,
    tag: '📸 স্টাডি স্ন্যাপ',
    content: 'আজকের ক্যালকুলাস ইন্টিগ্রেশন ও ডিফারেন্সিয়েশন সূত্রাবলী প্রস্তুত করলাম! সূত্রগুলো রিভিশনে থাকলে বড় বড় অঙ্ক নিমেষেই মিলে যায়। কার কার এই অধ্যায়ে সমস্যা আছে? #MathNotes #StudyGram',
    mediaUrl: STUDY_TEMPLATES.math,
    timestamp: Date.now() - 3600000 * 16,
    reactions: { fire: 25, idea: 14, clap: 19, heart: 32 },
    userReactions: {},
    comments: [
      { id: 'c_4', authorName: 'রাকিবুল হাসান', isTeacher: false, isPrivateStudent: true, text: 'অসাধারণ নোটস আপু! আমি বুকমার্কে সেভ করে নিলাম।', timestamp: Date.now() - 3600000 * 14 }
    ]
  },
  {
    id: 'post_starter_4',
    authorName: 'নুসরাত জাহান',
    authorRole: 'সাধারণ শিক্ষার্থী',
    isTeacher: false,
    isPrivateStudent: false,
    tag: '📚 স্টাডি টিপস',
    content: '🎯 পমোডোরো টেকনিক ট্রাই করে দেখতে পারো সবাই! ২৫ মিনিট পড়ার পর ৫ মিনিট ব্রেক নিয়ে আবার ২৫ মিনিট পড়া। এতে টানা ৩-৪ ঘণ্টা পড়লেও ব্রেন ক্লান্ত হয় না। আমি আজ ৩টি চ্যাপ্টার শেষ করেছি! #Pomodoro #DailyGoal',
    mediaUrl: STUDY_TEMPLATES.studydesk,
    timestamp: Date.now() - 3600000 * 20,
    reactions: { fire: 22, idea: 16, clap: 21, heart: 28 },
    userReactions: {},
    comments: []
  }
];

function getAuthorBadge(item){
  if(!item) return '';
  if(item.isTeacher){
    return '<span class="badge-teacher" title="কোর্সের শিক্ষক">👨‍🏫 শিক্ষক ✓</span>';
  }
  if(item.isPrivateStudent){
    return '<span class="badge-private-stud" title="রেজিস্ট্রেশন কোড দ্বারা ভেরিফাইড প্রাইভেট ব্যাচের শিক্ষার্থী">⭐ প্রাইভেট শিক্ষার্থী ✓</span>';
  }
  return '<span class="badge-public-stud" title="উন্মুক্ত সাধারণ শিক্ষার্থী">🧑‍🎓 সাধারণ শিক্ষার্থী</span>';
}

function getCommunityPosts(){
  try{
    const raw = localStorage.getItem(COMMUNITY_STORAGE_KEY);
    if(!raw){
      localStorage.setItem(COMMUNITY_STORAGE_KEY, JSON.stringify(DEFAULT_COMMUNITY_POSTS));
      return DEFAULT_COMMUNITY_POSTS;
    }
    const posts = JSON.parse(raw);
    return Array.isArray(posts) ? posts : DEFAULT_COMMUNITY_POSTS;
  }catch(e){
    return DEFAULT_COMMUNITY_POSTS;
  }
}

function saveCommunityPosts(posts){
  try{
    localStorage.setItem(COMMUNITY_STORAGE_KEY, JSON.stringify(posts));
  }catch(e){
    console.warn('Storage error:', e);
  }
}

function getStudyStories(){
  try{
    const raw = localStorage.getItem(STORIES_STORAGE_KEY);
    if(!raw){
      localStorage.setItem(STORIES_STORAGE_KEY, JSON.stringify(DEFAULT_STUDY_STORIES));
      return DEFAULT_STUDY_STORIES;
    }
    const stories = JSON.parse(raw);
    return Array.isArray(stories) ? stories : DEFAULT_STUDY_STORIES;
  }catch(e){
    return DEFAULT_STUDY_STORIES;
  }
}

function saveStudyStories(stories){
  try{
    localStorage.setItem(STORIES_STORAGE_KEY, JSON.stringify(stories));
  }catch(e){
    console.warn('Stories storage error:', e);
  }
}

function getSavedPostIds(){
  try{
    const raw = localStorage.getItem(SAVED_POSTS_KEY);
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  }catch(e){
    return [];
  }
}

function isPostSaved(postId){
  return getSavedPostIds().includes(postId);
}

window.toggleSavePost = function(postId){
  let saved = getSavedPostIds();
  const index = saved.indexOf(postId);
  let isSavedNow = false;
  if(index > -1){
    saved.splice(index, 1);
    isSavedNow = false;
    toast('পোস্টটি সংরক্ষিত তালিকা থেকে সরানো হয়েছে');
  } else {
    saved.unshift(postId);
    isSavedNow = true;
    if(typeof playSfx === 'function') playSfx('click');
    toast('🔖 পোস্টটি সংরক্ষিত তালিকায় সেভ করা হয়েছে!');
  }
  localStorage.setItem(SAVED_POSTS_KEY, JSON.stringify(saved));
  
  // Update bookmark icon in DOM if present
  const btn = document.getElementById('save_btn_' + postId);
  if(btn){
    btn.innerHTML = isSavedNow ? '🔖' : '📑';
    btn.classList.toggle('saved', isSavedNow);
    btn.title = isSavedNow ? 'সংরক্ষিত পোস্ট (সেভ করা আছে)' : 'বুকমার্কে সেভ করুন';
  }
  
  // If in saved view, refresh
  if(currentCommunityViewMode === 'saved'){
    updateCommunityFeedLive();
  }
};

window.setCommunityViewMode = function(mode){
  currentCommunityViewMode = mode || 'feed';
  if(currentCommunityViewMode === 'chats' && typeof initActiveChatsFirestoreSync === 'function'){
    initActiveChatsFirestoreSync();
  }
  renderCommunityLounge();
};

// ----------------------------------------------------------------------------
// Render Mini Social Media / Study Feed
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// Stories & Instagram Social Features
// ----------------------------------------------------------------------------
let currentActiveStoryId = null;
let storyTimer = null;

function renderStoriesCarouselHtml(){
  const stories = getStudyStories();
  const stud = getLoggedStudent();
  const isTeacher = !!currentTeacher;
  const myAvatar = isTeacher ? '👨‍🏫' : (stud ? '🎓' : '🧑‍🎓');

  const storiesItemsHtml = stories.map(s => `
    <div class="story-item" onclick="openStoryViewer('${s.id}')" title="${escapeHtml(s.title)}">
      <div class="story-ring">
        <div class="story-avatar-inner">
          ${s.avatar || '🎓'}
        </div>
      </div>
      <div class="story-name">${escapeHtml(s.authorName || 'শিক্ষার্থী')}</div>
    </div>
  `).join('');

  return `
    <div class="insta-stories-wrapper" id="studyStoriesContainer">
      <!-- Add Story Button -->
      <div class="story-item" onclick="openAddStoryModal()" title="নতুন ২৪ ঘণ্টার স্টাডি স্টোরি যোগ করুন">
        <div class="story-ring add-story">
          <div class="story-avatar-inner" style="background:rgba(217,164,65,0.1); color:var(--gold);">
            ${myAvatar}
            <span class="story-plus-badge">+</span>
          </div>
        </div>
        <div class="story-name" style="font-weight:700; color:var(--gold);">+ স্টোরি</div>
      </div>

      <!-- Real-time Peer Stories -->
      ${storiesItemsHtml}
    </div>
  `;
}

window.openStoryViewer = function(storyId){
  const stories = getStudyStories();
  const index = stories.findIndex(s => s.id === storyId);
  if(index === -1) return;
  const story = stories[index];
  currentActiveStoryId = story.id;
  
  if(typeof playSfx === 'function') playSfx('click');

  const old = document.getElementById('instaStoryViewerOverlay');
  if(old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'instaStoryViewerOverlay';
  overlay.style.cssText = 'position:fixed; inset:0; z-index:99999; background:rgba(0,0,0,0.88); backdrop-filter:blur(10px); display:flex; align-items:center; justify-content:center; padding:12px;';
  overlay.onclick = function(e){
    if(e.target === overlay) closeStoryViewer();
  };

  overlay.innerHTML = `
    <div style="width:100%; max-width:420px; height:85vh; max-height:720px; border-radius:20px; background:${story.bgGradient || '#1E293B'}; position:relative; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 15px 40px rgba(0,0,0,0.6); border:1.5px solid rgba(255,255,255,0.15);" onclick="event.stopPropagation()">
      <!-- Progress Bar -->
      <div style="height:3px; background:rgba(255,255,255,0.25); width:100%; position:relative;">
        <div id="storyProgressBar" style="height:100%; background:var(--gold); width:0%; transition:width 5s linear;"></div>
      </div>

      <!-- Story Header -->
      <div style="padding:14px 16px; display:flex; justify-content:space-between; align-items:center; z-index:10; background:linear-gradient(to bottom, rgba(0,0,0,0.6), transparent);">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="width:40px; height:40px; border-radius:50%; background:#fff; display:flex; align-items:center; justify-content:center; font-size:22px; border:2px solid var(--gold);">
            ${story.avatar || '🎓'}
          </div>
          <div>
            <div style="color:#fff; font-weight:700; font-size:14px; display:flex; align-items:center; gap:6px;">
              ${escapeHtml(story.authorName)}
              <span style="font-size:11px; background:rgba(217,164,65,0.3); color:#FCD34D; padding:1px 6px; border-radius:8px;">${escapeHtml(story.authorRole||'')}</span>
            </div>
            <div style="color:rgba(255,255,255,0.7); font-size:11px;">⏱️ ${story.timeAgo || 'কিছুক্ষণ আগে'}</div>
          </div>
        </div>
        <button onclick="closeStoryViewer()" style="background:none; border:none; color:#fff; font-size:24px; cursor:pointer; padding:4px;">✕</button>
      </div>

      <!-- Story Content Body -->
      <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:24px; text-align:center; position:relative;">
        <div style="font-size:56px; margin-bottom:18px;">${story.avatar || '✨'}</div>
        <h2 style="color:#fff; font-size:22px; font-weight:700; line-height:1.45; margin:0; text-shadow:0 2px 10px rgba(0,0,0,0.5);">
          ${escapeHtml(story.title)}
        </h2>
        <div style="margin-top:16px; display:inline-flex; align-items:center; gap:6px; background:rgba(255,255,255,0.12); padding:6px 14px; border-radius:20px; color:#fff; font-size:12px;">
          <span>🔥 ${story.reactionsCount || 0} জন রিঅ্যাক্ট করেছেন</span>
        </div>

        <div id="storyReactionParticles" style="position:absolute; inset:0; pointer-events:none; overflow:hidden;"></div>
      </div>

      <!-- Navigation Taps -->
      <div style="position:absolute; top:60px; bottom:70px; left:0; width:40%; cursor:pointer;" onclick="prevStory(${index})"></div>
      <div style="position:absolute; top:60px; bottom:70px; right:0; width:40%; cursor:pointer;" onclick="nextStory(${index})"></div>

      <!-- Story Footer Reaction Bar -->
      <div style="padding:12px 16px; background:linear-gradient(to top, rgba(0,0,0,0.8), transparent); display:flex; align-items:center; justify-content:space-between; gap:10px; z-index:10;">
        <div style="color:#fff; font-size:12px; font-weight:600;">তাৎক্ষণিক উৎসাহ পাঠান:</div>
        <div style="display:flex; gap:8px;">
          <button onclick="reactToStory('${story.id}', '🔥')" style="background:rgba(255,255,255,0.15); border:none; border-radius:50%; width:38px; height:38px; font-size:19px; cursor:pointer; transition:transform .15s ease;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">🔥</button>
          <button onclick="reactToStory('${story.id}', '👏')" style="background:rgba(255,255,255,0.15); border:none; border-radius:50%; width:38px; height:38px; font-size:19px; cursor:pointer; transition:transform .15s ease;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">👏</button>
          <button onclick="reactToStory('${story.id}', '💡')" style="background:rgba(255,255,255,0.15); border:none; border-radius:50%; width:38px; height:38px; font-size:19px; cursor:pointer; transition:transform .15s ease;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">💡</button>
          <button onclick="reactToStory('${story.id}', '❤️')" style="background:rgba(255,255,255,0.15); border:none; border-radius:50%; width:38px; height:38px; font-size:19px; cursor:pointer; transition:transform .15s ease;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">❤️</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  setTimeout(() => {
    const bar = document.getElementById('storyProgressBar');
    if(bar) bar.style.width = '100%';
  }, 50);

  clearTimeout(storyTimer);
  storyTimer = setTimeout(() => {
    nextStory(index);
  }, 5000);
};

window.closeStoryViewer = function(){
  clearTimeout(storyTimer);
  const overlay = document.getElementById('instaStoryViewerOverlay');
  if(overlay) overlay.remove();
};

window.nextStory = function(currentIndex){
  const stories = getStudyStories();
  if(currentIndex < stories.length - 1){
    openStoryViewer(stories[currentIndex + 1].id);
  } else {
    closeStoryViewer();
  }
};

window.prevStory = function(currentIndex){
  const stories = getStudyStories();
  if(currentIndex > 0){
    openStoryViewer(stories[currentIndex - 1].id);
  }
};

window.reactToStory = function(storyId, emoji){
  if(typeof playSfx === 'function') playSfx('pop');
  const container = document.getElementById('storyReactionParticles');
  if(container){
    for(let i=0; i<6; i++){
      const p = document.createElement('div');
      p.textContent = emoji;
      p.style.cssText = `position:absolute; bottom:20px; left:${30 + Math.random()*40}%; font-size:${24 + Math.random()*16}px; pointer-events:none; transition:all 1s ease-out; opacity:1; transform:translateY(0) scale(1);`;
      container.appendChild(p);
      setTimeout(() => {
        p.style.opacity = '0';
        p.style.transform = `translate(${(Math.random()-0.5)*120}px, -${150 + Math.random()*100}px) scale(1.4)`;
      }, 30);
      setTimeout(() => p.remove(), 1100);
    }
  }
  toast(`${emoji} রিঅ্যাকশন সফলভাবে পাঠানো হয়েছে!`);
};

window.openAddStoryModal = function(){
  const stud = getLoggedStudent();
  const isTeacher = !!currentTeacher;
  const authorName = isTeacher ? (currentTeacher.name || 'শিক্ষক') : (stud ? stud.name : (localStorage.getItem('tuition_guest_author_name') || 'সাধারণ শিক্ষার্থী'));
  const authorRole = isTeacher ? 'শিক্ষক' : (stud ? 'প্রাইভেট শিক্ষার্থী' : 'সাধারণ শিক্ষার্থী');
  const defaultAvatar = isTeacher ? '👨‍🏫' : (stud ? '🎓' : '🧑‍🎓');

  const old = document.getElementById('addStoryModalOverlay');
  if(old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'addStoryModalOverlay';
  overlay.className = 'community-modal-overlay';
  overlay.onclick = function(e){
    if(e.target === overlay) overlay.remove();
  };

  overlay.innerHTML = `
    <div class="community-modal" onclick="event.stopPropagation()">
      <div class="community-modal-header">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:22px;">⏱️</span>
          <div>
            <h3 style="margin:0; font-size:16.5px; color:var(--ink);">২৪ ঘণ্টার স্টাডি স্টোরি যোগ করুন</h3>
            <span style="font-size:11.5px; color:var(--pencil);">আজকের স্টাডি গোল, অর্জন বা ছোট মোমেন্টস শেয়ার করুন</span>
          </div>
        </div>
        <button class="reaction-btn" style="padding:4px 9px;" onclick="document.getElementById('addStoryModalOverlay').remove()">✕</button>
      </div>

      <div class="community-modal-body">
        <div style="margin-bottom:12px;">
          <label style="font-size:12px; font-weight:700; color:var(--ink); margin-bottom:4px; display:block;">স্টোরির ক্যাপশন বা স্ট্যাটাস:</label>
          <input type="text" id="newStoryTitleInput" placeholder="যেমন: আজকে ফিজিক্স ২য় পত্রের গতিবিদ্যা রিভিশন ডান! 🔥" style="font-size:13.5px; padding:9px 12px; margin-bottom:0;" maxlength="80">
        </div>

        <div style="margin-bottom:14px;">
          <label style="font-size:12px; font-weight:700; color:var(--ink); margin-bottom:6px; display:block;">ব্যাকগ্রাউন্ড থিম বেছে নিন:</label>
          <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:8px;">
            <label style="cursor:pointer; display:block;">
              <input type="radio" name="storyThemeRadio" value="linear-gradient(135deg, #1E293B, #0F172A)" checked style="display:none;">
              <div style="height:44px; border-radius:8px; background:linear-gradient(135deg, #1E293B, #0F172A); border:2px solid var(--gold); display:flex; align-items:center; justify-content:center; color:#fff; font-size:18px;">⚡</div>
            </label>
            <label style="cursor:pointer; display:block;">
              <input type="radio" name="storyThemeRadio" value="linear-gradient(135deg, #064E3B, #022C22)" style="display:none;">
              <div style="height:44px; border-radius:8px; background:linear-gradient(135deg, #064E3B, #022C22); border:1px solid rgba(255,255,255,0.2); display:flex; align-items:center; justify-content:center; color:#fff; font-size:18px;">🧪</div>
            </label>
            <label style="cursor:pointer; display:block;">
              <input type="radio" name="storyThemeRadio" value="linear-gradient(135deg, #312E81, #1E1B4B)" style="display:none;">
              <div style="height:44px; border-radius:8px; background:linear-gradient(135deg, #312E81, #1E1B4B); border:1px solid rgba(255,255,255,0.2); display:flex; align-items:center; justify-content:center; color:#fff; font-size:18px;">📐</div>
            </label>
            <label style="cursor:pointer; display:block;">
              <input type="radio" name="storyThemeRadio" value="linear-gradient(135deg, #7C2D12, #451A03)" style="display:none;">
              <div style="height:44px; border-radius:8px; background:linear-gradient(135deg, #7C2D12, #451A03); border:1px solid rgba(255,255,255,0.2); display:flex; align-items:center; justify-content:center; color:#fff; font-size:18px;">🎯</div>
            </label>
          </div>
        </div>
      </div>

      <div class="community-modal-footer">
        <button class="btn btn-outline" onclick="document.getElementById('addStoryModalOverlay').remove()">বাতিল</button>
        <button class="btn btn-gold" style="font-weight:700;" onclick="submitNewStory('${escapeHtml(authorName)}', '${authorRole}', '${defaultAvatar}')">🚀 স্টোরি প্রকাশ করুন</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
};

window.submitNewStory = function(authorName, authorRole, avatar){
  const inp = document.getElementById('newStoryTitleInput');
  const title = (inp && inp.value.trim()) || '';
  if(!title){
    toast('দয়া করে স্টোরির একটি ক্যাপশন বা টেক্সট লিখুন');
    return;
  }
  const checkedTheme = document.querySelector('input[name="storyThemeRadio"]:checked');
  const bg = checkedTheme ? checkedTheme.value : 'linear-gradient(135deg, #1E293B, #0F172A)';

  const newStory = {
    id: 'story_' + Date.now(),
    authorName: authorName,
    authorRole: authorRole,
    isTeacher: !!currentTeacher,
    avatar: avatar,
    title: title,
    timeAgo: 'এইমাত্র',
    bgGradient: bg,
    createdAt: Date.now(),
    reactionsCount: 1
  };

  const stories = getStudyStories();
  stories.unshift(newStory);
  saveStudyStories(stories);

  // Sync to Firebase Cloud Firestore
  if(window.fbSaveStory){
    window.fbSaveStory(newStory);
  }

  const modal = document.getElementById('addStoryModalOverlay');
  if(modal) modal.remove();

  if(typeof playSfx === 'function') playSfx('fanfare');
  toast('🎉 স্টাডি স্টোরি প্রকাশিত হয়েছে! সহপাঠীরা এটি ২৪ ঘণ্টা দেখতে পাবে।');

  const container = document.getElementById('studyStoriesContainer');
  if(container) container.innerHTML = renderStoriesCarouselHtml();
  else renderCommunityLounge();
};

// Double Tap Heart Animation & Reaction
window.handleInstaDoubleTap = function(postId, event){
  const card = document.getElementById('post_card_' + postId) || (event ? event.currentTarget : null);
  if(card){
    const burst = document.createElement('div');
    burst.className = 'insta-heart-burst';
    burst.textContent = '❤️';
    card.appendChild(burst);
    setTimeout(() => burst.remove(), 800);
  }
  if(typeof playSfx === 'function') playSfx('pop');
  togglePostReaction(postId, 'heart');
};

let currentCommunityFilter = 'all';

function getAchievementStreak(userType, userSlug){
  const key = 'tuition_streak_' + (userSlug || (userType === 'teacher' ? 'teacher' : 'guest'));
  const todayStr = new Date().toISOString().slice(0, 10);
  try {
    let rec = JSON.parse(localStorage.getItem(key) || '{}');
    if (!rec.lastDate) {
      const initStreak = (userType === 'teacher') ? 7 : (userType === 'private' ? 3 : 1);
      rec = { streak: initStreak, lastDate: todayStr };
      localStorage.setItem(key, JSON.stringify(rec));
      return rec.streak;
    }
    if (rec.lastDate === todayStr) {
      return rec.streak || (userType === 'teacher' ? 7 : (userType === 'private' ? 3 : 1));
    }
    const last = new Date(rec.lastDate);
    const now = new Date(todayStr);
    const diffDays = Math.round((now - last) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      rec.streak = (rec.streak || 1) + 1;
      rec.lastDate = todayStr;
      localStorage.setItem(key, JSON.stringify(rec));
      return rec.streak;
    } else if (diffDays > 1) {
      rec.streak = 1;
      rec.lastDate = todayStr;
      localStorage.setItem(key, JSON.stringify(rec));
      return rec.streak;
    }
    return rec.streak || 1;
  } catch(e) {
    return userType === 'teacher' ? 7 : (userType === 'private' ? 3 : 1);
  }
}

window.editGuestCommunityName = function(){
  const curr = localStorage.getItem('tuition_guest_author_name') || '';
  const newName = prompt('তোমার নাম লিখুন (স্টাডি আড্ডার জন্য):', curr);
  if(newName !== null && newName.trim()){
    localStorage.setItem('tuition_guest_author_name', newName.trim());
    toast('নাম সফলভাবে আপডেট হয়েছে!');
    renderCommunityLounge();
  }
};

function getProfileSummaryCardHtml(){
  const stud = getLoggedStudent();
  const isTeacher = !!currentTeacher;

  let displayName = '';
  let greeting = '';
  let badgeHtml = '';
  let subMetaHtml = '';
  let avatarIcon = '';
  let avatarBg = '';
  let streakDays = 1;
  let streakLbl = 'স্টাডি স্ট্রিক';
  let stat2Val = '';
  let stat2Lbl = '';
  let stat3Val = '';
  let stat3Lbl = '';
  let actionBtnHtml = '';

  if(isTeacher){
    displayName = currentTeacher.name || 'শিক্ষক';
    greeting = 'স্বাগতম, কোর্স শিক্ষক 👋';
    badgeHtml = '<span class="badge-teacher">👨‍🏫 শিক্ষক ✓</span>';
    subMetaHtml = '<span style="background:rgba(255,255,255,0.15); padding:2px 8px; border-radius:10px; font-family:var(--font-mono); font-weight:700; color:var(--gold);">INSTRUCTOR / ADMIN</span>';
    avatarIcon = '👨‍🏫';
    avatarBg = 'background: linear-gradient(135deg, #D9A441, #BF3A2C);';
    streakDays = getAchievementStreak('teacher', 'teacher');
    streakLbl = 'মেন্টর স্ট্রিক';
    stat2Val = '👑 মডারেটর';
    stat2Lbl = 'কমিউনিটি রোল';
    stat3Val = 'সর্বোচ্চ ক্ষমতা';
    stat3Lbl = 'পোস্ট ও সমাধান গাইড';
    actionBtnHtml = '<button class="info-btn" style="color:#fff; border-color:rgba(255,255,255,0.3); font-size:12px; padding:5px 12px;" onclick="go(\'teacherDash\')">🛠️ শিক্ষক প্যানেল</button>';
  } else if(stud){
    displayName = stud.name;
    greeting = 'স্বাগতম, প্রাইভেট শিক্ষার্থী 👋';
    badgeHtml = '<span class="badge-private-stud">⭐ প্রাইভেট শিক্ষার্থী ✓</span>';
    subMetaHtml = `<span style="background:rgba(255,255,255,0.15); padding:2px 8px; border-radius:10px; font-family:var(--font-mono); font-weight:700; color:var(--gold);">ID: #${stud.studentCode || ''}</span> <span style="font-size:11.5px; opacity:0.85; margin-left:4px;">(ভেরিফাইড ব্যাচ মেম্বার)</span>`;
    avatarIcon = '🎓';
    avatarBg = 'background: linear-gradient(135deg, #10B981, #059669);';
    streakDays = getAchievementStreak('private', stud.slug);
    streakLbl = 'অর্জন স্ট্রিক (Achievement Streak)';
    stat2Val = '⭐ ভেরিফাইড';
    stat2Lbl = 'ব্যাচ স্ট্যাটাস';
    stat3Val = '🏆 টপ লার্নার';
    stat3Lbl = 'কমিউনিটি র‍্যাংক';
    actionBtnHtml = '<button class="info-btn" style="color:#fff; border-color:rgba(255,255,255,0.3); font-size:12px; padding:5px 12px;" onclick="go(\'studentDashboard\')">🚀 ড্যাশবোর্ড</button>';
  } else {
    displayName = localStorage.getItem('tuition_guest_author_name') || 'সাধারণ শিক্ষার্থী';
    greeting = 'স্বাগতম, শিক্ষার্থী অতিথি 👋';
    badgeHtml = '<span class="badge-public-stud" style="background:rgba(255,255,255,0.16); color:#F1F5F9; border-color:rgba(255,255,255,0.3);">🧑‍🎓 সাধারণ শিক্ষার্থী</span>';
    subMetaHtml = `<span style="font-size:12px; opacity:0.9;">উন্মুক্ত স্টাডি ভিজিটর · <a style="color:var(--gold); font-weight:700; text-decoration:underline; cursor:pointer;" onclick="editGuestCommunityName()">নাম বদলাও ✏️</a></span>`;
    avatarIcon = '🧑‍🎓';
    avatarBg = 'background: linear-gradient(135deg, #64748B, #475569);';
    streakDays = getAchievementStreak('public', 'guest');
    streakLbl = 'অর্জন স্ট্রিক (Achievement Streak)';
    stat2Val = '🌐 উন্মুক্ত';
    stat2Lbl = 'পাবলিক অ্যাক্সেস';
    stat3Val = '<span style="color:var(--gold); font-weight:700; cursor:pointer;" onclick="go(\'studentAuth\')">ব্যাচে যুক্ত হও →</span>';
    stat3Lbl = 'ভেরিফাইড ব্যাজ পেতে';
    actionBtnHtml = '<button class="info-btn" style="color:#fff; border-color:rgba(255,255,255,0.3); font-size:12px; padding:5px 12px;" onclick="go(\'studentAuth\')">🔑 প্রাইভেট লগইন</button>';
  }

  return `
    <!-- Community Profile Summary Card (Consistent with Dashboard Hero Card) -->
    <div class="hero-card" style="margin-bottom: 16px;">
      <div class="hero-profile-row">
        <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap; cursor:pointer;" onclick="if(typeof openUserProfileModal==='function') openUserProfileModal(typeof getCurrentUserIdentity==='function'?getCurrentUserIdentity().slug:'')">
          <div class="hero-avatar" style="${avatarBg}">
            ${avatarIcon}
          </div>
          <div>
            <div style="font-size:12px; color:rgba(255,255,255,0.75); margin-bottom:2px;">${greeting}</div>
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <h2 style="color:#fff; margin:0; font-size:20px; font-weight:700; line-height:1.2;">${escapeHtml(displayName)}</h2>
              ${badgeHtml}
            </div>
            <div style="margin-top:4px;">
              ${subMetaHtml}
            </div>
          </div>
        </div>
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          ${actionBtnHtml}
        </div>
      </div>

      <!-- Quick Social Media Action Bar -->
      <div style="margin-top:12px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.12); display:flex; gap:8px; flex-wrap:wrap;">
        <button class="info-btn" style="color:#fff; border-color:rgba(255,255,255,0.3); font-size:12px; padding:5px 12px; display:inline-flex; align-items:center; gap:5px;" onclick="openChatInboxModal()">
          <span>💬</span> <b>পার্সোনাল চ্যাট (DMs)</b>
        </button>
        <button class="info-btn" style="color:#fff; border-color:rgba(255,255,255,0.3); font-size:12px; padding:5px 12px; display:inline-flex; align-items:center; gap:5px;" onclick="openUserProfileModal(typeof getCurrentUserIdentity==='function'?getCurrentUserIdentity().slug:'')">
          <span>🧑‍🎓</span> <b>আমার প্রোফাইল</b>
        </button>
        ${(!isTeacher && (!stud || !stud.isVerified)) ? `
          <button class="info-btn" style="background:var(--gold); color:#3a2a06; font-weight:700; border:none; font-size:12px; padding:5px 12px; display:inline-flex; align-items:center; gap:5px;" onclick="openApplyVerifiedModal()">
            <span>⭐</span> <b>ভেরিফাইড ব্যাচের আবেদন</b>
          </button>
        ` : ''}
      </div>

      <div class="hero-stats-row">
        <div class="stat-badge">
          <div class="stat-val"><span class="streak-fire">🔥</span> ${streakDays} দিন</div>
          <div class="stat-lbl">${streakLbl}</div>
        </div>
        <div class="stat-badge">
          <div class="stat-val" style="color:var(--gold);">${stat2Val}</div>
          <div class="stat-lbl">${stat2Lbl}</div>
        </div>
        <div class="stat-badge">
          <div class="stat-val">${stat3Val}</div>
          <div class="stat-lbl">${stat3Lbl}</div>
        </div>
      </div>
    </div>
  `;
}

function fetchCommunityPosts(){
  return getCommunityPosts();
}

window.refreshCommunityFeed = function(){
  if(typeof playSfx === 'function') playSfx('click');
  toast('ফিড রিফ্রেশ করা হচ্ছে...');
  setTimeout(() => {
    renderCommunityLounge();
    toast('কমিউনিটি ফিড সম্পূর্ণ আপ-টু-ডেট! ✨');
  }, 250);
};

window.toggleBestAnswer = function(postId, commentId){
  const stud = getLoggedStudent();
  const isTeacher = !!currentTeacher;
  const posts = getCommunityPosts();
  const post = posts.find(p => p.id === postId);
  if(!post) return;

  const isAuthor = (stud && stud.name && post.authorName === stud.name);
  if(!isTeacher && !isAuthor){
    toast('শুধুমাত্র শিক্ষক বা পোস্টকারী সেরা উত্তর নির্বাচন করতে পারেন');
    return;
  }

  const comment = (post.comments || []).find(c => c.id === commentId);
  if(!comment) return;

  comment.isBestAnswer = !comment.isBestAnswer;
  saveCommunityPosts(posts);
  if(typeof playSfx === 'function') playSfx('fanfare');
  toast(comment.isBestAnswer ? '⭐ সেরা সমাধান হিসেবে স্বীকৃত!' : 'সেরা সমাধানের চিহ্ন সরানো হয়েছে');
  renderCommunityLounge();
};

let communityComposerVisible = false;
let currentCommunitySearchQuery = '';
let selectedModalTag = '💡 ডাউট ও প্রশ্ন';

let currentModalMediaUrl = '';

window.handleModalImageUpload = function(event){
  const file = event.target.files && event.target.files[0];
  if(!file) return;
  if(!file.type.startsWith('image/')){
    toast('শুধুমাত্র ছবি বা ফটো আপলোড করা যাবে');
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e){
    const img = new Image();
    img.onload = function(){
      // Compress with canvas to max 900px width
      const maxW = 900;
      let w = img.width;
      let h = img.height;
      if(w > maxW){
        h = Math.round((h * maxW) / w);
        w = maxW;
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      currentModalMediaUrl = canvas.toDataURL('image/jpeg', 0.82);

      const previewBox = document.getElementById('modalMediaPreviewContainer');
      const previewImg = document.getElementById('modalMediaPreviewImg');
      const clearBtn = document.getElementById('modalClearMediaBtn');
      if(previewBox && previewImg){
        previewImg.src = currentModalMediaUrl;
        previewBox.style.display = 'block';
      }
      if(clearBtn) clearBtn.style.display = 'inline-flex';
      toast('📸 স্টাডি স্ন্যাপ ফটো লোড হয়েছে!');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
};

window.handleModalTemplateSelect = function(val){
  if(!val){
    clearModalMedia();
    return;
  }
  if(STUDY_TEMPLATES[val]){
    currentModalMediaUrl = STUDY_TEMPLATES[val];
    const previewBox = document.getElementById('modalMediaPreviewContainer');
    const previewImg = document.getElementById('modalMediaPreviewImg');
    const clearBtn = document.getElementById('modalClearMediaBtn');
    if(previewBox && previewImg){
      previewImg.src = currentModalMediaUrl;
      previewBox.style.display = 'block';
    }
    if(clearBtn) clearBtn.style.display = 'inline-flex';
    toast('🎨 স্টাডি আর্ট স্ন্যাপ যুক্ত হয়েছে!');
  }
};

window.clearModalMedia = function(){
  currentModalMediaUrl = '';
  const previewBox = document.getElementById('modalMediaPreviewContainer');
  const previewImg = document.getElementById('modalMediaPreviewImg');
  const clearBtn = document.getElementById('modalClearMediaBtn');
  const sel = document.getElementById('modalTemplateSelect');
  if(previewBox) previewBox.style.display = 'none';
  if(previewImg) previewImg.src = '';
  if(clearBtn) clearBtn.style.display = 'none';
  if(sel) sel.value = '';
};

window.openNewPostModal = function(initialTag){
  currentModalMediaUrl = '';
  if(initialTag) selectedModalTag = initialTag;
  else if(currentCommunityFilter && currentCommunityFilter !== 'all') selectedModalTag = currentCommunityFilter;
  else selectedModalTag = '💡 ডাউট ও প্রশ্ন';

  const stud = getLoggedStudent();
  const isTeacher = !!currentTeacher;

  // Remove existing modal if any
  const oldModal = document.getElementById('communityNewPostModalOverlay');
  if(oldModal) oldModal.remove();

  const overlay = document.createElement('div');
  overlay.id = 'communityNewPostModalOverlay';
  overlay.className = 'community-modal-overlay';
  overlay.onclick = function(e){
    if(e.target === overlay) closeNewPostModal();
  };

  const tagsList = [
    { label: '💡 ডাউট ও প্রশ্ন', desc: 'Doubt' },
    { label: '📸 স্টাডি স্ন্যাপ', desc: 'Photo Snap' },
    { label: '📚 স্টাডি টিপস', desc: 'Study Tip' },
    { label: '🎯 ডেইলি গোল', desc: 'Daily Goal' },
    { label: '📢 নোটিশ', desc: 'Notice' },
    { label: '💬 সাধারণ আলোচনা', desc: 'General' }
  ];

  const tagsHtml = tagsList.map(t => `
    <button type="button" class="tag-select-pill ${t.label === selectedModalTag ? 'active' : ''}" onclick="selectModalPostTag('${t.label}')">
      ${t.label}
    </button>
  `).join('');

  overlay.innerHTML = `
    <div class="community-modal" onclick="event.stopPropagation()">
      <div class="community-modal-header">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:20px;">📸</span>
          <div>
            <h3 style="margin:0; font-size:16.5px; color:var(--ink);">নতুন পোস্ট বা স্টাডি স্ন্যাপ শেয়ার করুন</h3>
            <span style="font-size:11.5px; color:var(--pencil);">সহপাঠী ও শিক্ষকদের সাথে পড়ার নোটস বা প্রশ্ন শেয়ার করুন</span>
          </div>
        </div>
        <button class="reaction-btn" style="padding:4px 9px; font-size:14px;" onclick="closeNewPostModal()" title="বন্ধ করুন">✕</button>
      </div>

      <div class="community-modal-body">
        <!-- Author Role Info -->
        ${isTeacher ? `
          <div style="display:flex; align-items:center; gap:6px; margin-bottom:12px; font-size:12.5px; color:#936209; background:rgba(217,164,65,0.12); padding:8px 12px; border-radius:8px; border:1px solid rgba(217,164,65,0.3);">
            <span>👨‍🏫 আপনি <b>শিক্ষক</b> হিসেবে অফিসিয়াল পোস্ট করছেন (${escapeHtml(currentTeacher.name||'শিক্ষক')})</span>
          </div>
        ` : (stud ? `
          <div style="display:flex; align-items:center; gap:6px; margin-bottom:12px; font-size:12.5px; color:var(--green); background:rgba(47,125,90,0.1); padding:8px 12px; border-radius:8px; border:1px solid rgba(47,125,90,0.25);">
            <span>⭐ আপনি ভেরিফাইড <b>প্রাইভেট শিক্ষার্থী</b> হিসেবে পোস্ট করছেন (${escapeHtml(stud.name)})</span>
          </div>
        ` : `
          <div style="margin-bottom:12px; background:rgba(217,164,65,0.06); border:1px dashed var(--paper-edge); padding:10px 12px; border-radius:10px;">
            <label style="font-size:12px; font-weight:700; color:var(--ink); margin-bottom:4px; display:block;">তোমার নাম (Guest Author):</label>
            <input type="text" id="modalPostAuthor" placeholder="তোমার নাম (যেমন: তানভীর হাসান)" value="${escapeHtml(localStorage.getItem('tuition_guest_author_name')||'')}" style="margin-bottom:0; font-size:13px; padding:7px 10px; border-radius:8px;">
            <div style="font-size:11px; color:var(--pencil); margin-top:4px;">💡 প্রাইভেট ব্যাচে এনরোল করা ছাত্র-ছাত্রীরা স্বয়ংক্রিয়ভাবে ⭐ ভেরিফাইড ব্যাজ পেয়ে থাকে।</div>
          </div>
        `)}

        <!-- Tag Attachment Section -->
        <div style="margin-bottom:14px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <label style="font-size:12px; font-weight:700; color:var(--ink);">ট্যাগ বেছে নিন (Category Tag):</label>
            <span style="font-size:11px; color:var(--pencil);">১টি ক্যাটাগরি</span>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            ${tagsHtml}
          </div>
        </div>

        <!-- Media / Study Photo Snap Section (Instagram Style) -->
        <div style="margin-bottom:14px; background:rgba(31,42,68,0.03); border:1px solid var(--paper-edge); padding:10px 12px; border-radius:10px;">
          <label style="font-size:12px; font-weight:700; color:var(--ink); margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
            <span>📸 ফটো বা স্টাডি স্ন্যাপ যুক্ত করুন (ঐচ্ছিক):</span>
            <span style="font-size:11px; color:var(--pencil);">নোটস, ডায়াগ্রাম, অংক</span>
          </label>
          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <label class="btn btn-outline" style="padding:6px 12px; font-size:12px; cursor:pointer; display:inline-flex; align-items:center; gap:5px; border-radius:10px;">
              <span>📁 গ্যালারি / ফাইল থেকে আপলোড</span>
              <input type="file" accept="image/*" style="display:none;" onchange="handleModalImageUpload(event)">
            </label>
            <select id="modalTemplateSelect" onchange="handleModalTemplateSelect(this.value)" style="margin-bottom:0; width:auto; font-size:12px; padding:6px 10px; border-radius:10px;">
              <option value="">🎨 অথবা রেডি স্টাডি স্ন্যাপ বেছে নিন...</option>
              <option value="physics">⚡ পদার্থবিজ্ঞান গতিবিদ্যা ও মহাকর্ষ</option>
              <option value="chemistry">🧪 রসায়ন পর্যায়বৃত্ত ধর্ম ও জৈব সংকেত</option>
              <option value="math">📐 ক্যালকুলাস ও ইন্টিগ্রেশন রিভিশন</option>
              <option value="studydesk">🎯 ডেইলি স্টাডি গোল ও পমোডোরো</option>
            </select>
            <button type="button" id="modalClearMediaBtn" class="btn btn-outline" style="display:none; padding:5px 10px; font-size:11.5px; color:#EF4444; border-color:#FCA5A5;" onclick="clearModalMedia()">ছবি বাতিল ✕</button>
          </div>
          <div id="modalMediaPreviewContainer" style="display:none; margin-top:8px; border-radius:10px; overflow:hidden; max-height:160px; background:#0F172A; text-align:center; border:1px solid var(--paper-edge);">
            <img id="modalMediaPreviewImg" src="" style="max-height:160px; width:auto; object-fit:contain; display:inline-block;">
          </div>
        </div>

        <!-- Text Editor -->
        <div>
          <label style="font-size:12px; font-weight:700; color:var(--ink); margin-bottom:6px; display:flex; justify-content:space-between;">
            <span>ক্যাপশন বা বিস্তারিত বিষয়বস্তু (Text Content):</span>
            <span id="modalCharCount" style="font-size:11.5px; color:var(--pencil); font-family:var(--font-mono);">0/600</span>
          </label>

          <!-- Text Editor Toolbar -->
          <div class="editor-toolbar">
            <button type="button" class="editor-tool-btn" onclick="insertEditorFormat('bold')" title="বোল্ড (Bold)"><b>B</b></button>
            <button type="button" class="editor-tool-btn" onclick="insertEditorFormat('italic')" title="ইটালিক (Italic)"><i>I</i></button>
            <button type="button" class="editor-tool-btn" onclick="insertEditorFormat('bullet')" title="বুলেট পয়েন্ট">• লিস্ট</button>
            <button type="button" class="editor-tool-btn" onclick="insertEditorFormat('quote')" title="উদ্ধৃতি (Quote)">“ উদ্ধৃতি</button>
            <button type="button" class="editor-tool-btn" onclick="insertEditorFormat('formula')" title="সূত্র বা সমীকরণ">√x সূত্র</button>
            <span style="border-left:1px solid var(--paper-edge); height:16px; margin:0 2px;"></span>
            <button type="button" class="editor-tool-btn" onclick="insertEditorText('💡 ')" title="আইডিয়া">💡</button>
            <button type="button" class="editor-tool-btn" onclick="insertEditorText('❓ ')" title="প্রশ্ন">❓</button>
            <button type="button" class="editor-tool-btn" onclick="insertEditorText('🔥 ')" title="আগুন">🔥</button>
            <button type="button" class="editor-tool-btn" onclick="insertEditorText('✨ ')" title="চমক">✨</button>
          </div>

          <textarea 
            id="modalPostContent" 
            placeholder="তোমার কোনো ডাউট, পড়ার সমস্যা, অধ্যায়ের প্রস্তুতি বা যেকোনো স্টাডি টিপস বিস্তারিত এখানে লেখো... হ্যাশট্যাগ ব্যবহার করতে পারো যেমন #Physics #MathDoubt" 
            style="min-height:120px; margin-bottom:0; font-family:var(--font-body); font-size:14px; line-height:1.55; border-radius:0 0 8px 8px; resize:vertical;" 
            maxlength="600"
            oninput="updateModalCharCount(this)"
            onkeydown="if((event.ctrlKey || event.metaKey) && event.key==='Enter'){ event.preventDefault(); submitModalNewPost(); }"
          ></textarea>
        </div>
      </div>

      <div class="community-modal-footer">
        <button class="btn btn-outline" style="padding:7px 16px; font-size:13px;" onclick="closeNewPostModal()">বাতিল</button>
        <button class="btn btn-gold" style="padding:7px 22px; font-size:13.5px; font-weight:700; box-shadow:0 3px 10px rgba(217,164,65,0.25);" onclick="submitModalNewPost()">🚀 পোস্ট শেয়ার করুন</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  setTimeout(() => {
    const txt = document.getElementById('modalPostContent');
    if(txt) txt.focus();
  }, 100);

  const escHandler = function(e){
    if(e.key === 'Escape'){
      closeNewPostModal();
      window.removeEventListener('keydown', escHandler);
    }
  };
  window.addEventListener('keydown', escHandler);
};

window.closeNewPostModal = function(){
  const overlay = document.getElementById('communityNewPostModalOverlay');
  if(overlay){
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 120);
  }
};

window.selectModalPostTag = function(tag){
  selectedModalTag = tag;
  const pills = document.querySelectorAll('.tag-select-pill');
  pills.forEach(p => {
    if(p.textContent.trim() === tag){
      p.classList.add('active');
    } else {
      p.classList.remove('active');
    }
  });
};

window.updateModalCharCount = function(el){
  const countEl = document.getElementById('modalCharCount');
  if(countEl && el){
    countEl.textContent = el.value.length + '/600';
  }
};

window.insertEditorFormat = function(type){
  const txt = document.getElementById('modalPostContent');
  if(!txt) return;
  const start = txt.selectionStart;
  const end = txt.selectionEnd;
  const val = txt.value;
  const selected = val.substring(start, end);

  let replacement = '';
  if(type === 'bold'){
    replacement = `**${selected || 'বোল্ড লেখা'}**`;
  } else if(type === 'italic'){
    replacement = `*${selected || 'ইটালিক লেখা'}*`;
  } else if(type === 'bullet'){
    replacement = `\n- ${selected || 'পয়েন্ট ১'}\n- পয়েন্ট ২`;
  } else if(type === 'quote'){
    replacement = `\n> ${selected || 'উদ্ধৃতি বা নোট'}\n`;
  } else if(type === 'formula'){
    replacement = `${selected || 'y = mx + c'}`;
  }

  txt.value = val.substring(0, start) + replacement + val.substring(end);
  txt.focus();
  txt.setSelectionRange(start + replacement.length, start + replacement.length);
  updateModalCharCount(txt);
};

window.insertEditorText = function(text){
  const txt = document.getElementById('modalPostContent');
  if(!txt) return;
  const start = txt.selectionStart;
  const end = txt.selectionEnd;
  const val = txt.value;
  txt.value = val.substring(0, start) + text + val.substring(end);
  txt.focus();
  txt.setSelectionRange(start + text.length, start + text.length);
  updateModalCharCount(txt);
};

window.submitModalNewPost = function(){
  const now = Date.now();
  if(now - communityCooldown < 5000){
    toast('অনুগ্রহ করে ৫ সেকেন্ড অপেক্ষা করে আবার পোস্ট করুন');
    return;
  }

  const contentEl = document.getElementById('modalPostContent');
  const authorEl = document.getElementById('modalPostAuthor');

  const content = (contentEl ? contentEl.value : '').trim();
  const tag = selectedModalTag || '💡 ডাউট ও প্রশ্ন';

  if(!content){
    toast('পোস্টে কিছু লেখা প্রয়োজন!');
    if(contentEl) contentEl.focus();
    return;
  }
  if(content.length < 5){
    toast('কমপক্ষে ৫টি অক্ষর লিখুন');
    if(contentEl) contentEl.focus();
    return;
  }

  const stud = getLoggedStudent();
  const isTeacher = !!currentTeacher;
  let authorName = 'সাধারণ শিক্ষার্থী';
  let isPrivateStudent = false;

  if(isTeacher){
    authorName = (currentTeacher.name || 'শিক্ষক');
  } else if(stud && stud.name){
    authorName = stud.name;
    isPrivateStudent = true;
  } else if(authorEl && authorEl.value.trim()){
    authorName = authorEl.value.trim();
    localStorage.setItem('tuition_guest_author_name', authorName);
  } else {
    const saved = localStorage.getItem('tuition_guest_author_name');
    if(saved) authorName = saved;
  }

  const newPost = {
    id: 'post_' + Date.now() + '_' + Math.floor(Math.random()*1000),
    authorName,
    authorRole: isTeacher ? 'শিক্ষক' : (isPrivateStudent ? 'প্রাইভেট শিক্ষার্থী' : 'সাধারণ শিক্ষার্থী'),
    isTeacher,
    isPrivateStudent,
    tag,
    content,
    mediaUrl: currentModalMediaUrl || '',
    timestamp: Date.now(),
    reactions: { fire: 1, idea: 0, clap: 0, heart: 0 },
    userReactions: { fire: true },
    comments: []
  };

  const posts = getCommunityPosts();
  posts.unshift(newPost);
  saveCommunityPosts(posts);

  // Sync to Firebase Cloud Firestore
  if(window.fbSavePost){
    window.fbSavePost(newPost);
  }

  currentModalMediaUrl = '';
  communityCooldown = now;
  closeNewPostModal();
  if(typeof playSfx === 'function') playSfx('combo');
  toast('আপনার স্টাডি পোস্টটি সফলভাবে শেয়ার হয়েছে! 🎉');

  if(currentCommunityFilter !== 'all' && currentCommunityFilter !== tag){
    currentCommunityFilter = 'all';
  }
  renderCommunityLounge();
};

window.toggleCommunityComposer = function(){
  openNewPostModal();
};

window.handleCommunitySearch = function(val){
  currentCommunitySearchQuery = (val || '').trim();
  const clearBtn = document.getElementById('communitySearchClearBtn');
  if(clearBtn){
    clearBtn.style.display = currentCommunitySearchQuery ? 'inline-flex' : 'none';
  }
  updateCommunityFeedLive();
};

window.clearCommunitySearch = function(){
  currentCommunitySearchQuery = '';
  const input = document.getElementById('communitySearchInput');
  if(input){
    input.value = '';
    input.focus();
  }
  const clearBtn = document.getElementById('communitySearchClearBtn');
  if(clearBtn){
    clearBtn.style.display = 'none';
  }
  updateCommunityFeedLive();
};

let currentCommunitySort = 'newest';

window.setCommunitySort = function(sortType){
  currentCommunitySort = sortType || 'newest';
  updateCommunityFeedLive();
};

function getFilteredCommunityPosts(posts){
  let result = currentCommunityFilter === 'all' 
    ? [...posts] 
    : posts.filter(p => p.tag === currentCommunityFilter);

  // If viewing saved posts
  if(currentCommunityViewMode === 'saved'){
    const savedIds = getSavedPostIds();
    result = result.filter(p => savedIds.includes(p.id));
  }

  if(currentCommunitySearchQuery){
    const q = currentCommunitySearchQuery.toLowerCase();
    result = result.filter(p => {
      const contentMatch = (p.content || '').toLowerCase().includes(q);
      const tagMatch = (p.tag || '').toLowerCase().includes(q);
      const authorMatch = (p.authorName || '').toLowerCase().includes(q);
      const commentMatch = (p.comments || []).some(c => 
        (c.text || '').toLowerCase().includes(q) || (c.authorName || '').toLowerCase().includes(q)
      );
      return contentMatch || tagMatch || authorMatch || commentMatch;
    });
  }

  // Apply sorting dropdown criteria
  result.sort((a, b) => {
    if(currentCommunitySort === 'most_liked'){
      const likesA = Object.values(a.reactions || {}).reduce((s, v) => s + (Number(v) || 0), 0);
      const likesB = Object.values(b.reactions || {}).reduce((s, v) => s + (Number(v) || 0), 0);
      if(likesB !== likesA) return likesB - likesA;
      return (b.timestamp || 0) - (a.timestamp || 0);
    }
    if(currentCommunitySort === 'most_commented'){
      const comA = (a.comments || []).length;
      const comB = (b.comments || []).length;
      if(comB !== comA) return comB - comA;
      return (b.timestamp || 0) - (a.timestamp || 0);
    }
    if(currentCommunitySort === 'unanswered'){
      const comA = (a.comments || []).length;
      const comB = (b.comments || []).length;
      if(comA === 0 && comB > 0) return -1;
      if(comB === 0 && comA > 0) return 1;
      return (b.timestamp || 0) - (a.timestamp || 0);
    }
    // Default: 'newest'
    return (b.timestamp || 0) - (a.timestamp || 0);
  });

  return result;
}

window.deleteCommunityPost = function(postId){
  const stud = getLoggedStudent();
  const isTeacher = !!currentTeacher;
  const posts = getCommunityPosts();
  const post = posts.find(p => p.id === postId);
  if(!post) return;

  const isAuthor = (stud && stud.name && post.authorName === stud.name);
  if(!isTeacher && !isAuthor){
    toast('শুধুমাত্র লেখক বা শিক্ষক পোস্ট মুছে ফেলতে পারেন');
    return;
  }

  if(!confirm('আপনি কি এই পোস্টটি মুছে ফেলতে চান?')) return;

  const next = posts.filter(p => p.id !== postId);
  saveCommunityPosts(next);

  if(window.fbDeletePost){
    window.fbDeletePost(postId);
  }

  toast('পোস্টটি মুছে ফেলা হয়েছে');
  updateCommunityFeedLive();
};

window.openPostDetailModal = function(postId){
  const posts = getCommunityPosts();
  const post = posts.find(p => p.id === postId);
  if(!post) return;

  const old = document.getElementById('postDetailModalOverlay');
  if(old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'postDetailModalOverlay';
  overlay.className = 'community-modal-overlay';
  overlay.onclick = function(e){
    if(e.target === overlay) overlay.remove();
  };

  const isTeacherPost = post.isTeacher;
  const timeAgo = formatTimeAgo(post.timestamp);
  const reactions = post.reactions || { fire:0, idea:0, clap:0, heart:0 };
  const totalLikes = Object.values(reactions).reduce((s, v) => s + (Number(v) || 0), 0);
  const myReactions = post.userReactions || {};
  const isHearted = !!myReactions.heart;
  const isSaved = isPostSaved(post.id);
  const comments = post.comments || [];

  const commentsHtml = comments.length === 0 ? `
    <div style="font-size:12.5px; color:var(--pencil); padding:10px 0; font-style:italic; text-align:center;">
      এখনো কোনো মন্তব্য নেই। প্রথম উত্তরটি তুমিই লিখো!
    </div>
  ` : comments.map(c => `
    <div style="background:var(--paper); border-radius:9px; padding:9px 12px; margin-bottom:8px; font-size:13.5px; border:1px solid var(--paper-edge);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
        <div style="display:flex; align-items:center; gap:6px;">
          <b style="font-size:13px; color:var(--ink);">${escapeHtml(c.authorName)}</b>
          ${getAuthorBadge(c)}
        </div>
        <span style="font-size:11px; color:var(--pencil);">${formatTimeAgo(c.timestamp)}</span>
      </div>
      <div style="color:var(--ink); line-height:1.45;">${linkifyText(c.text)}</div>
      ${c.isBestAnswer ? `
        <div style="margin-top:4px; font-size:11.5px; color:var(--green); font-weight:700;">
          ⭐ সেরা সমাধান হিসেবে স্বীকৃত
        </div>
      ` : ''}
    </div>
  `).join('');

  overlay.innerHTML = `
    <div class="community-modal" style="max-width:580px; padding:0; overflow:hidden;" onclick="event.stopPropagation()">
      <div class="community-modal-header" style="padding:12px 16px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <div class="insta-avatar" style="width:38px; height:38px; font-size:18px;">
            ${isTeacherPost ? '👨‍🏫' : (post.isPrivateStudent ? '🎓' : '🧑‍🎓')}
          </div>
          <div>
            <div style="font-size:14px; font-weight:700; color:var(--ink);">${escapeHtml(post.authorName)}</div>
            <div style="font-size:11px; color:var(--pencil);">${timeAgo} · ${escapeHtml(post.tag || 'স্টাডি')}</div>
          </div>
        </div>
        <button class="reaction-btn" style="padding:4px 9px;" onclick="document.getElementById('postDetailModalOverlay').remove()">✕</button>
      </div>

      <div class="community-modal-body" style="padding:16px; max-height:65vh; overflow-y:auto;">
        ${post.mediaUrl ? `
          <div style="margin:-16px -16px 14px -16px; background:#0F172A; text-align:center;">
            <img src="${post.mediaUrl}" style="max-height:300px; width:100%; object-fit:contain;">
          </div>
        ` : ''}

        <div style="font-size:15px; line-height:1.6; color:var(--ink); margin-bottom:14px; word-break:break-word;">
          ${linkifyText(post.content)}
        </div>

        <div class="insta-actions-bar" style="margin-bottom:12px; padding:8px 0; border-top:1px solid var(--paper-edge); border-bottom:1px solid var(--paper-edge);">
          <div class="insta-actions-left">
            <button class="insta-action-btn ${isHearted ? 'liked' : ''}" onclick="togglePostReaction('${post.id}', 'heart'); openPostDetailModal('${post.id}');">
              <span>${isHearted ? '❤️' : '🤍'}</span>
              <span>${reactions.heart || 0}</span>
            </button>
            <button class="insta-action-btn" onclick="document.getElementById('detail_comment_input').focus()">
              <span>💬</span>
              <span>${comments.length}</span>
            </button>
            <button class="insta-action-btn" onclick="navigator.clipboard && navigator.clipboard.writeText('${escapeHtml(post.content).slice(0, 100)}'); toast('পোস্টের টেক্সট কপি হয়েছে!');">
              <span>📤</span>
            </button>
          </div>
          <button class="insta-save-btn ${isSaved ? 'saved' : ''}" onclick="toggleSavePost('${post.id}'); openPostDetailModal('${post.id}');">
            <span>${isSaved ? '🔖' : '📑'}</span>
          </button>
        </div>

        <h4 style="margin:10px 0 8px; font-size:13.5px; color:var(--ink);">সহপাঠীদের আলোচনা (${comments.length})</h4>
        <div style="margin-bottom:14px;">
          ${commentsHtml}
        </div>

        <!-- Add Comment in Modal -->
        <div style="display:flex; gap:6px; align-items:center;">
          <input type="text" id="detail_comment_input" placeholder="মন্তব্য বা সমাধান লিখুন..." style="margin-bottom:0; font-size:13px; padding:8px 12px; flex:1;" onkeydown="if(event.key==='Enter'){ submitPostComment('${post.id}'); setTimeout(()=>openPostDetailModal('${post.id}'), 200); }">
          <button class="btn btn-gold" style="padding:8px 16px; font-size:13px; font-weight:700;" onclick="submitPostComment('${post.id}'); setTimeout(()=>openPostDetailModal('${post.id}'), 200);">পাঠাও</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
};

function renderCommunityPostsListHtml(filteredPosts, stud, isTeacher){
  // 0. Dedicated Student 1-on-1 Chat List & Direct Messaging View
  if(currentCommunityViewMode === 'chats'){
    if(typeof renderCommunityChatListViewHtml === 'function'){
      return renderCommunityChatListViewHtml(stud, isTeacher);
    }
  }

  // 1. Study Streaks & Leaderboard View
  if(currentCommunityViewMode === 'streaks'){
    const streakTeacher = getAchievementStreak('teacher', 'teacher');
    const streakPrivate = stud ? getAchievementStreak('private', stud.slug) : 3;
    const streakPublic = getAchievementStreak('public', 'guest');

    return `
      <div style="background:#fff; border-radius:14px; border:1px solid var(--paper-edge); padding:20px; margin-bottom:16px;">
        <div style="text-align:center; margin-bottom:18px;">
          <span style="font-size:36px;">🔥</span>
          <h3 style="margin:6px 0 4px; font-size:18px; color:var(--ink);">স্টাডি স্ট্রিক ও লার্নার লিডারবোর্ড (Streaks & Top Learners)</h3>
          <p class="hint" style="margin:0;">প্রতিদিন পড়াশোনা, কুইজ ও ডাউট সলভের মাধ্যমে স্ট্রিক বজায় রাখুন এবং ব্যাজ অর্জন করুন!</p>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px; margin-bottom:20px;">
          <div style="background:linear-gradient(135deg, rgba(217,164,65,0.1), rgba(217,164,65,0.03)); border:1.5px solid var(--gold); border-radius:12px; padding:14px; text-align:center;">
            <div style="font-size:28px;">👑</div>
            <div style="font-size:14px; font-weight:700; color:var(--ink); margin-top:4px;">সৈকত স্যার</div>
            <div style="font-size:11px; color:var(--pencil);">কোর্স মেন্টর</div>
            <div style="margin-top:8px; font-size:18px; font-weight:800; color:#B45309;">🔥 ${streakTeacher} দিনের স্ট্রিক</div>
          </div>
          <div style="background:linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.03)); border:1.5px solid #10B981; border-radius:12px; padding:14px; text-align:center;">
            <div style="font-size:28px;">⭐</div>
            <div style="font-size:14px; font-weight:700; color:var(--ink); margin-top:4px;">${escapeHtml(stud ? stud.name : 'প্রাইভেট ব্যাচ মেম্বার')}</div>
            <div style="font-size:11px; color:var(--pencil);">ভেরিফাইড শিক্ষার্থী</div>
            <div style="margin-top:8px; font-size:18px; font-weight:800; color:#047857;">🔥 ${streakPrivate} দিনের স্ট্রিক</div>
          </div>
          <div style="background:linear-gradient(135deg, rgba(59,130,246,0.1), rgba(59,130,246,0.03)); border:1.5px solid #3B82F6; border-radius:12px; padding:14px; text-align:center;">
            <div style="font-size:28px;">🎯</div>
            <div style="font-size:14px; font-weight:700; color:var(--ink); margin-top:4px;">সাধারণ লার্নার কমিউনিটি</div>
            <div style="font-size:11px; color:var(--pencil);">উন্মুক্ত মেম্বার্স</div>
            <div style="margin-top:8px; font-size:18px; font-weight:800; color:#1D4ED8;">🔥 ${streakPublic} দিনের স্ট্রিক</div>
          </div>
        </div>

        <div style="background:var(--paper); border-radius:10px; padding:12px 14px; border:1px solid var(--paper-edge); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
          <div>
            <b style="font-size:13.5px; color:var(--ink);">💡 স্ট্রিক বাড়ানোর নিয়ম:</b>
            <div style="font-size:12px; color:var(--pencil); margin-top:2px;">প্রতিদিন অন্তত ১টি মক টেস্ট দিন, একটি প্রশ্নের সমাধান লিখুন অথবা স্টাডি স্টোরি শেয়ার করুন।</div>
          </div>
          <button class="btn btn-gold" style="font-weight:700; font-size:12.5px; padding:6px 14px;" onclick="openAddStoryModal()">+ আজ স্টোরি শেয়ার করো</button>
        </div>
      </div>
    `;
  }

  // 2. Empty States
  if(filteredPosts.length === 0){
    if(currentCommunityViewMode === 'saved'){
      return `
        <div class="empty-state" style="background:#fff; border-radius:12px; border:1px dashed var(--paper-edge); padding:32px 16px; text-align:center;">
          <div style="font-size:42px; margin-bottom:10px;">🔖</div>
          <h3 style="margin-bottom:6px; font-size:17px; color:var(--ink);">এখনো কোনো পোস্ট সংরক্ষিত (Saved) নেই</h3>
          <p class="hint" style="margin-bottom:16px;">পরীক্ষার আগে দ্রুত পড়ার জন্য যেকোনো গুরুত্বপূর্ণ নোটস বা ডাউটের নিচে থাকা 📑 বাটনে ক্লিক করে সেভ করুন।</p>
          <button class="btn btn-gold" onclick="setCommunityViewMode('feed')">সব পোস্ট দেখুন</button>
        </div>
      `;
    }

    if(currentCommunitySearchQuery){
      return `
        <div class="empty-state" style="background:#fff; border-radius:12px; border:1px dashed var(--paper-edge); padding:32px 16px; text-align:center;">
          <div style="font-size:38px; margin-bottom:10px;">🔍</div>
          <h3 style="margin-bottom:6px; font-size:17px; color:var(--ink);">"<b>${escapeHtml(currentCommunitySearchQuery)}</b>" দিয়ে কোনো পোস্ট পাওয়া যায়নি</h3>
          <p class="hint" style="margin-bottom:16px;">বানান সঠিক আছে কি না দেখে নিন অথবা অন্য কোনো টপিক বা কি-ওয়ার্ড দিয়ে খুঁজে দেখুন।</p>
          <button class="btn btn-outline" onclick="clearCommunitySearch()">সব পোস্ট দেখুন</button>
        </div>
      `;
    }

    return `
      <div class="empty-state" style="background:#fff; border-radius:12px; border:1px dashed var(--paper-edge); padding:32px 16px; text-align:center;">
        <div style="font-size:42px; margin-bottom:10px;">📸</div>
        <h3 style="margin-bottom:6px; font-size:17px; color:var(--ink);">এই ফিল্টারে এখনো কোনো পোস্ট নেই</h3>
        <p class="hint" style="margin-bottom:16px;">সহপাঠীদের জন্য প্রশ্ন বা পড়ালেখার প্রয়োজনীয় নোটস ও স্ন্যাপ এখনই প্রথম শেয়ার করো!</p>
        <button class="btn btn-gold" onclick="openNewPostModal()">📸 নতুন স্টাডি স্ন্যাপ শেয়ার করুন</button>
      </div>
    `;
  }

  // 3. Instagram Explore Grid View
  if(currentCommunityViewMode === 'grid'){
    const gridItemsHtml = filteredPosts.map(post => {
      const reactions = post.reactions || { fire:0, idea:0, clap:0, heart:0 };
      const totalLikes = Object.values(reactions).reduce((s, v) => s + (Number(v) || 0), 0);
      const commentsCount = (post.comments || []).length;
      const thumb = post.mediaUrl || STUDY_TEMPLATES.studydesk;

      return `
        <div class="insta-grid-item" onclick="openPostDetailModal('${post.id}')" title="${escapeHtml(post.content).slice(0, 60)}">
          <img src="${thumb}" alt="Study post" class="insta-grid-img" loading="lazy">
          <div class="insta-grid-overlay">
            <span class="insta-grid-stat">❤️ ${totalLikes}</span>
            <span class="insta-grid-stat">💬 ${commentsCount}</span>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="insta-grid-container">
        ${gridItemsHtml}
      </div>
    `;
  }

  // 4. Standard Instagram-Style Social Feed Cards
  return filteredPosts.map(post => {
    const isTeacherPost = post.isTeacher;
    const timeAgo = formatTimeAgo(post.timestamp);
    const reactions = post.reactions || { fire:0, idea:0, clap:0, heart:0 };
    const totalLikes = Object.values(reactions).reduce((s, v) => s + (Number(v) || 0), 0);
    const myReactions = post.userReactions || {};
    const isHearted = !!myReactions.heart;
    const isSaved = isPostSaved(post.id);
    const comments = post.comments || [];
    const isPostAuthor = (stud && stud.name && post.authorName === stud.name);

    const commentsHtml = comments.length === 0 ? `
      <div style="font-size:12px; color:var(--pencil); padding:4px 0; font-style:italic;">
        এখনো কোনো মন্তব্য নেই। প্রথম উত্তরটি তুমিই লিখো!
      </div>
    ` : comments.map(c => `
      <div style="background:var(--paper); border-radius:8px; padding:8px 10px; margin-top:6px; font-size:13px; border:1px solid var(--paper-edge);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px; flex-wrap:wrap; gap:4px;">
          <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
            <b style="color:var(--ink); font-size:12.5px; cursor:pointer;" onclick="if(typeof openUserProfileModal==='function') openUserProfileModal('${escapeHtml(c.authorSlug || slugify(c.authorName))}', '${escapeHtml(c.authorName)}')">${escapeHtml(c.authorName)}</b>
            ${getAuthorBadge(c)}
            <button class="reaction-btn" style="padding:1px 6px; font-size:10px; border-radius:6px;" onclick="if(typeof openDirectChat==='function') openDirectChat('${escapeHtml(c.authorSlug || slugify(c.authorName))}', '${escapeHtml(c.authorName)}')">💬 চ্যাট</button>
          </div>
          <span style="font-size:10.5px; color:var(--pencil);">${formatTimeAgo(c.timestamp)}</span>
        </div>
        <div style="color:var(--ink); line-height:1.4; word-break:break-word;">${linkifyText(c.text)}</div>
        <div style="display:flex; align-items:center; justify-content:space-between; margin-top:4px; flex-wrap:wrap; gap:4px;">
          ${c.isBestAnswer ? `
            <span style="font-size:11px; color:var(--green); font-weight:700; display:inline-flex; align-items:center; gap:4px; background:rgba(47,125,90,0.1); padding:2px 8px; border-radius:10px;">
              ⭐ সেরা সমাধান
            </span>
          ` : '<span></span>'}
          ${(isTeacher || isPostAuthor) ? `
            <button class="reaction-btn" style="font-size:10.5px; padding:2px 7px;" onclick="toggleBestAnswer('${post.id}', '${c.id}')">
              ${c.isBestAnswer ? '✕ বাতিল' : '⭐ সেরা উত্তর'}
            </button>
          ` : ''}
        </div>
      </div>
    `).join('');

    return `
      <div class="insta-post-card" id="post_card_${post.id}">
        <!-- Post Header -->
        <div class="insta-post-header">
          <div class="insta-post-author-info" style="cursor:pointer;" onclick="if(typeof openUserProfileModal==='function') openUserProfileModal('${escapeHtml(post.authorSlug || slugify(post.authorName))}', '${escapeHtml(post.authorName)}')">
            <div class="insta-avatar ${isTeacherPost ? 'teacher' : (post.isPrivateStudent ? 'private' : '')}">
              ${isTeacherPost ? '👨‍🏫' : (post.isPrivateStudent ? '🎓' : '🧑‍🎓')}
            </div>
            <div>
              <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                <span class="insta-author-name">${escapeHtml(post.authorName)}</span>
                ${getAuthorBadge(post)}
              </div>
              <div class="insta-time-ago">${timeAgo} · <span style="color:var(--gold); font-weight:600;">${escapeHtml(post.tag || 'স্টাডি')}</span></div>
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:6px;">
            <button class="reaction-btn" style="padding:3px 8px; font-size:11.5px; border-radius:8px; display:inline-flex; align-items:center; gap:4px;" onclick="if(typeof openDirectChat==='function') openDirectChat('${escapeHtml(post.authorSlug || slugify(post.authorName))}', '${escapeHtml(post.authorName)}', '${isTeacherPost ? '👨‍🏫' : (post.isPrivateStudent ? '🎓' : '🧑‍🎓')}', '${isTeacherPost ? 'teacher' : (post.isPrivateStudent ? 'private' : 'public')}')" title="লেখককে পার্সোনাল চ্যাট পাঠান">
              <span>💬</span> <span style="font-weight:600;">চ্যাট</span>
            </button>
            <button class="insta-save-btn ${isSaved ? 'saved' : ''}" id="save_btn_${post.id}" onclick="toggleSavePost('${post.id}')" title="${isSaved ? 'সংরক্ষিত পোস্ট' : 'বুকমার্কে সেভ করুন'}">
              ${isSaved ? '🔖' : '📑'}
            </button>
            ${(isTeacher || isPostAuthor) ? `
              <button onclick="deleteCommunityPost('${post.id}')" title="পোস্ট ডিলিট করুন" style="background:none; border:none; color:var(--pencil); cursor:pointer; font-size:15px; padding:4px;">🗑️</button>
            ` : ''}
          </div>
        </div>

        <!-- Post Content / Caption -->
        <div class="insta-post-content">
          ${linkifyText(post.content)}
        </div>

        <!-- Media / Study Photo Snap (Instagram Visual) -->
        ${post.mediaUrl ? `
          <div class="insta-media-container" ondblclick="handleInstaDoubleTap('${post.id}', event)" title="ডাবল-ট্যাপ করে লাভ রিঅ্যাকশন দিন ❤️">
            <img src="${post.mediaUrl}" alt="Study Snap" class="insta-media-img" loading="lazy">
          </div>
        ` : ''}

        <!-- Instagram Action Bar -->
        <div class="insta-actions-bar">
          <div class="insta-actions-left">
            <button class="insta-action-btn ${isHearted ? 'liked' : ''}" onclick="togglePostReaction('${post.id}', 'heart')" title="ভালোবাসা দিন">
              <span>${isHearted ? '❤️' : '🤍'}</span>
              <span class="likes-count">${reactions.heart || 0}</span>
            </button>
            <button class="insta-action-btn" onclick="focusCommentInput('${post.id}')" title="মন্তব্য লিখুন">
              <span>💬</span>
              <span>${comments.length}</span>
            </button>
            <button class="insta-action-btn" onclick="navigator.clipboard && navigator.clipboard.writeText('${escapeHtml(post.content).slice(0, 100)}'); toast('পোস্টের টেক্সট কপি হয়েছে!');" title="শেয়ার করুন">
              <span>📤</span>
            </button>
          </div>

          <!-- Quick Emoji Pill Reactions -->
          <div style="display:flex; gap:4px; align-items:center;">
            <button class="reaction-btn ${myReactions.fire ? 'active' : ''}" style="padding:2px 7px; font-size:12px;" onclick="togglePostReaction('${post.id}', 'fire')" title="আগুন">
              🔥 <span>${reactions.fire || 0}</span>
            </button>
            <button class="reaction-btn ${myReactions.idea ? 'active' : ''}" style="padding:2px 7px; font-size:12px;" onclick="togglePostReaction('${post.id}', 'idea')" title="আইডিয়া">
              💡 <span>${reactions.idea || 0}</span>
            </button>
            <button class="reaction-btn ${myReactions.clap ? 'active' : ''}" style="padding:2px 7px; font-size:12px;" onclick="togglePostReaction('${post.id}', 'clap')" title="সাবাশ!">
              👏 <span>${reactions.clap || 0}</span>
            </button>
          </div>
        </div>

        <!-- Comments Drawer -->
        <div id="comments_box_${post.id}" class="insta-comments-section">
          ${commentsHtml}
        </div>

        <!-- Add Comment Input Bar -->
        <div class="insta-comment-input-row">
          ${(!stud && !isTeacher) ? `
            <input type="text" id="comment_author_${post.id}" placeholder="নাম" value="${escapeHtml(localStorage.getItem('tuition_guest_author_name')||'')}" style="width:90px; margin-bottom:0; font-size:12px; padding:7px 8px; border-radius:18px;">
          ` : ''}
          <input type="text" id="comment_input_${post.id}" placeholder="একটি গঠনমূলক সমাধান বা মন্তব্য লিখুন..." style="flex:1; min-width:120px; margin-bottom:0; font-size:12.5px; padding:7px 12px; border-radius:18px;" onkeydown="if(event.key==='Enter') submitPostComment('${post.id}')">
          <button class="btn btn-gold" style="padding:7px 14px; font-size:12px; font-weight:700; border-radius:18px;" onclick="submitPostComment('${post.id}')">পাঠাও</button>
        </div>
      </div>
    `;
  }).join('');
}

function updateCommunityFeedLive(){
  const stud = getLoggedStudent();
  const isTeacher = !!currentTeacher;
  const posts = fetchCommunityPosts();
  const filtered = getFilteredCommunityPosts(posts);

  const streamEl = document.getElementById('communityFeedStream');
  if(streamEl){
    streamEl.innerHTML = renderCommunityPostsListHtml(filtered, stud, isTeacher);
  }

  const badgeEl = document.getElementById('communityPostCountBadge');
  if(badgeEl){
    badgeEl.textContent = filtered.length + 'টি পোস্ট';
  }

  const sortSelect = document.getElementById('communitySortSelect');
  if(sortSelect && sortSelect.value !== currentCommunitySort){
    sortSelect.value = currentCommunitySort;
  }

  const searchInfoEl = document.getElementById('communitySearchInfoRow');
  if(searchInfoEl){
    if(currentCommunitySearchQuery){
      searchInfoEl.style.display = 'flex';
      searchInfoEl.innerHTML = `
        <span>🔍 "<b>${escapeHtml(currentCommunitySearchQuery)}</b>" এর জন্য ${filtered.length}টি পোস্ট পাওয়া গেছে</span>
        <a style="cursor:pointer; color:var(--margin-red); font-weight:600; text-decoration:underline;" onclick="clearCommunitySearch()">রিসেট ✕</a>
      `;
    } else {
      searchInfoEl.style.display = 'none';
      searchInfoEl.innerHTML = '';
    }
  }
}

function renderCommunityFeedComponent(){
  const stud = getLoggedStudent();
  const isTeacher = !!currentTeacher;
  const posts = fetchCommunityPosts();

  const totalCount = posts.length;
  const doubtCount = posts.filter(p => p.tag === '💡 ডাউট ও প্রশ্ন').length;
  const tipsCount = posts.filter(p => p.tag === '📚 স্টাডি টিপস').length;
  const goalCount = posts.filter(p => p.tag === '🎯 ডেইলি গোল').length;
  const noticeCount = posts.filter(p => p.tag === '📢 নোটিশ').length;
  const savedCount = getSavedPostIds().length;
  const activeChats = typeof getActiveConversations === 'function' ? getActiveConversations() : [];
  const unreadChatsCount = activeChats.filter(c => (c.unreadCount || 0) > 0).length;

  const filteredPosts = getFilteredCommunityPosts(posts);
  const postsHtml = renderCommunityPostsListHtml(filteredPosts, stud, isTeacher);

  return `
    <!-- Community Feed Component (Mini Instagram for Study) -->
    <div class="community-feed-component">
      <!-- Search Bar at Top of Community Feed -->
      ${currentCommunityViewMode !== 'chats' ? `
      <div style="position:relative; margin-bottom:12px;">
        <span style="position:absolute; left:14px; top:50%; transform:translateY(-50%); font-size:15px; color:var(--pencil); pointer-events:none;">🔍</span>
        <input 
          type="text" 
          id="communitySearchInput" 
          class="community-search-input"
          placeholder="পোস্ট, ডাউট বা টপিক খুঁজুন (যেমন: পদার্থবিজ্ঞান, ভেক্টর, সূত্র...)" 
          value="${escapeHtml(currentCommunitySearchQuery)}" 
          oninput="handleCommunitySearch(this.value)"
        />
        <button 
          id="communitySearchClearBtn" 
          class="community-search-clear"
          type="button" 
          onclick="clearCommunitySearch()" 
          style="display:${currentCommunitySearchQuery ? 'inline-flex' : 'none'};"
          title="অনুসন্ধান বাতিল করুন"
        >✕</button>
      </div>

      <!-- Live Search Indicator (when searching) -->
      <div id="communitySearchInfoRow" style="display:${currentCommunitySearchQuery ? 'flex' : 'none'}; justify-content:space-between; align-items:center; margin-bottom:12px; font-size:12.5px; color:var(--ink); background:rgba(217,164,65,0.1); border:1px solid rgba(217,164,65,0.3); padding:7px 12px; border-radius:8px;">
        ${currentCommunitySearchQuery ? `
          <span>🔍 "<b>${escapeHtml(currentCommunitySearchQuery)}</b>" এর জন্য ${filteredPosts.length}টি পোস্ট পাওয়া গেছে</span>
          <a style="cursor:pointer; color:var(--margin-red); font-weight:600; text-decoration:underline;" onclick="clearCommunitySearch()">রিসেট ✕</a>
        ` : ''}
      </div>
      ` : ''}

      <!-- Instagram 24-hr Study Stories Carousel -->
      ${currentCommunityViewMode !== 'chats' ? renderStoriesCarouselHtml() : ''}

      <!-- Social View Mode Navigation Tabs (Feed / Chat List / Explore Grid / Saved / Streaks) -->
      <div class="insta-view-mode-tabs" style="display:flex; gap:6px; margin:14px 0 12px; border-bottom:1px solid var(--paper-edge); padding-bottom:8px; overflow-x:auto;">
        <button class="chip-filter ${currentCommunityViewMode==='feed'?'active':''}" style="font-weight:700; border-radius:18px; padding:6px 14px;" onclick="setCommunityViewMode('feed')">
          📱 ফিড (Feed)
        </button>
        <button class="chip-filter ${currentCommunityViewMode==='chats'?'active':''}" style="font-weight:700; border-radius:18px; padding:6px 14px; display:inline-flex; align-items:center; gap:6px;" onclick="setCommunityViewMode('chats')">
          💬 চ্যাট লিস্ট (Chat List) ${unreadChatsCount > 0 ? `<span style="background:var(--margin-red); color:#fff; font-size:10.5px; font-weight:700; padding:1px 6px; border-radius:10px;">${unreadChatsCount}</span>` : ''}
        </button>
        <button class="chip-filter ${currentCommunityViewMode==='grid'?'active':''}" style="font-weight:700; border-radius:18px; padding:6px 14px;" onclick="setCommunityViewMode('grid')">
          🖼️ এক্সপ্লোর গ্রিড (Explore)
        </button>
        <button class="chip-filter ${currentCommunityViewMode==='saved'?'active':''}" style="font-weight:700; border-radius:18px; padding:6px 14px;" onclick="setCommunityViewMode('saved')">
          🔖 সেভড নোটস (${savedCount})
        </button>
        <button class="chip-filter ${currentCommunityViewMode==='streaks'?'active':''}" style="font-weight:700; border-radius:18px; padding:6px 14px;" onclick="setCommunityViewMode('streaks')">
          🏆 স্টাডি স্ট্রিক
        </button>
      </div>

      ${(currentCommunityViewMode !== 'streaks' && currentCommunityViewMode !== 'chats') ? `
      <!-- Feed Header Toolbar -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <h3 style="margin:0; font-size:17.5px; display:flex; align-items:center; gap:6px;">
            <span>📸 স্টাডি সোশ্যাল ফিড</span>
            <span id="communityPostCountBadge" style="font-size:12px; font-weight:600; background:rgba(31,42,68,0.08); color:var(--ink); padding:2px 8px; border-radius:12px;">${filteredPosts.length}টি পোস্ট</span>
          </h3>
          <span style="font-size:11px; background:rgba(16,185,129,0.12); color:#059669; border:1px solid rgba(16,185,129,0.25); padding:2px 8px; border-radius:12px; font-weight:600; display:inline-flex; align-items:center; gap:4px;">☁️ Realtime Cloud</span>
        </div>
        <div style="display:flex; gap:6px;">
          <button class="btn btn-outline" style="padding:6px 12px; font-size:12px; border-radius:16px;" onclick="refreshCommunityFeed()" title="ফিড রিফ্রেশ করুন">
            🔄 রিফ্রেশ
          </button>
          <button class="btn btn-gold" style="padding:6px 16px; font-size:12.5px; font-weight:700; border-radius:18px; display:inline-flex; align-items:center; gap:6px; box-shadow:0 3px 10px rgba(217,164,65,0.28);" onclick="openNewPostModal()">
            <span>📸</span> <span>New Post</span>
          </button>
        </div>
      </div>

      <!-- Quick Post Prompt Card (Click to open modal editor) -->
      <div class="card" style="border:1.5px dashed var(--paper-edge); padding:12px 16px; margin-bottom:14px; background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:space-between; gap:10px; border-radius:12px; transition:border-color .15s ease, box-shadow .15s ease;" onclick="openNewPostModal()" onmouseover="this.style.borderColor='var(--gold)';" onmouseout="this.style.borderColor='var(--paper-edge)';">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="width:36px; height:36px; border-radius:50%; background:rgba(217,164,65,0.15); color:#8d6411; display:flex; align-items:center; justify-content:center; font-size:17px; flex-shrink:0;">📸</div>
          <div>
            <div style="font-size:13.5px; font-weight:600; color:var(--ink);">স্টাডি নোটস বা ডাউটের স্ন্যাপ শেয়ার করতে চান? নতুন পোস্ট লিখুন...</div>
            <div style="font-size:11.5px; color:var(--pencil);">ফটো স্ন্যাপ, ডাউট, স্টাডি টিপস বা ডেইলি গোল ট্যাগ সংযুক্ত করে শেয়ার করুন</div>
          </div>
        </div>
        <button class="btn btn-gold" style="padding:6px 14px; font-size:12px; border-radius:14px; font-weight:700; pointer-events:none; white-space:nowrap;">+ New Post</button>
      </div>

      <!-- Category Filter Tabs & Sorting Toolbar -->
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:14px;">
        <div style="display:flex; gap:6px; overflow-x:auto; padding-bottom:4px; -webkit-overflow-scrolling:touch; flex:1; min-width:260px;">
          <button class="chip-filter ${currentCommunityFilter==='all'?'active':''}" onclick="setCommunityFilter('all')">🌐 সব (${totalCount})</button>
          <button class="chip-filter ${currentCommunityFilter==='💡 ডাউট ও প্রশ্ন'?'active':''}" onclick="setCommunityFilter('💡 ডাউট ও প্রশ্ন')">💡 ডাউট (${doubtCount})</button>
          <button class="chip-filter ${currentCommunityFilter==='📸 স্টাডি স্ন্যাপ'?'active':''}" onclick="setCommunityFilter('📸 স্টাডি স্ন্যাপ')">📸 স্ন্যাপ</button>
          <button class="chip-filter ${currentCommunityFilter==='📚 স্টাডি টিপস'?'active':''}" onclick="setCommunityFilter('📚 স্টাডি টিপস')">📚 টিপস (${tipsCount})</button>
          <button class="chip-filter ${currentCommunityFilter==='🎯 ডেইলি গোল'?'active':''}" onclick="setCommunityFilter('🎯 ডেইলি গোল')">🎯 গোল (${goalCount})</button>
          <button class="chip-filter ${currentCommunityFilter==='📢 নোটিশ'?'active':''}" onclick="setCommunityFilter('📢 নোটিশ')">📢 নোটিশ (${noticeCount})</button>
        </div>

        <!-- Sorting Dropdown -->
        <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
          <label for="communitySortSelect" style="font-size:12px; font-weight:600; color:var(--pencil); margin-bottom:0; display:flex; align-items:center; gap:4px; cursor:pointer;">
            <span>⚡ সাজাও:</span>
          </label>
          <select 
            id="communitySortSelect" 
            class="community-sort-select" 
            onchange="setCommunitySort(this.value)"
            title="পোস্ট সাজানোর ক্রম নির্বাচন করুন"
          >
            <option value="newest" ${currentCommunitySort==='newest'?'selected':''}>⏱️ Newest (সর্বাধুনিক)</option>
            <option value="most_liked" ${currentCommunitySort==='most_liked'?'selected':''}>🔥 Most Liked (জনপ্রিয়)</option>
            <option value="most_commented" ${currentCommunitySort==='most_commented'?'selected':''}>💬 Most Commented (আলোচিত)</option>
            <option value="unanswered" ${currentCommunitySort==='unanswered'?'selected':''}>❓ Unanswered (উত্তরহীন ডাউট)</option>
          </select>
        </div>
      </div>
      ` : ''}

      <!-- Feed Stream of Posts -->
      <div id="communityFeedStream">
        ${postsHtml}
      </div>
    </div>
  `;
}

function renderCommunityLounge(){
  app.innerHTML = `
    ${header('স্টাডি আড্ডা ও ডাউট ফিড')}

    <!-- Profile Summary Card (Matching Dashboard Hero Card) -->
    ${getProfileSummaryCardHtml()}

    <!-- Community Feed Component Below Profile Summary -->
    ${renderCommunityFeedComponent()}

    <div class="center" style="margin-top:16px;">
      <a class="link-back" onclick="go(getLoggedStudent()?'studentDashboard':'landing')">← ফিরে যাও</a>
    </div>
    ${creditFooter()}
  `;

  if(currentCommunityViewMode === 'chats' && typeof initChatSwipeGestures === 'function'){
    setTimeout(initChatSwipeGestures, 20);
  }
}

window.setCommunityFilter = function(tag){
  currentCommunityFilter = tag;
  renderCommunityLounge();
};

window.focusCommentInput = function(postId){
  const el = document.getElementById('comment_input_' + postId);
  if(el){ el.focus(); }
};

window.submitNewPost = function(){
  if(document.getElementById('modalPostContent')){
    submitModalNewPost();
    return;
  }
  openNewPostModal();
};

window.togglePostReaction = function(postId, reactionType){
  const posts = getCommunityPosts();
  const post = posts.find(p => p.id === postId);
  if(!post) return;

  if(!post.reactions) post.reactions = { fire:0, idea:0, clap:0, heart:0 };
  if(!post.userReactions) post.userReactions = {};

  const hadReacted = !!post.userReactions[reactionType];
  if(hadReacted){
    post.reactions[reactionType] = Math.max(0, (post.reactions[reactionType] || 1) - 1);
    delete post.userReactions[reactionType];
  } else {
    post.reactions[reactionType] = (post.reactions[reactionType] || 0) + 1;
    post.userReactions[reactionType] = true;
    if(typeof playSfx === 'function') playSfx('hit');
  }

  saveCommunityPosts(posts);

  // Sync to Firebase Cloud Firestore
  if(window.fbSavePost){
    window.fbSavePost(post);
  }

  updateCommunityFeedLive();
};

window.submitPostComment = function(postId){
  const inputEl = document.getElementById('comment_input_' + postId) || document.getElementById('detail_comment_input');
  if(!inputEl) return;
  const text = inputEl.value.trim();
  if(!text){
    toast('মন্তব্য খালি রাখা যাবে না');
    return;
  }

  const stud = getLoggedStudent();
  const isTeacher = !!currentTeacher;
  let authorName = 'সাধারণ শিক্ষার্থী';
  let isPrivateStudent = false;

  if(isTeacher){
    authorName = (currentTeacher.name || 'শিক্ষক');
  } else if(stud && stud.name){
    authorName = stud.name;
    isPrivateStudent = true; // Logged-in private student
  } else {
    const authorEl = document.getElementById('comment_author_' + postId);
    if(authorEl && authorEl.value.trim()){
      authorName = authorEl.value.trim();
      localStorage.setItem('tuition_guest_author_name', authorName);
    } else {
      const saved = localStorage.getItem('tuition_guest_author_name');
      if(saved) authorName = saved;
    }
  }

  const posts = getCommunityPosts();
  const post = posts.find(p => p.id === postId);
  if(!post) return;

  if(!post.comments) post.comments = [];
  post.comments.push({
    id: 'c_' + Date.now(),
    authorName,
    isTeacher,
    isPrivateStudent,
    text,
    timestamp: Date.now()
  });

  saveCommunityPosts(posts);

  // Sync to Firebase Cloud Firestore
  if(window.fbSavePost){
    window.fbSavePost(post);
  }

  toast('মন্তব্য সফলভাবে যোগ হয়েছে!');
  if(typeof playSfx === 'function') playSfx('slash');
  updateCommunityFeedLive();
};

function formatTimeAgo(ms){
  if(!ms) return '';
  const diffSec = Math.floor((Date.now() - ms) / 1000);
  if(diffSec < 60) return 'এইমাত্র';
  const diffMin = Math.floor(diffSec / 60);
  if(diffMin < 60) return diffMin + ' মিনিট আগে';
  const diffHr = Math.floor(diffMin / 60);
  if(diffHr < 24) return diffHr + ' ঘণ্টা আগে';
  const diffDay = Math.floor(diffHr / 24);
  return diffDay + ' দিন আগে';
}

// ============================================================================
// ভুল খাতা (Mistake Notebook / Smart Revision System)
// ============================================================================

window.recordExamMistakes = function(exam, answers){
  if(!exam || !exam.questions || !answers) return;
  const stud = getLoggedStudent();
  const slug = stud ? stud.slug : (state.slug || 'general');
  const storageKey = 'tuition_mistakes_' + slug;

  try{
    let list = JSON.parse(localStorage.getItem(storageKey) || '[]');
    let addedCount = 0;

    exam.questions.forEach((q, idx) => {
      const given = answers[idx];
      if(given !== q.correct){
        // Wrong or unattempted
        const existingIdx = list.findIndex(m => m.text.trim() === q.text.trim());
        const mistakeItem = {
          id: 'mistake_' + Date.now() + '_' + idx,
          examCode: exam.code || '',
          examTitle: exam.title || '',
          subject: exam.subject || 'সাধারণ',
          text: q.text,
          options: q.options,
          correct: q.correct,
          lastGiven: given,
          timestamp: Date.now(),
          solved: false
        };

        if(existingIdx >= 0){
          list[existingIdx] = mistakeItem;
        } else {
          list.unshift(mistakeItem);
          addedCount++;
        }
      }
    });

    if(list.length > 150) list = list.slice(0, 150);
    localStorage.setItem(storageKey, JSON.stringify(list));
    if(addedCount > 0){
      console.log(`${addedCount} mistakes logged to notebook`);
    }
  }catch(e){
    console.warn('Failed to record mistakes:', e);
  }
};

window.getStudentMistakes = function(){
  const stud = getLoggedStudent();
  const slug = stud ? stud.slug : (state.slug || 'general');
  try{
    const raw = localStorage.getItem('tuition_mistakes_' + slug);
    return raw ? JSON.parse(raw) : [];
  }catch(e){
    return [];
  }
};

window.renderMistakeNotebook = function(){
  const mistakes = getStudentMistakes();
  const unsolved = mistakes.filter(m => !m.solved);

  const mistakesHtml = unsolved.length === 0 ? `
    <div class="empty-state">
      <div style="font-size:42px; margin-bottom:8px;">🎉</div>
      <b>তোমার ভুল খাতায় কোনো ভুল জমে নেই!</b>
      <p class="hint">পরীক্ষায় যেসব প্রশ্ন ভুল হয়, সেগুলো এখানে জমা হয়ে থাকে যাতে পরীক্ষার আগে রিভিশন দেওয়া যায়।</p>
    </div>
  ` : unsolved.map((m, idx) => {
    const givenLabel = (m.lastGiven === null || m.lastGiven === undefined) 
      ? 'উত্তর দেওনি' 
      : `${['ক','খ','গ','ঘ'][m.lastGiven]}) ${escapeHtml(m.options[m.lastGiven]||'')}`;
    const correctLabel = `${['ক','খ','গ','ঘ'][m.correct]}) ${escapeHtml(m.options[m.correct]||'')}`;

    return `
      <div class="card" style="margin-bottom:12px; border-left:4px solid var(--margin-red); padding:16px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
          <span style="font-size:12px; font-family:var(--font-mono); color:var(--pencil); background:#EEF3F8; padding:2px 8px; border-radius:6px;">
            ${escapeHtml(m.subject)} · ${escapeHtml(m.examTitle)}
          </span>
          <button class="info-btn" onclick="markMistakeSolved('${m.id}')" title="রিভিশন হয়েছে হিসেবে মার্ক করো" style="font-size:11.5px; color:var(--green); border-color:var(--green);">
            ✓ শিখে ফেলেছি
          </button>
        </div>
        <div class="q-text" style="font-size:14.5px; margin-bottom:8px;">${idx+1}. ${escapeHtml(m.text)}</div>
        <div style="font-size:13px; color:var(--red); margin-bottom:4px;">❌ তোমার ভুল উত্তর: ${givenLabel}</div>
        <div style="font-size:13px; color:var(--green); font-weight:600;">✅ সঠিক উত্তর: ${correctLabel}</div>
      </div>
    `;
  }).join('');

  app.innerHTML = `
    ${header('ভুল খাতা — স্মার্ট রিভিশন')}
    <div class="card" style="background: linear-gradient(135deg, #1F2A44 0%, #2A3B5C 100%); color:#fff; border:none;">
      <h2 style="color:#fff; margin-bottom:4px;">📖 আমার ভুল খাতা (${unsolved.length})</h2>
      <p style="font-size:13px; color:rgba(255,255,255,0.8); margin:0 0 12px 0;">
        তুমি যেসব পরীক্ষায় ভুল উত্তর দিয়েছো, সেগুলো এখানে স্বয়ংক্রিয়ভাবে জমা থাকে। পরীক্ষার আগের রাতে শুধু এই প্রশ্নগুলো প্র্যাকটিস করলে ভুল হওয়ার সম্ভাবনা শূন্যে নেমে আসে!
      </p>
      ${unsolved.length > 0 ? `
        <button class="btn btn-gold btn-block" onclick="startMistakeRevisionExam()" style="box-shadow:0 4px 14px rgba(0,0,0,0.3);">
          ✍️ শুধু এই ${unsolved.length}টি ভুল প্রশ্নের রিভিশন টেস্ট দাও
        </button>
      ` : ''}
    </div>

    <div>
      ${mistakesHtml}
    </div>

    <div class="center" style="margin-top:14px;">
      <a class="link-back" onclick="go(getLoggedStudent()?'studentDashboard':'landing')">← ফিরে যাও</a>
    </div>
    ${creditFooter()}
  `;
};

window.markMistakeSolved = function(id){
  const stud = getLoggedStudent();
  const slug = stud ? stud.slug : (state.slug || 'general');
  const storageKey = 'tuition_mistakes_' + slug;

  try{
    let list = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const item = list.find(m => m.id === id);
    if(item){
      item.solved = true;
      localStorage.setItem(storageKey, JSON.stringify(list));
      playSfx('victory');
      toast('অভিনন্দন! প্রশ্নটি শিখে নেওয়া হয়েছে হিসেবে মার্ক করা হলো 🎉');
      renderMistakeNotebook();
    }
  }catch(e){}
};

window.startMistakeRevisionExam = function(){
  const mistakes = getStudentMistakes().filter(m => !m.solved);
  if(mistakes.length === 0){
    toast('কোনো অমীমাংসিত ভুল প্রশ্ন নেই!');
    return;
  }

  const exam = {
    code: 'REV_' + Math.floor(Math.random()*1000),
    title: 'ভুল খাতা — স্পেশাল রিভিশন টেস্ট',
    subject: 'স্মার্ট রিভিশন',
    duration: Math.max(2, Math.ceil(mistakes.length * 1.2)),
    timerMode: 'total',
    isTreat: false,
    questions: mistakes.map(m => ({
      text: m.text,
      options: m.options,
      correct: m.correct,
      tag: m.subject
    }))
  };

  const stud = getLoggedStudent();
  const slug = stud ? stud.slug : 'revision';
  const name = stud ? stud.name : 'শিক্ষার্থী';

  go('studentExam', {
    exam,
    slug,
    name,
    attemptNumber: 1,
    viaCode: false,
    answers: new Array(exam.questions.length).fill(null),
    locked: new Array(exam.questions.length).fill(false),
    startedAt: Date.now(),
    qIndex: 0
  });
};
