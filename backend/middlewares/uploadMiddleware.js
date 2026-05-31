const multer = require('multer');

// Gunakan memoryStorage: file disimpan di buffer RAM sementara
// Controller akan menguploadnya ke Supabase Storage
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Maks 5MB per file
    fileFilter: function (req, file, cb) {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Hanya file gambar yang diperbolehkan!'), false);
        }
        cb(null, true);
    }
});

module.exports = upload;
