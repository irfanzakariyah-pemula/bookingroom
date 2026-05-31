const express = require('express');
const router = express.Router();
const { login, register } = require('../controllers/authController');
const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware');

router.post('/login', login);

// Hanya admin yang bisa mendaftarkan user baru
router.post('/register', verifyToken, verifyAdmin, register);

module.exports = router;
