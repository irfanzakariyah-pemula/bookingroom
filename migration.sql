-- Migration SQL: Jalankan ini di SQL Editor Supabase Anda untuk menambahkan kolom baru yang diperlukan.

-- 1. Tambahkan kolom 'prodi' ke tabel 'booking_users'
ALTER TABLE booking_users ADD COLUMN IF NOT EXISTS prodi VARCHAR(100) DEFAULT 'Teknik Informatika';

-- 2. Tambahkan kolom 'dosen_pj', 'alasan_penolakan', dan 'prodi' ke tabel 'bookings'
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS dosen_pj VARCHAR(255);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS alasan_penolakan TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS prodi VARCHAR(100);
