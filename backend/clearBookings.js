require('dotenv').config();
const { supabase } = require('./config/supabase');

const TABLE = 'bookings';

async function clearBookings() {
    console.log('[Clear Bookings] Menghubungkan ke database...');
    try {
        // Hapus semua baris di tabel bookings dengan mencocokkan id yang tidak null (atau menggunakan filter neq)
        const { data, error, count } = await supabase
            .from(TABLE)
            .delete()
            .neq('id', 0); // Menghapus semua baris

        if (error) {
            throw error;
        }

        console.log(`==============================================`);
        console.log(`✅ BERHASIL! Seluruh data riwayat peminjaman telah dikosongkan.`);
        console.log(`==============================================`);
    } catch (err) {
        console.error('❌ Gagal mengosongkan riwayat:', err.message);
    }
    process.exit();
}

clearBookings();
