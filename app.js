/**
 * StudySync - Portal Tugas & Materi Kuliah
 * Vanilla JavaScript (ES6+)
 */

// ============================================================================
// 1. DATA AWAL & LOCAL STORAGE
// ============================================================================
const TUGAS_STORAGE_KEY = 'studysync_tugas_v1';
const MATERI_STORAGE_KEY = 'studysync_materi_v1';
const MATKUL_STORAGE_KEY = 'studysync_matkul_v1';
const THEME_STORAGE_KEY = 'studysync_theme_v1';
const AUTH_STORAGE_KEY = 'studysync_auth_state_v2';
const USER_PROFILE_STORAGE_KEY = 'studysync_profile_v2';

// Data Mata Kuliah Default
const DEFAULT_MATKUL = [
  {
    id: 'mk-1',
    nama: 'Pemrograman Web',
    kode: 'IF2101',
    sks: 3,
    dosen: 'Dr. Ir. Budi Santoso, M.Kom.',
    jadwal: 'Senin, 08:00 - 10:30',
    ruangan: 'Lab Komputer 3',
    warna: '#4f46e5'
  },
  {
    id: 'mk-2',
    nama: 'Basis Data',
    kode: 'IF2102',
    sks: 3,
    dosen: 'Siti Aminah, S.Kom., M.T.',
    jadwal: 'Rabu, 13:00 - 15:30',
    ruangan: 'Ruang Teori 304',
    warna: '#06b6d4'
  },
  {
    id: 'mk-3',
    nama: 'Algoritma & Struktur Data',
    kode: 'IF2103',
    sks: 4,
    dosen: 'Prof. Hendra Wijaya',
    jadwal: 'Kamis, 10:00 - 12:30',
    ruangan: 'Lab Algoritma 1',
    warna: '#10b981'
  }
];

// Contoh data default jika pengguna baru pertama kali membuka website
const DEFAULT_TUGAS = [
  {
    id: 'tgs-1',
    judul: 'Tugas 1: Membuat Layout Dashboard dengan HTML & CSS',
    matkul: 'Pemrograman Web',
    deadline: '2026-10-08T23:59',
    prioritas: 'Tinggi',
    deskripsi: 'Gunakan CSS Grid atau Flexbox, pastikan tampilan responsif di layar HP dan laptop.',
    completed: false
  },
  {
    id: 'tgs-2',
    judul: 'Praktikum: Perancangan Skema Database Rumah Sakit',
    matkul: 'Basis Data',
    deadline: '2026-10-12T17:00',
    prioritas: 'Sedang',
    deskripsi: 'Buat diagram ERD, lakukan normalisasi hingga bentuk 3NF, dan kumpulkan dalam format PDF.',
    completed: false
  },
  {
    id: 'tgs-3',
    judul: 'Latihan Soal: Analisis Kompleksitas Waktu Big-O',
    matkul: 'Algoritma & Struktur Data',
    deadline: '2026-10-02T20:00',
    prioritas: 'Rendah',
    deskripsi: 'Analisis kompleksitas algoritma sorting (Merge Sort vs Quick Sort).',
    completed: true
  }
];

const DEFAULT_MATERI = [
  {
    id: 'mat-1',
    judul: 'Pengantar HTML5 Semantik, Form Modern, dan Box Model',
    matkul: 'Pemrograman Web',
    pertemuan: 1,
    tanggal: '2026-09-22',
    link: 'https://drive.google.com',
    catatan: 'Membahas pentingnya tag semantik (<header>, <nav>, <main>, <aside>, <section>) untuk aksesibilitas dan SEO.'
  },
  {
    id: 'mat-2',
    judul: 'Konsep Dasar ERD (Entity-Relationship Diagram) dan Kardinalitas',
    matkul: 'Basis Data',
    pertemuan: 2,
    tanggal: '2026-09-28',
    link: 'https://drive.google.com',
    catatan: 'Aturan kardinalitas: 1-to-1, 1-to-Many, dan Many-to-Many. Primary Key dan Foreign Key wajib ditentukan.'
  },
  {
    id: 'mat-3',
    judul: 'Struktur Data Pohon (Binary Search Tree) dan Graf',
    matkul: 'Algoritma & Struktur Data',
    pertemuan: 3,
    tanggal: '2026-10-01',
    link: '',
    catatan: 'Operasi traversal pohon: In-Order, Pre-Order, dan Post-Order. Penerapan BST untuk pencarian data efisien O(log n).'
  }
];

let matkulList = loadFromStorage(MATKUL_STORAGE_KEY, DEFAULT_MATKUL);
let tugasList = loadFromStorage(TUGAS_STORAGE_KEY, DEFAULT_TUGAS);
let materiList = loadFromStorage(MATERI_STORAGE_KEY, DEFAULT_MATERI);
let activeMatkulFilter = 'ALL';

function loadFromStorage(key, defaultData) {
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter(item => {
          if (!item || typeof item !== 'object') return false;
          if (key === MATKUL_STORAGE_KEY) return !!item.nama;
          if (key === TUGAS_STORAGE_KEY) return !!item.judul && !!item.matkul;
          if (key === MATERI_STORAGE_KEY) return !!item.judul && !!item.matkul;
          return true;
        });
        return cleaned;
      }
    } catch (e) {
      console.error(`Gagal mengurai ${key}:`, e);
    }
  }
  localStorage.setItem(key, JSON.stringify(defaultData));
  return [...defaultData];
}

function saveStorage() {
  localStorage.setItem(MATKUL_STORAGE_KEY, JSON.stringify(matkulList));
  localStorage.setItem(TUGAS_STORAGE_KEY, JSON.stringify(tugasList));
  localStorage.setItem(MATERI_STORAGE_KEY, JSON.stringify(materiList));
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

window.handleOpenFile = async function(fileId, fileName, downloadUrl = '') {
  try {
    // Jika berkas tersimpan di Firebase Cloud Storage, buka langsung dari Cloud URL
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
      showToast(`Membuka berkas "${fileName}" dari Cloud...`, 'success');
      return;
    }

    const record = await getUploadedFile(fileId);
    if (!record || !record.data) {
      showToast('Berkas fisik tidak ditemukan atau telah dihapus dari perangkat ini.', 'danger');
      return;
    }

    const blob = dataUrlToBlob(record.data);
    const blobUrl = URL.createObjectURL(blob);
    const isViewable = record.type === 'application/pdf' || (record.type && record.type.startsWith('image/'));

    if (isViewable) {
      const opened = window.open(blobUrl, '_blank');
      if (!opened) {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.target = '_blank';
        a.click();
      }
    } else {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName || record.name || 'berkas';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }

    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    showToast(`Membuka berkas "${fileName || record.name}"...`, 'success');
  } catch (err) {
    console.error('Gagal membuka berkas:', err);
    showToast('Terjadi kesalahan saat memuat berkas: ' + err.message, 'danger');
  }
};

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

  function processSelectedFile(file) {
    const maxBytes = 25 * 1024 * 1024;
    if (file.size > maxBytes) {
      showToast('Ukuran berkas melebihi batas maksimal 25MB!', 'danger');
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
  matkulList.forEach(m => m && m.nama && set.add(m.nama.trim()));
  tugasList.forEach(t => t && t.matkul && set.add(t.matkul.trim()));
  materiList.forEach(m => m && m.matkul && set.add(m.matkul.trim()));
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

  // 2. Select Option Dropdowns
  const generateOptions = () => {
    let html = '<option value="ALL">Semua Mata Kuliah</option>';
    courses.forEach(c => {
      html += `<option value="${escapeHtml(c)}" ${activeMatkulFilter === c ? 'selected' : ''}>${escapeHtml(c)}</option>`;
    });
    return html;
  };

  filterTugasMatkul.innerHTML = generateOptions();
  filterMateriMatkul.innerHTML = generateOptions();

  // 3. Datalist Suggestions untuk Form Input
  mataKuliahSuggestions.innerHTML = '';
  courses.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    mataKuliahSuggestions.appendChild(opt);
  });
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
      const card = document.createElement('div');
      card.className = `task-card ${task.completed ? 'completed' : ''}`;

      card.innerHTML = `
        <div class="task-card-top">
          <span class="matkul-pill" style="border-left: 3px solid ${getCourseColor(task.matkul || '')};">
            <i data-feather="book"></i>
            ${escapeHtml(task.matkul || '-')}
          </span>
          <span class="task-priority-badge ${(task.prioritas || 'Sedang').toLowerCase()}">
            ${task.prioritas || 'Sedang'}
          </span>
        </div>

        <h3 class="task-title">${escapeHtml(task.judul || 'Tanpa Judul')}</h3>
        <p class="task-desc">${escapeHtml(task.deskripsi || 'Tidak ada catatan tambahan.')}</p>

        <div class="task-deadline-badge ${deadlineInfo.type}">
          <i data-feather="calendar"></i>
          <span>Deadline: ${deadlineInfo.text}</span>
        </div>

        ${task.file ? `
          <div class="card-attachment-area">
            <button type="button" class="file-attachment-chip" onclick="handleOpenFile('${task.file.id}', '${escapeHtml(task.file.name)}', '${escapeHtml(task.file.downloadUrl || '')}')" title="Buka / Unduh: ${escapeHtml(task.file.name)}">
              <i data-feather="${getFileIconName(task.file.name, task.file.type)}"></i>
              <span class="chip-filename">${escapeHtml(task.file.name)}</span>
              <span class="chip-filesize">(${formatFileSize(task.file.size)})</span>
              <i data-feather="download" class="chip-action-icon"></i>
            </button>
          </div>
        ` : ''}

        <div class="task-card-footer">
          <label class="task-status-btn">
            <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTugasComplete('${task.id}')">
            <span>${task.completed ? 'Selesai' : 'Tandai Selesai'}</span>
          </label>

          <div class="card-actions-group">
            <button class="btn-edit-item" onclick="openEditTugasModal('${task.id}')" title="Edit Tugas">
              <i data-feather="edit-2"></i>
            </button>
            <button class="btn-delete-item" onclick="deleteTugas('${task.id}')" title="Hapus Tugas">
              <i data-feather="trash-2"></i>
            </button>
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
  if (task) {
    task.completed = !task.completed;
    saveStorage();
    renderTugas();
    renderOverviewUrgent();
    showToast(task.completed ? 'Tugas ditandai selesai! 🎉' : 'Tugas dikembalikan ke belum selesai', 'success');
    if (typeof syncTugasToCloud === 'function') {
      syncTugasToCloud(task);
    }
  }
};

window.deleteTugas = async function(id) {
  const task = tugasList.find(t => t.id === id);
  if (confirm(`Hapus tugas "${task ? task.judul : 'ini'}"?`)) {
    if (task && task.file && task.file.id) {
      await deleteUploadedFile(task.file.id);
    }
    tugasList = tugasList.filter(t => t.id !== id);
    saveStorage();
    if (typeof deleteTugasFromCloud === 'function') {
      deleteTugasFromCloud(id);
    }
    renderCourseFilters();
    renderTugas();
    renderOverviewUrgent();
    showToast('Tugas berhasil dihapus', 'danger');
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
      const card = document.createElement('div');
      card.className = 'materi-card';

      card.innerHTML = `
        <div class="materi-card-header">
          <span class="pertemuan-pill">
            <i data-feather="bookmark"></i>
            Pertemuan ${m.pertemuan}
          </span>
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
              <button type="button" class="file-attachment-chip" onclick="handleOpenFile('${m.file.id}', '${escapeHtml(m.file.name)}', '${escapeHtml(m.file.downloadUrl || '')}')" title="Buka / Unduh: ${escapeHtml(m.file.name)}">
                <i data-feather="${getFileIconName(m.file.name, m.file.type)}"></i>
                <span class="chip-filename">${escapeHtml(m.file.name)}</span>
                <span class="chip-filesize">(${formatFileSize(m.file.size)})</span>
                <i data-feather="download" class="chip-action-icon"></i>
              </button>
            ` : ''}

            ${m.link ? `
              <a href="${escapeHtml(m.link)}" target="_blank" rel="noopener noreferrer" class="materi-link-btn" title="Buka Tautan Eksternal">
                <i data-feather="external-link"></i>
                <span>Tautan Drive / Web</span>
              </a>
            ` : (!m.file ? `<span class="no-attachment-text">Tanpa lampiran berkas</span>` : '')}
          </div>

          <div class="card-actions-group">
            <button class="btn-edit-item" onclick="openEditMateriModal('${m.id}')" title="Edit Materi">
              <i data-feather="edit-2"></i>
            </button>
            <button class="btn-delete-item" onclick="deleteMateri('${m.id}')" title="Hapus Catatan">
              <i data-feather="trash-2"></i>
            </button>
          </div>
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
  if (confirm(`Hapus materi "${materi ? materi.judul : 'ini'}"?`)) {
    if (materi && materi.file && materi.file.id) {
      await deleteUploadedFile(materi.file.id);
    }
    materiList = materiList.filter(m => m.id !== id);
    saveStorage();
    if (typeof deleteMateriFromCloud === 'function') {
      deleteMateriFromCloud(id);
    }
    renderCourseFilters();
    renderMateri();
    renderOverviewRecentMaterials();
    showToast('Catatan materi dihapus', 'danger');
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
    const card = document.createElement('div');
    card.className = 'task-card';

    card.innerHTML = `
      <div class="task-card-top">
        <span class="matkul-pill">
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
        <div style="margin: 8px 0;">
          <button type="button" class="file-attachment-chip" onclick="handleOpenFile('${task.file.id}', '${escapeHtml(task.file.name)}', '${escapeHtml(task.file.downloadUrl || '')}')" title="Buka / Unduh: ${escapeHtml(task.file.name)}">
            <i data-feather="${getFileIconName(task.file.name, task.file.type)}"></i>
            <span class="chip-filename">${escapeHtml(task.file.name)}</span>
            <span class="chip-filesize">(${formatFileSize(task.file.size)})</span>
          </button>
        </div>
      ` : ''}

      <div class="task-card-footer">
        <label class="task-status-btn">
          <input type="checkbox" onchange="toggleTugasComplete('${task.id}')">
          <span>Selesaikan Sekarang</span>
        </label>
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
    const card = document.createElement('div');
    card.className = 'materi-card';

    card.innerHTML = `
      <div class="materi-card-header">
        <span class="pertemuan-pill">Pertemuan ${m.pertemuan || 1}</span>
        <span class="materi-date">${formatIndoDate(m.tanggal)}</span>
      </div>
      <h3 class="materi-title">${escapeHtml(m.judul || 'Tanpa Judul')}</h3>
      <span class="materi-matkul-tag">📚 ${escapeHtml(m.matkul || '-')}</span>

      <div class="card-attachment-area">
        ${m.file ? `
          <button type="button" class="file-attachment-chip" onclick="handleOpenFile('${m.file.id}', '${escapeHtml(m.file.name)}', '${escapeHtml(m.file.downloadUrl || '')}')" title="Buka / Unduh: ${escapeHtml(m.file.name)}">
            <i data-feather="${getFileIconName(m.file.name, m.file.type)}"></i>
            <span class="chip-filename">${escapeHtml(m.file.name)}</span>
            <span class="chip-filesize">(${formatFileSize(m.file.size)})</span>
            <i data-feather="download" class="chip-action-icon"></i>
          </button>
        ` : ''}

        ${m.link ? `
          <a href="${escapeHtml(m.link)}" target="_blank" rel="noopener noreferrer" class="materi-link-btn" title="Buka Tautan Eksternal">
            <i data-feather="external-link"></i>
            <span>Tautan Web</span>
          </a>
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

  // Reset staged file & uploader
  stagedTugasFile = null;
  if (tugasFileInput) tugasFileInput.value = '';
  tugasUploader.renderPreviewUI(null);

  // Jika sedang filter mata kuliah tertentu, isi otomatis
  if (activeMatkulFilter !== 'ALL') {
    document.getElementById('tugasMatkul').value = activeMatkulFilter;
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

  if (editTugasId) editTugasId.value = task.id;
  if (tugasModalTitle) tugasModalTitle.textContent = 'Edit Tugas Kuliah';
  if (btnSubmitTugas) btnSubmitTugas.textContent = 'Perbarui Tugas';

  document.getElementById('tugasJudul').value = task.judul;
  document.getElementById('tugasMatkul').value = task.matkul;
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

  // Reset staged file & toggle
  stagedMateriFile = null;
  if (materiFileInput) materiFileInput.value = '';
  materiUploader.renderPreviewUI(null);
  if (materiLinkToggle) materiLinkToggle.open = false;

  if (activeMatkulFilter !== 'ALL') {
    document.getElementById('materiMatkul').value = activeMatkulFilter;
  }

  const today = new Date().toISOString().split('T')[0];
  document.getElementById('materiTanggal').value = today;
  materiModal.showModal();
  materiForm.scrollTop = 0;
}

function openEditMateriModal(id) {
  const m = materiList.find(item => item.id === id);
  if (!m) return;

  if (editMateriId) editMateriId.value = m.id;
  if (materiModalTitle) materiModalTitle.textContent = 'Edit Materi Kuliah';
  if (btnSubmitMateri) btnSubmitMateri.textContent = 'Perbarui Materi';

  document.getElementById('materiJudul').value = m.judul;
  document.getElementById('materiMatkul').value = m.matkul;
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

  if (!matkul) {
    showToast('Mohon pilih atau isi nama Mata Kuliah!', 'danger');
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

      fileMeta = {
        id: stagedTugasFile.id,
        name: stagedTugasFile.name,
        size: stagedTugasFile.size,
        type: stagedTugasFile.type,
        downloadUrl: cloudFile ? cloudFile.downloadUrl : '',
        storagePath: cloudFile ? cloudFile.path : ''
      };
    } else if (stagedTugasFile.isExisting) {
      fileMeta = {
        id: stagedTugasFile.id,
        name: stagedTugasFile.name,
        size: stagedTugasFile.size,
        type: stagedTugasFile.type,
        downloadUrl: stagedTugasFile.downloadUrl || '',
        storagePath: stagedTugasFile.storagePath || ''
      };
    }
  }

  let savedTask = null;
  if (editId) {
    // Mode Edit
    const taskIndex = tugasList.findIndex(t => t.id === editId);
    if (taskIndex !== -1) {
      const oldTask = tugasList[taskIndex];
      // Jika berkas lama diganti atau dihapus, hapus dari IndexedDB dan Firebase Storage
      if (oldTask.file && (!fileMeta || fileMeta.id !== oldTask.file.id)) {
        await deleteUploadedFile(oldTask.file.id);
        if (oldTask.file.storagePath && typeof deleteFileFromFirebaseStorage === 'function') {
          await deleteFileFromFirebaseStorage(oldTask.file.storagePath);
        }
      }

      tugasList[taskIndex] = {
        ...oldTask,
        judul,
        matkul,
        deadline: `${date}T${time}`,
        prioritas,
        deskripsi,
        file: fileMeta
      };
      savedTask = tugasList[taskIndex];
      showToast('Tugas berhasil diperbarui! ✏️', 'success');
    }
  } else {
    // Mode Tambah Baru
    savedTask = {
      id: 'tgs-' + Date.now(),
      judul,
      matkul,
      deadline: `${date}T${time}`,
      prioritas,
      deskripsi,
      file: fileMeta,
      completed: false
    };
    tugasList.unshift(savedTask);
    showToast('Tugas baru berhasil disimpan! 📋', 'success');
  }

    saveStorage();
    if (savedTask && typeof syncTugasToCloud === 'function') {
      syncTugasToCloud(savedTask);
    }
    renderCourseFilters();
    renderTugas();
    renderOverviewUrgent();
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

  if (!matkul) {
    showToast('Mohon pilih atau isi nama Mata Kuliah!', 'danger');
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

        fileMeta = {
          id: stagedMateriFile.id,
          name: stagedMateriFile.name,
          size: stagedMateriFile.size,
          type: stagedMateriFile.type,
          downloadUrl: cloudFile ? cloudFile.downloadUrl : '',
          storagePath: cloudFile ? cloudFile.path : ''
        };
      } else if (stagedMateriFile.isExisting) {
        fileMeta = {
          id: stagedMateriFile.id,
          name: stagedMateriFile.name,
          size: stagedMateriFile.size,
          type: stagedMateriFile.type,
          downloadUrl: stagedMateriFile.downloadUrl || '',
          storagePath: stagedMateriFile.storagePath || ''
        };
      }
    }

    let savedMateri = null;
    if (editId) {
      // Mode Edit
      const materiIndex = materiList.findIndex(m => m.id === editId);
      if (materiIndex !== -1) {
        const oldMateri = materiList[materiIndex];
        if (oldMateri.file && (!fileMeta || fileMeta.id !== oldMateri.file.id)) {
          await deleteUploadedFile(oldMateri.file.id);
          if (oldMateri.file.storagePath && typeof deleteFileFromFirebaseStorage === 'function') {
            await deleteFileFromFirebaseStorage(oldMateri.file.storagePath);
          }
        }

        materiList[materiIndex] = {
          ...oldMateri,
          judul,
          matkul,
          pertemuan,
          tanggal,
          link,
          file: fileMeta,
          catatan
        };
        savedMateri = materiList[materiIndex];
        showToast(`Materi pertemuan ${pertemuan} diperbarui! ✏️`, 'success');
      }
    } else {
      // Mode Tambah Baru
      savedMateri = {
        id: 'mat-' + Date.now(),
        judul,
        matkul,
        pertemuan,
        tanggal,
        link,
        file: fileMeta,
        catatan
      };
      materiList.unshift(savedMateri);
      showToast(`Materi pertemuan ${pertemuan} berhasil disimpan! 📖`, 'success');
    }

    saveStorage();
    if (savedMateri && typeof syncMateriToCloud === 'function') {
      syncMateriToCloud(savedMateri);
    }
    renderCourseFilters();
    renderMateri();
    renderOverviewRecentMaterials();
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
// 10B. CLOUD MODAL & FIREBASE CONTROLS
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

if (btnOpenCloudModal) btnOpenCloudModal.addEventListener('click', openCloudModal);
if (btnOpenCloudModalSidebar) btnOpenCloudModalSidebar.addEventListener('click', openCloudModal);

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
const completeNIMErrorMsg = document.getElementById('completeNIMErrorMsg');
const completeNIMErrorText = document.getElementById('completeNIMErrorText');
const btnSubmitCompleteNIM = document.getElementById('btnSubmitCompleteNIM');

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
  }
  if (window.feather) feather.replace();
}
window.switchAuthTab = switchAuthTab;

if (btnSwitchToLogin) {
  btnSwitchToLogin.addEventListener('click', () => switchAuthTab('masuk'));
}

/**
 * Tampilkan data profil mahasiswa di sidebar dan dashboard
 */
function updateStudentProfileUI(profile) {
  if (!profile) return;
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
      showToast(`Akun berhasil dibuat untuk ${nama}! 🎉`, 'success');
      registerForm.reset();
      // onAuthStateChanged akan menangani profil dan membuka portal
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
      showToast('Akun Google terhubung! Silakan lengkapi NIM Anda.', 'info');
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
// 4. LENGKAPI NIM MODAL HANDLER (untuk User Google)
// ----------------------------------------------------------------------------
if (completeNIMForm) {
  completeNIMForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nama = googleNamaInput ? googleNamaInput.value.trim() : '';
    const nim = googleNimInput ? googleNimInput.value.trim() : '';

    if (!currentUser) return;
    if (completeNIMErrorMsg) completeNIMErrorMsg.style.display = 'none';
    if (btnSubmitCompleteNIM) btnSubmitCompleteNIM.disabled = true;

    try {
      // Cek apakah NIM sudah dipakai akun lain
      const existingEmail = await lookupEmailByNIM(nim);
      if (existingEmail && existingEmail !== currentUser.email) {
        throw new Error(`NIM ${nim} sudah terdaftar di akun lain!`);
      }

      const profileData = {
        nama: nama || currentUser.displayName || 'Mahasiswa',
        nim: nim,
        email: currentUser.email,
        createdAt: new Date().toISOString()
      };

      await saveUserProfile(currentUser.uid, profileData);
      await registerNIMIndex(nim, currentUser.uid, currentUser.email);

      if (completeNIMModal) completeNIMModal.close();
      updateStudentProfileUI(profileData);
      unlockPortal(true);
      setupRealtimeListeners(currentUser.uid);
      showToast('Data tersimpan! Selamat datang di StudySync 🎓', 'success');
    } catch (err) {
      if (completeNIMErrorMsg && completeNIMErrorText) {
        completeNIMErrorText.textContent = err.message;
        completeNIMErrorMsg.style.display = 'flex';
      }
    } finally {
      if (btnSubmitCompleteNIM) btnSubmitCompleteNIM.disabled = false;
    }
  });
}

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
  }

  try { renderMatkul(); } catch (e) { console.warn('Init renderMatkul error:', e); }
  try { renderCourseFilters(); } catch (e) { console.warn('Init renderCourseFilters error:', e); }
  try { renderTugas(); } catch (e) { console.warn('Init renderTugas error:', e); }
  try { renderMateri(); } catch (e) { console.warn('Init renderMateri error:', e); }

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

  try { feather.replace(); } catch (e) { console.warn('feather.replace error:', e); }
});

