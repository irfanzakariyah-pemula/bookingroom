require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Inisialisasi Supabase client
require('./config/supabase');

const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const bookingRoutes = require('./routes/bookingRoutes');

const app = express();

// 1. Menyematkan HTTP Security Headers standar industri global
app.use(helmet());

// 2. Mengonfigurasi pembatasan akses asal (CORS) hanya untuk domain resmi
const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://irfanzakariyah-pemula.github.io'
];

app.use(cors({
    origin: function (origin, callback) {
        // Izinkan request tanpa origin (seperti Postman saat pengembangan)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Akses diblokir oleh CORS policy.'));
        }
    },
    credentials: true
}));

app.use(express.json());

// 3. Mengonfigurasi Rate Limiter untuk mencegah DoS & brute force
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 menit
    max: 300, // Maksimal 300 request per 15 menit dari satu IP
    message: { message: 'Terlalu banyak request. Silakan coba lagi beberapa saat lagi.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(globalLimiter);

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 menit
    max: 15, // Maksimal 15 kali percobaan login per 15 menit dari satu IP
    message: { success: false, message: 'Terlalu banyak percobaan login. Silakan coba lagi setelah 15 menit.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/auth/login', loginLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);

// Global error handler - Sembunyikan informasi error sensitif
app.use((err, req, res, next) => {
    console.error('[Server Error]', err.stack);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});

