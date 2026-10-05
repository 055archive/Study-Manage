/**
 * StudySync - Firebase Configuration & Real-Time Cloud Sync
 * Menggunakan Firebase Compat SDK (tanpa build tool/bundler, langsung jalan di browser)
 */

// Konfigurasi Firebase Anda
// Anda bisa menempelkan (paste) config dari Firebase Console di sini,
// atau mengisinya lewat tombol "Cloud Sync" di halaman web.
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAMAn6gIvFDRH-pZpAfGnB09fw6LGazxTc",
  authDomain: "study-manage-56252.firebaseapp.com",
  projectId: "study-manage-56252",
  storageBucket: "study-manage-56252.firebasestorage.app",
  messagingSenderId: "563456500355",
  appId: "1:563456500355:web:90b7c0205a8a21a7d7b1b6",
  measurementId: "G-MMZM4JRVSJ"
};

// Key storage untuk menyimpan config yang diinput lewat browser
const FIREBASE_CONFIG_STORAGE_KEY = 'studysync_firebase_config_v1';

// Variabel instance Firebase global
let firebaseApp = null;
let firestoreDb = null;
let firebaseStorage = null;
let isFirebaseConnected = false;

/**
 * Mengambil konfigurasi aktif (dari localStorage atau DEFAULT_FIREBASE_CONFIG)
 */
function getActiveFirebaseConfig() {
  const saved = localStorage.getItem(FIREBASE_CONFIG_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    } catch (e) {
      console.warn('Gagal membaca saved Firebase config:', e);
    }
  }
  return DEFAULT_FIREBASE_CONFIG;
}

/**
 * Inisialisasi Firebase App, Firestore, dan Storage
 */
function initFirebase() {
  const config = getActiveFirebaseConfig();

  // Jika apiKey belum diisi, gunakan mode lokal
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
    
    // Aktifkan persistensi offline Firestore jika didukung
    firestoreDb.enablePersistence({ synchronizeTabs: true }).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('Firestore persistence gagal: banyak tab terbuka');
      } else if (err.code === 'unimplemented') {
        console.warn('Browser tidak mendukung Firestore persistence');
      }
    });

    if (config.storageBucket && firebase.storage) {
      try {
        firebaseStorage = firebase.storage();
      } catch (stErr) {
        console.warn('Firebase Storage belum aktif (menggunakan Firestore & IndexedDB):', stErr);
        firebaseStorage = null;
      }
    }

    isFirebaseConnected = true;
    updateCloudStatusUI(true, 'Tersambung (Real-time)');
    console.log('✅ Firebase berhasil terhubung ke project:', config.projectId);

    // Jalankan listener real-time
    setupRealtimeListeners();
    return true;
  } catch (err) {
    console.error('Gagal menghubungkan Firebase:', err);
    isFirebaseConnected = false;
    updateCloudStatusUI(false, 'Gagal Terhubung: ' + err.message);
    return false;
  }
}

/**
 * Memperbarui tampilan indikator status Cloud di Topbar & Modal
 */
function updateCloudStatusUI(connected, message) {
  const dot = document.getElementById('cloudStatusDot');
  const text = document.getElementById('cloudStatusText');
  const modalStatus = document.getElementById('cloudModalStatusText');
  const modalBadge = document.getElementById('cloudModalStatusBadge');

  if (dot) {
    dot.className = `cloud-status-dot ${connected ? 'online' : 'offline'}`;
  }
  if (text) {
    text.textContent = connected ? 'Cloud Aktif' : 'Lokal';
  }
  if (modalStatus) {
    modalStatus.textContent = message;
  }
  if (modalBadge) {
    modalBadge.className = `status-pill ${connected ? 'success' : 'warning'}`;
    modalBadge.textContent = connected ? '🟢 Terhubung' : '🟡 Mode Lokal';
  }
}

/**
 * Setup Real-time Listeners Firestore
 * Saat data diubah di perangkat lain (laptop/HP), otomatis perbarui tampilan di sini!
 */
let isInitialSyncTugas = true;
let isInitialSyncMateri = true;
let isInitialSyncMatkul = true;

function setupRealtimeListeners() {
  if (!firestoreDb) return;

  // 1. Listener Mata Kuliah
  firestoreDb.collection('matkul').onSnapshot((snapshot) => {
    if (snapshot.empty && isInitialSyncMatkul) {
      uploadInitialCollection('matkul', matkulList);
      isInitialSyncMatkul = false;
      return;
    }
    isInitialSyncMatkul = false;

    const cloudData = [];
    snapshot.forEach(doc => {
      cloudData.push({ id: doc.id, ...doc.data() });
    });

    matkulList = cloudData;
    saveStorage();
    renderMatkul();
    renderCourseFilters();
  }, (err) => console.error('Error listener matkul:', err));

  // 2. Listener Tugas Kuliah
  firestoreDb.collection('tugas').onSnapshot((snapshot) => {
    if (snapshot.empty && isInitialSyncTugas) {
      uploadInitialCollection('tugas', tugasList);
      isInitialSyncTugas = false;
      return;
    }
    isInitialSyncTugas = false;

    const cloudData = [];
    snapshot.forEach(doc => {
      cloudData.push({ id: doc.id, ...doc.data() });
    });

    tugasList = cloudData;
    saveStorage();
    renderCourseFilters();
    renderTugas();
    renderOverviewUrgent();
  }, (err) => console.error('Error listener tugas:', err));

  // 3. Listener Materi Kuliah
  firestoreDb.collection('materi').onSnapshot((snapshot) => {
    if (snapshot.empty && isInitialSyncMateri) {
      uploadInitialCollection('materi', materiList);
      isInitialSyncMateri = false;
      return;
    }
    isInitialSyncMateri = false;

    const cloudData = [];
    snapshot.forEach(doc => {
      cloudData.push({ id: doc.id, ...doc.data() });
    });

    materiList = cloudData;
    saveStorage();
    renderMateri();
    renderOverviewRecentMaterials();
  }, (err) => console.error('Error listener materi:', err));
}

/**
 * Unggah data lokal pertama kali jika cloud masih kosong
 */
async function uploadInitialCollection(collectionName, items) {
  if (!firestoreDb || !items || items.length === 0) return;
  try {
    const batch = firestoreDb.batch();
    items.forEach(item => {
      const docRef = firestoreDb.collection(collectionName).doc(item.id);
      batch.set(docRef, item, { merge: true });
    });
    await batch.commit();
    console.log(`Sinkronisasi awal ${collectionName} ke Cloud selesai.`);
  } catch (e) {
    console.warn(`Gagal upload data awal ${collectionName}:`, e);
  }
}

// ============================================================================
// CLOUD CRUD HELPERS (Dipanggil dari app.js)
// ============================================================================

/**
 * Sinkronkan 1 Tugas ke Cloud
 */
async function syncTugasToCloud(task) {
  if (!isFirebaseConnected || !firestoreDb) return;
  try {
    await firestoreDb.collection('tugas').doc(task.id).set(task, { merge: true });
  } catch (err) {
    console.error('Gagal sync tugas ke cloud:', err);
  }
}

async function deleteTugasFromCloud(id) {
  if (!isFirebaseConnected || !firestoreDb) return;
  try {
    await firestoreDb.collection('tugas').doc(id).delete();
  } catch (err) {
    console.error('Gagal hapus tugas dari cloud:', err);
  }
}

/**
 * Sinkronkan 1 Materi ke Cloud
 */
async function syncMateriToCloud(materi) {
  if (!isFirebaseConnected || !firestoreDb) return;
  try {
    await firestoreDb.collection('materi').doc(materi.id).set(materi, { merge: true });
  } catch (err) {
    console.error('Gagal sync materi ke cloud:', err);
  }
}

async function deleteMateriFromCloud(id) {
  if (!isFirebaseConnected || !firestoreDb) return;
  try {
    await firestoreDb.collection('materi').doc(id).delete();
  } catch (err) {
    console.error('Gagal hapus materi dari cloud:', err);
  }
}

/**
 * Sinkronkan 1 Mata Kuliah ke Cloud
 */
async function syncMatkulToCloud(matkul) {
  if (!isFirebaseConnected || !firestoreDb) return;
  try {
    await firestoreDb.collection('matkul').doc(matkul.id).set(matkul, { merge: true });
  } catch (err) {
    console.error('Gagal sync matkul ke cloud:', err);
  }
}

async function deleteMatkulFromCloud(id) {
  if (!isFirebaseConnected || !firestoreDb) return;
  try {
    await firestoreDb.collection('matkul').doc(id).delete();
  } catch (err) {
    console.error('Gagal hapus matkul dari cloud:', err);
  }
}

/**
 * Upload Berkas Fisik ke Firebase Cloud Storage
 * Mengembalikan download URL publik yang bisa dibuka dari laptop & HP manapun!
 */
async function uploadFileToFirebaseStorage(fileBlobOrDataUrl, fileName, fileId) {
  if (!isFirebaseConnected || !firebaseStorage) {
    return null; // Akan disimpan di IndexedDB lokal browser
  }

  try {
    let blob;
    if (typeof fileBlobOrDataUrl === 'string' && fileBlobOrDataUrl.startsWith('data:')) {
      blob = dataUrlToBlob(fileBlobOrDataUrl);
    } else {
      blob = fileBlobOrDataUrl;
    }

    const storagePath = `portal-kuliah/${fileId}_${fileName}`;
    const storageRef = firebaseStorage.ref().child(storagePath);
    
    // Unggah blob
    const snapshot = await storageRef.put(blob);
    const downloadUrl = await snapshot.ref.getDownloadURL();

    console.log('✅ File berhasil diunggah ke Firebase Storage:', downloadUrl);
    return {
      storageType: 'firebase',
      downloadUrl: downloadUrl,
      path: storagePath
    };
  } catch (err) {
    console.warn('Gagal unggah ke Firebase Storage, tetap simpan lokal:', err);
    return null;
  }
}

/**
 * Hapus Berkas dari Firebase Cloud Storage
 */
async function deleteFileFromFirebaseStorage(storagePath) {
  if (!isFirebaseConnected || !firebaseStorage || !storagePath) return;
  try {
    const storageRef = firebaseStorage.ref().child(storagePath);
    await storageRef.delete();
    console.log('Berkas dihapus dari Firebase Storage:', storagePath);
  } catch (err) {
    console.warn('Gagal menghapus file dari Firebase Storage:', err);
  }
}

/**
 * Migrasi Seluruh Data Lokal ke Cloud (Manual Trigger)
 */
async function syncAllLocalDataToCloud() {
  if (!isFirebaseConnected || !firestoreDb) {
    alert('Firebase belum terhubung! Silakan isi konfigurasi terlebih dahulu.');
    return;
  }

  try {
    showToast('Memulai sinkronisasi data lokal ke Cloud...', 'info');

    // Sync Matkul
    for (const m of matkulList) {
      await syncMatkulToCloud(m);
    }
    // Sync Tugas
    for (const t of tugasList) {
      await syncTugasToCloud(t);
    }
    // Sync Materi
    for (const mat of materiList) {
      await syncMateriToCloud(mat);
    }

    showToast('Seluruh data berhasil disinkronkan ke Firebase Cloud! ☁️🎉', 'success');
  } catch (err) {
    console.error('Gagal sinkronisasi data ke cloud:', err);
    showToast('Gagal sinkronisasi: ' + err.message, 'danger');
  }
}
