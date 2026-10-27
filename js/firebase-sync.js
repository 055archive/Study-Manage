/**
 * Firebase Firestore Synchronization Module
 * TEKS HOUSE Netflix & Chill - Sewa Apartemen Per Jam
 * Menggunakan Firebase Compat SDK yang 100% kompatibel dengan file://, HTTP, dan HTTPS
 */

// Konfigurasi Resmi Firebase Project "teks-house"
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAW1PNK1Vs_4w02xYNVFfTuDBJN_rbCHa4",
  authDomain: "teks-house.firebaseapp.com",
  projectId: "teks-house",
  storageBucket: "teks-house.firebasestorage.app",
  messagingSenderId: "416910541898",
  appId: "1:416910541898:web:a70407dccfddeae14212b3",
  measurementId: "G-MFQFFKCSR0"
};

let firestoreDb = null;
let isCloudSyncActive = false;
let unsubscribers = [];

const FIREBASE_CONFIG_KEY = 'sewa_apartemen_firebase_config';

// Mengambil konfigurasi tersimpan atau default
function getSavedFirebaseConfig() {
  try {
    const raw = localStorage.getItem(FIREBASE_CONFIG_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_FIREBASE_CONFIG;
  } catch (e) {
    console.error("Gagal membaca firebase config:", e);
    return DEFAULT_FIREBASE_CONFIG;
  }
}

// Menyimpan konfigurasi Firebase baru
function saveFirebaseConfig(configObj) {
  try {
    localStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(configObj));
    return true;
  } catch (e) {
    console.error("Gagal menyimpan firebase config:", e);
    return false;
  }
}

// Inisialisasi Firebase
function initFirebaseSync(onDataChangedCallback) {
  const config = getSavedFirebaseConfig();
  const statusBadge = document.getElementById('cloudSyncStatusBadge');
  const statusText = document.getElementById('cloudSyncStatusText');

  if (!config || !config.apiKey || !config.projectId) {
    updateCloudStatusUI('local', 'Penyimpanan Lokal (Offline)');
    return false;
  }

  try {
    if (!window.firebase) {
      console.warn("Pustaka Firebase SDK belum dimuat di browser.");
      updateCloudStatusUI('local', 'Penyimpanan Lokal (Offline)');
      return false;
    }

    // Inisialisasi Firebase app
    if (!firebase.apps.length) {
      firebase.initializeApp(config);
    }

    firestoreDb = firebase.firestore();
    isCloudSyncActive = true;

    updateCloudStatusUI('cloud', 'Tersambung Cloud (teks-house)');
    console.log("Firebase Firestore berhasil terhubung ke project:", config.projectId);

    // Listen real-time ke koleksi incomes
    listenToCloudCollection('incomes', (items) => {
      console.log(`Cloud update: ${items.length} transaksi pemasukan diterima.`);
      if (onDataChangedCallback) {
        onDataChangedCallback('incomes', items);
      }
    });

    // Listen real-time ke koleksi expenses
    listenToCloudCollection('expenses', (items) => {
      console.log(`Cloud update: ${items.length} data pengeluaran diterima.`);
      if (onDataChangedCallback) {
        onDataChangedCallback('expenses', items);
      }
    });

    return true;
  } catch (err) {
    console.error("Gagal inisialisasi Firebase:", err);
    updateCloudStatusUI('local', 'Penyimpanan Lokal (Offline)');
    isCloudSyncActive = false;
    return false;
  }
}

function updateCloudStatusUI(type, text) {
  const badge = document.getElementById('cloudSyncStatusBadge');
  const label = document.getElementById('cloudSyncStatusText');
  if (!badge || !label) return;

  label.innerText = text;
  badge.className = 'w-2.5 h-2.5 rounded-full';
  
  if (type === 'cloud') {
    badge.classList.add('bg-emerald-500', 'animate-pulse');
  } else if (type === 'connecting') {
    badge.classList.add('bg-sky-400', 'animate-ping');
  } else if (type === 'local') {
    badge.classList.add('bg-amber-400');
  } else {
    badge.classList.add('bg-rose-500');
  }
}

// Subscribe real-time
function listenToCloudCollection(collectionName, callback) {
  if (!isCloudSyncActive || !firestoreDb) return;

  try {
    const unsub = firestoreDb.collection(collectionName).onSnapshot((snapshot) => {
      const items = [];
      snapshot.forEach(docSnap => {
        items.push({ id: docSnap.id, ...docSnap.data() });
      });

      // Sort tanggal terbaru di atas
      items.sort((a, b) => {
        const dateA = a.dateTime || a.date || '';
        const dateB = b.dateTime || b.date || '';
        return dateB.localeCompare(dateA);
      });

      callback(items);
    }, (error) => {
      console.warn(`Firestore listener error pada ${collectionName}:`, error.message);
    });

    unsubscribers.push(unsub);
  } catch (e) {
    console.error(`Error setting listener pada ${collectionName}:`, e);
  }
}

// Simpan dokumen ke Cloud
async function syncSaveDocument(collectionName, id, data) {
  if (isCloudSyncActive && firestoreDb) {
    try {
      await firestoreDb.collection(collectionName).doc(String(id)).set(data, { merge: true });
      console.log(`Berhasil sync ke cloud [${collectionName}]:`, id);
    } catch (e) {
      console.error(`Gagal sync ke cloud [${collectionName}]:`, e);
    }
  }
}

// Hapus dokumen di Cloud
async function syncDeleteDocument(collectionName, id) {
  if (isCloudSyncActive && firestoreDb) {
    try {
      await firestoreDb.collection(collectionName).doc(String(id)).delete();
      console.log(`Berhasil hapus di cloud [${collectionName}]:`, id);
    } catch (e) {
      console.error(`Gagal hapus di cloud [${collectionName}]:`, e);
    }
  }
}
