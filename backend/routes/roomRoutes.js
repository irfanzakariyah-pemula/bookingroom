const express = require('express');
const router = express.Router();
const { getRooms, addRoom, updateRoom, deleteRoom } = require('../controllers/roomController');
const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

router.get('/', getRooms); // Also public to users since they can see available rooms
router.post('/', verifyToken, verifyAdmin, upload.single('photo'), addRoom);
router.put('/:id', verifyToken, verifyAdmin, upload.single('photo'), updateRoom);
router.delete('/:id', verifyToken, verifyAdmin, deleteRoom);

module.exports = router;
