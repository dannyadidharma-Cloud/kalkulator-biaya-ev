# Kalkulator Biaya Kendaraan

Bandingkan biaya penggunaan mobil listrik, plug-in hybrid, bensin, dan diesel berdasarkan pola perjalanan dan tarif yang Anda masukkan. Halaman berjalan di browser tanpa akun, API key, database, atau paket tambahan. Semua kendaraan dan angka bawaan adalah contoh yang dapat disesuaikan.

## Jalankan secara lokal

1. Buka terminal di folder ini.
2. Jalankan `python -m http.server 8000 --bind 127.0.0.1` dengan Python 3. Di Windows, `py -3 -m http.server 8000 --bind 127.0.0.1` juga bisa digunakan jika tersedia.
3. Buka [http://127.0.0.1:8000](http://127.0.0.1:8000) di browser. Tekan **Ctrl+C** di terminal untuk menghentikan server.

Gunakan alamat server lokal tersebut agar browser bisa memuat modul JavaScript.

## Contoh 50 km per hari

Isi **50 km per hari** dan **26 hari per bulan**. Kalkulator memakai **15.600 km per tahun** untuk keempat kendaraan. Dengan nilai awal lainnya, mobil listrik contoh menghabiskan **Rp4.600.000 per tahun** atau sekitar **Rp295 per km**. Ubah porsi pengisian rumah dari 80% ke **0%** untuk mencoba **100% SPKLU**. Dengan tarif contoh yang sama, hasil mobil listrik menjadi **Rp7.370.000 per tahun** atau sekitar **Rp472 per km**. Tombol **Reset contoh** mengembalikan isian awal.

Pilih periode **1, 3, atau 5 tahun**. Pada contoh 50 km per hari dengan pengisian 100% di SPKLU, total listrik untuk 5 tahun adalah **Rp36.850.000** untuk 78.000 km. Biaya listrik mencakup tarif rumah dan SPKLU, energi yang hilang saat pengisian, serta biaya per sesi SPKLU. Jumlah sesi dihitung dari energi SPKLU setahun dan dibulatkan ke atas. Plug-in hybrid membagi jarak antara penggerak listrik dan bensin. Jika diaktifkan, biaya servis dan pajak berlaku setiap tahun sepanjang periode pilihan. Harga beli, cicilan, asuransi, parkir, penyusutan, dan penggantian baterai berada di luar simulasi.

## Pengujian

Dengan Node.js terpasang, jalankan `node --test tests/ev-cost.test.mjs`. Modul `ev-cost-model.mjs` berisi fungsi hitung yang dapat dipanggil terpisah dari halaman.
