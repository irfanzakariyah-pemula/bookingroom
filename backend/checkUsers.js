require('dotenv').config();
const { supabase } = require('./config/supabase');

async function check() {
    try {
        const { data: users, error } = await supabase
            .from('booking_users')
            .select('*');

        if (error) {
            console.error('❌ Gagal membaca database:', error.message);
        } else {
            console.log('====================================================');
            console.log(`Ditemukan ${users.length} user di database:`);
            console.log('====================================================');
            users.forEach((u, i) => {
                console.log(`${i+1}. ID: ${u.id} | Username: "${u.username}" | Role: "${u.role}" | Nama: "${u.nama}"`);
            });
            console.log('====================================================');
        }
    } catch (err) {
        console.error('Terjadi kesalahan:', err.message);
    }
    process.exit();
}

check();
