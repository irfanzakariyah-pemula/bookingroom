require('dotenv').config();
const { supabase } = require('./config/supabase');
const bcrypt = require('bcryptjs');

const TABLE = 'booking_users';

async function resetAdmin() {
    const username = 'admin';
    const passwordPlain = 'admin123'; // Password baru yang mudah diingat
    
    try {
        console.log(`[Reset Admin] Mengenkripsi password baru...`);
        const hashedPassword = await bcrypt.hash(passwordPlain, 10);
        
        // Cek apakah user admin sudah ada
        const { data: users, error: checkError } = await supabase
            .from(TABLE)
            .select('*')
            .eq('username', username);

        if (checkError) {
            throw checkError;
        }

        if (users && users.length > 0) {
            // Jika sudah ada, update passwordnya
            const adminUser = users[0];
            console.log(`[Reset Admin] Ditemukan user "${username}" (ID: ${adminUser.id}). Mengupdate password...`);
            
            const { error: updateError } = await supabase
                .from(TABLE)
                .update({ password: hashedPassword })
                .eq('id', adminUser.id);

            if (updateError) throw updateError;
            
            console.log(`==============================================`);
            console.log(`✅ BERHASIL! Password admin berhasil di-reset.`);
            console.log(`Username : ${username}`);
            console.log(`Password : ${passwordPlain}`);
            console.log(`==============================================`);
        } else {
            // Jika belum ada, buat baru
            console.log(`[Reset Admin] User "${username}" belum ada. Membuat user admin baru...`);
            
            const newAdmin = {
                username,
                password: hashedPassword,
                role: 'admin',
                nama: 'Administrator Utama',
                email: 'admin@bookingroom.com',
                nim: '1234567890',
                created_at: new Date().toISOString()
            };

            const { error: insertError } = await supabase
                .from(TABLE)
                .insert(newAdmin);

            if (insertError) throw insertError;

            console.log(`==============================================`);
            console.log(`✅ BERHASIL! Akun admin baru berhasil dibuat.`);
            console.log(`Username : ${username}`);
            console.log(`Password : ${passwordPlain}`);
            console.log(`==============================================`);
        }
    } catch (err) {
        console.error('❌ Gagal mereset admin:', err.message);
    }
    process.exit();
}

resetAdmin();
