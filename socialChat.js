// ============================================================================
// socialChat.js -- Study Adda Mini Social Media Personal Chat,
// Rich User Profiles, and Verified Batch Application System
// ============================================================================

// ----------------------------------------------------------------------------
// 1. User Profiles Management (Local + Cloud Firestore)
// ----------------------------------------------------------------------------
function getAllUserProfiles(){
  try {
    const raw = localStorage.getItem('tuition_user_profiles_v1');
    return raw ? JSON.parse(raw) : {};
  } catch(e){ return {}; }
}

function getLocalUserProfile(slug){
  if(!slug) return null;
  const all = getAllUserProfiles();
  return all[slug] || null;
}

function saveLocalUserProfile(profile){
  if(!profile || !profile.slug) return;
  const all = getAllUserProfiles();
  const safeProfile = { ...profile };
  delete safeProfile.password;
  all[profile.slug] = { ...(all[profile.slug] || {}), ...safeProfile, updatedAt: Date.now() };
  try {
    localStorage.setItem('tuition_user_profiles_v1', JSON.stringify(all));
  } catch(e){}
  if(typeof fbSaveUserProfile === 'function'){
    fbSaveUserProfile(all[profile.slug]);
  }
}

window.getCurrentUserIdentity = function(){
  const stud = typeof getLoggedStudent === 'function' ? getLoggedStudent() : null;
  const isTeacher = !!window.currentTeacher;

  if(isTeacher){
    return {
      slug: 'teacher_' + slugify(window.currentTeacher.name || 'mentor'),
      name: window.currentTeacher.name || 'কোর্স শিক্ষক',
      avatar: '👨‍🏫',
      role: 'teacher',
      isTeacher: true,
      isPrivateStudent: false,
      isVerified: true,
      badge: 'verified_teacher',
      institution: 'টিউশন একাডেমি মেন্টর'
    };
  }

  if(stud && stud.name){
    const prof = getLocalUserProfile(stud.slug) || {};
    const isPrivate = !!(stud.isPrivateStudent || stud.studentCode || prof.isPrivateStudent);
    const isVerified = !!(stud.isVerified || isPrivate || prof.isVerified);
    return {
      slug: stud.slug || slugify(stud.name),
      name: stud.name,
      avatar: stud.avatar || prof.avatar || (isPrivate ? '🎓' : '🧑‍🎓'),
      role: isPrivate ? 'private' : 'public',
      isTeacher: false,
      isPrivateStudent: isPrivate,
      isVerified: isVerified,
      badge: isVerified ? 'verified_private' : 'public_student',
      studentCode: stud.studentCode || prof.studentCode || '',
      institution: stud.institution || prof.institution || '',
      bio: stud.bio || prof.bio || ''
    };
  }

  // Guest / Unregistered Social Visitor
  const guestName = localStorage.getItem('tuition_guest_author_name') || 'সাধারণ শিক্ষার্থী';
  const guestSlug = 'guest_' + slugify(guestName);
  return {
    slug: guestSlug,
    name: guestName,
    avatar: '🧑‍🎓',
    role: 'guest',
    isTeacher: false,
    isPrivateStudent: false,
    isVerified: false,
    badge: 'public_student',
    institution: 'উন্মুক্ত শিক্ষার্থী'
  };
};

// ----------------------------------------------------------------------------
// 2. User Social Profile, Followers & Instagram/Facebook Style Profile Engine
// ----------------------------------------------------------------------------
const SOCIAL_GRAPH_STORAGE_KEY = 'tuition_social_graph_v4';

const COMMUNITY_STUDENT_ROSTER = [
  { slug: 'tanvir_hsc26', name: 'তানভীর আহমেদ', avatar: '🧑‍🎓', institution: 'নটর ডেম কলেজ', badge: 'verified_private', isPrivateStudent: true, bio: 'লক্ষ্য বুয়েট সিএসই 💻 | পদার্থবিজ্ঞান ও গণিত ভালোবাসি' },
  { slug: 'nusrat_physics', name: 'নুসরাত জাহান', avatar: '👩‍🎓', institution: 'ভিকারুননিসা নূন স্কুল অ্যান্ড কলেজ', badge: 'verified_private', isPrivateStudent: true, bio: 'এইচএসসি ২৬ ব্যাচ 📚 | নিয়মিত রিভিশন ও প্র্যাকটিস' },
  { slug: 'arafat_math', name: 'আরাফাত হোসেন', avatar: '📐', institution: 'ঢাকা রেসিডেনসিয়াল মডেল কলেজ', badge: 'verified_private', isPrivateStudent: true, bio: 'ম্যাথ অলিম্পিয়াড অনুরাগী ও স্টাডি আড্ডা এক্টিভ মেম্বার' },
  { slug: 'tasnim_buet', name: 'তাসনীম ফেরদৌস', avatar: '🔬', institution: 'রাজউক উত্তরা মডেল কলেজ', badge: 'verified_private', isPrivateStudent: true, bio: 'মেডিকেল ও ইঞ্জিনিয়ারিং ড্রিমার ✨' },
  { slug: 'nafis_ndc', name: 'নাফিস ইকবাল', avatar: '⭐', institution: 'নটর ডেম কলেজ', badge: 'verified_private', isPrivateStudent: true, bio: 'সায়েন্স ক্লাবের মেম্বার ও নিয়মিত নোট শেয়ারার' },
  { slug: 'fariha_chem', name: 'ফারিহা তাবাসসুম', avatar: '💡', institution: 'হলিক্রস কলেজ', badge: 'verified_private', isPrivateStudent: true, bio: 'অর্গানিক কেমিস্ট্রি ও বায়োলজি নোট মেকার 🌿' },
  { slug: 'rahim_biology', name: 'রহিম উল্লাহ', avatar: '🧑‍🎓', institution: 'চট্টগ্রাম কলেজ', badge: 'public_student', isPrivateStudent: false, bio: 'পড়াশোনায় কোনো শর্টকাট নেই 📖' },
  { slug: 'sadia_dhaka', name: 'সাদিয়া ইসলাম', avatar: '👩‍🎓', institution: 'আইডিয়াল স্কুল অ্যান্ড কলেজ', badge: 'public_student', isPrivateStudent: false, bio: 'ডেইলি স্টাডি গোল ও গ্রুপ প্র্যাকটিস 🎯' },
  { slug: 'ariyan_rahman', name: 'আরিয়ান রহমান', avatar: '🧑‍🎓', institution: 'ঢাকা কলেজ', badge: 'verified_private', isPrivateStudent: true, bio: 'ক্যালকুলাস ও ভেক্টর প্র্যাকটিসে ব্যস্ত' },
  { slug: 'tanzila_parvin', name: 'তানজিলা পারভীন', avatar: '👩‍🎓', institution: 'ভিকারুননিসা কলেজ', badge: 'verified_private', isPrivateStudent: true, bio: '১০০% ডাউট সলভ ও স্টাডি স্ট্রিক চ্যাম্পিয়ন' },
  { slug: 'teacher_saikat', name: 'সৈকত স্যার', avatar: '👨‍🏫', institution: 'হেড মেন্টর ও শিক্ষক', badge: 'verified_teacher', isTeacher: true, bio: 'পদার্থবিজ্ঞান ও গণিত মেন্টরিং এবং পরীক্ষার প্রস্তুতি' }
];

function getSeedPeersForSlug(slug){
  const peers = COMMUNITY_STUDENT_ROSTER.filter(p => p.slug !== slug);
  let hash = 0;
  for(let i=0; i<slug.length; i++) hash = ((hash << 5) - hash) + slug.charCodeAt(i);
  hash = Math.abs(hash);

  const followers = [];
  const following = [];
  for(let i=0; i<peers.length; i++){
    if((hash + i * 3) % 2 === 0 || i < 3) followers.push(peers[i].slug);
    if((hash + i * 5) % 2 === 0 || i === 0 || i === 2) following.push(peers[i].slug);
  }
  return { followers, following };
}

function getSocialGraph(){
  try {
    const raw = localStorage.getItem(SOCIAL_GRAPH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch(e){ return {}; }
}

function saveSocialGraph(graph){
  try {
    localStorage.setItem(SOCIAL_GRAPH_STORAGE_KEY, JSON.stringify(graph));
  } catch(e){}
}

window.getUserSocialStats = function(targetSlug){
  const graph = getSocialGraph();
  const currentMe = getCurrentUserIdentity();
  const meSlug = currentMe ? currentMe.slug : '';

  if(!graph[targetSlug] || !Array.isArray(graph[targetSlug].followers) || graph[targetSlug].followers.length === 0){
    const seeds = getSeedPeersForSlug(targetSlug);
    graph[targetSlug] = {
      followers: seeds.followers,
      following: seeds.following
    };
    saveSocialGraph(graph);
  }

  const targetData = graph[targetSlug] || { followers: [], following: [] };
  const myData = (meSlug && graph[meSlug]) ? graph[meSlug] : { followers: [], following: [] };

  const followersList = targetData.followers || [];
  const followingList = targetData.following || [];

  // Mutual following = Mutual Friends / সহপাঠী ফ্রেন্ডস
  const friendsList = followersList.filter(slug => followingList.includes(slug));

  const isFollowing = meSlug ? myData.following.includes(targetSlug) : false;
  const isFriend = meSlug ? (myData.following.includes(targetSlug) && myData.followers.includes(targetSlug)) : false;

  return {
    followersCount: followersList.length,
    followingCount: followingList.length,
    friendsCount: friendsList.length,
    followersList,
    followingList,
    friendsList,
    isFollowing,
    isFriend
  };
};

window.toggleFollowUser = function(targetSlug, targetName){
  const currentMe = getCurrentUserIdentity();
  if(!currentMe || !currentMe.slug){
    toast('ফলো করতে প্রথমে লগইন করুন');
    return;
  }
  if(currentMe.slug === targetSlug){
    toast('আপনি নিজেকে ফলো করতে পারবেন না');
    return;
  }

  const graph = getSocialGraph();
  const mySlug = currentMe.slug;

  if(!graph[mySlug]) {
    const seeds = getSeedPeersForSlug(mySlug);
    graph[mySlug] = { followers: seeds.followers, following: seeds.following };
  }
  if(!graph[targetSlug]) {
    const seeds = getSeedPeersForSlug(targetSlug);
    graph[targetSlug] = { followers: seeds.followers, following: seeds.following };
  }

  const myFollowing = graph[mySlug].following || [];
  const targetFollowers = graph[targetSlug].followers || [];

  const isAlreadyFollowing = myFollowing.includes(targetSlug);

  if(isAlreadyFollowing){
    // Unfollow
    graph[mySlug].following = myFollowing.filter(s => s !== targetSlug);
    graph[targetSlug].followers = targetFollowers.filter(s => s !== mySlug);
    toast(`${targetName || targetSlug}-কে আনফলো করা হয়েছে`);
  } else {
    // Follow
    if(!graph[mySlug].following.includes(targetSlug)) graph[mySlug].following.push(targetSlug);
    if(!graph[targetSlug].followers.includes(mySlug)) graph[targetSlug].followers.push(mySlug);
    if(typeof playSfx === 'function') playSfx('combo');
    toast(`🎉 আপনি এখন ${targetName || targetSlug}-কে ফলো করছেন!`);
  }

  saveSocialGraph(graph);
  openUserProfileModal(targetSlug, targetName);
};

window.toggleFriendUser = function(targetSlug, targetName){
  const currentMe = getCurrentUserIdentity();
  if(!currentMe || !currentMe.slug){
    toast('ফ্রেন্ড রিকোয়েস্ট পাঠাতে লগইন করুন');
    return;
  }
  if(currentMe.slug === targetSlug) return;

  const graph = getSocialGraph();
  const mySlug = currentMe.slug;

  if(!graph[mySlug]) {
    const seeds = getSeedPeersForSlug(mySlug);
    graph[mySlug] = { followers: seeds.followers, following: seeds.following };
  }
  if(!graph[targetSlug]) {
    const seeds = getSeedPeersForSlug(targetSlug);
    graph[targetSlug] = { followers: seeds.followers, following: seeds.following };
  }

  const isFriendNow = graph[mySlug].following.includes(targetSlug) && graph[mySlug].followers.includes(targetSlug);

  if(isFriendNow){
    // Remove mutual connection
    graph[mySlug].following = (graph[mySlug].following || []).filter(s => s !== targetSlug);
    graph[targetSlug].followers = (graph[targetSlug].followers || []).filter(s => s !== mySlug);
    toast('ফ্রেন্ড তালিকা থেকে সরানো হয়েছে');
  } else {
    // Make mutual friends
    if(!graph[mySlug].following.includes(targetSlug)) graph[mySlug].following.push(targetSlug);
    if(!graph[mySlug].followers.includes(targetSlug)) graph[mySlug].followers.push(targetSlug);
    if(!graph[targetSlug].followers.includes(mySlug)) graph[targetSlug].followers.push(mySlug);
    if(!graph[targetSlug].following.includes(mySlug)) graph[targetSlug].following.push(mySlug);
    if(typeof playSfx === 'function') playSfx('levelUp');
    toast(`🤝 ${targetName || targetSlug} এখন আপনার সহপাঠী ফ্রেন্ড!`);
  }

  saveSocialGraph(graph);
  openUserProfileModal(targetSlug, targetName);
};

window.userProfileCurrentTab = 'posts';
window.userProfileFriendsSubTab = 'followers';
window.userProfilePostViewMode = 'grid'; // 'grid' | 'feed'

window.getProfileComments = function(slug){
  if(!slug) return [];
  try{
    const raw = localStorage.getItem('tuition_profile_comments_' + slug);
    return raw ? JSON.parse(raw) : [];
  }catch(e){
    return [];
  }
};

window.saveProfileComments = function(slug, comments){
  if(!slug) return;
  try{
    localStorage.setItem('tuition_profile_comments_' + slug, JSON.stringify(comments));
  }catch(e){}
};

window.scrollProfileCommentsToBottom = function(smooth = true){
  const container = document.getElementById('profileCommentsScrollContainer');
  if(!container) return;
  const doScroll = () => {
    const target = container.scrollHeight;
    if(smooth && typeof container.scrollTo === 'function'){
      container.scrollTo({ top: target, behavior: 'smooth' });
    } else {
      container.scrollTop = target;
    }
  };
  doScroll();
  requestAnimationFrame(doScroll);
  setTimeout(doScroll, 80);
  setTimeout(doScroll, 200);
};

window.submitProfileComment = function(targetSlug, targetName){
  const input = document.getElementById('profile_comment_input_' + targetSlug);
  if(!input) return;
  const text = input.value.trim();
  if(!text){
    toast('মন্তব্য খালি রাখা যাবে না');
    return;
  }
  const me = getCurrentUserIdentity();
  const comments = getProfileComments(targetSlug);
  const newCommentId = 'pcom_' + Date.now();
  const newComment = {
    id: newCommentId,
    authorSlug: me.slug,
    authorName: me.name,
    authorAvatar: me.avatar || '🧑‍🎓',
    isTeacher: !!me.isTeacher,
    isPrivateStudent: !!me.isPrivateStudent,
    badgeHtml: me.isTeacher ? '<span class="badge-teacher" style="font-size:10px; padding:1px 6px;">👨‍🏫 শিক্ষক</span>' : (me.isPrivateStudent ? '<span class="badge-verified-gold" style="font-size:10px; padding:1px 6px;">🎓 শিক্ষার্থী</span>' : ''),
    text,
    timestamp: Date.now()
  };
  comments.push(newComment);
  saveProfileComments(targetSlug, comments);
  input.value = '';
  toast('প্রোফাইলে মন্তব্য সফলভাবে যোগ হয়েছে!');
  if(typeof playSfx === 'function') playSfx('slash');

  // Re-render modal on comments tab and auto-scroll to the bottom so latest comment is visible
  window.userProfileCurrentTab = 'comments';
  openUserProfileModal(targetSlug, targetName).then(() => {
    setTimeout(() => {
      scrollProfileCommentsToBottom(true);
      const newEl = document.getElementById('prof_comment_' + newCommentId);
      if(newEl){
        newEl.classList.add('new-comment-pulse');
        newEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 120);
  });
};

window.switchUserProfileTab = function(tab, targetSlug, fallbackName, subTab){
  window.userProfileCurrentTab = tab;
  if(subTab) window.userProfileFriendsSubTab = subTab;
  openUserProfileModal(targetSlug, fallbackName).then(() => {
    if(tab === 'comments'){
      setTimeout(() => {
        scrollProfileCommentsToBottom(false);
      }, 80);
    }
  });
};

window.switchUserProfilePostViewMode = function(mode, targetSlug, fallbackName){
  window.userProfilePostViewMode = mode;
  openUserProfileModal(targetSlug, fallbackName);
};

window.openUserProfileModal = async function(targetSlug, fallbackName){
  if(!targetSlug && fallbackName) targetSlug = slugify(fallbackName);
  if(!targetSlug) return;

  const currentMe = getCurrentUserIdentity();
  let user = getLocalUserProfile(targetSlug);

  // If not local, query cloud or synthesize from posts
  if(!user && typeof fbGetUserProfile === 'function'){
    try {
      user = await fbGetUserProfile(targetSlug);
    } catch(e){}
  }

  if(!user){
    // Check known roster
    const inRoster = COMMUNITY_STUDENT_ROSTER.find(r => r.slug === targetSlug || r.name === fallbackName);
    const isTeacherTarget = targetSlug.includes('teacher') || (inRoster && inRoster.isTeacher);
    user = {
      slug: targetSlug,
      name: fallbackName || (inRoster ? inRoster.name : (isTeacherTarget ? 'কোর্স শিক্ষক' : 'শিক্ষার্থী')),
      avatar: inRoster ? inRoster.avatar : (isTeacherTarget ? '👨‍🏫' : '🧑‍🎓'),
      isTeacher: isTeacherTarget,
      isPrivateStudent: inRoster ? !!inRoster.isPrivateStudent : (isTeacherTarget ? false : true),
      isVerified: inRoster ? (inRoster.badge === 'verified_private' || inRoster.isTeacher) : isTeacherTarget,
      badge: inRoster ? inRoster.badge : (isTeacherTarget ? 'verified_teacher' : 'verified_private'),
      institution: inRoster ? inRoster.institution : (isTeacherTarget ? 'হেড মেন্টর ও শিক্ষক' : 'নটর ডেম কলেজ'),
      bio: inRoster ? inRoster.bio : 'এইচএসসি ও বোর্ড পরীক্ষার প্রস্তুতি নিচ্ছি 📚 | স্টাডি আড্ডায় সক্রিয়',
      createdAt: Date.now() - 86400000 * 12
    };
  }

  const isMe = currentMe.slug === user.slug || (currentMe.name && currentMe.name === user.name);
  const isTeacher = !!user.isTeacher;
  const isPrivate = !!(user.isPrivateStudent || (user.badge === 'verified_private'));
  const isVerified = isTeacher || isPrivate || !!user.isVerified;

  let badgeBadgeHtml = '';
  if(isTeacher){
    badgeBadgeHtml = '<span class="badge-teacher" style="font-size:11px; padding:3px 9px; border-radius:12px; font-weight:700;">👨‍🏫 ভেরিফাইড শিক্ষক ✓</span>';
  } else if(isVerified){
    badgeBadgeHtml = '<span class="badge-verified-gold" style="font-size:11px; padding:3px 9px; border-radius:12px; font-weight:700;">⭐ ভেরিফাইড প্রাইভেট শিক্ষার্থী ✓</span>';
  } else {
    badgeBadgeHtml = '<span class="badge-public-stud" style="font-size:11px; padding:3px 9px; border-radius:12px; font-weight:600;">🧑‍🎓 সাধারণ শিক্ষার্থী</span>';
  }

  // Count past posts by this user in Study Adda
  const allPosts = typeof getCommunityPosts === 'function' ? getCommunityPosts() : [];
  const userPosts = allPosts.filter(p => {
    const pSlug = p.authorSlug || slugify(p.authorName || '');
    return (pSlug === user.slug) || (p.authorName && p.authorName.trim() === user.name.trim());
  });

  // Extract photos from user's posts for Instagram media gallery tab
  const userPhotos = userPosts.filter(p => !!(p.imageUrl || p.mediaUrl));

  // Profile Comments & Wall Messages
  const profileComments = getProfileComments(user.slug);

  // Social Stats (Followers, Following, Friends)
  const socialStats = getUserSocialStats(user.slug);

  const activeTab = window.userProfileCurrentTab || 'posts';
  const friendsSubTab = window.userProfileFriendsSubTab || 'followers';
  const postViewMode = window.userProfilePostViewMode || 'grid';

  // Aesthetic High-Resolution Cover Photo Banner (Facebook / Instagram Style)
  const defaultCovers = [
    'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1000&auto=format&fit=crop&q=80', // Galaxy
    'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=1000&auto=format&fit=crop&q=80', // Library
    'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1000&auto=format&fit=crop&q=80', // Campus
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1000&auto=format&fit=crop&q=80'  // Sunset
  ];
  let coverPhotoUrl = user.coverPhoto;
  if(!coverPhotoUrl){
    let hash = 0;
    for(let i=0; i<user.slug.length; i++) hash = ((hash << 5) - hash) + user.slug.charCodeAt(i);
    coverPhotoUrl = defaultCovers[Math.abs(hash) % defaultCovers.length];
  }

  const old = document.getElementById('userSocialProfileModalOverlay');
  if(old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'userSocialProfileModalOverlay';
  overlay.className = 'community-modal-overlay user-profile-overlay';
  overlay.onclick = function(e){
    if(e.target === overlay) overlay.remove();
  };

  overlay.innerHTML = `
    <div class="community-modal user-social-profile-card" style="max-width:580px; width:100%; margin:10px auto; padding:0; border-radius:24px; box-shadow:0 30px 70px -15px rgba(0,0,0,0.55); border:1.5px solid var(--paper-edge);" onclick="event.stopPropagation()">
      
      <!-- Profile Header Cover Photo Banner (Facebook / Instagram Style) -->
      <div style="height:155px; background:url('${escapeHtml(coverPhotoUrl)}') center/cover no-repeat; position:relative; display:flex; align-items:flex-start; justify-content:space-between; padding:14px 16px;">
        <div style="position:absolute; inset:0; background:linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0.65) 100%); pointer-events:none;"></div>
        
        <div style="position:relative; z-index:2;">
          ${isMe ? `
            <button class="camera-aux-btn" style="background:rgba(15,23,42,0.65); backdrop-filter:blur(8px); color:#fff; border:1px solid rgba(255,255,255,0.3); font-size:11.5px; padding:5px 12px; border-radius:20px; display:inline-flex; align-items:center; gap:5px; cursor:pointer; font-weight:600; box-shadow:0 2px 8px rgba(0,0,0,0.3);" onclick="openChangeCoverPhotoModal()">
              <span>📷</span> কভার পরিবর্তন
            </button>
          ` : `
            <span style="background:rgba(15,23,42,0.55); backdrop-filter:blur(6px); color:#fff; font-size:11px; padding:4px 10px; border-radius:14px; font-weight:600; display:inline-flex; align-items:center; gap:4px;">
              <span>🎓</span> স্টাডি প্রোফাইল
            </span>
          `}
        </div>

        <button class="reaction-btn" style="position:relative; z-index:2; background:rgba(15,23,42,0.65); backdrop-filter:blur(8px); color:#fff; border:1px solid rgba(255,255,255,0.25); border-radius:50%; width:34px; height:34px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:16px; box-shadow:0 2px 8px rgba(0,0,0,0.3);" onclick="document.getElementById('userSocialProfileModalOverlay').remove()" title="বন্ধ করুন">✕</button>
      </div>

      <!-- Avatar & Main Social Header -->
      <div class="user-profile-body-section" style="padding:0 22px 24px 22px; position:relative;">
        <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:-48px; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
          
          <!-- Avatar with Instagram Story Ring -->
          <div style="position:relative; width:96px; height:96px; border-radius:50%; background:linear-gradient(45deg, #F59E0B, #EC4899, #8B5CF6); padding:3.5px; box-shadow:0 8px 24px rgba(0,0,0,0.25);">
            <div style="width:100%; height:100%; border-radius:50%; background:#fff; display:flex; align-items:center; justify-content:center; font-size:46px; overflow:hidden; border:2.5px solid #fff;">
              ${user.avatarPhoto 
                ? `<img src="${escapeHtml(user.avatarPhoto)}" alt="avatar" style="width:100%; height:100%; object-fit:cover;">`
                : (user.avatar || (isTeacher ? '👨‍🏫' : (isPrivate ? '🎓' : '🧑‍🎓')))}
            </div>

            <!-- Verified Checkmark Badge -->
            ${isVerified ? `
              <div style="position:absolute; bottom:2px; right:2px; background:${isTeacher ? '#2563EB' : '#F59E0B'}; color:#fff; border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; font-size:12px; border:2.5px solid #fff; font-weight:800; box-shadow:0 2px 6px rgba(0,0,0,0.25);" title="${isTeacher ? 'ভেরিফাইড শিক্ষক' : 'ভেরিফাইড শিক্ষার্থী'}">✓</div>
            ` : `
              <div style="position:absolute; bottom:3px; right:3px; background:#10B981; border-radius:50%; width:14px; height:14px; border:2.5px solid #fff; box-shadow:0 1px 4px rgba(0,0,0,0.2);" title="অনলাইন"></div>
            `}

            <!-- Change Avatar Button for Own Profile -->
            ${isMe ? `
              <button onclick="openChangeAvatarModal()" style="position:absolute; top:2px; right:2px; background:#1F2A44; color:#fff; border:2px solid #fff; border-radius:50%; width:26px; height:26px; display:flex; align-items:center; justify-content:center; font-size:11px; cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,0.3);" title="প্রোফাইল ছবি পরিবর্তন">📷</button>
            ` : ''}
          </div>

          <!-- Instagram / Facebook Style Action Buttons -->
          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            ${isMe ? `
              <button class="btn btn-outline" style="font-size:12.5px; padding:7px 15px; border-radius:20px; font-weight:700; display:inline-flex; align-items:center; gap:5px;" onclick="openEditProfileModal()">
                <span>✏️</span> প্রোফাইল এডিট
              </button>
              ${!isVerified ? `
                <button class="btn btn-gold" style="font-size:12.5px; padding:7px 14px; border-radius:20px; font-weight:700; display:inline-flex; align-items:center; gap:4px;" onclick="openApplyVerifiedModal()">
                  <span>⭐</span> ব্যাচ আবেদন
                </button>
              ` : ''}
            ` : `
              <!-- Follow / Following Button (Instagram Style) -->
              <button 
                class="btn ${socialStats.isFollowing ? 'btn-outline' : 'btn-primary'}" 
                style="font-size:13px; padding:7px 16px; border-radius:20px; font-weight:700; display:inline-flex; align-items:center; gap:6px; ${!socialStats.isFollowing ? 'background:linear-gradient(135deg, #2563EB, #1D4ED8); box-shadow:0 3px 10px rgba(37,99,235,0.3);' : ''}" 
                onclick="toggleFollowUser('${user.slug}', '${escapeHtml(user.name)}')"
              >
                ${socialStats.isFollowing ? '<span>✓ ফলোয়িং</span>' : '<span>➕ ফলো করুন</span>'}
              </button>

              <!-- Mutual Friends / Add Friend Button (Facebook Style) -->
              <button 
                class="btn btn-outline" 
                style="font-size:13px; padding:7px 14px; border-radius:20px; font-weight:700; display:inline-flex; align-items:center; gap:5px; ${socialStats.isFriend ? 'border-color:#10B981; color:#065F46; background:#ECFDF5;' : ''}" 
                onclick="toggleFriendUser('${user.slug}', '${escapeHtml(user.name)}')"
                title="${socialStats.isFriend ? 'আপনার সহপাঠী ফ্রেন্ড' : 'মিউচুয়াল ফ্রেন্ড হিসেবে যুক্ত করুন'}"
              >
                ${socialStats.isFriend ? '<span>🤝 ফ্রেন্ডস ✓</span>' : '<span>➕ ফ্রেন্ডস</span>'}
              </button>

              <!-- Message Button -->
              <button 
                class="btn btn-gold" 
                style="font-size:13px; padding:7px 15px; border-radius:20px; font-weight:700; display:inline-flex; align-items:center; gap:5px; box-shadow:0 3px 10px rgba(217,164,65,0.3);" 
                onclick="document.getElementById('userSocialProfileModalOverlay').remove(); openDirectChat('${user.slug}', '${escapeHtml(user.name)}', '${user.avatar || '🧑‍🎓'}', '${user.badge || 'public'}')"
              >
                <span>💬 মেসেজ</span>
              </button>
            `}
          </div>
        </div>

        <!-- Name, Handle, Institution & Bio -->
        <div style="margin-bottom:14px;">
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <h2 style="margin:0; font-size:21px; font-weight:800; color:var(--ink); line-height:1.2;">${escapeHtml(user.name)}</h2>
            ${badgeBadgeHtml}
          </div>

          <div style="font-family:var(--font-mono); font-size:12.5px; color:var(--pencil); margin-top:3px;">
            @${escapeHtml(user.slug)} ${user.studentCode ? `· আইডি: #${escapeHtml(user.studentCode)}` : ''}
          </div>

          ${user.institution ? `
            <div style="font-size:13px; color:var(--ink); margin-top:6px; display:flex; align-items:center; gap:6px;">
              <span>🏫</span> <b>${escapeHtml(user.institution)}</b>
            </div>
          ` : ''}

          <p style="font-size:13.5px; color:var(--ink); margin:8px 0 14px 0; line-height:1.5;">
            ${escapeHtml(user.bio || 'এইচএসসি ও বোর্ড পরীক্ষার প্রস্তুতি নিচ্ছি 📚 | নিয়মিত স্টাডি আড্ডায় সক্রিয়')}
          </p>
        </div>

        <!-- Instagram / Facebook Social Counters Row (Posts, Followers, Following, Friends) -->
        <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:6px; background:var(--paper); border:1.5px solid var(--paper-edge); border-radius:16px; padding:12px 6px; text-align:center; margin-bottom:16px; box-shadow:0 2px 6px rgba(0,0,0,0.03);">
          
          <!-- 1. Posts Count -->
          <div style="cursor:pointer; padding:2px;" onclick="switchUserProfileTab('posts', '${user.slug}', '${escapeHtml(user.name)}')">
            <div style="font-size:18px; font-weight:800; color:var(--ink); line-height:1.1;">${userPosts.length}</div>
            <div style="font-size:11px; color:var(--pencil); font-weight:700; margin-top:3px;">পোস্ট</div>
          </div>

          <!-- 2. Followers Count -->
          <div style="cursor:pointer; padding:2px; border-left:1px solid var(--paper-edge);" onclick="switchUserProfileTab('friends', '${user.slug}', '${escapeHtml(user.name)}', 'followers')">
            <div style="font-size:18px; font-weight:800; color:#2563EB; line-height:1.1;">${socialStats.followersCount}</div>
            <div style="font-size:11px; color:var(--pencil); font-weight:700; margin-top:3px;">ফলোয়ার</div>
          </div>

          <!-- 3. Following Count -->
          <div style="cursor:pointer; padding:2px; border-left:1px solid var(--paper-edge);" onclick="switchUserProfileTab('friends', '${user.slug}', '${escapeHtml(user.name)}', 'following')">
            <div style="font-size:18px; font-weight:800; color:#D97706; line-height:1.1;">${socialStats.followingCount}</div>
            <div style="font-size:11px; color:var(--pencil); font-weight:700; margin-top:3px;">ফলোয়িং</div>
          </div>

          <!-- 4. Friends Count (Mutual Friends) -->
          <div style="cursor:pointer; padding:2px; border-left:1px solid var(--paper-edge);" onclick="switchUserProfileTab('friends', '${user.slug}', '${escapeHtml(user.name)}', 'friends')">
            <div style="font-size:18px; font-weight:800; color:#10B981; line-height:1.1;">${socialStats.friendsCount}</div>
            <div style="font-size:11px; color:var(--pencil); font-weight:700; margin-top:3px;">ফ্রেন্ডস</div>
          </div>

        </div>

        <!-- Instagram-Style Tab Switcher Bar -->
        <div class="tab-group" style="margin-bottom:14px; overflow-x:auto;">
          <button type="button" class="tab-btn ${activeTab==='posts'?'active':''}" style="flex:1; min-width:85px; font-size:12px; font-weight:700;" onclick="switchUserProfileTab('posts', '${user.slug}', '${escapeHtml(user.name)}')">
            📸 পোস্ট (${userPosts.length})
          </button>
          <button type="button" class="tab-btn ${activeTab==='comments'?'active':''}" style="flex:1; min-width:85px; font-size:12px; font-weight:700;" onclick="switchUserProfileTab('comments', '${user.slug}', '${escapeHtml(user.name)}')">
            💬 মন্তব্য (${profileComments.length})
          </button>
          <button type="button" class="tab-btn ${activeTab==='friends'?'active':''}" style="flex:1; min-width:105px; font-size:12px; font-weight:700;" onclick="switchUserProfileTab('friends', '${user.slug}', '${escapeHtml(user.name)}')">
            👥 সহপাঠী ও ফ্রেন্ডস
          </button>
          <button type="button" class="tab-btn ${activeTab==='photos'?'active':''}" style="flex:1; min-width:80px; font-size:12px; font-weight:700;" onclick="switchUserProfileTab('photos', '${user.slug}', '${escapeHtml(user.name)}')">
            🖼️ ছবি (${userPhotos.length})
          </button>
          <button type="button" class="tab-btn ${activeTab==='about'?'active':''}" style="flex:1; min-width:80px; font-size:12px; font-weight:700;" onclick="switchUserProfileTab('about', '${user.slug}', '${escapeHtml(user.name)}')">
            ℹ️ পরিচিতি
          </button>
        </div>

        <!-- Tab 1: Past Posts (Instagram Grid + Facebook Feed Mode Switcher) -->
        ${activeTab === 'posts' ? `
          <div style="margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:12px; color:var(--pencil); font-weight:600;">
              প্রকাশিত পোস্টসমূহ (${userPosts.length}):
            </div>
            <div style="display:flex; gap:4px; background:var(--paper); padding:2px; border-radius:8px; border:1px solid var(--paper-edge);">
              <button 
                type="button" 
                style="border:none; background:${postViewMode==='grid'?'var(--card-bg, #fff)':'transparent'}; color:${postViewMode==='grid'?'var(--ink)':'var(--pencil)'}; font-size:11.5px; padding:3px 8px; border-radius:6px; font-weight:700; cursor:pointer; box-shadow:${postViewMode==='grid'?'0 1px 3px rgba(0,0,0,0.1)':'none'};" 
                onclick="switchUserProfilePostViewMode('grid', '${user.slug}', '${escapeHtml(user.name)}')"
                title="গ্রিড ভিউ (Instagram Grid)"
              >
                🔲 গ্রিড
              </button>
              <button 
                type="button" 
                style="border:none; background:${postViewMode==='feed'?'var(--card-bg, #fff)':'transparent'}; color:${postViewMode==='feed'?'var(--ink)':'var(--pencil)'}; font-size:11.5px; padding:3px 8px; border-radius:6px; font-weight:700; cursor:pointer; box-shadow:${postViewMode==='feed'?'0 1px 3px rgba(0,0,0,0.1)':'none'};" 
                onclick="switchUserProfilePostViewMode('feed', '${user.slug}', '${escapeHtml(user.name)}')"
                title="ফিড ভিউ (Facebook Feed)"
              >
                📑 ফিড
              </button>
            </div>
          </div>

          ${userPosts.length === 0 ? `
            <div style="text-align:center; padding:36px 14px; color:var(--pencil); font-size:13px; background:var(--paper); border-radius:14px; border:1px dashed var(--paper-edge);">
              <div style="font-size:38px; margin-bottom:8px;">📸</div>
              <div style="font-weight:700; color:var(--ink); margin-bottom:4px;">এখনো কোনো পোস্ট প্রকাশ করা হয়নি</div>
              <div style="font-size:12px; margin-bottom:12px;">স্টাডি আড্ডায় নিজের প্রশ্ন বা নোট শেয়ার করে যুক্ত হোন।</div>
              ${isMe ? `
                <button class="btn btn-gold" style="font-size:12px; padding:6px 14px; border-radius:16px;" onclick="document.getElementById('userSocialProfileModalOverlay').remove(); if(typeof openCreatePostModal==='function') openCreatePostModal();">
                  ✍️ প্রথম পোস্ট তৈরি করুন
                </button>
              ` : ''}
            </div>
          ` : (postViewMode === 'grid' ? `
            <!-- Instagram 3-Column Square Grid Layout -->
            <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:6px;">
              ${userPosts.map(p => {
                const hasImg = !!(p.imageUrl || p.mediaUrl);
                const likes = p.likesCount || (p.likes && p.likes.length) || (p.reactions && Object.values(p.reactions).reduce((a,b)=>a+b,0)) || 0;
                const comments = (p.comments && p.comments.length) || 0;
                return `
                  <div 
                    style="aspect-ratio:1/1; border-radius:10px; overflow:hidden; position:relative; cursor:pointer; background:#1E293B; border:1px solid var(--paper-edge); transition:transform 0.15s ease;" 
                    onclick="document.getElementById('userSocialProfileModalOverlay').remove(); if(typeof openPostDetailModal==='function') openPostDetailModal('${p.id}');"
                  >
                    ${hasImg ? `
                      <img src="${escapeHtml(p.imageUrl || p.mediaUrl)}" alt="post" style="width:100%; height:100%; object-fit:cover;" loading="lazy">
                    ` : `
                      <div style="width:100%; height:100%; background:linear-gradient(135deg, #1E293B, #334155); color:#fff; padding:10px; display:flex; flex-direction:column; justify-content:space-between; font-size:11px; line-height:1.35;">
                        <span style="background:rgba(217,164,65,0.25); color:#FCD34D; font-size:9.5px; padding:1px 5px; border-radius:4px; align-self:flex-start;">#${escapeHtml(p.tag || 'স্টাডি')}</span>
                        <div style="overflow:hidden; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical;">
                          ${escapeHtml(p.content || '')}
                        </div>
                        <span style="font-size:9.5px; opacity:0.75;">${p.timestamp ? formatRelativeChatTime(p.timestamp) : ''}</span>
                      </div>
                    `}

                    <!-- Hover/Stat Overlay (Instagram Style) -->
                    <div style="position:absolute; inset:0; background:rgba(0,0,0,0.45); display:flex; align-items:center; justify-content:center; gap:8px; color:#fff; font-size:11.5px; font-weight:700; opacity:0; transition:opacity 0.15s ease;" onmouseenter="this.style.opacity='1'" onmouseleave="this.style.opacity='0'">
                      <span>❤️ ${likes}</span>
                      <span>💬 ${comments}</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          ` : `
            <!-- Facebook Card Feed View -->
            <div style="display:flex; flex-direction:column; gap:10px;">
              ${userPosts.map(p => {
                const hasMedia = !!(p.imageUrl || p.mediaUrl);
                const postTimeStr = p.timestamp ? formatRelativeChatTime(p.timestamp) : 'পূর্বে';
                const likes = p.likesCount || (p.likes && p.likes.length) || (p.reactions && Object.values(p.reactions).reduce((a,b)=>a+b,0)) || 0;
                const comments = (p.comments && p.comments.length) || 0;
                return `
                  <div style="background:var(--paper); border:1px solid var(--paper-edge); border-radius:14px; padding:12px; cursor:pointer; transition:transform 0.15s ease, box-shadow 0.15s ease; box-shadow:0 1px 4px rgba(0,0,0,0.04);" onclick="document.getElementById('userSocialProfileModalOverlay').remove(); if(typeof openPostDetailModal==='function') openPostDetailModal('${p.id}')">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                      <span style="background:rgba(217,164,65,0.12); color:#B45309; font-weight:700; font-size:11px; padding:2px 8px; border-radius:12px;">#${escapeHtml(p.tag || 'স্টাডি')}</span>
                      <span style="font-size:11px; color:var(--pencil);">${postTimeStr}</span>
                    </div>
                    <div style="font-size:13px; color:var(--ink); line-height:1.45; margin-bottom:8px;">
                      ${escapeHtml(p.content.slice(0, 130))}${p.content.length > 130 ? '...' : ''}
                    </div>
                    ${hasMedia ? `
                      <div style="width:100%; height:140px; border-radius:10px; overflow:hidden; margin-bottom:8px; background:#000;">
                        <img src="${escapeHtml(p.imageUrl || p.mediaUrl)}" alt="post photo" style="width:100%; height:100%; object-fit:cover;" loading="lazy">
                      </div>
                    ` : ''}
                    <div style="display:flex; justify-content:space-between; align-items:center; font-size:11.5px; color:var(--pencil); border-top:1px solid var(--paper-edge); padding-top:8px;">
                      <div style="display:flex; gap:12px;">
                        <span>❤️ ${likes} লাইক</span>
                        <span>💬 ${comments} মন্তব্য</span>
                      </div>
                      <span style="color:var(--gold); font-weight:700;">সম্পূর্ণ পোস্ট দেখুন →</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `)}
        ` : ''}

        <!-- Tab: Profile Comments & Wall (with Auto-Scroll-to-Bottom) -->
        ${activeTab === 'comments' ? `
          <div style="display:flex; flex-direction:column; gap:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div style="font-size:12px; color:var(--pencil); font-weight:600;">
                প্রোফাইল ওয়াল ও শুভেচ্ছা বার্তা (${profileComments.length}):
              </div>
              <span style="font-size:11px; color:var(--gold); font-weight:700;">✨ নতুন মন্তব্য স্বয়ংক্রিয়ভাবে নিচে যুক্ত হবে</span>
            </div>

            <div id="profileCommentsScrollContainer" class="profile-comments-scroll" style="max-height:340px; overflow-y:auto; padding:6px 2px; display:flex; flex-direction:column; gap:8px;">
              ${profileComments.length === 0 ? `
                <div style="text-align:center; padding:32px 14px; color:var(--pencil); font-size:13px; background:var(--paper); border-radius:12px; border:1px dashed var(--paper-edge);">
                  <div style="font-size:32px; margin-bottom:6px;">💬</div>
                  <div style="font-weight:700; color:var(--ink); margin-bottom:4px;">এখনো কোনো প্রোফাইল মন্তব্য বা শুভেচ্ছা নেই</div>
                  <div>সহপাঠীর প্রোফাইল ওয়ালে প্রথম শুভেচ্ছা বার্তাটি আপনিই লিখুন!</div>
                </div>
              ` : profileComments.map(c => `
                <div id="prof_comment_${c.id}" style="background:var(--paper); border:1px solid var(--paper-edge); border-radius:12px; padding:10px 12px; font-size:13px; transition:all 0.3s ease;">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; flex-wrap:wrap; gap:4px;">
                    <div style="display:flex; align-items:center; gap:6px; cursor:pointer;" onclick="openUserProfileModal('${escapeHtml(c.authorSlug || '')}', '${escapeHtml(c.authorName || '')}')">
                      <span style="font-size:16px;">${c.authorAvatar || '🧑‍🎓'}</span>
                      <b style="color:var(--ink); font-size:12.5px;">${escapeHtml(c.authorName || 'সহপাঠী')}</b>
                      ${c.badgeHtml || ''}
                    </div>
                    <span style="font-size:10.5px; color:var(--pencil);">${formatRelativeChatTime(c.timestamp)}</span>
                  </div>
                  <div style="color:var(--ink); line-height:1.45; word-break:break-word; padding-left:24px;">
                    ${escapeHtml(c.text)}
                  </div>
                </div>
              `).join('')}
            </div>

            <!-- Add Profile Comment Bar (Facebook / Instagram Style) -->
            <div style="display:flex; align-items:center; gap:8px; margin-top:4px; padding-top:8px; border-top:1px solid var(--paper-edge);">
              <div style="width:30px; height:30px; border-radius:50%; background:var(--paper); border:1px solid var(--paper-edge); display:flex; align-items:center; justify-content:center; font-size:15px; flex-shrink:0;">
                ${currentMe.avatar || '🧑‍🎓'}
              </div>
              <input type="text" id="profile_comment_input_${user.slug}" placeholder="${escapeHtml(currentMe.name)} হিসেবে বার্তা বা শুভেচ্ছা লিখুন..." style="flex:1; margin-bottom:0; font-size:12.5px; padding:8px 12px; border-radius:18px; border:1px solid var(--paper-edge); background:var(--paper); color:var(--ink);" onkeydown="if(event.key==='Enter') submitProfileComment('${user.slug}', '${escapeHtml(user.name)}')">
              <button class="btn btn-gold" style="padding:8px 16px; font-size:12px; font-weight:700; border-radius:18px; flex-shrink:0;" onclick="submitProfileComment('${user.slug}', '${escapeHtml(user.name)}')">পাঠাও</button>
            </div>
          </div>
        ` : ''}

        <!-- Tab 2: Followers, Following & Friends List (Interactive Instagram/Facebook Connection System) -->
        ${activeTab === 'friends' ? `
          <div>
            <!-- Subtab Pills -->
            <div style="display:flex; gap:6px; margin-bottom:12px; background:var(--paper); padding:3px; border-radius:12px; border:1px solid var(--paper-edge);">
              <button 
                type="button" 
                style="flex:1; border:none; background:${friendsSubTab==='followers'?'var(--card-bg, #fff)':'transparent'}; color:${friendsSubTab==='followers'?'#2563EB':'var(--pencil)'}; font-size:12px; padding:5px 8px; border-radius:8px; font-weight:700; cursor:pointer; box-shadow:${friendsSubTab==='followers'?'0 1px 3px rgba(0,0,0,0.1)':'none'};" 
                onclick="switchUserProfileTab('friends', '${user.slug}', '${escapeHtml(user.name)}', 'followers')"
              >
                👥 ফলোয়ার (${socialStats.followersCount})
              </button>
              <button 
                type="button" 
                style="flex:1; border:none; background:${friendsSubTab==='following'?'var(--card-bg, #fff)':'transparent'}; color:${friendsSubTab==='following'?'#D97706':'var(--pencil)'}; font-size:12px; padding:5px 8px; border-radius:8px; font-weight:700; cursor:pointer; box-shadow:${friendsSubTab==='following'?'0 1px 3px rgba(0,0,0,0.1)':'none'};" 
                onclick="switchUserProfileTab('friends', '${user.slug}', '${escapeHtml(user.name)}', 'following')"
              >
                ➕ ফলোয়িং (${socialStats.followingCount})
              </button>
              <button 
                type="button" 
                style="flex:1; border:none; background:${friendsSubTab==='friends'?'var(--card-bg, #fff)':'transparent'}; color:${friendsSubTab==='friends'?'#10B981':'var(--pencil)'}; font-size:12px; padding:5px 8px; border-radius:8px; font-weight:700; cursor:pointer; box-shadow:${friendsSubTab==='friends'?'0 1px 3px rgba(0,0,0,0.1)':'none'};" 
                onclick="switchUserProfileTab('friends', '${user.slug}', '${escapeHtml(user.name)}', 'friends')"
              >
                🤝 ফ্রেন্ডস (${socialStats.friendsCount})
              </button>
            </div>

            <!-- List of Peer Cards -->
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${(() => {
                const targetList = (friendsSubTab === 'followers') 
                  ? socialStats.followersList 
                  : ((friendsSubTab === 'following') ? socialStats.followingList : socialStats.friendsList);

                if(!targetList || targetList.length === 0){
                  return `
                    <div style="text-align:center; padding:32px 10px; color:var(--pencil); font-size:13px;">
                      <div style="font-size:32px; margin-bottom:6px;">👥</div>
                      এখানে এখনো কোনো শিক্ষার্থী যুক্ত হয়নি।
                    </div>
                  `;
                }

                const myStats = getUserSocialStats(currentMe.slug);

                return targetList.map(peerSlug => {
                  const peerProfile = getLocalUserProfile(peerSlug) || COMMUNITY_STUDENT_ROSTER.find(r => r.slug === peerSlug) || {
                    slug: peerSlug,
                    name: peerSlug.replace(/_/g, ' '),
                    avatar: '🧑‍🎓',
                    institution: 'সহপাঠী শিক্ষার্থী'
                  };

                  const isFollowingThisPeer = myStats.followingList.includes(peerSlug);
                  const isPeerMe = currentMe.slug === peerSlug;

                  return `
                    <div style="background:var(--paper); border:1px solid var(--paper-edge); border-radius:12px; padding:8px 12px; display:flex; justify-content:space-between; align-items:center; box-shadow:0 1px 3px rgba(0,0,0,0.03);">
                      <div style="display:flex; align-items:center; gap:10px; cursor:pointer; flex:1;" onclick="openUserProfileModal('${peerProfile.slug}', '${escapeHtml(peerProfile.name)}')">
                        <div style="width:38px; height:38px; border-radius:50%; background:var(--paper); display:flex; align-items:center; justify-content:center; font-size:20px; border:1.5px solid var(--paper-edge); overflow:hidden;">
                          ${peerProfile.avatarPhoto ? `<img src="${escapeHtml(peerProfile.avatarPhoto)}" alt="" style="width:100%; height:100%; object-fit:cover;">` : (peerProfile.avatar || '🧑‍🎓')}
                        </div>
                        <div>
                          <div style="font-size:13.5px; font-weight:700; color:var(--ink); line-height:1.2;">${escapeHtml(peerProfile.name)}</div>
                          <div style="font-size:11px; color:var(--pencil);">@${escapeHtml(peerProfile.slug)} ${peerProfile.institution ? `· ${escapeHtml(peerProfile.institution)}` : ''}</div>
                        </div>
                      </div>

                      <div style="display:flex; gap:6px; align-items:center;">
                        ${!isPeerMe ? `
                          <button 
                            class="btn ${isFollowingThisPeer ? 'btn-outline' : 'btn-primary'}" 
                            style="font-size:11.5px; padding:4px 10px; border-radius:14px; font-weight:700;" 
                            onclick="toggleFollowUser('${peerProfile.slug}', '${escapeHtml(peerProfile.name)}')"
                          >
                            ${isFollowingThisPeer ? 'ফলোয়িং ✓' : '➕ ফলো'}
                          </button>
                        ` : ''}
                        <button class="btn btn-outline" style="font-size:11.5px; padding:4px 9px; border-radius:14px;" onclick="openUserProfileModal('${peerProfile.slug}', '${escapeHtml(peerProfile.name)}')">
                          প্রোফাইল
                        </button>
                      </div>
                    </div>
                  `;
                }).join('');
              })()}
            </div>
          </div>
        ` : ''}

        <!-- Tab 3: Photos & Media Gallery (Instagram Style Photo Wall) -->
        ${activeTab === 'photos' ? `
          <div>
            <div style="font-size:12px; color:var(--pencil); margin-bottom:10px;">
              📸 আপলোডকৃত সকল স্টাডি ছবি ও ডাউট সমাধান (${userPhotos.length}):
            </div>
            ${userPhotos.length === 0 ? `
              <div style="text-align:center; padding:36px 14px; color:var(--pencil); font-size:13px; background:var(--paper); border-radius:14px; border:1px dashed var(--paper-edge);">
                <div style="font-size:36px; margin-bottom:6px;">🖼️</div>
                এখনো কোনো ছবি বা মিডিয়া পোস্ট প্রকাশ করা হয়নি।
              </div>
            ` : `
              <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:6px;">
                ${userPhotos.map(p => `
                  <div 
                    style="aspect-ratio:1/1; border-radius:10px; overflow:hidden; cursor:pointer; background:#000; position:relative;"
                    onclick="if(typeof openChatImageLightbox==='function'){ openChatImageLightbox('${escapeHtml(p.imageUrl || p.mediaUrl)}', 'পোস্ট ছবি'); } else { window.open('${escapeHtml(p.imageUrl || p.mediaUrl)}'); }"
                  >
                    <img src="${escapeHtml(p.imageUrl || p.mediaUrl)}" alt="photo" style="width:100%; height:100%; object-fit:cover;" loading="lazy">
                    <div style="position:absolute; bottom:0; inset-x:0; background:linear-gradient(transparent, rgba(0,0,0,0.7)); padding:4px 6px; font-size:10px; color:#fff;">
                      ❤️ ${(p.likes && p.likes.length) || p.likesCount || 0}
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        ` : ''}

        <!-- Tab 4: About & Achievements -->
        ${activeTab === 'about' ? `
          <div style="background:var(--paper); border:1px solid var(--paper-edge); border-radius:14px; padding:16px; font-size:13px; display:flex; flex-direction:column; gap:12px; box-shadow:0 1px 4px rgba(0,0,0,0.03);">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--paper-edge); padding-bottom:8px;">
              <span style="color:var(--pencil);">🏫 শিক্ষাপ্রতিষ্ঠান:</span>
              <span style="font-weight:700; color:var(--ink);">${escapeHtml(user.institution || 'উন্মুক্ত শিক্ষার্থী')}</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--paper-edge); padding-bottom:8px;">
              <span style="color:var(--pencil);">⭐ প্রোফাইল স্ট্যাটাস:</span>
              <span style="font-weight:700; color:var(--green);">${isVerified ? 'ভেরিফাইড শিক্ষার্থী ✓' : 'সাধারণ শিক্ষার্থী 🌐'}</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--paper-edge); padding-bottom:8px;">
              <span style="color:var(--pencil);">❤️ মোট প্রাপ্ত লাইক:</span>
              <span style="font-weight:700; color:#EF4444;">${userPosts.reduce((acc, p) => acc + (p.likesCount || (p.likes && p.likes.length) || 0), 0)} টি লাইক</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--paper-edge); padding-bottom:8px;">
              <span style="color:var(--pencil);">🔥 মোট স্টাডি অর্জন:</span>
              <span style="font-weight:700; color:#D97706;">🥇 সক্রিয় স্টাডি মেম্বার</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="color:var(--pencil);">📅 অ্যাকাউন্টের বয়স:</span>
              <span style="font-weight:700; color:var(--ink);">${user.createdAt ? new Date(user.createdAt).toLocaleDateString('bn-BD', { month:'long', year:'numeric' }) : '২০২৬'}</span>
            </div>
          </div>
        ` : ''}

      </div>
    </div>
  `;

  document.body.appendChild(overlay);
};

// ----------------------------------------------------------------------------
// Cover Photo Changer Modal (Facebook / Instagram Style)
// ----------------------------------------------------------------------------
window.openChangeCoverPhotoModal = function(){
  const old = document.getElementById('coverPhotoChangerOverlay');
  if(old) old.remove();

  const presets = [
    { name: 'গ্যালাক্সি স্টাডি', url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=800&auto=format&fit=crop&q=80' },
    { name: 'বুকশেলফ ও লাইব্রেরি', url: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800&auto=format&fit=crop&q=80' },
    { name: 'স্বপ্ন ক্যাম্পাস', url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&auto=format&fit=crop&q=80' },
    { name: 'গোল্ডেন সানরাইজ', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80' },
    { name: 'মিনিমাল স্টাডি ডেস্ক', url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&auto=format&fit=crop&q=80' },
    { name: 'সাকুরা গার্ডেন', url: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=800&auto=format&fit=crop&q=80' }
  ];

  const overlay = document.createElement('div');
  overlay.id = 'coverPhotoChangerOverlay';
  overlay.className = 'community-modal-overlay';
  overlay.onclick = (e) => { if(e.target === overlay) overlay.remove(); };

  overlay.innerHTML = `
    <div class="community-modal" style="max-width:440px;" onclick="event.stopPropagation()">
      <div class="community-modal-header">
        <h3 style="margin:0; font-size:16.5px; color:var(--ink);">🎨 কভার ফটো পরিবর্তন করুন</h3>
        <button class="reaction-btn" style="padding:4px 9px;" onclick="document.getElementById('coverPhotoChangerOverlay').remove()">✕</button>
      </div>

      <div class="community-modal-body">
        <div style="font-size:12.5px; color:var(--pencil); margin-bottom:12px;">
          আপনার পছন্দমতো স্টাডি ব্যাকগ্রাউন্ড নির্বাচন করুন অথবা নিজের ছবি আপলোড করুন:
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:16px;">
          ${presets.map((p, idx) => `
            <div style="border-radius:10px; overflow:hidden; border:2px solid var(--paper-edge); cursor:pointer; height:74px; position:relative;" onclick="saveSelectedCoverPhoto('${p.url}')">
              <img src="${p.url}" alt="${p.name}" style="width:100%; height:100%; object-fit:cover;">
              <div style="position:absolute; inset:0; background:rgba(0,0,0,0.35); display:flex; align-items:center; justify-content:center; color:#fff; font-size:11px; font-weight:700;">${p.name}</div>
            </div>
          `).join('')}
        </div>

        <div style="border-top:1px dashed var(--paper-edge); padding-top:14px;">
          <label class="field-label">📁 নিজের ডিভাইস থেকে ছবি আপলোড করুন:</label>
          <input type="file" id="customCoverFileInput" accept="image/*" style="font-size:12px; margin-bottom:10px;" onchange="handleCustomCoverFileChosen(event)">
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
};

window.saveSelectedCoverPhoto = function(coverUrl){
  const me = getCurrentUserIdentity();
  if(!me || !me.slug) return;
  const prof = getLocalUserProfile(me.slug) || { ...me };
  prof.coverPhoto = coverUrl;
  saveLocalUserProfile(prof);
  if(typeof saveUserProfile === 'function') saveUserProfile(prof);
  toast('কভার ফটো সফলভাবে সংরক্ষিত হয়েছে! 🎨');
  const overlay = document.getElementById('coverPhotoChangerOverlay');
  if(overlay) overlay.remove();
  openUserProfileModal(me.slug, me.name);
};

window.handleCustomCoverFileChosen = function(e){
  const file = e.target.files && e.target.files[0];
  if(!file) return;
  if(file.size > 8 * 1024 * 1024){
    toast('ছবির সাইজ ৮ মেগাবাইটের কম হতে হবে');
    return;
  }
  const reader = new FileReader();
  reader.onload = function(event){
    saveSelectedCoverPhoto(event.target.result);
  };
  reader.readAsDataURL(file);
};

window.openChangeAvatarModal = function(){
  openEditProfileModal();
};

// ----------------------------------------------------------------------------
// 3. Edit Profile Modal
// ----------------------------------------------------------------------------
window.openEditProfileModal = function(){
  const me = getCurrentUserIdentity();
  const prof = getLocalUserProfile(me.slug) || {};

  const old = document.getElementById('editUserProfileModalOverlay');
  if(old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'editUserProfileModalOverlay';
  overlay.className = 'community-modal-overlay';
  overlay.onclick = function(e){
    if(e.target === overlay) overlay.remove();
  };

  overlay.innerHTML = `
    <div class="community-modal" style="max-width:440px;" onclick="event.stopPropagation()">
      <div class="community-modal-header">
        <h3 style="margin:0; font-size:16.5px; color:var(--ink);">✏️ প্রোফাইল ও বায়ো সম্পাদনা</h3>
        <button class="reaction-btn" style="padding:4px 9px;" onclick="document.getElementById('editUserProfileModalOverlay').remove()">✕</button>
      </div>

      <div class="community-modal-body">
        <label class="field-label">পুরো নাম</label>
        <input type="text" id="editProfName" value="${escapeHtml(me.name)}">

        <label class="field-label">কলেজ / শিক্ষাপ্রতিষ্ঠান</label>
        <input type="text" id="editProfInst" placeholder="যেমন: নটর ডেম কলেজ" value="${escapeHtml(prof.institution || me.institution || '')}">

        <label class="field-label">স্টাডি লক্ষ্য বা বায়ো (Bio)</label>
        <input type="text" id="editProfBio" placeholder="যেমন: HSC '26 / লক্ষ্য BUET CSE" value="${escapeHtml(prof.bio || me.bio || '')}">

        <label class="field-label">অ্যাভাটার ইমোজি</label>
        <div style="display:flex; gap:8px; margin-bottom:14px; font-size:22px;">
          ${['🧑‍🎓', '🎓', '🔬', '📐', '⭐', '🚀', '💡', '📚'].map(emoji => `
            <button type="button" class="reaction-btn" style="padding:6px 10px; font-size:20px;" onclick="document.getElementById('editProfAvatar').value='${emoji}'; document.getElementById('editProfAvatarPhoto').value=''; toast('নির্বাচিত: ${emoji}');">${emoji}</button>
          `).join('')}
        </div>
        <input type="hidden" id="editProfAvatar" value="${me.avatar || '🧑‍🎓'}">

        <label class="field-label">📷 নিজের গ্যালারি থেকে প্রোফাইল ছবি (ঐচ্ছিক)</label>
        <input type="file" id="editProfAvatarFile" accept="image/*" style="font-size:12px; margin-bottom:14px;" onchange="handleAvatarFileChosen(event)">
        <input type="hidden" id="editProfAvatarPhoto" value="${prof.avatarPhoto || ''}">

        <button class="btn btn-gold btn-block" onclick="saveEditedUserProfile()">💾 প্রোফাইল সংরক্ষণ করো</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
};

window.handleAvatarFileChosen = function(e){
  const file = e.target.files && e.target.files[0];
  if(!file) return;
  if(file.size > 5 * 1024 * 1024){
    toast('ছবির সাইজ ৫ মেগাবাইটের কম হতে হবে');
    return;
  }
  const reader = new FileReader();
  reader.onload = function(event){
    const el = document.getElementById('editProfAvatarPhoto');
    if(el) el.value = event.target.result;
    toast('ছবি নির্বাচিত হয়েছে! সংরক্ষণ বাটনে চাপুন 📸');
  };
  reader.readAsDataURL(file);
};

window.saveEditedUserProfile = function(){
  const name = ((document.getElementById('editProfName')||{}).value||'').trim();
  const inst = ((document.getElementById('editProfInst')||{}).value||'').trim();
  const bio = ((document.getElementById('editProfBio')||{}).value||'').trim();
  const avatar = ((document.getElementById('editProfAvatar')||{}).value||'🧑‍🎓').trim();
  const avatarPhoto = ((document.getElementById('editProfAvatarPhoto')||{}).value||'').trim();

  if(!name){ toast('নাম খালি রাখা যাবে না'); return; }

  const me = getCurrentUserIdentity();
  const prof = getLocalUserProfile(me.slug) || {};
  const updated = {
    ...prof,
    ...me,
    name,
    institution: inst,
    bio,
    avatar,
    avatarPhoto: avatarPhoto || prof.avatarPhoto || ''
  };

  saveLocalUserProfile(updated);
  if(typeof saveUserProfile === 'function') saveUserProfile(updated);

  // Update session
  const stud = typeof getLoggedStudent === 'function' ? getLoggedStudent() : null;
  if(stud){
    stud.name = name;
    stud.avatar = avatar;
    stud.avatarPhoto = updated.avatarPhoto;
    stud.institution = inst;
    stud.bio = bio;
    setLoggedStudent(stud);
  } else {
    localStorage.setItem('tuition_guest_author_name', name);
  }

  const modal = document.getElementById('editUserProfileModalOverlay');
  if(modal) modal.remove();

  toast('🎉 আপনার সোশ্যাল প্রোফাইল আপডেট হয়েছে!');
  if(typeof playSfx === 'function') playSfx('combo');
  if(typeof renderCommunityLounge === 'function') renderCommunityLounge();
};

// // ----------------------------------------------------------------------------
// 4. Personal 1-on-1 Direct Chat Implementation & Active Conversations
// ----------------------------------------------------------------------------
let activeDirectChatInfo = null;
const CONVERSATIONS_STORAGE_KEY = 'tuition_active_conversations_v3';

function getChatStorageKey(chatId){
  return 'tuition_chat_msgs_' + chatId;
}

function getLocalChatMessages(chatId){
  try {
    const raw = localStorage.getItem(getChatStorageKey(chatId));
    return raw ? JSON.parse(raw) : [];
  } catch(e){ return []; }
}

function saveLocalChatMessages(chatId, msgs){
  try {
    localStorage.setItem(getChatStorageKey(chatId), JSON.stringify(msgs));
  } catch(e){}
}

function getDefaultSeedConversations(meSlug){
  const now = Date.now();
  return [
    {
      chatId: 'chat__' + ['teacher_mentor', meSlug || 'student'].sort().join('__'),
      peerSlug: 'teacher_mentor',
      peerName: 'সৈকত স্যার (কোর্স শিক্ষক)',
      peerAvatar: '👨‍🏫',
      peerBadge: 'verified_teacher',
      peerRole: 'teacher',
      peerInstitution: 'কোর্স মেন্টর & স্পেশালিস্ট',
      lastMessage: 'আসসালামু আলাইকুম! গণিত ও পদার্থবিজ্ঞানের যেকোনো ডাউট বা অধ্যায়ের প্রশ্ন থাকলে এখানে মেসেজ দাও। 📚',
      lastSenderSlug: 'teacher_mentor',
      lastSenderName: 'সৈকত স্যার',
      lastMessageAt: now - 1000 * 60 * 18,
      unreadCount: 1,
      status: 'delivered',
      isOnline: true
    },
    {
      chatId: 'chat__' + ['samia_hsc26', meSlug || 'student'].sort().join('__'),
      peerSlug: 'samia_hsc26',
      peerName: 'সামিয়া আক্তার (ভেরিফাইড স্টুডেন্ট)',
      peerAvatar: '🎓',
      peerBadge: 'verified_private',
      peerRole: 'student',
      peerInstitution: 'নটর ডেম কলেজ · HSC \'26',
      lastMessage: 'কালকের উইকলি মডেল টেস্টের প্রিপারেশন কেমন? চলো একসাথে গুরুত্বপূর্ণ প্রশ্নগুলো রিভিশন করি! 🎯',
      lastSenderSlug: 'samia_hsc26',
      lastSenderName: 'সামিয়া আক্তার',
      lastMessageAt: now - 1000 * 60 * 75,
      unreadCount: 0,
      status: 'read',
      isOnline: true
    },
    {
      chatId: 'chat__' + ['rakib_hsc26', meSlug || 'student'].sort().join('__'),
      peerSlug: 'rakib_hsc26',
      peerName: 'রাকিব হাসান',
      peerAvatar: '🧑‍🎓',
      peerBadge: 'public_student',
      peerRole: 'student',
      peerInstitution: 'ঢাকা রেসিডেন্সিয়াল · সাধারণ লার্নার',
      lastMessage: 'ভাইয়া, কমিউনিটি ফিডে ডাউট পোস্টটার চমৎকার সমাধান পেয়েছি, ধন্যবাদ!',
      lastSenderSlug: meSlug || 'student',
      lastSenderName: 'আপনি',
      lastMessageAt: now - 1000 * 60 * 240,
      unreadCount: 0,
      status: 'read',
      isOnline: false
    }
  ];
}

window.sortConversationsList = function(convs){
  if(!Array.isArray(convs)) return [];
  return convs.sort((a, b) => {
    // Pinned conversations always appear at top of inbox
    const aPinned = !!a.isPinned;
    const bPinned = !!b.isPinned;
    if(aPinned && !bPinned) return -1;
    if(!aPinned && bPinned) return 1;
    if(aPinned && bPinned){
      return (b.pinnedAt || 0) - (a.pinnedAt || 0) || (b.lastMessageAt || 0) - (a.lastMessageAt || 0);
    }
    return (b.lastMessageAt || 0) - (a.lastMessageAt || 0);
  });
};

window.getActiveConversations = function(){
  const me = typeof getCurrentUserIdentity === 'function' ? getCurrentUserIdentity() : { slug:'student' };
  try {
    const raw = localStorage.getItem(CONVERSATIONS_STORAGE_KEY);
    if(!raw){
      const initial = getDefaultSeedConversations(me.slug);
      localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if(!Array.isArray(parsed) || parsed.length === 0){
      const initial = getDefaultSeedConversations(me.slug);
      localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const list = parsed.map(c => ({
      ...c,
      isArchived: !!c.isArchived,
      isPinned: !!c.isPinned,
      pinnedAt: c.pinnedAt || (c.isPinned ? (c.lastMessageAt || 1) : 0)
    }));
    return sortConversationsList(list);
  } catch(e){
    return getDefaultSeedConversations(me.slug);
  }
};

window.saveActiveConversations = function(convs){
  try {
    localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(convs));
  } catch(e){}
};

function recordChatMessageInConversation(chatId, messageObj, peerInfo){
  const convs = getActiveConversations();
  const me = getCurrentUserIdentity();
  let index = convs.findIndex(c => c.chatId === chatId);

  const peerSlug = (peerInfo && peerInfo.peerSlug) || (messageObj.senderSlug === me.slug ? (peerInfo && peerInfo.peerSlug) : messageObj.senderSlug);
  const peerName = (peerInfo && peerInfo.peerName) || messageObj.senderName || peerSlug;
  const peerAvatar = (peerInfo && peerInfo.peerAvatar) || messageObj.senderAvatar || '🧑‍🎓';
  const peerBadge = (peerInfo && (peerInfo.peerBadge || peerInfo.peerRole)) || messageObj.senderBadge || 'student';
  const isMe = messageObj.senderSlug === me.slug;
  const isAudioMsg = !!(messageObj.audioUrl || messageObj.audioLink || messageObj.messageType === 'voice_clip');
  const isPhotoMsg = !!(messageObj.imageUrl || messageObj.imageLink || messageObj.mediaUrl);
  const lastSummary = messageObj.text || (isAudioMsg ? '🎤 ভয়েস মেসেজ' : (isPhotoMsg ? '📷 ফটো' : ''));

  const isPinned = index > -1 ? !!convs[index].isPinned : false;
  const pinnedAt = index > -1 && convs[index].pinnedAt ? convs[index].pinnedAt : 0;

  const updatedRecord = {
    chatId,
    peerSlug,
    peerName,
    peerAvatar,
    peerBadge,
    peerRole: (peerInfo && peerInfo.peerRole) || peerBadge,
    peerInstitution: (peerInfo && peerInfo.peerInstitution) || '',
    lastMessage: lastSummary,
    lastSenderSlug: messageObj.senderSlug,
    lastSenderName: messageObj.senderName,
    lastMessageAt: messageObj.timestamp || Date.now(),
    unreadCount: isMe ? 0 : ((index > -1 && convs[index].unreadCount ? convs[index].unreadCount : 0) + (activeDirectChatInfo && activeDirectChatInfo.chatId === chatId ? 0 : 1)),
    status: messageObj.status || 'sent',
    isOnline: true,
    isArchived: false, // Receiving or sending a message brings chat back to active inbox
    isPinned,
    pinnedAt
  };

  if(index > -1){
    convs.splice(index, 1);
  }
  convs.unshift(updatedRecord);
  sortConversationsList(convs);
  saveActiveConversations(convs);

  // If Chat List view is currently open in community tab, refresh its stream
  if(window.currentCommunityViewMode === 'chats' && typeof refreshCommunityChatListStream === 'function'){
    refreshCommunityChatListStream();
  }
}

function formatRelativeChatTime(timestamp){
  if(!timestamp) return '';
  const now = Date.now();
  const diff = now - timestamp;
  if(diff < 60000) return 'এইমাত্র';
  if(diff < 3600000) return Math.floor(diff/60000) + ' মি. আগে';
  if(diff < 86400000) {
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
  }
  const days = Math.floor(diff/86400000);
  if(days === 1) return 'গতকাল';
  if(days < 7) return days + ' দিন আগে';
  return new Date(timestamp).toLocaleDateString([], { month:'short', day:'numeric' });
}

window.openDirectChat = function(peerSlug, peerName, peerAvatar, peerRole){
  const me = getCurrentUserIdentity();
  if(!peerSlug && peerName) peerSlug = slugify(peerName);
  if(!peerSlug){ toast('চ্যাট শুরু করা যায়নি'); return; }

  if(peerSlug === me.slug){
    toast('আপনি নিজের সাথেই চ্যাট করছেন!');
  }

  // Create deterministic chat ID
  const parts = [me.slug, peerSlug].sort();
  const chatId = 'chat__' + parts[0] + '__' + parts[1];

  activeDirectChatInfo = {
    chatId,
    peerSlug,
    peerName: peerName || peerSlug,
    peerAvatar: peerAvatar || '🧑‍🎓',
    peerRole: peerRole || 'student'
  };

  // Render floating chat drawer
  renderDirectChatDrawer();

  // Update conversation bookkeeping in active list & reset unread
  const convs = getActiveConversations();
  const existingConv = convs.find(c => c.chatId === chatId);
  if(existingConv){
    existingConv.unreadCount = 0;
    saveActiveConversations(convs);
  } else {
    convs.unshift({
      chatId,
      peerSlug,
      peerName: peerName || peerSlug,
      peerAvatar: peerAvatar || '🧑‍🎓',
      peerBadge: peerRole || 'student',
      peerRole: peerRole || 'student',
      peerInstitution: '',
      lastMessage: 'নতুন কথোপকথন শুরু হয়েছে 💬',
      lastSenderSlug: me.slug,
      lastSenderName: me.name,
      lastMessageAt: Date.now(),
      unreadCount: 0,
      status: 'active',
      isOnline: true
    });
    saveActiveConversations(convs);
  }

  // Mark local messages from peer as read immediately
  const localMsgs = getLocalChatMessages(chatId);
  let localNeedsSave = false;
  localMsgs.forEach(m => {
    if(m.senderSlug !== me.slug && m.status !== 'read'){
      m.status = 'read';
      m.isRead = true;
      localNeedsSave = true;
    }
  });
  if(localNeedsSave){
    saveLocalChatMessages(chatId, localMsgs);
  }

  // Update Firestore message documents and conversation read receipt once recipient opens chat
  if(typeof fbMarkChatMessagesAsRead === 'function'){
    fbMarkChatMessagesAsRead(chatId, me.slug);
  } else if(typeof fbUpdateMessageState === 'function'){
    fbUpdateMessageState(chatId, {
      isRead: true,
      readBy: [me.slug],
      readAt: Date.now()
    });
  }

  // If Chat List view is currently open, refresh badge
  if(window.currentCommunityViewMode === 'chats' && typeof refreshCommunityChatListStream === 'function'){
    refreshCommunityChatListStream();
  }

  // Listen to Firestore real-time updates for this chat with E2EE participant context
  if(typeof fbListenChatMessages === 'function'){
    fbListenChatMessages(chatId, me.slug, activeDirectChatInfo.peerSlug, (cloudMsgs) => {
      if(activeDirectChatInfo && activeDirectChatInfo.chatId === chatId){
        if(cloudMsgs && cloudMsgs.length > 0){
          saveLocalChatMessages(chatId, cloudMsgs);
          renderChatMessagesList(cloudMsgs, true);
          scrollChatToBottom(true);
          const latest = cloudMsgs[cloudMsgs.length - 1];
          recordChatMessageInConversation(chatId, latest, activeDirectChatInfo);

          // Once recipient has opened this conversation, mark any new incoming peer message as read in Firestore
          const hasUnreadFromPeer = cloudMsgs.some(m => m.senderSlug !== me.slug && m.status !== 'read');
          if(hasUnreadFromPeer && typeof fbMarkChatMessagesAsRead === 'function'){
            fbMarkChatMessagesAsRead(chatId, me.slug);
          }
        }
      }
    });
  }

  // Listen to Firestore real-time typing status for this chat
  if(typeof fbListenTypingStatus === 'function'){
    fbListenTypingStatus(chatId, (typingMap) => {
      if(activeDirectChatInfo && activeDirectChatInfo.chatId === chatId){
        updateDirectChatTypingUI(typingMap);
      }
    });
  }
};

// ============================================================================
// Real-time Chat Typing Status Management
// ============================================================================
let localTypingTimer = null;
let lastTypingPulseTime = 0;
let isLocallyTypingState = false;
let peerTypingSafetyTimeout = null;

function updateDirectChatTypingUI(typingMap){
  if(!activeDirectChatInfo) return;
  const { peerSlug, peerName } = activeDirectChatInfo;
  const indicatorEl = document.getElementById('directChatTypingIndicator');
  const typingTextEl = document.getElementById('directChatTypingText');
  const headerSubtitleEl = document.getElementById('directChatHeaderSubtitle');
  if(!indicatorEl || !typingTextEl) return;

  if(peerTypingSafetyTimeout){
    clearTimeout(peerTypingSafetyTimeout);
    peerTypingSafetyTimeout = null;
  }

  const peerData = typingMap && typingMap[peerSlug];
  const now = Date.now();
  const isTyping = !!(peerData && peerData.isTyping && (now - (peerData.updatedAt || 0) < 6500));

  if(isTyping){
    const displayName = peerData.name || peerName || 'সহপাঠী';
    typingTextEl.innerHTML = `<strong class="typing-peer-name">${escapeHtml(displayName)}</strong> is typing...`;
    indicatorEl.style.display = 'flex';

    if(headerSubtitleEl){
      headerSubtitleEl.innerHTML = `<span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#10B981; box-shadow:0 0 6px #10B981;"></span> <span style="color:#FCD34D; font-style:italic; font-weight:600;">...is typing</span>`;
    }

    const scrollContainer = document.getElementById('directChatMessagesScroll');
    if(scrollContainer){
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }

    // Safety fallback to hide if heartbeat stops
    peerTypingSafetyTimeout = setTimeout(() => {
      if(indicatorEl) indicatorEl.style.display = 'none';
      if(headerSubtitleEl){
        headerSubtitleEl.innerHTML = `<span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#10B981;"></span> অনলাইন`;
      }
    }, 5500);
  } else {
    indicatorEl.style.display = 'none';
    if(headerSubtitleEl){
      headerSubtitleEl.innerHTML = `<span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#10B981;"></span> অনলাইন`;
    }
  }
}

window.handleDirectChatInput = function(e){
  if(!activeDirectChatInfo) return;
  const input = e && e.target ? e.target : document.getElementById('directChatInput');
  if(!input) return;

  const text = input.value;
  const { chatId } = activeDirectChatInfo;
  const me = getCurrentUserIdentity();
  const now = Date.now();

  // If input is empty, immediately clear typing state
  if(!text || text.trim().length === 0){
    if(isLocallyTypingState){
      isLocallyTypingState = false;
      if(localTypingTimer){
        clearTimeout(localTypingTimer);
        localTypingTimer = null;
      }
      if(typeof fbSetTypingStatus === 'function'){
        fbSetTypingStatus(chatId, me.slug, me.name, false);
      }
    }
    return;
  }

  // Text is present: push typing status if not already typing or pulse heartbeat every 2s
  if(!isLocallyTypingState || (now - lastTypingPulseTime > 2000)){
    isLocallyTypingState = true;
    lastTypingPulseTime = now;
    if(typeof fbSetTypingStatus === 'function'){
      fbSetTypingStatus(chatId, me.slug, me.name, true);
    }
  }

  // Reset inactivity countdown (2.5 seconds after last keystroke)
  if(localTypingTimer){
    clearTimeout(localTypingTimer);
  }
  localTypingTimer = setTimeout(() => {
    if(isLocallyTypingState && activeDirectChatInfo && activeDirectChatInfo.chatId === chatId){
      isLocallyTypingState = false;
      if(typeof fbSetTypingStatus === 'function'){
        fbSetTypingStatus(chatId, me.slug, me.name, false);
      }
    }
  }, 2500);
};

window.handleDirectChatBlur = function(){
  if(isLocallyTypingState && activeDirectChatInfo){
    setTimeout(() => {
      const activeInput = document.getElementById('directChatInput');
      if(document.activeElement !== activeInput && isLocallyTypingState && activeDirectChatInfo){
        isLocallyTypingState = false;
        const me = getCurrentUserIdentity();
        if(typeof fbSetTypingStatus === 'function'){
          fbSetTypingStatus(activeDirectChatInfo.chatId, me.slug, me.name, false);
        }
      }
    }, 400);
  }
};

function renderDirectChatDrawer(){
  if(!activeDirectChatInfo) return;
  const { chatId, peerSlug, peerName, peerAvatar } = activeDirectChatInfo;
  const me = getCurrentUserIdentity();

  const old = document.getElementById('directChatDrawer');
  if(old) old.remove();

  const drawer = document.createElement('div');
  drawer.id = 'directChatDrawer';
  drawer.className = 'chat-drawer-container';

  drawer.innerHTML = `
    <!-- Chat Header -->
    <div style="padding:10px 14px; background:linear-gradient(135deg, #1F2A44, #2A3B60); color:#fff; display:flex; justify-content:space-between; align-items:center;">
      <div style="display:flex; align-items:center; gap:8px; cursor:pointer;" onclick="openUserProfileModal('${peerSlug}', '${escapeHtml(peerName)}')">
        <div style="width:34px; height:34px; border-radius:50%; background:#fff; display:flex; align-items:center; justify-content:center; font-size:18px;">
          ${peerAvatar}
        </div>
        <div>
          <div style="font-size:13.5px; font-weight:700; line-height:1.2; display:flex; align-items:center; gap:4px;">
            <span>${escapeHtml(peerName)}</span>
          </div>
          <div id="directChatHeaderSubtitle" style="font-size:10.5px; color:rgba(255,255,255,0.75); display:flex; align-items:center; gap:4px;">
            <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#10B981;"></span> অনলাইন
          </div>
        </div>
      </div>

      <div style="display:flex; align-items:center; gap:6px;">
        <button onclick="openUserProfileModal('${peerSlug}', '${escapeHtml(peerName)}')" style="background:none; border:none; color:rgba(255,255,255,0.85); font-size:13px; cursor:pointer; padding:2px;" title="প্রোফাইল দেখুন">ℹ️</button>
        <button onclick="closeDirectChat()" style="background:none; border:none; color:#fff; font-size:18px; cursor:pointer; padding:2px 6px;">✕</button>
      </div>
    </div>

    <!-- Quick Study Topic Chips -->
    <div style="padding:6px 10px; background:var(--paper); border-bottom:1px solid var(--paper-edge); display:flex; gap:6px; overflow-x:auto;">
      <button class="reaction-btn" style="font-size:11px; padding:2px 8px; white-space:nowrap;" onclick="sendQuickChatMessage('আসসালামু আলাইকুম 👋 কেমন চলছে পড়াশোনা?')">👋 সালাম</button>
      <button class="reaction-btn" style="font-size:11px; padding:2px 8px; white-space:nowrap;" onclick="sendQuickChatMessage('এই টপিকের নোটস বা সমাধানটা কি শেয়ার করতে পারবে? 📚')">📚 নোটস চাই</button>
      <button class="reaction-btn" style="font-size:11px; padding:2px 8px; white-space:nowrap;" onclick="sendQuickChatMessage('চলো একসাথে আজ অনলাইন প্র্যাকটিস এক্সাম দিই! 🎯')">🎯 একসাথে টেস্ট</button>
    </div>

    <!-- Messages Container -->
    <div id="directChatMessagesScroll" class="chat-messages-scroll">
      <!-- Bubbles injected dynamically -->
    </div>

    <!-- Live Typing Indicator (Firestore Real-time Presence) -->
    <div id="directChatTypingIndicator" class="chat-typing-indicator" style="display:none;">
      <div class="typing-bubble">
        <span class="typing-dots">
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
        </span>
        <span id="directChatTypingText" class="typing-text">...is typing</span>
      </div>
    </div>

    <!-- Voice Recording Live Bar (shown when recording) -->
    <div id="directChatVoiceRecordingBar" class="voice-recording-bar" style="display:none;">
      <div style="display:flex; align-items:center; gap:8px;">
        <span class="rec-indicator-pulse"></span>
        <span style="font-size:12px; font-weight:700; color:#EF4444;">ভয়েস রেকর্ড হচ্ছে...</span>
        <span id="voiceRecTimer" style="font-size:13px; font-weight:700; font-family:var(--font-mono); color:var(--ink);">0:00</span>
      </div>

      <div style="display:flex; align-items:center; gap:6px;">
        <button type="button" class="reaction-btn" style="color:#EF4444; font-size:12px; padding:3px 10px; border-radius:14px; border:1px solid rgba(239,68,68,0.3);" onclick="cancelDirectChatVoiceRecording()">✕ বাতিল</button>
        <button type="button" class="btn btn-gold" style="font-size:12px; padding:5px 14px; border-radius:14px; font-weight:700; display:inline-flex; align-items:center; gap:4px;" onclick="finishAndSendVoiceRecording()">
          <span>🚀</span> পাঠান
        </button>
      </div>
    </div>

    <!-- Chat Input Form -->
    <div id="directChatInputRow" style="padding:8px 10px; background:#fff; border-top:1px solid var(--paper-edge); display:flex; gap:6px; align-items:center;">
      <button 
        type="button" 
        id="directChatCameraBtn"
        style="width:36px; height:36px; border-radius:50%; font-size:18px; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; background:rgba(217,164,65,0.14); border:1.5px solid rgba(217,164,65,0.38); cursor:pointer; color:var(--ink); transition:transform 0.15s ease;" 
        onclick="openChatCameraModal()" 
        title="ক্যামেরা দিয়ে ছবি তুলুন ও পাঠান"
      >📷</button>
      <button 
        type="button" 
        id="directChatVideoBtn"
        style="width:36px; height:36px; border-radius:50%; font-size:17px; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; background:rgba(59,130,246,0.12); border:1.5px solid rgba(59,130,246,0.35); cursor:pointer; color:#3B82F6; transition:transform 0.15s ease;" 
        onclick="triggerChatVideoFileSelect()" 
        title="পড়াশোনার ভিডিও ক্লিপ পাঠান"
      >🎥</button>
      <button 
        type="button" 
        id="directChatVoiceBtn"
        style="width:36px; height:36px; border-radius:50%; font-size:17px; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; background:rgba(239,68,68,0.12); border:1.5px solid rgba(239,68,68,0.35); cursor:pointer; color:#EF4444; transition:transform 0.15s ease;" 
        onclick="toggleDirectChatVoiceRecording()" 
        title="ভয়েস রেকর্ড করে পাঠান"
      >🎙️</button>
      <input 
        type="file" 
        id="chatCameraDirectInput" 
        accept="image/*" 
        capture="environment" 
        style="display:none;" 
        onchange="handleChatCameraFileChosen(event)"
      >
      <input 
        type="file" 
        id="chatVideoDirectInput" 
        accept="video/mp4,video/webm,video/ogg,video/quicktime,video/*" 
        style="display:none;" 
        onchange="handleChatVideoFileChosen(event)"
      >
      <input 
        type="text" 
        id="directChatInput" 
        placeholder="মেসেজ লিখুন..." 
        style="margin-bottom:0; font-size:13px; padding:8px 12px; border-radius:20px; flex:1;" 
        onkeydown="if(event.key==='Enter') submitDirectChatMessage()"
        oninput="handleDirectChatInput(event)"
        onblur="handleDirectChatBlur()"
      >
      <button class="btn btn-gold" style="border-radius:20px; padding:8px 14px; font-size:13px; font-weight:700;" onclick="submitDirectChatMessage()">পাঠাও</button>
    </div>
  `;

  document.body.appendChild(drawer);

  // Reset local typing state for newly opened chat
  isLocallyTypingState = false;
  if(localTypingTimer){
    clearTimeout(localTypingTimer);
    localTypingTimer = null;
  }

  // Load existing local messages immediately
  const localMsgs = getLocalChatMessages(chatId);
  renderChatMessagesList(localMsgs);

  setTimeout(() => {
    const input = document.getElementById('directChatInput');
    if(input) input.focus();
  }, 100);
}

window.scrollChatToBottom = function(smooth = false){
  const container = document.getElementById('directChatMessagesScroll');
  if(!container) return;
  const doScroll = () => {
    const target = container.scrollHeight;
    if(smooth && typeof container.scrollTo === 'function'){
      container.scrollTo({ top: target, behavior: 'smooth' });
    } else {
      container.scrollTop = target;
    }
  };
  doScroll();
  requestAnimationFrame(doScroll);
  setTimeout(doScroll, 80);
  setTimeout(doScroll, 220);
};

function renderChatMessagesList(msgs, smooth = false){
  const container = document.getElementById('directChatMessagesScroll');
  if(!container) return;
  const me = getCurrentUserIdentity();

  if(!msgs || msgs.length === 0){
    container.innerHTML = `
      <div style="text-align:center; padding:30px 10px; color:var(--pencil); font-size:12.5px;">
        <span style="font-size:32px;">💬</span>
        <div style="margin-top:6px; font-weight:600; color:var(--ink);">কথোপকথন শুরু করুন</div>
        <div>সহপাঠীর সাথে পড়াশোনা, প্রশ্ন ও ডাউট নিয়ে ব্যক্তিগত আলোচনা করুন।</div>
      </div>
    `;
    return;
  }

  container.innerHTML = msgs.map(m => {
    const isMe = m.senderSlug === me.slug || m.senderName === me.name;
    const timeStr = new Date(m.timestamp).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
    
    // Photo attachment
    const imgUrl = m.imageUrl || m.imageLink;
    const hasImage = !!imgUrl;
    const isOnlyPhotoPlaceholder = m.text === '📷 ফটো' || m.text === '📷 Photo';
    const safeImgSrc = imgUrl ? escapeHtml(imgUrl) : '';

    const imageHtml = hasImage ? `
      <div class="chat-photo-container" onclick="openChatImageLightbox('${safeImgSrc}')" title="বড় করে দেখতে ক্লিক করুন">
        <img src="${safeImgSrc}" alt="Photo message" class="chat-message-image" loading="lazy">
        <div class="chat-photo-overlay-hint">🔍 বড় করে দেখুন</div>
      </div>
    ` : '';

    // Voice clip attachment
    const audioUrl = m.audioUrl || m.audioLink || (m.messageType === 'voice_clip' ? m.mediaUrl : null);
    const hasAudio = !!audioUrl;
    const isOnlyAudioPlaceholder = m.text && (m.text.startsWith('🎤') || m.text.includes('ভয়েস'));
    const safeAudioSrc = audioUrl ? escapeHtml(audioUrl) : '';
    const audioDurationSec = m.audioDuration || 0;
    const audioDurationStr = formatVoiceDuration(audioDurationSec);

    const audioHtml = hasAudio ? `
      <div class="voice-clip-container" id="voicePlayer_${m.id}">
        <button type="button" class="voice-play-btn" id="voicePlayBtn_${m.id}" onclick="togglePlayVoiceClip('${m.id}', '${safeAudioSrc}', ${audioDurationSec})" title="ভয়েস ক্লিপ শুনুন">
          ▶
        </button>
        <div class="voice-clip-info">
          <div class="voice-waveform-bar" onclick="seekVoiceClip('${m.id}', event)" title="ক্লিক করে অডিও সামনে/পিছনে নিন">
            <div class="voice-waveform-fill" id="voiceWaveFill_${m.id}"></div>
          </div>
          <div class="voice-time-label">
            <span id="voiceCurrentTime_${m.id}">0:00</span>
            <span>${audioDurationStr}</span>
          </div>
        </div>
      </div>
    ` : '';

    // Video clip attachment
    const videoUrl = m.videoUrl || (m.messageType === 'video_clip' ? m.mediaUrl : null);
    const hasVideo = !!videoUrl;
    const isOnlyVideoPlaceholder = m.text === '🎥 ভিডিও ক্লিপ' || m.text === '🎥 Video' || m.text === '🎥 ভিডিও';
    const safeVideoSrc = videoUrl ? escapeHtml(videoUrl) : '';

    const videoHtml = hasVideo ? `
      <div class="chat-video-container" style="border-radius:10px; overflow:hidden; background:#000; margin-top:4px; max-width:280px; box-shadow:0 3px 10px rgba(0,0,0,0.25);">
        <video src="${safeVideoSrc}" controls playsinline preload="metadata" style="width:100%; max-height:240px; display:block; border-radius:10px 10px 0 0; background:#000;"></video>
        <div style="font-size:10px; color:#A7F3D0; background:#064E3B; padding:3px 8px; display:flex; align-items:center; justify-content:space-between; gap:4px; font-weight:600;">
          <span>🔒 সুরক্ষিত ভিডিও বার্তা</span>
          <span style="opacity:0.85;">নিরাপদ</span>
        </div>
      </div>
    ` : '';

    const showCaption = m.text && !isOnlyPhotoPlaceholder && !isOnlyVideoPlaceholder && (!hasAudio || !isOnlyAudioPlaceholder);
    const captionHtml = showCaption ? `<div style="margin-top:${(hasImage || hasAudio || hasVideo) ? '6px' : '0'}; word-break:break-word;">${escapeHtml(m.text)}</div>` : '';

    let receiptHtml = '';
    if(isMe){
      const isRead = m.status === 'read' || m.isRead === true;
      if(isRead){
        receiptHtml = `<span class="chat-read-receipt is-read" title="পড়া হয়েছে (Seen · Read)">✓✓</span>`;
      } else if(m.status === 'delivered'){
        receiptHtml = `<span class="chat-read-receipt is-delivered" title="পৌঁছেছে (Delivered)">✓✓</span>`;
      } else {
        receiptHtml = `<span class="chat-read-receipt is-sent" title="প্রেরিত (Sent)">✓</span>`;
      }
    }

    return `
      <div class="chat-bubble ${isMe ? 'chat-bubble-me' : 'chat-bubble-peer'} ${hasImage ? 'chat-bubble-has-photo' : ''} ${hasAudio ? 'chat-bubble-has-voice' : ''} ${hasVideo ? 'chat-bubble-has-video' : ''}">
        ${!isMe ? `<div style="font-size:10.5px; font-weight:700; color:var(--gold); margin-bottom:3px;">${escapeHtml(m.senderName)}</div>` : ''}
        ${imageHtml}
        ${videoHtml}
        ${audioHtml}
        ${captionHtml}
        <div class="chat-time" style="color:${isMe ? 'rgba(255,255,255,0.78)' : 'var(--pencil)'}; display:flex; align-items:center; justify-content:flex-end; gap:2px;">
          <span>${timeStr}</span>
          ${receiptHtml}
        </div>
      </div>
    `;
  }).join('');

  scrollChatToBottom(smooth);
}

window.closeDirectChat = function(){
  if(localTypingTimer){
    clearTimeout(localTypingTimer);
    localTypingTimer = null;
  }
  if(peerTypingSafetyTimeout){
    clearTimeout(peerTypingSafetyTimeout);
    peerTypingSafetyTimeout = null;
  }
  if(activeDirectChatInfo){
    const me = getCurrentUserIdentity();
    if(typeof fbSetTypingStatus === 'function'){
      fbSetTypingStatus(activeDirectChatInfo.chatId, me.slug, me.name, false);
    }
    if(typeof fbUnsubscribeTypingStatus === 'function'){
      fbUnsubscribeTypingStatus();
    }
  }
  if(typeof closeChatCameraModal === 'function'){
    closeChatCameraModal();
  }
  if(typeof cancelDirectChatVoiceRecording === 'function' && isDirectChatRecordingVoice){
    cancelDirectChatVoiceRecording();
  }
  if(typeof stopCurrentVoiceClipPlayback === 'function'){
    stopCurrentVoiceClipPlayback();
  }
  isLocallyTypingState = false;
  const drawer = document.getElementById('directChatDrawer');
  if(drawer) drawer.remove();
  activeDirectChatInfo = null;
};

window.sendQuickChatMessage = function(text){
  const input = document.getElementById('directChatInput');
  if(input){
    input.value = text;
    submitDirectChatMessage();
  }
};

window.submitDirectChatMessage = function(){
  if(!activeDirectChatInfo) return;
  const input = document.getElementById('directChatInput');
  if(!input) return;
  const text = input.value.trim();
  if(!text) return;

  const { chatId, peerSlug } = activeDirectChatInfo;
  const me = getCurrentUserIdentity();

  // Reset local typing state immediately
  if(localTypingTimer){
    clearTimeout(localTypingTimer);
    localTypingTimer = null;
  }
  if(isLocallyTypingState){
    isLocallyTypingState = false;
    if(typeof fbSetTypingStatus === 'function'){
      fbSetTypingStatus(chatId, me.slug, me.name, false);
    }
  }

  const newMsg = {
    id: 'msg_' + Date.now() + '_' + Math.floor(Math.random()*1000),
    chatId,
    participants: [me.slug, peerSlug],
    participantSlugs: [me.slug, peerSlug],
    senderSlug: me.slug,
    senderName: me.name,
    senderAvatar: me.avatar,
    senderBadge: me.badge,
    text,
    timestamp: Date.now(),
    status: 'sent'
  };

  // Update local storage
  const msgs = getLocalChatMessages(chatId);
  msgs.push(newMsg);
  saveLocalChatMessages(chatId, msgs);

  // Re-render and auto-scroll to bottom immediately
  renderChatMessagesList(msgs, true);
  scrollChatToBottom(true);
  input.value = '';

  if(typeof playSfx === 'function') playSfx('slash');

  // Push to Firestore Cloud with conversation metadata and message state
  if(typeof fbSendChatMessage === 'function'){
    fbSendChatMessage(chatId, newMsg, activeDirectChatInfo);
  }

  // Update conversation record
  recordChatMessageInConversation(chatId, newMsg, activeDirectChatInfo);
};

// ============================================================================
// Direct Chat Camera & Photo Messaging Functionality
// ============================================================================
let chatCameraStream = null;
let chatCameraFacingMode = 'environment'; // 'environment' (back) or 'user' (front)
let pendingChatPhotoDataUrl = null;

window.openChatCameraModal = function(){
  if(!activeDirectChatInfo){
    toast('আগে একটি চ্যাট কথোপকথন খুলুন');
    return;
  }

  pendingChatPhotoDataUrl = null;
  const oldModal = document.getElementById('chatCameraModalOverlay');
  if(oldModal) oldModal.remove();

  const overlay = document.createElement('div');
  overlay.id = 'chatCameraModalOverlay';
  overlay.className = 'chat-camera-modal-overlay';
  overlay.onclick = function(e){
    if(e.target === overlay) closeChatCameraModal();
  };

  overlay.innerHTML = `
    <div class="chat-camera-card" onclick="event.stopPropagation()">
      <!-- Camera Header -->
      <div style="padding:12px 16px; background:#1F2937; border-bottom:1px solid rgba(255,255,255,0.1); display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:20px;">📸</span>
          <div>
            <h3 style="margin:0; font-size:15px; font-weight:700; color:#FFFFFF;">ক্যামেরা দিয়ে ছবি তুলুন</h3>
            <span style="font-size:11px; color:#9CA3AF;">১-অন-১ প্রাইভেট চ্যাটে ছবি তুলে সরাসরি পাঠান</span>
          </div>
        </div>
        <button onclick="closeChatCameraModal()" style="background:none; border:none; color:#FFFFFF; font-size:20px; cursor:pointer; padding:4px;" title="বন্ধ করুন">✕</button>
      </div>

      <!-- Main Body: Viewfinder or Preview -->
      <div id="chatCameraModalContent">
        <!-- Viewfinder -->
        <div class="chat-camera-viewfinder" id="chatCameraViewfinder">
          <video id="chatCameraVideo" autoplay playsinline muted style="width:100%; height:100%; object-fit:cover;"></video>
          <div class="camera-grid-lines">
            <div></div><div></div><div></div>
            <div></div><div></div><div></div>
            <div></div><div></div><div></div>
          </div>
          <div id="chatCameraLoadingNotice" style="position:absolute; inset:0; background:rgba(0,0,0,0.85); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; color:#FFFFFF; padding:16px;">
            <div style="font-size:32px;">📷</div>
            <div style="font-size:13px; font-weight:600;">ক্যামেরা চালু হচ্ছে...</div>
            <div style="font-size:11px; color:#9CA3AF; text-align:center;">ব্রাউজার ক্যামেরা পারমিশন চাইলে 'Allow' চাপুন</div>
          </div>
        </div>

        <!-- Camera Controls -->
        <div style="padding:16px; background:#111827; display:flex; align-items:center; justify-content:space-between; gap:12px;">
          <button type="button" class="camera-aux-btn" onclick="switchChatCameraFacingMode()" title="ক্যামেরা পরিবর্তন করুন">
            <span>🔄</span> ঘোরান
          </button>

          <button type="button" class="camera-shutter-btn" onclick="capturePhotoFromChatCamera()" title="ছবি তুলুন">
            <div class="camera-shutter-inner"></div>
          </button>

          <button type="button" class="camera-aux-btn" onclick="triggerChatCameraFileSelect()" title="ডিভাইস থেকে ছবি বাছাই">
            <span>📁</span> ফাইল
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  startChatCameraStream(chatCameraFacingMode);
};

window.startChatCameraStream = async function(facingMode){
  stopChatCameraStream();
  chatCameraFacingMode = facingMode || 'environment';

  const videoEl = document.getElementById('chatCameraVideo');
  const loadingNotice = document.getElementById('chatCameraLoadingNotice');
  if(!videoEl) return;

  if(loadingNotice){
    loadingNotice.style.display = 'flex';
    loadingNotice.innerHTML = `
      <div style="font-size:32px;">📷</div>
      <div style="font-size:13px; font-weight:600;">ক্যামেরা চালু হচ্ছে...</div>
      <div style="font-size:11px; color:#9CA3AF; text-align:center;">ব্রাউজার ক্যামেরা পারমিশন চাইলে 'Allow' চাপুন</div>
    `;
  }

  let stream = null;
  try {
    if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia){
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: chatCameraFacingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
      } catch(err1){
        // Fallback to generic video
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
    }
  } catch(err){
    console.warn('Chat camera stream error:', err);
  }

  if(stream && videoEl){
    chatCameraStream = stream;
    videoEl.srcObject = stream;
    if(chatCameraFacingMode === 'user'){
      videoEl.style.transform = 'scaleX(-1)';
    } else {
      videoEl.style.transform = 'none';
    }
    try {
      await videoEl.play();
    } catch(e){}
    if(loadingNotice) loadingNotice.style.display = 'none';
  } else {
    // Show friendly fallback message with trigger to device camera input
    if(loadingNotice){
      loadingNotice.innerHTML = `
        <div style="font-size:34px;">📷</div>
        <div style="font-size:13px; font-weight:700; text-align:center; padding:0 14px;">লাইভ ওয়েবক্যাম পাওয়া যায়নি বা অনুমতি প্রয়োজন</div>
        <div style="font-size:11.5px; color:#9CA3AF; text-align:center; max-width:300px;">ডিভাইসের নিজস্ব ক্যামেরা বা গ্যালারি থেকে সরাসরি ছবি নিতে নিচের বাটনে চাপুন:</div>
        <button class="btn btn-gold" style="margin-top:6px; font-size:12.5px; padding:7px 16px; border-radius:20px; font-weight:700;" onclick="triggerChatCameraFileSelect()">
          📸 ডিভাইস ক্যামেরা / ফাইল খুলুন
        </button>
      `;
    }
  }
};

window.switchChatCameraFacingMode = function(){
  const nextMode = chatCameraFacingMode === 'environment' ? 'user' : 'environment';
  startChatCameraStream(nextMode);
};

window.stopChatCameraStream = function(){
  if(chatCameraStream){
    try {
      chatCameraStream.getTracks().forEach(track => track.stop());
    } catch(e){}
    chatCameraStream = null;
  }
};

window.triggerChatCameraFileSelect = function(){
  const input = document.getElementById('chatCameraDirectInput');
  if(input) input.click();
};

window.handleChatCameraFileChosen = function(e){
  const file = e.target.files && e.target.files[0];
  if(!file) return;
  if(!file.type.startsWith('image/')){
    toast('শুধুমাত্র ছবি বা ফটো আপলোড করা যাবে');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(event){
    const img = new Image();
    img.onload = function(){
      const maxDim = 960;
      let w = img.width;
      let h = img.height;
      if(w > maxDim || h > maxDim){
        if(w > h){
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      stopChatCameraStream();
      renderChatPhotoPreview(dataUrl);
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
  e.target.value = '';
};

window.capturePhotoFromChatCamera = function(){
  const videoEl = document.getElementById('chatCameraVideo');
  if(!videoEl || !videoEl.videoWidth){
    toast('ক্যামেরা প্রস্তুত নয়, অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করুন');
    return;
  }

  const vw = videoEl.videoWidth;
  const vh = videoEl.videoHeight;
  const maxDim = 960;
  let targetW = vw;
  let targetH = vh;
  if(vw > maxDim || vh > maxDim){
    if(vw > vh){
      targetH = Math.round((vh * maxDim) / vw);
      targetW = maxDim;
    } else {
      targetW = Math.round((vw * maxDim) / vh);
      targetH = maxDim;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');

  if(chatCameraFacingMode === 'user'){
    ctx.translate(targetW, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(videoEl, 0, 0, targetW, targetH);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
  stopChatCameraStream();
  renderChatPhotoPreview(dataUrl);
};

window.renderChatPhotoPreview = function(dataUrl){
  pendingChatPhotoDataUrl = dataUrl;
  const contentEl = document.getElementById('chatCameraModalContent');
  if(!contentEl) return;

  contentEl.innerHTML = `
    <!-- Captured Photo Preview Container -->
    <div style="position:relative; width:100%; height:340px; max-height:48vh; background:#000; overflow:hidden; display:flex; align-items:center; justify-content:center;">
      <img src="${dataUrl}" alt="Captured Photo" style="max-width:100%; max-height:100%; object-fit:contain;">
      <div style="position:absolute; top:10px; right:10px; background:rgba(16,185,129,0.92); color:#FFFFFF; font-size:11px; font-weight:700; padding:3px 9px; border-radius:12px; display:inline-flex; align-items:center; gap:4px; box-shadow:0 2px 6px rgba(0,0,0,0.4);">
        <span>✓</span> ছবি প্রস্তুত
      </div>
    </div>

    <!-- Caption Input & Action Buttons -->
    <div style="padding:14px 16px; background:#111827;">
      <div style="margin-bottom:12px;">
        <label style="font-size:11.5px; font-weight:600; color:#9CA3AF; margin-bottom:4px; display:block;">বার্তার বিবরণ বা ক্যাপশন (ঐচ্ছিক):</label>
        <input 
          type="text" 
          id="chatPhotoCaptionInput" 
          placeholder="যেমন: এই সমাধানটা দেখো বা এই অংকটা আটকে গেছে..." 
          style="width:100%; box-sizing:border-box; background:#1F2937; border:1px solid rgba(255,255,255,0.18); color:#FFFFFF; font-size:13px; padding:9px 12px; border-radius:10px; margin-bottom:0;"
          onkeydown="if(event.key==='Enter') submitPendingChatPhoto()"
        >
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
        <button type="button" class="btn btn-outline" style="border-color:rgba(255,255,255,0.3); color:#FFFFFF; font-size:12.5px; padding:7px 14px; border-radius:10px;" onclick="retakeChatCameraPhoto()">
          🔄 আবার তুলুন
        </button>
        <button type="button" class="btn btn-gold" style="font-size:13px; font-weight:700; padding:8px 20px; border-radius:10px; display:inline-flex; align-items:center; gap:6px;" onclick="submitPendingChatPhoto()">
          <span>🚀</span> ছবি পাঠান
        </button>
      </div>
    </div>
  `;

  setTimeout(() => {
    const input = document.getElementById('chatPhotoCaptionInput');
    if(input) input.focus();
  }, 100);
};

window.retakeChatCameraPhoto = function(){
  pendingChatPhotoDataUrl = null;
  const contentEl = document.getElementById('chatCameraModalContent');
  if(!contentEl) return;

  contentEl.innerHTML = `
    <!-- Viewfinder -->
    <div class="chat-camera-viewfinder" id="chatCameraViewfinder">
      <video id="chatCameraVideo" autoplay playsinline muted style="width:100%; height:100%; object-fit:cover;"></video>
      <div class="camera-grid-lines">
        <div></div><div></div><div></div>
        <div></div><div></div><div></div>
        <div></div><div></div><div></div>
      </div>
      <div id="chatCameraLoadingNotice" style="position:absolute; inset:0; background:rgba(0,0,0,0.85); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; color:#FFFFFF; padding:16px;">
        <div style="font-size:32px;">📷</div>
        <div style="font-size:13px; font-weight:600;">ক্যামেরা চালু হচ্ছে...</div>
        <div style="font-size:11px; color:#9CA3AF; text-align:center;">ব্রাউজার ক্যামেরা পারমিশন চাইলে 'Allow' চাপুন</div>
      </div>
    </div>

    <!-- Camera Controls -->
    <div style="padding:16px; background:#111827; display:flex; align-items:center; justify-content:space-between; gap:12px;">
      <button type="button" class="camera-aux-btn" onclick="switchChatCameraFacingMode()" title="ক্যামেরা পরিবর্তন করুন">
        <span>🔄</span> ঘোরান
      </button>

      <button type="button" class="camera-shutter-btn" onclick="capturePhotoFromChatCamera()" title="ছবি তুলুন">
        <div class="camera-shutter-inner"></div>
      </button>

      <button type="button" class="camera-aux-btn" onclick="triggerChatCameraFileSelect()" title="ডিভাইস থেকে ছবি বাছাই">
        <span>📁</span> ফাইল
      </button>
    </div>
  `;

  startChatCameraStream(chatCameraFacingMode);
};

window.closeChatCameraModal = function(){
  stopChatCameraStream();
  pendingChatPhotoDataUrl = null;
  const overlay = document.getElementById('chatCameraModalOverlay');
  if(overlay) overlay.remove();
};

window.submitPendingChatPhoto = function(){
  if(!pendingChatPhotoDataUrl || !activeDirectChatInfo) return;

  const captionInput = document.getElementById('chatPhotoCaptionInput');
  const caption = captionInput ? captionInput.value.trim() : '';
  const photoData = pendingChatPhotoDataUrl;
  const { chatId, peerSlug } = activeDirectChatInfo;
  const me = getCurrentUserIdentity();

  const displayText = caption ? caption : '📷 ফটো';

  const newMsg = {
    id: 'msg_' + Date.now() + '_' + Math.floor(Math.random()*1000),
    chatId,
    participants: [me.slug, peerSlug],
    participantSlugs: [me.slug, peerSlug],
    senderSlug: me.slug,
    senderName: me.name,
    senderAvatar: me.avatar,
    senderBadge: me.badge,
    text: displayText,
    imageUrl: photoData,
    imageLink: photoData,
    mediaUrl: photoData,
    timestamp: Date.now(),
    status: 'sent'
  };

  // Close modal and stop hardware stream
  closeChatCameraModal();

  // Save to local storage
  const msgs = getLocalChatMessages(chatId);
  msgs.push(newMsg);
  saveLocalChatMessages(chatId, msgs);

  // Render immediately and auto-scroll to bottom
  renderChatMessagesList(msgs, true);
  scrollChatToBottom(true);

  if(typeof playSfx === 'function') playSfx('slash');
  toast('📸 ছবি সফলভাবে পাঠানো হয়েছে!');

  // Send to Firestore (storing image link in the Firestore message document)
  if(typeof fbSendChatMessage === 'function'){
    fbSendChatMessage(chatId, newMsg, activeDirectChatInfo);
  }

  // Update conversation record
  recordChatMessageInConversation(chatId, newMsg, activeDirectChatInfo);
};

// Fullscreen Chat Photo Lightbox
window.openChatImageLightbox = function(imgSrc){
  if(!imgSrc) return;
  const old = document.getElementById('chatImageLightboxOverlay');
  if(old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'chatImageLightboxOverlay';
  overlay.className = 'chat-image-lightbox-overlay';
  overlay.onclick = function(e){
    if(e.target === overlay) closeChatImageLightbox();
  };

  overlay.innerHTML = `
    <div style="width:100%; max-width:920px; display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; color:#FFFFFF;">
      <div style="font-size:13.5px; font-weight:600; display:flex; align-items:center; gap:6px;">
        <span>📸</span> চ্যাট ফটো ভিউয়ার
      </div>
      <div style="display:flex; align-items:center; gap:10px;">
        <a href="${imgSrc}" download="tuition_chat_photo_${Date.now()}.jpg" class="camera-aux-btn" style="text-decoration:none; padding:5px 12px; font-size:12px;">
          ⬇️ ডাউনলোড
        </a>
        <button onclick="closeChatImageLightbox()" style="background:none; border:none; color:#FFFFFF; font-size:24px; cursor:pointer; padding:2px 8px;">✕</button>
      </div>
    </div>
    <img src="${imgSrc}" alt="Enlarged Chat Photo" class="chat-image-lightbox-img" onclick="event.stopPropagation()">
  `;

  document.body.appendChild(overlay);
};

window.closeChatImageLightbox = function(){
  const overlay = document.getElementById('chatImageLightboxOverlay');
  if(overlay) overlay.remove();
};

// ============================================================================
// Direct Chat Video Clips & Media Messaging (E2EE Client-side Encrypted)
// ============================================================================
let pendingChatVideoDataUrl = null;

window.triggerChatVideoFileSelect = function(){
  const input = document.getElementById('chatVideoDirectInput');
  if(input) input.click();
};

window.handleChatVideoFileChosen = function(e){
  const file = e.target.files && e.target.files[0];
  if(!file) return;
  if(!file.type.startsWith('video/')){
    toast('শুধুমাত্র ভিডিও ফাইল (MP4/WebM) নির্বাচন করুন');
    return;
  }
  // Max size 25MB for client-side memory safety
  if(file.size > 25 * 1024 * 1024){
    toast('ভিডিও ফাইলের সাইজ ২৫ মেগাবাইটের (25MB) কম হতে হবে');
    return;
  }

  toast('ভিডিও প্রস্তুত হচ্ছে...');
  const reader = new FileReader();
  reader.onload = function(event){
    openChatVideoPreviewModal(event.target.result, file.name);
  };
  reader.readAsDataURL(file);
  e.target.value = '';
};

window.openChatVideoPreviewModal = function(videoDataUrl, fileName){
  pendingChatVideoDataUrl = videoDataUrl;
  const old = document.getElementById('chatVideoPreviewModalOverlay');
  if(old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'chatVideoPreviewModalOverlay';
  overlay.className = 'chat-camera-modal-overlay';
  overlay.onclick = function(e){
    if(e.target === overlay) closeChatVideoPreviewModal();
  };

  overlay.innerHTML = `
    <div class="chat-camera-card" onclick="event.stopPropagation()">
      <div style="padding:12px 16px; background:#1F2937; border-bottom:1px solid rgba(255,255,255,0.1); display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:20px;">🎥</span>
          <div>
            <h3 style="margin:0; font-size:15px; font-weight:700; color:#FFFFFF;">ভিডিও প্রিভিউ</h3>
            <span style="font-size:11px; color:#A7F3D0;">🔒 সম্পূর্ণ নিরাপদ ও ব্যক্তিগত বার্তা</span>
          </div>
        </div>
        <button onclick="closeChatVideoPreviewModal()" style="background:none; border:none; color:#FFFFFF; font-size:20px; cursor:pointer; padding:4px;" title="বাতিল">✕</button>
      </div>

      <div style="background:#000; display:flex; justify-content:center; align-items:center; max-height:48vh; overflow:hidden;">
        <video src="${videoDataUrl}" controls playsinline style="max-width:100%; max-height:45vh;"></video>
      </div>

      <div style="padding:14px 16px; background:#111827;">
        <div style="margin-bottom:12px;">
          <label style="font-size:11.5px; font-weight:600; color:#9CA3AF; margin-bottom:4px; display:block;">বার্তার বিবরণ বা ক্যাপশন (ঐচ্ছিক):</label>
          <input 
            type="text" 
            id="chatVideoCaptionInput" 
            placeholder="যেমন: এই লেকচার বা অংকের ভিডিও ক্লিপটি দেখো..." 
            style="width:100%; box-sizing:border-box; background:#1F2937; border:1px solid rgba(255,255,255,0.18); color:#FFFFFF; font-size:13px; padding:9px 12px; border-radius:10px; margin-bottom:0;"
            onkeydown="if(event.key==='Enter') submitPendingChatVideo()"
          >
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
          <button type="button" class="btn btn-outline" style="border-color:rgba(255,255,255,0.3); color:#FFFFFF; font-size:12.5px; padding:7px 14px; border-radius:10px;" onclick="closeChatVideoPreviewModal()">
            ✕ বাতিল
          </button>
          <button type="button" class="btn btn-gold" style="font-size:13px; font-weight:700; padding:8px 20px; border-radius:10px; display:inline-flex; align-items:center; gap:6px;" onclick="submitPendingChatVideo()">
            <span>🚀</span> এনক্রিপ্ট করে পাঠান
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  setTimeout(() => {
    const input = document.getElementById('chatVideoCaptionInput');
    if(input) input.focus();
  }, 100);
};

window.closeChatVideoPreviewModal = function(){
  pendingChatVideoDataUrl = null;
  const overlay = document.getElementById('chatVideoPreviewModalOverlay');
  if(overlay) overlay.remove();
};

window.submitPendingChatVideo = function(){
  if(!pendingChatVideoDataUrl || !activeDirectChatInfo) return;

  const captionInput = document.getElementById('chatVideoCaptionInput');
  const caption = captionInput ? captionInput.value.trim() : '';
  const videoData = pendingChatVideoDataUrl;
  const { chatId, peerSlug } = activeDirectChatInfo;
  const me = getCurrentUserIdentity();

  const displayText = caption ? caption : '🎥 ভিডিও ক্লিপ';

  const newMsg = {
    id: 'msg_' + Date.now() + '_' + Math.floor(Math.random()*1000),
    chatId,
    participants: [me.slug, peerSlug],
    participantSlugs: [me.slug, peerSlug],
    senderSlug: me.slug,
    senderName: me.name,
    senderAvatar: me.avatar,
    senderBadge: me.badge,
    text: displayText,
    videoUrl: videoData,
    mediaUrl: videoData,
    messageType: 'video_clip',
    isEncrypted: true,
    timestamp: Date.now(),
    status: 'sent'
  };

  closeChatVideoPreviewModal();

  const msgs = getLocalChatMessages(chatId);
  msgs.push(newMsg);
  saveLocalChatMessages(chatId, msgs);

  renderChatMessagesList(msgs, true);
  scrollChatToBottom(true);

  if(typeof playSfx === 'function') playSfx('slash');
  toast('🎥 ভিডিও সফলভাবে এনক্রিপ্ট করে পাঠানো হয়েছে!');

  if(typeof fbSendChatMessage === 'function'){
    fbSendChatMessage(chatId, newMsg, activeDirectChatInfo);
  }

  recordChatMessageInConversation(chatId, newMsg, activeDirectChatInfo);
};

// ============================================================================
// Voice Clips (Audio Messaging) Player & Recording Engine (Firebase Storage)
// ============================================================================
let voiceMediaRecorder = null;
let voiceAudioStream = null;
let voiceAudioChunks = [];
let voiceRecordTimerInterval = null;
let voiceRecordStartTime = 0;
let isDirectChatRecordingVoice = false;

let currentPlayingAudio = null;
let currentPlayingMsgId = null;

function formatVoiceDuration(seconds){
  if(!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return mins + ':' + (secs < 10 ? '0' : '') + secs;
}

window.stopCurrentVoiceClipPlayback = function(){
  if(currentPlayingAudio){
    try {
      currentPlayingAudio.pause();
      currentPlayingAudio.currentTime = 0;
    } catch(e){}
    currentPlayingAudio = null;
  }
  if(currentPlayingMsgId){
    const btn = document.getElementById('voicePlayBtn_' + currentPlayingMsgId);
    const fill = document.getElementById('voiceWaveFill_' + currentPlayingMsgId);
    const curTime = document.getElementById('voiceCurrentTime_' + currentPlayingMsgId);
    if(btn) btn.innerHTML = '▶';
    if(fill) fill.style.width = '0%';
    if(curTime) curTime.textContent = '0:00';
    currentPlayingMsgId = null;
  }
};

window.togglePlayVoiceClip = function(msgId, audioSrc, durationSec){
  if(!audioSrc) return;

  // Toggle pause if clicking currently active audio
  if(currentPlayingMsgId === msgId && currentPlayingAudio){
    const btn = document.getElementById('voicePlayBtn_' + msgId);
    if(currentPlayingAudio.paused){
      currentPlayingAudio.play();
      if(btn) btn.innerHTML = '⏸';
    } else {
      currentPlayingAudio.pause();
      if(btn) btn.innerHTML = '▶';
    }
    return;
  }

  // Stop any other currently playing clip
  stopCurrentVoiceClipPlayback();

  const audio = new Audio(audioSrc);
  currentPlayingAudio = audio;
  currentPlayingMsgId = msgId;

  const btn = document.getElementById('voicePlayBtn_' + msgId);
  const fill = document.getElementById('voiceWaveFill_' + msgId);
  const curTime = document.getElementById('voiceCurrentTime_' + msgId);
  if(btn) btn.innerHTML = '⏸';

  audio.addEventListener('timeupdate', () => {
    if(currentPlayingMsgId !== msgId) return;
    const dur = audio.duration || durationSec || 1;
    const pct = Math.min(100, Math.max(0, (audio.currentTime / dur) * 100));
    if(fill) fill.style.width = pct + '%';
    if(curTime) curTime.textContent = formatVoiceDuration(audio.currentTime);
  });

  audio.addEventListener('ended', () => {
    if(btn) btn.innerHTML = '▶';
    if(fill) fill.style.width = '0%';
    if(curTime) curTime.textContent = '0:00';
    currentPlayingAudio = null;
    currentPlayingMsgId = null;
  });

  audio.addEventListener('error', (err) => {
    console.warn('Voice clip playback notice:', err);
    toast('অডিও প্লে করতে সমস্যা হয়েছে');
    stopCurrentVoiceClipPlayback();
  });

  audio.play().catch(e => {
    console.warn('Audio play error:', e);
    stopCurrentVoiceClipPlayback();
  });
};

window.seekVoiceClip = function(msgId, event){
  if(currentPlayingMsgId !== msgId || !currentPlayingAudio) return;
  const bar = event.currentTarget;
  if(!bar) return;
  const rect = bar.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const ratio = Math.max(0, Math.min(1, clickX / rect.width));
  if(currentPlayingAudio.duration){
    currentPlayingAudio.currentTime = ratio * currentPlayingAudio.duration;
  }
};

window.toggleDirectChatVoiceRecording = function(){
  if(isDirectChatRecordingVoice){
    finishAndSendVoiceRecording();
  } else {
    startDirectChatVoiceRecording();
  }
};

window.startDirectChatVoiceRecording = async function(){
  if(!activeDirectChatInfo){
    toast('আগে একটি চ্যাট কথোপকথন খুলুন');
    return;
  }

  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
    toast('আপনার ব্রাউজারে মাইক্রোফোন সাপোর্ট নেই');
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    voiceAudioStream = stream;

    let mimeType = 'audio/webm;codecs=opus';
    if(typeof MediaRecorder.isTypeSupported === 'function'){
      if(MediaRecorder.isTypeSupported('audio/webm;codecs=opus')){
        mimeType = 'audio/webm;codecs=opus';
      } else if(MediaRecorder.isTypeSupported('audio/webm')){
        mimeType = 'audio/webm';
      } else if(MediaRecorder.isTypeSupported('audio/mp4')){
        mimeType = 'audio/mp4';
      } else if(MediaRecorder.isTypeSupported('audio/ogg')){
        mimeType = 'audio/ogg';
      }
    }

    voiceAudioChunks = [];
    voiceMediaRecorder = new MediaRecorder(stream, { mimeType });

    voiceMediaRecorder.ondataavailable = function(e){
      if(e.data && e.data.size > 0){
        voiceAudioChunks.push(e.data);
      }
    };

    voiceMediaRecorder.start(200);
    isDirectChatRecordingVoice = true;
    voiceRecordStartTime = Date.now();

    // Switch to recording bar UI
    const recBar = document.getElementById('directChatVoiceRecordingBar');
    const inputRow = document.getElementById('directChatInputRow');
    const timerEl = document.getElementById('voiceRecTimer');
    if(recBar) recBar.style.display = 'flex';
    if(inputRow) inputRow.style.display = 'none';
    if(timerEl) timerEl.textContent = '0:00';

    if(voiceRecordTimerInterval) clearInterval(voiceRecordTimerInterval);
    voiceRecordTimerInterval = setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - voiceRecordStartTime)/1000);
      if(timerEl) timerEl.textContent = formatVoiceDuration(elapsedSec);
      if(elapsedSec >= 120){ // 2 minute max
        finishAndSendVoiceRecording();
      }
    }, 1000);

    if(typeof playSfx === 'function') playSfx('pop');
    toast('🎙️ কথা বলুন... ভয়েস রেকর্ড হচ্ছে');
  } catch(err){
    console.warn('Microphone permission error:', err);
    toast('মাইক্রোফোন অ্যাক্সেসের অনুমতি প্রয়োজন');
  }
};

window.finishAndSendVoiceRecording = function(){
  if(!isDirectChatRecordingVoice || !voiceMediaRecorder) return;

  if(voiceRecordTimerInterval){
    clearInterval(voiceRecordTimerInterval);
    voiceRecordTimerInterval = null;
  }

  const durationSec = Math.max(1, Math.round((Date.now() - voiceRecordStartTime)/1000));
  isDirectChatRecordingVoice = false;

  // Restore UI
  const recBar = document.getElementById('directChatVoiceRecordingBar');
  const inputRow = document.getElementById('directChatInputRow');
  if(recBar) recBar.style.display = 'none';
  if(inputRow) inputRow.style.display = 'flex';

  voiceMediaRecorder.onstop = async function(){
    if(voiceAudioStream){
      voiceAudioStream.getTracks().forEach(t => t.stop());
      voiceAudioStream = null;
    }

    if(durationSec < 1){
      toast('রেকর্ডিং খুব সংক্ষিপ্ত ছিল');
      return;
    }

    const mime = voiceMediaRecorder.mimeType || 'audio/webm';
    const audioBlob = new Blob(voiceAudioChunks, { type: mime });

    toast('ভয়েস ক্লিপ পাঠানো হচ্ছে... 🎙️');

    try {
      const { chatId, peerSlug } = activeDirectChatInfo;
      const me = getCurrentUserIdentity();

      // Upload audio to Firebase Storage
      let audioUrl = '';
      if(typeof fbUploadVoiceClip === 'function'){
        audioUrl = await fbUploadVoiceClip(audioBlob, chatId, { duration: durationSec });
      }

      if(!audioUrl){
        toast('ভয়েস ক্লিপ সংরক্ষণ করা যায়নি');
        return;
      }

      const durationStr = formatVoiceDuration(durationSec);
      const newMsg = {
        id: 'msg_' + Date.now() + '_' + Math.floor(Math.random()*1000),
        chatId,
        participants: [me.slug, peerSlug],
        participantSlugs: [me.slug, peerSlug],
        senderSlug: me.slug,
        senderName: me.name,
        senderAvatar: me.avatar,
        senderBadge: me.badge,
        text: '🎤 ভয়েস মেসেজ (' + durationStr + ')',
        audioUrl: audioUrl,
        audioLink: audioUrl,
        mediaUrl: audioUrl,
        audioDuration: durationSec,
        messageType: 'voice_clip',
        timestamp: Date.now(),
        status: 'sent'
      };

      // Save to local chat storage
      const msgs = getLocalChatMessages(chatId);
      msgs.push(newMsg);
      saveLocalChatMessages(chatId, msgs);

      // Render immediately and auto-scroll to bottom
      renderChatMessagesList(msgs, true);
      scrollChatToBottom(true);

      if(typeof playSfx === 'function') playSfx('slash');
      toast('🎤 ভয়েস মেসেজ সফলভাবে পাঠানো হয়েছে!');

      // Push to Firestore Cloud
      if(typeof fbSendChatMessage === 'function'){
        fbSendChatMessage(chatId, newMsg, activeDirectChatInfo);
      }

      // Update local conversation record
      recordChatMessageInConversation(chatId, newMsg, activeDirectChatInfo);

    } catch(sendErr){
      console.warn('Error uploading voice message:', sendErr);
      toast('ভয়েস মেসেজ পাঠানো যায়নি');
    }
  };

  try {
    voiceMediaRecorder.stop();
  } catch(e){}
};

window.cancelDirectChatVoiceRecording = function(){
  if(voiceRecordTimerInterval){
    clearInterval(voiceRecordTimerInterval);
    voiceRecordTimerInterval = null;
  }
  isDirectChatRecordingVoice = false;

  if(voiceMediaRecorder && voiceMediaRecorder.state !== 'inactive'){
    try {
      voiceMediaRecorder.stop();
    } catch(e){}
  }

  if(voiceAudioStream){
    voiceAudioStream.getTracks().forEach(t => t.stop());
    voiceAudioStream = null;
  }

  voiceAudioChunks = [];

  const recBar = document.getElementById('directChatVoiceRecordingBar');
  const inputRow = document.getElementById('directChatInputRow');
  if(recBar) recBar.style.display = 'none';
  if(inputRow) inputRow.style.display = 'flex';

  toast('ভয়েস রেকর্ডিং বাতিল করা হয়েছে');
};

// ----------------------------------------------------------------------------
// 5. Active Conversations, Chat List View & Real-time Firestore Sync
// ----------------------------------------------------------------------------
let currentChatListFilter = 'all'; // 'all' | 'teachers' | 'verified' | 'unread'
let currentChatListSearch = '';

window.setChatListFilter = function(filter){
  currentChatListFilter = filter || 'all';
  refreshCommunityChatListStream();
};

window.filterChatListView = function(query){
  currentChatListSearch = (query || '').trim().toLowerCase();
  refreshCommunityChatListStream();
};

window.refreshCommunityChatListStream = function(){
  const container = document.getElementById('communityChatListContainer');
  if(container){
    const stud = typeof getLoggedStudent === 'function' ? getLoggedStudent() : null;
    const isTeacher = !!window.currentTeacher;
    container.innerHTML = getChatListContentHtml(stud, isTeacher);
    initChatSwipeGestures();
  }
};

// ----------------------------------------------------------------------------
// Conversation Archive & Swipe Gestures Implementation
// ----------------------------------------------------------------------------
let lastArchivedChatInfo = null;
let archiveUndoTimer = null;

window.archiveConversation = function(chatId, showUndo = true){
  const convs = getActiveConversations();
  const conv = convs.find(c => c.chatId === chatId);
  if(!conv) return;

  conv.isArchived = true;
  conv.archivedAt = Date.now();
  saveActiveConversations(convs);

  const me = getCurrentUserIdentity();
  if(typeof fbSetConversationArchiveStatus === 'function' && me && me.slug){
    fbSetConversationArchiveStatus(chatId, me.slug, true);
  }

  if(showUndo){
    showArchiveUndoSnackbar(chatId, conv.peerName || 'সহপাঠী', true);
  }

  refreshCommunityChatListStream();
};

window.unarchiveConversation = function(chatId, showToast = true){
  const convs = getActiveConversations();
  const conv = convs.find(c => c.chatId === chatId);
  if(!conv) return;

  conv.isArchived = false;
  conv.unarchivedAt = Date.now();
  saveActiveConversations(convs);

  const me = getCurrentUserIdentity();
  if(typeof fbSetConversationArchiveStatus === 'function' && me && me.slug){
    fbSetConversationArchiveStatus(chatId, me.slug, false);
  }

  if(showToast){
    toast('কথোপকথনটি আবার প্রধান ইনবক্সে ফিরিয়ে আনা হয়েছে 📥');
  }

  dismissArchiveUndoSnackbar();
  refreshCommunityChatListStream();
};

window.toggleConversationArchive = function(chatId){
  const convs = getActiveConversations();
  const conv = convs.find(c => c.chatId === chatId);
  if(!conv) return;

  if(conv.isArchived){
    unarchiveConversation(chatId, true);
  } else {
    animateAndPerformArchive(chatId, false);
  }
};

window.toggleConversationPin = function(chatId){
  const convs = getActiveConversations();
  const conv = convs.find(c => c.chatId === chatId);
  if(!conv) return;

  const willPin = !conv.isPinned;
  conv.isPinned = willPin;
  conv.pinnedAt = willPin ? Date.now() : 0;

  sortConversationsList(convs);
  saveActiveConversations(convs);

  const me = getCurrentUserIdentity();
  if(typeof fbSetConversationPinStatus === 'function' && me && me.slug){
    fbSetConversationPinStatus(chatId, me.slug, willPin);
  }

  try {
    if(navigator.vibrate) navigator.vibrate(willPin ? [35, 45, 35] : 35);
  } catch(e){}

  if(willPin){
    toast(`📌 '${conv.peerName || 'চ্যাট'}' ইনবক্সের শীর্ষে পিন করা হয়েছে ⭐`);
  } else {
    toast(`📌 '${conv.peerName || 'চ্যাট'}' পিন থেকে সরানো হয়েছে`);
  }

  refreshCommunityChatListStream();
};

window.showArchiveUndoSnackbar = function(chatId, peerName, wasArchived){
  lastArchivedChatInfo = { chatId, peerName, wasArchived };
  const snackbar = document.getElementById('archiveUndoSnackbar');
  const textEl = document.getElementById('archiveUndoText');
  if(!snackbar) return;

  if(textEl){
    textEl.innerHTML = `📦 <strong>${escapeHtml(peerName)}</strong> এর সাথে চ্যাটটি আর্কাইভে রাখা হয়েছে`;
  }
  snackbar.classList.add('show');

  if(archiveUndoTimer) clearTimeout(archiveUndoTimer);
  archiveUndoTimer = setTimeout(() => {
    dismissArchiveUndoSnackbar();
  }, 5000);
};

window.dismissArchiveUndoSnackbar = function(){
  const snackbar = document.getElementById('archiveUndoSnackbar');
  if(snackbar) snackbar.classList.remove('show');
  if(archiveUndoTimer) clearTimeout(archiveUndoTimer);
  lastArchivedChatInfo = null;
};

window.triggerArchiveUndo = function(){
  if(lastArchivedChatInfo && lastArchivedChatInfo.chatId){
    unarchiveConversation(lastArchivedChatInfo.chatId, true);
  }
  dismissArchiveUndoSnackbar();
};

window.animateAndPerformArchive = function(chatId, isCurrentlyArchived){
  const wrapper = document.getElementById('swipe-wrap-' + chatId);
  if(!wrapper){
    if(isCurrentlyArchived){
      unarchiveConversation(chatId, true);
    } else {
      archiveConversation(chatId, true);
    }
    return;
  }

  // Trigger smooth exit transition
  wrapper.classList.add('swipe-archived-exit');
  requestAnimationFrame(() => {
    wrapper.classList.add('animating');
  });

  setTimeout(() => {
    if(isCurrentlyArchived){
      unarchiveConversation(chatId, true);
    } else {
      archiveConversation(chatId, true);
    }
  }, 320);
};

window.initChatSwipeGestures = function(){
  const wrappers = document.querySelectorAll('.swipe-chat-wrapper');
  wrappers.forEach(wrapper => {
    const card = wrapper.querySelector('.swipe-chat-card');
    const backdrop = wrapper.querySelector('.swipe-action-backdrop');
    const chatId = wrapper.getAttribute('data-chat-id');
    const isArchived = wrapper.getAttribute('data-is-archived') === 'true';
    if(!card || card._swipeInitialized) return;
    card._swipeInitialized = true;

    let startX = 0;
    let startY = 0;
    let isPointerDown = false;
    let isSwiping = false;
    let hasMoved = false;
    let startTime = 0;
    let longPressTimer = null;
    let isLongPressed = false;

    const clearLongPress = () => {
      if(longPressTimer){
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };

    const onPointerDown = (e) => {
      // Don't drag or long-press if interactive button or link is clicked
      if(e.target.closest('button, a, input, select, textarea, .btn, .chip-filter, .chat-star-btn')) return;
      isPointerDown = true;
      startX = e.clientX;
      startY = e.clientY;
      startTime = Date.now();
      hasMoved = false;
      isSwiping = false;
      isLongPressed = false;
      card.style.transition = 'none';

      // Long-press detection to pin/unpin to top
      clearLongPress();
      longPressTimer = setTimeout(() => {
        if(isPointerDown && !isSwiping && !hasMoved){
          isLongPressed = true;
          hasMoved = true; // suppress subsequent click
          card.classList.add('card-longpress-active');
          toggleConversationPin(chatId);
          setTimeout(() => {
            card.classList.remove('card-longpress-active');
          }, 350);
        }
      }, 500);
    };

    const onPointerMove = (e) => {
      if(!isPointerDown) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      // Cancel long press if movement detected
      if(Math.abs(dx) > 8 || Math.abs(dy) > 8){
        clearLongPress();
      }

      if(isLongPressed) return;

      if(!isSwiping){
        // Vertical scroll detection: let native page scroll happen
        if(Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)){
          isPointerDown = false;
          clearLongPress();
          return;
        }
        // Horizontal swipe initiation
        if(Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)){
          isSwiping = true;
          hasMoved = true;
          clearLongPress();
          wrapper.classList.add('is-swiping');
          try { card.setPointerCapture(e.pointerId); } catch(err){}
        }
      }

      if(isSwiping){
        // Swiping left (dx < 0), with gentle resistance for swiping right
        const clampedDx = dx < 0 ? Math.max(-170, dx) : Math.min(25, dx * 0.3);
        card.style.transform = `translateX(${clampedDx}px)`;

        // Highlight backdrop when passed archive threshold (-85px)
        if(clampedDx < -85){
          if(backdrop) backdrop.classList.add('threshold-reached');
        } else {
          if(backdrop) backdrop.classList.remove('threshold-reached');
        }
      }
    };

    const onPointerUp = (e) => {
      clearLongPress();
      if(isLongPressed){
        isPointerDown = false;
        setTimeout(() => { isLongPressed = false; hasMoved = false; }, 200);
        return;
      }
      if(!isPointerDown && !isSwiping) return;
      isPointerDown = false;
      wrapper.classList.remove('is-swiping');
      if(backdrop) backdrop.classList.remove('threshold-reached');

      try {
        if(card.hasPointerCapture && card.hasPointerCapture(e.pointerId)){
          card.releasePointerCapture(e.pointerId);
        }
      } catch(err){}

      if(isSwiping){
        card.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.25s ease';
        const dx = e.clientX - startX;
        const dt = Math.max(1, Date.now() - startTime);
        const velocity = Math.abs(dx) / dt;

        // Archive triggered if dragged past -85px or quick flick past -50px with velocity > 0.4
        if(dx < -85 || (dx < -50 && velocity > 0.4)){
          animateAndPerformArchive(chatId, isArchived);
        } else if(dx < -40){
          // Snap open so the user can easily see and click the archive button
          card.style.transform = 'translateX(-85px)';
        } else {
          // Snap back
          card.style.transform = 'translateX(0px)';
        }

        // Suppress click event after swipe
        setTimeout(() => { hasMoved = false; isSwiping = false; }, 120);
      }
    };

    card.addEventListener('pointerdown', onPointerDown);
    card.addEventListener('pointermove', onPointerMove);
    card.addEventListener('pointerup', onPointerUp);
    card.addEventListener('pointercancel', onPointerUp);

    // Suppress click if swiping or long-pressed occurred
    card.addEventListener('click', (e) => {
      if(hasMoved || isSwiping || isLongPressed){
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
  });
};

window.initActiveChatsFirestoreSync = function(){
  const me = getCurrentUserIdentity();
  if(!me || !me.slug) return;
  if(typeof fbListenActiveChats === 'function'){
    fbListenActiveChats(me.slug, (cloudChats) => {
      if(!Array.isArray(cloudChats)) return;
      let hasChanges = false;
      const convs = getActiveConversations();

      cloudChats.forEach(cloud => {
        const chatId = cloud.chatId || cloud.id;
        if(!chatId) return;

        // find peer
        let peer = null;
        if(Array.isArray(cloud.participants)){
          peer = cloud.participants.find(p => (typeof p === 'object' ? p.slug !== me.slug : p !== me.slug));
        }
        const peerSlug = typeof peer === 'object' ? peer.slug : (peer || 'peer');
        const peerName = typeof peer === 'object' ? peer.name : (cloud.lastSenderSlug !== me.slug ? cloud.lastSender : peerSlug);
        const peerAvatar = typeof peer === 'object' ? peer.avatar : '🧑‍🎓';
        const peerBadge = typeof peer === 'object' ? peer.badge : 'student';

        const peerTyping = cloud.typingStatus && cloud.typingStatus[peerSlug];
        const isPeerTypingNow = !!(peerTyping && peerTyping.isTyping && (Date.now() - (peerTyping.updatedAt || 0) < 6500));

        const cloudIsArchived = cloud.archivedBy && typeof cloud.archivedBy[me.slug] !== 'undefined' ? !!cloud.archivedBy[me.slug] : undefined;
        const cloudIsPinned = cloud.pinnedBy && typeof cloud.pinnedBy[me.slug] !== 'undefined' ? !!cloud.pinnedBy[me.slug] : undefined;

        let existing = convs.find(c => c.chatId === chatId);
        if(existing){
          if(typeof cloudIsArchived !== 'undefined' && existing.isArchived !== cloudIsArchived){
            existing.isArchived = cloudIsArchived;
            hasChanges = true;
          }
          if(typeof cloudIsPinned !== 'undefined' && existing.isPinned !== cloudIsPinned){
            existing.isPinned = cloudIsPinned;
            existing.pinnedAt = cloudIsPinned ? (existing.pinnedAt || Date.now()) : 0;
            hasChanges = true;
          }
          if(existing.isTyping !== isPeerTypingNow){
            existing.isTyping = isPeerTypingNow;
            hasChanges = true;
          }
          if(cloud.lastMessageAt && cloud.lastMessageAt > (existing.lastMessageAt || 0)){
            existing.lastMessage = cloud.lastMessage || existing.lastMessage;
            existing.lastSenderSlug = cloud.lastSenderSlug || existing.lastSenderSlug;
            existing.lastSenderName = cloud.lastSender || existing.lastSenderName;
            existing.lastMessageAt = cloud.lastMessageAt;
            existing.status = cloud.messageState?.status || 'delivered';
            if(cloud.lastSenderSlug !== me.slug && (!activeDirectChatInfo || activeDirectChatInfo.chatId !== chatId)){
              existing.unreadCount = (existing.unreadCount || 0) + 1;
            }
            hasChanges = true;
          }
        } else if(cloud.lastMessage){
          convs.unshift({
            chatId,
            peerSlug,
            peerName: peerName || 'সহপাঠী',
            peerAvatar: peerAvatar || '🧑‍🎓',
            peerBadge: peerBadge || 'student',
            peerRole: peerBadge || 'student',
            peerInstitution: '',
            lastMessage: cloud.lastMessage,
            lastSenderSlug: cloud.lastSenderSlug || peerSlug,
            lastSenderName: cloud.lastSender || peerName,
            lastMessageAt: cloud.lastMessageAt || Date.now(),
            unreadCount: cloud.lastSenderSlug !== me.slug ? 1 : 0,
            status: cloud.messageState?.status || 'delivered',
            isOnline: true,
            isTyping: isPeerTypingNow,
            isArchived: typeof cloudIsArchived !== 'undefined' ? cloudIsArchived : false,
            isPinned: typeof cloudIsPinned !== 'undefined' ? cloudIsPinned : false,
            pinnedAt: cloudIsPinned ? Date.now() : 0
          });
          hasChanges = true;
        }
      });

      if(hasChanges){
        sortConversationsList(convs);
        saveActiveConversations(convs);
        if(window.currentCommunityViewMode === 'chats'){
          refreshCommunityChatListStream();
        }
      }
    });
  }
};

function getChatListContentHtml(stud, isTeacher){
  const me = getCurrentUserIdentity();
  const allConvs = getActiveConversations();

  const activeConvs = allConvs.filter(c => !c.isArchived);
  const archivedConvs = allConvs.filter(c => !!c.isArchived);

  // Counts
  const activeCount = activeConvs.length;
  const archivedCount = archivedConvs.length;
  const pinnedCount = activeConvs.filter(c => !!c.isPinned).length;
  const teachersCount = activeConvs.filter(c => c.peerRole === 'teacher' || c.peerBadge === 'verified_teacher' || (c.peerSlug && c.peerSlug.includes('teacher'))).length;
  const verifiedCount = activeConvs.filter(c => c.peerBadge === 'verified_private' || c.peerBadge === 'verified_teacher' || c.peerRole === 'verified').length;
  const unreadCount = activeConvs.filter(c => (c.unreadCount || 0) > 0).length;

  const isArchivedView = currentChatListFilter === 'archived';
  const isPinnedFilter = currentChatListFilter === 'pinned';
  const baseList = isArchivedView ? archivedConvs : activeConvs;

  // Filter conversations
  let filtered = baseList.filter(conv => {
    // Search query
    if(currentChatListSearch){
      const nameMatch = (conv.peerName || '').toLowerCase().includes(currentChatListSearch);
      const slugMatch = (conv.peerSlug || '').toLowerCase().includes(currentChatListSearch);
      const msgMatch = (conv.lastMessage || '').toLowerCase().includes(currentChatListSearch);
      if(!nameMatch && !slugMatch && !msgMatch) return false;
    }

    if(isArchivedView) return true;

    // Filter chip
    if(currentChatListFilter === 'pinned'){
      return !!conv.isPinned;
    }
    if(currentChatListFilter === 'teachers'){
      return conv.peerRole === 'teacher' || conv.peerBadge === 'verified_teacher' || (conv.peerSlug && conv.peerSlug.includes('teacher'));
    }
    if(currentChatListFilter === 'verified'){
      return conv.peerBadge === 'verified_private' || conv.peerBadge === 'verified_teacher' || conv.peerRole === 'verified';
    }
    if(currentChatListFilter === 'unread'){
      return (conv.unreadCount || 0) > 0;
    }
    return true;
  });

  const cardsHtml = filtered.length === 0 ? `
    <div style="background:#fff; border-radius:14px; border:1.5px dashed var(--paper-edge); padding:36px 20px; text-align:center; margin-top:10px;">
      <div style="font-size:42px; margin-bottom:10px;">${isArchivedView ? '📦' : (isPinnedFilter ? '📌' : '💬')}</div>
      <h3 style="margin-bottom:6px; font-size:17.5px; color:var(--ink);">
        ${isArchivedView ? 'কোনো আর্কাইভ করা চ্যাট নেই' : (isPinnedFilter ? 'কোনো পিন করা চ্যাট নেই' : 'কোনো কথোপকথন পাওয়া যায়নি')}
      </h3>
      <p class="hint" style="margin-bottom:16px;">
        ${isArchivedView ? 'ইনবক্স পরিচ্ছন্ন রাখতে যেকোনো কথোপকথন বামে সোয়াইপ (Swipe Left ⇦) করে এখানে আর্কাইভ করতে পারেন।' : (isPinnedFilter ? 'যেকোনো চ্যাটে লং-প্রেস বা ⭐ স্টার আইকন চেপে ইনবক্সের শীর্ষে পিন করে রাখুন।' : (currentChatListSearch ? 'আপনার অনুসন্ধান অনুযায়ী কোনো চ্যাট পাওয়া যায়নি। অন্য নাম দিয়ে চেষ্টা করুন।' : 'সহপাঠী ও শিক্ষকদের সাথে সরাসরি ১-অন-১ মেসেজিং শুরু করুন!'))}
      </p>
      <div style="display:flex; justify-content:center; gap:8px;">
        ${isArchivedView || isPinnedFilter ? `<button class="btn btn-gold" onclick="setChatListFilter('all')">← মূল ইনবক্সে ফিরুন</button>` : `
          ${currentChatListSearch ? `<button class="btn btn-outline" onclick="filterChatListView('')">সব চ্যাট দেখুন</button>` : ''}
          <button class="btn btn-gold" onclick="openNewChatPickerModal()">+ নতুন চ্যাট শুরু করুন</button>
        `}
      </div>
    </div>
  ` : filtered.map(c => {
    const isMeLast = c.lastSenderSlug === me.slug || c.lastSenderName === me.name;
    const isTeacherPeer = c.peerRole === 'teacher' || c.peerBadge === 'verified_teacher' || (c.peerSlug && c.peerSlug.includes('teacher'));
    const isVerifiedPeer = isTeacherPeer || c.peerBadge === 'verified_private' || c.peerRole === 'verified';
    const hasUnread = (c.unreadCount || 0) > 0;
    const timeFormatted = formatRelativeChatTime(c.lastMessageAt);
    const isArchived = !!c.isArchived;
    const isPinned = !!c.isPinned;

    return `
      <div class="swipe-chat-wrapper" id="swipe-wrap-${c.chatId}" data-chat-id="${c.chatId}" data-is-archived="${isArchived}">
        <!-- Swipe Action Backdrop Behind Card -->
        <div class="swipe-action-backdrop ${isArchived ? 'is-unarchive' : ''}">
          <div class="swipe-action-right-content">
            <button class="swipe-action-btn" onclick="event.stopPropagation(); toggleConversationArchive('${c.chatId}')" title="${isArchived ? 'ইনবক্সে আনুন' : 'আর্কাইভ করুন'}">
              <span class="swipe-action-icon">${isArchived ? '📤' : '📥'}</span>
              <span class="swipe-action-text">${isArchived ? 'আন-আর্কাইভ' : 'আর্কাইভ'}</span>
            </button>
          </div>
        </div>

        <!-- Slidable Conversation Card -->
        <div class="card swipe-chat-card ${isPinned ? 'is-pinned-card' : ''}" 
             style="padding:14px 16px; border-radius:14px; background:${isPinned ? 'rgba(217,164,65,0.06)' : (hasUnread ? 'rgba(217,164,65,0.04)' : '#fff')}; border:1.5px solid ${isPinned ? 'var(--gold)' : (hasUnread ? 'var(--gold)' : 'var(--paper-edge)')}; display:flex; align-items:center; justify-content:space-between; gap:12px; cursor:pointer;" 
             onclick="openDirectChat('${c.peerSlug}', '${escapeHtml(c.peerName)}', '${c.peerAvatar || '🧑‍🎓'}', '${c.peerBadge || 'student'}')" 
             onmouseover="this.style.boxShadow='0 4px 14px -4px rgba(31,42,68,0.18)';" 
             onmouseout="this.style.boxShadow='var(--card-shadow)';">
          <div style="display:flex; align-items:center; gap:12px; flex:1; min-width:0;">
            <!-- Avatar with online indicator & pin icon badge -->
            <div style="position:relative; flex-shrink:0;">
              <div style="width:48px; height:48px; border-radius:50%; background:#fff; display:flex; align-items:center; justify-content:center; font-size:24px; border:2px solid ${isPinned ? 'var(--gold)' : (isTeacherPeer ? 'var(--gold)' : (isVerifiedPeer ? '#10B981' : 'var(--paper-edge)'))}; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
                ${c.peerAvatar || '🧑‍🎓'}
              </div>
              <span style="position:absolute; bottom:1px; right:1px; width:11px; height:11px; border-radius:50%; background:#10B981; border:2px solid #fff;"></span>
              ${isPinned ? `
                <span style="position:absolute; top:-3px; left:-3px; width:18px; height:18px; border-radius:50%; background:var(--gold); color:#fff; display:flex; align-items:center; justify-content:center; font-size:10px; box-shadow:0 1px 4px rgba(0,0,0,0.25);" title="শীর্ষে পিন করা চ্যাট">📌</span>
              ` : ''}
            </div>

            <!-- Conversation Info -->
            <div style="flex:1; min-width:0;">
              <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-bottom:2px;">
                <span style="font-size:14.5px; font-weight:700; color:var(--ink); line-height:1.2;">${escapeHtml(c.peerName)}</span>
                ${isPinned ? '<span class="badge-pinned-gold" title="ইনবক্সের শীর্ষে পিন করা হয়েছে">📌 পিন্ড</span>' : ''}
                ${isTeacherPeer ? '<span class="badge-teacher">👨‍🏫 শিক্ষক ✓</span>' : (isVerifiedPeer ? '<span class="badge-verified-gold">⭐ ভেরিফাইড ✓</span>' : '<span class="badge-public-stud">🧑‍🎓 শিক্ষার্থী</span>')}
                ${isArchived ? '<span style="background:rgba(37,99,235,0.1); color:#2563EB; border:1px solid rgba(37,99,235,0.25); font-size:10.5px; font-weight:700; padding:1px 6px; border-radius:8px;">📦 আর্কাইভড</span>' : ''}
              </div>

              ${c.peerInstitution ? `<div style="font-size:11px; color:var(--pencil); margin-bottom:4px;">${escapeHtml(c.peerInstitution)}</div>` : ''}

              <!-- Last message snippet / Live Typing indicator -->
              <div style="font-size:12.5px; color:${hasUnread ? 'var(--ink)' : 'var(--pencil)'}; font-weight:${hasUnread ? '700' : '400'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:flex; align-items:center; gap:4px;">
                ${c.isTyping ? `
                  <span style="color:#10B981; font-weight:700; font-style:italic; display:inline-flex; align-items:center; gap:5px;">
                    <span class="typing-dots" style="margin-right:2px;">
                      <span class="typing-dot" style="width:5px; height:5px; background:#10B981;"></span>
                      <span class="typing-dot" style="width:5px; height:5px; background:#10B981;"></span>
                      <span class="typing-dot" style="width:5px; height:5px; background:#10B981;"></span>
                    </span>
                    ...is typing
                  </span>
                ` : `
                  ${isMeLast ? '<span style="color:var(--gold); font-weight:600; flex-shrink:0;">আপনি:</span>' : ''}
                  <span style="overflow:hidden; text-overflow:ellipsis;">${escapeHtml(c.lastMessage || 'কোনো বার্তা নেই')}</span>
                `}
              </div>
            </div>
          </div>

          <!-- Meta & Actions -->
          <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px; flex-shrink:0;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-size:11px; color:var(--pencil);">${timeFormatted}</span>
              ${hasUnread ? `
                <span style="background:var(--margin-red); color:#fff; font-size:10.5px; font-weight:700; padding:1px 7px; border-radius:10px;">${c.unreadCount} নতুন</span>
              ` : (isMeLast ? `
                <span class="chat-read-receipt ${c.status === 'read' || c.isRead ? 'is-read' : 'is-delivered'}" style="margin-left:0; font-size:11.5px;" title="${c.status === 'read' || c.isRead ? 'পড়া হয়েছে (Seen · Read)' : 'প্রেরিত (Sent)'}">✓✓</span>
              ` : '')}
            </div>

            <div style="display:flex; align-items:center; gap:5px;" onclick="event.stopPropagation()">
              <!-- Star / Pin Icon Button (User Explicit Request: tap star icon or long-press) -->
              <button class="chat-star-btn ${isPinned ? 'is-active' : ''}" 
                      title="${isPinned ? 'শীর্ষ থেকে পিন সরান (ট্যাপ বা লং-প্রেস)' : 'ইনবক্সের শীর্ষে পিন করুন (ট্যাপ বা লং-প্রেস)'}" 
                      onclick="toggleConversationPin('${c.chatId}')">
                ${isPinned ? '⭐' : '☆'}
              </button>
              <button class="btn btn-outline" style="font-size:11px; padding:4px 8px; border-radius:8px;" onclick="openUserProfileModal('${c.peerSlug}', '${escapeHtml(c.peerName)}')">👤 প্রোফাইল</button>
              <button class="btn btn-outline" style="font-size:11px; padding:4px 8px; border-radius:8px; color:var(--ink);" title="${isArchived ? 'আর্কাইভ থেকে ইনবক্সে ফিরিয়ে আনুন' : 'সোয়াইপ বা ক্লিক করে আর্কাইভ করুন'}" onclick="toggleConversationArchive('${c.chatId}')">
                ${isArchived ? '📤 আন-আর্কাইভ' : '📥 আর্কাইভ'}
              </button>
              <button class="btn btn-gold" style="font-size:11.5px; padding:4px 12px; border-radius:8px; font-weight:700;" onclick="openDirectChat('${c.peerSlug}', '${escapeHtml(c.peerName)}', '${c.peerAvatar || '🧑‍🎓'}', '${c.peerBadge || 'student'}')">💬 চ্যাট</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <!-- Chat List Header & Quick Actions -->
    <div style="background:#fff; border-radius:14px; border:1px solid var(--paper-edge); padding:16px 18px; margin-bottom:14px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="width:40px; height:40px; border-radius:10px; background:rgba(217,164,65,0.15); display:flex; align-items:center; justify-content:center; font-size:22px;">💬</div>
          <div>
            <h3 style="margin:0; font-size:17.5px; color:var(--ink); display:flex; align-items:center; gap:8px;">
              <span>স্টুডেন্ট ডিরেক্ট চ্যাট লিস্ট</span>
              <span style="background:rgba(16,185,129,0.12); color:#059669; border:1px solid rgba(16,185,129,0.25); padding:2px 8px; border-radius:12px; font-size:11px; font-weight:700; display:inline-flex; align-items:center; gap:4px;">
                <span style="width:6px; height:6px; border-radius:50%; background:#10B981;"></span> সক্রিয়
              </span>
            </h3>
            <div style="font-size:12px; color:var(--pencil); margin-top:2px;">সহপাঠী ও শিক্ষকদের সাথে রিয়েল-টাইমে ১-অন-১ সরাসরি প্রাইভেট মেসেজিং</div>
          </div>
        </div>

        <div style="display:flex; align-items:center; gap:6px;">
          <button class="btn btn-outline" style="font-size:12px; padding:6px 12px; border-radius:18px;" onclick="refreshCommunityChatListStream()">🔄 রিফ্রেশ</button>
          <button class="btn btn-gold" style="font-size:12px; font-weight:700; padding:6px 14px; border-radius:18px; box-shadow:0 2px 8px rgba(217,164,65,0.3);" onclick="openNewChatPickerModal()">+ নতুন চ্যাট</button>
        </div>
      </div>

      <!-- Search Input -->
      <div style="margin-bottom:12px;">
        <input 
          type="text" 
          placeholder="🔍 সহপাঠী বা শিক্ষকের নাম, ইউজারনেম বা বার্তা খুঁজুন..." 
          value="${escapeHtml(currentChatListSearch)}" 
          style="margin-bottom:0; font-size:13px; padding:8px 14px; border-radius:10px; width:100%; border:1.5px solid var(--paper-edge);" 
          oninput="filterChatListView(this.value)"
        >
      </div>

      <!-- Filter Chips -->
      <div style="display:flex; gap:6px; overflow-x:auto; padding-bottom:2px;">
        <button class="chip-filter ${currentChatListFilter==='all'?'active':''}" style="font-size:12px; padding:4px 12px; border-radius:14px;" onclick="setChatListFilter('all')">
          🌐 সব সক্রিয় চ্যাট (${activeCount})
        </button>
        ${pinnedCount > 0 ? `
          <button class="chip-filter ${currentChatListFilter==='pinned'?'active':''}" style="font-size:12px; padding:4px 12px; border-radius:14px; background:${currentChatListFilter==='pinned' ? 'rgba(217,164,65,0.22)' : 'rgba(217,164,65,0.08)'}; color:#92580a; border-color:var(--gold); font-weight:700;" onclick="setChatListFilter('pinned')">
            📌 পিন্ড (${pinnedCount})
          </button>
        ` : ''}
        <button class="chip-filter ${currentChatListFilter==='teachers'?'active':''}" style="font-size:12px; padding:4px 12px; border-radius:14px;" onclick="setChatListFilter('teachers')">
          👨‍🏫 কোর্স শিক্ষক (${teachersCount})
        </button>
        <button class="chip-filter ${currentChatListFilter==='verified'?'active':''}" style="font-size:12px; padding:4px 12px; border-radius:14px;" onclick="setChatListFilter('verified')">
          ⭐ ভেরিফাইড ব্যাচ (${verifiedCount})
        </button>
        ${unreadCount > 0 ? `
          <button class="chip-filter ${currentChatListFilter==='unread'?'active':''}" style="font-size:12px; padding:4px 12px; border-radius:14px; background:rgba(191,58,44,0.1); color:var(--margin-red); border-color:rgba(191,58,44,0.3);" onclick="setChatListFilter('unread')">
            📩 অপঠিত (${unreadCount})
          </button>
        ` : ''}
        ${archivedCount > 0 || isArchivedView ? `
          <button class="chip-filter ${currentChatListFilter==='archived'?'active':''}" style="font-size:12px; padding:4px 12px; border-radius:14px; background:${isArchivedView ? 'rgba(37,99,235,0.15)' : 'rgba(37,99,235,0.06)'}; color:#2563EB; border-color:rgba(37,99,235,0.3);" onclick="setChatListFilter('archived')">
            📦 আর্কাইভড (${archivedCount})
          </button>
        ` : ''}
      </div>

      <!-- Swipe & Pin Tip Pill & Quick Toggle -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; flex-wrap:wrap; gap:6px;">
        <span class="swipe-hint-pill">
          <span>💡</span>
          <span>চ্যাট <strong>লং-প্রেস (Long-press)</strong> বা <strong>⭐ স্টার</strong> চেপে শীর্ষে পিন রাখুন এবং <strong>বামে সোয়াইপ (Swipe Left ⇦)</strong> করে আর্কাইভ করুন</span>
        </span>
        ${archivedCount > 0 && !isArchivedView ? `
          <button style="background:none; border:none; color:var(--gold); font-size:11.5px; font-weight:700; cursor:pointer; text-decoration:underline; display:inline-flex; align-items:center; gap:4px;" onclick="setChatListFilter('archived')">
            📦 আর্কাইভ করা চ্যাট (${archivedCount}) দেখুন
          </button>
        ` : ''}
      </div>
    </div>

    <!-- Archived Banner or Header -->
    ${isArchivedView ? `
      <div style="background:rgba(37,99,235,0.06); border:1px solid rgba(37,99,235,0.22); border-radius:12px; padding:12px 16px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="width:36px; height:36px; border-radius:10px; background:rgba(37,99,235,0.12); display:flex; align-items:center; justify-content:center; font-size:18px;">📦</div>
          <div>
            <div style="font-weight:700; font-size:14.5px; color:var(--ink); display:flex; align-items:center; gap:8px;">
              <span>আর্কাইভ করা চ্যাটসমূহ</span>
              <span style="background:#2563EB; color:#fff; font-size:11px; padding:1px 7px; border-radius:10px;">${archivedCount}</span>
            </div>
            <div style="font-size:11.5px; color:var(--pencil);">ইনবক্স পরিচ্ছন্ন রাখতে লুকানো চ্যাট। সোয়াইপ বা বোতাম চেপে পুনরায় প্রধান ইনবক্সে ফিরিয়ে আনতে পারেন।</div>
          </div>
        </div>
        <button class="btn btn-outline" style="font-size:12px; padding:5px 12px; border-radius:16px;" onclick="setChatListFilter('all')">
          ← মূল ইনবক্সে ফিরে যান
        </button>
      </div>
    ` : (archivedCount > 0 ? `
      <!-- Declutter Banner in Active Inbox -->
      <div class="archived-inbox-banner" onclick="setChatListFilter('archived')">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="width:34px; height:34px; border-radius:10px; background:rgba(217,164,65,0.12); display:flex; align-items:center; justify-content:center; font-size:17px;">📦</div>
          <div>
            <div style="font-weight:700; font-size:13.5px; color:var(--ink);">আর্কাইভ করা চ্যাটসমূহ</div>
            <div style="font-size:11.5px; color:var(--pencil);">${archivedCount} টি চ্যাট প্রধান ইনবক্স থেকে লুকানো রয়েছে</div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <span style="background:var(--paper-edge); color:var(--ink); font-size:11.5px; font-weight:700; padding:2px 8px; border-radius:12px;">${archivedCount}</span>
          <span style="font-size:12px; font-weight:700; color:var(--gold);">দেখুন →</span>
        </div>
      </div>
    ` : '')}

    <!-- Active Stream List -->
    <div id="activeChatStreamItems">
      ${cardsHtml}
    </div>
  `;
}

window.renderCommunityChatListViewHtml = function(stud, isTeacher){
  // Trigger Firestore sync listener
  initActiveChatsFirestoreSync();

  setTimeout(() => {
    if(typeof initChatSwipeGestures === 'function') initChatSwipeGestures();
  }, 40);

  return `
    <div id="communityChatListContainer">
      ${getChatListContentHtml(stud, isTeacher)}
    </div>
  `;
};

// ----------------------------------------------------------------------------
// Modal for picking any peer to initiate a brand-new chat
// ----------------------------------------------------------------------------
window.openNewChatPickerModal = function(){
  const me = getCurrentUserIdentity();
  const allProfiles = getAllUserProfiles();

  // Combine registered profiles with default peer contacts
  const peersMap = {};

  // Add default mentors/peers
  peersMap['teacher_mentor'] = {
    slug: 'teacher_mentor',
    name: 'সৈকত স্যার (কোর্স শিক্ষক)',
    avatar: '👨‍🏫',
    role: 'teacher',
    badge: 'verified_teacher',
    institution: 'কোর্স মেন্টর & স্পেশালিস্ট',
    bio: 'ডাউট সলভিং ও একাডেমিক গাইডেন্স'
  };

  peersMap['samia_hsc26'] = {
    slug: 'samia_hsc26',
    name: 'সামিয়া আক্তার',
    avatar: '🎓',
    role: 'student',
    badge: 'verified_private',
    institution: 'নটর ডেম কলেজ · HSC \'26',
    bio: 'ডেইলি স্টাডি গোল ও কুইজ পার্টনার'
  };

  peersMap['rakib_hsc26'] = {
    slug: 'rakib_hsc26',
    name: 'রাকিব হাসান',
    avatar: '🧑‍🎓',
    role: 'student',
    badge: 'public_student',
    institution: 'ঢাকা রেসিডেন্সিয়াল মডেল কলেজ',
    bio: 'বিজ্ঞান বিভাগ শিক্ষার্থী'
  };

  peersMap['tanvir_science'] = {
    slug: 'tanvir_science',
    name: 'তানভীর আহমেদ',
    avatar: '🎓',
    role: 'student',
    badge: 'verified_private',
    institution: 'রাজউক উত্তরা মডেল কলেজ',
    bio: 'ম্যাথ ও ফিজিক্স অলিম্পিয়াড প্র্যাকটিস'
  };

  // Merge saved profiles
  Object.values(allProfiles).forEach(p => {
    if(p && p.slug && p.slug !== me.slug){
      peersMap[p.slug] = { ...(peersMap[p.slug] || {}), ...p };
    }
  });

  const availablePeers = Object.values(peersMap).filter(p => p.slug !== me.slug);

  const old = document.getElementById('newChatPickerModalOverlay');
  if(old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'newChatPickerModalOverlay';
  overlay.className = 'community-modal-overlay';
  overlay.onclick = function(e){
    if(e.target === overlay) overlay.remove();
  };

  overlay.innerHTML = `
    <div class="community-modal" style="max-width:480px; padding:0; overflow:hidden;" onclick="event.stopPropagation()">
      <div class="community-modal-header" style="padding:14px 18px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:22px;">💬</span>
          <div>
            <h3 style="margin:0; font-size:16.5px; color:var(--ink);">নতুন চ্যাট শুরু করুন</h3>
            <span style="font-size:11.5px; color:var(--pencil);">সহপাঠী বা কোর্স শিক্ষক নির্বাচন করুন</span>
          </div>
        </div>
        <button class="reaction-btn" style="padding:4px 9px;" onclick="document.getElementById('newChatPickerModalOverlay').remove()">✕</button>
      </div>

      <div style="padding:14px 18px; max-height:68vh; overflow-y:auto;">
        <!-- Search box -->
        <div style="margin-bottom:12px;">
          <input 
            type="text" 
            id="pickerPeerSearchInput" 
            placeholder="🔍 সহপাঠীর নাম বা কলেজ দিয়ে খুঁজুন..." 
            style="margin-bottom:0; font-size:13px; padding:8px 12px; border-radius:10px;" 
            oninput="filterNewChatPickerPeers(this.value)"
          >
        </div>

        <div id="newChatPeersList" style="display:flex; flex-direction:column; gap:8px;">
          ${availablePeers.map(p => `
            <div class="peer-picker-item" data-name="${escapeHtml((p.name || '').toLowerCase())}" data-slug="${escapeHtml((p.slug || '').toLowerCase())}" data-inst="${escapeHtml((p.institution || '').toLowerCase())}" style="background:var(--paper); border:1px solid var(--paper-edge); border-radius:12px; padding:12px; display:flex; align-items:center; justify-content:space-between; cursor:pointer; transition:border-color .1s ease;" onclick="document.getElementById('newChatPickerModalOverlay').remove(); openDirectChat('${p.slug}', '${escapeHtml(p.name)}', '${p.avatar || '🧑‍🎓'}', '${p.badge || 'student'}')">
              <div style="display:flex; align-items:center; gap:10px;">
                <div style="width:42px; height:42px; border-radius:50%; background:#fff; display:flex; align-items:center; justify-content:center; font-size:22px; border:1.5px solid ${p.role==='teacher'?'var(--gold)':'var(--paper-edge)'};">
                  ${p.avatar || '🧑‍🎓'}
                </div>
                <div>
                  <div style="font-size:14px; font-weight:700; color:var(--ink); display:flex; align-items:center; gap:6px;">
                    <span>${escapeHtml(p.name)}</span>
                    ${p.role==='teacher'||p.badge==='verified_teacher' ? '<span class="badge-teacher">শিক্ষক ✓</span>' : (p.badge==='verified_private' ? '<span class="badge-verified-gold">⭐ ভেরিফাইড</span>' : '')}
                  </div>
                  <div style="font-size:11.5px; color:var(--pencil);">
                    ${p.institution ? escapeHtml(p.institution) : `@${escapeHtml(p.slug)}`}
                  </div>
                </div>
              </div>
              <button class="btn btn-gold" style="font-size:11.5px; padding:5px 12px; border-radius:8px; font-weight:700;">চ্যাট শুরু →</button>
            </div>
          `).join('')}
        </div>

        <!-- Custom Username Direct Connect -->
        <div style="margin-top:16px; padding-top:12px; border-top:1px dashed var(--paper-edge);">
          <div style="font-size:12px; font-weight:600; color:var(--ink); margin-bottom:6px;">💡 নির্দিষ্ট কোনো শিক্ষার্থীর ইউজারনেম দিয়ে চ্যাট করতে চান?</div>
          <div style="display:flex; gap:6px;">
            <input type="text" id="customPeerSlugInput" placeholder="যেমন: student_sakib" style="margin-bottom:0; font-size:12.5px; padding:7px 10px; border-radius:8px; flex:1;">
            <button class="btn btn-outline" style="font-size:12px; padding:7px 12px; white-space:nowrap;" onclick="
              const input = document.getElementById('customPeerSlugInput');
              if(input && input.value.trim()){
                const val = input.value.trim();
                document.getElementById('newChatPickerModalOverlay').remove();
                openDirectChat(slugify(val), val, '🧑‍🎓', 'student');
              }
            ">খুলুন 💬</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
};

window.filterNewChatPickerPeers = function(val){
  const q = (val || '').trim().toLowerCase();
  const items = document.querySelectorAll('.peer-picker-item');
  items.forEach(it => {
    const name = it.getAttribute('data-name') || '';
    const slug = it.getAttribute('data-slug') || '';
    const inst = it.getAttribute('data-inst') || '';
    const match = name.includes(q) || slug.includes(q) || inst.includes(q);
    it.style.display = match ? 'flex' : 'none';
  });
};

// ----------------------------------------------------------------------------
// Personal Chat Inbox Modal (Lists all active conversations)
// ----------------------------------------------------------------------------
window.openChatInboxModal = function(){
  // If community is accessible, redirecting to the dedicated Chat List view is the best experience,
  // but we also keep this quick floating modal for access from dashboard hero buttons!
  const me = getCurrentUserIdentity();
  const allConvs = getActiveConversations();

  const old = document.getElementById('chatInboxModalOverlay');
  if(old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'chatInboxModalOverlay';
  overlay.className = 'community-modal-overlay';
  overlay.onclick = function(e){
    if(e.target === overlay) overlay.remove();
  };

  overlay.innerHTML = `
    <div class="community-modal" style="max-width:480px; padding:0; overflow:hidden;" onclick="event.stopPropagation()">
      <div class="community-modal-header" style="padding:14px 18px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:22px;">💬</span>
          <div>
            <h3 style="margin:0; font-size:16.5px; color:var(--ink);">পার্সোনাল চ্যাট ও ইনবক্স</h3>
            <span style="font-size:11.5px; color:var(--pencil);">সহপাঠী ও শিক্ষকদের সাথে ১-অন-১ প্রাইভেট বার্তা</span>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <button class="btn btn-gold" style="font-size:11px; padding:4px 10px; border-radius:12px;" onclick="document.getElementById('chatInboxModalOverlay').remove(); if(typeof go==='function') { go('community'); setCommunityViewMode('chats'); }">কমিউনিটি চ্যাট ট্যাবে যান ↗</button>
          <button class="reaction-btn" style="padding:4px 9px;" onclick="document.getElementById('chatInboxModalOverlay').remove()">✕</button>
        </div>
      </div>

      <div style="padding:14px 18px; max-height:65vh; overflow-y:auto;">
        <div style="margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
          <input type="text" placeholder="🔍 সহপাঠীর নাম বা ইউজারনেম দিয়ে খুঁজুন..." style="margin-bottom:0; font-size:13px; padding:8px 12px; border-radius:10px; flex:1;" oninput="filterInboxPeers(this.value)">
          <button class="btn btn-outline" style="margin-left:6px; font-size:12px; padding:7px 10px; border-radius:10px; white-space:nowrap;" onclick="document.getElementById('chatInboxModalOverlay').remove(); openNewChatPickerModal()">+ নতুন চ্যাট</button>
        </div>

        <div id="inboxPeersList" style="display:flex; flex-direction:column; gap:8px;">
          ${allConvs.map(c => `
            <div class="inbox-peer-card" data-search="${escapeHtml((c.peerName + ' ' + (c.peerSlug||'') + ' ' + (c.lastMessage||'')).toLowerCase())}" style="background:var(--paper); border:1px solid var(--paper-edge); border-radius:12px; padding:12px; display:flex; align-items:center; justify-content:space-between; cursor:pointer;" onclick="document.getElementById('chatInboxModalOverlay').remove(); openDirectChat('${c.peerSlug}', '${escapeHtml(c.peerName)}', '${c.peerAvatar || '🧑‍🎓'}', '${c.peerBadge || 'public'}')">
              <div style="display:flex; align-items:center; gap:10px;">
                <div style="width:40px; height:40px; border-radius:50%; background:#fff; display:flex; align-items:center; justify-content:center; font-size:20px; border:1.5px solid var(--paper-edge);">
                  ${c.peerAvatar || '🧑‍🎓'}
                </div>
                <div>
                  <div style="font-size:14px; font-weight:700; color:var(--ink); display:flex; align-items:center; gap:4px;">
                    <span>${escapeHtml(c.peerName)}</span>
                    ${c.peerRole==='teacher'||c.peerBadge==='verified_teacher' ? '<span class="badge-teacher">শিক্ষক ✓</span>' : (c.peerBadge==='verified_private' ? '<span class="badge-verified-gold">⭐</span>' : '')}
                  </div>
                  <div style="font-size:11.5px; color:var(--pencil); white-space:nowrap; max-width:220px; overflow:hidden; text-overflow:ellipsis;">
                    ${escapeHtml(c.lastMessage || ('@' + c.peerSlug))}
                  </div>
                </div>
              </div>
              <button class="btn btn-outline" style="font-size:11.5px; padding:4px 10px;">চ্যাট →</button>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
};

window.filterInboxPeers = function(val){
  const q = (val || '').trim().toLowerCase();
  const cards = document.querySelectorAll('.inbox-peer-card');
  cards.forEach(card => {
    const s = card.getAttribute('data-search') || '';
    card.style.display = s.includes(q) ? 'flex' : 'none';
  });
};

// ----------------------------------------------------------------------------
// 6. Verified Batch Application & Instant Verification System
// ----------------------------------------------------------------------------
function getStoredVerifiedApps(){
  try {
    const raw = localStorage.getItem('tuition_verified_applications_v1');
    return raw ? JSON.parse(raw) : [];
  } catch(e){ return []; }
}

function saveStoredVerifiedApps(apps){
  try {
    localStorage.setItem('tuition_verified_applications_v1', JSON.stringify(apps));
  } catch(e){}
}

window.openApplyVerifiedModal = function(){
  const me = getCurrentUserIdentity();

  const old = document.getElementById('applyVerifiedModalOverlay');
  if(old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'applyVerifiedModalOverlay';
  overlay.className = 'community-modal-overlay';
  overlay.onclick = function(e){
    if(e.target === overlay) overlay.remove();
  };

  overlay.innerHTML = `
    <div class="community-modal" style="max-width:480px;" onclick="event.stopPropagation()">
      <div class="community-modal-header">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:24px;">⭐</span>
          <div>
            <h3 style="margin:0; font-size:16.5px; color:var(--ink);">ভেরিফাইড ব্যাচের জন্য আবেদন</h3>
            <span style="font-size:11.5px; color:var(--pencil);">Verified Batch Badge Application</span>
          </div>
        </div>
        <button class="reaction-btn" style="padding:4px 9px;" onclick="document.getElementById('applyVerifiedModalOverlay').remove()">✕</button>
      </div>

      <div class="community-modal-body">
        <div style="background:linear-gradient(135deg, rgba(217,164,65,0.14), rgba(217,164,65,0.04)); border:1.5px solid var(--gold); border-radius:12px; padding:12px 14px; margin-bottom:16px;">
          <div style="font-weight:700; color:#8A5805; font-size:13.5px; display:flex; align-items:center; gap:6px;">
            <span>⭐ ভেরিফাইড ব্যাচের বিশেষ সুবিধাসমূহ:</span>
          </div>
          <ul style="margin:6px 0 0 0; padding-left:18px; font-size:12px; color:var(--ink); line-height:1.5;">
            <li>নামের পাশে স্থায়ী গোল্ডেন <b>⭐ ভেরিফাইড প্রাইভেট শিক্ষার্থী ✓</b> ব্যাজ</li>
            <li>শিক্ষকদের সরাসরি নজরদারি ও প্রায়োরিটি ডাউট সলভ</li>
            <li>স্পেশাল প্রাইভেট এক্সাম ও মডেল টেস্ট অ্যাক্সেস</li>
          </ul>
        </div>

        <!-- Method 1: Instant Activation with Teacher Batch Code -->
        <div style="background:#fff; border:1px solid var(--paper-edge); border-radius:12px; padding:14px; margin-bottom:14px;">
          <h4 style="margin:0 0 4px 0; font-size:14px; color:var(--ink);">🔑 পদ্ধতি ১: শিক্ষকের প্রাইভেট ব্যাচ কোড থাকলে লিখুন</h4>
          <p class="hint" style="margin-bottom:8px; font-size:12px;">শিক্ষকের দেওয়া রেজিস্ট্রেশন কোড (যেমন: TUT-A89K2) দিলে সাথে সাথেই অ্যাকাউন্ট ভেরিফাইড হয়ে যাবে।</p>
          <div style="display:flex; gap:6px;">
            <input type="text" id="applyInstantBatchCode" placeholder="যেমন: TUT-A89K2" style="margin-bottom:0; text-transform:uppercase; font-family:var(--font-mono); font-weight:700; font-size:13px;">
            <button class="btn btn-gold" style="font-size:13px; font-weight:700; white-space:nowrap;" onclick="submitInstantBatchVerification()">যাচাই করো</button>
          </div>
        </div>

        <div class="center" style="margin:8px 0; font-size:12px; color:var(--pencil); font-weight:700;">অথবা</div>

        <!-- Method 2: Application to Teacher -->
        <div style="background:#fff; border:1px solid var(--paper-edge); border-radius:12px; padding:14px;">
          <h4 style="margin:0 0 4px 0; font-size:14px; color:var(--ink);">📝 পদ্ধতি ২: শিক্ষককে ভেরিফিকেশনের আবেদন পাঠান</h4>
          <p class="hint" style="margin-bottom:10px; font-size:12px;">আপনার শিক্ষাপ্রতিষ্ঠান ও তথ্য জমা দিন। শিক্ষক রিভিউ করে অনুমোদন করবেন।</p>
          
          <label class="field-label">কলেজ বা স্কুলের নাম *</label>
          <input type="text" id="applyAppInst" placeholder="যেমন: ঢাকা কলেজ / ভিকারুননিসা" value="${escapeHtml(me.institution || '')}">

          <label class="field-label">রোল / স্টুডেন্ট আইডি</label>
          <input type="text" id="applyAppRoll" placeholder="যেমন: Roll 104 বা ব্যাচ HSC '26">

          <label class="field-label">ফোন / WhatsApp নম্বর *</label>
          <input type="text" id="applyAppPhone" placeholder="যেমন: 017XXXXXXXX">

          <button class="btn btn-primary btn-block" style="margin-top:6px;" onclick="submitVerificationFormApplication()">🚀 শিক্ষকের কাছে আবেদন জমা দিন</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
};

window.submitInstantBatchVerification = async function(){
  const code = ((document.getElementById('applyInstantBatchCode')||{}).value||'').trim().toUpperCase();
  if(!code){ toast('রেজিস্ট্রেশন কোড লিখুন'); return; }

  toast('কোড যাচাই করা হচ্ছে...');

  // Query server or accept valid format TUT-XXXXX
  const me = getCurrentUserIdentity();
  let verifiedSuccess = false;

  if(typeof postToScript === 'function'){
    try {
      const res = await postToScript('verifyRegCode', { code, slug: me.slug });
      if(res && res.status === 'success'){
        verifiedSuccess = true;
      }
    } catch(e){}
  }

  // If server is in offline/script mode, accept formatted codes
  if(!verifiedSuccess && code.startsWith('TUT-')){
    verifiedSuccess = true;
  }

  if(verifiedSuccess || code.length >= 6){
    const updated = {
      ...me,
      isPrivateStudent: true,
      isVerified: true,
      badge: 'verified_private',
      studentCode: code
    };

    saveLocalUserProfile(updated);

    const stud = typeof getLoggedStudent === 'function' ? getLoggedStudent() : null;
    if(stud){
      stud.isPrivateStudent = true;
      stud.isVerified = true;
      stud.studentCode = code;
      setLoggedStudent(stud);
    }

    const modal = document.getElementById('applyVerifiedModalOverlay');
    if(modal) modal.remove();

    if(typeof playSfx === 'function') playSfx('victory');
    toast('🎉 অভিনন্দন! আপনি সফলভাবে ⭐ ভেরিফাইড প্রাইভেট শিক্ষার্থী ব্যাজ পেয়েছেন!');
    if(typeof renderCommunityLounge === 'function') renderCommunityLounge();
  } else {
    toast('❌ কোডটি সঠিক নয়! শিক্ষককে বলুন বা আবেদন পাঠান');
    if(typeof playSfx === 'function') playSfx('wrong');
  }
};

window.submitVerificationFormApplication = async function(){
  const inst = ((document.getElementById('applyAppInst')||{}).value||'').trim();
  const roll = ((document.getElementById('applyAppRoll')||{}).value||'').trim();
  const phone = ((document.getElementById('applyAppPhone')||{}).value||'').trim();

  if(!inst || !phone){
    toast('শিক্ষাপ্রতিষ্ঠান ও ফোন নম্বর প্রদান করুন');
    return;
  }

  const me = getCurrentUserIdentity();
  const newApp = {
    id: 'app_' + Date.now(),
    slug: me.slug,
    name: me.name,
    institution: inst,
    studentId: roll,
    phone,
    batchName: 'এইচএসসি ও এডমিশন ব্যাচ',
    status: 'pending',
    appliedAt: Date.now()
  };

  const apps = getStoredVerifiedApps();
  apps.unshift(newApp);
  saveStoredVerifiedApps(apps);

  if(typeof fbSubmitVerifiedApp === 'function'){
    fbSubmitVerifiedApp(newApp);
  }

  const modal = document.getElementById('applyVerifiedModalOverlay');
  if(modal) modal.remove();

  if(typeof playSfx === 'function') playSfx('fanfare');
  toast('🎉 আপনার ভেরিফিকেশন আবেদন সফলভাবে জমা হয়েছে! শিক্ষক অনুমোদন করলেই গোল্ডেন ব্যাজ পাবেন।');
};

// ----------------------------------------------------------------------------
// 7. Teacher Dashboard: Review & Approve Verification Applications
// ----------------------------------------------------------------------------
window.openTeacherVerifiedRequestsModal = async function(){
  let apps = getStoredVerifiedApps();
  if(typeof fbGetVerifiedApps === 'function'){
    try {
      const cloudApps = await fbGetVerifiedApps();
      if(cloudApps && cloudApps.length > 0){
        apps = cloudApps;
        saveStoredVerifiedApps(apps);
      }
    } catch(e){}
  }

  const pendingApps = apps.filter(a => a.status === 'pending');

  const old = document.getElementById('teacherVerifiedRequestsModalOverlay');
  if(old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'teacherVerifiedRequestsModalOverlay';
  overlay.className = 'community-modal-overlay';
  overlay.onclick = function(e){
    if(e.target === overlay) overlay.remove();
  };

  overlay.innerHTML = `
    <div class="community-modal" style="max-width:540px;" onclick="event.stopPropagation()">
      <div class="community-modal-header">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:22px;">⭐</span>
          <div>
            <h3 style="margin:0; font-size:16.5px; color:var(--ink);">ভেরিফাইড ব্যাচের আবেদনসমূহ (${pendingApps.length})</h3>
            <span style="font-size:11.5px; color:var(--pencil);">শিক্ষার্থীদের আবেদন অনুমোদন বা বাতিল করুন</span>
          </div>
        </div>
        <button class="reaction-btn" style="padding:4px 9px;" onclick="document.getElementById('teacherVerifiedRequestsModalOverlay').remove()">✕</button>
      </div>

      <div class="community-modal-body" style="max-height:65vh; overflow-y:auto;">
        ${pendingApps.length === 0 ? `
          <div style="text-align:center; padding:30px 10px; color:var(--pencil); font-size:13px;">
            <div style="font-size:36px; margin-bottom:8px;">✅</div>
            <b>কোনো পেন্ডিং আবেদন নেই!</b>
            <div style="margin-top:4px;">সব শিক্ষার্থীর আবেদন সম্পন্ন করা হয়েছে।</div>
          </div>
        ` : pendingApps.map(app => `
          <div style="background:var(--paper); border:1px solid var(--paper-edge); border-radius:12px; padding:12px 14px; margin-bottom:10px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <div>
                <b style="font-size:14.5px; color:var(--ink);">${escapeHtml(app.name)}</b>
                <span style="font-size:11.5px; color:var(--pencil); margin-left:6px;">@${escapeHtml(app.slug)}</span>
                <div style="font-size:12.5px; color:var(--ink); margin-top:3px;">🏫 ${escapeHtml(app.institution)} ${app.studentId ? `· রোল: ${escapeHtml(app.studentId)}` : ''}</div>
                <div style="font-size:12px; color:var(--pencil); margin-top:2px;">📞 ${escapeHtml(app.phone)}</div>
              </div>
              <div style="display:flex; gap:6px;">
                <button class="btn btn-gold" style="font-size:11.5px; padding:5px 12px; font-weight:700;" onclick="approveStudentVerification('${app.id}', '${app.slug}')">✓ অনুমোদন</button>
                <button class="btn btn-outline" style="font-size:11.5px; padding:5px 9px; color:#EF4444;" onclick="rejectStudentVerification('${app.id}')">✕ বাতিল</button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
};

window.approveStudentVerification = async function(appId, studentSlug){
  const apps = getStoredVerifiedApps();
  const appItem = apps.find(a => a.id === appId);
  if(appItem){
    appItem.status = 'approved';
    saveStoredVerifiedApps(apps);
  }

  // Upgrade student profile to verified private
  const prof = getLocalUserProfile(studentSlug) || { slug: studentSlug };
  prof.isPrivateStudent = true;
  prof.isVerified = true;
  prof.badge = 'verified_private';
  saveLocalUserProfile(prof);

  if(typeof fbUpdateVerifiedAppStatus === 'function'){
    fbUpdateVerifiedAppStatus(appId, 'approved');
  }

  toast('🎉 শিক্ষার্থীকে ভেরিফাইড ব্যাজ প্রদান করা হয়েছে!');
  if(typeof playSfx === 'function') playSfx('combo');
  openTeacherVerifiedRequestsModal();
};

window.rejectStudentVerification = async function(appId){
  const apps = getStoredVerifiedApps();
  const appItem = apps.find(a => a.id === appId);
  if(appItem){
    appItem.status = 'rejected';
    saveStoredVerifiedApps(apps);
  }

  if(typeof fbUpdateVerifiedAppStatus === 'function'){
    fbUpdateVerifiedAppStatus(appId, 'rejected');
  }

  toast('আবেদন বাতিল করা হয়েছে');
  openTeacherVerifiedRequestsModal();
};
