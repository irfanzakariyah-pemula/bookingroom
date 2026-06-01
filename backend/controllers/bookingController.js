const { supabase } = require('../config/supabase');

const TABLE = 'bookings';

// ─── POST /api/bookings (user) ────────────────────────────────────────────────
const addBooking = async (req, res) => {
    try {
        const { roomId, roomName, date, duration, purpose, dosen_pj } = req.body;

        // userId SELALU diambil dari JWT token, bukan dari body request (mencegah manipulasi)
        const userId = req.user.uid;
        const username = req.user.username;
        const prodi = req.user.prodi;

        if (!roomId || !date || !duration || !purpose) {
            return res.status(400).json({ message: 'roomId, date, duration, dan purpose wajib diisi.' });
        }

        // 1. Validasi format tanggal (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date) || isNaN(Date.parse(date))) {
            return res.status(400).json({ message: 'Format tanggal tidak valid. Gunakan format YYYY-MM-DD.' });
        }

        // 2. Validasi durasi (wajib berupa bilangan bulat positif > 0)
        const parsedDuration = Number(duration);
        if (isNaN(parsedDuration) || parsedDuration <= 0 || !Number.isInteger(parsedDuration)) {
            return res.status(400).json({ message: 'Durasi peminjaman harus berupa bilangan bulat positif yang valid.' });
        }

        // ── Validasi bentrok jadwal ──────────────────────────────────────────
        // Cek apakah ruangan sudah ada booking pada tanggal yang sama
        // dengan status 'approved' atau 'pending'
        const { data: conflicts, error: conflictError } = await supabase
            .from(TABLE)
            .select('id')
            .eq('room_id', roomId)
            .eq('date', date)
            .in('status', ['pending', 'approved']);

        if (conflictError) throw conflictError;

        if (conflicts && conflicts.length > 0) {
            return res.status(400).json({
                message: 'Ruangan tidak tersedia pada tanggal tersebut. Sudah ada peminjaman yang diproses.'
            });
        }
        // ─────────────────────────────────────────────────────────────────────

        const bookingData = {
            user_id: userId,
            username,
            room_id: roomId,
            room_name: roomName,
            date,
            duration: parsedDuration,
            purpose,
            dosen_pj: dosen_pj || null,
            prodi: prodi || null,
            status: 'pending',
            timestamp: new Date().toISOString(),
        };

        const { data: inserted, error: insertError } = await supabase
            .from(TABLE)
            .insert(bookingData)
            .select('id')
            .single();

        if (insertError) throw insertError;

        res.status(201).json({ message: 'Pengajuan peminjaman berhasil dikirim.', id: inserted.id });
    } catch (err) {
        console.error('[addBooking]', err);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

// ─── GET /api/bookings (admin — semua booking) ────────────────────────────────
const getAllBookings = async (req, res) => {
    try {
        const { data: bookings, error } = await supabase
            .from(TABLE)
            .select('*')
            .order('timestamp', { ascending: false });

        if (error) throw error;

        res.json(bookings || []);
    } catch (err) {
        console.error('[getAllBookings]', err);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

// ─── GET /api/bookings/me (user — booking milik sendiri berdasarkan JWT) ────────
const getUserBookings = async (req, res) => {
    try {
        // Ambil userId dari JWT token agar user hanya bisa melihat data miliknya sendiri
        const userId = req.user.uid;

        const { data: bookings, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('user_id', userId)
            .order('timestamp', { ascending: false });

        if (error) throw error;

        res.json(bookings || []);
    } catch (err) {
        console.error('[getUserBookings]', err);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

// ─── PUT /api/bookings/:id/status (admin) ────────────────────────────────────
const updateBookingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, alasan_penolakan } = req.body;

        const VALID_STATUSES = ['pending', 'approved', 'rejected'];
        if (!VALID_STATUSES.includes(status)) {
            return res.status(400).json({
                message: `Status tidak valid. Pilih salah satu: ${VALID_STATUSES.join(', ')}`
            });
        }

        // Cek apakah booking ada
        const { data: existing, error: findError } = await supabase
            .from(TABLE)
            .select('id')
            .eq('id', id)
            .single();

        if (findError || !existing) {
            return res.status(404).json({ message: 'Data booking tidak ditemukan.' });
        }

        const updateData = { status, updated_at: new Date().toISOString() };
        if (status === 'rejected') {
            updateData.alasan_penolakan = alasan_penolakan || 'Tidak ada alasan spesifik';
        } else {
            updateData.alasan_penolakan = null; // Clear rejection reason if approved
        }

        const { error: updateError } = await supabase
            .from(TABLE)
            .update(updateData)
            .eq('id', id);

        if (updateError) throw updateError;

        res.json({ message: `Status booking berhasil diubah menjadi "${status}".` });
    } catch (err) {
        console.error('[updateBookingStatus]', err);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

module.exports = { addBooking, getAllBookings, getUserBookings, updateBookingStatus };
