const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { supabase } = require('../config/supabase');

const TABLE = 'booking_users';

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
const login = async (req, res) => {
    const { username, password } = req.body;

    console.log('[DEBUG LOGIN] Incoming request:', { username, passwordLength: password ? password.length : 0 });

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username dan password wajib diisi.' });
    }

    try {
        console.log('[DEBUG LOGIN] Searching database for username:', username);
        // Cari user berdasarkan username di Supabase
        const { data: users, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('username', username)
            .limit(1);

        if (error) {
            console.error('[DEBUG LOGIN] Supabase Query Error:', error.message);
            throw error;
        }

        console.log('[DEBUG LOGIN] Query result: users found =', users ? users.length : 0);

        if (!users || users.length === 0) {
            console.log('[DEBUG LOGIN] User not found in database');
            return res.status(401).json({ success: false, message: 'Username atau password salah.' });
        }

        const userData = users[0];
        console.log('[DEBUG LOGIN] Found user:', { id: userData.id, username: userData.username, role: userData.role });

        // Verifikasi password dengan bcrypt
        const isPasswordValid = await bcrypt.compare(password, userData.password);
        console.log('[DEBUG LOGIN] Bcrypt validation:', isPasswordValid ? 'SUCCESS' : 'FAILED');

        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: 'Username atau password salah.' });
        }

        // Buat JWT token
        const token = jwt.sign(
            { uid: userData.id, username: userData.username, role: userData.role, nama: userData.nama || userData.username },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        return res.json({
            success: true,
            token,
            uid: userData.id,
            role: userData.role,
            username: userData.username,
            nama: userData.nama || userData.username
        });
    } catch (err) {
        console.error('[login]', err);
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
    }
};

// ─── POST /api/auth/register (admin only) ────────────────────────────────────
const register = async (req, res) => {
    const { username, password, role, nama, email, nim } = req.body;

    if (!username || !password || !nama || !email || !nim) {
        return res.status(400).json({ message: 'Semua field (username, password, nama, email, nim/nip) wajib diisi.' });
    }

    // 1. Validasi format email menggunakan standard Regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Format email tidak valid.' });
    }

    // 2. Validasi kekuatan password (minimal 8 karakter, wajib ada huruf dan angka)
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordRegex.test(password)) {
        return res.status(400).json({ 
            message: 'Password kurang kuat. Wajib minimal 8 karakter dan mengandung kombinasi huruf dan angka.' 
        });
    }

    const validRoles = ['admin', 'user'];
    const userRole = validRoles.includes(role) ? role : 'user';


    try {
        // Cek apakah username sudah digunakan
        const { data: existing, error: checkError } = await supabase
            .from(TABLE)
            .select('id')
            .eq('username', username)
            .limit(1);

        if (checkError) throw checkError;

        if (existing && existing.length > 0) {
            return res.status(409).json({ message: 'Username sudah digunakan.' });
        }

        // Hash password sebelum disimpan
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
            username,
            password: hashedPassword,
            role: userRole,
            nama,
            email,
            nim,
            created_at: new Date().toISOString(),
        };

        const { data: insertedUser, error: insertError } = await supabase
            .from(TABLE)
            .insert(newUser)
            .select('id')
            .single();

        if (insertError) throw insertError;

        return res.status(201).json({
            message: 'User berhasil dibuat.',
            id: insertedUser.id,
            username,
            role: userRole,
        });
    } catch (err) {
        console.error('[register]', err);
        return res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
};

module.exports = { login, register };
