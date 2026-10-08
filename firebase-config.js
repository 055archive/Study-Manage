/**
 * StudySync - Firebase Configuration, Authentication & Per-User Cloud Sync
 * Menggunakan Firebase Compat SDK (tanpa build tool/bundler, langsung jalan di browser)
 *
 * ARSITEKTUR DATA (Per-User Isolation):
 * - users/{uid}/profile    → Nama, NIM, email mahasiswa
 * - users/{uid}/tugas      → Tugas kuliah pribadi
 * - users/{uid}/materi     → Materi kuliah pribadi
 * - users/{uid}/matkul     → Mata kuliah semester ini
 * - nim_index/{nim}        → Lookup NIM → email (untuk login pakai NIM)
 */

// ============================================================================
// FIREBASE CONFIG & INSTANCE VARIABLES
// ============================================================================
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAmAN6gIvFDRH-pZpAfGnB09fw6LGazxTc",
  authDomain: "study-manage-56252.firebaseapp.com",
  projectId: "study-manage-56252",
  storageBucket: "study-manage-56252.firebasestorage.app",
  messagingSenderId: "563456500355",
  appId: "1:563456500355:web:90b7c0205a8a21a7d7b1b6",
  measurementId: "G-MMZM4JRVSJ"
};

const FIREBASE_CONFIG_STORAGE_KEY = 'studysync_firebase_config_v2';

// Instance Firebase global
let firebaseApp = null;
let firestoreDb = null;
let firebaseStorage = null;
let firebaseAuth = null;
let isFirebaseConnected = false;

// User yang sedang aktif login
let currentUser = null;

// Real-time listener unsubscribers
let unsubscribeTugas = null;
let unsubscribeMateri = null;
let unsubscribeMatkul = null;

// ============================================================================
// CONFIG HELPERS
// ============================================================================
function getActiveFirebaseConfig() {
  const saved = localStorage.getItem(FIREBASE_CONFIG_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.apiKey && parsed.projectId) return parsed;
    } catch (e) {
      console.warn('Gagal membaca saved Firebase config:', e);
    }
  }
  return DEFAULT_FIREBASE_CONFIG;
}

/**
 * Mengembalikan referensi Firestore collection per-user.
 * Contoh: getUserCollection('tugas') → db.collection('users').doc(uid).collection('tugas')
 */
function getUserCollection(collectionName, uid) {
  const targetUid = uid || (currentUser ? currentUser.uid : null);
  if (!firestoreDb || !targetUid) return null;
  return firestoreDb.collection('users').doc(targetUid).collection(collectionName);
}

/**
 * Mendapatkan UID user yang sedang aktif
 */
function getCurrentUserUID() {
  return currentUser ? currentUser.uid : null;
}

// ============================================================================
// FIREBASE INITIALIZATION
// ============================================================================
function initFirebase() {
  const config = getActiveFirebaseConfig();

  if (!config.apiKey || !config.projectId) {
    updateCloudStatusUI(false, 'Mode Lokal (Belum Terhubung)');
    return false;
  }

  try {
    if (typeof firebase === 'undefined') {
      console.warn('Firebase SDK belum termuat dari CDN.');
      updateCloudStatusUI(false, 'SDK Gagal Dimuat');
      return false;
    }

    // Hindari inisialisasi ganda
    if (!firebase.apps.length) {
      firebaseApp = firebase.initializeApp(config);
    } else {
      firebaseApp = firebase.app();
    }

    firestoreDb = firebase.firestore();

    // Persistensi offline Firestore
    firestoreDb.enablePersistence({ synchronizeTabs: true }).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('Firestore persistence gagal: banyak tab terbuka');
      } else if (err.code === 'unimplemented') {
        console.warn('Browser tidak mendukung Firestore persistence');
      }
    });

    // Firebase Storage
    if (config.storageBucket && firebase.storage) {
      try {
        firebaseStorage = firebase.storage();
      } catch (stErr) {
        console.warn('Firebase Storage belum aktif:', stErr);
        firebaseStorage = null;
      }
    }

    // Firebase Authentication
    firebaseAuth = firebase.auth();
    firebaseAuth.languageCode = 'id'; // Email reset dalam Bahasa Indonesia

    // Pastikan sesi akun disimpan permanen (Auto-login / Ingat Akun untuk penggunaan harian)
    if (firebase.auth.Auth && firebase.auth.Auth.Persistence) {
      firebaseAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(err => {
        console.warn('Gagal set auth persistence LOCAL:', err);
      });
    }

    isFirebaseConnected = true;
    updateCloudStatusUI(true, 'Tersambung (Real-time)');
    console.log('✅ Firebase berhasil terhubung ke project:', config.projectId);

    return true;
  } catch (err) {
    console.error('Gagal menghubungkan Firebase:', err);
    isFirebaseConnected = false;
    updateCloudStatusUI(false, 'Gagal Terhubung: ' + err.message);
    return false;
  }
}

// ============================================================================
// FIREBASE AUTHENTICATION FUNCTIONS
// ============================================================================

/**
 * DAFTAR AKUN BARU dengan Email + Password
 * Setelah daftar, simpan profil (nama, NIM) dan index NIM → email.
 * Kemudian logout sementara agar mahasiswa membiasakan diri login dengan NIM + Sandi.
 */
async function registerWithEmailPassword(email, password, nama, nim) {
  if (!firebaseAuth) throw new Error('Firebase Auth belum diinisialisasi.');

  const trimmedNIM = nim.trim();
  const trimmedEmail = email.trim().toLowerCase();

  // Cek apakah NIM sudah terdaftar sebelum membuat akun
  const existingEmail = await lookupEmailByNIM(trimmedNIM);
  if (existingEmail) {
    throw new Error(`NIM ${trimmedNIM} sudah terdaftar. Silakan gunakan NIM lain atau langsung login.`);
  }

  // Buat akun Firebase Auth
  const userCredential = await firebaseAuth.createUserWithEmailAndPassword(trimmedEmail, password);
  const user = userCredential.user;

  // Update display name di Firebase Auth
  await user.updateProfile({ displayName: nama.trim() });

  // Simpan profil lengkap ke Firestore
  await saveUserProfile(user.uid, {
    nama: nama.trim(),
    nim: trimmedNIM,
    email: trimmedEmail,
    createdAt: new Date().toISOString()
  });

  // Simpan NIM index untuk lookup saat login
  await registerNIMIndex(trimmedNIM, user.uid, trimmedEmail);

  // Sign out sementara agar pengguna diarahkan login mandiri
  await firebaseAuth.signOut();
  currentUser = null;

  console.log('✅ Akun berhasil dibuat untuk:', nama, '| NIM:', trimmedNIM);
  return { nama: nama.trim(), nim: trimmedNIM, email: trimmedEmail };
}

/**
 * LENGKAPI DATA PENDAFTARAN GOOGLE DENGAN NIM & BUAT KATA SANDI
 * Mengikat kata sandi ke akun Google dan menyimpan NIM ke Firestore,
 * kemudian logout sementara agar pengguna diarahkan login mandiri.
 */
async function completeGoogleRegistration(nama, nim, password) {
  if (!firebaseAuth || !currentUser) throw new Error('Sesi Google belum aktif.');

  const trimmedNIM = nim.trim();
  const trimmedNama = nama.trim();

  // Cek apakah NIM sudah terdaftar di akun lain
  const existingEmail = await lookupEmailByNIM(trimmedNIM);
  if (existingEmail && existingEmail !== currentUser.email) {
    throw new Error(`NIM ${trimmedNIM} sudah terdaftar pada akun lain!`);
  }

  // Pasang kata sandi baru ke akun Firebase user
  if (password) {
    await currentUser.updatePassword(password);
  }

  // Update nama jika perlu
  if (trimmedNama && currentUser.displayName !== trimmedNama) {
    await currentUser.updateProfile({ displayName: trimmedNama });
  }

  // Simpan profil lengkap ke Firestore
  const profileData = {
    nama: trimmedNama || currentUser.displayName || 'Mahasiswa',
    nim: trimmedNIM,
    email: currentUser.email,
    createdAt: new Date().toISOString()
  };
  await saveUserProfile(currentUser.uid, profileData);

  // Daftarkan NIM index
  await registerNIMIndex(trimmedNIM, currentUser.uid, currentUser.email);

  // Sign out sementara agar pengguna login mandiri dengan NIM dan kata sandinya
  await firebaseAuth.signOut();
  currentUser = null;

  console.log('✅ Pendaftaran Google + NIM & Password berhasil disimpan!');
  return { nama: trimmedNama, nim: trimmedNIM };
}

/**
 * LOGIN dengan NIM + Password
 * Cari email berdasarkan NIM, lalu login ke Firebase Auth dengan email tersebut
 */
async function loginWithNIMPassword(nim, password) {
  if (!firebaseAuth) throw new Error('Firebase Auth belum diinisialisasi.');

  const trimmedNIM = nim.trim();

  // Cari email berdasarkan NIM
  const email = await lookupEmailByNIM(trimmedNIM);
  if (!email) {
    throw new Error(`NIM ${trimmedNIM} tidak ditemukan. Pastikan NIM benar atau daftar akun baru.`);
  }

  // Login dengan email yang ditemukan
  const userCredential = await firebaseAuth.signInWithEmailAndPassword(email, password);
  return userCredential.user;
}

/**
 * LOGIN dengan Akun Google (1-klik)
 */
async function loginWithGoogle() {
  if (!firebaseAuth) throw new Error('Firebase Auth belum diinisialisasi.');

  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  const userCredential = await firebaseAuth.signInWithPopup(provider);
  const user = userCredential.user;

  // Cek apakah profil sudah ada di Firestore
  const existingProfile = await getUserProfile(user.uid);

  return { user, isNewUser: !existingProfile };
}

/**
 * LUPA PASSWORD - Kirim link reset ke email berdasarkan NIM
 */
async function sendPasswordResetByNIM(nim) {
  if (!firebaseAuth) throw new Error('Firebase Auth belum diinisialisasi.');

  const trimmedNIM = nim.trim();
  const email = await lookupEmailByNIM(trimmedNIM);

  if (!email) {
    throw new Error(`NIM ${trimmedNIM} tidak ditemukan. Pastikan NIM yang kamu masukkan benar.`);
  }

  await firebaseAuth.sendPasswordResetEmail(email);
  console.log('📧 Link reset password berhasil dikirim ke:', email);
  return email; // Return email untuk ditampilkan di UI (opsional, bisa disamarkan)
}

/**
 * LOGOUT - Keluar dari akun
 */
async function logoutUser() {
  if (!firebaseAuth) return;

  // Hentikan semua real-time listener sebelum logout
  stopRealtimeListeners();

  await firebaseAuth.signOut();
  currentUser = null;
  console.log('👋 User berhasil logout.');
}

// ============================================================================
// USER PROFILE & NIM INDEX FUNCTIONS
// ============================================================================

/**
 * Simpan profil mahasiswa ke Firestore: users/{uid}/profile
 */
async function saveUserProfile(uid, profileData) {
  if (!firestoreDb) return;
  try {
    await firestoreDb.collection('users').doc(uid).set({
      profile: profileData
    }, { merge: true });
    console.log('✅ Profil mahasiswa tersimpan:', profileData.nama);
  } catch (err) {
    console.error('Gagal menyimpan profil:', err);
    throw err;
  }
}

/**
 * Ambil profil mahasiswa dari Firestore: users/{uid}
 */
async function getUserProfile(uid) {
  if (!firestoreDb || !uid) return null;
  try {
    const doc = await firestoreDb.collection('users').doc(uid).get();
    if (doc.exists && doc.data().profile) {
      return doc.data().profile;
    }
    return null;
  } catch (err) {
    console.warn('Gagal mengambil profil:', err);
    return null;
  }
}

/**
 * Update profil mahasiswa (untuk edit nama/NIM)
 */
async function updateUserProfile(uid, updates) {
  if (!firestoreDb || !uid) return;
  try {
    // Jika NIM berubah, perbarui juga nim_index
    if (updates.nim) {
      const profile = await getUserProfile(uid);
      if (profile && profile.nim && profile.nim !== updates.nim) {
        // Hapus index NIM lama
        await firestoreDb.collection('nim_index').doc(profile.nim).delete();
        // Daftarkan NIM baru
        await registerNIMIndex(updates.nim, uid, profile.email);
      }
    }
    await firestoreDb.collection('users').doc(uid).set({ profile: updates }, { merge: true });
  } catch (err) {
    console.error('Gagal update profil:', err);
    throw err;
  }
}

/**
 * Simpan index NIM → email untuk keperluan login
 * Struktur: nim_index/{nim} = { email, uid, createdAt }
 */
async function registerNIMIndex(nim, uid, email) {
  if (!firestoreDb) return;
  try {
    await firestoreDb.collection('nim_index').doc(nim).set({
      email: email,
      uid: uid,
      createdAt: new Date().toISOString()
    });
    console.log('✅ NIM index terdaftar:', nim, '→', email);
  } catch (err) {
    console.error('Gagal mendaftarkan NIM index:', err);
    throw err;
  }
}

/**
 * Cari email berdasarkan NIM
 * Return email string jika ditemukan, null jika tidak ada
 */
async function lookupEmailByNIM(nim) {
  if (!firestoreDb) return null;
  try {
    const doc = await firestoreDb.collection('nim_index').doc(nim.trim()).get();
    if (doc.exists) {
      return doc.data().email;
    }
    return null;
  } catch (err) {
    console.warn('Gagal lookup NIM:', err);
    return null;
  }
}

// ============================================================================
// CLOUD STATUS UI
// ============================================================================
function updateCloudStatusUI(connected, message) {
  const dot = document.getElementById('cloudStatusDot');
  const text = document.getElementById('cloudStatusText');
  const modalStatus = document.getElementById('cloudModalStatusText');
  const modalBadge = document.getElementById('cloudModalStatusBadge');

  if (dot) dot.className = `cloud-status-dot ${connected ? 'online' : 'offline'}`;
  if (text) text.textContent = connected ? 'Cloud Aktif' : 'Lokal';
  if (modalStatus) modalStatus.textContent = message;
  if (modalBadge) {
    modalBadge.className = `status-pill ${connected ? 'success' : 'warning'}`;
    modalBadge.textContent = connected ? '🟢 Terhubung' : '🟡 Mode Lokal';
  }
}

// ============================================================================
// REAL-TIME LISTENERS (PER-USER)
// ============================================================================
let isInitialSyncTugas = true;
let isInitialSyncMateri = true;
let isInitialSyncMatkul = true;

/**
 * Hentikan semua real-time listener (dipanggil saat logout)
 */
function stopRealtimeListeners() {
  if (unsubscribeTugas) { unsubscribeTugas(); unsubscribeTugas = null; }
  if (unsubscribeMateri) { unsubscribeMateri(); unsubscribeMateri = null; }
  if (unsubscribeMatkul) { unsubscribeMatkul(); unsubscribeMatkul = null; }
  console.log('🔌 Real-time listeners dihentikan.');
}

/**
 * Setup Real-time Listeners Firestore - KHUSUS untuk UID user yang sedang login
 * Data mahasiswa A tidak akan muncul di akun mahasiswa B
 */
function setupRealtimeListeners(uid) {
  if (!firestoreDb || !uid) return;

  // Reset flag sync awal
  isInitialSyncTugas = true;
  isInitialSyncMateri = true;
  isInitialSyncMatkul = true;

  const userRef = firestoreDb.collection('users').doc(uid);

  // 1. Listener Mata Kuliah (Otomatis tanam 10 data matkul resmi jika akun baru)
  unsubscribeMatkul = userRef.collection('matkul').onSnapshot((snapshot) => {
    if (snapshot.empty && isInitialSyncMatkul) {
      const initialMatkul = (typeof DEFAULT_MATKUL !== 'undefined' && Array.isArray(DEFAULT_MATKUL) && DEFAULT_MATKUL.length > 0)
        ? DEFAULT_MATKUL
        : matkulList;
      uploadInitialCollection('matkul', initialMatkul, uid);
      isInitialSyncMatkul = false;
      return;
    }
    isInitialSyncMatkul = false;

    const cloudData = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data && (data.nama || data.kode)) cloudData.push({ id: doc.id, ...data });
    });

    matkulList = cloudData;
    saveStorage();
    try {
      renderMatkul();
      renderCourseFilters();
      if (window.feather) feather.replace();
    } catch (e) { console.warn('Gagal merender matkul dari cloud:', e); }
  }, (err) => console.error('Error listener matkul:', err));

  // 2. Listener Tugas Kuliah (Mulai dari 0 tugas untuk pengguna baru)
  unsubscribeTugas = userRef.collection('tugas').onSnapshot((snapshot) => {
    if (snapshot.empty && isInitialSyncTugas) {
      isInitialSyncTugas = false;
      if (tugasList && tugasList.length > 0) {
        uploadInitialCollection('tugas', tugasList, uid);
        return;
      }
    }
    isInitialSyncTugas = false;

    const cloudData = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data && (data.judul || data.matkul)) cloudData.push({ id: doc.id, ...data });
    });

    tugasList = cloudData;
    saveStorage();
    try {
      renderCourseFilters();
      renderTugas();
      renderOverviewUrgent();
      if (window.feather) feather.replace();
    } catch (e) { console.warn('Gagal merender tugas dari cloud:', e); }
  }, (err) => console.error('Error listener tugas:', err));

  // 3. Listener Materi Kuliah (Mulai dari 0 materi untuk pengguna baru)
  unsubscribeMateri = userRef.collection('materi').onSnapshot((snapshot) => {
    if (snapshot.empty && isInitialSyncMateri) {
      isInitialSyncMateri = false;
      if (materiList && materiList.length > 0) {
        uploadInitialCollection('materi', materiList, uid);
        return;
      }
    }
    isInitialSyncMateri = false;

    const cloudData = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data && (data.judul || data.matkul)) cloudData.push({ id: doc.id, ...data });
    });

    materiList = cloudData;
    saveStorage();
    try {
      renderMateri();
      renderOverviewRecentMaterials();
      if (window.feather) feather.replace();
    } catch (e) { console.warn('Gagal merender materi dari cloud:', e); }
  }, (err) => console.error('Error listener materi:', err));

  console.log('👂 Real-time listeners aktif untuk UID:', uid);
}

// ============================================================================
// UPLOAD INITIAL DATA (per-user)
// ============================================================================
async function uploadInitialCollection(collectionName, items, uid) {
  const targetUid = uid || getCurrentUserUID();
  if (!firestoreDb || !targetUid || !items || items.length === 0) return;
  try {
    const batch = firestoreDb.batch();
    const colRef = firestoreDb.collection('users').doc(targetUid).collection(collectionName);
    items.forEach(item => {
      const docRef = colRef.doc(item.id);
      batch.set(docRef, item, { merge: true });
    });
    await batch.commit();
    console.log(`Sinkronisasi awal ${collectionName} ke Cloud selesai untuk uid:`, targetUid);
  } catch (e) {
    console.warn(`Gagal upload data awal ${collectionName}:`, e);
  }
}

// ============================================================================
// CLOUD CRUD HELPERS (PER-USER)
// ============================================================================

async function syncTugasToCloud(task) {
  const uid = getCurrentUserUID();
  if (!isFirebaseConnected || !firestoreDb || !uid) return;
  try {
    await firestoreDb.collection('users').doc(uid).collection('tugas').doc(task.id).set(task, { merge: true });
  } catch (err) { console.error('Gagal sync tugas ke cloud:', err); }
}

async function deleteTugasFromCloud(id) {
  const uid = getCurrentUserUID();
  if (!isFirebaseConnected || !firestoreDb || !uid) return;
  try {
    await firestoreDb.collection('users').doc(uid).collection('tugas').doc(id).delete();
  } catch (err) { console.error('Gagal hapus tugas dari cloud:', err); }
}

async function syncMateriToCloud(materi) {
  const uid = getCurrentUserUID();
  if (!isFirebaseConnected || !firestoreDb || !uid) return;
  try {
    await firestoreDb.collection('users').doc(uid).collection('materi').doc(materi.id).set(materi, { merge: true });
  } catch (err) { console.error('Gagal sync materi ke cloud:', err); }
}

async function deleteMateriFromCloud(id) {
  const uid = getCurrentUserUID();
  if (!isFirebaseConnected || !firestoreDb || !uid) return;
  try {
    await firestoreDb.collection('users').doc(uid).collection('materi').doc(id).delete();
  } catch (err) { console.error('Gagal hapus materi dari cloud:', err); }
}

async function syncMatkulToCloud(matkul) {
  const uid = getCurrentUserUID();
  if (!isFirebaseConnected || !firestoreDb || !uid) return;
  try {
    await firestoreDb.collection('users').doc(uid).collection('matkul').doc(matkul.id).set(matkul, { merge: true });
  } catch (err) { console.error('Gagal sync matkul ke cloud:', err); }
}

async function deleteMatkulFromCloud(id) {
  const uid = getCurrentUserUID();
  if (!isFirebaseConnected || !firestoreDb || !uid) return;
  try {
    await firestoreDb.collection('users').doc(uid).collection('matkul').doc(id).delete();
  } catch (err) { console.error('Gagal hapus matkul dari cloud:', err); }
}

// ============================================================================
// FIREBASE STORAGE (PER-USER PATH)
// ============================================================================

/**
 * Upload berkas fisik ke Firebase Storage dengan path per-user
 * Path: portal-kuliah/{uid}/{fileId}_{fileName}
 */
async function uploadFileToFirebaseStorage(fileBlobOrDataUrl, fileName, fileId) {
  if (!isFirebaseConnected || !firebaseStorage) return null;
  const uid = getCurrentUserUID();
  if (!uid) return null;

  try {
    let blob;
    if (typeof fileBlobOrDataUrl === 'string' && fileBlobOrDataUrl.startsWith('data:')) {
      blob = dataUrlToBlob(fileBlobOrDataUrl);
    } else {
      blob = fileBlobOrDataUrl;
    }

    const storagePath = `portal-kuliah/${uid}/${fileId}_${fileName}`;
    const storageRef = firebaseStorage.ref().child(storagePath);

    const uploadPromise = storageRef.put(blob);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Firebase Storage timeout')), 25000)
    );
    const snapshot = await Promise.race([uploadPromise, timeoutPromise]);
    const downloadUrl = await snapshot.ref.getDownloadURL();

    console.log('✅ File berhasil diunggah ke Firebase Storage:', downloadUrl);
    return { storageType: 'firebase', downloadUrl, path: storagePath };
  } catch (err) {
    console.warn('Firebase Storage dilewati (file disimpan di IndexedDB lokal):', err.message);
    return null;
  }
}

async function deleteFileFromFirebaseStorage(storagePath) {
  if (!isFirebaseConnected || !firebaseStorage || !storagePath) return;
  try {
    await firebaseStorage.ref().child(storagePath).delete();
    console.log('Berkas dihapus dari Firebase Storage:', storagePath);
  } catch (err) {
    console.warn('Gagal menghapus file dari Firebase Storage:', err);
  }
}

// ============================================================================
// SYNC SEMUA DATA LOKAL KE CLOUD (per-user)
// ============================================================================
async function syncAllLocalDataToCloud() {
  const uid = getCurrentUserUID();
  if (!isFirebaseConnected || !firestoreDb || !uid) {
    alert('Firebase belum terhubung atau belum login!');
    return;
  }

  try {
    showToast('Memulai sinkronisasi data lokal ke Cloud...', 'info');

    for (const m of matkulList) await syncMatkulToCloud(m);
    for (const t of tugasList) await syncTugasToCloud(t);
    for (const mat of materiList) await syncMateriToCloud(mat);

    showToast('Seluruh data berhasil disinkronkan ke Firebase Cloud! ☁️🎉', 'success');
  } catch (err) {
    console.error('Gagal sinkronisasi data ke cloud:', err);
    showToast('Gagal sinkronisasi: ' + err.message, 'danger');
  }
}
