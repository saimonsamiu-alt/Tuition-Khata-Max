// Firebase Client for Study Adda (Mini Educational Instagram)
// Persistent Cloud Firestore & Real-Time Sync

const FIREBASE_CONFIG = {
  projectId: "gen-lang-client-0842896975",
  appId: "1:222526316191:web:cbd380d4421bb3d6824caa",
  apiKey: "AIzaSyCgLK4bGErlApeLG1HbH_kgIppoSnOC4q8",
  authDomain: "gen-lang-client-0842896975.firebaseapp.com",
  storageBucket: "gen-lang-client-0842896975.firebasestorage.app",
  messagingSenderId: "222526316191"
};

const FIRESTORE_DB_ID = "ai-studio-tuitionkhatatest-92a877cc-b993-4610-83a6-b0051e769f73";

let firebaseInitialized = false;
let firestoreDb = null;
let firebaseStorage = null;
let isCloudSyncActive = false;
let cloudSyncListeners = [];

window.initFirebaseService = function(){
  if(firebaseInitialized) return firestoreDb;
  try {
    if(typeof firebase !== 'undefined'){
      if(!firebase.apps.length){
        firebase.initializeApp(FIREBASE_CONFIG);
      }
      try {
        firestoreDb = firebase.app().firestore(FIRESTORE_DB_ID);
      } catch(e) {
        // Fallback to default firestore instance if named database not bound in compat
        firestoreDb = firebase.firestore();
      }
      try {
        if(typeof firebase.storage === 'function'){
          firebaseStorage = firebase.storage();
          console.log('Firebase Storage initialized successfully');
        }
      } catch(stErr){
        console.warn('Firebase Storage init notice:', stErr);
      }
      firebaseInitialized = true;
      isCloudSyncActive = true;
      console.log('Firebase Firestore initialized successfully for Study Adda');
      startRealtimeCommunitySync();
      startRealtimeStorySync();
    }
  } catch(err) {
    console.warn('Firebase init warning (running in offline/local storage mode):', err);
    isCloudSyncActive = false;
  }
  return firestoreDb;
};

// Upload voice audio clip to Firebase Storage
window.fbUploadVoiceClip = async function(blob, chatId, meta){
  initFirebaseService();
  const fileExt = (blob.type && blob.type.includes('mp4')) ? 'm4a' : ((blob.type && blob.type.includes('ogg')) ? 'ogg' : 'webm');
  const fileName = 'voice_' + Date.now() + '_' + Math.floor(Math.random()*10000) + '.' + fileExt;
  const storagePath = 'voice_clips/' + (chatId || 'general') + '/' + fileName;

  // 1. Try uploading to Firebase Storage Cloud Bucket
  if(firebaseStorage){
    try {
      const storageRef = firebaseStorage.ref().child(storagePath);
      const snapshot = await storageRef.put(blob, {
        contentType: blob.type || 'audio/webm',
        customMetadata: {
          chatId: chatId || '',
          duration: String((meta && meta.duration) || 0),
          uploadedAt: String(Date.now())
        }
      });
      const downloadUrl = await snapshot.ref.getDownloadURL();
      if(downloadUrl){
        console.log('Voice clip uploaded to Firebase Storage:', downloadUrl);
        return downloadUrl;
      }
    } catch(err){
      console.warn('Firebase Storage cloud upload notice (using robust data fallback):', err);
    }
  }

  // 2. Reliable Fallback: Base64 audio data URL (ensures audio plays everywhere)
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result);
    };
    reader.readAsDataURL(blob);
  });
};

// Real-time synchronization for community posts
function startRealtimeCommunitySync(){
  if(!firestoreDb) return;
  try {
    firestoreDb.collection('community_posts')
      .orderBy('timestamp', 'desc')
      .limit(60)
      .onSnapshot((snapshot) => {
        if(snapshot.empty) return;
        const remotePosts = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          remotePosts.push({ id: doc.id, ...data });
        });

        if(remotePosts.length > 0){
          // Merge with local storage
          const local = getCommunityPosts();
          const mergedMap = new Map();
          // Remote first
          remotePosts.forEach(p => mergedMap.set(p.id, p));
          // Keep any purely local pending posts
          local.forEach(p => {
            if(!mergedMap.has(p.id)) mergedMap.set(p.id, p);
          });

          const finalPosts = Array.from(mergedMap.values());
          finalPosts.sort((a,b) => (b.timestamp||0) - (a.timestamp||0));
          localStorage.setItem('tuition_community_posts_v1', JSON.stringify(finalPosts));
          
          // Notify community feed if currently viewed
          if(typeof updateCommunityFeedLive === 'function'){
            updateCommunityFeedLive();
          }
          updateCloudSyncStatusIndicator(true);
        }
      }, (err) => {
        console.warn('Realtime listener error:', err);
        updateCloudSyncStatusIndicator(false);
      });
  } catch(err) {
    console.warn('Firestore onSnapshot init error:', err);
  }
}

// Real-time synchronization for 24h Study Stories
function startRealtimeStorySync(){
  if(!firestoreDb) return;
  try {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    firestoreDb.collection('study_stories')
      .where('createdAt', '>=', oneDayAgo)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .onSnapshot((snapshot) => {
        const stories = [];
        snapshot.forEach(doc => {
          stories.push({ id: doc.id, ...doc.data() });
        });
        if(stories.length > 0){
          localStorage.setItem('tuition_study_stories_v1', JSON.stringify(stories));
          if(typeof renderStoriesCarouselHtml === 'function'){
            const el = document.getElementById('studyStoriesContainer');
            if(el) el.innerHTML = renderStoriesCarouselHtml();
          }
        }
      }, (err) => {
        console.warn('Stories listener error:', err);
      });
  } catch(err) {
    console.warn('Stories sync error:', err);
  }
}

// Cloud publish helper
window.fbSavePost = async function(postData){
  initFirebaseService();
  if(!firestoreDb) return null;
  try {
    const docRef = firestoreDb.collection('community_posts').doc(postData.id);
    await docRef.set(postData, { merge: true });
    return postData.id;
  } catch(err) {
    console.warn('Firebase save post error (local saved):', err);
    return null;
  }
};

window.fbUpdatePost = async function(postId, updateData){
  initFirebaseService();
  if(!firestoreDb) return;
  try {
    await firestoreDb.collection('community_posts').doc(postId).update(updateData);
  } catch(err) {
    console.warn('Firebase update error:', err);
  }
};

window.fbSaveStory = async function(storyData){
  initFirebaseService();
  if(!firestoreDb) return null;
  try {
    const docRef = firestoreDb.collection('study_stories').doc(storyData.id);
    await docRef.set(storyData);
    return storyData.id;
  } catch(err) {
    console.warn('Firebase save story error:', err);
    return null;
  }
};

// ============================================================================
// User Social Profiles & Real-time Verification Sync
// ============================================================================
window.fbSaveUserProfile = async function(profile){
  initFirebaseService();
  if(!firestoreDb) return null;
  try {
    const docRef = firestoreDb.collection('user_profiles').doc(profile.slug);
    await docRef.set(profile, { merge: true });
    return profile.slug;
  } catch(err) {
    console.warn('fbSaveUserProfile error:', err);
    return null;
  }
};

window.fbGetUserProfile = async function(slug){
  initFirebaseService();
  if(!firestoreDb) return null;
  try {
    const doc = await firestoreDb.collection('user_profiles').doc(slug).get();
    if(doc.exists) return { slug: doc.id, ...doc.data() };
    return null;
  } catch(err) {
    console.warn('fbGetUserProfile error:', err);
    return null;
  }
};

// ============================================================================
// Personal 1-on-1 Direct Chat & Real-time Messaging
// ============================================================================
window.fbSendChatMessage = async function(chatId, messageObj, conversationMeta){
  initFirebaseService();
  if(!firestoreDb) return null;
  try {
    const msgId = messageObj.id || ('msg_' + Date.now() + '_' + Math.floor(Math.random()*1000));
    const msgData = {
      ...messageObj,
      id: msgId,
      chatId,
      status: messageObj.status || 'sent',
      timestamp: messageObj.timestamp || Date.now()
    };
    const msgRef = firestoreDb.collection('chat_messages').doc(msgId);
    await msgRef.set(msgData);

    // Build participant slugs and details
    const rawSlugs = messageObj.participantSlugs || messageObj.participants || [];
    const participantSlugs = Array.from(new Set([
      ...rawSlugs,
      messageObj.senderSlug,
      conversationMeta && conversationMeta.peerSlug
    ].filter(Boolean)));

    let participants = conversationMeta && conversationMeta.participants;
    if(!participants || !Array.isArray(participants)){
      participants = [
        {
          slug: messageObj.senderSlug,
          name: messageObj.senderName,
          avatar: messageObj.senderAvatar || '🧑‍🎓',
          badge: messageObj.senderBadge || 'student'
        }
      ];
      if(conversationMeta && conversationMeta.peerSlug && conversationMeta.peerSlug !== messageObj.senderSlug){
        participants.push({
          slug: conversationMeta.peerSlug,
          name: conversationMeta.peerName || conversationMeta.peerSlug,
          avatar: conversationMeta.peerAvatar || '🧑‍🎓',
          badge: conversationMeta.peerRole || 'student'
        });
      }
    }

    // Update parent chat metadata with simple message state in Firestore
    const chatDocRef = firestoreDb.collection('personal_chats').doc(chatId);
    const isAudioMsg = !!(messageObj.audioUrl || messageObj.audioLink || messageObj.messageType === 'voice_clip');
    const isPhotoMsg = !!(messageObj.imageUrl || messageObj.imageLink || messageObj.mediaUrl);
    const summaryText = messageObj.text || (isAudioMsg ? '🎤 ভয়েস মেসেজ' : (isPhotoMsg ? '📷 ফটো' : ''));
    await chatDocRef.set({
      chatId,
      participants,
      participantSlugs,
      lastMessage: summaryText,
      lastSender: messageObj.senderName,
      lastSenderSlug: messageObj.senderSlug,
      lastMessageAt: msgData.timestamp,
      updatedAt: Date.now(),
      messageState: {
        status: 'sent',
        lastMessageId: msgId,
        lastMessageText: summaryText,
        lastSenderSlug: messageObj.senderSlug,
        lastSenderName: messageObj.senderName,
        timestamp: msgData.timestamp,
        isRead: false,
        readBy: [messageObj.senderSlug]
      },
      typingStatus: {
        [messageObj.senderSlug]: {
          isTyping: false,
          name: messageObj.senderName,
          updatedAt: Date.now()
        }
      }
    }, { merge: true });

    return msgId;
  } catch(err) {
    console.warn('fbSendChatMessage error:', err);
    return null;
  }
};

let activeChatListenerUnsub = null;
window.fbListenChatMessages = function(chatId, callback){
  initFirebaseService();
  if(activeChatListenerUnsub){
    try{ activeChatListenerUnsub(); }catch(e){}
    activeChatListenerUnsub = null;
  }
  if(!firestoreDb) return;
  try {
    activeChatListenerUnsub = firestoreDb.collection('chat_messages')
      .where('chatId', '==', chatId)
      .orderBy('timestamp', 'asc')
      .limit(100)
      .onSnapshot((snapshot) => {
        const messages = [];
        snapshot.forEach(doc => {
          messages.push({ id: doc.id, ...doc.data() });
        });
        if(typeof callback === 'function') callback(messages);
      }, (err) => {
        console.warn('Chat messages listener error:', err);
      });
  } catch(err) {
    console.warn('fbListenChatMessages error:', err);
  }
};

let activeConversationsListenerUnsub = null;
window.fbListenActiveChats = function(userSlug, callback){
  initFirebaseService();
  if(activeConversationsListenerUnsub){
    try{ activeConversationsListenerUnsub(); }catch(e){}
    activeConversationsListenerUnsub = null;
  }
  if(!firestoreDb) return;
  try {
    activeConversationsListenerUnsub = firestoreDb.collection('personal_chats')
      .orderBy('updatedAt', 'desc')
      .limit(60)
      .onSnapshot((snapshot) => {
        const chats = [];
        snapshot.forEach(doc => {
          const d = { id: doc.id, ...doc.data() };
          if(!userSlug || (d.participantSlugs && d.participantSlugs.includes(userSlug)) || (Array.isArray(d.participants) && d.participants.some(p => (typeof p === 'string' ? p === userSlug : p.slug === userSlug)))){
            chats.push(d);
          }
        });
        if(typeof callback === 'function') callback(chats);
      }, (err) => {
        console.warn('fbListenActiveChats error:', err);
      });
  } catch(err){
    console.warn('fbListenActiveChats error:', err);
  }
};

window.fbSetConversationArchiveStatus = async function(chatId, userSlug, isArchived){
  initFirebaseService();
  if(!firestoreDb || !chatId || !userSlug) return;
  try {
    const chatDocRef = firestoreDb.collection('personal_chats').doc(chatId);
    await chatDocRef.set({
      archivedBy: {
        [userSlug]: !!isArchived
      },
      updatedAt: Date.now()
    }, { merge: true });
  } catch(err){
    console.warn('fbSetConversationArchiveStatus error:', err);
  }
};

window.fbSetConversationPinStatus = async function(chatId, userSlug, isPinned){
  initFirebaseService();
  if(!firestoreDb || !chatId || !userSlug) return;
  try {
    const chatDocRef = firestoreDb.collection('personal_chats').doc(chatId);
    await chatDocRef.set({
      pinnedBy: {
        [userSlug]: !!isPinned
      },
      updatedAt: Date.now()
    }, { merge: true });
  } catch(err){
    console.warn('fbSetConversationPinStatus error:', err);
  }
};

window.fbUpdateMessageState = async function(chatId, stateUpdate){
  initFirebaseService();
  if(!firestoreDb) return;
  try {
    await firestoreDb.collection('personal_chats').doc(chatId).set({
      messageState: stateUpdate,
      updatedAt: Date.now()
    }, { merge: true });
  } catch(err){
    console.warn('fbUpdateMessageState error:', err);
  }
};

window.fbMarkChatMessagesAsRead = async function(chatId, readerSlug){
  initFirebaseService();
  if(!firestoreDb || !chatId || !readerSlug) return;
  try {
    // 1. Query messages in this chat and update any unread messages sent by peer
    const querySnapshot = await firestoreDb.collection('chat_messages')
      .where('chatId', '==', chatId)
      .limit(60)
      .get();

    if(!querySnapshot.empty){
      const batch = firestoreDb.batch();
      let count = 0;
      querySnapshot.forEach(doc => {
        const msg = doc.data();
        if(msg.senderSlug !== readerSlug && msg.status !== 'read'){
          batch.update(doc.ref, {
            status: 'read',
            isRead: true,
            readAt: Date.now(),
            readBy: readerSlug
          });
          count++;
        }
      });
      if(count > 0){
        await batch.commit();
      }
    }

    // 2. Also update conversation document read receipt status
    const chatDocRef = firestoreDb.collection('personal_chats').doc(chatId);
    await chatDocRef.set({
      messageState: {
        isRead: true,
        status: 'read',
        readBy: [readerSlug],
        readAt: Date.now()
      },
      unreadCount: 0,
      updatedAt: Date.now()
    }, { merge: true });
  } catch(err){
    console.warn('fbMarkChatMessagesAsRead error:', err);
  }
};

// ============================================================================
// Real-time Chat Typing Indicator (Firestore Live Presence)
// ============================================================================
let activeTypingListenerUnsub = null;

window.fbSetTypingStatus = async function(chatId, userSlug, userName, isTyping){
  initFirebaseService();
  if(!firestoreDb || !chatId || !userSlug) return;
  try {
    const chatDocRef = firestoreDb.collection('personal_chats').doc(chatId);
    const typingData = {
      isTyping: !!isTyping,
      name: userName || userSlug,
      updatedAt: Date.now()
    };
    await chatDocRef.set({
      chatId,
      typingStatus: {
        [userSlug]: typingData
      }
    }, { merge: true });
  } catch(err){
    console.warn('fbSetTypingStatus error:', err);
  }
};

window.fbListenTypingStatus = function(chatId, callback){
  initFirebaseService();
  if(activeTypingListenerUnsub){
    try{ activeTypingListenerUnsub(); }catch(e){}
    activeTypingListenerUnsub = null;
  }
  if(!firestoreDb || !chatId) return null;
  try {
    activeTypingListenerUnsub = firestoreDb.collection('personal_chats').doc(chatId)
      .onSnapshot((docSnapshot) => {
        if(!docSnapshot || !docSnapshot.exists){
          if(typeof callback === 'function') callback({});
          return;
        }
        const data = docSnapshot.data() || {};
        const typingMap = data.typingStatus || {};
        if(typeof callback === 'function') callback(typingMap);
      }, (err) => {
        console.warn('fbListenTypingStatus error:', err);
      });
    return activeTypingListenerUnsub;
  } catch(err){
    console.warn('fbListenTypingStatus init error:', err);
    return null;
  }
};

window.fbUnsubscribeTypingStatus = function(){
  if(activeTypingListenerUnsub){
    try{ activeTypingListenerUnsub(); }catch(e){}
    activeTypingListenerUnsub = null;
  }
};

window.fbSubmitVerifiedApp = async function(appData){
  initFirebaseService();
  if(!firestoreDb) return null;
  try {
    const docRef = firestoreDb.collection('verified_applications').doc(appData.id);
    await docRef.set(appData);
    return appData.id;
  } catch(err) {
    console.warn('fbSubmitVerifiedApp error:', err);
    return null;
  }
};

window.fbGetVerifiedApps = async function(){
  initFirebaseService();
  if(!firestoreDb) return [];
  try {
    const snapshot = await firestoreDb.collection('verified_applications')
      .orderBy('appliedAt', 'desc')
      .limit(50)
      .get();
    const apps = [];
    snapshot.forEach(doc => apps.push({ id: doc.id, ...doc.data() }));
    return apps;
  } catch(err) {
    console.warn('fbGetVerifiedApps error:', err);
    return [];
  }
};

window.fbUpdateVerifiedAppStatus = async function(appId, status){
  initFirebaseService();
  if(!firestoreDb) return;
  try {
    await firestoreDb.collection('verified_applications').doc(appId).update({ status });
  } catch(err) {
    console.warn('fbUpdateVerifiedAppStatus error:', err);
  }
};

function updateCloudSyncStatusIndicator(isOnline){
  const el = document.getElementById('communityCloudSyncBadge');
  if(el){
    if(isOnline){
      el.innerHTML = '<span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:#10B981; margin-right:4px; box-shadow:0 0 6px #10B981;"></span> ক্লাউড সিঙ্ক চালু';
      el.style.color = '#10B981';
      el.title = 'Firebase Cloud Firestore এর সাথে রিয়েল-টাইমে সংযুক্ত';
    } else {
      el.innerHTML = '<span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:#F59E0B; margin-right:4px;"></span> অফলাইন / লোকাল';
      el.style.color = '#F59E0B';
      el.title = 'অফলাইন মোডে ডেটা সংরক্ষিত হচ্ছে';
    }
  }
}
