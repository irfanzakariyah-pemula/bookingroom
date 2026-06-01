const { supabase } = require('../config/supabase');
const path = require('path');

const TABLE = 'rooms';
const STORAGE_BUCKET = 'room-photos';

// ─── Helper: Upload file buffer ke Supabase Storage ───────────────────────────
async function uploadImageToStorage(file) {
    const ext = path.extname(file.originalname);
    const uniqueName = `room-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const filePath = `rooms/${uniqueName}`;

    const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: false,
        });

    if (error) throw error;

    // Dapatkan URL publik permanen
    const { data } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);

    return data.publicUrl;
}

// ─── Helper: Hapus file dari Supabase Storage ────────────────────────────────
async function deleteImageFromStorage(publicUrl) {
    if (!publicUrl) return;
    try {
        // Ekstrak path dari URL publik
        // Format: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
        const urlObj = new URL(publicUrl);
        const pathParts = urlObj.pathname.split(`/object/public/${STORAGE_BUCKET}/`);
        if (pathParts.length < 2) return;
        const filePath = pathParts[1];

        await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
    } catch (err) {
        console.warn('[deleteImageFromStorage] Gagal menghapus foto dari Storage:', err.message);
    }
}

// ─── GET /api/rooms ───────────────────────────────────────────────────────────
const getRooms = async (req, res) => {
    try {
        const { data: rooms, error } = await supabase
            .from(TABLE)
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;

        res.json(rooms || []);
    } catch (err) {
        console.error('[getRooms]', err);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

// ─── POST /api/rooms (admin) ──────────────────────────────────────────────────
const addRoom = async (req, res) => {
    try {
        const { name, capacity, status } = req.body;

        if (!name || !capacity) {
            return res.status(400).json({ message: 'Nama dan kapasitas ruangan wajib diisi.' });
        }

        // Validasi kapasitas (wajib berupa bilangan bulat positif > 0)
        const parsedCapacity = Number(capacity);
        if (isNaN(parsedCapacity) || parsedCapacity <= 0 || !Number.isInteger(parsedCapacity)) {
            return res.status(400).json({ message: 'Kapasitas ruangan harus berupa bilangan bulat positif yang valid.' });
        }

        // Upload foto jika ada — jika gagal, lanjutkan tanpa foto
        let photoUrl = '';
        if (req.file) {
            try {
                photoUrl = await uploadImageToStorage(req.file);
            } catch (storageErr) {
                console.warn('[addRoom] Gagal upload foto ke Supabase Storage:', storageErr.message);
                console.warn('[addRoom] Ruangan akan disimpan tanpa foto.');
            }
        }

        const roomData = {
            name,
            capacity: parsedCapacity,
            status: status || 'available',
            photo: photoUrl,
            created_at: new Date().toISOString(),
        };

        const { data: inserted, error } = await supabase
            .from(TABLE)
            .insert(roomData)
            .select('id')
            .single();

        if (error) throw error;

        const message = photoUrl
            ? 'Ruangan berhasil ditambahkan.'
            : req.file
                ? 'Ruangan berhasil ditambahkan, tetapi foto gagal diupload (periksa konfigurasi Supabase Storage).'
                : 'Ruangan berhasil ditambahkan.';

        res.status(201).json({ message, id: inserted.id });
    } catch (err) {
        console.error('[addRoom]', err);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

// ─── PUT /api/rooms/:id (admin) ───────────────────────────────────────────────
const updateRoom = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, capacity, status } = req.body;

        // Ambil data ruangan yang ada
        const { data: existing, error: findError } = await supabase
            .from(TABLE)
            .select('*')
            .eq('id', id)
            .single();

        if (findError || !existing) {
            return res.status(404).json({ message: 'Ruangan tidak ditemukan.' });
        }

        let parsedCapacity = existing.capacity;
        if (capacity !== undefined) {
            // Validasi kapasitas baru jika ada
            parsedCapacity = Number(capacity);
            if (isNaN(parsedCapacity) || parsedCapacity <= 0 || !Number.isInteger(parsedCapacity)) {
                return res.status(400).json({ message: 'Kapasitas ruangan harus berupa bilangan bulat positif yang valid.' });
            }
        }

        const updateData = {
            name: name || existing.name,
            capacity: parsedCapacity,
            status: status || existing.status,
            updated_at: new Date().toISOString(),
        };

        // Upload foto baru jika ada
        if (req.file) {
            try {
                updateData.photo = await uploadImageToStorage(req.file);
                // Hapus foto lama jika ada
                if (existing.photo) {
                    await deleteImageFromStorage(existing.photo);
                }
            } catch (storageErr) {
                console.warn('[updateRoom] Gagal upload foto:', storageErr.message);
            }
        }

        const { error: updateError } = await supabase
            .from(TABLE)
            .update(updateData)
            .eq('id', id);

        if (updateError) throw updateError;

        res.json({ message: 'Ruangan berhasil diperbarui.' });
    } catch (err) {
        console.error('[updateRoom]', err);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

// ─── DELETE /api/rooms/:id (admin) ───────────────────────────────────────────
const deleteRoom = async (req, res) => {
    try {
        const { id } = req.params;

        // Ambil data ruangan dulu untuk mendapatkan URL foto
        const { data: existing, error: findError } = await supabase
            .from(TABLE)
            .select('photo')
            .eq('id', id)
            .single();

        if (findError || !existing) {
            return res.status(404).json({ message: 'Ruangan tidak ditemukan.' });
        }

        // Hapus foto dari Supabase Storage jika ada
        if (existing.photo) {
            await deleteImageFromStorage(existing.photo);
        }

        const { error: deleteError } = await supabase
            .from(TABLE)
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        res.json({ message: 'Ruangan berhasil dihapus.' });
    } catch (err) {
        console.error('[deleteRoom]', err);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

module.exports = { getRooms, addRoom, updateRoom, deleteRoom };
