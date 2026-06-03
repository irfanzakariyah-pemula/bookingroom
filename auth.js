// auth.js
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : 'https://bookingroom-r3nz.onrender.com/api';



export async function login(username, password) {
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (!res.ok) {
            return { success: false, message: data.message || 'Login gagal' };
        }

        // Simpan token, uid, role, nama, dan username ke localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('currentUser', JSON.stringify({
            uid: data.uid,
            role: data.role,
            username: data.username,
            nama: data.nama,
            prodi: data.prodi
        }));

        return { success: true, uid: data.uid, role: data.role, username: data.username, nama: data.nama, prodi: data.prodi };
    } catch (err) {
        console.error('Login error:', err);
        return { success: false, message: 'Tidak dapat terhubung ke server' };
    }
}

/**
 * Mendaftarkan user baru. Hanya bisa dipanggil oleh admin (butuh token JWT admin).
 * @param {object} userData - { nama, email, nim, username, password, role }
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export async function register({ nama, email, nim, username, password, role = 'user', prodi }) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ nama, email, nim, username, password, role, prodi })
        });

        const data = await res.json();

        if (!res.ok) {
            return { success: false, message: data.message || 'Registrasi gagal' };
        }

        return { success: true, message: data.message };
    } catch (err) {
        console.error('Register error:', err);
        return { success: false, message: 'Tidak dapat terhubung ke server' };
    }
}

export function getCurrentUser() {
    return JSON.parse(localStorage.getItem('currentUser'));
}

// Cek apakah JWT token sudah expired
export function isTokenExpired() {
    const token = localStorage.getItem('token');
    if (!token) return true;

    try {
        // JWT payload ada di bagian kedua (base64 encoded)
        const payload = JSON.parse(atob(token.split('.')[1]));
        // exp dalam detik, Date.now() dalam milidetik
        return (payload.exp * 1000) < Date.now();
    } catch (e) {
        return true; // token rusak = anggap expired
    }
}

export function logout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}

export function checkAuth(requiredRole) {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    // Cek apakah token expired — otomatis logout jika iya
    if (isTokenExpired()) {
        alert('Sesi Anda telah berakhir. Silakan login kembali.');
        logout();
        return;
    }

    if (requiredRole && user.role !== requiredRole) {
        if (user.role === 'admin') window.location.href = 'admin.html';
        else window.location.href = 'user.html';
    }
    return user;
}

// Hook up logout buttons globally if they exist
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
});
