const express = require('express');
const router = express.Router();
const { getAllUsers, getUserById, updateUser, deleteUser } = require('../controllers/userController');
const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware');

// Semua route di sini hanya bisa diakses oleh admin
router.get('/', verifyToken, verifyAdmin, getAllUsers);
router.get('/:id', verifyToken, verifyAdmin, getUserById);
router.put('/:id', verifyToken, verifyAdmin, updateUser);
router.delete('/:id', verifyToken, verifyAdmin, deleteUser);

module.exports = router;
