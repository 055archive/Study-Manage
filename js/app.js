/**
 * TEKS HOUSE Netflix & Chill - Apartemen Sewa Per Jam
 * Aplikasi Buku Kas & Keuangan Apartemen
 * Sesuai Pricelist Resmi TEKS HOUSE (Serang Kota)
 */

// Pricelist Resmi TEKS HOUSE
const TEKS_HOUSE_PRICELIST = {
  REGULER: {
    weekday: { '1': 50000, '2': 70000, '3': 90000, '4': 110000, '5': 130000, '6': 150000, '12': 200000, 'malam': 150000 },
    weekend: { '1': 60000, '2': 80000, '3': 100000, '4': 120000, '5': 150000, '6': 170000, '12': 220000, 'malam': 150000 }
  },
  VIP: {
    weekday: { '1': 60000, '2': 80000, '3': 100000, '4': 120000, '5': 150000, '6': 180000, '12': 300000, 'malam': 180000 },
    weekend: { '1': 70000, '2': 100000, '3': 130000, '4': 150000, '5': 180000, '6': 210000, '12': 330000, 'malam': 180000 }
  }
};

const UNITS_DATA = [
  { id: 'B-24', name: 'Unit B-24', type: 'VIP', color: 'amber' },
  { id: 'B-32', name: 'Unit B-32', type: 'REGULER', color: 'sky' },
  { id: 'C-34', name: 'Unit C-34', type: 'REGULER', color: 'indigo' }
];

// State Aplikasi
let appData = {
  incomes: [],    // Transaksi sewa & pemasukan customer
  expenses: [],   // Transaksi pengeluaran
  pricelist: { ...TEKS_HOUSE_PRICELIST }
};

let currentFilter = {
  type: 'daily', // 'daily', 'weekly', 'monthly', 'custom'
  startDate: getTodayDateString(),
  endDate: getTodayDateString(),
  month: getCurrentMonthString() // 'YYYY-MM'
};

// State Form Pemasukan
let selectedPackage = '2'; // default 2 Jam
let selectedDayType = 'auto'; // 'auto', 'weekday', 'weekend'

// Helper Format Uang Rupiah
function formatRupiah(number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(number || 0);
}

// Helper Format Tanggal & Jam Indonesia
function formatDateIndo(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function formatDateTimeIndo(dateTimeStr) {
  if (!dateTimeStr) return '-';
  const d = new Date(dateTimeStr);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCurrentMonthString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getNowDateTimeLocalString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${mins}`;
}

// Cek apakah tanggal adalah Weekend (Jumat, Sabtu, Minggu)
function isWeekend(dateTimeStr) {
  if (!dateTimeStr) return false;
  const d = new Date(dateTimeStr);
  const day = d.getDay(); // 0: Minggu, 5: Jumat, 6: Sabtu
  return day === 0 || day === 5 || day === 6;
}

// Inisialisasi Aplikasi saat Dokumen Dimuat
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadLocalData();
  setupEventListeners();
  initDateInputs();
  renderAll();

  // Inisialisasi Firebase Cloud Sync
  if (typeof initFirebaseSync === 'function') {
    initFirebaseSync((collectionName, items) => {
      if (collectionName === 'incomes') {
        appData.incomes = items;
        saveLocalOnly();
        renderAll();
      } else if (collectionName === 'expenses') {
        appData.expenses = items;
        saveLocalOnly();
        renderAll();
      }
    });
  }
});

// Theme Management (Light / Dark Mode from Stitch)
function updateThemeUI(isDark) {
  const htmlEl = document.documentElement;
  const themeIcon = document.getElementById('themeIcon');
  const themeText = document.getElementById('themeText');
  const mobileThemeIcon = document.getElementById('mobileThemeIcon');

  if (isDark) {
    htmlEl.classList.add('dark');
    if (themeIcon) themeIcon.textContent = '☀️';
    if (themeText) themeText.textContent = 'Light Mode';
    if (mobileThemeIcon) mobileThemeIcon.textContent = '☀️';
  } else {
    htmlEl.classList.remove('dark');
    if (themeIcon) themeIcon.textContent = '🌙';
    if (themeText) themeText.textContent = 'Dark Mode';
    if (mobileThemeIcon) mobileThemeIcon.textContent = '🌙';
  }
}

function toggleTheme() {
  const isDark = document.documentElement.classList.contains('dark');
  const newTheme = !isDark;
  updateThemeUI(newTheme);
  try {
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  } catch (e) {}
}

function initTheme() {
  let savedTheme = 'dark';
  try {
    const stored = localStorage.getItem('theme');
    if (stored) {
      savedTheme = stored;
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      savedTheme = 'light';
    }
  } catch (e) {}
  updateThemeUI(savedTheme === 'dark');
}

// Setup Form Defaults
function initDateInputs() {
  const incomeDateInput = document.getElementById('incomeDateTime');
  const expenseDateInput = document.getElementById('expenseDate');
  const filterDailyDateInput = document.getElementById('filterDailyDate');
  const filterMonthInput = document.getElementById('filterMonth');

  if (incomeDateInput) {
    incomeDateInput.value = getNowDateTimeLocalString();
    updateDayTypeFromDate();
  }
  if (expenseDateInput) expenseDateInput.value = getTodayDateString();
  if (filterDailyDateInput) filterDailyDateInput.value = getTodayDateString();
  if (filterMonthInput) filterMonthInput.value = getCurrentMonthString();
  
  updateCalculatedRent();
}

// Load & Simpan Data Lokal
function loadLocalData() {
  try {
    const savedIncomes = localStorage.getItem('sewa_apartemen_incomes');
    const savedExpenses = localStorage.getItem('sewa_apartemen_expenses');

    if (savedIncomes) appData.incomes = JSON.parse(savedIncomes);
    if (savedExpenses) appData.expenses = JSON.parse(savedExpenses);

    // Jika data masih kosong, buatkan data demo sesuai pricelist TEKS HOUSE
    if (appData.incomes.length === 0 && appData.expenses.length === 0) {
      loadInitialDemoData();
    }
  } catch (e) {
    console.error("Gagal membaca local storage:", e);
  }
}

function saveLocalOnly() {
  try {
    localStorage.setItem('sewa_apartemen_incomes', JSON.stringify(appData.incomes));
    localStorage.setItem('sewa_apartemen_expenses', JSON.stringify(appData.expenses));
  } catch (e) {
    console.error("Gagal simpan local storage:", e);
  }
}

function saveData(type, item) {
  saveLocalOnly();
  if (typeof syncSaveDocument === 'function') {
    syncSaveDocument(type, item.id, item);
  }
}

function deleteData(type, id) {
  saveLocalOnly();
  if (typeof syncDeleteDocument === 'function') {
    syncDeleteDocument(type, id);
  }
}

// Data Contoh Awal (Demo sesuai Pricelist TEKS HOUSE)
function loadInitialDemoData() {
  const today = getTodayDateString();
  appData.incomes = [
    {
      id: 'inc-1',
      dateTime: `${today}T10:00`,
      unitId: 'B-24',
      unitType: 'VIP',
      dayType: 'weekday',
      packageType: '3',
      durationLabel: '3 Jam',
      hours: 3,
      totalAmount: 100000,
      paymentMethod: 'Transfer BCA',
      notes: ''
    },
    {
      id: 'inc-2',
      dateTime: `${today}T14:30`,
      unitId: 'B-32',
      unitType: 'REGULER',
      dayType: 'weekday',
      packageType: '2',
      durationLabel: '2 Jam',
      hours: 2,
      totalAmount: 70000,
      paymentMethod: 'QRIS',
      notes: ''
    },
    {
      id: 'inc-3',
      dateTime: `${today}T21:00`,
      unitId: 'C-34',
      unitType: 'REGULER',
      dayType: 'weekday',
      packageType: 'malam',
      durationLabel: 'Paket Malam',
      hours: 10,
      totalAmount: 150000,
      paymentMethod: 'Cash',
      notes: 'Check-in malam'
    }
  ];

  appData.expenses = [
    {
      id: 'exp-1',
      date: today,
      category: 'Token Listrik PLN',
      unitId: 'B-24',
      amount: 100000,
      notes: 'Beli token PLN 100rb di Tokopedia'
    },
    {
      id: 'exp-2',
      date: today,
      category: 'Laundry Sprei/Handuk',
      unitId: 'Umum',
      amount: 45000,
      notes: 'Laundry 3 set sprei dan handuk'
    }
  ];

  saveLocalOnly();
}

// Navigasi Tab
function switchTab(tabId) {
  const tabs = ['tab-rekap', 'tab-pemasukan', 'tab-pengeluaran', 'tab-pengaturan'];
  tabs.forEach(t => {
    const el = document.getElementById(t);
    if (el) el.classList.add('hidden');
  });

  const activeTabEl = document.getElementById(tabId);
  if (activeTabEl) activeTabEl.classList.remove('hidden');

  // Update styling tombol tab desktop & mobile
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    if (btn.dataset.tab === tabId) {
      btn.className = 'nav-tab-btn px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white transition flex items-center space-x-2 shadow-sm shadow-blue-600/30';
    } else {
      btn.className = 'nav-tab-btn px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition flex items-center space-x-2';
    }
  });

  document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
    if (btn.dataset.tab === tabId) {
      btn.classList.add('text-blue-600', 'dark:text-blue-400');
      btn.classList.remove('text-slate-400', 'dark:text-slate-500');
    } else {
      btn.classList.remove('text-blue-600', 'dark:text-blue-400');
      if (btn.dataset.tab) {
        btn.classList.add('text-slate-400', 'dark:text-slate-500');
      }
    }
  });

  if (tabId === 'tab-rekap') {
    renderRecap();
  } else if (tabId === 'tab-pengaturan') {
    renderSettingsValues();
  }
}

// Update Deteksi Hari Weekday / Weekend berdasarkan tanggal transaksi
function updateDayTypeFromDate() {
  const dateInput = document.getElementById('incomeDateTime');
  const dayBadge = document.getElementById('incomeDayBadge');
  const btnWeekday = document.getElementById('btnDayWeekday');
  const btnWeekend = document.getElementById('btnDayWeekend');

  if (!dateInput) return;

  const currentVal = dateInput.value;
  const weekend = isWeekend(currentVal);

  if (selectedDayType === 'auto') {
    const activeType = weekend ? 'weekend' : 'weekday';
    updateDayTypeUI(activeType);
  }
}

function setManualDayType(type) {
  selectedDayType = type;
  updateDayTypeUI(type);
  updateCalculatedRent();
}

function updateDayTypeUI(type) {
  const btnWeekday = document.getElementById('btnDayWeekday');
  const btnWeekend = document.getElementById('btnDayWeekend');
  const dayBadge = document.getElementById('incomeDayBadge');

  if (type === 'weekend') {
    if (btnWeekend) {
      btnWeekend.className = 'px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 text-white shadow-xs transition';
    }
    if (btnWeekday) {
      btnWeekday.className = 'px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 transition';
    }
    if (dayBadge) {
      dayBadge.innerText = 'WEEKEND (Jumat - Minggu)';
      dayBadge.className = 'text-[11px] px-2 py-0.5 rounded font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800';
    }
  } else {
    if (btnWeekday) {
      btnWeekday.className = 'px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white shadow-xs transition';
    }
    if (btnWeekend) {
      btnWeekend.className = 'px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 transition';
    }
    if (dayBadge) {
      dayBadge.innerText = 'WEEKDAY (Senin - Kamis)';
      dayBadge.className = 'text-[11px] px-2 py-0.5 rounded font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800';
    }
  }
}

function getActiveDayType() {
  if (selectedDayType === 'weekday' || selectedDayType === 'weekend') {
    return selectedDayType;
  }
  const dateInput = document.getElementById('incomeDateTime');
  return isWeekend(dateInput?.value) ? 'weekend' : 'weekday';
}

// Set Tombol Paket Durasi
function setPackageSelection(pkg) {
  selectedPackage = String(pkg);

  // Update styling tombol paket
  document.querySelectorAll('.pkg-btn').forEach(btn => {
    if (btn.dataset.pkg === String(pkg)) {
      btn.className = 'pkg-btn py-2 px-2.5 text-xs font-extrabold rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/20 border border-blue-600 transition';
    } else {
      btn.className = 'pkg-btn py-2 px-2.5 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition';
    }
  });

  const customHoursInput = document.getElementById('incomeCustomHours');
  if (pkg !== 'custom' && customHoursInput) {
    customHoursInput.value = pkg === 'malam' ? 10 : pkg;
  }

  updateCalculatedRent();
}

// Kalkulasi Tarif Sewa Berdasarkan Pricelist Resmi TEKS HOUSE
function updateCalculatedRent() {
  const unitSelect = document.getElementById('incomeUnit');
  const rentInput = document.getElementById('incomeRent');
  const totalDisplay = document.getElementById('incomeTotalDisplay');
  const unitTypeBadge = document.getElementById('incomeUnitTypeBadge');
  const pkgNotes = document.getElementById('incomePackageNotes');

  if (!unitSelect || !rentInput) return;

  const unitId = unitSelect.value;
  const unitInfo = UNITS_DATA.find(u => u.id === unitId) || UNITS_DATA[0];
  const unitType = unitInfo.type; // 'VIP' or 'REGULER'

  if (unitTypeBadge) {
    unitTypeBadge.innerText = unitType;
    unitTypeBadge.className = `text-xs px-2 py-0.5 rounded font-semibold border ${
      unitType === 'VIP' 
        ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800' 
        : 'bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-800'
    }`;
  }

  const dayType = getActiveDayType(); // 'weekday' or 'weekend'
  const ratesTable = TEKS_HOUSE_PRICELIST[unitType][dayType];

  let price = 0;
  let label = '';

  if (selectedPackage === 'malam') {
    price = ratesTable['malam'] || (unitType === 'VIP' ? 180000 : 150000);
    label = `Paket Malam (${unitType} - ${dayType.toUpperCase()})`;
  } else if (ratesTable[selectedPackage]) {
    price = ratesTable[selectedPackage];
    label = `Paket ${selectedPackage} Jam (${unitType} - ${dayType.toUpperCase()})`;
  } else {
    // Custom jam
    const customHoursInput = document.getElementById('incomeCustomHours');
    const customH = parseFloat(customHoursInput?.value) || 1;
    // Ambil rate per jam terdekat
    price = Math.round(customH * (unitType === 'VIP' ? 50000 : 35000));
    label = `${customH} Jam (Custom)`;
  }

  rentInput.value = price;
  if (totalDisplay) {
    totalDisplay.innerText = formatRupiah(price);
  }
  if (pkgNotes) {
    pkgNotes.innerText = `Tarif resmi: ${label}`;
  }
}

// Event Listeners
function setupEventListeners() {
  // Tab Navigasi Desktop
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Tab Navigasi Mobile
  document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Perubahan Unit & Tanggal
  const unitSelect = document.getElementById('incomeUnit');
  const dateInput = document.getElementById('incomeDateTime');
  const rentInput = document.getElementById('incomeRent');
  const customHoursInput = document.getElementById('incomeCustomHours');

  if (unitSelect) unitSelect.addEventListener('change', updateCalculatedRent);
  if (dateInput) {
    dateInput.addEventListener('change', () => {
      updateDayTypeFromDate();
      updateCalculatedRent();
    });
  }
  if (rentInput) {
    rentInput.addEventListener('input', () => {
      const totalDisplay = document.getElementById('incomeTotalDisplay');
      const val = parseFloat(rentInput.value) || 0;
      if (totalDisplay) totalDisplay.innerText = formatRupiah(val);
    });
  }
  if (customHoursInput) {
    customHoursInput.addEventListener('input', () => {
      selectedPackage = 'custom';
      updateCalculatedRent();
    });
  }

  // Form Submit Pemasukan (Customer Masuk)
  const incomeForm = document.getElementById('formIncome');
  if (incomeForm) {
    incomeForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleSaveIncome();
    });
  }

  // Form Submit Pengeluaran
  const expenseForm = document.getElementById('formExpense');
  if (expenseForm) {
    expenseForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleSaveExpense();
    });
  }

  // Filter Rekapitulasi
  setupFilterListeners();
}

function setupFilterListeners() {
  const filterTypeBtns = document.querySelectorAll('.filter-type-btn');
  filterTypeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterTypeBtns.forEach(b => {
        b.className = 'filter-type-btn px-3.5 py-1.5 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition';
      });
      btn.className = 'filter-type-btn px-3.5 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white shadow-xs transition';

      currentFilter.type = btn.dataset.filter;
      updateFilterControlsUI();
      renderRecap();
    });
  });

  // Input Perubahan Tanggal Harian
  const dailyInput = document.getElementById('filterDailyDate');
  if (dailyInput) {
    dailyInput.addEventListener('change', () => {
      currentFilter.startDate = dailyInput.value;
      currentFilter.endDate = dailyInput.value;
      renderRecap();
    });
  }

  // Input Perubahan Bulan
  const monthInput = document.getElementById('filterMonth');
  if (monthInput) {
    monthInput.addEventListener('change', () => {
      currentFilter.month = monthInput.value;
      renderRecap();
    });
  }

  // Input Perubahan Custom Range
  const customStart = document.getElementById('filterCustomStart');
  const customEnd = document.getElementById('filterCustomEnd');
  if (customStart && customEnd) {
    const handleCustomChange = () => {
      if (customStart.value && customEnd.value) {
        currentFilter.startDate = customStart.value;
        currentFilter.endDate = customEnd.value;
        renderRecap();
      }
    };
    customStart.addEventListener('change', handleCustomChange);
    customEnd.addEventListener('change', handleCustomChange);
  }
}

function updateFilterControlsUI() {
  const dailyBox = document.getElementById('filterControlDaily');
  const weeklyBox = document.getElementById('filterControlWeekly');
  const monthlyBox = document.getElementById('filterControlMonthly');
  const customBox = document.getElementById('filterControlCustom');

  if (dailyBox) dailyBox.classList.add('hidden');
  if (weeklyBox) weeklyBox.classList.add('hidden');
  if (monthlyBox) monthlyBox.classList.add('hidden');
  if (customBox) customBox.classList.add('hidden');

  if (currentFilter.type === 'daily' && dailyBox) dailyBox.classList.remove('hidden');
  if (currentFilter.type === 'weekly' && weeklyBox) weeklyBox.classList.remove('hidden');
  if (currentFilter.type === 'monthly' && monthlyBox) monthlyBox.classList.remove('hidden');
  if (currentFilter.type === 'custom' && customBox) customBox.classList.remove('hidden');
}

// Handler Simpan Transaksi Pemasukan (Customer Masuk)
function handleSaveIncome() {
  const dateTimeInput = document.getElementById('incomeDateTime');
  const unitSelect = document.getElementById('incomeUnit');
  const rentInput = document.getElementById('incomeRent');
  const paymentMethodSelect = document.getElementById('incomePaymentMethod');
  const notesInput = document.getElementById('incomeNotes');
  const customHoursInput = document.getElementById('incomeCustomHours');

  const unitId = unitSelect.value;
  const unitInfo = UNITS_DATA.find(u => u.id === unitId);
  const dayType = getActiveDayType();
  const rentAmount = parseFloat(rentInput.value) || 0;

  let durationLabel = '';
  let hoursCount = 2;

  if (selectedPackage === 'malam') {
    durationLabel = '🌙 Paket Malam';
    hoursCount = 10;
  } else if (selectedPackage === 'custom') {
    hoursCount = parseFloat(customHoursInput?.value) || 1;
    durationLabel = `${hoursCount} Jam`;
  } else {
    hoursCount = parseFloat(selectedPackage) || 2;
    durationLabel = `${selectedPackage} Jam`;
  }

  const newIncome = {
    id: 'inc-' + Date.now(),
    dateTime: dateTimeInput.value || getNowDateTimeLocalString(),
    unitId: unitId,
    unitType: unitInfo ? unitInfo.type : 'REGULER',
    dayType: dayType,
    packageType: selectedPackage,
    durationLabel: durationLabel,
    hours: hoursCount,
    totalAmount: rentAmount,
    paymentMethod: paymentMethodSelect.value,
    notes: notesInput.value.trim(),
    createdAt: new Date().toISOString()
  };

  appData.incomes.unshift(newIncome);
  saveData('incomes', newIncome);

  showToast(`✅ Customer masuk tercatat! Pemasukan ${formatRupiah(rentAmount)} tersimpan.`);
  
  // Reset Form
  document.getElementById('formIncome').reset();
  initDateInputs();
  setPackageSelection('2');

  // Beralih ke tab rekap untuk melihat hasilnya
  switchTab('tab-rekap');
  renderAll();
}

// Handler Simpan Transaksi Pengeluaran
function handleSaveExpense() {
  const dateInput = document.getElementById('expenseDate');
  const categorySelect = document.getElementById('expenseCategory');
  const unitSelect = document.getElementById('expenseUnit');
  const amountInput = document.getElementById('expenseAmount');
  const notesInput = document.getElementById('expenseNotes');

  const amount = parseFloat(amountInput.value) || 0;
  if (amount <= 0) {
    alert("Silakan masukkan nominal pengeluaran yang valid.");
    return;
  }

  const newExpense = {
    id: 'exp-' + Date.now(),
    date: dateInput.value || getTodayDateString(),
    category: categorySelect.value,
    unitId: unitSelect.value,
    amount: amount,
    notes: notesInput.value.trim(),
    createdAt: new Date().toISOString()
  };

  appData.expenses.unshift(newExpense);
  saveData('expenses', newExpense);

  showToast(`✅ Pengeluaran ${formatRupiah(amount)} (${newExpense.category}) tersimpan.`);

  // Reset form
  document.getElementById('formExpense').reset();
  if (dateInput) dateInput.value = getTodayDateString();

  switchTab('tab-rekap');
  renderAll();
}

// Hapus Data
function removeIncomeItem(id) {
  if (confirm("Apakah Anda yakin ingin menghapus catatan transaksi customer ini?")) {
    appData.incomes = appData.incomes.filter(i => i.id !== id);
    deleteData('incomes', id);
    renderAll();
    showToast("Transaksi customer telah dihapus.");
  }
}

function removeExpenseItem(id) {
  if (confirm("Apakah Anda yakin ingin menghapus catatan pengeluaran ini?")) {
    appData.expenses = appData.expenses.filter(e => e.id !== id);
    deleteData('expenses', id);
    renderAll();
    showToast("Catatan pengeluaran telah dihapus.");
  }
}

// Render Keseluruhan
function renderAll() {
  renderRecap();
  renderSettingsValues();
}

// FILTER DATA HELPER
function getFilteredData() {
  let filteredIncomes = [];
  let filteredExpenses = [];
  let periodLabel = '';

  if (currentFilter.type === 'daily') {
    const targetDate = currentFilter.startDate || getTodayDateString();
    periodLabel = `Hari: ${formatDateIndo(targetDate)}`;

    filteredIncomes = appData.incomes.filter(item => {
      const itemDate = (item.dateTime || '').split('T')[0];
      return itemDate === targetDate;
    });

    filteredExpenses = appData.expenses.filter(item => {
      return item.date === targetDate;
    });

  } else if (currentFilter.type === 'weekly') {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 6);
    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    periodLabel = `Minggu Ini (${formatDateIndo(startStr)} s/d ${formatDateIndo(endStr)})`;

    filteredIncomes = appData.incomes.filter(item => {
      const d = (item.dateTime || '').split('T')[0];
      return d >= startStr && d <= endStr;
    });

    filteredExpenses = appData.expenses.filter(item => {
      return item.date >= startStr && item.date <= endStr;
    });

  } else if (currentFilter.type === 'monthly') {
    const targetMonth = currentFilter.month || getCurrentMonthString();
    const [y, m] = targetMonth.split('-');
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const monthIndex = parseInt(m, 10) - 1;
    periodLabel = `Bulan: ${monthNames[monthIndex] || m} ${y}`;

    filteredIncomes = appData.incomes.filter(item => {
      const d = (item.dateTime || '').substring(0, 7);
      return d === targetMonth;
    });

    filteredExpenses = appData.expenses.filter(item => {
      const d = (item.date || '').substring(0, 7);
      return d === targetMonth;
    });

  } else if (currentFilter.type === 'custom') {
    const startStr = currentFilter.startDate;
    const endStr = currentFilter.endDate;
    periodLabel = `${formatDateIndo(startStr)} s/d ${formatDateIndo(endStr)}`;

    filteredIncomes = appData.incomes.filter(item => {
      const d = (item.dateTime || '').split('T')[0];
      return d >= startStr && d <= endStr;
    });

    filteredExpenses = appData.expenses.filter(item => {
      return item.date >= startStr && item.date <= endStr;
    });
  }

  return {
    incomes: filteredIncomes,
    expenses: filteredExpenses,
    periodLabel: periodLabel
  };
}

// Render Dashboard & Rekapitulasi
function renderRecap() {
  const { incomes, expenses, periodLabel } = getFilteredData();

  const totalCustomers = incomes.length;
  let totalHours = 0;
  let totalIncome = 0;

  const unitBreakdown = {
    'B-24': { count: 0, hours: 0, income: 0 },
    'B-32': { count: 0, hours: 0, income: 0 },
    'C-34': { count: 0, hours: 0, income: 0 }
  };

  incomes.forEach(item => {
    totalHours += (item.hours || 0);
    totalIncome += (item.totalAmount || 0);

    if (unitBreakdown[item.unitId]) {
      unitBreakdown[item.unitId].count += 1;
      unitBreakdown[item.unitId].hours += (item.hours || 0);
      unitBreakdown[item.unitId].income += (item.totalAmount || 0);
    }
  });

  let totalExpense = 0;
  expenses.forEach(item => {
    totalExpense += (item.amount || 0);
  });

  const netProfit = totalIncome - totalExpense;

  // Tampilkan ke Elemen DOM
  const periodLabelEl = document.getElementById('recapPeriodTitle');
  if (periodLabelEl) periodLabelEl.innerText = periodLabel;

  document.getElementById('statTotalCustomers').innerText = `${totalCustomers} Orang`;
  document.getElementById('statTotalHours').innerText = `${totalHours} Jam`;
  document.getElementById('statTotalIncome').innerText = formatRupiah(totalIncome);
  document.getElementById('statTotalExpense').innerText = formatRupiah(totalExpense);

  const profitEl = document.getElementById('statNetProfit');
  if (profitEl) {
    profitEl.innerText = formatRupiah(netProfit);
    if (netProfit >= 0) {
      profitEl.className = 'text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-2';
    } else {
      profitEl.className = 'text-3xl font-extrabold text-rose-600 dark:text-rose-400 mt-2';
    }
  }

  // Unit Breakdown Cards
  const b24El = document.getElementById('breakdownB24');
  const b32El = document.getElementById('breakdownB32');
  const c34El = document.getElementById('breakdownC34');

  if (b24El) b24El.innerText = `${unitBreakdown['B-24'].count} Cust (${unitBreakdown['B-24'].hours} Jam) • ${formatRupiah(unitBreakdown['B-24'].income)}`;
  if (b32El) b32El.innerText = `${unitBreakdown['B-32'].count} Cust (${unitBreakdown['B-32'].hours} Jam) • ${formatRupiah(unitBreakdown['B-32'].income)}`;
  if (c34El) c34El.innerText = `${unitBreakdown['C-34'].count} Cust (${unitBreakdown['C-34'].hours} Jam) • ${formatRupiah(unitBreakdown['C-34'].income)}`;

  // Render Tabel Customer Masuk & Pemasukan
  renderIncomesTable(incomes);

  // Render Tabel Pengeluaran
  renderExpensesTable(expenses);
}

// Render Tabel Pemasukan (Tanpa overstay dan extra charges)
function renderIncomesTable(incomes) {
  const tbody = document.getElementById('tableIncomesBody');
  const emptyState = document.getElementById('emptyIncomesState');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (incomes.length === 0) {
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }
  if (emptyState) emptyState.classList.add('hidden');

  incomes.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 dark:hover:bg-slate-800/40 transition border-b border-slate-100 dark:border-slate-800 text-xs sm:text-sm';

    const unitBadgeClass = item.unitType === 'VIP' 
      ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800' 
      : 'bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-800';

    const dayBadgeText = (item.dayType === 'weekend') ? 'Weekend' : 'Weekday';
    const dayBadgeClass = (item.dayType === 'weekend') ? 'text-indigo-600 dark:text-indigo-400' : 'text-blue-600 dark:text-blue-400';

    tr.innerHTML = `
      <td class="py-3 px-4 font-semibold text-slate-400 dark:text-slate-500">#${incomes.length - index}</td>
      <td class="py-3 px-4 whitespace-nowrap text-slate-700 dark:text-slate-300">${formatDateTimeIndo(item.dateTime)}</td>
      <td class="py-3 px-4">
        <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${unitBadgeClass}">
          ${item.unitId} (${item.unitType})
        </span>
      </td>
      <td class="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
        <div>${item.durationLabel || item.hours + ' Jam'}</div>
        <div class="text-[10px] font-semibold ${dayBadgeClass}">${dayBadgeText}</div>
      </td>
      <td class="py-3 px-4 font-extrabold text-emerald-600 dark:text-emerald-400 whitespace-nowrap text-sm">${formatRupiah(item.totalAmount)}</td>
      <td class="py-3 px-4 font-medium text-slate-600 dark:text-slate-300">${item.paymentMethod || 'Cash'}</td>
      <td class="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">${item.notes || '-'}</td>
      <td class="py-3 px-4 text-right">
        <button onclick="removeIncomeItem('${item.id}')" class="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 p-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition" title="Hapus">
          <svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Render Tabel Pengeluaran
function renderExpensesTable(expenses) {
  const tbody = document.getElementById('tableExpensesBody');
  const emptyState = document.getElementById('emptyExpensesState');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (expenses.length === 0) {
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }
  if (emptyState) emptyState.classList.add('hidden');

  expenses.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 dark:hover:bg-slate-800/40 transition border-b border-slate-100 dark:border-slate-800 text-xs sm:text-sm';

    tr.innerHTML = `
      <td class="py-3 px-4 font-semibold text-slate-400 dark:text-slate-500">#${expenses.length - index}</td>
      <td class="py-3 px-4 whitespace-nowrap text-slate-700 dark:text-slate-300">${formatDateIndo(item.date)}</td>
      <td class="py-3 px-4 font-bold text-slate-900 dark:text-white">${item.category}</td>
      <td class="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">${item.unitId || 'Semua Unit'}</td>
      <td class="py-3 px-4 font-extrabold text-rose-600 dark:text-rose-400 whitespace-nowrap text-sm">${formatRupiah(item.amount)}</td>
      <td class="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">${item.notes || '-'}</td>
      <td class="py-3 px-4 text-right">
        <button onclick="removeExpenseItem('${item.id}')" class="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 p-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition" title="Hapus">
          <svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Render Nilai Pengaturan ke Form
function renderSettingsValues() {
  const savedConfig = getSavedFirebaseConfig ? getSavedFirebaseConfig() : null;
  const firebaseJsonInput = document.getElementById('firebaseConfigJson');
  if (firebaseJsonInput && savedConfig) {
    firebaseJsonInput.value = JSON.stringify(savedConfig, null, 2);
  }
}

// Helper Parser Firebase Config
function parseFirebaseConfigInput(rawInput) {
  let clean = rawInput.trim();
  if (clean.includes('=')) {
    clean = clean.substring(clean.indexOf('=') + 1).trim();
  }
  if (clean.endsWith(';')) {
    clean = clean.slice(0, -1).trim();
  }
  try {
    return JSON.parse(clean);
  } catch (e) {
    try {
      const parseFn = new Function(`return (${clean});`);
      const obj = parseFn();
      if (obj && typeof obj === 'object' && obj.apiKey && obj.projectId) {
        return obj;
      }
    } catch (err2) {}
    throw new Error("Format tidak valid");
  }
}

// Simpan Firebase Config
function handleSaveFirebaseConfig() {
  const jsonInput = document.getElementById('firebaseConfigJson');
  if (!jsonInput) return;

  try {
    const raw = jsonInput.value.trim();
    if (!raw) {
      localStorage.removeItem('sewa_apartemen_firebase_config');
      showToast("Koneksi cloud dinonaktifkan (Mode Lokal).");
      setTimeout(() => location.reload(), 800);
      return;
    }
    const config = parseFirebaseConfigInput(raw);
    saveFirebaseConfig(config);
    showToast("✅ Konfigurasi Firebase disimpan! Menyambungkan...");
    setTimeout(() => location.reload(), 1000);
  } catch (e) {
    alert("Format konfigurasi tidak valid! Pastikan Anda menyalin seluruh objek konfigurasi Firebase (berisi apiKey, projectId, dll).");
  }
}

// Ekspor ke CSV / Excel
function exportToExcelCSV() {
  const { incomes, expenses, periodLabel } = getFilteredData();

  let csvContent = `REKAPITULASI KEUANGAN & CUSTOMER TEKS HOUSE\n`;
  csvContent += `Periode: ${periodLabel}\n`;
  csvContent += `Dicetak pada: ${new Date().toLocaleString('id-ID')}\n\n`;

  csvContent += `1. DATA CUSTOMER & PEMASUKAN\n`;
  csvContent += `No,Tanggal & Waktu,Unit,Tipe,Hari,Paket Durasi,Total Pemasukan,Metode Bayar,Catatan\n`;
  
  incomes.forEach((item, index) => {
    csvContent += `"${index + 1}","${item.dateTime}","${item.unitId}","${item.unitType}","${item.dayType}","${item.durationLabel}","${item.totalAmount}","${item.paymentMethod || 'Cash'}","${(item.notes || '').replace(/"/g, '""')}"\n`;
  });

  csvContent += `\n2. DATA PENGELUARAN\n`;
  csvContent += `No,Tanggal,Kategori,Unit Terkait,Nominal,Catatan\n`;

  expenses.forEach((item, index) => {
    csvContent += `"${index + 1}","${item.date}","${item.category}","${item.unitId}","${item.amount}","${(item.notes || '').replace(/"/g, '""')}"\n`;
  });

  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Rekap_TEKS_HOUSE_${currentFilter.type}_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast("📥 File Excel (CSV) berhasil diunduh!");
}

// Cetak Laporan
function printReport() {
  window.print();
}

// Toast Notifikasi
function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'bg-slate-900 text-white text-sm px-4 py-3 rounded-xl shadow-xl flex items-center space-x-2 transition-all duration-300 transform translate-y-2 opacity-0';
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 10);

  setTimeout(() => {
    toast.classList.add('opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
