/**
 * StudySync - Portal Tugas & Materi Kuliah
 * Vanilla JavaScript (ES6+)
 */

// ============================================================================
// 1. DATA AWAL & LOCAL STORAGE
// ============================================================================
const TUGAS_STORAGE_KEY = 'studysync_tugas_v2';
const MATERI_STORAGE_KEY = 'studysync_materi_v2';
const MATKUL_STORAGE_KEY = 'studysync_matkul_v2';
const THEME_STORAGE_KEY = 'studysync_theme_v1';
const AUTH_STORAGE_KEY = 'studysync_auth_state_v2';
const USER_PROFILE_STORAGE_KEY = 'studysync_profile_v2';

// Data Mata Kuliah Default
// Data Mata Kuliah Asli Semester Ini (10 Mata Kuliah)
const DEFAULT_MATKUL = [
  {
    id: 'mk-1',
    nama: 'PRAKTIK IBADAH',
    kode: 'PK',
    sks: 2,
    dosen: 'Abdul Qodir',
    jadwal: 'Senin 13:00 - 14:40',
    ruangan: 'menyesuaikan',
    warna: '#4f46e5'
  },
  {
    id: 'mk-2',
    nama: 'BIOINFORMATIKA',
    kode: 'BK',
    sks: 2,
    dosen: 'Eri Sulistiati',
    jadwal: 'Senin 08:40 - 10:20',
    ruangan: 'menyesuaikan',
    warna: '#6366f1'
  },
  {
    id: 'mk-3',
    nama: 'PEMROGRAMAN BERORIENTASI OBJEK',
    kode: 'PBO',
    sks: 3,
    dosen: 'Maseni',
    jadwal: '10:00 - 12:30',
    ruangan: 'LabKom',
    warna: '#f59e0b'
  },
  {
    id: 'mk-4',
    nama: 'PEMROGRAMAN WEB',
    kode: 'PW',
    sks: 3,
    dosen: 'Wawan Setiawan',
    jadwal: 'Senin 14:40 - 17:10',
    ruangan: 'LabKom',
    warna: '#ec4899'
  },
  {
    id: 'mk-5',
    nama: 'REKAYASA PERANGKAT LUNAK',
    kode: 'RPL',
    sks: 3,
    dosen: 'Reza Syafrizal',
    jadwal: '10:00 - 12:30',
    ruangan: 'menyesuaikan',
    warna: '#06b6d4'
  },
  {
    id: 'mk-6',
    nama: 'MATEMATIKA DISKRIT',
    kode: 'MD',
    sks: 2,
    dosen: 'Ayu Siska Maryoni',
    jadwal: 'Selasa 08:30 - 10:00',
    ruangan: 'menyesuaikan',
    warna: '#10b981'
  },
  {
    id: 'mk-7',
    nama: 'STATISTIKA',
    kode: 'S',
    sks: 2,
    dosen: 'Eko Wahyu Wibowo',
    jadwal: '10:50 - 12:30',
    ruangan: 'menyesuaikan',
    warna: '#8b5cf6'
  },
  {
    id: 'mk-8',
    nama: 'JARINGAN KOMPUTER',
    kode: 'JK',
    sks: 3,
    dosen: 'Ibnu Mas\'ud',
    jadwal: 'Selasa 13:00 - 15:30',
    ruangan: 'LabKom',
    warna: '#3b82f6'
  },
  {
    id: 'mk-9',
    nama: 'KEAMANAN DATA DAN INFORMASI',
    kode: 'KDI',
    sks: 2,
    dosen: 'Ibnu Mas\'ud',
    jadwal: '15:30 - 17:10',
    ruangan: 'menyesuaikan',
    warna: '#0284c7'
  },
  {
    id: 'mk-10',
    nama: 'INTERAKSI MANUSIA DAN KOMPUTER',
    kode: 'IMK',
    sks: 2,
    dosen: 'Reza Syafrizal',
    jadwal: '14:40 - 16:20',
    ruangan: 'menyesuaikan',
    warna: '#f43f5e'
  }
];

// Storage Keys untuk data bersama kelas & status pengerjaan
const CLASS_TUGAS_STORAGE_KEY = 'study_class_tugas_v2';
const CLASS_MATERI_STORAGE_KEY = 'study_class_materi_v2';
const TUGAS_STATUS_STORAGE_KEY = 'study_tugas_status_cache';
const NOTIFS_STORAGE_KEY = 'study_notifs_cache';

// Daftar tugas dan materi dimulai dari 0 (bersih) agar mahasiswa bebas mengunggah tugas & materinya sendiri
const DEFAULT_TUGAS = [];
const DEFAULT_MATERI = [];

let matkulList = loadFromStorage(MATKUL_STORAGE_KEY, DEFAULT_MATKUL);
let personalTugas = loadFromStorage(TUGAS_STORAGE_KEY, DEFAULT_TUGAS);
let classTugas = loadFromStorage(CLASS_TUGAS_STORAGE_KEY, []);
let personalMateri = loadFromStorage(MATERI_STORAGE_KEY, DEFAULT_MATERI);
let classMateri = loadFromStorage(CLASS_MATERI_STORAGE_KEY, []);
let tugasStatusMap = loadFromStorage(TUGAS_STATUS_STORAGE_KEY, {});

// Array gabungan (tugas resmi kelas + tugas pribadi) yang ditampilkan ke UI
let tugasList = [];
let materiList = [];
let activeMatkulFilter = 'ALL';

// Profil & Hak Akses Pengurus
let currentUserProfile = null;
let isCurrentUserAdmin = false;

function canUserEditOrDelete(item) {
  if (!item) return false;
  // Jika tugas/materi pribadi, selalu boleh diedit & dihapus
  if (!item.isKelas) return true;
  // Jika pengguna adalah pengurus/admin aktif, boleh menghapus tugas & materi kelas
  if (isCurrentUserAdmin) return true;
  // Jika pengguna adalah pembuat/pengunggah item tersebut
  if (currentUserProfile) {
    if (item.authorUid && currentUserProfile.uid && item.authorUid === currentUserProfile.uid) return true;
    if (item.authorNama && currentUserProfile.nama && item.authorNama.toLowerCase().trim() === currentUserProfile.nama.toLowerCase().trim()) return true;
  }
  return false;
}
window.canUserEditOrDelete = canUserEditOrDelete;

function loadFromStorage(key, defaultData) {
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(defaultData)) {
        if (Array.isArray(parsed)) return parsed;
      } else if (typeof defaultData === 'object' && defaultData !== null) {
        if (typeof parsed === 'object' && parsed !== null) return parsed;
      }
    } catch (e) {
      console.error(`Gagal mengurai ${key}:`, e);
    }
  }
  try {
    localStorage.setItem(key, JSON.stringify(defaultData));
  } catch (e) {}
  return Array.isArray(defaultData) ? [...defaultData] : { ...defaultData };
}

function saveStorage() {
  try {
    localStorage.setItem(MATKUL_STORAGE_KEY, JSON.stringify(matkulList));
    localStorage.setItem(TUGAS_STORAGE_KEY, JSON.stringify(personalTugas));
    localStorage.setItem(CLASS_TUGAS_STORAGE_KEY, JSON.stringify(classTugas));
    localStorage.setItem(MATERI_STORAGE_KEY, JSON.stringify(personalMateri));
    localStorage.setItem(CLASS_MATERI_STORAGE_KEY, JSON.stringify(classMateri));
    localStorage.setItem(TUGAS_STATUS_STORAGE_KEY, JSON.stringify(tugasStatusMap));
  } catch (e) {}
}

/**
 * Gabungkan tugas kelas + tugas pribadi menjadi satu daftar tugasList
 */
function rebuildTugasList() {
  const combined = [];
  const seenIds = new Set();

  // 1. Tugas Resmi Kelas (Status pengerjaan diambil dari status per-user)
  if (Array.isArray(classTugas)) {
    classTugas.forEach(ct => {
      if (!ct || !ct.id) return;
      const isCompleted = !!tugasStatusMap[ct.id];
      combined.push({
        ...ct,
        isKelas: true,
        completed: isCompleted
      });
      seenIds.add(ct.id);
    });
  }

  // 2. Tugas Pribadi Mahasiswa
  if (Array.isArray(personalTugas)) {
    personalTugas.forEach(pt => {
      if (!pt || !pt.id) return;
      if (!seenIds.has(pt.id)) {
        combined.push({
          ...pt,
          isKelas: false,
          completed: !!pt.completed
        });
        seenIds.add(pt.id);
      }
    });
  }

  tugasList = combined;
  saveStorage();
  checkDeadlinesAndNotify();

  try {
    renderCourseFilters();
    renderTugas();
    renderOverviewUrgent();
    if (window.feather) feather.replace();
  } catch (e) {
    console.warn('rebuildTugasList error:', e);
  }
}

/**
 * Gabungkan materi kelas + materi pribadi menjadi satu daftar materiList
 */
function rebuildMateriList() {
  const combined = [];
  const seenIds = new Set();

  // 1. Materi Resmi Kelas
  if (Array.isArray(classMateri)) {
    classMateri.forEach(cm => {
      if (!cm || !cm.id) return;
      combined.push({
        ...cm,
        isKelas: true
      });
      seenIds.add(cm.id);
    });
  }

  // 2. Catatan Materi Pribadi
  if (Array.isArray(personalMateri)) {
    personalMateri.forEach(pm => {
      if (!pm || !pm.id) return;
      if (!seenIds.has(pm.id)) {
        combined.push({
          ...pm,
          isKelas: false
        });
        seenIds.add(pm.id);
      }
    });
  }

  materiList = combined;
  saveStorage();

  try {
    renderCourseFilters();
    renderMateri();
    renderOverviewRecentMaterials();
    if (window.feather) feather.replace();
  } catch (e) {
    console.warn('rebuildMateriList error:', e);
  }
}

// ============================================================================
// SISTEM PENYIMPANAN BERKAS LOKAL BROWSER (INDEXEDDB)
// Menampung file PDF, PPT, DOC, gambar, dll. tanpa batasan 5MB localStorage
// ============================================================================
const FILE_DB_NAME = 'StudySyncFilesDB';
const FILE_DB_VERSION = 1;
const FILE_STORE_NAME = 'files';

function openFileDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('Browser ini tidak mendukung IndexedDB.'));
      return;
    }
    const request = indexedDB.open(FILE_DB_NAME, FILE_DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(FILE_STORE_NAME)) {
        db.createObjectStore(FILE_STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveUploadedFile(fileRecord) {
  const db = await openFileDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILE_STORE_NAME, 'readwrite');
    const store = tx.objectStore(FILE_STORE_NAME);
    const req = store.put(fileRecord);
    req.onsuccess = () => resolve(fileRecord.id);
    req.onerror = () => reject(req.error);
  });
}

async function getUploadedFile(id) {
  if (!id) return null;
  const db = await openFileDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILE_STORE_NAME, 'readonly');
    const store = tx.objectStore(FILE_STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function deleteUploadedFile(id) {
  if (!id) return;
  try {
    const db = await openFileDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(FILE_STORE_NAME, 'readwrite');
      const store = tx.objectStore(FILE_STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Gagal menghapus file dari IndexedDB:', err);
  }
}

async function getAllUploadedFiles() {
  try {
    const db = await openFileDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(FILE_STORE_NAME, 'readonly');
      const store = tx.objectStore(FILE_STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    return [];
  }
}

// ============================================================================
// 2. ELEMEN DOM & EVENT LISTENERS
// ============================================================================
const navTabButtons = document.querySelectorAll('.nav-tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

// Ringkasan KPI
const overviewPendingTugas = document.getElementById('overviewPendingTugas');
const overviewDoneTugas = document.getElementById('overviewDoneTugas');
const overviewTotalMateri = document.getElementById('overviewTotalMateri');
const urgentTugasCount = document.getElementById('urgentTugasCount');
const overviewCoursesCount = document.getElementById('overviewCoursesCount');
const badgePendingTugas = document.getElementById('badgePendingTugas');
const badgeTotalMateri = document.getElementById('badgeTotalMateri');
const badgeTotalMatkul = document.getElementById('badgeTotalMatkul');
const currentDateDisplay = document.getElementById('currentDateDisplay');

// Kontainer Daftar
const urgentTasksContainer = document.getElementById('urgentTasksContainer');
const recentMaterialsContainer = document.getElementById('recentMaterialsContainer');
const tugasGridContainer = document.getElementById('tugasGridContainer');
const materiGridContainer = document.getElementById('materiGridContainer');
const matkulGridContainer = document.getElementById('matkulGridContainer');
const emptyTugasState = document.getElementById('emptyTugasState');
const emptyMateriState = document.getElementById('emptyMateriState');
const emptyMatkulState = document.getElementById('emptyMatkulState');
const sidebarCourseFilters = document.getElementById('sidebarCourseFilters');
const mataKuliahSuggestions = document.getElementById('mataKuliahSuggestions');

// Filter & Pencarian
const filterTugasMatkul = document.getElementById('filterTugasMatkul');
const filterTugasStatus = document.getElementById('filterTugasStatus');
const searchTugasInput = document.getElementById('searchTugasInput');
const filterMateriMatkul = document.getElementById('filterMateriMatkul');
const searchMateriInput = document.getElementById('searchMateriInput');
const globalSearchInput = document.getElementById('globalSearchInput');

// Banner Filter Aktif
const tugasFilterBanner = document.getElementById('tugasFilterBanner');
const tugasFilterName = document.getElementById('tugasFilterName');
const materiFilterBanner = document.getElementById('materiFilterBanner');
const materiFilterName = document.getElementById('materiFilterName');

// Dialog & Form
const tugasModal = document.getElementById('tugasModal');
const materiModal = document.getElementById('materiModal');
const matkulModal = document.getElementById('matkulModal');
const tugasForm = document.getElementById('tugasForm');
const materiForm = document.getElementById('materiForm');
const matkulForm = document.getElementById('matkulForm');
const btnOpenModalTugas = document.getElementById('btnOpenModalTugas');
const btnOpenModalMateri = document.getElementById('btnOpenModalMateri');
const btnOpenModalMatkul = document.getElementById('btnOpenModalMatkul');

// Elemen Edit Modal
const editTugasId = document.getElementById('editTugasId');
const tugasModalTitle = document.getElementById('tugasModalTitle');
const btnSubmitTugas = document.getElementById('btnSubmitTugas');

const editMateriId = document.getElementById('editMateriId');
const materiModalTitle = document.getElementById('materiModalTitle');
const btnSubmitMateri = document.getElementById('btnSubmitMateri');

const editMatkulId = document.getElementById('editMatkulId');
const matkulModalTitle = document.getElementById('matkulModalTitle');
const btnSubmitMatkul = document.getElementById('btnSubmitMatkul');

// Elemen File Upload (Tugas & Materi)
const tugasFileInput = document.getElementById('tugasFileInput');
const tugasDropzone = document.getElementById('tugasDropzone');
const tugasFilePreview = document.getElementById('tugasFilePreview');
const tugasPreviewIcon = document.getElementById('tugasPreviewIcon');
const tugasPreviewName = document.getElementById('tugasPreviewName');
const tugasPreviewSize = document.getElementById('tugasPreviewSize');
const btnViewTugasFile = document.getElementById('btnViewTugasFile');
const btnRemoveTugasFile = document.getElementById('btnRemoveTugasFile');

const materiFileInput = document.getElementById('materiFileInput');
const materiDropzone = document.getElementById('materiDropzone');
const materiFilePreview = document.getElementById('materiFilePreview');
const materiPreviewIcon = document.getElementById('materiPreviewIcon');
const materiPreviewName = document.getElementById('materiPreviewName');
const materiPreviewSize = document.getElementById('materiPreviewSize');
const btnViewMateriFile = document.getElementById('btnViewMateriFile');
const btnRemoveMateriFile = document.getElementById('btnRemoveMateriFile');
const materiLinkToggle = document.getElementById('materiLinkToggle');

// State Berkas yang sedang dipilih di Modal
let stagedTugasFile = null;
let stagedMateriFile = null;

// Sidebar & Tema
const sidebar = document.getElementById('sidebar');
const openSidebarBtn = document.getElementById('openSidebarBtn');
const closeSidebarBtn = document.getElementById('closeSidebarBtn');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeIcon = document.getElementById('themeIcon');

// ============================================================================
// 3. UTILITY FORMATTERS & FILE HANDLERS
// ============================================================================
function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getFileIconName(filename, mimeType = '') {
  const name = (filename || '').toLowerCase();
  const mime = (mimeType || '').toLowerCase();

  if (name.endsWith('.pdf') || mime.includes('pdf')) return 'file-text';
  if (name.endsWith('.ppt') || name.endsWith('.pptx') || mime.includes('presentation') || mime.includes('powerpoint')) return 'monitor';
  if (name.endsWith('.doc') || name.endsWith('.docx') || mime.includes('word') || mime.includes('document')) return 'file-text';
  if (name.endsWith('.xls') || name.endsWith('.xlsx') || mime.includes('sheet') || mime.includes('excel')) return 'grid';
  if (name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.gif') || name.endsWith('.webp') || mime.startsWith('image/')) return 'image';
  if (name.endsWith('.zip') || name.endsWith('.rar') || name.endsWith('.7z') || name.endsWith('.tar') || mime.includes('zip') || mime.includes('compressed')) return 'package';
  if (name.endsWith('.html') || name.endsWith('.css') || name.endsWith('.js') || name.endsWith('.py') || name.endsWith('.java') || name.endsWith('.cpp')) return 'code';
  return 'file';
}

function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  return new Blob([uInt8Array], { type: contentType });
}

let currentViewerBlobUrl = null;

window.handleOpenFile = async function(fileId, fileName, downloadUrl = '') {
  await openFileViewer(fileId, fileName, downloadUrl);
};

/**
 * Unduh berkas tugas / materi langsung ke perangkat (HP Android, iPhone, Laptop)
 * Mendukung berkas cloud, Blob URL, dan berkas base64 tersinkron
 */
window.downloadAttachment = async function(fileId, fileName, downloadUrl = '', e) {
  if (e) {
    if (typeof e.stopPropagation === 'function') e.stopPropagation();
    if (typeof e.preventDefault === 'function') e.preventDefault();
  }

  try {
    let directUrl = downloadUrl;
    let fileBlob = null;
    let cleanupUrl = false;

    if (!directUrl) {
      // 1. Cek dari IndexedDB lokal
      let record = await getUploadedFile(fileId);

      // 2. Jika tidak ada di IndexedDB lokal (misal dibuka di HP teman atau laptop), cari dari data Firestore yang tersinkron di memori
      if (!record || !record.data) {
        const allTasks = [...(classTugas || []), ...(personalTugas || [])];
        const allMateri = [...(classMateri || []), ...(personalMateri || [])];
        const matchTask = allTasks.find(t => t && t.file && (t.file.id === fileId || t.file.name === fileName) && t.file.data);
        const matchMateri = allMateri.find(m => m && m.file && (m.file.id === fileId || m.file.name === fileName) && m.file.data);
        const cloudFile = matchTask ? matchTask.file : (matchMateri ? matchMateri.file : null);

        if (cloudFile && cloudFile.data) {
          record = {
            id: fileId,
            name: cloudFile.name || fileName,
            size: cloudFile.size || 0,
            type: cloudFile.type || '',
            data: cloudFile.data
          };
          // Simpan ke IndexedDB lokal perangkat ini agar instan saat diakses berikutnya
          try { await saveUploadedFile(record); } catch (e) {}
        }
      }

      if (record && record.data) {
        fileBlob = dataUrlToBlob(record.data);
        directUrl = URL.createObjectURL(fileBlob);
        cleanupUrl = true;
      }
    }

    if (!directUrl) {
      showToast('Berkas fisik belum tersinkron di perangkat ini. Pastikan pengunggah telah membuka aplikasi di HP-nya sebentar.', 'danger');
      return;
    }

    showToast(`Mengunduh "${fileName || 'berkas'}"... 📥`, 'info');

    const a = document.createElement('a');
    a.href = directUrl;
    a.download = fileName || 'berkas_unduhan';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    a.remove();

    if (cleanupUrl) {
      setTimeout(() => {
        try { URL.revokeObjectURL(directUrl); } catch (e) {}
      }, 60000);
    }
  } catch (err) {
    console.error('Error saat download berkas:', err);
    showToast('Gagal mengunduh berkas: ' + err.message, 'danger');
  }
};

window.openFileViewer = async function(fileId, fileName, downloadUrl = '') {
  const viewerModal = document.getElementById('fileViewerModal');
  const viewerFileName = document.getElementById('viewerFileName');
  const viewerFileSize = document.getElementById('viewerFileSize');
  const viewerFileIcon = document.getElementById('viewerFileIcon');
  const viewerIframe = document.getElementById('fileViewerIframe');
  const viewerImageWrapper = document.getElementById('fileViewerImageWrapper');
  const viewerImage = document.getElementById('fileViewerImage');
  const viewerFallback = document.getElementById('fileViewerFallback');
  const viewerFallbackTitle = document.getElementById('viewerFallbackTitle');
  const viewerFallbackDesc = document.getElementById('viewerFallbackDesc');
  const viewerLoading = document.getElementById('fileViewerLoading');
  const btnDownload = document.getElementById('btnDownloadFromViewer');
  const btnFallbackDownload = document.getElementById('btnFallbackDownload');

  if (!viewerModal) return;

  // Bersihkan resource Blob URL sebelumnya
  if (currentViewerBlobUrl) {
    URL.revokeObjectURL(currentViewerBlobUrl);
    currentViewerBlobUrl = null;
  }

  viewerFileName.textContent = fileName || 'Dokumen';
  viewerFileSize.textContent = '-';
  viewerIframe.style.display = 'none';
  viewerIframe.src = '';
  viewerImageWrapper.style.display = 'none';
  viewerImage.src = '';
  viewerFallback.style.display = 'none';
  viewerLoading.style.display = 'flex';

  viewerModal.showModal();
  if (window.feather) feather.replace();

  try {
    let fileBlob = null;
    let fileType = '';
    let fileSize = 0;
    let directUrl = downloadUrl;

    if (downloadUrl) {
      // Jika dari Cloud Storage
      const nameLower = (fileName || '').toLowerCase();
      if (nameLower.endsWith('.pdf')) fileType = 'application/pdf';
      else if (nameLower.match(/\.(png|jpg|jpeg|gif|webp)$/)) fileType = 'image/jpeg';
      else fileType = 'application/octet-stream';
    } else {
      // 1. Cek dari IndexedDB lokal
      let record = await getUploadedFile(fileId);

      // 2. Jika tidak ada di IndexedDB lokal (misal dibuka di laptop atau HP lain), cari data file yang disinkron dari Cloud Firestore
      if (!record || !record.data) {
        const allTasks = [...(classTugas || []), ...(personalTugas || [])];
        const allMateri = [...(classMateri || []), ...(personalMateri || [])];
        const matchTask = allTasks.find(t => t.file && (t.file.id === fileId || t.file.name === fileName) && t.file.data);
        const matchMateri = allMateri.find(m => m.file && (m.file.id === fileId || m.file.name === fileName) && m.file.data);
        const cloudFile = matchTask ? matchTask.file : (matchMateri ? matchMateri.file : null);

        if (cloudFile && cloudFile.data) {
          record = {
            id: fileId,
            name: cloudFile.name || fileName,
            size: cloudFile.size || 0,
            type: cloudFile.type || '',
            data: cloudFile.data
          };
          // Simpan ke IndexedDB lokal perangkat ini agar saat dibuka lagi tidak perlu unduh ulang
          try { await saveUploadedFile(record); } catch (e) {}
        }
      }

      if (!record || !record.data) {
        viewerLoading.style.display = 'none';
        viewerFallback.style.display = 'flex';
        viewerFallbackTitle.textContent = 'Berkas Belum Tersedia di Cloud';
        viewerFallbackDesc.textContent = 'Berkas ini tersimpan di perangkat lokal pengunggah aslinya. Buka web sekali di HP pengunggah asli agar berkas otomatis terunggah ke Cloud, atau hubungi pengunggah untuk melampirkan link Drive.';
        if (btnFallbackDownload) btnFallbackDownload.style.display = 'none';
        showToast('Berkas fisik tidak ditemukan di cloud maupun perangkat ini.', 'danger');
        return;
      }
      fileType = record.type || '';
      fileSize = record.size || 0;
      fileBlob = dataUrlToBlob(record.data);
      currentViewerBlobUrl = URL.createObjectURL(fileBlob);
      directUrl = currentViewerBlobUrl;
    }

    if (fileSize) {
      viewerFileSize.textContent = formatFileSize(fileSize);
    }
    const iconName = getFileIconName(fileName, fileType);
    if (viewerFileIcon) viewerFileIcon.setAttribute('data-feather', iconName);

    // Fungsi unduh berkas
    const triggerDownload = () => {
      const a = document.createElement('a');
      a.href = directUrl;
      a.download = fileName || 'berkas';
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast(`Mengunduh "${fileName}"...`, 'info');
    };

    if (btnDownload) {
      btnDownload.onclick = triggerDownload;
    }
    if (btnFallbackDownload) {
      btnFallbackDownload.style.display = 'inline-flex';
      btnFallbackDownload.onclick = triggerDownload;
    }

    viewerLoading.style.display = 'none';

    // Deteksi tipe file untuk viewer
    const isPdf = fileType === 'application/pdf' || (fileName || '').toLowerCase().endsWith('.pdf');
    const isImage = fileType.startsWith('image/') || (fileName || '').toLowerCase().match(/\.(png|jpg|jpeg|gif|webp)$/);

    if (isPdf) {
      viewerIframe.style.display = 'block';
      viewerIframe.src = directUrl;
    } else if (isImage) {
      viewerImageWrapper.style.display = 'flex';
      viewerImage.src = directUrl;
    } else {
      // Dokumen Word, PPT, Excel, ZIP dll.
      viewerFallback.style.display = 'flex';
      viewerFallbackTitle.textContent = `Dokumen: ${fileName}`;
      viewerFallbackDesc.textContent = `Berkas ini berformat dokumen (${fileName.split('.').pop().toUpperCase()}). Klik tombol di bawah untuk membuka langsung di perangkat Anda.`;
    }

    if (window.feather) feather.replace();
  } catch (err) {
    console.error('Error saat memuat file viewer:', err);
    viewerLoading.style.display = 'none';
    viewerFallback.style.display = 'flex';
    viewerFallbackTitle.textContent = 'Gagal Memuat Berkas';
    viewerFallbackDesc.textContent = err.message || 'Terjadi kesalahan saat memuat berkas.';
  }
};

window.closeFileViewer = function() {
  const viewerModal = document.getElementById('fileViewerModal');
  const viewerIframe = document.getElementById('fileViewerIframe');
  if (viewerIframe) viewerIframe.src = '';
  if (currentViewerBlobUrl) {
    URL.revokeObjectURL(currentViewerBlobUrl);
    currentViewerBlobUrl = null;
  }
  if (viewerModal) viewerModal.close();
};

/**
 * Kompresi gambar/foto (dari kamera HP / galeri) secara otomatis menggunakan HTML5 Canvas
 * Mengubah foto 3MB+ menjadi ~150-250KB JPEG dengan resolusi tajam agar bisa disimpan di cloud
 */
function compressImageIfNeeded(file, maxDimension = 1440, quality = 0.8) {
  return new Promise((resolve) => {
    if (!file || !file.type || !file.type.startsWith('image/') || file.type === 'image/svg+xml') {
      return resolve(null);
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => resolve(null);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

function setupFileUploader({
  fileInput,
  dropzone,
  previewCard,
  previewIcon,
  previewName,
  previewSize,
  btnView,
  btnRemove,
  getStagedFile,
  setStagedFile
}) {
  if (!dropzone || !fileInput) return { renderPreviewUI: () => {} };

  // Pastikan klik pada dropzone selalu membuka file chooser di semua tipe elemen & browser
  dropzone.addEventListener('click', (e) => {
    if (dropzone.tagName.toLowerCase() !== 'label') {
      fileInput.click();
    }
  });

  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer ? e.dataTransfer.files : null;
    if (files && files.length > 0) {
      processSelectedFile(files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFile(e.target.files[0]);
    }
    // Reset file input agar memilih berkas yang sama berturut-turut tetap memicu event change
    fileInput.value = '';
  });

  async function processSelectedFile(file) {
    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      showToast('Ukuran berkas melebihi batas maksimal 10MB! Gunakan file lebih kecil atau lampirkan link Google Drive.', 'danger');
      return;
    }

    const cleanName = file.name.replace(/\.[^/.]+$/, "");
    if (fileInput.id === 'materiFileInput') {
      const judulInp = document.getElementById('materiJudul');
      if (judulInp && !judulInp.value.trim()) {
        judulInp.value = cleanName;
      }
    } else if (fileInput.id === 'tugasFileInput') {
      const tugasJudulInp = document.getElementById('tugasJudul');
      if (tugasJudulInp && !tugasJudulInp.value.trim()) {
        tugasJudulInp.value = cleanName;
      }
    }

    // Kompresi otomatis jika berkas adalah gambar/foto kamera HP
    let compressedData = null;
    if (file.type && file.type.startsWith('image/') && file.type !== 'image/svg+xml') {
      try {
        compressedData = await compressImageIfNeeded(file);
      } catch (err) {
        console.warn('Kompresi gambar dilewati:', err);
      }
    }

    if (compressedData) {
      const approxSize = Math.round((compressedData.length - 22) * 3 / 4);
      const fileData = {
        isNew: true,
        id: 'file-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        name: file.name,
        size: approxSize,
        type: 'image/jpeg',
        data: compressedData,
        uploadedAt: new Date().toISOString()
      };
      setStagedFile(fileData);
      renderPreviewUI(fileData);
      showToast(`Berkas "${file.name}" siap disimpan (${formatFileSize(approxSize)})! 📎`, 'info');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const fileData = {
        isNew: true,
        id: 'file-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        data: e.target.result,
        uploadedAt: new Date().toISOString()
      };
      setStagedFile(fileData);
      renderPreviewUI(fileData);
      showToast(`Berkas "${file.name}" siap disimpan! 📎`, 'info');
    };
    reader.onerror = () => {
      showToast('Gagal membaca berkas dari perangkat Anda.', 'danger');
    };
    reader.readAsDataURL(file);
  }

  function renderPreviewUI(fileData) {
    if (!fileData) {
      previewCard.style.display = 'none';
      dropzone.style.display = 'flex';
      return;
    }

    previewName.textContent = fileData.name;
    previewSize.textContent = formatFileSize(fileData.size);
    const iconName = getFileIconName(fileData.name, fileData.type);
    previewIcon.setAttribute('data-feather', iconName);
    
    dropzone.style.display = 'none';
    previewCard.style.display = 'flex';
    feather.replace();
  }

  if (btnRemove) {
    btnRemove.addEventListener('click', (e) => {
      e.stopPropagation();
      setStagedFile(null);
      fileInput.value = '';
      previewCard.style.display = 'none';
      dropzone.style.display = 'flex';
      showToast('Lampiran berkas dihapus.', 'info');
    });
  }

  if (btnView) {
    btnView.addEventListener('click', async (e) => {
      e.stopPropagation();
      const current = getStagedFile();
      if (!current) return;

      if (current.data) {
        const blob = dataUrlToBlob(current.data);
        const url = URL.createObjectURL(blob);
        const win = window.open(url, '_blank');
        if (!win) {
          const a = document.createElement('a');
          a.href = url;
          a.target = '_blank';
          a.click();
        }
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } else if (current.id) {
        window.handleOpenFile(current.id, current.name);
      }
    });
  }

  return { renderPreviewUI };
}

// Inisialisasi Uploader Tugas & Materi
const tugasUploader = setupFileUploader({
  fileInput: tugasFileInput,
  dropzone: tugasDropzone,
  previewCard: tugasFilePreview,
  previewIcon: tugasPreviewIcon,
  previewName: tugasPreviewName,
  previewSize: tugasPreviewSize,
  btnView: btnViewTugasFile,
  btnRemove: btnRemoveTugasFile,
  getStagedFile: () => stagedTugasFile,
  setStagedFile: (f) => { stagedTugasFile = f; }
});

const materiUploader = setupFileUploader({
  fileInput: materiFileInput,
  dropzone: materiDropzone,
  previewCard: materiFilePreview,
  previewIcon: materiPreviewIcon,
  previewName: materiPreviewName,
  previewSize: materiPreviewSize,
  btnView: btnViewMateriFile,
  btnRemove: btnRemoveMateriFile,
  getStagedFile: () => stagedMateriFile,
  setStagedFile: (f) => { stagedMateriFile = f; }
});

function formatIndoDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function calculateDeadlineInfo(deadlineStr) {
  if (!deadlineStr) return { text: 'Tidak ada tenggat', type: 'safe', isUrgent: false };

  const deadline = new Date(deadlineStr);
  const now = new Date();
  const diffMs = deadline - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const timeFormatted = deadline.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const dateFormatted = deadline.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

  if (diffMs < 0) {
    return {
      text: `Terlewat (${dateFormatted}, ${timeFormatted})`,
      type: 'urgent',
      isUrgent: true
    };
  } else if (diffDays <= 1) {
    return {
      text: `Mendesak! Hari ini / Besok (${timeFormatted})`,
      type: 'urgent',
      isUrgent: true
    };
  } else if (diffDays <= 3) {
    return {
      text: `${diffDays} hari lagi (${dateFormatted})`,
      type: 'soon',
      isUrgent: true
    };
  } else {
    return {
      text: `${diffDays} hari lagi (${dateFormatted})`,
      type: 'safe',
      isUrgent: false
    };
  }
}

function escapeHtml(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.innerText = str;
  return d.innerHTML;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastWrapper');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  let iconName = 'info';
  if (type === 'success') iconName = 'check-circle';
  if (type === 'danger') iconName = 'trash-2';

  toast.innerHTML = `
    <i data-feather="${iconName}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  feather.replace();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 2800);
}

// ============================================================================
// 4. TAB MANAGEMENT & FILTER MATA KULIAH
// ============================================================================
function switchTab(tabId) {
  navTabButtons.forEach(btn => {
    if (btn.getAttribute('data-tab') === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  tabPanes.forEach(pane => {
    if (pane.id === tabId) {
      pane.classList.add('active');
    } else {
      pane.classList.remove('active');
    }
  });

  closeSidebar();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.switchTab = switchTab;

navTabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const targetTab = btn.getAttribute('data-tab');
    switchTab(targetTab);
  });
});

function getAllMataKuliahList() {
  const set = new Set();
  if (Array.isArray(matkulList)) matkulList.forEach(m => m && m.nama && set.add(m.nama.trim()));
  if (Array.isArray(tugasList)) tugasList.forEach(t => t && t.matkul && set.add(t.matkul.trim()));
  if (Array.isArray(materiList)) materiList.forEach(m => m && m.matkul && set.add(m.matkul.trim()));
  if (Array.isArray(classTugas)) classTugas.forEach(t => t && t.matkul && set.add(t.matkul.trim()));
  if (Array.isArray(classMateri)) classMateri.forEach(m => m && m.matkul && set.add(m.matkul.trim()));
  return Array.from(set).sort();
}

const COURSE_COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

function getCourseColor(courseName) {
  if (!courseName) return '#4f46e5';
  const target = courseName.toLowerCase().trim();
  const found = matkulList.find(m => m && m.nama && m.nama.toLowerCase().trim() === target);
  if (found && found.warna) return found.warna;
  let hash = 0;
  for (let i = 0; i < courseName.length; i++) hash = courseName.charCodeAt(i) + ((hash << 5) - hash);
  return COURSE_COLORS[Math.abs(hash) % COURSE_COLORS.length];
}

function renderCourseFilters() {
  const courses = getAllMataKuliahList();

  // 1. Sidebar Course Pills
  if (sidebarCourseFilters) {
    sidebarCourseFilters.innerHTML = `
      <button class="course-filter-btn ${activeMatkulFilter === 'ALL' ? 'active' : ''}" onclick="setMatkulFilter('ALL')">
        <span class="course-dot" style="background-color: #6366f1;"></span>
        <span>Semua Mata Kuliah</span>
      </button>
    `;

    courses.forEach((course) => {
      const color = getCourseColor(course);
      const isAct = activeMatkulFilter === course ? 'active' : '';
      const btn = document.createElement('button');
      btn.className = `course-filter-btn ${isAct}`;
      btn.innerHTML = `
        <span class="course-dot" style="background-color: ${color};"></span>
        <span>${escapeHtml(course)}</span>
      `;
      btn.onclick = () => setMatkulFilter(course);
      sidebarCourseFilters.appendChild(btn);
    });
  }

  // 2. Select Option Dropdowns (Filter Bar)
  const generateFilterOptions = () => {
    let html = '<option value="ALL">Semua Mata Kuliah</option>';
    courses.forEach(c => {
      html += `<option value="${escapeHtml(c)}" ${activeMatkulFilter === c ? 'selected' : ''}>${escapeHtml(c)}</option>`;
    });
    return html;
  };

  if (filterTugasMatkul) filterTugasMatkul.innerHTML = generateFilterOptions();
  if (filterMateriMatkul) filterMateriMatkul.innerHTML = generateFilterOptions();

  // 3. Dropdown Select untuk Modal Tambah/Edit Tugas & Materi (Sinkron Real-Time)
  const populateModalCourseSelect = (selectId) => {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    const currentVal = sel.value;
    let html = '<option value="" disabled selected>-- Pilih Mata Kuliah --</option>';
    courses.forEach(c => {
      html += `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`;
    });
    sel.innerHTML = html;
    if (currentVal && courses.includes(currentVal)) {
      sel.value = currentVal;
    }
  };

  populateModalCourseSelect('tugasMatkul');
  populateModalCourseSelect('materiMatkul');

  // 4. Fallback jika elemen datalist masih ada
  if (mataKuliahSuggestions) {
    mataKuliahSuggestions.innerHTML = '';
    courses.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      mataKuliahSuggestions.appendChild(opt);
    });
  }
}

window.setMatkulFilter = function(courseName, autoSwitch = true) {
  activeMatkulFilter = courseName;
  if (filterTugasMatkul) filterTugasMatkul.value = courseName;
  if (filterMateriMatkul) filterMateriMatkul.value = courseName;

  // Sinkronisasi Banner Indikator Filter Aktif
  if (courseName === 'ALL') {
    if (tugasFilterBanner) tugasFilterBanner.style.display = 'none';
    if (materiFilterBanner) materiFilterBanner.style.display = 'none';
  } else {
    if (tugasFilterBanner) {
      tugasFilterBanner.style.display = 'flex';
      if (tugasFilterName) tugasFilterName.textContent = courseName;
    }
    if (materiFilterBanner) {
      materiFilterBanner.style.display = 'flex';
      if (materiFilterName) materiFilterName.textContent = courseName;
    }

    // Jika dipanggil dari sidebar dan sedang di Overview atau Matkul, alihkan ke Tugas
    if (autoSwitch) {
      const activeTab = document.querySelector('.tab-pane.active');
      if (activeTab && (activeTab.id === 'tab-overview' || activeTab.id === 'tab-matkul')) {
        switchTab('tab-tugas');
      }
    }
  }

  renderCourseFilters();
  renderTugas();
  renderMateri();
};

// ============================================================================
// 5. RENDERING: TUGAS KULIAH
// ============================================================================
function renderTugas() {
  const matkul = filterTugasMatkul ? filterTugasMatkul.value : 'ALL';
  const status = filterTugasStatus ? filterTugasStatus.value : 'ALL';
  const query = (searchTugasInput.value || globalSearchInput.value).toLowerCase().trim();

  const filtered = tugasList.filter(item => {
    if (!item) return false;
    const itemMatkul = (item.matkul || '').toLowerCase().trim();
    const itemJudul = (item.judul || '').toLowerCase();
    const itemDeskripsi = (item.deskripsi || '').toLowerCase();

    // Pencocokan kebal huruf besar/kecil (case-insensitive) & spasi
    const matchMatkul = matkul === 'ALL' ||
      itemMatkul === matkul.toLowerCase().trim();

    const matchStatus = status === 'ALL' ||
      (status === 'COMPLETED' && item.completed) ||
      (status === 'PENDING' && !item.completed);

    const matchQuery =
      itemJudul.includes(query) ||
      itemMatkul.includes(query) ||
      itemDeskripsi.includes(query);

    return matchMatkul && matchStatus && matchQuery;
  });

  // Urutkan tugas: yang belum selesai & paling dekat deadline di atas
  filtered.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return new Date(a.deadline) - new Date(b.deadline);
  });

  tugasGridContainer.innerHTML = '';

  if (filtered.length === 0) {
    emptyTugasState.style.display = 'block';
  } else {
    emptyTugasState.style.display = 'none';

    filtered.forEach(task => {
      const deadlineInfo = calculateDeadlineInfo(task.deadline);
      const isUrgentH1 = !task.completed && task.deadline && (() => {
        const diffHours = (new Date(task.deadline) - new Date()) / (1000 * 60 * 60);
        return diffHours > 0 && diffHours <= 24;
      })();

      const canEditDelete = canUserEditOrDelete(task);
      const card = document.createElement('div');
      card.className = `task-card ${task.completed ? 'completed' : ''}`;

      card.innerHTML = `
        <div class="task-card-top">
          <div class="task-card-tags">
            <span class="matkul-pill" style="border-left: 3px solid ${getCourseColor(task.matkul || '')};">
              <i data-feather="book"></i>
              ${escapeHtml(task.matkul || '-')}
            </span>
            ${task.isKelas ? `
              <span class="kelas-badge" title="Tugas resmi kelas dipublikasikan oleh pengurus">
                <i data-feather="users"></i>
                <span>Resmi Kelas • ${escapeHtml(task.authorJabatan || 'Pengurus')}</span>
              </span>
            ` : `
              <span class="personal-badge" title="Catatan tugas pribadi Anda">
                <i data-feather="user"></i>
                <span>Pribadi</span>
              </span>
            `}
          </div>
          <span class="task-priority-badge ${(task.prioritas || 'Sedang').toLowerCase()}">
            ${task.prioritas || 'Sedang'}
          </span>
        </div>

        <h3 class="task-title">${escapeHtml(task.judul || 'Tanpa Judul')}</h3>
        <p class="task-desc">${escapeHtml(task.deskripsi || 'Tidak ada catatan tambahan.')}</p>

        <div class="task-deadline-badge ${deadlineInfo.type}">
          <i data-feather="calendar"></i>
          <span>Deadline: ${deadlineInfo.text}</span>
          ${isUrgentH1 ? '<span class="h1-tag-pulse">🔥 H-1 Deadline!</span>' : ''}
        </div>

        ${task.file ? `
          <div class="card-attachment-area">
            <button type="button" class="file-attachment-chip" onclick="handleOpenFile('${task.file.id}', '${escapeHtml(task.file.name)}', '${escapeHtml(task.file.downloadUrl || '')}')" title="Lihat Pratinjau Berkas: ${escapeHtml(task.file.name)}">
              <i data-feather="${getFileIconName(task.file.name, task.file.type)}"></i>
              <span class="chip-filename">${escapeHtml(task.file.name)}</span>
              <span class="chip-filesize">(${formatFileSize(task.file.size)})</span>
              <i data-feather="eye" class="chip-action-icon"></i>
            </button>
            <button type="button" class="btn-download-direct" onclick="downloadAttachment('${task.file.id}', '${escapeHtml(task.file.name)}', '${escapeHtml(task.file.downloadUrl || '')}', event)" title="Unduh Berkas Tugas Langsung">
              <i data-feather="download"></i>
              <span>Unduh</span>
            </button>
          </div>
        ` : ''}

        <div class="task-card-footer">
          <label class="task-status-btn">
            <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTugasComplete('${task.id}')">
            <span>${task.completed ? 'Selesai' : 'Tandai Selesai'}</span>
          </label>

          <div class="card-actions-group">
            <button type="button" class="btn-wa-share" onclick="shareTugasToWA('${task.id}')" title="Kirim Pengingat Tugas ke WhatsApp">
              <i data-feather="share-2"></i>
              <span>Share WA</span>
            </button>

            ${canEditDelete ? `
              <button class="btn-edit-item" onclick="openEditTugasModal('${task.id}')" title="Edit Tugas">
                <i data-feather="edit-2"></i>
              </button>
              <button class="btn-delete-item" onclick="deleteTugas('${task.id}')" title="Hapus Tugas">
                <i data-feather="trash-2"></i>
              </button>
            ` : ''}
          </div>
        </div>
      `;

      tugasGridContainer.appendChild(card);
    });
  }

  feather.replace();
  updateOverview();
}

window.toggleTugasComplete = function(id) {
  const task = tugasList.find(t => t.id === id);
  if (!task) return;

  const newStatus = !task.completed;
  task.completed = newStatus;

  if (task.isKelas) {
    tugasStatusMap[id] = newStatus;
    try {
      localStorage.setItem(TUGAS_STATUS_STORAGE_KEY, JSON.stringify(tugasStatusMap));
    } catch (e) {}
    if (typeof syncTugasStatusToCloud === 'function') {
      syncTugasStatusToCloud(id, newStatus);
    }
  } else {
    const pTask = personalTugas.find(t => t.id === id);
    if (pTask) {
      pTask.completed = newStatus;
      if (typeof syncTugasToCloud === 'function') {
        syncTugasToCloud(pTask);
      }
    }
  }

  saveStorage();
  renderTugas();
  renderOverviewUrgent();
  showToast(newStatus ? 'Tugas ditandai selesai! 🎉' : 'Tugas dikembalikan ke belum selesai', 'success');
};

window.deleteTugas = async function(id) {
  const task = tugasList.find(t => t.id === id);
  if (!task) return;

  if (!canUserEditOrDelete(task)) {
    showToast('Hanya Pengurus Kelas yang dapat menghapus tugas resmi kelas.', 'warning');
    return;
  }

  const confirmMsg = task.isKelas
    ? `Hapus tugas resmi kelas "${task.judul}"? Tugas ini akan terhapus dari akun SELURUH mahasiswa di kelas.`
    : `Hapus tugas "${task.judul}"?`;

  if (confirm(confirmMsg)) {
    if (task.file && task.file.id) {
      await deleteUploadedFile(task.file.id);
      if (task.file.storagePath && typeof deleteFileFromFirebaseStorage === 'function') {
        try { await deleteFileFromFirebaseStorage(task.file.storagePath); } catch (e) {}
      }
    }
    if (task.isKelas) {
      classTugas = classTugas.filter(t => t.id !== id);
      if (typeof deleteKelasTugasFromCloud === 'function') {
        await deleteKelasTugasFromCloud(id);
      }
    } else {
      personalTugas = personalTugas.filter(t => t.id !== id);
      if (typeof deleteTugasFromCloud === 'function') {
        await deleteTugasFromCloud(id);
      }
    }
    rebuildTugasList();
    showToast('Tugas berhasil dihapus 🗑️', 'danger');
  }
};

// ============================================================================
// 6. RENDERING: MATERI KULIAH
// ============================================================================
function renderMateri() {
  const matkul = filterMateriMatkul ? filterMateriMatkul.value : 'ALL';
  const query = (searchMateriInput.value || globalSearchInput.value).toLowerCase().trim();

  const filtered = materiList.filter(item => {
    if (!item) return false;
    const itemMatkul = (item.matkul || '').toLowerCase().trim();
    const itemJudul = (item.judul || '').toLowerCase();
    const itemCatatan = (item.catatan || '').toLowerCase();

    const matchMatkul = matkul === 'ALL' ||
      itemMatkul === matkul.toLowerCase().trim();

    const matchQuery =
      itemJudul.includes(query) ||
      itemMatkul.includes(query) ||
      `pertemuan ${item.pertemuan || ''}`.includes(query) ||
      itemCatatan.includes(query);

    return matchMatkul && matchQuery;
  });

  // Urutkan materi dari pertemuan terbaru atau tanggal terbaru
  filtered.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

  materiGridContainer.innerHTML = '';

  if (filtered.length === 0) {
    emptyMateriState.style.display = 'block';
  } else {
    emptyMateriState.style.display = 'none';

    filtered.forEach(m => {
      const canEditDelete = canUserEditOrDelete(m);
      const card = document.createElement('div');
      card.className = 'materi-card';

      card.innerHTML = `
        <div class="materi-card-header">
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <span class="pertemuan-pill">
              <i data-feather="bookmark"></i>
              Pertemuan ${m.pertemuan}
            </span>
            ${m.isKelas ? `
              <span class="kelas-badge" title="Materi resmi perkuliahan dari pengurus kelas">
                <i data-feather="users"></i>
                <span>Materi Kelas • ${escapeHtml(m.authorJabatan || 'Pengurus')}</span>
              </span>
            ` : `
              <span class="personal-badge" title="Catatan materi pribadi Anda">
                <i data-feather="user"></i>
                <span>Pribadi</span>
              </span>
            `}
          </div>
          <span class="materi-date">
            <i data-feather="calendar"></i>
            ${formatIndoDate(m.tanggal)}
          </span>
        </div>

        <h3 class="materi-title">${escapeHtml(m.judul || 'Tanpa Judul')}</h3>
        <span class="materi-matkul-tag" style="color: ${getCourseColor(m.matkul || '')};">📚 ${escapeHtml(m.matkul || '-')}</span>

        <div class="materi-summary-box">
          ${escapeHtml(m.catatan || 'Belum ada catatan materi.')}
        </div>

        <div class="materi-card-footer">
          <div class="card-attachment-area">
            ${m.file ? `
              <button type="button" class="file-attachment-chip" onclick="handleOpenFile('${m.file.id}', '${escapeHtml(m.file.name)}', '${escapeHtml(m.file.downloadUrl || '')}')" title="Lihat Pratinjau Berkas: ${escapeHtml(m.file.name)}">
                <i data-feather="${getFileIconName(m.file.name, m.file.type)}"></i>
                <span class="chip-filename">${escapeHtml(m.file.name)}</span>
                <span class="chip-filesize">(${formatFileSize(m.file.size)})</span>
                <i data-feather="eye" class="chip-action-icon"></i>
              </button>
              <button type="button" class="btn-download-direct" onclick="downloadAttachment('${m.file.id}', '${escapeHtml(m.file.name)}', '${escapeHtml(m.file.downloadUrl || '')}', event)" title="Unduh Berkas Materi Langsung">
                <i data-feather="download"></i>
                <span>Unduh</span>
              </button>
            ` : ''}

            ${m.link ? `
              <a href="${escapeHtml(m.link)}" target="_blank" rel="noopener noreferrer" class="materi-link-btn" title="Buka Tautan Eksternal">
                <i data-feather="external-link"></i>
                <span>Tautan Drive / Web</span>
              </a>
            ` : (!m.file ? `<span class="no-attachment-text">Tanpa lampiran berkas</span>` : '')}
          </div>

          ${canEditDelete ? `
            <div class="card-actions-group">
              <button class="btn-edit-item" onclick="openEditMateriModal('${m.id}')" title="Edit Materi">
                <i data-feather="edit-2"></i>
              </button>
              <button class="btn-delete-item" onclick="deleteMateri('${m.id}')" title="Hapus Catatan">
                <i data-feather="trash-2"></i>
              </button>
            </div>
          ` : ''}
        </div>
      `;

      materiGridContainer.appendChild(card);
    });
  }

  feather.replace();
  updateOverview();
}

window.deleteMateri = async function(id) {
  const materi = materiList.find(m => m.id === id);
  if (!materi) return;

  if (!canUserEditOrDelete(materi)) {
    showToast('Hanya Pengurus Kelas yang dapat menghapus materi resmi kelas.', 'warning');
    return;
  }

  const confirmMsg = materi.isKelas
    ? `Hapus materi resmi kelas "${materi.judul}"? Materi ini akan terhapus dari akun SELURUH mahasiswa.`
    : `Hapus materi "${materi.judul}"?`;

  if (confirm(confirmMsg)) {
    if (materi && materi.file && materi.file.id) {
      await deleteUploadedFile(materi.file.id);
      if (materi.file.storagePath && typeof deleteFileFromFirebaseStorage === 'function') {
        try { await deleteFileFromFirebaseStorage(materi.file.storagePath); } catch (e) {}
      }
    }
    if (materi.isKelas) {
      classMateri = classMateri.filter(item => item.id !== id);
      if (typeof deleteKelasMateriFromCloud === 'function') {
        await deleteKelasMateriFromCloud(id);
      }
    } else {
      personalMateri = personalMateri.filter(item => item.id !== id);
      if (typeof deleteMateriFromCloud === 'function') {
        await deleteMateriFromCloud(id);
      }
    }
    rebuildMateriList();
    showToast('Materi berhasil dihapus 🗑️', 'danger');
  }
};

// ============================================================================
// 7. RENDERING: OVERVIEW & DEADLINE TERDEKAT
// ============================================================================
function updateOverview() {
  const pending = tugasList.filter(t => !t.completed);
  const done = tugasList.filter(t => t.completed);

  overviewPendingTugas.textContent = pending.length;
  overviewDoneTugas.textContent = done.length;
  overviewTotalMateri.textContent = materiList.length;

  badgePendingTugas.textContent = pending.length;
  badgeTotalMateri.textContent = materiList.length;

  const courses = getAllMataKuliahList();
  overviewCoursesCount.textContent = `dari ${courses.length} mata kuliah`;

  // Hitung tugas mendesak (<= 3 hari)
  let urgentCount = 0;
  pending.forEach(t => {
    const info = calculateDeadlineInfo(t.deadline);
    if (info.isUrgent) urgentCount++;
  });
  urgentTugasCount.textContent = `${urgentCount} tugas mendesak`;

  renderOverviewUrgent();
  renderOverviewRecentMaterials();
}

function renderOverviewUrgent() {
  const pending = tugasList.filter(t => !t.completed);
  pending.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

  const topUrgent = pending.slice(0, 3);
  urgentTasksContainer.innerHTML = '';

  if (topUrgent.length === 0) {
    urgentTasksContainer.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 24px; text-align: center; color: var(--text-muted); font-size: 0.9rem;">
        🎉 Hebat! Tidak ada tugas mendesak saat ini. Semua tugas sudah selesai.
      </div>
    `;
    return;
  }

  topUrgent.forEach(task => {
    if (!task) return;
    const deadlineInfo = calculateDeadlineInfo(task.deadline);
    const prioritas = task.prioritas || 'Sedang';
    const canEditDelete = canUserEditOrDelete(task);
    const card = document.createElement('div');
    card.className = 'task-card';

    card.innerHTML = `
      <div class="task-card-top">
        <span class="matkul-pill" style="border-left: 3px solid ${getCourseColor(task.matkul || '')};">
          <i data-feather="book"></i>
          ${escapeHtml(task.matkul || '-')}
        </span>
        <span class="task-priority-badge ${prioritas.toLowerCase()}">${prioritas}</span>
      </div>

      <h3 class="task-title">${escapeHtml(task.judul || 'Tanpa Judul')}</h3>

      <div class="task-deadline-badge ${deadlineInfo.type}">
        <i data-feather="clock"></i>
        <span>Deadline: ${deadlineInfo.text}</span>
      </div>

      ${task.file ? `
        <div class="card-attachment-area" style="margin: 8px 0;">
          <button type="button" class="file-attachment-chip" onclick="handleOpenFile('${task.file.id}', '${escapeHtml(task.file.name)}', '${escapeHtml(task.file.downloadUrl || '')}')" title="Lihat Pratinjau Berkas: ${escapeHtml(task.file.name)}">
            <i data-feather="${getFileIconName(task.file.name, task.file.type)}"></i>
            <span class="chip-filename">${escapeHtml(task.file.name)}</span>
            <span class="chip-filesize">(${formatFileSize(task.file.size)})</span>
            <i data-feather="eye" class="chip-action-icon"></i>
          </button>
          <button type="button" class="btn-download-direct" onclick="downloadAttachment('${task.file.id}', '${escapeHtml(task.file.name)}', '${escapeHtml(task.file.downloadUrl || '')}', event)" title="Unduh Berkas Tugas Langsung">
            <i data-feather="download"></i>
            <span>Unduh</span>
          </button>
        </div>
      ` : ''}

      <div class="task-card-footer">
        <label class="task-status-btn">
          <input type="checkbox" onchange="toggleTugasComplete('${task.id}')">
          <span>Selesaikan Sekarang</span>
        </label>

        <div class="card-actions-group">
          <button type="button" class="btn-wa-share" onclick="shareTugasToWA('${task.id}')" title="Kirim Pengingat Tugas ke WhatsApp">
            <i data-feather="share-2"></i>
            <span>Share WA</span>
          </button>
          ${canEditDelete ? `
            <button class="btn-edit-item" onclick="openEditTugasModal('${task.id}')" title="Edit Tugas">
              <i data-feather="edit-2"></i>
            </button>
            <button class="btn-delete-item" onclick="deleteTugas('${task.id}')" title="Hapus Tugas">
              <i data-feather="trash-2"></i>
            </button>
          ` : ''}
        </div>
      </div>
    `;

    urgentTasksContainer.appendChild(card);
  });

  feather.replace();
}

function renderOverviewRecentMaterials() {
  const sorted = [...materiList].sort((a, b) => new Date(b.tanggal || 0) - new Date(a.tanggal || 0));
  const recent = sorted.slice(0, 3);
  recentMaterialsContainer.innerHTML = '';

  if (recent.length === 0) {
    recentMaterialsContainer.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 24px; text-align: center; color: var(--text-muted); font-size: 0.9rem;">
        Belum ada materi pembelajaran yang disimpan.
      </div>
    `;
    return;
  }

  recent.forEach(m => {
    if (!m) return;
    const canEditDelete = canUserEditOrDelete(m);
    const card = document.createElement('div');
    card.className = 'materi-card';

    card.innerHTML = `
      <div class="materi-card-header">
        <span class="pertemuan-pill">Pertemuan ${m.pertemuan || 1}</span>
        <span class="materi-date">${formatIndoDate(m.tanggal)}</span>
      </div>
      <h3 class="materi-title">${escapeHtml(m.judul || 'Tanpa Judul')}</h3>
      <span class="materi-matkul-tag" style="color: ${getCourseColor(m.matkul || '')};">📚 ${escapeHtml(m.matkul || '-')}</span>

      <div class="materi-card-footer" style="border-top: none; padding-top: 6px;">
        <div class="card-attachment-area">
          ${m.file ? `
            <button type="button" class="file-attachment-chip" onclick="handleOpenFile('${m.file.id}', '${escapeHtml(m.file.name)}', '${escapeHtml(m.file.downloadUrl || '')}')" title="Lihat Pratinjau Berkas: ${escapeHtml(m.file.name)}">
              <i data-feather="${getFileIconName(m.file.name, m.file.type)}"></i>
              <span class="chip-filename">${escapeHtml(m.file.name)}</span>
              <span class="chip-filesize">(${formatFileSize(m.file.size)})</span>
              <i data-feather="eye" class="chip-action-icon"></i>
            </button>
            <button type="button" class="btn-download-direct" onclick="downloadAttachment('${m.file.id}', '${escapeHtml(m.file.name)}', '${escapeHtml(m.file.downloadUrl || '')}', event)" title="Unduh Berkas Materi Langsung">
              <i data-feather="download"></i>
              <span>Unduh</span>
            </button>
          ` : ''}

          ${m.link ? `
            <a href="${escapeHtml(m.link)}" target="_blank" rel="noopener noreferrer" class="materi-link-btn" title="Buka Tautan Eksternal">
              <i data-feather="external-link"></i>
              <span>Tautan Web</span>
            </a>
          ` : (!m.file ? `<span class="no-attachment-text">Tanpa lampiran berkas</span>` : '')}
        </div>

        ${canEditDelete ? `
          <div class="card-actions-group">
            <button class="btn-edit-item" onclick="openEditMateriModal('${m.id}')" title="Edit Materi">
              <i data-feather="edit-2"></i>
            </button>
            <button class="btn-delete-item" onclick="deleteMateri('${m.id}')" title="Hapus Materi">
              <i data-feather="trash-2"></i>
            </button>
          </div>
        ` : ''}
      </div>
    `;

    recentMaterialsContainer.appendChild(card);
  });

  feather.replace();
}

// ============================================================================
// 8. MODAL HANDLERS (TAMBAH & EDIT)
// ============================================================================

// TUGAS MODAL
function openAddTugasModal() {
  tugasForm.reset();
  if (editTugasId) editTugasId.value = '';
  if (tugasModalTitle) tugasModalTitle.textContent = 'Tambah Tugas Kuliah';
  if (btnSubmitTugas) btnSubmitTugas.textContent = 'Simpan Tugas';

  // Sembunyikan tombol hapus saat tambah tugas baru
  const btnModalDeleteTugas = document.getElementById('btnModalDeleteTugas');
  if (btnModalDeleteTugas) {
    btnModalDeleteTugas.style.display = 'none';
    btnModalDeleteTugas.onclick = null;
  }

  // Toggle Opsi Publikasi Resmi Kelas (khusus pengurus / admin)
  const tugasIsKelasGroup = document.getElementById('tugasIsKelasGroup');
  const tugasIsKelasCheckbox = document.getElementById('tugasIsKelasCheckbox');
  if (tugasIsKelasGroup && tugasIsKelasCheckbox) {
    if (isCurrentUserAdmin) {
      tugasIsKelasGroup.style.display = 'block';
      tugasIsKelasCheckbox.checked = true; // Default aktif untuk pengurus kelas
    } else {
      tugasIsKelasGroup.style.display = 'none';
      tugasIsKelasCheckbox.checked = false;
    }
  }

  // Reset staged file & uploader
  stagedTugasFile = null;
  if (tugasFileInput) tugasFileInput.value = '';
  tugasUploader.renderPreviewUI(null);

  // Pastikan daftar pilihan mata kuliah selalu terupdate dari page mata kuliah
  renderCourseFilters();

  // Jika sedang filter mata kuliah tertentu, isi otomatis
  const formTugasMatkul = document.getElementById('tugasMatkul');
  if (formTugasMatkul) {
    if (activeMatkulFilter !== 'ALL') {
      formTugasMatkul.value = activeMatkulFilter;
    } else {
      formTugasMatkul.value = '';
    }
  }

  // Set default deadline besok jam 23:59
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);
  document.getElementById('tugasDeadlineDate').value = tomorrow.toISOString().split('T')[0];
  document.getElementById('tugasDeadlineTime').value = '23:59';
  tugasModal.showModal();
}

function openEditTugasModal(id) {
  const task = tugasList.find(t => t.id === id);
  if (!task) return;

  const canEditDelete = canUserEditOrDelete(task);
  if (!canEditDelete) {
    showToast('Hanya Pengurus Kelas yang dapat mengedit atau menghapus tugas resmi kelas.', 'warning');
    return;
  }

  if (editTugasId) editTugasId.value = task.id;
  if (tugasModalTitle) tugasModalTitle.textContent = 'Edit Tugas Kuliah';
  if (btnSubmitTugas) btnSubmitTugas.textContent = 'Perbarui Tugas';

  // Tombol Hapus Tugas di Modal
  const btnModalDeleteTugas = document.getElementById('btnModalDeleteTugas');
  if (btnModalDeleteTugas) {
    btnModalDeleteTugas.style.display = canEditDelete ? 'inline-flex' : 'none';
    btnModalDeleteTugas.onclick = () => {
      closeTugasModal();
      deleteTugas(task.id);
    };
  }

  // Opsi Publikasi Resmi Kelas
  const tugasIsKelasGroup = document.getElementById('tugasIsKelasGroup');
  const tugasIsKelasCheckbox = document.getElementById('tugasIsKelasCheckbox');
  if (tugasIsKelasGroup && tugasIsKelasCheckbox) {
    if (isCurrentUserAdmin) {
      tugasIsKelasGroup.style.display = 'block';
      tugasIsKelasCheckbox.checked = !!task.isKelas;
    } else {
      tugasIsKelasGroup.style.display = 'none';
      tugasIsKelasCheckbox.checked = false;
    }
  }

  // Pastikan daftar pilihan mata kuliah selalu terupdate dari page mata kuliah
  renderCourseFilters();

  document.getElementById('tugasJudul').value = task.judul;

  const formTugasMatkul = document.getElementById('tugasMatkul');
  if (formTugasMatkul) {
    if (task.matkul && !Array.from(formTugasMatkul.options).some(o => o.value === task.matkul)) {
      const opt = document.createElement('option');
      opt.value = task.matkul;
      opt.textContent = task.matkul;
      formTugasMatkul.appendChild(opt);
    }
    formTugasMatkul.value = task.matkul || '';
  }

  document.getElementById('tugasPrioritas').value = task.prioritas;

  if (task.deadline) {
    const parts = task.deadline.split('T');
    document.getElementById('tugasDeadlineDate').value = parts[0] || '';
    document.getElementById('tugasDeadlineTime').value = parts[1] || '23:59';
  }
  document.getElementById('tugasDeskripsi').value = task.deskripsi || '';

  // Muat berkas lampiran jika sudah ada
  if (task.file) {
    stagedTugasFile = { ...task.file, isExisting: true };
    tugasUploader.renderPreviewUI(stagedTugasFile);
  } else {
    stagedTugasFile = null;
    if (tugasFileInput) tugasFileInput.value = '';
    tugasUploader.renderPreviewUI(null);
  }

  tugasModal.showModal();
}

function closeTugasModal() {
  tugasModal.close();
}

window.openAddTugasModal = openAddTugasModal;
window.openEditTugasModal = openEditTugasModal;
window.closeTugasModal = closeTugasModal;

// MATERI MODAL
function openAddMateriModal() {
  materiForm.reset();
  if (editMateriId) editMateriId.value = '';
  if (materiModalTitle) materiModalTitle.textContent = 'Tambah Materi Kuliah';
  if (btnSubmitMateri) btnSubmitMateri.textContent = 'Simpan Materi';

  // Sembunyikan tombol hapus saat tambah materi baru
  const btnModalDeleteMateri = document.getElementById('btnModalDeleteMateri');
  if (btnModalDeleteMateri) {
    btnModalDeleteMateri.style.display = 'none';
    btnModalDeleteMateri.onclick = null;
  }

  // Toggle Opsi Publikasi Resmi Kelas (khusus pengurus / admin)
  const materiIsKelasGroup = document.getElementById('materiIsKelasGroup');
  const materiIsKelasCheckbox = document.getElementById('materiIsKelasCheckbox');
  if (materiIsKelasGroup && materiIsKelasCheckbox) {
    if (isCurrentUserAdmin) {
      materiIsKelasGroup.style.display = 'block';
      materiIsKelasCheckbox.checked = true; // Default aktif untuk pengurus kelas
    } else {
      materiIsKelasGroup.style.display = 'none';
      materiIsKelasCheckbox.checked = false;
    }
  }

  // Reset staged file & toggle
  stagedMateriFile = null;
  if (materiFileInput) materiFileInput.value = '';
  materiUploader.renderPreviewUI(null);
  if (materiLinkToggle) materiLinkToggle.open = false;

  // Pastikan daftar pilihan mata kuliah selalu terupdate dari page mata kuliah
  renderCourseFilters();

  const formMateriMatkul = document.getElementById('materiMatkul');
  if (formMateriMatkul) {
    if (activeMatkulFilter !== 'ALL') {
      formMateriMatkul.value = activeMatkulFilter;
    } else {
      formMateriMatkul.value = '';
    }
  }

  const today = new Date().toISOString().split('T')[0];
  document.getElementById('materiTanggal').value = today;
  materiModal.showModal();
  materiForm.scrollTop = 0;
}

function openEditMateriModal(id) {
  const m = materiList.find(item => item.id === id);
  if (!m) return;

  const canEditDelete = canUserEditOrDelete(m);
  if (!canEditDelete) {
    showToast('Hanya Pengurus Kelas yang dapat mengedit atau menghapus materi resmi kelas.', 'warning');
    return;
  }

  if (editMateriId) editMateriId.value = m.id;
  if (materiModalTitle) materiModalTitle.textContent = 'Edit Materi Kuliah';
  if (btnSubmitMateri) btnSubmitMateri.textContent = 'Perbarui Materi';

  // Tombol Hapus Materi di Modal
  const btnModalDeleteMateri = document.getElementById('btnModalDeleteMateri');
  if (btnModalDeleteMateri) {
    btnModalDeleteMateri.style.display = canEditDelete ? 'inline-flex' : 'none';
    btnModalDeleteMateri.onclick = () => {
      closeMateriModal();
      deleteMateri(m.id);
    };
  }

  // Opsi Publikasi Resmi Kelas
  const materiIsKelasGroup = document.getElementById('materiIsKelasGroup');
  const materiIsKelasCheckbox = document.getElementById('materiIsKelasCheckbox');
  if (materiIsKelasGroup && materiIsKelasCheckbox) {
    if (isCurrentUserAdmin) {
      materiIsKelasGroup.style.display = 'block';
      materiIsKelasCheckbox.checked = !!m.isKelas;
    } else {
      materiIsKelasGroup.style.display = 'none';
      materiIsKelasCheckbox.checked = false;
    }
  }

  // Pastikan daftar pilihan mata kuliah selalu terupdate dari page mata kuliah
  renderCourseFilters();

  document.getElementById('materiJudul').value = m.judul;

  const formMateriMatkul = document.getElementById('materiMatkul');
  if (formMateriMatkul) {
    if (m.matkul && !Array.from(formMateriMatkul.options).some(o => o.value === m.matkul)) {
      const opt = document.createElement('option');
      opt.value = m.matkul;
      opt.textContent = m.matkul;
      formMateriMatkul.appendChild(opt);
    }
    formMateriMatkul.value = m.matkul || '';
  }
  document.getElementById('materiPertemuan').value = m.pertemuan;
  document.getElementById('materiTanggal').value = m.tanggal;
  document.getElementById('materiLink').value = m.link || '';
  document.getElementById('materiCatatan').value = m.catatan || '';

  // Muat berkas lampiran jika sudah ada
  if (m.file) {
    stagedMateriFile = { ...m.file, isExisting: true };
    materiUploader.renderPreviewUI(stagedMateriFile);
  } else {
    stagedMateriFile = null;
    if (materiFileInput) materiFileInput.value = '';
    materiUploader.renderPreviewUI(null);
  }

  // Buka toggle link eksternal jika sudah ada link sebelumnya
  if (m.link && materiLinkToggle) {
    materiLinkToggle.open = true;
  } else if (materiLinkToggle) {
    materiLinkToggle.open = false;
  }

  materiModal.showModal();
}

function closeMateriModal() {
  materiModal.close();
}

window.openAddMateriModal = openAddMateriModal;
window.openEditMateriModal = openEditMateriModal;
window.closeMateriModal = closeMateriModal;

// MATA KULIAH MODAL
function openAddMatkulModal() {
  matkulForm.reset();
  if (editMatkulId) editMatkulId.value = '';
  if (matkulModalTitle) matkulModalTitle.textContent = 'Tambah Mata Kuliah Baru';
  if (btnSubmitMatkul) btnSubmitMatkul.textContent = 'Simpan Mata Kuliah';
  matkulModal.showModal();
}

function openEditMatkulModal(id) {
  const course = matkulList.find(c => c.id === id);
  if (!course) return;

  if (editMatkulId) editMatkulId.value = course.id;
  if (matkulModalTitle) matkulModalTitle.textContent = 'Edit Mata Kuliah';
  if (btnSubmitMatkul) btnSubmitMatkul.textContent = 'Perbarui Mata Kuliah';

  document.getElementById('matkulNama').value = course.nama;
  document.getElementById('matkulKode').value = course.kode || '';
  document.getElementById('matkulSks').value = course.sks || 3;
  document.getElementById('matkulDosen').value = course.dosen || '';
  document.getElementById('matkulJadwal').value = course.jadwal || '';
  document.getElementById('matkulRuangan').value = course.ruangan || '';

  const colorRadio = document.querySelector(`input[name="matkulWarna"][value="${course.warna}"]`);
  if (colorRadio) colorRadio.checked = true;

  matkulModal.showModal();
}

function closeMatkulModal() {
  matkulModal.close();
}

window.openAddMatkulModal = openAddMatkulModal;
window.openEditMatkulModal = openEditMatkulModal;
window.closeMatkulModal = closeMatkulModal;

btnOpenModalTugas.addEventListener('click', openAddTugasModal);
btnOpenModalMateri.addEventListener('click', openAddMateriModal);
if (btnOpenModalMatkul) {
  btnOpenModalMatkul.addEventListener('click', openAddMatkulModal);
}

// Close on backdrop click
[tugasModal, materiModal, matkulModal].forEach(modal => {
  if (!modal) return;
  modal.addEventListener('click', (e) => {
    const rect = modal.getBoundingClientRect();
    const isInside =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;
    if (!isInside) modal.close();
  });
});

// SUBMIT TUGAS (ADD & EDIT)
tugasForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  let judul = document.getElementById('tugasJudul').value.trim();
  const matkul = document.getElementById('tugasMatkul').value.trim();
  const prioritas = document.getElementById('tugasPrioritas').value || 'Sedang';
  const date = document.getElementById('tugasDeadlineDate').value;
  const time = document.getElementById('tugasDeadlineTime').value || '23:59';
  const deskripsi = document.getElementById('tugasDeskripsi').value.trim();
  const editId = editTugasId ? editTugasId.value : '';

  const isKelasCheckbox = document.getElementById('tugasIsKelasCheckbox');
  const willBeKelas = isCurrentUserAdmin && isKelasCheckbox ? isKelasCheckbox.checked : false;

  if (!matkul) {
    showToast('Mohon pilih Mata Kuliah!', 'danger');
    document.getElementById('tugasMatkul').focus();
    return;
  }

  if (!judul) {
    if (stagedTugasFile && stagedTugasFile.name) {
      judul = stagedTugasFile.name.replace(/\.[^/.]+$/, "");
    } else {
      judul = `Tugas - ${matkul}`;
    }
  }

  if (!date) {
    showToast('Mohon tentukan tanggal deadline!', 'danger');
    document.getElementById('tugasDeadlineDate').focus();
    return;
  }

  const submitBtn = btnSubmitTugas || tugasForm.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn ? submitBtn.textContent : 'Simpan Tugas';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Menyimpan... ⏳';
  }

  try {
    // Simpan berkas lampiran jika ada
    let fileMeta = null;
    if (stagedTugasFile) {
      if (stagedTugasFile.isNew) {
        await saveUploadedFile(stagedTugasFile);

        // Jika Firebase aktif, unggah juga ke Firebase Cloud Storage
        let cloudFile = null;
        if (typeof uploadFileToFirebaseStorage === 'function') {
          cloudFile = await uploadFileToFirebaseStorage(stagedTugasFile.data, stagedTugasFile.name, stagedTugasFile.id);
        }

        // Simpan data base64 jika ukurannya aman (< 750KB) agar bisa dibuka di semua perangkat (HP, laptop, teman sekelas)
        const canEmbed = stagedTugasFile.data && stagedTugasFile.data.length < 800000;
        fileMeta = {
          id: stagedTugasFile.id,
          name: stagedTugasFile.name,
          size: stagedTugasFile.size,
          type: stagedTugasFile.type,
          downloadUrl: cloudFile ? cloudFile.downloadUrl : '',
          storagePath: cloudFile ? cloudFile.path : '',
          data: canEmbed ? stagedTugasFile.data : ''
        };
      } else if (stagedTugasFile.isExisting) {
        fileMeta = {
          id: stagedTugasFile.id,
          name: stagedTugasFile.name,
          size: stagedTugasFile.size,
          type: stagedTugasFile.type,
          downloadUrl: stagedTugasFile.downloadUrl || '',
          storagePath: stagedTugasFile.storagePath || '',
          data: stagedTugasFile.data || ''
        };
      }
    }

    let savedTask = null;
    if (editId) {
      // Mode Edit
      const classIdx = classTugas.findIndex(t => t.id === editId);
      const personalIdx = personalTugas.findIndex(t => t.id === editId);
      const wasKelas = classIdx !== -1;
      const oldTask = wasKelas ? classTugas[classIdx] : (personalIdx !== -1 ? personalTugas[personalIdx] : null);

      if (oldTask) {
        // Jika berkas lama diganti atau dihapus
        if (oldTask.file && (!fileMeta || fileMeta.id !== oldTask.file.id)) {
          await deleteUploadedFile(oldTask.file.id);
          if (oldTask.file.storagePath && typeof deleteFileFromFirebaseStorage === 'function') {
            await deleteFileFromFirebaseStorage(oldTask.file.storagePath);
          }
        }

        savedTask = {
          ...oldTask,
          judul,
          matkul,
          deadline: `${date}T${time}`,
          prioritas,
          deskripsi,
          file: fileMeta,
          isKelas: willBeKelas,
          updatedAt: new Date().toISOString()
        };

        if (willBeKelas) {
          if (!savedTask.authorJabatan && currentUserProfile) {
            savedTask.authorJabatan = currentUserProfile.role || 'Pengurus';
            savedTask.authorNama = currentUserProfile.nama || 'Pengurus';
          }
          if (wasKelas) {
            classTugas[classIdx] = savedTask;
          } else {
            if (personalIdx !== -1) personalTugas.splice(personalIdx, 1);
            if (typeof deleteTugasFromCloud === 'function') deleteTugasFromCloud(editId);
            classTugas.unshift(savedTask);
          }
          if (typeof syncKelasTugasToCloud === 'function') {
            syncKelasTugasToCloud(savedTask);
          }
        } else {
          if (wasKelas) {
            classTugas.splice(classIdx, 1);
            if (typeof deleteKelasTugasFromCloud === 'function') deleteKelasTugasFromCloud(editId);
            personalTugas.unshift(savedTask);
          } else {
            personalTugas[personalIdx] = savedTask;
          }
          if (typeof syncTugasToCloud === 'function') {
            syncTugasToCloud(savedTask);
          }
        }
        showToast('Tugas berhasil diperbarui! ✏️', 'success');
      }
    } else {
      // Mode Tambah Baru
      const newId = 'tgs-' + Date.now();
      savedTask = {
        id: newId,
        judul,
        matkul,
        deadline: `${date}T${time}`,
        prioritas,
        deskripsi,
        file: fileMeta,
        completed: false,
        isKelas: willBeKelas,
        createdAt: new Date().toISOString()
      };

      if (willBeKelas) {
        savedTask.authorJabatan = currentUserProfile ? (currentUserProfile.role || 'Pengurus') : 'Pengurus';
        savedTask.authorNama = currentUserProfile ? (currentUserProfile.nama || 'Pengurus') : 'Pengurus';
        classTugas.unshift(savedTask);
        if (typeof syncKelasTugasToCloud === 'function') {
          syncKelasTugasToCloud(savedTask);
        }
        if (typeof markClassTugasSeen === 'function') {
          markClassTugasSeen(savedTask.id);
        }
        addNotification({
          type: 'tugas',
          title: `Tugas Baru: ${savedTask.matkul} 📢`,
          message: `${savedTask.judul} (Deadline: ${formatIndoDate(savedTask.deadline)})`,
          time: new Date().toISOString(),
          taskId: savedTask.id
        });
        showToast('Tugas resmi kelas berhasil dipublikasikan untuk seluruh kelas! 📢', 'success');
      } else {
        personalTugas.unshift(savedTask);
        if (typeof syncTugasToCloud === 'function') {
          syncTugasToCloud(savedTask);
        }
        showToast('Tugas pribadi berhasil disimpan! 📋', 'success');
      }
    }

    saveStorage();
    rebuildTugasList();
    tugasModal.close();
  } catch (err) {
    console.error('Gagal menyimpan tugas:', err);
    showToast('Terjadi kesalahan: ' + err.message, 'danger');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  }
});

// SUBMIT MATERI (ADD & EDIT)
materiForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  let judul = document.getElementById('materiJudul').value.trim();
  const matkul = document.getElementById('materiMatkul').value.trim();
  const pertemuan = Number(document.getElementById('materiPertemuan').value) || 1;
  const tanggal = document.getElementById('materiTanggal').value || new Date().toISOString().split('T')[0];
  const link = document.getElementById('materiLink').value.trim();
  const catatan = document.getElementById('materiCatatan').value.trim();
  const editId = editMateriId ? editMateriId.value : '';

  const isKelasCheckbox = document.getElementById('materiIsKelasCheckbox');
  const willBeKelas = isCurrentUserAdmin && isKelasCheckbox ? isKelasCheckbox.checked : false;

  if (!matkul) {
    showToast('Mohon pilih Mata Kuliah!', 'danger');
    document.getElementById('materiMatkul').focus();
    return;
  }

  // Jika judul kosong, otomatis buat judul dari nama file atau pertemuan
  if (!judul) {
    if (stagedMateriFile && stagedMateriFile.name) {
      judul = stagedMateriFile.name.replace(/\.[^/.]+$/, "");
    } else {
      judul = `Materi Pertemuan ${pertemuan}${matkul ? ' - ' + matkul : ''}`;
    }
  }

  const submitBtn = btnSubmitMateri || materiForm.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn ? submitBtn.textContent : 'Simpan Materi';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Menyimpan... ⏳';
  }

  try {
    // Simpan berkas materi jika ada
    let fileMeta = null;
    if (stagedMateriFile) {
      if (stagedMateriFile.isNew) {
        await saveUploadedFile(stagedMateriFile);

        let cloudFile = null;
        if (typeof uploadFileToFirebaseStorage === 'function') {
          cloudFile = await uploadFileToFirebaseStorage(stagedMateriFile.data, stagedMateriFile.name, stagedMateriFile.id);
        }

        // Simpan data base64 jika ukurannya aman (< 750KB) agar bisa dibuka di semua perangkat (HP, laptop, teman sekelas)
        const canEmbed = stagedMateriFile.data && stagedMateriFile.data.length < 800000;
        fileMeta = {
          id: stagedMateriFile.id,
          name: stagedMateriFile.name,
          size: stagedMateriFile.size,
          type: stagedMateriFile.type,
          downloadUrl: cloudFile ? cloudFile.downloadUrl : '',
          storagePath: cloudFile ? cloudFile.path : '',
          data: canEmbed ? stagedMateriFile.data : ''
        };
      } else if (stagedMateriFile.isExisting) {
        fileMeta = {
          id: stagedMateriFile.id,
          name: stagedMateriFile.name,
          size: stagedMateriFile.size,
          type: stagedMateriFile.type,
          downloadUrl: stagedMateriFile.downloadUrl || '',
          storagePath: stagedMateriFile.storagePath || '',
          data: stagedMateriFile.data || ''
        };
      }
    }

    let savedMateri = null;
    if (editId) {
      // Mode Edit
      const classIdx = classMateri.findIndex(m => m.id === editId);
      const personalIdx = personalMateri.findIndex(m => m.id === editId);
      const wasKelas = classIdx !== -1;
      const oldMateri = wasKelas ? classMateri[classIdx] : (personalIdx !== -1 ? personalMateri[personalIdx] : null);

      if (oldMateri) {
        if (oldMateri.file && (!fileMeta || fileMeta.id !== oldMateri.file.id)) {
          await deleteUploadedFile(oldMateri.file.id);
          if (oldMateri.file.storagePath && typeof deleteFileFromFirebaseStorage === 'function') {
            await deleteFileFromFirebaseStorage(oldMateri.file.storagePath);
          }
        }

        savedMateri = {
          ...oldMateri,
          judul,
          matkul,
          pertemuan,
          tanggal,
          link,
          file: fileMeta,
          catatan,
          isKelas: willBeKelas,
          updatedAt: new Date().toISOString()
        };

        if (willBeKelas) {
          if (!savedMateri.authorJabatan && currentUserProfile) {
            savedMateri.authorJabatan = currentUserProfile.role || 'Pengurus';
            savedMateri.authorNama = currentUserProfile.nama || 'Pengurus';
          }
          if (wasKelas) {
            classMateri[classIdx] = savedMateri;
          } else {
            if (personalIdx !== -1) personalMateri.splice(personalIdx, 1);
            if (typeof deleteMateriFromCloud === 'function') deleteMateriFromCloud(editId);
            classMateri.unshift(savedMateri);
          }
          if (typeof syncKelasMateriToCloud === 'function') {
            syncKelasMateriToCloud(savedMateri);
          }
        } else {
          if (wasKelas) {
            classMateri.splice(classIdx, 1);
            if (typeof deleteKelasMateriFromCloud === 'function') deleteKelasMateriFromCloud(editId);
            personalMateri.unshift(savedMateri);
          } else {
            personalMateri[personalIdx] = savedMateri;
          }
          if (typeof syncMateriToCloud === 'function') {
            syncMateriToCloud(savedMateri);
          }
        }
        showToast(`Materi pertemuan ${pertemuan} diperbarui! ✏️`, 'success');
      }
    } else {
      // Mode Tambah Baru
      const newId = 'mat-' + Date.now();
      savedMateri = {
        id: newId,
        judul,
        matkul,
        pertemuan,
        tanggal,
        link,
        file: fileMeta,
        catatan,
        isKelas: willBeKelas,
        createdAt: new Date().toISOString()
      };

      if (willBeKelas) {
        savedMateri.authorJabatan = currentUserProfile ? (currentUserProfile.role || 'Pengurus') : 'Pengurus';
        savedMateri.authorNama = currentUserProfile ? (currentUserProfile.nama || 'Pengurus') : 'Pengurus';
        classMateri.unshift(savedMateri);
        if (typeof syncKelasMateriToCloud === 'function') {
          syncKelasMateriToCloud(savedMateri);
        }
        if (typeof markClassMateriSeen === 'function') {
          markClassMateriSeen(savedMateri.id);
        }
        addNotification({
          type: 'materi',
          title: `Materi Baru: ${savedMateri.matkul} 📚`,
          message: `Pertemuan ${savedMateri.pertemuan}: ${savedMateri.judul}`,
          time: new Date().toISOString(),
          taskId: savedMateri.id
        });
        showToast(`Materi resmi pertemuan ${pertemuan} berhasil dibagikan ke seluruh kelas! 📚`, 'success');
      } else {
        personalMateri.unshift(savedMateri);
        if (typeof syncMateriToCloud === 'function') {
          syncMateriToCloud(savedMateri);
        }
        showToast(`Catatan materi pertemuan ${pertemuan} berhasil disimpan! 📖`, 'success');
      }
    }

    saveStorage();
    rebuildMateriList();
    materiModal.close();
  } catch (err) {
    console.error('Gagal menyimpan materi:', err);
    showToast('Terjadi kesalahan: ' + err.message, 'danger');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  }
});

// SUBMIT MATA KULIAH (ADD & EDIT DENGAN CASCADE UPDATE)
if (matkulForm) {
  matkulForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const nama = document.getElementById('matkulNama').value.trim();
    const kode = document.getElementById('matkulKode').value.trim();
    const sks = Number(document.getElementById('matkulSks').value) || 0;
    const dosen = document.getElementById('matkulDosen').value.trim();
    const jadwal = document.getElementById('matkulJadwal').value.trim();
    const ruangan = document.getElementById('matkulRuangan').value.trim();
    const warnaEl = document.querySelector('input[name="matkulWarna"]:checked');
    const warna = warnaEl ? warnaEl.value : '#4f46e5';
    const editId = editMatkulId ? editMatkulId.value : '';

    if (!nama) {
      showToast('Nama mata kuliah wajib diisi', 'danger');
      return;
    }

    if (editId) {
      // Mode Edit
      const courseIndex = matkulList.findIndex(m => m.id === editId);
      if (courseIndex !== -1) {
        const oldName = matkulList[courseIndex].nama;
        matkulList[courseIndex] = {
          ...matkulList[courseIndex],
          nama,
          kode,
          sks,
          dosen,
          jadwal,
          ruangan,
          warna
        };

        if (typeof syncMatkulToCloud === 'function') {
          syncMatkulToCloud(matkulList[courseIndex]);
        }

        // Otomatis update nama mata kuliah di seluruh tugas & materi yang terkait jika nama diubah
        if (oldName.toLowerCase().trim() !== nama.toLowerCase().trim()) {
          tugasList.forEach(t => {
            if (t.matkul.toLowerCase().trim() === oldName.toLowerCase().trim()) {
              t.matkul = nama;
              if (typeof syncTugasToCloud === 'function') syncTugasToCloud(t);
            }
          });
          materiList.forEach(m => {
            if (m.matkul.toLowerCase().trim() === oldName.toLowerCase().trim()) {
              m.matkul = nama;
              if (typeof syncMateriToCloud === 'function') syncMateriToCloud(m);
            }
          });
          if (activeMatkulFilter.toLowerCase().trim() === oldName.toLowerCase().trim()) {
            activeMatkulFilter = nama;
          }
        }

        showToast(`Mata kuliah "${nama}" berhasil diperbarui! ✏️`, 'success');
      }
    } else {
      // Mode Tambah Baru
      const existingIndex = matkulList.findIndex(m => m.nama.toLowerCase().trim() === nama.toLowerCase().trim());
      if (existingIndex !== -1) {
        matkulList[existingIndex] = {
          ...matkulList[existingIndex],
          kode,
          sks,
          dosen,
          jadwal,
          ruangan,
          warna
        };
        if (typeof syncMatkulToCloud === 'function') {
          syncMatkulToCloud(matkulList[existingIndex]);
        }
        showToast(`Mata kuliah "${nama}" diperbarui!`, 'success');
      } else {
        const newMatkul = {
          id: 'mk-' + Date.now(),
          nama,
          kode,
          sks,
          dosen,
          jadwal,
          ruangan,
          warna
        };
        matkulList.push(newMatkul);
        if (typeof syncMatkulToCloud === 'function') {
          syncMatkulToCloud(newMatkul);
        }
        showToast(`Mata kuliah "${nama}" berhasil didaftarkan! 🎓`, 'success');
      }
    }

    saveStorage();
    renderMatkul();
    renderCourseFilters();
    renderTugas();
    renderMateri();
    matkulModal.close();
  });
}

function renderMatkul() {
  if (badgeTotalMatkul) {
    badgeTotalMatkul.textContent = matkulList.length;
  }

  if (!matkulGridContainer) return;

  if (matkulList.length === 0) {
    if (emptyMatkulState) emptyMatkulState.style.display = 'block';
    matkulGridContainer.innerHTML = '';
  } else {
    if (emptyMatkulState) emptyMatkulState.style.display = 'none';
    matkulGridContainer.innerHTML = '';

    matkulList.forEach(course => {
      if (!course || !course.nama) return;
      const courseName = (course.nama || '').toLowerCase().trim();
      // Hitung tugas & materi untuk mata kuliah ini (case-insensitive & null-safe)
      const activeTasks = tugasList.filter(t => t && t.matkul && t.matkul.toLowerCase().trim() === courseName && !t.completed).length;
      const totalMaterials = materiList.filter(m => m && m.matkul && m.matkul.toLowerCase().trim() === courseName).length;

      const card = document.createElement('div');
      card.className = 'course-card-full';

      card.innerHTML = `
        <div class="course-accent-bar" style="background-color: ${course.warna || '#4f46e5'};"></div>
        <div class="course-card-header">
          <div class="course-badges-group">
            ${course.kode ? `<span class="course-code-badge">${escapeHtml(course.kode)}</span>` : ''}
            ${course.sks ? `<span class="course-sks-badge">${course.sks} SKS</span>` : ''}
          </div>
          <div class="card-actions-group">
            <button class="btn-edit-item" onclick="openEditMatkulModal('${course.id}')" title="Edit Mata Kuliah">
              <i data-feather="edit-2"></i>
            </button>
            <button class="btn-delete-item" onclick="deleteMatkul('${course.id}')" title="Hapus Mata Kuliah">
              <i data-feather="trash-2"></i>
            </button>
          </div>
        </div>

        <h3 class="course-card-name">${escapeHtml(course.nama)}</h3>

        <div class="course-detail-list">
          ${course.dosen ? `
            <div class="course-detail-item">
              <i data-feather="user"></i>
              <span>${escapeHtml(course.dosen)}</span>
            </div>
          ` : ''}
          ${course.jadwal ? `
            <div class="course-detail-item">
              <i data-feather="clock"></i>
              <span>${escapeHtml(course.jadwal)}</span>
            </div>
          ` : ''}
          ${course.ruangan ? `
            <div class="course-detail-item">
              <i data-feather="map-pin"></i>
              <span>${escapeHtml(course.ruangan)}</span>
            </div>
          ` : ''}
        </div>

        <div class="course-stats-bar">
          <span><i data-feather="check-square"></i> ${activeTasks} tugas aktif</span>
          <span><i data-feather="file-text"></i> ${totalMaterials} materi</span>
        </div>

        <div class="course-card-footer">
          <button type="button" class="btn-course-action" onclick="viewCourseTasks('${escapeHtml(course.nama)}')" title="Lihat semua tugas untuk mata kuliah ini">
            <i data-feather="check-square"></i>
            <span>Buka Tugas</span>
          </button>
          <button type="button" class="btn-course-action" onclick="viewCourseMaterials('${escapeHtml(course.nama)}')" title="Lihat semua catatan & materi untuk mata kuliah ini">
            <i data-feather="file-text"></i>
            <span>Buka Materi</span>
          </button>
        </div>
      `;

      matkulGridContainer.appendChild(card);
    });
  }

  feather.replace();
}

window.viewCourseTasks = function(courseName) {
  setMatkulFilter(courseName, false);
  switchTab('tab-tugas');
  showToast(`Menampilkan tugas untuk: ${courseName}`, 'info');
};

window.viewCourseMaterials = function(courseName) {
  setMatkulFilter(courseName, false);
  switchTab('tab-materi');
  showToast(`Menampilkan materi untuk: ${courseName}`, 'info');
};

window.viewCourseDetails = function(courseName) {
  viewCourseTasks(courseName);
};

window.deleteMatkul = function(id) {
  const found = matkulList.find(m => m.id === id);
  if (!found) return;
  if (confirm(`Hapus mata kuliah "${found.nama}" dari daftar? (Data tugas dan materi yang sudah dicatat tidak akan hilang).`)) {
    matkulList = matkulList.filter(m => m.id !== id);
    saveStorage();
    if (typeof deleteMatkulFromCloud === 'function') {
      deleteMatkulFromCloud(id);
    }
    renderMatkul();
    renderCourseFilters();
    showToast(`Mata kuliah "${found.nama}" dihapus`, 'danger');
  }
};

// ============================================================================
// 9. THEME & SIDEBAR TOGGLE
// ============================================================================
function initTheme() {
  const saved = localStorage.getItem(THEME_STORAGE_KEY) || 'light';
  document.body.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
}

function toggleTheme() {
  const current = document.body.getAttribute('data-theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  document.body.setAttribute('data-theme', next);
  localStorage.setItem(THEME_STORAGE_KEY, next);
  updateThemeIcon(next);
  showToast(`Mode ${next === 'dark' ? 'Gelap' : 'Terang'} aktif`, 'info');
}

function updateThemeIcon(theme) {
  if (theme === 'dark') {
    themeIcon.setAttribute('data-feather', 'sun');
  } else {
    themeIcon.setAttribute('data-feather', 'moon');
  }
  feather.replace();
}

themeToggleBtn.addEventListener('click', toggleTheme);

function openSidebar() {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('active');
}

function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('active');
}

openSidebarBtn.addEventListener('click', openSidebar);
closeSidebarBtn.addEventListener('click', closeSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);

// Filter Search Event Listeners
filterTugasMatkul.addEventListener('change', renderTugas);
filterTugasStatus.addEventListener('change', renderTugas);
searchTugasInput.addEventListener('input', renderTugas);

filterMateriMatkul.addEventListener('change', renderMateri);
searchMateriInput.addEventListener('input', renderMateri);

globalSearchInput.addEventListener('input', (e) => {
  searchTugasInput.value = e.target.value;
  searchMateriInput.value = e.target.value;
  renderTugas();
  renderMateri();
});

// ============================================================================
// 10. CADANGKAN & PULIHKAN DATA (BACKUP & RESTORE)
// ============================================================================
const btnExportBackup = document.getElementById('btnExportBackup');
const importBackupInput = document.getElementById('importBackupInput');

if (btnExportBackup) {
  btnExportBackup.addEventListener('click', async () => {
    try {
      const allFiles = await getAllUploadedFiles();

      const backupData = {
        appName: 'StudySync',
        version: '1.2',
        exportedAt: new Date().toISOString(),
        matkul: matkulList,
        tugas: tugasList,
        materi: materiList,
        files: allFiles
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const dlAnchor = document.createElement('a');
      const dateFormatted = new Date().toISOString().slice(0, 10);
      dlAnchor.href = url;
      dlAnchor.download = `studysync_backup_${dateFormatted}.json`;
      document.body.appendChild(dlAnchor);
      dlAnchor.click();
      dlAnchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);

      showToast('File cadangan (.json) + berkas lampiran berhasil diunduh! 💾', 'success');
    } catch (err) {
      console.error('Gagal mencadangkan data:', err);
      showToast('Gagal membuat file cadangan: ' + err.message, 'danger');
    }
  });
}

if (importBackupInput) {
  importBackupInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (Array.isArray(parsed.tugas) && Array.isArray(parsed.materi)) {
          if (confirm('Pulihkan data dari file cadangan ini? Data mata kuliah, tugas, materi, dan berkas lampiran akan diperbarui.')) {
            if (Array.isArray(parsed.matkul)) {
              matkulList = parsed.matkul;
            }
            tugasList = parsed.tugas;
            materiList = parsed.materi;

            // Pulihkan berkas fisik ke IndexedDB jika ada
            if (Array.isArray(parsed.files) && parsed.files.length > 0) {
              for (const f of parsed.files) {
                await saveUploadedFile(f);
              }
            }

            saveStorage();
            renderMatkul();
            renderCourseFilters();
            renderTugas();
            renderMateri();
            showToast('Data & berkas berhasil dipulihkan secara lengkap! 🎉', 'success');
          }
        } else {
          showToast('Format file JSON tidak sesuai struktur StudySync', 'danger');
        }
      } catch (err) {
        console.error('Gagal memulihkan file:', err);
        showToast('Gagal membaca file JSON!', 'danger');
      }
      importBackupInput.value = '';
    };
    reader.readAsText(file);
  });
}

// ============================================================================
// 10B. CLOUD MODAL & FIREBASE CONTROLS (AKSES RAHASIA KHUSUS ADMINISTRATOR)
// ============================================================================
const cloudModal = document.getElementById('cloudModal');
const btnOpenCloudModal = document.getElementById('btnOpenCloudModal');
const btnOpenCloudModalSidebar = document.getElementById('btnOpenCloudModalSidebar');
const btnSaveFirebaseConfig = document.getElementById('btnSaveFirebaseConfig');
const btnSyncAllToCloud = document.getElementById('btnSyncAllToCloud');
const btnDisconnectFirebase = document.getElementById('btnDisconnectFirebase');
const firebaseConfigInput = document.getElementById('firebaseConfigInput');

function openCloudModal() {
  if (!cloudModal) return;
  const currentConfig = typeof getActiveFirebaseConfig === 'function' ? getActiveFirebaseConfig() : null;
  if (currentConfig && currentConfig.apiKey && firebaseConfigInput) {
    firebaseConfigInput.value = JSON.stringify(currentConfig, null, 2);
  }
  cloudModal.showModal();
}

function closeCloudModal() {
  if (cloudModal) cloudModal.close();
}

window.openCloudModal = openCloudModal;
window.closeCloudModal = closeCloudModal;

// ----------------------------------------------------------------------------
// SISTEM VERIFIKASI AKSES ADMINISTRATOR (SECRET GATE & PASSWORD: @Mikasa262728)
// ----------------------------------------------------------------------------
const adminAuthModal = document.getElementById('adminAuthModal');
const adminAuthForm = document.getElementById('adminAuthForm');
const adminSecretInput = document.getElementById('adminSecretInput');
const adminAuthErrorMsg = document.getElementById('adminAuthErrorMsg');

function triggerAdminSecretDoor() {
  if (!adminAuthModal) return;
  if (adminSecretInput) adminSecretInput.value = '';
  if (adminAuthErrorMsg) adminAuthErrorMsg.style.display = 'none';
  adminAuthModal.showModal();
  setTimeout(() => { if (adminSecretInput) adminSecretInput.focus(); }, 150);
}

window.closeAdminAuthModal = function() {
  if (adminAuthModal) adminAuthModal.close();
};

if (adminAuthForm) {
  adminAuthForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const entered = adminSecretInput ? adminSecretInput.value.trim() : '';
    if (entered === '@Mikasa262728') {
      closeAdminAuthModal();
      openCloudModal();
      showToast('Akses Administrator diberikan! 🛡️', 'success');
    } else {
      if (adminAuthErrorMsg) {
        adminAuthErrorMsg.style.display = 'flex';
        adminAuthErrorMsg.style.animation = 'none';
        void adminAuthErrorMsg.offsetWidth;
        adminAuthErrorMsg.style.animation = 'shakeError 0.35s ease';
      }
    }
  });
}

// 1. Ketuk Logo 5x dalam 3 detik untuk membuka pintu rahasia admin
let adminLogoClickCount = 0;
let adminLogoClickTimer = null;

const brandElements = document.querySelectorAll('.logo, .logo-icon, .login-brand');
brandElements.forEach(el => {
  el.style.cursor = 'pointer';
  el.addEventListener('click', (e) => {
    adminLogoClickCount++;
    clearTimeout(adminLogoClickTimer);
    if (adminLogoClickCount >= 5) {
      adminLogoClickCount = 0;
      triggerAdminSecretDoor();
    } else {
      adminLogoClickTimer = setTimeout(() => {
        adminLogoClickCount = 0;
      }, 3000);
    }
  });
});

// 2. Shortcut Keyboard Rahasia: Alt + C
document.addEventListener('keydown', (e) => {
  if (e.altKey && (e.key === 'c' || e.key === 'C')) {
    e.preventDefault();
    triggerAdminSecretDoor();
  }
});

if (btnOpenCloudModal) btnOpenCloudModal.addEventListener('click', triggerAdminSecretDoor);
if (btnOpenCloudModalSidebar) btnOpenCloudModalSidebar.addEventListener('click', triggerAdminSecretDoor);

if (cloudModal) {
  cloudModal.addEventListener('click', (e) => {
    const rect = cloudModal.getBoundingClientRect();
    const isInside =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;
    if (!isInside) cloudModal.close();
  });
}

if (btnSaveFirebaseConfig) {
  btnSaveFirebaseConfig.addEventListener('click', () => {
    const rawVal = firebaseConfigInput.value.trim();
    if (!rawVal) {
      showToast('Tempelkan kode konfigurasi Firebase terlebih dahulu.', 'warning');
      return;
    }

    try {
      let configObj = null;
      if (rawVal.includes('{') && rawVal.includes('}')) {
        const jsonOnly = rawVal.substring(rawVal.indexOf('{'), rawVal.lastIndexOf('}') + 1);
        try {
          configObj = JSON.parse(jsonOnly);
        } catch (e) {
          configObj = (new Function(`return ${jsonOnly};`))();
        }
      }

      if (!configObj || !configObj.apiKey || !configObj.projectId) {
        showToast('Format config tidak valid! Pastikan ada apiKey dan projectId.', 'danger');
        return;
      }

      localStorage.setItem(FIREBASE_CONFIG_STORAGE_KEY, JSON.stringify(configObj));
      const connected = typeof initFirebase === 'function' ? initFirebase() : false;
      if (connected) {
        showToast('Firebase berhasil terhubung! Real-time sync aktif ☁️🎉', 'success');
        closeCloudModal();
      } else {
        showToast('Koneksi Firebase gagal. Periksa kembali config atau rule Firestore Anda.', 'danger');
      }
    } catch (err) {
      showToast('Gagal membaca format konfigurasi: ' + err.message, 'danger');
    }
  });
}

if (btnSyncAllToCloud) {
  btnSyncAllToCloud.addEventListener('click', () => {
    if (typeof syncAllLocalDataToCloud === 'function') {
      syncAllLocalDataToCloud();
    }
  });
}

if (btnDisconnectFirebase) {
  btnDisconnectFirebase.addEventListener('click', () => {
    if (confirm('Putuskan koneksi ke Firebase? Data Anda akan tetap tersimpan di penyimpanan lokal browser.')) {
      localStorage.removeItem(FIREBASE_CONFIG_STORAGE_KEY);
      if (typeof isFirebaseConnected !== 'undefined') isFirebaseConnected = false;
      if (typeof updateCloudStatusUI === 'function') {
        updateCloudStatusUI(false, 'Mode Lokal (Belum Terhubung)');
      }
      if (firebaseConfigInput) firebaseConfigInput.value = '';
      showToast('Koneksi Cloud diputuskan. Kembali ke mode lokal.', 'info');
      closeCloudModal();
    }
  });
}

// ============================================================================
// ============================================================================
// 10C. KEAMANAN & AUTENTIKASI PORTAL (FIREBASE AUTH & NIM LOOKUP)
// ============================================================================
const loginOverlay = document.getElementById('loginOverlay');
const appLayout = document.getElementById('appLayout');

// Auth Form Elements
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginNimInput = document.getElementById('loginNimInput');
const loginPasswordInput = document.getElementById('loginPasswordInput');
const btnSubmitLogin = document.getElementById('btnSubmitLogin');
const loginErrorMsg = document.getElementById('loginErrorMsg');
const loginErrorText = document.getElementById('loginErrorText');
const btnToggleLoginPwd = document.getElementById('btnToggleLoginPwd');

// Register Elements
const regNamaInput = document.getElementById('regNamaInput');
const regNimInput = document.getElementById('regNimInput');
const regEmailInput = document.getElementById('regEmailInput');
const regPasswordInput = document.getElementById('regPasswordInput');
const regConfirmPasswordInput = document.getElementById('regConfirmPasswordInput');
const btnSubmitRegister = document.getElementById('btnSubmitRegister');
const registerErrorMsg = document.getElementById('registerErrorMsg');
const registerErrorText = document.getElementById('registerErrorText');
const btnToggleRegPwd = document.getElementById('btnToggleRegPwd');
const btnToggleRegConfirmPwd = document.getElementById('btnToggleRegConfirmPwd');

// Google Sign In & Switch Buttons
const btnGoogleSignIn = document.getElementById('btnGoogleSignIn');
const btnGoogleSignInRegister = document.getElementById('btnGoogleSignInRegister');
const btnSwitchToLogin = document.getElementById('btnSwitchToLogin');
const btnForgotPassword = document.getElementById('btnForgotPassword');

// Modals
const forgotPasswordModal = document.getElementById('forgotPasswordModal');
const forgotPasswordForm = document.getElementById('forgotPasswordForm');
const forgotNimInput = document.getElementById('forgotNimInput');
const forgotErrorMsg = document.getElementById('forgotErrorMsg');
const forgotErrorText = document.getElementById('forgotErrorText');
const btnSubmitForgot = document.getElementById('btnSubmitForgot');
const btnCloseForgotModal = document.getElementById('btnCloseForgotModal');
const btnCancelForgotModal = document.getElementById('btnCancelForgotModal');

const completeNIMModal = document.getElementById('completeNIMModal');
const completeNIMForm = document.getElementById('completeNIMForm');
const googleNamaInput = document.getElementById('googleNamaInput');
const googleNimInput = document.getElementById('googleNimInput');
const googlePasswordInput = document.getElementById('googlePasswordInput');
const googleConfirmPasswordInput = document.getElementById('googleConfirmPasswordInput');
const completeNIMErrorMsg = document.getElementById('completeNIMErrorMsg');
const completeNIMErrorText = document.getElementById('completeNIMErrorText');
const btnSubmitCompleteNIM = document.getElementById('btnSubmitCompleteNIM');
const btnToggleGooglePwd = document.getElementById('btnToggleGooglePwd');
const btnToggleGoogleConfirmPwd = document.getElementById('btnToggleGoogleConfirmPwd');

const changePasswordModal = document.getElementById('changePasswordModal');
const changePasswordForm = document.getElementById('changePasswordForm');
const oldPasswordInput = document.getElementById('oldPasswordInput');
const newPasswordInput = document.getElementById('newPasswordInput');
const confirmNewPasswordInput = document.getElementById('confirmNewPasswordInput');
const btnOpenChangePassword = document.getElementById('btnOpenChangePassword');

const btnLogout = document.getElementById('btnLogout');
const btnQuickLock = document.getElementById('btnQuickLock');

/**
 * Switch antara tab Masuk dan Daftar Akun
 */
function switchAuthTab(tab) {
  const tabBtnMasuk = document.getElementById('tabBtnMasuk');
  const tabBtnDaftar = document.getElementById('tabBtnDaftar');

  if (tab === 'masuk') {
    if (tabBtnMasuk) tabBtnMasuk.classList.add('active');
    if (tabBtnDaftar) tabBtnDaftar.classList.remove('active');
    if (loginForm) loginForm.style.display = 'flex';
    if (registerForm) registerForm.style.display = 'none';
  } else {
    if (tabBtnMasuk) tabBtnMasuk.classList.remove('active');
    if (tabBtnDaftar) tabBtnDaftar.classList.add('active');
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'flex';
    // Pastikan kolom buat kata sandi selalu kosong (bersih dari autofill sandi tersimpan browser)
    if (regPasswordInput) regPasswordInput.value = '';
    if (regConfirmPasswordInput) regConfirmPasswordInput.value = '';
    setTimeout(() => {
      if (regPasswordInput) regPasswordInput.value = '';
      if (regConfirmPasswordInput) regConfirmPasswordInput.value = '';
    }, 50);
  }
  if (window.feather) feather.replace();
}
window.switchAuthTab = switchAuthTab;

// Bersihkan kolom password pendaftaran saat pertama kali halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
  if (regPasswordInput) regPasswordInput.value = '';
  if (regConfirmPasswordInput) regConfirmPasswordInput.value = '';
});

if (btnSwitchToLogin) {
  btnSwitchToLogin.addEventListener('click', () => switchAuthTab('masuk'));
}

/**
 * Tampilkan data profil mahasiswa di sidebar dan dashboard
 */
function updateStudentProfileUI(profile) {
  if (!profile) return;
  currentUserProfile = profile;
  isCurrentUserAdmin = !!(profile.role && profile.role !== 'Mahasiswa') || !!profile.isAdmin;

  try {
    localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {}

  // Sidebar elements
  const sbName = document.getElementById('sidebarUserName');
  const sbNim = document.getElementById('sidebarUserNim');
  const sbAvatar = document.getElementById('sidebarUserAvatar');

  if (sbName) sbName.textContent = profile.nama || 'Mahasiswa';
  if (sbNim) sbNim.textContent = profile.nim ? `NIM: ${profile.nim}` : 'NIM: -';
  if (sbAvatar) {
    const initial = (profile.nama || 'M').trim().charAt(0).toUpperCase();
    sbAvatar.textContent = initial;
  }

  // Dashboard banner elements
  const dbName = document.getElementById('dashboardStudentName');
  const dbNim = document.getElementById('dashboardStudentNim');
  if (dbName) dbName.textContent = profile.nama || 'Mahasiswa';
  if (dbNim) dbNim.textContent = profile.nim ? `NIM: ${profile.nim}` : 'NIM: -';

  // Perbarui status & badge hak akses Pengurus Kelas
  if (typeof updateAdminUI === 'function') {
    updateAdminUI();
  }

  // Rebuild tugas & materi agar hak akses edit/hapus dan status pengerjaan sesuai
  if (typeof rebuildTugasList === 'function') rebuildTugasList();
  if (typeof rebuildMateriList === 'function') rebuildMateriList();
}

/**
 * Buka kunci portal dan tampilkan seluruh data
 */
function unlockPortal(showToastAlert = false) {
  if (loginOverlay) loginOverlay.classList.add('hidden');
  if (appLayout) appLayout.classList.remove('locked');
  if (showToastAlert) {
    const cached = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
    let name = 'Mahasiswa';
    if (cached) {
      try { name = JSON.parse(cached).nama || name; } catch (e) {}
    }
    showToast(`Selamat datang kembali, ${name}! 🎓`, 'success');
  }
  if (window.feather) feather.replace();
}

/**
 * Kunci portal dan tampilkan layar login
 */
function lockPortal() {
  if (loginOverlay) loginOverlay.classList.remove('hidden');
  if (appLayout) appLayout.classList.add('locked');
  if (loginPasswordInput) loginPasswordInput.value = '';
  if (loginErrorMsg) loginErrorMsg.style.display = 'none';
  if (registerErrorMsg) registerErrorMsg.style.display = 'none';
  if (window.feather) feather.replace();
}

/**
 * Toggle lihat/sembunyikan sandi pada input manapun
 */
window.togglePasswordInput = function(inputId, btnEl) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';

  const icon = btnEl ? btnEl.querySelector('i') : null;
  if (icon) {
    icon.setAttribute('data-feather', isPassword ? 'eye-off' : 'eye');
    if (window.feather) feather.replace();
  }
};

if (btnToggleLoginPwd) {
  btnToggleLoginPwd.addEventListener('click', () => togglePasswordInput('loginPasswordInput', btnToggleLoginPwd));
}
if (btnToggleRegPwd) {
  btnToggleRegPwd.addEventListener('click', () => togglePasswordInput('regPasswordInput', btnToggleRegPwd));
}
if (btnToggleRegConfirmPwd) {
  btnToggleRegConfirmPwd.addEventListener('click', () => togglePasswordInput('regConfirmPasswordInput', btnToggleRegConfirmPwd));
}
if (btnToggleGooglePwd) {
  btnToggleGooglePwd.addEventListener('click', () => togglePasswordInput('googlePasswordInput', btnToggleGooglePwd));
}
if (btnToggleGoogleConfirmPwd) {
  btnToggleGoogleConfirmPwd.addEventListener('click', () => togglePasswordInput('googleConfirmPasswordInput', btnToggleGoogleConfirmPwd));
}

/**
 * Auth State Listener (Observer Firebase Auth)
 */
function setupAuthObserver() {
  if (!firebaseAuth) return;

  firebaseAuth.onAuthStateChanged(async (user) => {
    currentUser = user;
    if (user) {
      console.log('👤 Auth state: Logged in sebagai', user.email, '| UID:', user.uid);

      // Ambil profil dari Firestore
      let profile = await getUserProfile(user.uid);

      if (!profile) {
        // Pengguna Google baru yang belum mengisi NIM
        if (googleNamaInput) googleNamaInput.value = user.displayName || '';
        if (completeNIMModal) completeNIMModal.showModal();
        return;
      }

      updateStudentProfileUI(profile);
      unlockPortal(false);

      // Hubungkan real-time listeners untuk user ini
      setupRealtimeListeners(user.uid);
    } else {
      console.log('🔒 Auth state: Belum login / Sesi berakhir');
      lockPortal();
    }
  });
}

// ----------------------------------------------------------------------------
// 1. SUBMIT FORM LOGIN (NIM + Password)
// ----------------------------------------------------------------------------
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nim = loginNimInput ? loginNimInput.value.trim() : '';
    const pwd = loginPasswordInput ? loginPasswordInput.value : '';

    if (!nim || !pwd) return;

    if (loginErrorMsg) loginErrorMsg.style.display = 'none';
    if (btnSubmitLogin) {
      btnSubmitLogin.disabled = true;
      btnSubmitLogin.innerHTML = '<span>Memverifikasi...</span>';
    }

    try {
      await loginWithNIMPassword(nim, pwd);
      showToast('Login berhasil! Memuat portal...', 'success');
      // Auth observer onAuthStateChanged akan membuka portal dan me-load data otomatis
    } catch (err) {
      console.error('Login error:', err);
      if (loginErrorMsg && loginErrorText) {
        let msg = err.message;
        if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
          msg = 'Kata sandi salah! Periksa kembali huruf besar/kecil.';
        } else if (err.code === 'auth/user-not-found') {
          msg = 'Akun tidak ditemukan. Silakan daftar akun baru.';
        } else if (err.code === 'auth/too-many-requests') {
          msg = 'Terlalu banyak percobaan gagal. Silakan tunggu beberapa saat.';
        }
        loginErrorText.textContent = msg;
        loginErrorMsg.style.display = 'flex';
        loginErrorMsg.style.animation = 'none';
        void loginErrorMsg.offsetWidth;
        loginErrorMsg.style.animation = 'shakeError 0.35s ease';
      }
    } finally {
      if (btnSubmitLogin) {
        btnSubmitLogin.disabled = false;
        btnSubmitLogin.innerHTML = '<i data-feather="log-in"></i><span>Masuk ke Portal</span>';
        if (window.feather) feather.replace();
      }
    }
  });
}

// ----------------------------------------------------------------------------
// 2. SUBMIT FORM DAFTAR AKUN BARU
// ----------------------------------------------------------------------------
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nama = regNamaInput ? regNamaInput.value.trim() : '';
    const nim = regNimInput ? regNimInput.value.trim() : '';
    const email = regEmailInput ? regEmailInput.value.trim() : '';
    const pwd = regPasswordInput ? regPasswordInput.value : '';
    const confirmPwd = regConfirmPasswordInput ? regConfirmPasswordInput.value : '';

    if (pwd !== confirmPwd) {
      if (registerErrorMsg && registerErrorText) {
        registerErrorText.textContent = 'Konfirmasi kata sandi tidak cocok!';
        registerErrorMsg.style.display = 'flex';
      }
      return;
    }

    if (pwd.length < 6) {
      if (registerErrorMsg && registerErrorText) {
        registerErrorText.textContent = 'Kata sandi minimal 6 karakter!';
        registerErrorMsg.style.display = 'flex';
      }
      return;
    }

    if (registerErrorMsg) registerErrorMsg.style.display = 'none';
    if (btnSubmitRegister) {
      btnSubmitRegister.disabled = true;
      btnSubmitRegister.innerHTML = '<span>Mendaftarkan akun...</span>';
    }

    try {
      await registerWithEmailPassword(email, pwd, nama, nim);
      registerForm.reset();

      // Pindahkan pengguna ke tab Masuk, isi otomatis NIM, dan arahkan ke kolom password
      switchAuthTab('masuk');
      if (loginNimInput) loginNimInput.value = nim;
      if (loginPasswordInput) {
        loginPasswordInput.value = '';
        setTimeout(() => loginPasswordInput.focus(), 250);
      }

      showToast(`Akun berhasil dibuat untuk ${nama}! Silakan masuk menggunakan NIM dan kata sandi Anda 🎓`, 'success');
    } catch (err) {
      console.error('Register error:', err);
      if (registerErrorMsg && registerErrorText) {
        let msg = err.message;
        if (err.code === 'auth/email-already-in-use') {
          msg = 'Alamat email ini sudah terdaftar! Gunakan email lain.';
        } else if (err.code === 'auth/invalid-email') {
          msg = 'Format alamat email tidak valid.';
        } else if (err.code === 'auth/weak-password') {
          msg = 'Kata sandi terlalu sederhana. Tambahkan kombinasi angka.';
        }
        registerErrorText.textContent = msg;
        registerErrorMsg.style.display = 'flex';
        registerErrorMsg.style.animation = 'none';
        void registerErrorMsg.offsetWidth;
        registerErrorMsg.style.animation = 'shakeError 0.35s ease';
      }
    } finally {
      if (btnSubmitRegister) {
        btnSubmitRegister.disabled = false;
        btnSubmitRegister.innerHTML = '<i data-feather="user-plus"></i><span>Buat Akun Sekarang</span>';
        if (window.feather) feather.replace();
      }
    }
  });
}

// ----------------------------------------------------------------------------
// 3. GOOGLE SIGN-IN HANDLER
// ----------------------------------------------------------------------------
async function handleGoogleLoginAction() {
  try {
    const res = await loginWithGoogle();
    if (res.isNewUser) {
      showToast('Akun Google terhubung! Silakan lengkapi NIM & buat kata sandi Anda.', 'info');
    } else {
      showToast('Login dengan Google berhasil! 🎓', 'success');
    }
  } catch (err) {
    console.error('Google Sign-in error:', err);
    if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
      showToast('Gagal masuk dengan Google: ' + err.message, 'danger');
    }
  }
}

if (btnGoogleSignIn) btnGoogleSignIn.addEventListener('click', handleGoogleLoginAction);
if (btnGoogleSignInRegister) btnGoogleSignInRegister.addEventListener('click', handleGoogleLoginAction);

// ----------------------------------------------------------------------------
// 4. LENGKAPI NIM & KATA SANDI MODAL HANDLER (untuk User Google)
// ----------------------------------------------------------------------------
if (completeNIMForm) {
  completeNIMForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nama = googleNamaInput ? googleNamaInput.value.trim() : '';
    const nim = googleNimInput ? googleNimInput.value.trim() : '';
    const pwd = googlePasswordInput ? googlePasswordInput.value : '';
    const confirmPwd = googleConfirmPasswordInput ? googleConfirmPasswordInput.value : '';

    if (!currentUser) return;

    if (pwd !== confirmPwd) {
      if (completeNIMErrorMsg && completeNIMErrorText) {
        completeNIMErrorText.textContent = 'Konfirmasi kata sandi tidak cocok!';
        completeNIMErrorMsg.style.display = 'flex';
      }
      return;
    }

    if (pwd.length < 6) {
      if (completeNIMErrorMsg && completeNIMErrorText) {
        completeNIMErrorText.textContent = 'Kata sandi minimal 6 karakter!';
        completeNIMErrorMsg.style.display = 'flex';
      }
      return;
    }

    if (completeNIMErrorMsg) completeNIMErrorMsg.style.display = 'none';
    if (btnSubmitCompleteNIM) btnSubmitCompleteNIM.disabled = true;

    try {
      await completeGoogleRegistration(nama, nim, pwd);

      if (completeNIMModal) completeNIMModal.close();
      completeNIMForm.reset();

      // Arahkan ke tab Masuk dan isi otomatis NIM-nya
      switchAuthTab('masuk');
      if (loginNimInput) loginNimInput.value = nim;
      if (loginPasswordInput) {
        loginPasswordInput.value = '';
        setTimeout(() => loginPasswordInput.focus(), 250);
      }

      showToast(`Akun Google & NIM (${nim}) berhasil didaftarkan! Silakan masuk dengan kata sandi Anda 🎓`, 'success');
    } catch (err) {
      console.error('Lengkapi data error:', err);
      if (completeNIMErrorMsg && completeNIMErrorText) {
        let msg = err.message || 'Gagal menyimpan data.';
        if (err.code === 'auth/requires-recent-login' || (err.message && err.message.includes('recent authentication'))) {
          msg = 'Sesi Google kedaluwarsa. Silakan muat ulang halaman lalu masuk dengan Google kembali.';
        }
        completeNIMErrorText.textContent = msg;
        completeNIMErrorMsg.style.display = 'flex';
      }
    } finally {
      if (btnSubmitCompleteNIM) btnSubmitCompleteNIM.disabled = false;
    }
  });
}

/**
 * Batalkan pendaftaran Google jika mahasiswa salah memilih akun Google
 */
window.cancelGoogleRegistration = async function() {
  const modal = document.getElementById('completeNIMModal');
  const form = document.getElementById('completeNIMForm');
  const errorMsg = document.getElementById('completeNIMErrorMsg');

  if (modal) modal.close();
  if (form) form.reset();
  if (errorMsg) errorMsg.style.display = 'none';

  // Logout sesi Google yang belum lengkap agar tidak menggantung di akun yang salah
  if (typeof firebaseAuth !== 'undefined' && firebaseAuth) {
    try {
      await firebaseAuth.signOut();
      currentUser = null;
      console.log('🚪 Sesi Google dibatalkan & di-logout.');
    } catch (e) {
      console.warn('Gagal sign out saat batal:', e);
    }
  }

  lockPortal();
  showToast('Pendaftaran dibatalkan. Silakan pilih akun email yang benar.', 'info');
};

// ----------------------------------------------------------------------------
// 5. LUPA KATA SANDI VIA NIM HANDLER
// ----------------------------------------------------------------------------
if (btnForgotPassword) {
  btnForgotPassword.addEventListener('click', () => {
    if (forgotPasswordForm) forgotPasswordForm.reset();
    if (forgotErrorMsg) forgotErrorMsg.style.display = 'none';
    if (forgotPasswordModal) forgotPasswordModal.showModal();
  });
}

if (btnCloseForgotModal) {
  btnCloseForgotModal.addEventListener('click', () => {
    if (forgotPasswordModal) forgotPasswordModal.close();
  });
}

if (btnCancelForgotModal) {
  btnCancelForgotModal.addEventListener('click', () => {
    if (forgotPasswordModal) forgotPasswordModal.close();
  });
}

if (forgotPasswordForm) {
  forgotPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nim = forgotNimInput ? forgotNimInput.value.trim() : '';

    if (!nim) return;
    if (forgotErrorMsg) forgotErrorMsg.style.display = 'none';
    if (btnSubmitForgot) {
      btnSubmitForgot.disabled = true;
      btnSubmitForgot.innerHTML = '<span>Mencari data & mengirim...</span>';
    }

    try {
      const email = await sendPasswordResetByNIM(nim);
      const maskedEmail = email.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + '***' + c);

      if (forgotPasswordModal) forgotPasswordModal.close();
      showToast(`Link reset sandi telah dikirim ke email (${maskedEmail})! Periksa Inbox atau Spam Anda. 📧`, 'success');
    } catch (err) {
      console.error('Forgot password error:', err);
      if (forgotErrorMsg && forgotErrorText) {
        forgotErrorText.textContent = err.message;
        forgotErrorMsg.style.display = 'flex';
      }
    } finally {
      if (btnSubmitForgot) {
        btnSubmitForgot.disabled = false;
        btnSubmitForgot.innerHTML = '<i data-feather="send"></i><span>Kirim Link Reset Sandi</span>';
        if (window.feather) feather.replace();
      }
    }
  });
}

// ----------------------------------------------------------------------------
// 6. LOGOUT & KUNCI
// ----------------------------------------------------------------------------
async function handleLogoutAction() {
  if (confirm('Apakah Anda yakin ingin keluar dari akun ini?')) {
    try {
      await logoutUser();
      localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
      lockPortal();
      showToast('Anda telah keluar dari akun. Sampai jumpa! 👋', 'info');
    } catch (err) {
      console.error('Logout error:', err);
      showToast('Gagal logout: ' + err.message, 'danger');
    }
  }
}

if (btnLogout) btnLogout.addEventListener('click', handleLogoutAction);
if (btnQuickLock) {
  btnQuickLock.addEventListener('click', () => {
    lockPortal();
    showToast('Portal dikunci sementara 🔒', 'info');
  });
}

// ----------------------------------------------------------------------------
// 7. GANTI KATA SANDI MODAL (KETIKA SUDAH LOGIN)
// ----------------------------------------------------------------------------
function openChangePasswordModal() {
  if (changePasswordForm) changePasswordForm.reset();
  if (changePasswordModal) changePasswordModal.showModal();
}

function closeChangePasswordModal() {
  if (changePasswordModal) changePasswordModal.close();
}

window.openChangePasswordModal = openChangePasswordModal;
window.closeChangePasswordModal = closeChangePasswordModal;

if (btnOpenChangePassword) {
  btnOpenChangePassword.addEventListener('click', openChangePasswordModal);
}

if (changePasswordModal) {
  changePasswordModal.addEventListener('click', (e) => {
    const rect = changePasswordModal.getBoundingClientRect();
    const isInside =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;
    if (!isInside) changePasswordModal.close();
  });
}

if (changePasswordForm) {
  changePasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const oldPass = oldPasswordInput ? oldPasswordInput.value : '';
    const newPass = newPasswordInput ? newPasswordInput.value : '';
    const confirmPass = confirmNewPasswordInput ? confirmNewPasswordInput.value : '';

    if (newPass !== confirmPass) {
      showToast('Konfirmasi kata sandi baru tidak cocok!', 'danger');
      return;
    }

    if (newPass.length < 6) {
      showToast('Kata sandi baru minimal harus 6 karakter!', 'danger');
      return;
    }

    try {
      if (!currentUser) {
        showToast('Anda belum login ke Firebase!', 'danger');
        return;
      }

      // Jika ada kata sandi lama dan user menggunakan email/password
      if (oldPass && currentUser.email) {
        try {
          const cred = firebase.auth.EmailAuthProvider.credential(currentUser.email, oldPass);
          await currentUser.reauthenticateWithCredential(cred);
        } catch (authErr) {
          showToast('Kata sandi lama salah! Periksa kembali.', 'danger');
          return;
        }
      }

      await currentUser.updatePassword(newPass);
      showToast('Kata sandi akun Anda berhasil diperbarui! 🔑', 'success');
      closeChangePasswordModal();
      changePasswordForm.reset();
    } catch (err) {
      console.error('Ganti password error:', err);
      if (err.code === 'auth/requires-recent-login') {
        showToast('Demi keamanan, silakan logout dan login ulang sebelum mengganti kata sandi.', 'warning');
      } else {
        showToast('Gagal mengubah sandi: ' + err.message, 'danger');
      }
    }
  });
}

// ============================================================================
// 10D. FITUR PENGURUS KELAS (ADMIN ROLES) & NOTIFIKASI
// ============================================================================

/**
 * 1. SHARE KE WHATSAPP (1-Klik Bagikan Rincian Tugas ke Grup WA)
 */
window.shareTugasToWA = function(id) {
  const task = tugasList.find(t => t.id === id);
  if (!task) return;

  const dlInfo = calculateDeadlineInfo(task.deadline);
  const waText = 
    `🔔 *PENGINGAT TUGAS KULIAH* 🔔\n\n` +
    `📚 *Mata Kuliah:* ${task.matkul || '-'}\n` +
    `📌 *Judul:* ${task.judul || '-'}\n` +
    `⏰ *Tenggat / Deadline:* ${dlInfo.text}\n` +
    `⚡ *Prioritas:* ${task.prioritas || 'Sedang'}\n` +
    (task.deskripsi ? `📝 *Deskripsi:* ${task.deskripsi}\n` : '') +
    (task.authorJabatan ? `👤 *Info dari:* ${task.authorJabatan}\n` : '') +
    `\n👉 *Akses & kumpulkan di Portal Kuliah:* ${window.location.origin}${window.location.pathname}`;

  const encoded = encodeURIComponent(waText);
  window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
};

/**
 * 2. SISTEM NOTIFIKASI & PENGINGAT DEADLINE
 */
function getNotifications() {
  try {
    const raw = localStorage.getItem(NOTIFS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveNotifications(notifs) {
  try {
    localStorage.setItem(NOTIFS_STORAGE_KEY, JSON.stringify(notifs.slice(0, 30)));
  } catch (e) {}
}

function addNotification({ type, title, message, time, taskId }) {
  const notifs = getNotifications();
  // Hindari notifikasi duplikat untuk task yang sama dengan tipe yang sama
  const exists = notifs.some(n => n.taskId && n.taskId === taskId && n.type === type);
  if (exists) return;

  const newNotif = {
    id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    type: type || 'info',
    title: title || 'Notifikasi',
    message: message || '',
    time: time || new Date().toISOString(),
    read: false,
    taskId: taskId || null
  };

  notifs.unshift(newNotif);
  saveNotifications(notifs);
  renderNotificationsUI();

  // Browser Push Notification (jika pengguna mengizinkan)
  triggerBrowserPushNotification(title, message);
}

function triggerBrowserPushNotification(title, body) {
  if ('vibrate' in navigator) {
    try { navigator.vibrate([200, 100, 200]); } catch (e) {}
  }

  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body: body,
        icon: 'icons/icon-192.png',
        badge: 'icons/icon-192.png',
        tag: 'study-' + Date.now(),
        renotify: true
      });
    } catch (e) {}
  } else if (Notification.permission === 'default') {
    try {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          try {
            new Notification(title, {
              body: body,
              icon: 'icons/icon-192.png',
              badge: 'icons/icon-192.png',
              tag: 'study-' + Date.now(),
              renotify: true
            });
          } catch (e) {}
        }
      });
    } catch (e) {}
  }
}

function renderNotificationsUI() {
  const notifs = getNotifications();
  const badge = document.getElementById('notifBadge');
  const listEl = document.getElementById('notifList');
  if (!listEl) return;

  const unreadCount = notifs.filter(n => !n.read).length;
  if (badge) {
    if (unreadCount > 0) {
      badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  }

  // Perbarui tampilan status izin notifikasi browser
  try {
    updateNotifPermissionUI();
  } catch (e) {}

  if (notifs.length === 0) {
    listEl.innerHTML = `<div class="notif-empty"><i data-feather="bell-off"></i><span>Belum ada notifikasi baru</span></div>`;
    if (window.feather) feather.replace();
    return;
  }

  listEl.innerHTML = notifs.map(n => {
    let icon = 'info';
    let iconClass = 'notif-icon-info';
    if (n.type === 'h1' || n.type === 'deadline') {
      icon = 'alert-triangle';
      iconClass = 'notif-icon-warning';
    } else if (n.type === 'tugas') {
      icon = 'check-square';
      iconClass = 'notif-icon-primary';
    } else if (n.type === 'materi') {
      icon = 'book-open';
      iconClass = 'notif-icon-accent';
    }

    const timeAgo = formatTimeAgo(n.time);

    return `
      <div class="notif-item ${n.read ? 'read' : 'unread'}" onclick="handleNotifItemClick('${n.id}', '${n.taskId || ''}')">
        <div class="notif-item-icon ${iconClass}">
          <i data-feather="${icon}"></i>
        </div>
        <div class="notif-item-content">
          <div class="notif-item-title">${escapeHtml(n.title)}</div>
          <div class="notif-item-msg">${escapeHtml(n.message)}</div>
          <div class="notif-item-time">${timeAgo}</div>
        </div>
      </div>
    `;
  }).join('');

  if (window.feather) feather.replace();
}

function formatTimeAgo(isoString) {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Baru saja';
  if (mins < 60) return `${mins} mnt lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

window.handleNotifItemClick = function(notifId, taskId) {
  const notifs = getNotifications();
  const item = notifs.find(n => n.id === notifId);
  if (item) item.read = true;
  saveNotifications(notifs);
  renderNotificationsUI();

  const dropdown = document.getElementById('notifDropdown');
  if (dropdown) dropdown.style.display = 'none';

  if (taskId) {
    switchTab('tab-tugas');
  }
};

window.markAllNotificationsRead = function() {
  const notifs = getNotifications();
  notifs.forEach(n => n.read = true);
  saveNotifications(notifs);
  renderNotificationsUI();
  showToast('Semua notifikasi ditandai dibaca', 'info');
};

/**
 * 3. PERIKSA DEADLINE H-1 & ALARM BANNER
 */
function checkDeadlinesAndNotify() {
  const urgentTasks = [];
  const now = new Date();

  tugasList.forEach(t => {
    if (!t.completed && t.deadline) {
      const deadlineDate = new Date(t.deadline);
      const diffMs = deadlineDate - now;
      const diffHours = diffMs / (1000 * 60 * 60);

      // Kurang dari 24 jam dan belum lewat waktu (H-1)
      if (diffHours > 0 && diffHours <= 24) {
        urgentTasks.push(t);
        // Tambahkan ke sistem notifikasi
        addNotification({
          type: 'h1',
          title: `⚠️ H-1 Deadline: ${t.matkul}`,
          message: `Tugas "${t.judul}" harus selesai dalam ${Math.round(diffHours)} jam lagi!`,
          time: new Date().toISOString(),
          taskId: t.id
        });
      }
    }
  });

  // Tampilkan Banner H-1 di atas dashboard
  const banner = document.getElementById('urgentDeadlinesBanner');
  const bannerDesc = document.getElementById('urgentBannerDesc');

  if (banner) {
    if (urgentTasks.length > 0) {
      banner.style.display = 'flex';
      if (bannerDesc) {
        if (urgentTasks.length === 1) {
          bannerDesc.textContent = `Tugas "${urgentTasks[0].judul}" (${urgentTasks[0].matkul}) harus dikumpulkan dalam waktu kurang dari 24 jam!`;
        } else {
          bannerDesc.textContent = `Ada ${urgentTasks.length} tugas yang harus dikumpulkan dalam waktu kurang dari 24 jam!`;
        }
      }
    } else {
      banner.style.display = 'none';
    }
  }

  renderNotificationsUI();
}

/**
 * 4. PENGURUS KELAS MODAL & HAK AKSES UI
 */
function updateAdminUI() {
  const topbarContainer = document.getElementById('topbarAdminBadgeContainer');
  const sidebarBadge = document.getElementById('sidebarAdminBadge');
  const btnClaimSidebar = document.getElementById('btnClaimAdminSidebar');
  const btnCloudModal = document.getElementById('btnOpenCloudModal');

  const btnExitSidebar = document.getElementById('btnExitAdminSidebar');

  const role = currentUserProfile ? currentUserProfile.role : null;
  const isPengurus = isCurrentUserAdmin;

  // 1. Topbar (hanya tampilkan lencana peran agar tidak menutupi menu di HP)
  if (topbarContainer) {
    if (isPengurus) {
      const activeRole = role || 'Pengurus Kelas';
      topbarContainer.innerHTML = `
        <button type="button" class="btn-topbar-admin-badge" onclick="openClaimAdminModal()" title="Hak Akses: ${escapeHtml(activeRole)} (Klik untuk kelola)">
          <i data-feather="shield"></i>
          <span>${escapeHtml(activeRole)}</span>
        </button>
      `;
    } else {
      topbarContainer.innerHTML = `
        <button type="button" class="btn-claim-admin-topbar" onclick="openClaimAdminModal()" title="Klaim Hak Akses Pengurus Kelas">
          <i data-feather="key"></i>
          <span>Pengurus</span>
        </button>
      `;
    }
  }

  // 2. Tombol Keluar dari Mode Pengurus di Sidebar (tepat di atas Keluar Akun)
  if (btnExitSidebar) {
    btnExitSidebar.style.display = isPengurus ? 'flex' : 'none';
  }

  // Hapus bersih tombol keluar topbar dari DOM jika sempat muncul
  document.querySelectorAll('.btn-topbar-exit-admin').forEach(el => el.remove());

  if (sidebarBadge) {
    sidebarBadge.innerHTML = '';
    sidebarBadge.style.display = 'none';
  }

  if (btnClaimSidebar) {
    btnClaimSidebar.innerHTML = '';
    btnClaimSidebar.style.display = 'none';
  }

  // 3. Tombol Cloud Modal (disembunyikan dari topbar/tampilan biasa, hanya diakses via pintu rahasia admin)
  if (btnCloudModal) {
    btnCloudModal.style.display = 'none';
  }

  if (window.feather) feather.replace();
}

// Pengawas DOM Otomatis: Pastikan tombol keluar topbar tidak pernah bisa muncul di bar atas
try {
  const topbarCleanupObserver = new MutationObserver(() => {
    document.querySelectorAll('.btn-topbar-exit-admin').forEach(el => el.remove());
  });
  if (document.body) {
    topbarCleanupObserver.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      topbarCleanupObserver.observe(document.body, { childList: true, subtree: true });
    });
  }
} catch (e) {}

function openClaimAdminModal() {
  const modal = document.getElementById('claimAdminModal');
  const form = document.getElementById('claimAdminForm');
  const roleSelect = document.getElementById('adminRoleSelect');
  const codeInput = document.getElementById('adminAccessCode');
  const activeBox = document.getElementById('activeAdminStatusBox');
  const activeRoleText = document.getElementById('activeAdminRoleText');
  const errorMsg = document.getElementById('claimAdminErrorMsg');
  const submitText = document.getElementById('btnSubmitClaimAdminText');
  const modalDesc = document.getElementById('claimAdminModalDesc');

  if (form) form.reset();
  if (codeInput) codeInput.value = '';
  if (errorMsg) errorMsg.style.display = 'none';

  if (isCurrentUserAdmin) {
    const activeRole = (currentUserProfile && currentUserProfile.role && currentUserProfile.role !== 'Mahasiswa')
      ? currentUserProfile.role
      : 'Pengurus Kelas';
    if (activeBox) activeBox.style.display = 'flex';
    if (activeRoleText) activeRoleText.textContent = `Jabatan: ${activeRole}`;
    if (roleSelect) roleSelect.value = activeRole;
    if (submitText) submitText.textContent = 'Perbarui Jabatan / Kode';
    if (modalDesc) modalDesc.textContent = 'Anda saat ini memegang akses pengurus. Anda dapat mengganti jabatan di bawah atau keluar dari mode pengurus.';
  } else {
    if (activeBox) activeBox.style.display = 'none';
    if (submitText) submitText.textContent = 'Aktifkan Hak Akses';
    if (modalDesc) modalDesc.textContent = 'Khusus untuk Ketua Kelas, Sekretaris, PJ Mata Kuliah, dan Designer Web. Pengurus dapat mempublikasikan tugas & materi resmi yang otomatis masuk ke akun seluruh teman sekelas.';
  }

  if (modal) modal.showModal();
}

function closeClaimAdminModal() {
  const modal = document.getElementById('claimAdminModal');
  if (modal) modal.close();
}

window.openClaimAdminModal = openClaimAdminModal;
window.closeClaimAdminModal = closeClaimAdminModal;

/**
 * Keluar dari Mode Pengurus (Kembali ke Mahasiswa Biasa)
 */
window.exitAdminMode = async function() {
  if (!confirm('Apakah Anda yakin ingin keluar dari mode Pengurus dan kembali sebagai Mahasiswa biasa?')) {
    return;
  }

  try {
    const updatedProfile = {
      ...(currentUserProfile || {}),
      role: 'Mahasiswa',
      isAdmin: false
    };

    currentUserProfile = updatedProfile;
    isCurrentUserAdmin = false;

    try {
      localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(updatedProfile));
    } catch (e) {}

    if (typeof updateUserProfile === 'function' && typeof getCurrentUserUID === 'function') {
      const uid = getCurrentUserUID();
      if (uid) {
        await updateUserProfile(uid, { role: 'Mahasiswa', isAdmin: false });
      }
    }

    updateAdminUI();
    rebuildTugasList();
    rebuildMateriList();
    closeClaimAdminModal();

    showToast('Anda telah keluar dari mode Pengurus dan kembali sebagai Mahasiswa biasa. 👋', 'info');
  } catch (err) {
    console.error('Gagal keluar mode pengurus:', err);
    showToast('Terjadi kesalahan: ' + err.message, 'danger');
  }
};

/**
 * Proses Verifikasi dan Aktivasi Hak Akses Pengurus
 */
async function processClaimAdmin() {
  const roleSelect = document.getElementById('adminRoleSelect');
  const codeInput = document.getElementById('adminAccessCode');
  const errorMsg = document.getElementById('claimAdminErrorMsg');
  const errorText = document.getElementById('claimAdminErrorText');
  const submitBtn = document.getElementById('btnSubmitClaimAdmin');
  const submitText = document.getElementById('btnSubmitClaimAdminText');

  const selectedRole = roleSelect ? roleSelect.value : 'Pengurus Kelas';
  const enteredCode = codeInput ? codeInput.value.trim() : '';

  if (errorMsg) errorMsg.style.display = 'none';

  if (!enteredCode) {
    if (errorMsg && errorText) {
      errorText.textContent = 'Mohon masukkan kode akses pengurus!';
      errorMsg.style.display = 'flex';
    }
    showToast('Mohon masukkan kode akses pengurus!', 'warning');
    if (codeInput) codeInput.focus();
    return;
  }

  const validCodes = ['AD1', 'AD2', 'AD3', 'AD4', 'AD5', 'AD6', 'AD7', 'AD8', 'AD9', 'AD10', 'AD1-AD10'];
  const isCodeValid = (typeof isValidAdminCode === 'function')
    ? isValidAdminCode(enteredCode)
    : validCodes.includes(enteredCode.toUpperCase());

  if (!isCodeValid) {
    if (errorMsg && errorText) {
      errorText.textContent = 'Kode akses salah!';
      errorMsg.style.display = 'flex';
    }
    showToast('Kode akses salah!', 'danger');
    if (codeInput) {
      codeInput.focus();
      codeInput.select();
    }
    return;
  }

  // Tampilkan loading feedback di tombol
  const originalText = submitText ? submitText.textContent : 'Aktifkan Hak Akses';
  if (submitBtn) submitBtn.disabled = true;
  if (submitText) submitText.textContent = 'Memverifikasi... ⏳';

  try {
    // Perbarui profil user
    const updatedProfile = {
      ...(currentUserProfile || {}),
      role: selectedRole,
      isAdmin: true
    };

    currentUserProfile = updatedProfile;
    isCurrentUserAdmin = true;

    // Simpan di LocalStorage
    try {
      localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(updatedProfile));
    } catch (e) {}

    // Simpan di Firestore jika user sedang login
    if (typeof updateUserProfile === 'function' && typeof getCurrentUserUID === 'function') {
      const uid = getCurrentUserUID();
      if (uid) {
        await updateUserProfile(uid, { role: selectedRole, isAdmin: true });
      }
    }

    updateAdminUI();
    rebuildTugasList();
    rebuildMateriList();
    closeClaimAdminModal();

    showToast(`Selamat! Hak akses ${selectedRole} berhasil diaktifkan. Anda kini dapat mempublikasikan tugas & materi resmi kelas! 🎉`, 'success');
  } catch (err) {
    console.error('Gagal aktivasi pengurus:', err);
    showToast('Terjadi kesalahan: ' + err.message, 'danger');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    if (submitText) submitText.textContent = originalText;
  }
}

// Handler Form Klaim Hak Akses Pengurus (Mendukung submit form & klik tombol langsung di HP)
const claimAdminForm = document.getElementById('claimAdminForm');
if (claimAdminForm) {
  claimAdminForm.addEventListener('submit', (e) => {
    e.preventDefault();
    processClaimAdmin();
  });
}

const btnSubmitClaimAdmin = document.getElementById('btnSubmitClaimAdmin');
if (btnSubmitClaimAdmin) {
  btnSubmitClaimAdmin.addEventListener('click', (e) => {
    e.preventDefault();
    processClaimAdmin();
  });
}

// ============================================================================
// SISTEM NOTIFIKASI BROWSER (HP ANDROID, IPHONE, LAPTOP)
// ============================================================================

window.showIOSNotifGuide = function() {
  alert(
    '📱 Panduan Notifikasi di iPhone / iPad:\n\n' +
    '1. Buka website ini di Safari.\n' +
    '2. Ketuk ikon Bagikan (kotak dengan panah atas di bar bawah Safari).\n' +
    '3. Pilih "Tambahkan ke Layar Utama" (Add to Home Screen).\n' +
    '4. Buka aplikasi StudyManage dari Layar Utama HP Anda, lalu izinkan notifikasi saat diminta!'
  );
};

window.showDeniedNotifHelp = function() {
  alert(
    '⚠️ Notifikasi Saat Ini Diblokir di Browser HP:\n\n' +
    'Cara Mengaktifkannya kembali:\n' +
    '1. Ketuk ikon gembok / setelan di bilah alamat browser HP (di sebelah kiri tautan website).\n' +
    '2. Pilih "Izin Situs" atau "Setelan Situs" (Site Settings).\n' +
    '3. Ubah "Notifikasi" menjadi "Izinkan" (Allow).\n' +
    '4. Muat ulang (refresh) halaman ini.'
  );
};

window.requestNotificationPermission = async function() {
  if (!('Notification' in window)) {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS) {
      showIOSNotifGuide();
    } else {
      showToast('Browser ini belum mendukung Web Notification API.', 'warning');
    }
    return;
  }

  try {
    let permission;
    if (window.Notification && Notification.requestPermission) {
      permission = await new Promise((resolve) => {
        const p = Notification.requestPermission(resolve);
        if (p && typeof p.then === 'function') {
          p.then(resolve);
        }
      });
    }

    if (permission === 'granted') {
      showToast('Notifikasi browser aktif! Anda akan menerima alarm pengingat tugas 🔔🎉', 'success');
      testBrowserNotification('StudyManage Aktif! 🔔', 'Pengingat deadline H-1 & tugas baru berhasil diaktifkan di perangkat ini.');
    } else if (permission === 'denied') {
      showToast('Izin notifikasi diblokir di browser HP Anda.', 'warning');
    } else {
      showToast('Izin notifikasi belum diizinkan.', 'info');
    }
    updateNotifPermissionUI();
  } catch (err) {
    console.warn('Gagal meminta izin notifikasi:', err);
    showToast('Terjadi kendala saat meminta izin notifikasi.', 'danger');
  }
};

window.testBrowserNotification = function(title = 'Uji Notifikasi StudyManage 🔔', body = 'Pengingat deadline H-1 & tugas baru aktif di HP Anda!') {
  if (!('Notification' in window)) {
    showToast('Browser ini tidak mendukung notifikasi sistem.', 'warning');
    return;
  }
  if (Notification.permission !== 'granted') {
    showToast('Notifikasi belum diizinkan. Silakan klik "Izinkan Notifikasi" terlebih dahulu.', 'warning');
    return;
  }
  try {
    const notif = new Notification(title, {
      body: body,
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      tag: 'studymanage-test-' + Date.now(),
      renotify: true
    });
    if ('vibrate' in navigator) {
      try { navigator.vibrate([200, 100, 200]); } catch (e) {}
    }
    showToast('Notifikasi uji coba terkirim! Periksa bar notifikasi HP Anda 📲', 'success');
  } catch (err) {
    console.warn('Gagal memunculkan notifikasi:', err);
    showToast('Notifikasi: ' + body, 'info');
  }
};

function updateNotifPermissionUI() {
  const globalBanner = document.getElementById('globalNotifBanner');
  const permBanner = document.getElementById('notifPermissionBanner');
  const permIcon = document.getElementById('notifPermIcon');
  const permTitle = document.getElementById('notifPermTitle');
  const permDesc = document.getElementById('notifPermDesc');
  const permActionWrapper = document.getElementById('notifPermActionWrapper');

  const hasNotifSupport = ('Notification' in window);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const currentPermission = hasNotifSupport ? Notification.permission : 'unsupported';
  const isDismissed = sessionStorage.getItem('studymanage_notif_banner_dismissed') === 'true';

  // 1. Perbarui Banner di Layar Utama / Dashboard
  if (globalBanner) {
    if (!hasNotifSupport) {
      if (isIOS && !isDismissed) {
        globalBanner.style.display = 'flex';
        const gTitle = document.getElementById('globalNotifTitle');
        const gDesc = document.getElementById('globalNotifDesc');
        const gBtn = document.getElementById('btnEnableNotifGlobal');
        if (gTitle) gTitle.textContent = 'Aktifkan Notifikasi di iPhone 📱';
        if (gDesc) gDesc.textContent = 'Ketuk Bagikan lalu "Tambahkan ke Layar Utama" (Add to Home Screen) agar notifikasi berdering.';
        if (gBtn) {
          gBtn.innerHTML = `<i data-feather="info"></i><span>Panduan iPhone</span>`;
          gBtn.onclick = () => showIOSNotifGuide();
        }
      } else {
        globalBanner.style.display = 'none';
      }
    } else if (currentPermission === 'granted') {
      globalBanner.style.display = 'none';
    } else if (currentPermission === 'denied') {
      if (!isDismissed) {
        globalBanner.style.display = 'flex';
        const gTitle = document.getElementById('globalNotifTitle');
        const gDesc = document.getElementById('globalNotifDesc');
        const gBtn = document.getElementById('btnEnableNotifGlobal');
        if (gTitle) gTitle.textContent = 'Notifikasi Diblokir di Browser ⚠️';
        if (gDesc) gDesc.textContent = 'Browser Anda memblokir notifikasi. Buka Setelan Situs browser untuk mengizinkan alarm tugas.';
        if (gBtn) {
          gBtn.innerHTML = `<i data-feather="settings"></i><span>Bantuan Buka Blokir</span>`;
          gBtn.onclick = () => showDeniedNotifHelp();
        }
      } else {
        globalBanner.style.display = 'none';
      }
    } else {
      if (!isDismissed) {
        globalBanner.style.display = 'flex';
        const gTitle = document.getElementById('globalNotifTitle');
        const gDesc = document.getElementById('globalNotifDesc');
        const gBtn = document.getElementById('btnEnableNotifGlobal');
        if (gTitle) gTitle.textContent = 'Aktifkan Notifikasi Tugas di HP Anda 🔔';
        if (gDesc) gDesc.textContent = 'Dapatkan alarm pengingat H-1 deadline & pemberitahuan tugas baru otomatis.';
        if (gBtn) {
          gBtn.innerHTML = `<i data-feather="bell"></i><span>Izinkan Notifikasi</span>`;
          gBtn.onclick = () => requestNotificationPermission();
        }
      } else {
        globalBanner.style.display = 'none';
      }
    }
  }

  // 2. Perbarui Banner di Menu Dropdown Lonceng
  if (permBanner && permActionWrapper) {
    permBanner.style.display = 'flex';

    if (!hasNotifSupport) {
      if (permIcon) permIcon.style.background = 'var(--text-muted)';
      if (permTitle) permTitle.textContent = isIOS ? 'Notifikasi iPhone' : 'Notifikasi Web';
      if (permDesc) permDesc.textContent = isIOS ? 'Tambahkan ke Layar Utama (Add to Home Screen) untuk aktifkan.' : 'Browser ini belum mendukung notifikasi sistem.';
      permActionWrapper.innerHTML = `
        <button type="button" class="btn-enable-notif" onclick="showIOSNotifGuide()">Info</button>
      `;
    } else if (currentPermission === 'granted') {
      if (permIcon) permIcon.style.background = 'var(--emerald)';
      if (permIcon) permIcon.innerHTML = '<i data-feather="check"></i>';
      if (permTitle) permTitle.textContent = 'Notifikasi HP Aktif ✅';
      if (permDesc) permDesc.textContent = 'Pengingat deadline H-1 & tugas baru aktif di HP Anda.';
      permActionWrapper.innerHTML = `
        <button type="button" class="btn-enable-notif btn-test-notif" id="btnTestNotif" onclick="testBrowserNotification()" title="Uji notifikasi berdering di HP">
          <i data-feather="bell"></i>
          <span>Tes Bunyi</span>
        </button>
      `;
    } else if (currentPermission === 'denied') {
      if (permIcon) permIcon.style.background = '#f59e0b';
      if (permIcon) permIcon.innerHTML = '<i data-feather="alert-triangle"></i>';
      if (permTitle) permTitle.textContent = 'Notifikasi Diblokir ⚠️';
      if (permDesc) permDesc.textContent = 'Izin diblokir. Buka Setelan Browser ➔ Izin Situs ➔ Notifikasi.';
      permActionWrapper.innerHTML = `
        <button type="button" class="btn-enable-notif" style="background: #f59e0b;" onclick="showDeniedNotifHelp()">Bantuan</button>
      `;
    } else {
      if (permIcon) permIcon.style.background = 'var(--primary)';
      if (permIcon) permIcon.innerHTML = '<i data-feather="bell"></i>';
      if (permTitle) permTitle.textContent = 'Aktifkan Notifikasi di HP 🔔';
      if (permDesc) permDesc.textContent = 'Dapatkan alarm tugas baru & pengingat H-1 deadline.';
      permActionWrapper.innerHTML = `
        <button type="button" class="btn-enable-notif" id="btnRequestNotifPerm" onclick="requestNotificationPermission()">Izinkan</button>
      `;
    }
  }

  if (window.feather) feather.replace();
}
window.updateNotifPermissionUI = updateNotifPermissionUI;

// Event Listener Tombol Tutup Banner di Halaman Utama
const btnDismissNotifBanner = document.getElementById('btnDismissNotifBanner');
if (btnDismissNotifBanner) {
  btnDismissNotifBanner.addEventListener('click', () => {
    sessionStorage.setItem('studymanage_notif_banner_dismissed', 'true');
    const globalBanner = document.getElementById('globalNotifBanner');
    if (globalBanner) globalBanner.style.display = 'none';
  });
}

// Event Listener Tombol Izinkan Global
const btnEnableNotifGlobal = document.getElementById('btnEnableNotifGlobal');
if (btnEnableNotifGlobal) {
  btnEnableNotifGlobal.addEventListener('click', () => {
    requestNotificationPermission();
  });
}

/**
 * 5. FIREBASE CLOUD REAL-TIME CALLBACKS
 */
window.handleCloudPersonalTugas = function(cloudData) {
  personalTugas = Array.isArray(cloudData) ? cloudData : [];
  rebuildTugasList();
};

// Pelacak ID tugas dan materi kelas agar notifikasi langsung muncul di HP mahasiswa biasa
const NOTIFIED_TUGAS_KEY = 'studysync_notified_tugas_ids';
const NOTIFIED_MATERI_KEY = 'studysync_notified_materi_ids';

function getNotifiedIds(key) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  } catch (e) {
    return new Set();
  }
}

function saveNotifiedIds(key, setObj) {
  try {
    localStorage.setItem(key, JSON.stringify([...setObj]));
  } catch (e) {}
}

let seenClassTugasIds = getNotifiedIds(NOTIFIED_TUGAS_KEY);
let seenClassMateriIds = getNotifiedIds(NOTIFIED_MATERI_KEY);
let isFirstTugasCloudSync = true;
let isFirstMateriCloudSync = true;

window.markClassTugasSeen = function(taskId) {
  if (!taskId) return;
  seenClassTugasIds.add(taskId);
  saveNotifiedIds(NOTIFIED_TUGAS_KEY, seenClassTugasIds);
};

window.markClassMateriSeen = function(materiId) {
  if (!materiId) return;
  seenClassMateriIds.add(materiId);
  saveNotifiedIds(NOTIFIED_MATERI_KEY, seenClassMateriIds);
};

window.handleCloudKelasTugas = function(cloudData) {
  const incoming = Array.isArray(cloudData) ? cloudData : [];

  if (isFirstTugasCloudSync) {
    incoming.forEach(t => { if (t && t.id) seenClassTugasIds.add(t.id); });
    saveNotifiedIds(NOTIFIED_TUGAS_KEY, seenClassTugasIds);
    isFirstTugasCloudSync = false;
  } else {
    incoming.forEach(task => {
      if (task && task.id && !seenClassTugasIds.has(task.id)) {
        seenClassTugasIds.add(task.id);
        saveNotifiedIds(NOTIFIED_TUGAS_KEY, seenClassTugasIds);

        const judul = task.judul || 'Tugas Baru';
        const matkul = task.matkul || 'Kuliah';
        const deadlineStr = task.deadline ? ` (Deadline: ${formatIndoDate(task.deadline)})` : '';
        const author = task.authorNama ? ` dari ${task.authorJabatan || 'Pengurus'}` : '';

        addNotification({
          type: 'tugas',
          title: `Tugas Baru: ${matkul} 📢`,
          message: `${judul}${deadlineStr}${author}`,
          time: task.createdAt || new Date().toISOString(),
          taskId: task.id
        });

        showToast(`📢 Tugas Baru dari Pengurus: ${judul} (${matkul})`, 'info');
        triggerBrowserPushNotification(`Tugas Baru: ${matkul} 📢`, `${judul}${deadlineStr}`);
      }
    });
  }

  classTugas = incoming;
  rebuildTugasList();
  setTimeout(autoSyncLocalFilesToCloud, 1000);
};

window.handleCloudTugasStatus = function(statusMap) {
  tugasStatusMap = statusMap || {};
  try {
    localStorage.setItem(TUGAS_STATUS_STORAGE_KEY, JSON.stringify(tugasStatusMap));
  } catch (e) {}
  rebuildTugasList();
};

window.handleCloudPersonalMateri = function(cloudData) {
  personalMateri = Array.isArray(cloudData) ? cloudData : [];
  rebuildMateriList();
};

window.handleCloudKelasMateri = function(cloudData) {
  const incoming = Array.isArray(cloudData) ? cloudData : [];

  if (isFirstMateriCloudSync) {
    incoming.forEach(m => { if (m && m.id) seenClassMateriIds.add(m.id); });
    saveNotifiedIds(NOTIFIED_MATERI_KEY, seenClassMateriIds);
    isFirstMateriCloudSync = false;
  } else {
    incoming.forEach(m => {
      if (m && m.id && !seenClassMateriIds.has(m.id)) {
        seenClassMateriIds.add(m.id);
        saveNotifiedIds(NOTIFIED_MATERI_KEY, seenClassMateriIds);

        const judul = m.judul || 'Materi Baru';
        const matkul = m.matkul || 'Kuliah';
        const pert = m.pertemuan ? `Pertemuan ${m.pertemuan}: ` : '';

        addNotification({
          type: 'materi',
          title: `Materi Baru: ${matkul} 📚`,
          message: `${pert}${judul}`,
          time: m.createdAt || new Date().toISOString(),
          taskId: m.id
        });

        showToast(`📚 Materi Baru dari Pengurus: ${pert}${judul} (${matkul})`, 'info');
        triggerBrowserPushNotification(`Materi Baru: ${matkul} 📚`, `${pert}${judul}`);
      }
    });
  }

  classMateri = incoming;
  rebuildMateriList();
  setTimeout(autoSyncLocalFilesToCloud, 1000);
};

/**
 * Auto-Heal: Sinkronkan data file fisik lokal ke Firestore secara otomatis
 * Jika suatu tugas/materi belum punya link/data di cloud tetapi perangkat ini memiliki file fisiknya di IndexedDB
 */
async function autoSyncLocalFilesToCloud() {
  if (typeof isFirebaseConnected === 'undefined' || !isFirebaseConnected || typeof firestoreDb === 'undefined' || !firestoreDb) return;
  try {
    for (const task of (classTugas || [])) {
      if (task.file && task.file.id && !task.file.downloadUrl && !task.file.data) {
        const local = await getUploadedFile(task.file.id);
        if (local && local.data && local.data.length < 800000) {
          task.file.data = local.data;
          try {
            await firestoreDb.collection('kelas_tugas').doc(task.id).update({
              'file.data': local.data
            });
            console.log('✅ Berkas tugas otomatis dipulihkan ke cloud:', task.file.name);
          } catch (e) {}
        }
      }
    }
    for (const mat of (classMateri || [])) {
      if (mat.file && mat.file.id && !mat.file.downloadUrl && !mat.file.data) {
        const local = await getUploadedFile(mat.file.id);
        if (local && local.data && local.data.length < 800000) {
          mat.file.data = local.data;
          try {
            await firestoreDb.collection('kelas_materi').doc(mat.id).update({
              'file.data': local.data
            });
            console.log('✅ Berkas materi otomatis dipulihkan ke cloud:', mat.file.name);
          } catch (e) {}
        }
      }
    }
  } catch (err) {
    console.warn('Auto-heal error:', err);
  }
}

/**
 * 6. NOTIFICATION BELL TOGGLE & EVENT LISTENERS
 */
const btnNotifBell = document.getElementById('btnNotifBell');
const notifDropdown = document.getElementById('notifDropdown');
const btnMarkAllNotifsRead = document.getElementById('btnMarkAllNotifsRead');

if (btnNotifBell && notifDropdown) {
  btnNotifBell.addEventListener('click', (e) => {
    e.stopPropagation();
    const isShowing = notifDropdown.style.display === 'block';
    notifDropdown.style.display = isShowing ? 'none' : 'block';
    if (!isShowing) {
      renderNotificationsUI();
    }
  });

  // Tutup dropdown saat klik di luar
  document.addEventListener('click', (e) => {
    if (notifDropdown && !notifDropdown.contains(e.target) && !btnNotifBell.contains(e.target)) {
      notifDropdown.style.display = 'none';
    }
  });
}

if (btnMarkAllNotifsRead) {
  btnMarkAllNotifsRead.addEventListener('click', (e) => {
    e.stopPropagation();
    markAllNotificationsRead();
  });
}

// ============================================================================
// 10. MASTER ADMIN: AKSES SEMUA DATA MAHASISWA & PROGRES TUGAS (SANDI: 00000000)
// ============================================================================
const SUPER_ADMIN_SECRET = '00000000';
const SUPER_ADMIN_SESSION_KEY = 'studymanage_super_admin_verified';

let cachedAllStudents = [];
let cachedStudentsTaskStatus = {};
let pendingDeleteStudentTarget = null;
let academicBadgeClicks = 0;
let academicBadgeTimer = null;

/**
 * Handle tombol / trigger rahasia "Data Mahasiswa"
 * SELALU meminta kata sandi Master Admin (00000000) setiap kali dipanggil!
 */
window.handleOpenStudentsData = function() {
  window.openSuperAdminAuthModal();
};

/**
 * Handle aksi ketuk 5x pada Badge Semester 3
 */
window.handleAcademicBadgeClick = function(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  academicBadgeClicks++;
  clearTimeout(academicBadgeTimer);

  // Waktu toleransi 4 detik untuk 5 ketukan
  academicBadgeTimer = setTimeout(() => {
    academicBadgeClicks = 0;
  }, 4000);

  if (academicBadgeClicks >= 5) {
    academicBadgeClicks = 0;
    clearTimeout(academicBadgeTimer);
    // Hapus sesi lama agar SELALU meminta sandi 00000000!
    try {
      sessionStorage.removeItem(SUPER_ADMIN_SESSION_KEY);
    } catch (err) {}
    window.openSuperAdminAuthModal();
  }
};

/**
 * Modal Verifikasi Sandi Master Admin
 */
window.openSuperAdminAuthModal = function() {
  const modal = document.getElementById('superAdminAuthModal');
  const input = document.getElementById('superAdminSecretInput');
  const errorMsg = document.getElementById('superAdminAuthErrorMsg');
  if (errorMsg) errorMsg.style.display = 'none';
  if (input) {
    input.value = '';
    input.type = 'password';
  }
  const icon = document.querySelector('#btnToggleSuperAdminPwd i');
  if (icon) icon.setAttribute('data-feather', 'eye');
  if (modal) modal.showModal();
  if (input) setTimeout(() => input.focus(), 150);
  if (window.feather) feather.replace();
};

window.closeSuperAdminAuthModal = function() {
  const modal = document.getElementById('superAdminAuthModal');
  const input = document.getElementById('superAdminSecretInput');
  const errorMsg = document.getElementById('superAdminAuthErrorMsg');
  if (errorMsg) errorMsg.style.display = 'none';
  if (input) input.value = '';
  if (modal) modal.close();
};

/**
 * Modal Dashboard Data Seluruh Mahasiswa
 */
window.openStudentsDashboardModal = function() {
  const modal = document.getElementById('studentsDashboardModal');
  if (modal) modal.showModal();
  loadAllStudentsData(false);
  if (window.feather) feather.replace();
};

window.closeStudentsDashboardModal = function() {
  const modal = document.getElementById('studentsDashboardModal');
  if (modal) modal.close();
  try {
    sessionStorage.removeItem(SUPER_ADMIN_SESSION_KEY);
  } catch (err) {}
};

window.reloadStudentsDashboard = function() {
  showToast('Memperbarui data seluruh mahasiswa dari cloud... ⏳', 'info');
  loadAllStudentsData(true);
};

/**
 * Ambil data seluruh mahasiswa dari cloud & hitung progres tugas
 */
async function loadAllStudentsData(forceRefresh = false) {
  const loading = document.getElementById('studentsLoadingState');
  const wrapper = document.getElementById('studentsListWrapper');
  if (loading) loading.style.display = 'flex';
  if (wrapper) wrapper.style.display = 'none';

  try {
    let students = [];
    if (typeof window.fetchAllStudentsData === 'function') {
      students = await window.fetchAllStudentsData();
    }

    cachedAllStudents = Array.isArray(students) ? students : [];

    // Ambil status pengerjaan tugas kelas untuk setiap mahasiswa
    const statusPromises = cachedAllStudents.map(async (s) => {
      if (s.uid && typeof window.fetchStudentTaskStatus === 'function') {
        try {
          const statusMap = await window.fetchStudentTaskStatus(s.uid);
          cachedStudentsTaskStatus[s.uid] = statusMap || {};
        } catch (e) {
          cachedStudentsTaskStatus[s.uid] = {};
        }
      } else {
        cachedStudentsTaskStatus[s.uid] = {};
      }
    });

    await Promise.all(statusPromises);

    // Update Quick Stats
    const totalCount = cachedAllStudents.length;
    const pengurusCount = cachedAllStudents.filter(s => s.isAdmin || (s.role && s.role !== 'Mahasiswa')).length;
    const classTasksCount = (classTugas || []).length;

    const elTotal = document.getElementById('statTotalStudents');
    const elPengurus = document.getElementById('statTotalPengurus');
    const elTasks = document.getElementById('statTotalClassTasks');
    if (elTotal) elTotal.textContent = totalCount;
    if (elPengurus) elPengurus.textContent = pengurusCount;
    if (elTasks) elTasks.textContent = classTasksCount;

    filterStudentsListUI();
  } catch (err) {
    console.error('Gagal memuat data mahasiswa:', err);
    showToast('Gagal memuat data mahasiswa: ' + err.message, 'danger');
  } finally {
    if (loading) loading.style.display = 'none';
    if (wrapper) wrapper.style.display = 'block';
  }
}

/**
 * Filter data mahasiswa di tampilan UI
 */
window.filterStudentsListUI = function() {
  const searchInput = document.getElementById('studentsSearchInput');
  const roleFilter = document.getElementById('studentsRoleFilter');
  const query = (searchInput ? searchInput.value : '').trim().toLowerCase();
  const selectedRole = roleFilter ? roleFilter.value : 'ALL';

  const filtered = cachedAllStudents.filter(s => {
    // Filter pencarian teks
    const matchQuery = !query ||
      (s.nama && s.nama.toLowerCase().includes(query)) ||
      (s.nim && s.nim.toLowerCase().includes(query)) ||
      (s.email && s.email.toLowerCase().includes(query));

    if (!matchQuery) return false;

    // Filter jabatan / role
    if (selectedRole === 'MAHASISWA') {
      return !s.isAdmin && (!s.role || s.role === 'Mahasiswa');
    }
    if (selectedRole === 'PENGURUS') {
      return s.isAdmin || (s.role && s.role !== 'Mahasiswa');
    }
    return true;
  });

  renderStudentsListUI(filtered);
};

/**
 * Render kartu daftar mahasiswa
 */
function renderStudentsListUI(students) {
  const container = document.getElementById('studentsListContainer');
  if (!container) return;

  if (!students || students.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
        <i data-feather="user-x" style="width: 46px; height: 46px; stroke-width: 1.5; margin-bottom: 12px; opacity: 0.5;"></i>
        <h4 style="font-size: 1rem; color: var(--text-main); margin-bottom: 4px;">Tidak Ada Data Mahasiswa</h4>
        <p style="font-size: 0.85rem;">Tidak ditemukan mahasiswa yang sesuai dengan kata kunci pencarian atau filter jabatan.</p>
      </div>
    `;
    if (window.feather) feather.replace();
    return;
  }

  const tasksList = classTugas || [];
  const totalTasks = tasksList.length;

  const myUid = (typeof getCurrentUserUID === 'function' ? getCurrentUserUID() : '') || '';
  const myNim = (currentUserProfile && currentUserProfile.nim) ? String(currentUserProfile.nim).trim() : '';

  let html = '';
  students.forEach(s => {
    const initial = (s.nama || 'M').trim().charAt(0).toUpperCase();
    const isPengurus = s.isAdmin || (s.role && s.role !== 'Mahasiswa');
    const roleLabel = s.role || (isPengurus ? 'Pengurus Kelas' : 'Mahasiswa');
    const rolePillClass = isPengurus ? 'admin' : 'member';

    // Cek apakah ini akun pengguna yang sedang login saat ini
    const isSelf = (myUid && s.uid === myUid) || (myNim && s.nim && String(s.nim).trim() === myNim);

    // Hitung status tugas kelas mahasiswa ini
    const statusMap = cachedStudentsTaskStatus[s.uid] || {};
    let completedCount = 0;
    if (totalTasks > 0) {
      completedCount = tasksList.filter(t => statusMap[t.id] === true).length;
    }
    const pct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

    html += `
      <div class="student-card-row">
        <div class="student-card-left">
          <div class="student-avatar-md">${initial}</div>
          <div class="student-info-main">
            <div class="student-name-row">
              <span class="student-name-text">${escapeHtml(s.nama)}</span>
              <span class="student-role-pill ${rolePillClass}">
                <i data-feather="${isPengurus ? 'shield' : 'user'}"></i>
                <span>${escapeHtml(roleLabel)}</span>
              </span>
            </div>
            <div class="student-meta-text">
              <span><i data-feather="hash"></i> NIM: <strong>${escapeHtml(s.nim || '-')}</strong></span>
              <span><i data-feather="mail"></i> ${escapeHtml(s.email || '-')}</span>
            </div>
          </div>
        </div>

        <div class="student-progress-col">
          <div class="student-progress-info">
            <span>${completedCount}/${totalTasks} Tugas (${pct}%)</span>
          </div>
          <div class="student-progress-bar-wrap">
            <div class="progress-bar-fill-track" style="width: ${pct}%;"></div>
          </div>
          <div class="student-card-buttons-row">
            <button type="button" class="btn-detail-progress" onclick="openStudentProgressDetail('${s.uid}')" title="Lihat rincian tugas mahasiswa">
              <i data-feather="list"></i>
              <span>Rincian Tugas</span>
            </button>
            ${isSelf
              ? `<span class="current-user-tag" title="Akun Anda yang sedang aktif"><i data-feather="check"></i> Akun Anda</span>`
              : `<button type="button" class="btn-delete-student" onclick="promptDeleteStudent('${s.uid}')" title="Hapus akun mahasiswa dari sistem portal">
                  <i data-feather="trash-2"></i>
                  <span>Hapus</span>
                </button>`
            }
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  if (window.feather) feather.replace();
}

/**
 * Modal Rincian Tugas Resmi Kelas per Mahasiswa
 */
window.openStudentProgressDetail = function(uid) {
  const modal = document.getElementById('studentProgressDetailModal');
  const student = cachedAllStudents.find(s => s.uid === uid);
  if (!student) return;

  const initial = (student.nama || 'M').trim().charAt(0).toUpperCase();
  const elAvatar = document.getElementById('detailStudentAvatar');
  const elName = document.getElementById('detailStudentName');
  const elMeta = document.getElementById('detailStudentMeta');
  const elRatio = document.getElementById('detailProgressRatio');
  const elBar = document.getElementById('detailProgressBarFill');
  const elList = document.getElementById('detailTasksList');

  if (elAvatar) elAvatar.textContent = initial;
  if (elName) elName.textContent = student.nama || 'Mahasiswa';
  if (elMeta) elMeta.textContent = `NIM: ${student.nim || '-'} • ${student.role || 'Mahasiswa'}`;

  const tasksList = classTugas || [];
  const totalTasks = tasksList.length;
  const statusMap = cachedStudentsTaskStatus[uid] || {};

  let completedCount = 0;
  if (totalTasks > 0) {
    completedCount = tasksList.filter(t => statusMap[t.id] === true).length;
  }
  const pct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  if (elRatio) elRatio.textContent = `${completedCount} / ${totalTasks} Selesai (${pct}%)`;
  if (elBar) elBar.style.width = `${pct}%`;

  if (elList) {
    if (totalTasks === 0) {
      elList.innerHTML = `
        <div style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 0.86rem;">
          Belum ada tugas resmi kelas yang diterbitkan oleh pengurus.
        </div>
      `;
    } else {
      let listHtml = '';
      tasksList.forEach(t => {
        const isDone = statusMap[t.id] === true;
        listHtml += `
          <div class="detail-task-card">
            <div style="min-width: 0; flex: 1;">
              <div class="detail-task-title">${escapeHtml(t.judul || 'Tugas')}</div>
              <div class="detail-task-sub">
                ${escapeHtml(t.matkul || 'Mata Kuliah')}${t.deadline ? ' • Deadline: ' + escapeHtml(t.deadline) : ''}
              </div>
            </div>
            <span class="detail-task-badge ${isDone ? 'done' : 'pending'}">
              ${isDone ? '✓ Selesai' : '⏳ Belum'}
            </span>
          </div>
        `;
      });
      elList.innerHTML = listHtml;
    }
  }

  if (modal) modal.showModal();
  if (window.feather) feather.replace();
};

window.closeStudentProgressDetailModal = function() {
  const modal = document.getElementById('studentProgressDetailModal');
  if (modal) modal.close();
};

/**
 * Ekspor Data Mahasiswa & Status Tugas ke Berkas CSV
 */
window.exportStudentsToCSV = function() {
  if (!cachedAllStudents || cachedAllStudents.length === 0) {
    showToast('Tidak ada data mahasiswa untuk diekspor.', 'warning');
    return;
  }

  const tasksList = classTugas || [];
  const totalTasks = tasksList.length;

  const headers = ['NIM', 'Nama Mahasiswa', 'Email', 'Jabatan', 'Total Tugas Kelas', 'Tugas Selesai', 'Persentase (%)', 'Tanggal Terdaftar'];
  const rows = [headers];

  cachedAllStudents.forEach(s => {
    const statusMap = cachedStudentsTaskStatus[s.uid] || {};
    let completedCount = 0;
    if (totalTasks > 0) {
      completedCount = tasksList.filter(t => statusMap[t.id] === true).length;
    }
    const pct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

    rows.push([
      `"${(s.nim || '').replace(/"/g, '""')}"`,
      `"${(s.nama || '').replace(/"/g, '""')}"`,
      `"${(s.email || '').replace(/"/g, '""')}"`,
      `"${(s.role || 'Mahasiswa').replace(/"/g, '""')}"`,
      totalTasks,
      completedCount,
      `${pct}%`,
      `"${(s.createdAt || '').replace(/"/g, '""')}"`
    ]);
  });

  const csvContent = '\uFEFF' + rows.map(e => e.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rekap_data_mahasiswa_studymanage_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('Data mahasiswa berhasil diekspor ke format CSV! 📊', 'success');
};

// Event listener form sandi & tombol toggle password master admin
const superAdminAuthForm = document.getElementById('superAdminAuthForm');
const superAdminSecretInput = document.getElementById('superAdminSecretInput');
const btnToggleSuperAdminPwd = document.getElementById('btnToggleSuperAdminPwd');
const superAdminAuthErrorMsg = document.getElementById('superAdminAuthErrorMsg');

if (superAdminAuthForm) {
  superAdminAuthForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const entered = (superAdminSecretInput ? superAdminSecretInput.value : '').trim();
    if (entered === SUPER_ADMIN_SECRET) {
      if (superAdminAuthErrorMsg) superAdminAuthErrorMsg.style.display = 'none';
      sessionStorage.setItem(SUPER_ADMIN_SESSION_KEY, 'true');
      closeSuperAdminAuthModal();
      showToast('Akses Master Admin diverifikasi! Selamat datang. 🛡️', 'success');
      openStudentsDashboardModal();
    } else {
      if (superAdminAuthErrorMsg) {
        superAdminAuthErrorMsg.style.display = 'flex';
      }
      showToast('Kata sandi salah! Akses ditolak.', 'danger');
      if (superAdminSecretInput) {
        superAdminSecretInput.focus();
        superAdminSecretInput.select();
      }
    }
  });
}

if (btnToggleSuperAdminPwd && superAdminSecretInput) {
  btnToggleSuperAdminPwd.addEventListener('click', () => {
    const isPwd = superAdminSecretInput.type === 'password';
    superAdminSecretInput.type = isPwd ? 'text' : 'password';
    const icon = btnToggleSuperAdminPwd.querySelector('i');
    if (icon) {
      icon.setAttribute('data-feather', isPwd ? 'eye-off' : 'eye');
      if (window.feather) feather.replace();
    }
  });
}

/**
 * Buka modal konfirmasi hapus akun mahasiswa
 */
window.promptDeleteStudent = function(uid) {
  const student = cachedAllStudents.find(s => s.uid === uid);
  if (!student) return;

  pendingDeleteStudentTarget = student;

  const elName = document.getElementById('deleteTargetStudentName');
  const elNim = document.getElementById('deleteTargetStudentNim');
  const elEmail = document.getElementById('deleteTargetStudentEmail');
  const modal = document.getElementById('confirmDeleteStudentModal');

  if (elName) elName.textContent = student.nama || 'Mahasiswa';
  if (elNim) elNim.textContent = 'NIM: ' + (student.nim || '-');
  if (elEmail) elEmail.textContent = 'Email: ' + (student.email || '-');

  if (modal) modal.showModal();
  if (window.feather) feather.replace();
};

window.closeConfirmDeleteStudentModal = function() {
  pendingDeleteStudentTarget = null;
  const modal = document.getElementById('confirmDeleteStudentModal');
  if (modal) modal.close();
};

/**
 * Eksekusi penghapusan akun mahasiswa dari Cloud Firestore & nim_index
 */
window.executeDeleteStudent = async function() {
  if (!pendingDeleteStudentTarget) return;

  const target = pendingDeleteStudentTarget;
  const btn = document.getElementById('btnExecuteDeleteStudent');
  const btnText = document.getElementById('btnExecuteDeleteStudentText');

  if (btn) btn.disabled = true;
  if (btnText) btnText.textContent = 'Menghapus... ⏳';

  try {
    if (typeof window.deleteStudentAccount === 'function') {
      await window.deleteStudentAccount(target.uid, target.nim);
    } else {
      throw new Error('Fungsi deleteStudentAccount tidak tersedia.');
    }

    // Hapus dari memori lokal
    cachedAllStudents = cachedAllStudents.filter(s => s.uid !== target.uid);
    delete cachedStudentsTaskStatus[target.uid];

    // Perbarui angka statistik dashboard
    const totalCount = cachedAllStudents.length;
    const pengurusCount = cachedAllStudents.filter(s => s.isAdmin || (s.role && s.role !== 'Mahasiswa')).length;
    const elTotal = document.getElementById('statTotalStudents');
    const elPengurus = document.getElementById('statTotalPengurus');
    if (elTotal) elTotal.textContent = totalCount;
    if (elPengurus) elPengurus.textContent = pengurusCount;

    // Render ulang tampilan daftar mahasiswa
    filterStudentsListUI();

    closeConfirmDeleteStudentModal();
    showToast(`Akun "${target.nama}" berhasil dihapus permanen dari sistem! 🗑️`, 'success');
  } catch (err) {
    console.error('Gagal menghapus akun mahasiswa:', err);
    showToast('Gagal menghapus akun: ' + err.message, 'danger');
  } finally {
    if (btn) btn.disabled = false;
    if (btnText) btnText.textContent = 'Hapus Permanen';
  }
};

/**
 * Aksi Rahasia: Klik Badge Semester 3 sebanyak 5x untuk memicu Master Admin
 */
function setupAcademicBadgeSecretTrigger() {
  const badge = document.getElementById('academicBadge') || document.querySelector('.academic-badge');
  if (!badge) return;

  badge.style.cursor = 'pointer';
  badge.onclick = window.handleAcademicBadgeClick;
}

// Inisialisasi listener rahasia
setupAcademicBadgeSecretTrigger();

// ============================================================================
// 11. INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();

  // Set Tanggal Hari Ini di Header Banner
  const now = new Date();
  if (currentDateDisplay) {
    currentDateDisplay.textContent = now.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  // Tampilkan profil dari cache lokal jika ada sambil menunggu Firestore
  const cachedProfile = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
  if (cachedProfile) {
    try {
      updateStudentProfileUI(JSON.parse(cachedProfile));
    } catch (e) {}
  } else {
    updateAdminUI();
  }

  try { rebuildTugasList(); } catch (e) { console.warn('Init rebuildTugasList error:', e); }
  try { rebuildMateriList(); } catch (e) { console.warn('Init rebuildMateriList error:', e); }
  try { renderMatkul(); } catch (e) { console.warn('Init renderMatkul error:', e); }
  try { renderCourseFilters(); } catch (e) { console.warn('Init renderCourseFilters error:', e); }
  try { renderTugas(); } catch (e) { console.warn('Init renderTugas error:', e); }
  try { renderMateri(); } catch (e) { console.warn('Init renderMateri error:', e); }
  try { renderNotificationsUI(); } catch (e) { console.warn('Init renderNotificationsUI error:', e); }
  try { updateNotifPermissionUI(); } catch (e) { console.warn('Init updateNotifPermissionUI error:', e); }
  try { checkDeadlinesAndNotify(); } catch (e) { console.warn('Init checkDeadlinesAndNotify error:', e); }

  // Inisialisasi Firebase & Auth State Listener
  if (typeof initFirebase === 'function') {
    try {
      const connected = initFirebase();
      if (connected) {
        setupAuthObserver();
      }
    } catch (e) {
      console.warn('initFirebase invocation error:', e);
    }
  }

  try { setupAcademicBadgeSecretTrigger(); } catch (e) { console.warn('Init setupAcademicBadgeSecretTrigger error:', e); }
  try { feather.replace(); } catch (e) { console.warn('feather.replace error:', e); }

  // Registrasi Service Worker untuk PWA (Dapat diinstal di Android & Desktop)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      console.log('📱 Service Worker PWA aktif:', reg.scope);
    }).catch((err) => {
      console.warn('PWA SW registration skipped:', err);
    });
  }
});

