# StudySync - Portal Tugas & Materi Kuliah Mahasiswa 🎓

Website interaktif untuk menyimpan, melacak, dan mengorganisir seluruh **Tugas Kuliah** dan **Materi / Catatan Perkuliahan** secara terpusat, rapi, dan otomatis tersimpan di peramban Anda.

---

## 📂 Struktur File

```text
portal-kuliah/
├── index.html   # Struktur tata letak halaman (Ringkasan, Tab Tugas, Tab Materi, Modal)
├── style.css    # Styling modern bernuansa akademik, kartu tugas, deadline badge, Dark Mode
├── app.js       # Logika CRUD tugas & materi, hitung deadline otomatis, filter matkul, LocalStorage
└── README.md    # Panduan penggunaan
```

---

## 🎯 Fitur Sesuai Kebutuhan Anda

### 1. Manajemen Tugas Kuliah (Assignment Tracker)
* **Informasi Lengkap**: Judul tugas, **Mata Kuliah**, **Deadline** (tanggal & jam), tingkat prioritas (Tinggi/Sedang/Rendah), dan catatan/deskripsi.
* **Unggah Berkas Tugas Langsung**: Lampirkan lembar soal (PDF), instruksi Word, spreadsheet, gambar, atau draf pengerjaan tugas langsung dari HP atau laptop tanpa perlu salin link Google Drive!
* **Penghitung Deadline Pintar**:
  * 🔴 *Mendesak*: Jika deadline hari ini, besok, atau sudah terlewat.
  * 🟡 *Segera*: Jika deadline kurang dari 3 hari lagi.
  * ⚪ *Aman*: Jika deadline masih lama.
* **Centang Selesai**: Tugas dapat ditandai selesai (dicoret rapi dan statusnya diperbarui).
* **Filter Cepat**: Filter berdasarkan mata kuliah, status (belum selesai / selesai), dan pencarian judul tugas.

### 2. Arsip Materi Kuliah (Course Materials & Notes)
* **Informasi Lengkap**: Topik bahasan, **Mata Kuliah**, **Pertemuan Ke-** (pertemuan 1, 2, 3, dst.), dan **Tanggal perkuliahan**.
* **Unggah Berkas / Slide Langsung**: Unggah slide presentasi (PowerPoint PPT/PPTX), PDF e-book/jurnal, dokumen Word, ZIP, atau gambar materi langsung dari perangkat Anda.
* **Pratinjau & Unduh Instan**: Klik tombol berkas pada kartu materi untuk langsung membuka PDF/gambar di tab baru atau mengunduh slide presentasi secara otomatis.
* **Dukungan Tautan Eksternal Fleksibel**: Tetap menyediakan opsi memasukkan tautan Google Drive / Web jika berkas berukuran sangat besar atau berupa video.
* **Catatan Rangkuman**: Kotak catatan untuk menuliskan poin-poin penting dari dosen.
* **Pencarian Topik**: Mudah mencari catatan perkuliahan berdasarkan kata kunci atau pertemuan.

### 3. Kelola Mata Kuliah (Course Management)
* **Pendaftaran Mandiri**: Daftarkan mata kuliah semester ini secara manual tanpa perlu koding.
* **Informasi Mata Kuliah**: Nama Mata Kuliah, Kode MK (misal: IF2101), Bobot SKS, Nama Dosen Pengampu, Jadwal/Hari & Jam, Ruang Perkuliahan, serta Pilihan Warna Aksen.
* **Hubungan Data Otomatis**: Setiap kartu mata kuliah menampilkan jumlah tugas aktif dan materi yang tersimpan, serta tombol pintas untuk langsung memfilter tugas & materi terkait.

### 4. Ringkasan & Dashboard Utama (Overview)
* Metrik jumlah tugas aktif, tugas selesai, dan total materi tersimpan.
* Daftar **Prioritas & Deadline Terdekat** lengkap dengan berkas soal tugas yang terlampir.
* Daftar materi perkuliahan terbaru yang siap dibuka kapan saja.

### 5. Penyimpanan Berkas & Cadangan (IndexedDB & Backup/Restore)
* **Penyimpanan Berkas IndexedDB**: Seluruh berkas PDF, slide PPT, dan dokumen disimpan secara aman di database internal browser (`IndexedDB`) yang mendukung kapasitas ratusan Megabyte (bebas dari batasan 5MB `localStorage`).
* **Cadangkan Lengkap (Full Backup)**: Mengunduh data tugas, materi, mata kuliah, **beserta seluruh berkas lampiran fisiknya** ke dalam 1 file `.json`.
* **Pulihkan Lengkap (Restore)**: Memulihkan kembali seluruh data dan file lampiran ke browser / komputer manapun hanya dengan 1 kali klik.

### 6. Layar Kunci & Keamanan Sandi (Portal Lock & Password)
* **Gerbang Sandi Tanpa Username**: Saat pertama kali membuka link website, layar kunci akan muncul menghalangi akses sebelum sandi yang benar dimasukkan.
* **Kata Sandi Default**: `@Mikasa262728`
* **Keamanan Kriptografi (SHA-256)**: Sandi tidak disimpan dalam bentuk teks biasa, melainkan di-hash dengan algoritma kriptografi SHA-256 browser.
* **Fitur Ganti Sandi**: Pemilik portal dapat mengganti kata sandi kapan saja lewat tombol **"Ganti Sandi"** di menu samping.
* **Kunci Cepat**: Tombol **"Kunci Portal"** di sidebar atau bar atas memungkinkan Anda langsung mengunci aplikasi saat meninggalkan laptop/HP.
* **Opsi Ingat Saya**: Centang *"Ingat saya di perangkat ini"* agar Anda tidak perlu mengetik sandi berulang kali di perangkat pribadi.

---

## 🔥 Panduan Menghubungkan Firebase (Real-time Cloud Sync & Storage)

Dengan Firebase, Anda bisa membuka website ini di **Laptop** dan **HP** sekaligus, dan datanya akan tersinkronisasi secara otomatis dalam hitungan detik!

### Langkah 1: Buat Proyek Firebase Gratis
1. Buka [console.firebase.google.com](https://console.firebase.google.com/) dan login dengan akun Google Anda.
2. Klik tombol **"Add project"** (Tambahkan proyek).
3. Beri nama proyek Anda (misal: `studysync-kuliah`).
4. Matikan centang *Google Analytics* (opsional, agar cepat), lalu klik **Create project**.

### Langkah 2: Daftarkan Web App & Dapatkan Config
1. Pada halaman utama proyek di Firebase Console, klik ikon Web (`</>`).
2. Masukkan nama aplikasi (misal: `StudySync Web`), abaikan centang Firebase Hosting, lalu klik **Register app**.
3. Anda akan melihat kode `const firebaseConfig = { ... };`.
4. Salin (copy) kode konfigurasi tersebut.

### Langkah 3: Aktifkan Cloud Firestore & Cloud Storage
1. **Cloud Firestore (Database Tugas & Materi)**:
   * Di menu sebelah kiri, klik **Build** > **Firestore Database**.
   * Klik **Create database**, pilih lokasi (misal: `asia-southeast2` Jakarta atau Singapore).
   * Pilih **Start in test mode** (Mode uji coba), lalu klik **Create**.
2. **Cloud Storage (Penyimpanan Berkas Lampiran)**:
   * Di menu sebelah kiri, klik **Build** > **Storage**.
   * Klik **Get started**, pilih **Start in test mode**, lalu klik **Done**.

### Langkah 4: Hubungkan ke StudySync
Anda bisa memilih salah satu cara berikut:
* **Cara Termudah (Lewat Web)**:
  1. Buka website StudySync di browser Anda.
  2. Klik tombol **"Cloud Sync"** di bar atas (atau di sidebar).
  3. Tempelkan (paste) kode config Firebase Anda ke kotak yang disediakan.
  4. Klik tombol **"Simpan & Hubungkan"**.
  5. Lampu status akan berubah menjadi **🟢 Cloud Aktif**!
* **Atau Langsung di Kode**:
  1. Buka file `firebase-config.js`.
  2. Isi objek `DEFAULT_FIREBASE_CONFIG` dengan apiKey, projectId, dll milik Anda.
  3. Simpan file, lalu commit & push ke GitHub Anda!

---

## 🚀 Cara Membuka & Menjalankan di VS Code

### Opsi A: Lewat Menu VS Code
1. Buka aplikasi **VS Code**.
2. Klik menu **File** > **Open Folder...** (shortcut `Ctrl + K, Ctrl + O`).
3. Pilih folder:
   ```
   C:\Users\ACER\.gemini\antigravity\scratch\portal-kuliah
   ```
4. Klik **Select Folder**.

### Opsi B: Buka via Terminal / PowerShell
Jalankan perintah ini di PowerShell:
```powershell
code "C:\Users\ACER\.gemini\antigravity\scratch\portal-kuliah"
```

---

## 🌐 Cara Menjalankan Website

1. **Menggunakan Live Server di VS Code**:
   * Instal ekstensi **Live Server** di VS Code (`Ctrl + Shift + X` lalu cari *Live Server*).
   * Buka file `index.html`.
   * Klik kanan pada kode `index.html` dan pilih **"Open with Live Server"** (atau klik tombol **"Go Live"** di pojok kanan bawah).
2. **Atau Buka Langsung**:
   * Buka Windows File Explorer di `C:\Users\ACER\.gemini\antigravity\scratch\portal-kuliah`.
   * Klik ganda pada `index.html` untuk membukanya di browser (Chrome / Edge / Firefox).
