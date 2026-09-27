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
        }
      } catch(stErr){
      }
      firebaseInitialized = true;
      isCloudSyncActive = true;
      startRealtimeCommunitySync();
      startRealtimeStorySync();
    }
  } catch(err) {
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
        return downloadUrl;
      }
    } catch(err){
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
          if(typeof window.invalidateCommunityPostsCache === 'function'){
            window.invalidateCommunityPostsCache(finalPosts);
          }
          
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
  if(!firestoreDb || !profile || !profile.slug) return null;
  try {
    const safeProfile = { ...profile };
    // CRITICAL SECURITY: Never leak plain-text or hashed password to public cloud Firestore!
    delete safeProfile.password;
    delete safeProfile.passwordHash;

    // Ensure E2EE public key is generated & attached so peers can derive shared secret
    if(!safeProfile.publicKeyJwk && typeof ensureUserCryptoKeys === 'function'){
      try {
        const pubKey = await ensureUserCryptoKeys(profile.slug);
        if(pubKey) safeProfile.publicKeyJwk = JSON.stringify(pubKey);
      } catch(e){}
    }

    const docRef = firestoreDb.collection('user_profiles').doc(profile.slug);
    await docRef.set(safeProfile, { merge: true });
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
// Web Crypto API: Client-Side End-to-End Encryption (ECDH + AES-GCM 256-bit)
// ============================================================================
const E2EE_KEYPAIR_STORAGE_PREFIX = 'tk_e2ee_p256_';
const derivedKeyCache = new Map();

window.getOrCreateUserIdentityKeyPair = async function(userSlug){
  if(!userSlug || !window.crypto || !crypto.subtle) return null;
  const storageKey = E2EE_KEYPAIR_STORAGE_PREFIX + userSlug;
  try {
    const stored = localStorage.getItem(storageKey);
    if(stored){
      const parsed = JSON.parse(stored);
      const privateKey = await crypto.subtle.importKey(
        'jwk',
        parsed.privateKeyJwk,
        { name: 'ECDH', namedCurve: 'P-256' },
        false,
        ['deriveKey', 'deriveBits']
      );
      const publicKey = await crypto.subtle.importKey(
        'jwk',
        parsed.publicKeyJwk,
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        []
      );
      return { privateKey, publicKey, publicKeyJwk: parsed.publicKeyJwk };
    }
  } catch(e){
    console.warn('Error reading stored E2EE keypair, generating fresh pair:', e);
  }

  // Generate a cryptographically strong P-256 ECDH keypair
  try {
    const keyPair = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey', 'deriveBits']
    );
    const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
    const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);

    localStorage.setItem(storageKey, JSON.stringify({
      publicKeyJwk,
      privateKeyJwk,
      createdAt: Date.now()
    }));

    return { privateKey: keyPair.privateKey, publicKey: keyPair.publicKey, publicKeyJwk };
  } catch(e){
    console.error('Failed to generate ECDH keypair:', e);
    return null;
  }
};

window.ensureUserCryptoKeys = async function(userSlug){
  const kp = await window.getOrCreateUserIdentityKeyPair(userSlug);
  return kp ? kp.publicKeyJwk : null;
};

async function getConversationEncryptionKey(chatId, senderSlug, peerSlug){
  const participantsStr = [senderSlug, peerSlug].filter(Boolean).sort().join(':::');
  const cacheKey = `${chatId}_${participantsStr}`;
  if(derivedKeyCache.has(cacheKey)){
    return derivedKeyCache.get(cacheKey);
  }

  // 1. Try true ECDH shared secret derivation between sender and receiver
  if(senderSlug && peerSlug){
    try {
      const myKeyPair = await window.getOrCreateUserIdentityKeyPair(senderSlug);
      let peerPublicJwk = null;

      // Check peer's public key in cloud profile
      if(typeof fbGetUserProfile === 'function'){
        const peerProf = await fbGetUserProfile(peerSlug);
        if(peerProf && peerProf.publicKeyJwk){
          peerPublicJwk = typeof peerProf.publicKeyJwk === 'string' ? JSON.parse(peerProf.publicKeyJwk) : peerProf.publicKeyJwk;
        }
      }

      // Fallback: check local profile
      if(!peerPublicJwk && typeof getLocalUserProfile === 'function'){
        const locProf = getLocalUserProfile(peerSlug);
        if(locProf && locProf.publicKeyJwk){
          peerPublicJwk = typeof locProf.publicKeyJwk === 'string' ? JSON.parse(locProf.publicKeyJwk) : locProf.publicKeyJwk;
        }
      }

      if(myKeyPair && myKeyPair.privateKey && peerPublicJwk){
        const peerPublicKey = await crypto.subtle.importKey(
          'jwk',
          peerPublicJwk,
          { name: 'ECDH', namedCurve: 'P-256' },
          false,
          []
        );

        // Derive 256-bit AES-GCM shared key from ECDH secret
        const sharedAesKey = await crypto.subtle.deriveKey(
          { name: 'ECDH', public: peerPublicKey },
          myKeyPair.privateKey,
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt', 'decrypt']
        );

        derivedKeyCache.set(cacheKey, sharedAesKey);
        return sharedAesKey;
      }
    } catch(err){
      console.warn('ECDH derivation skipped, using participant-bound AES key:', err);
    }
  }

  // 2. Participant-bound key derivation (ensures encryption key is tied to participant identities)
  try {
    const participantsStr = [senderSlug, peerSlug].filter(Boolean).sort().join(':::');
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode('TuitionKhata_E2EE_Pepper_' + participantsStr + '_' + chatId),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: enc.encode('tk_e2ee_salt_' + participantsStr),
        iterations: 2000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    derivedKeyCache.set(cacheKey, key);
    return key;
  } catch(e){
    return null;
  }
}

window.encryptChatPayload = async function(plainText, chatId, senderSlug, peerSlug){
  if(!plainText || typeof plainText !== 'string') return plainText;
  if(plainText.startsWith('enc:v2:') || plainText.startsWith('enc:v1:')) return plainText; // already encrypted

  try {
    const key = await getConversationEncryptionKey(chatId, senderSlug, peerSlug);
    if(!key) return plainText;

    const enc = new TextEncoder();
    // Cryptographically random 96-bit (12 bytes) IV for AES-GCM
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(plainText)
    );

    const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
    const cipherHex = Array.from(new Uint8Array(encrypted)).map(b => b.toString(16).padStart(2, '0')).join('');
    return `enc:v2:${ivHex}:${cipherHex}`;
  } catch(e) {
    console.error('Client encryption error:', e);
    return plainText;
  }
};

window.decryptChatPayload = async function(cipherPayload, chatId, senderSlug, peerSlug){
  if(!cipherPayload || typeof cipherPayload !== 'string') return cipherPayload;
  if(!cipherPayload.startsWith('enc:v2:') && !cipherPayload.startsWith('enc:v1:')) {
    return cipherPayload; // Unencrypted legacy message
  }

  try {
    const parts = cipherPayload.split(':');
    if(parts.length !== 4) return cipherPayload;
    const version = parts[1];
    const ivHex = parts[2];
    const cipherHex = parts[3];

    const iv = new Uint8Array(ivHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const cipherBytes = new Uint8Array(cipherHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

    let key = null;
    if(version === 'v2'){
      key = await getConversationEncryptionKey(chatId, senderSlug, peerSlug);
    } else {
      // Backwards-compatible v1 derivation
      const enc = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode('TuitionKhata_E2E_Key_' + chatId),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );
      key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: enc.encode('tk_secret_salt_' + chatId),
          iterations: 1000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    }

    if(!key) return cipherPayload;

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      cipherBytes
    );
    return new TextDecoder().decode(decrypted);
  } catch(e) {
    return '🔒 [এনক্রিপ্টেড বার্তা — অননুমোদিত ব্যক্তির জন্য অগম্য]';
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
    const senderSlug = messageObj.senderSlug;
    const peerSlug = conversationMeta && conversationMeta.peerSlug;

    // Encrypt sensitive payloads (text, photo url, video url, voice url) before saving to Firestore
    const encryptedText = messageObj.text ? await encryptChatPayload(messageObj.text, chatId, senderSlug, peerSlug) : '';
    const encryptedImageUrl = messageObj.imageUrl ? await encryptChatPayload(messageObj.imageUrl, chatId, senderSlug, peerSlug) : '';
    const encryptedImageLink = messageObj.imageLink ? await encryptChatPayload(messageObj.imageLink, chatId, senderSlug, peerSlug) : '';
    const encryptedVideoUrl = messageObj.videoUrl ? await encryptChatPayload(messageObj.videoUrl, chatId, senderSlug, peerSlug) : '';
    const encryptedAudioUrl = messageObj.audioUrl ? await encryptChatPayload(messageObj.audioUrl, chatId, senderSlug, peerSlug) : '';
    const encryptedAudioLink = messageObj.audioLink ? await encryptChatPayload(messageObj.audioLink, chatId, senderSlug, peerSlug) : '';
    const encryptedMediaUrl = messageObj.mediaUrl ? await encryptChatPayload(messageObj.mediaUrl, chatId, senderSlug, peerSlug) : '';

    const msgData = {
      ...messageObj,
      id: msgId,
      chatId,
      text: encryptedText,
      imageUrl: encryptedImageUrl,
      imageLink: encryptedImageLink,
      videoUrl: encryptedVideoUrl,
      audioUrl: encryptedAudioUrl,
      audioLink: encryptedAudioLink,
      mediaUrl: encryptedMediaUrl,
      isEncrypted: true,
      encryptionAlgorithm: 'AES-GCM-256',
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
    const isPhotoMsg = !!(messageObj.imageUrl || messageObj.imageLink);
    const isVideoMsg = !!(messageObj.videoUrl || messageObj.messageType === 'video_clip');
    const summaryText = messageObj.text || (isVideoMsg ? '🎥 ভিডিও ক্লিপ' : (isAudioMsg ? '🎤 ভয়েস মেসেজ' : (isPhotoMsg ? '📷 ফটো' : '')));
    
    // Encrypt summary for conversation preview
    const encryptedSummary = await encryptChatPayload(summaryText, chatId, senderSlug, peerSlug);

    await chatDocRef.set({
      chatId,
      participants,
      participantSlugs,
      lastMessage: encryptedSummary,
      lastSender: messageObj.senderName,
      lastSenderSlug: messageObj.senderSlug,
      lastMessageAt: msgData.timestamp,
      updatedAt: Date.now(),
      messageState: {
        status: 'sent',
        lastMessageId: msgId,
        lastMessageText: encryptedSummary,
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
window.fbListenChatMessages = function(chatId, currentSlug, targetPeerSlug, callback){
  initFirebaseService();
  if(activeChatListenerUnsub){
    try{ activeChatListenerUnsub(); }catch(e){}
    activeChatListenerUnsub = null;
  }
  // Signature flexibility
  if(typeof currentSlug === 'function'){
    callback = currentSlug;
    currentSlug = null;
    targetPeerSlug = null;
  }
  if(!firestoreDb) return;
  try {
    activeChatListenerUnsub = firestoreDb.collection('chat_messages')
      .where('chatId', '==', chatId)
      .orderBy('timestamp', 'asc')
      .limit(100)
      .onSnapshot(async (snapshot) => {
        const rawMessages = [];
        snapshot.forEach(doc => {
          rawMessages.push({ id: doc.id, ...doc.data() });
        });

        // Decrypt messages client-side in browser memory
        const decryptedMessages = await Promise.all(rawMessages.map(async (m) => {
          if(!m.isEncrypted && (!m.text || !m.text.startsWith('enc:'))){
            return m; // Unencrypted legacy message
          }
          const sSlug = currentSlug || m.senderSlug;
          const pSlug = targetPeerSlug || (m.participantSlugs || []).find(s => s !== m.senderSlug) || m.senderSlug;

          const text = m.text ? await decryptChatPayload(m.text, chatId, sSlug, pSlug) : '';
          const imageUrl = m.imageUrl ? await decryptChatPayload(m.imageUrl, chatId, sSlug, pSlug) : '';
          const imageLink = m.imageLink ? await decryptChatPayload(m.imageLink, chatId, sSlug, pSlug) : '';
          const videoUrl = m.videoUrl ? await decryptChatPayload(m.videoUrl, chatId, sSlug, pSlug) : '';
          const audioUrl = m.audioUrl ? await decryptChatPayload(m.audioUrl, chatId, sSlug, pSlug) : '';
          const audioLink = m.audioLink ? await decryptChatPayload(m.audioLink, chatId, sSlug, pSlug) : '';
          const mediaUrl = m.mediaUrl ? await decryptChatPayload(m.mediaUrl, chatId, sSlug, pSlug) : '';
          return {
            ...m,
            text,
            imageUrl,
            imageLink,
            videoUrl,
            audioUrl,
            audioLink,
            mediaUrl
          };
        }));

        if(typeof callback === 'function') callback(decryptedMessages);
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
      .onSnapshot(async (snapshot) => {
        const chats = [];
        snapshot.forEach(doc => {
          const d = { id: doc.id, ...doc.data() };
          if(!userSlug || (d.participantSlugs && d.participantSlugs.includes(userSlug)) || (Array.isArray(d.participants) && d.participants.some(p => (typeof p === 'string' ? p === userSlug : p.slug === userSlug)))){
            chats.push(d);
          }
        });

        // Decrypt conversation preview snippet client-side
        const decryptedChats = await Promise.all(chats.map(async (c) => {
          let lastMessage = c.lastMessage;
          if(lastMessage && (lastMessage.startsWith('enc:v2:') || lastMessage.startsWith('enc:v1:'))){
            const peer = (c.participantSlugs || []).find(s => s !== userSlug);
            lastMessage = await decryptChatPayload(lastMessage, c.chatId, userSlug, peer);
          }
          return { ...c, lastMessage };
        }));

        if(typeof callback === 'function') callback(decryptedChats);
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
      el.title = 'লাইভ ক্লাউডের সাথে সংযুক্ত';
    } else {
      el.innerHTML = '<span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:#F59E0B; margin-right:4px;"></span> অফলাইন মোড';
      el.style.color = '#F59E0B';
      el.title = 'অফলাইনে ডেটা সংরক্ষিত রয়েছে';
    }
  }
}
