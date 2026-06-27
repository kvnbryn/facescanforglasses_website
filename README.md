# StockScan

PWA inventory berbasis barcode untuk gudang, toko kecil, kampus, atau organisasi. Frontend berjalan sebagai static export, kamera hanya dipakai di perangkat pengguna, dan backend production memakai Cloudflare Workers + D1 tanpa VPS.

## Yang sudah tersedia

- Login PIN admin
- Dashboard stok, restock radar, dan grafik arus 7 hari
- Scan barcode via kamera (native `BarcodeDetector`, fallback ZXing) + input manual
- Tambah/edit/nonaktifkan barang
- Stok masuk, stok keluar, dan penyesuaian fisik
- Validasi stok minus dan movement log
- Pencarian, kategori, sort, dan filter low-stock
- Export product CSV, movement CSV, dan backup JSON
- Restore backup JSON pada mode lokal
- PWA manifest, service worker, dan icon maskable
- Backend Worker API, auth token HMAC, CORS, dan schema D1
- Mode demo lokal yang tetap tersimpan setelah browser ditutup

## Jalankan lokal

Butuh Node.js 20+.

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`, lalu login dengan:

```text
username: admin
PIN: 123456
```

Tanpa `NEXT_PUBLIC_API_URL`, aplikasi otomatis berjalan dalam mode demo dan menyimpan data ke `localStorage` browser.

### Buka dari HP di jaringan yang sama

Script `npm run dev` sudah bind ke `0.0.0.0:3000`. Pastikan laptop dan HP berada di Wi-Fi/SSID yang sama, lalu buka alamat **HTTP** yang ditampilkan pada baris `Network`, misalnya `http://10.203.123.131:3000`.

Jika Windows Firewall memblokirnya, buka PowerShell memakai **Run as administrator**, lalu jalankan:

```powershell
New-NetFirewallRule -DisplayName "StockScan Dev (TCP 3000)" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000 -Profile Any -RemoteAddress LocalSubnet
```

Alternatif yang lebih mudah: jalankan `scripts\allow-mobile-access.cmd`. Script akan meminta konfirmasi Administrator melalui UAC dan membuat rule yang sama.

Rule tersebut hanya menerima koneksi dari subnet lokal. Jika halaman masih tidak dapat dijangkau, jaringan kemungkinan memakai client/AP isolation; gunakan Wi-Fi rumah, hotspot laptop, Cloudflare Tunnel, atau deploy Pages.

Catatan: halaman lokal via IP memakai HTTP. Browser HP biasanya membutuhkan HTTPS untuk memberikan akses kamera. Gunakan deployment Cloudflare atau tunnel HTTPS saat menguji scanner kamera.

## Build frontend

```bash
npm run build
```

Hasil static export ada di folder `out/`. Folder ini dapat di-host di Cloudflare Pages.

## Deploy gratis ke Cloudflare

Arsitektur production:

```text
Cloudflare Pages (frontend PWA)
        ↓ HTTPS API
Cloudflare Worker (auth + validasi + endpoint)
        ↓ binding internal
Cloudflare D1 (SQLite serverless)
```

### 1. Buat database D1

Masuk ke folder worker dan install dependency:

```bash
cd worker
npm install
npx wrangler login
npx wrangler d1 create stockscan-db
```

Salin `database_id` dari output ke `worker/wrangler.toml`, kemudian jalankan schema:

```bash
npm run db:remote
```

### 2. Simpan rahasia Worker

Buat hash SHA-256 PIN secara lokal:

```bash
node -e "crypto.subtle.digest('SHA-256',new TextEncoder().encode('GANTI_PIN_ANDA')).then(x=>console.log(Buffer.from(x).toString('hex')))"
```

Masukkan hasilnya sebagai secret, lalu buat secret acak minimal 32 karakter:

```bash
npx wrangler secret put ADMIN_PIN_HASH
npx wrangler secret put AUTH_SECRET
```

Jangan taruh PIN atau secret di Git.

### 3. Deploy Worker

Ubah `ALLOWED_ORIGIN` di `worker/wrangler.toml` menjadi domain Pages Anda setelah tersedia.

```bash
npm run deploy
```

Catat URL Worker, misalnya `https://stockscan-api.<subdomain>.workers.dev`.

### 4. Deploy Pages

Di Cloudflare Dashboard → Workers & Pages → Create → Pages:

- Hubungkan repository Git.
- Build command: `npm run build`
- Output directory: `out`
- Environment variable: `NEXT_PUBLIC_API_URL=https://stockscan-api.<subdomain>.workers.dev`
- Node version: 20 atau lebih baru

Setelah Pages mendapat domain final, perbarui `ALLOWED_ORIGIN` pada Worker lalu deploy ulang Worker.

Cloudflare memberi HTTPS otomatis, yang dibutuhkan browser untuk akses kamera. Pages, Workers, dan D1 memiliki free tier; batas serta kebijakan platform dapat berubah, jadi cek dashboard Cloudflare sebelum production dan tetap lakukan backup berkala.

## Catatan scanner

Scanner mengutamakan API browser `BarcodeDetector`, lalu otomatis memakai bundle ZXing lokal untuk browser yang belum mendukungnya. Format populer seperti EAN-13, EAN-8, UPC, Code 128, Code 39, dan QR dapat dibaca. Jika izin kamera ditolak, input barcode manual selalu tersedia.

Video kamera tidak dikirim ke server dan tidak disimpan. Hanya nilai teks hasil barcode yang diproses.

## Struktur penting

```text
src/components/stockscan/StockScanApp.tsx  UI dan flow aplikasi
src/lib/stockscan.ts                       tipe, seed demo, CSV helper
public/manifest.webmanifest                konfigurasi PWA
public/sw.js                               cache app shell
worker/src/index.ts                        Cloudflare Worker API
worker/schema.sql                          schema dan index D1
worker/wrangler.toml                       konfigurasi deployment Worker
```

## Safety production

- Ganti PIN default sebelum dipakai.
- Set `ALLOWED_ORIGIN` ke domain Pages final.
- Simpan `ADMIN_PIN_HASH` dan `AUTH_SECRET` sebagai Wrangler secrets.
- Export backup JSON/CSV secara rutin.
- Barcode selalu diperlakukan sebagai string agar angka nol di depan tidak hilang.
- Semua perubahan stok production melewati movement log dan update bersyarat untuk mengurangi konflik antarperangkat.
