const bcrypt = require('bcryptjs');
const { supabase } = require('../config/supabase');

const TABLE = 'booking_users';

// ─── GET /api/users — Ambil semua user terdaftar ──────────────────────────────
const getAllUsers = async (req, res) => {
    try {
        const { data: users, error } = await supabase
            .from(TABLE)
            .select('id, username, nama, email, nim, role, prodi, created_at')
            .order('created_at', { ascending: false });

        if (error) {
            // Jika kolom prodi tidak ditemukan (code 42703), fallback ambil data tanpa kolom prodi
            if (error.code === '42703' || error.message.includes('prodi')) {
                const { data: fallbackUsers, error: fallbackError } = await supabase
                    .from(TABLE)
                    .select('id, username, nama, email, nim, role, created_at')
                    .order('created_at', { ascending: false });

                if (fallbackError) throw fallbackError;

                // Tambahkan key prodi dengan nilai strip agar frontend tidak crash
                const mapped = (fallbackUsers || []).map(u => ({ ...u, prodi: '-' }));
                return res.json(mapped);
            }
            throw error;
        }

        return res.json(users || []);
    } catch (err) {
        console.error('[getAllUsers]', err);
        return res.status(500).json({ message: 'Gagal mengambil data user.' });
    }
};

// ─── GET /api/users/:id — Ambil detail satu user ─────────────────────────────
const getUserById = async (req, res) => {
    const { id } = req.params;

    try {
        const { data: user, error } = await supabase
            .from(TABLE)
            .select('id, username, nama, email, nim, role, prodi, created_at')
            .eq('id', id)
            .single();

        if (error) {
            // Jika kolom prodi tidak ditemukan, fallback ambil tanpa prodi
            if (error.code === '42703' || error.message.includes('prodi')) {
                const { data: fallbackUser, error: fallbackError } = await supabase
                    .from(TABLE)
                    .select('id, username, nama, email, nim, role, created_at')
                    .eq('id', id)
                    .single();

                if (fallbackError) throw fallbackError;
                if (!fallbackUser) {
                    return res.status(404).json({ message: 'User tidak ditemukan.' });
                }

                return res.json({ ...fallbackUser, prodi: '-' });
            }
            throw error;
        }

        if (!user) {
            return res.status(404).json({ message: 'User tidak ditemukan.' });
        }

        return res.json(user);
    } catch (err) {
        console.error('[getUserById]', err);
        return res.status(500).json({ message: 'Gagal mengambil data user.' });
    }
};

// ─── PUT /api/users/:id — Update data user ────────────────────────────────────
const updateUser = async (req, res) => {
    const { id } = req.params;
    const { nama, email, nim, username, role, prodi, password } = req.body;

    // Cegah admin mengedit dirinya sendiri dari panel ini untuk keamanan
    if (String(req.user.uid) === String(id)) {
        return res.status(400).json({ message: 'Tidak bisa mengedit akun sendiri dari panel ini.' });
    }

    try {
        // Cek apakah user ada
        const { data: existing, error: checkError } = await supabase
            .from(TABLE)
            .select('id')
            .eq('id', id)
            .single();

        if (checkError || !existing) {
            return res.status(404).json({ message: 'User tidak ditemukan.' });
        }

        // Siapkan data update — hanya field yang dikirim
        const updateData = {};
        if (nama) updateData.nama = nama;
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ message: 'Format email tidak valid.' });
            }
            updateData.email = email;
        }
        if (nim) updateData.nim = nim;
        if (username) {
            // Cek apakah username baru sudah dipakai user lain
            const { data: duplicateUser, error: dupError } = await supabase
                .from(TABLE)
                .select('id')
                .eq('username', username)
                .neq('id', id)
                .limit(1);

            if (dupError) throw dupError;

            if (duplicateUser && duplicateUser.length > 0) {
                return res.status(409).json({ message: 'Username sudah digunakan oleh user lain.' });
            }
            updateData.username = username;
        }
        if (role) {
            const validRoles = ['admin', 'user'];
            if (!validRoles.includes(role)) {
                return res.status(400).json({ message: 'Role tidak valid. Gunakan "admin" atau "user".' });
            }
            updateData.role = role;
        }
        if (prodi) updateData.prodi = prodi;

        // Jika password dikirim, hash ulang
        if (password) {
            if (password.length < 6) {
                return res.status(400).json({
                    message: 'Password wajib minimal 6 karakter.'
                });
            }
            updateData.password = await bcrypt.hash(password, 10);
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: 'Tidak ada data yang diubah.' });
        }

        const { error: updateError } = await supabase
            .from(TABLE)
            .update(updateData)
            .eq('id', id);

        if (updateError) {
            // Jika update gagal karena kolom prodi tidak ada di database, hapus prodi dan coba lagi
            if (updateError.code === '42703' && updateData.hasOwnProperty('prodi')) {
                delete updateData.prodi;
                const { error: retryError } = await supabase
                    .from(TABLE)
                    .update(updateData)
                    .eq('id', id);
                
                if (retryError) throw retryError;
            } else {
                throw updateError;
            }
        }

        return res.json({ message: 'Data user berhasil diperbarui.' });
    } catch (err) {
        console.error('[updateUser]', err);
        return res.status(500).json({ message: 'Gagal memperbarui data user.' });
    }
};

// ─── DELETE /api/users/:id — Hapus user ───────────────────────────────────────
const deleteUser = async (req, res) => {
    const { id } = req.params;

    // Cegah admin menghapus dirinya sendiri
    if (String(req.user.uid) === String(id)) {
        return res.status(400).json({ message: 'Tidak bisa menghapus akun sendiri.' });
    }

    try {
        // Cek apakah user ada
        const { data: existing, error: checkError } = await supabase
            .from(TABLE)
            .select('id, role')
            .eq('id', id)
            .single();

        if (checkError || !existing) {
            return res.status(404).json({ message: 'User tidak ditemukan.' });
        }

        const { error: deleteError } = await supabase
            .from(TABLE)
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        return res.json({ message: 'User berhasil dihapus.' });
    } catch (err) {
        console.error('[deleteUser]', err);
        return res.status(500).json({ message: 'Gagal menghapus user.' });
    }
};

module.exports = { getAllUsers, getUserById, updateUser, deleteUser };
