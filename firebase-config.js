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
  const activeUid = localStorage.getItem('studysync_active_uid');
  if (activeUid) return activeUid;
  return currentUser ? currentUser.uid : null;
}
window.getCurrentUserUID = getCurrentUserUID;

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

    // Langsung aktifkan pendengar tugas & materi kelas publik agar selalu sinkron
    try {
      if (typeof setupClassListeners === 'function') setupClassListeners();
    } catch (e) {
      console.warn('setupClassListeners init error:', e);
    }

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

// ============================================================================
// SISTEM KODE KELAS & HASHING KRIPTOGRAFI
// ============================================================================
const DEFAULT_CLASS_CODE = 'TI2026';
const CLASS_CODE_STORAGE_KEY = 'studysync_class_code';

function getOfficialClassCode() {
  return (localStorage.getItem(CLASS_CODE_STORAGE_KEY) || DEFAULT_CLASS_CODE).trim().toUpperCase();
}

function setOfficialClassCode(newCode) {
  if (!newCode) return DEFAULT_CLASS_CODE;
  const clean = newCode.trim().toUpperCase();
  localStorage.setItem(CLASS_CODE_STORAGE_KEY, clean);
  return clean;
}
window.getOfficialClassCode = getOfficialClassCode;
window.setOfficialClassCode = setOfficialClassCode;

/**
 * Hashing SHA-256 bawaan Web Crypto API browser (cepat, aman, tanpa library pihak ketiga)
 */
async function hashSHA256(str) {
  if (!str) return '';
  try {
    const enc = new TextEncoder();
    const data = enc.encode(str);
    const hashBuf = await crypto.subtle.digest('SHA-256', data);
    const hashArr = Array.from(new Uint8Array(hashBuf));
    return hashArr.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return 'h_' + Math.abs(hash).toString(16);
  }
}
window.hashSHA256 = hashSHA256;

// ============================================================================
// FIREBASE AUTHENTICATION FUNCTIONS (MURNI NIM, PIN & KODE KELAS)
// ============================================================================

/**
 * DAFTAR AKUN MAHASISWA BARU (Tanpa Gmail pribadi)
 * Identitas: Nama, NIM, Kata Sandi, 4-Digit PIN Pemulihan, dan Kode Akses Kelas
 */
async function registerWithNIM(nama, nim, password, pin, classCode = null) {
  if (!firebaseAuth) throw new Error('Firebase Auth belum diinisialisasi.');

  const trimmedNIM = nim.trim();
  const trimmedNama = nama.trim();
  const trimmedClassCode = (classCode || '').trim().toUpperCase();
  const trimmedPIN = (pin || '').trim();

  // 1. Validasi 4-Digit PIN Pemulihan
  if (!/^\d{4}$/.test(trimmedPIN)) {
    throw new Error('PIN Pemulihan harus berupa 4 digit angka rahasia (contoh: 2004).');
  }

  // 2. Cek apakah NIM sudah terdaftar sebelumnya
  const existingEmail = await lookupEmailByNIM(trimmedNIM);
  if (existingEmail) {
    throw new Error(`NIM ${trimmedNIM} sudah terdaftar. Silakan langsung login dengan kata sandi kamu.`);
  }

  // 3. Buat identitas virtual murni kampus tanpa Gmail pribadi
  const virtualEmail = `${trimmedNIM}@kelas.internal`;
  const pwdHash = await hashSHA256(password);
  const pinHash = await hashSHA256(trimmedPIN);

  // Buat akun resmi di Firebase Auth
  let user = null;
  try {
    const userCredential = await firebaseAuth.createUserWithEmailAndPassword(virtualEmail, password);
    user = userCredential.user;
  } catch (authErr) {
    if (authErr && authErr.code === 'auth/email-already-in-use') {
      try {
        const signCred = await firebaseAuth.signInWithEmailAndPassword(virtualEmail, password);
        user = signCred.user;
      } catch (signErr) {
        throw new Error(`NIM ${trimmedNIM} sudah terdaftar. Silakan masuk dengan kata sandi kamu di tab Masuk!`);
      }
    } else {
      throw authErr;
    }
  }

  if (trimmedNama && user.updateProfile) {
    try { await user.updateProfile({ displayName: trimmedNama }); } catch (e) {}
  }

  // Simpan profil lengkap ke Firestore
  const isEnrolled = !!trimmedClassCode;
  const profileData = {
    nama: trimmedNama,
    nim: trimmedNIM,
    email: virtualEmail,
    role: 'Mahasiswa',
    classCode: trimmedClassCode || null,
    isClassEnrolled: isEnrolled,
    enrolledCourses: isEnrolled ? ['matkul-1', 'matkul-2', 'matkul-3', 'matkul-4', 'matkul-5', 'matkul-6', 'matkul-7', 'matkul-8', 'matkul-9', 'matkul-10'] : [],
    pin: trimmedPIN,
    pinHash: pinHash,
    passwordHash: pwdHash,
    createdAt: new Date().toISOString()
  };

  // Simpan sesi lokal agar auth observer dan UI langsung mengenali akun ini
  localStorage.setItem('studysync_active_uid', user.uid);
  localStorage.setItem('studysync_logged_nim', trimmedNIM);
  localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profileData));

  await saveUserProfile(user.uid, profileData);

  // Daftarkan di nim_index untuk lookup login & verifikasi lupa sandi
  if (firestoreDb) {
    await firestoreDb.collection('nim_index').doc(trimmedNIM).set({
      uid: user.uid,
      nama: trimmedNama,
      email: virtualEmail,
      pin: trimmedPIN,
      pinHash: pinHash,
      passwordHash: pwdHash,
      classCode: trimmedClassCode || null,
      createdAt: new Date().toISOString()
    });
  }

  currentUser = user;
  console.log('✅ Akun mahasiswa murni NIM berhasil didaftarkan untuk:', trimmedNama, '| NIM:', trimmedNIM);
  return { user, profile: profileData };
}
window.registerWithNIM = registerWithNIM;

/**
 * Backward compatibility untuk registrasi email jika ada pemanggilan lama
 */
async function registerWithEmailPassword(email, password, nama, nim) {
  return registerWithNIM(nama, nim, password, nim.slice(-4), getOfficialClassCode());
}

/**
 * LOGIN DENGAN NIM + PASSWORD (Mendukung akun lama & akun baru)
 */
async function loginWithNIMPassword(nim, password) {
  if (!firebaseAuth) throw new Error('Firebase Auth belum diinisialisasi.');

  const trimmedNIM = nim.trim();

  // 1. Ambil data dari nim_index
  let record = null;
  if (firestoreDb) {
    try {
      const doc = await firestoreDb.collection('nim_index').doc(trimmedNIM).get();
      if (doc.exists) record = doc.data();
    } catch (e) {
      console.warn('Gagal membaca nim_index:', e);
    }
  }

  if (!record) {
    throw new Error(`NIM ${trimmedNIM} tidak ditemukan. Pastikan NIM benar atau daftar akun baru.`);
  }

  const email = record.email || `${trimmedNIM}@kelas.internal`;
  const currentPwdHash = await hashSHA256(password);
  let user = null;
  let authSuccess = false;

  // 2. Coba login dengan Firebase Auth standar
  try {
    const userCredential = await firebaseAuth.signInWithEmailAndPassword(email, password);
    user = userCredential.user;
    authSuccess = true;
  } catch (authErr) {
    // Jika kata sandi cocok dengan passwordHash Firestore (misal setelah reset via PIN mandiri)
    if (record.passwordHash && record.passwordHash === currentPwdHash) {
      console.log('✅ Kata sandi cocok dengan hash tersimpan di Firestore!');
      authSuccess = true;
      if (!firebaseAuth.currentUser) {
        try {
          const anonCred = await firebaseAuth.signInAnonymously();
          user = anonCred.user;
        } catch (e) {}
      }
    } else {
      throw new Error('Kata sandi salah! Jika kamu lupa sandi, silakan klik tombol "Lupa kata sandi?".');
    }
  }

  // 3. Simpan sesi aktif mahasiswa
  if (authSuccess) {
    const uid = record.uid || (user && user.uid);
    if (uid) localStorage.setItem('studysync_active_uid', uid);
    localStorage.setItem('studysync_logged_nim', trimmedNIM);

    const defaultPin = record.pin || trimmedNIM.slice(-4);
    // Auto-Migrasi Transparan untuk 11 akun lama (yang belum punya PIN dan passwordHash)
    if (!record.passwordHash || !record.pin) {
      try {
        if (firestoreDb) {
          const officialCode = getOfficialClassCode();
          await firestoreDb.collection('nim_index').doc(trimmedNIM).set({
            ...record,
            pin: defaultPin,
            passwordHash: currentPwdHash,
            classCode: officialCode,
            isClassEnrolled: true
          }, { merge: true });

          await firestoreDb.collection('users').doc(uid).set({
            profile: {
              nama: record.nama || 'Mahasiswa',
              nim: trimmedNIM,
              pin: defaultPin,
              passwordHash: currentPwdHash,
              classCode: officialCode,
              isClassEnrolled: true
            }
          }, { merge: true });
          console.log('🔄 Akun lama berhasil dimigrasikan ke PIN & Kode Kelas!');
        }
      } catch (e) {
        console.warn('Migrasi akun lama dilewati:', e);
      }
    }
  }

  return user || { uid: record.uid, displayName: record.nama };
}
window.loginWithNIMPassword = loginWithNIMPassword;

/**
 * PEMULIHAN KATA SANDI MANDIRI VIA NIM & 4-DIGIT PIN PEMULIHAN
 * Tidak membutuhkan email Google! 100% instan dan aman dari teman usil.
 */
async function resetPasswordWithPIN(nim, pin, newPassword) {
  if (!firestoreDb) throw new Error('Database Cloud belum terhubung.');

  const trimmedNIM = nim.trim();
  const trimmedPIN = pin.trim();

  if (!trimmedNIM) throw new Error('Mohon masukkan NIM Mahasiswa.');
  if (!trimmedPIN) throw new Error('Mohon masukkan 4-Digit PIN Pemulihan.');
  if (!newPassword || newPassword.length < 6) throw new Error('Kata sandi baru minimal 6 karakter.');

  // 1. Ambil data dari nim_index
  const doc = await firestoreDb.collection('nim_index').doc(trimmedNIM).get();
  if (!doc.exists) {
    throw new Error(`NIM ${trimmedNIM} tidak ditemukan di sistem! Pastikan nomor NIM sudah benar.`);
  }

  const record = doc.data() || {};
  // Wajibkan PIN Pemulihan yang sah terdaftar (bukan turunan dari NIM publik)
  if (!record.pin) {
    throw new Error(`Akun NIM ${trimmedNIM} belum mengatur PIN Pemulihan mandiri. Silakan hubungi Pengurus Kelas untuk bantuan verifikasi.`);
  }

  const validPIN = String(record.pin).trim();
  if (trimmedPIN !== validPIN) {
    throw new Error('PIN Pemulihan salah! Pastikan 4 digit angka rahasia kamu benar.');
  }

  // 2. PIN Cocok! Hitung Hash kata sandi baru
  const newPwdHash = await hashSHA256(newPassword);
  const uid = record.uid;

  // 3. Perbarui di nim_index
  await firestoreDb.collection('nim_index').doc(trimmedNIM).set({
    passwordHash: newPwdHash,
    pin: validPIN,
    updatedAt: new Date().toISOString()
  }, { merge: true });

  // 4. Perbarui di users/{uid}/profile jika ada
  if (uid) {
    try {
      await firestoreDb.collection('users').doc(uid).set({
        profile: {
          passwordHash: newPwdHash,
          pin: validPIN,
          updatedAt: new Date().toISOString()
        }
      }, { merge: true });
    } catch (e) {}

    // Coba perbarui juga di Firebase Auth jika user saat ini aktif
    try {
      if (firebaseAuth && firebaseAuth.currentUser && firebaseAuth.currentUser.uid === uid) {
        await firebaseAuth.currentUser.updatePassword(newPassword);
      }
    } catch (e) {}
  }

  console.log('✅ Kata sandi berhasil direset via PIN untuk NIM:', trimmedNIM);
  return { success: true, nama: record.nama || 'Mahasiswa' };
}
window.resetPasswordWithPIN = resetPasswordWithPIN;

/**
 * LOGOUT - Keluar dari akun
 */
async function logoutUser() {
  if (firebaseAuth) {
    stopRealtimeListeners();
    try {
      await firebaseAuth.signOut();
    } catch (e) {}
  }
  currentUser = null;
  localStorage.removeItem('studysync_active_uid');
  localStorage.removeItem('studysync_logged_nim');
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
    // Fallback: cari di nim_index jika ada
    const savedNim = localStorage.getItem('studysync_logged_nim');
    if (savedNim) {
      const nimDoc = await firestoreDb.collection('nim_index').doc(savedNim).get();
      if (nimDoc.exists) {
        return nimDoc.data();
      }
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
    const profile = await getUserProfile(uid);

    // Jika NIM berubah, perbarui juga nim_index
    if (updates.nim) {
      if (profile && profile.nim && profile.nim !== updates.nim) {
        // Hapus index NIM lama
        await firestoreDb.collection('nim_index').doc(profile.nim).delete();
        // Daftarkan NIM baru
        await registerNIMIndex(updates.nim, uid, profile.email);
      }
    }

    // Selalu sinkronkan perubahan nama & foto profil ke dokumen nim_index jika ada NIM
    const targetNim = updates.nim || (profile ? profile.nim : null) || localStorage.getItem('studysync_logged_nim');
    if (targetNim) {
      const nimUpdates = {};
      if (updates.nama !== undefined) nimUpdates.nama = updates.nama;
      if (updates.photoURL !== undefined) nimUpdates.photoURL = updates.photoURL;
      if (Object.keys(nimUpdates).length > 0) {
        try {
          await firestoreDb.collection('nim_index').doc(String(targetNim).trim()).set(nimUpdates, { merge: true });
        } catch (nimErr) {
          console.warn('Gagal sinkron nama/photo ke nim_index:', nimErr);
        }
      }
    }

    await firestoreDb.collection('users').doc(uid).set({ profile: updates }, { merge: true });
    console.log('✅ Profil mahasiswa berhasil disinkron ke Firestore users/' + uid);
  } catch (err) {
    console.error('Gagal update profil:', err);
    throw err;
  }
}
window.updateUserProfile = updateUserProfile;

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
// HAK AKSES PENGURUS KELAS (ADMIN CREDENTIALS)
// ============================================================================
// Kredensial akun resmi pengurus kelas dengan keamanan Enkripsi One-Way Hash (SHA-256)
// Password asli TIDAK tersimpan dalam bentuk teks biasa, sehingga aman dari inspect element
const ADMIN_CREDENTIALS = {
  'designerweb': {
    hash: '4ffe7fa8f1ee9c7456106cfa95e12efa005ef2b9ba62fedbee1aa43123031f43',
    role: 'Designer Web',
    label: 'Designer Web'
  },
  'praktikibadah': {
    hash: '1d36b9fecc3e562f4d6054daac5662292877cf72924149479ff2c63b6326cded',
    role: 'PJ Praktik Ibadah',
    label: 'PJ Praktik Ibadah'
  },
  'kosma': {
    hash: '4aeba86d3da196c9da700454be6862498424715029c3139e85c51d99378cf353',
    role: 'Ketua Kelas',
    label: 'Ketua Kelas (Kosma)'
  },
  'bioinformatika': {
    hash: '1480a93305ab7c6e4df85dd1b64e69a89b49cd4ac63ab06a092d9f6a9e13bdf9',
    role: 'PJ Bioinformatika',
    label: 'PJ Bioinformatika'
  },
  'pbo': {
    hash: 'a87a98531309c896590a94f24d9d1b47c0810fb6806bfa45bfafe73df077ee5b',
    role: 'PJ PBO',
    label: 'PJ Pemrograman Berorientasi Objek'
  },
  'pemrogramanweb': {
    hash: '90c89d9616dddc3e7745757f9df7dd295aefa9d6e4106929498841c78cbe69a0',
    role: 'PJ Pemrograman Web',
    label: 'PJ Pemrograman Web'
  },
  'rpl': {
    hash: 'aa8f6d879f2e497921b3aa9cbdec283f99554dbc24a0ca9270be50b1daf59081',
    role: 'PJ RPL',
    label: 'PJ Rekayasa Perangkat Lunak'
  },
  'matematikadiskrit': {
    hash: '28b9df11debddcbdf5c17cd89441446dbd7a5917c6ad735f3c87a35d5e37b653',
    role: 'PJ Matematika Diskrit',
    label: 'PJ Matematika Diskrit'
  },
  'statistika': {
    hash: '1a94d021af9186a896fb052e1b75e86e13f9af3116176a72123552f87583a3da',
    role: 'PJ Statistika',
    label: 'PJ Statistika'
  },
  'jaringankomputer': {
    hash: '858a4f9710ec6aeb4e85a4fdae663f88fa36a0728d95856ff32a7bf4e3a38441',
    role: 'PJ Jaringan Komputer',
    label: 'PJ Jaringan Komputer'
  },
  'keamanandata': {
    hash: '1e1c0a2eb4e64181c7ebc18b92195710c0782bbf310d3a5a441d0db6063d0720',
    role: 'PJ Keamanan Data & Info',
    label: 'PJ Keamanan Data & Informasi'
  },
  'imk': {
    hash: '05d0e39dfed30d01c1faea77c5cf3d2b3c1387a9e0ef8305971ed966beb013c5',
    role: 'PJ IMK',
    label: 'PJ Interaksi Manusia dan Komputer'
  },
  'sekretaris': {
    hash: 'e8f585f1858dffa6a45ff31d3cb9c78c322638a9b0c69bf3695b3f635465c371',
    role: 'Sekretaris',
    label: 'Sekretaris Kelas'
  }
};

/**
 * Fungsi enkripsi SHA-256 menggunakan Web Crypto API browser
 * @param {string} text
 * @returns {Promise<string>}
 */
async function computeSHA256(text) {
  if (!text) return '';
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    console.error('Gagal menghitung SHA-256:', e);
    return '';
  }
}

/**
 * Verifikasi kredensial username & password pengurus kelas dengan hash SHA-256
 * @param {string} username
 * @param {string} password
 * @returns {Promise<object|null>} Objek akun pengurus jika valid, null jika salah
 */
async function verifyAdminCredentials(username, password) {
  if (!username || !password) return null;
  const cleanUser = String(username).trim().toLowerCase();
  const cred = ADMIN_CREDENTIALS[cleanUser];
  if (!cred) return null;

  const inputHash = await computeSHA256(String(password).trim());
  if (cred.hash && cred.hash === inputHash) {
    return { ...cred, username: cleanUser };
  }
  return null;
}



// ============================================================================
// REAL-TIME LISTENERS (PER-USER & SHARED KELAS)
// ============================================================================
let isInitialSyncTugas = true;
let isInitialSyncMateri = true;
let isInitialSyncMatkul = true;

let unsubscribeKelasTugas = null;
let unsubscribeKelasMateri = null;
let unsubscribeKelasInfo = null;
let unsubscribeTugasStatus = null;

/**
 * Hentikan semua real-time listener (dipanggil saat logout)
 */
function stopRealtimeListeners() {
  if (unsubscribeTugas) { unsubscribeTugas(); unsubscribeTugas = null; }
  if (unsubscribeMateri) { unsubscribeMateri(); unsubscribeMateri = null; }
  if (unsubscribeMatkul) { unsubscribeMatkul(); unsubscribeMatkul = null; }
  if (unsubscribeKelasTugas) { unsubscribeKelasTugas(); unsubscribeKelasTugas = null; }
  if (unsubscribeKelasMateri) { unsubscribeKelasMateri(); unsubscribeKelasMateri = null; }
  if (unsubscribeKelasInfo) { unsubscribeKelasInfo(); unsubscribeKelasInfo = null; }
  if (unsubscribeTugasStatus) { unsubscribeTugasStatus(); unsubscribeTugasStatus = null; }
  console.log('🔌 Seluruh real-time listeners dihentikan.');
}

/**
 * Setup Real-time Listeners Tugas & Materi Kelas Publik (Dapat diakses seluruh mahasiswa)
 */
function setupClassListeners() {
  if (!firestoreDb) return;

  if (!unsubscribeKelasTugas) {
    unsubscribeKelasTugas = firestoreDb.collection('kelas_tugas').onSnapshot((snapshot) => {
      const cloudData = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data && (data.judul || data.matkul)) cloudData.push({ id: doc.id, ...data });
      });
      console.log(`📢 ${cloudData.length} tugas resmi kelas tersinkron dari cloud.`);
      if (typeof handleCloudKelasTugas === 'function') {
        handleCloudKelasTugas(cloudData);
      }
    }, (err) => console.error('Error listener kelas_tugas:', err));
  }

  if (!unsubscribeKelasMateri) {
    unsubscribeKelasMateri = firestoreDb.collection('kelas_materi').onSnapshot((snapshot) => {
      const cloudData = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data && (data.judul || data.matkul)) cloudData.push({ id: doc.id, ...data });
      });
      console.log(`📚 ${cloudData.length} materi resmi kelas tersinkron dari cloud.`);
      if (typeof handleCloudKelasMateri === 'function') {
        handleCloudKelasMateri(cloudData);
      }
    }, (err) => console.error('Error listener kelas_materi:', err));
  }

  if (!unsubscribeKelasInfo) {
    unsubscribeKelasInfo = firestoreDb.collection('kelas_info').onSnapshot((snapshot) => {
      const cloudData = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data && data.judul) cloudData.push({ id: doc.id, ...data });
      });
      console.log(`📌 ${cloudData.length} informasi kelas tersinkron dari cloud.`);
      if (typeof handleCloudKelasInfo === 'function') {
        handleCloudKelasInfo(cloudData);
      }
    }, (err) => console.error('Error listener kelas_info:', err));
  }
}
window.setupClassListeners = setupClassListeners;

/**
 * Setup Real-time Listeners Firestore
 * - Koleksi Pribadi: users/{uid}/tugas, materi, matkul, tugas_status
 * - Koleksi Bersama (Seluruh Kelas): kelas_tugas, kelas_materi
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

    if (cloudData.length > 0) {
      matkulList = typeof ensureCourseClassCodes === 'function' ? ensureCourseClassCodes(cloudData) : cloudData;
    } else if (!matkulList || matkulList.length === 0) {
      const fallbackList = (typeof DEFAULT_MATKUL !== 'undefined' && Array.isArray(DEFAULT_MATKUL)) ? DEFAULT_MATKUL.slice() : [];
      matkulList = typeof ensureCourseClassCodes === 'function' ? ensureCourseClassCodes(fallbackList) : fallbackList;
    }

    saveStorage();
    try {
      renderMatkul();
      renderCourseFilters();
      if (window.feather) feather.replace();
    } catch (e) { console.warn('Gagal merender matkul dari cloud:', e); }
  }, (err) => console.error('Error listener matkul:', err));

  // 2. Listener Tugas Kuliah Pribadi (users/{uid}/tugas)
  unsubscribeTugas = userRef.collection('tugas').onSnapshot((snapshot) => {
    if (snapshot.empty && isInitialSyncTugas) {
      isInitialSyncTugas = false;
      if (typeof personalTugas !== 'undefined' && personalTugas && personalTugas.length > 0) {
        uploadInitialCollection('tugas', personalTugas, uid);
        return;
      }
    }
    isInitialSyncTugas = false;

    const cloudData = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data && (data.judul || data.matkul)) cloudData.push({ id: doc.id, ...data });
    });

    if (typeof handleCloudPersonalTugas === 'function') {
      handleCloudPersonalTugas(cloudData);
    } else {
      tugasList = cloudData;
      saveStorage();
      try {
        renderCourseFilters();
        renderTugas();
        renderOverviewUrgent();
        if (window.feather) feather.replace();
      } catch (e) { console.warn('Gagal merender tugas dari cloud:', e); }
    }
  }, (err) => console.error('Error listener tugas pribadi:', err));

  // 3. Listener Materi Kuliah Pribadi (users/{uid}/materi)
  unsubscribeMateri = userRef.collection('materi').onSnapshot((snapshot) => {
    if (snapshot.empty && isInitialSyncMateri) {
      isInitialSyncMateri = false;
      if (typeof personalMateri !== 'undefined' && personalMateri && personalMateri.length > 0) {
        uploadInitialCollection('materi', personalMateri, uid);
        return;
      }
    }
    isInitialSyncMateri = false;

    const cloudData = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data && (data.judul || data.matkul)) cloudData.push({ id: doc.id, ...data });
    });

    if (typeof handleCloudPersonalMateri === 'function') {
      handleCloudPersonalMateri(cloudData);
    } else {
      materiList = cloudData;
      saveStorage();
      try {
        renderMateri();
        renderOverviewRecentMaterials();
        if (window.feather) feather.replace();
      } catch (e) { console.warn('Gagal merender materi dari cloud:', e); }
    }
  }, (err) => console.error('Error listener materi pribadi:', err));

  // 4 & 5. Listener Tugas & Materi Resmi Kelas (Publik)
  setupClassListeners();

  // 6. Listener Status Selesai Tugas Kelas (users/{uid}/tugas_status)
  unsubscribeTugasStatus = userRef.collection('tugas_status').onSnapshot((snapshot) => {
    const statusMap = {};
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data) statusMap[doc.id] = !!data.completed;
    });
    if (typeof handleCloudTugasStatus === 'function') {
      handleCloudTugasStatus(statusMap);
    }
  }, (err) => console.error('Error listener tugas_status:', err));

  console.log('👂 Real-time listeners aktif (Pribadi & Kelas) untuk UID:', uid);
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
// CLOUD CRUD HELPERS (PRIBADI & RESMI KELAS)
// ============================================================================

// PRIBADI: TUGAS
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

// RESMI KELAS: TUGAS
async function syncKelasTugasToCloud(task) {
  if (!isFirebaseConnected || !firestoreDb) {
    console.warn('Firebase belum terhubung, tugas kelas tersimpan secara lokal.');
    return;
  }
  try {
    const cleanData = JSON.parse(JSON.stringify(task));
    await firestoreDb.collection('kelas_tugas').doc(task.id).set(cleanData, { merge: true });
    console.log('✅ Tugas resmi kelas tersimpan di cloud:', task.judul);
  } catch (err) {
    console.error('Gagal sync tugas kelas ke cloud:', err);
    if (typeof showToast === 'function') {
      showToast('⚠️ Info: Tugas tersimpan lokal. Periksa Rules Firestore di Firebase Console agar tersinkron ke teman sekelas.', 'warning');
    }
  }
}

async function deleteKelasTugasFromCloud(id) {
  if (!isFirebaseConnected || !firestoreDb) return;
  try {
    await firestoreDb.collection('kelas_tugas').doc(id).delete();
    console.log('🗑️ Tugas resmi kelas dihapus dari cloud:', id);
  } catch (err) { console.error('Gagal hapus tugas kelas dari cloud:', err); }
}

// STATUS PENGERJAAN TUGAS KELAS (PER-USER)
async function syncTugasStatusToCloud(taskId, isCompleted) {
  const uid = getCurrentUserUID();
  if (!isFirebaseConnected || !firestoreDb || !uid) return;
  try {
    await firestoreDb.collection('users').doc(uid).collection('tugas_status').doc(taskId).set({
      completed: !!isCompleted,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) { console.error('Gagal sync status tugas ke cloud:', err); }
}

// PRIBADI: MATERI
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

// RESMI KELAS: MATERI
async function syncKelasMateriToCloud(materi) {
  if (!isFirebaseConnected || !firestoreDb) {
    console.warn('Firebase belum terhubung, materi kelas tersimpan secara lokal.');
    return;
  }
  try {
    const cleanData = JSON.parse(JSON.stringify(materi));
    await firestoreDb.collection('kelas_materi').doc(materi.id).set(cleanData, { merge: true });
    console.log('✅ Materi resmi kelas tersimpan di cloud:', materi.judul);
  } catch (err) {
    console.error('Gagal sync materi kelas ke cloud:', err);
    if (typeof showToast === 'function') {
      showToast('⚠️ Info: Materi tersimpan lokal. Periksa Rules Firestore di Firebase Console agar tersinkron ke teman sekelas.', 'warning');
    }
  }
}

async function deleteKelasMateriFromCloud(id) {
  if (!isFirebaseConnected || !firestoreDb) return;
  try {
    await firestoreDb.collection('kelas_materi').doc(id).delete();
    console.log('🗑️ Materi resmi kelas dihapus dari cloud:', id);
  } catch (err) { console.error('Gagal hapus materi kelas dari cloud:', err); }
}

// INFORMASI & KELOMPOK KELAS
async function syncKelasInfoToCloud(info) {
  if (!isFirebaseConnected || !firestoreDb || !info || !info.id) return;
  try {
    const cleanData = JSON.parse(JSON.stringify(info));
    await firestoreDb.collection('kelas_info').doc(info.id).set(cleanData, { merge: true });
    console.log('✅ Informasi kelas tersimpan di cloud:', info.judul);
  } catch (err) {
    console.error('Gagal sync info kelas ke cloud:', err);
    if (typeof showToast === 'function') {
      showToast('⚠️ Info tersimpan lokal. Periksa koneksi cloud Anda.', 'warning');
    }
  }
}
window.syncKelasInfoToCloud = syncKelasInfoToCloud;

async function deleteKelasInfoFromCloud(id) {
  if (!isFirebaseConnected || !firestoreDb || !id) return;
  try {
    await firestoreDb.collection('kelas_info').doc(id).delete();
    console.log('🗑️ Informasi kelas dihapus dari cloud:', id);
  } catch (err) { console.error('Gagal hapus info kelas dari cloud:', err); }
}
window.deleteKelasInfoFromCloud = deleteKelasInfoFromCloud;

// MATA KULIAH
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
    // Timeout dipersingkat menjadi 2.5 detik agar proses tidak pernah membekukan aplikasi
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Firebase Storage timeout')), 2500)
    );
    const snapshot = await Promise.race([uploadPromise, timeoutPromise]);
    const downloadUrl = await snapshot.ref.getDownloadURL();

    console.log('✅ File berhasil diunggah ke Firebase Storage:', downloadUrl);
    return { storageType: 'firebase', downloadUrl, path: storagePath };
  } catch (err) {
    console.warn('Firebase Storage dilewati (file otomatis disimpan langsung ke Cloud Firestore):', err.message);
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

// ============================================================================
// MASTER ADMIN: AMBIL DATA SELURUH MAHASISWA & PROGRES TUGAS KELAS (ROLE-BASED)
// ============================================================================
async function fetchAllStudentsData() {
  if (!isFirebaseConnected || !firestoreDb) {
    console.warn('Firebase belum terhubung, menggunakan profil pengguna lokal.');
    if (typeof currentUserProfile !== 'undefined' && currentUserProfile) {
      return [{
        uid: (typeof getCurrentUserUID === 'function' ? getCurrentUserUID() : 'local-user') || 'local-user',
        nama: currentUserProfile.nama || 'Mahasiswa',
        nim: currentUserProfile.nim || '-',
        email: currentUserProfile.email || '-',
        role: currentUserProfile.role || 'Mahasiswa',
        isAdmin: !!currentUserProfile.isAdmin,
        createdAt: currentUserProfile.createdAt || new Date().toISOString()
      }];
    }
    return [];
  }

  try {
    const snapshot = await firestoreDb.collection('users').get();
    const students = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      if (data && data.profile) {
        students.push({
          uid: doc.id,
          nama: data.profile.nama || 'Tanpa Nama',
          nim: data.profile.nim || '-',
          email: data.profile.email || '-',
          role: data.profile.role || 'Mahasiswa',
          photoURL: data.profile.photoURL || null,
          isAdmin: !!data.profile.isAdmin,
          createdAt: data.profile.createdAt || ''
        });
      }
    });

    // Merge dengan nim_index agar seluruh mahasiswa terdaftar (termasuk 11 akun awal) pasti muncul
    try {
      const nimSnap = await firestoreDb.collection('nim_index').get();
      nimSnap.forEach(doc => {
        const data = doc.data();
        if (data) {
          const nimKey = String(doc.id).trim();
          const existing = students.find(s => String(s.nim).trim() === nimKey || (data.uid && s.uid === data.uid));
          if (!existing) {
            students.push({
              uid: data.uid || doc.id,
              nama: data.nama || `Mahasiswa (${doc.id})`,
              nim: doc.id,
              email: data.email || '-',
              role: 'Mahasiswa',
              photoURL: data.photoURL || null,
              isAdmin: false,
              createdAt: data.createdAt || ''
            });
          } else {
            if (data.nama && (!existing.nama || existing.nama === 'Tanpa Nama')) {
              existing.nama = data.nama;
            }
            if (data.photoURL && !existing.photoURL) {
              existing.photoURL = data.photoURL;
            }
          }
        }
      });
    } catch (e) {
      console.warn('Gagal membaca nim_index untuk dashboard:', e);
    }

    students.sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
    return students;
  } catch (err) {
    console.error('Gagal mengambil data seluruh mahasiswa:', err);
    throw err;
  }
}

async function fetchStudentTaskStatus(uid) {
  if (!isFirebaseConnected || !firestoreDb || !uid) return {};
  try {
    const snapshot = await firestoreDb.collection('users').doc(uid).collection('tugas_status').get();
    const statusMap = {};
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data) {
        statusMap[doc.id] = !!data.completed;
      }
    });
    return statusMap;
  } catch (err) {
    console.warn(`Gagal mengambil status tugas untuk UID ${uid}:`, err);
    return {};
  }
}

async function deleteStudentAccount(uid, nim) {
  if (!isFirebaseConnected || !firestoreDb) {
    throw new Error('Firebase belum terhubung ke Cloud Database.');
  }
  if (!uid) {
    throw new Error('UID mahasiswa tidak valid.');
  }

  try {
    const batch = firestoreDb.batch();

    // 1. Hapus dokumen profil di users/{uid}
    const userDocRef = firestoreDb.collection('users').doc(uid);
    batch.delete(userDocRef);

    // 2. Hapus dokumen index NIM di nim_index/{nim} agar tidak bisa login lagi
    if (nim && nim !== '-') {
      const nimDocRef = firestoreDb.collection('nim_index').doc(String(nim).trim());
      batch.delete(nimDocRef);
    }

    await batch.commit();

    // 3. Bersihkan subkoleksi (tugas_status, matkul, tugas, materi) secara asinkron
    const subcollections = ['tugas_status', 'matkul', 'tugas', 'materi'];
    for (const sub of subcollections) {
      try {
        const subSnap = await userDocRef.collection(sub).get();
        if (!subSnap.empty) {
          const subBatch = firestoreDb.batch();
          subSnap.forEach(doc => subBatch.delete(doc.ref));
          await subBatch.commit();
        }
      } catch (subErr) {
        console.warn(`Gagal membersihkan subkoleksi ${sub} untuk ${uid}:`, subErr);
      }
    }

    console.log(`✅ Data akun mahasiswa UID ${uid} (NIM: ${nim}) berhasil dihapus dari cloud.`);
    return true;
  } catch (err) {
    console.error('Error saat menghapus akun mahasiswa:', err);
    throw err;
  }
}

window.fetchAllStudentsData = fetchAllStudentsData;
window.fetchStudentTaskStatus = fetchStudentTaskStatus;
window.deleteStudentAccount = deleteStudentAccount;


