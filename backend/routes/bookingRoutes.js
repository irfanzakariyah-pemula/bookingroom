const express = require('express');
const router = express.Router();
const { addBooking, getAllBookings, getUserBookings, updateBookingStatus } = require('../controllers/bookingController');
const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware');

router.post('/', verifyToken, addBooking);
router.get('/', verifyToken, verifyAdmin, getAllBookings);
router.get('/me', verifyToken, getUserBookings);
router.put('/:id/status', verifyToken, verifyAdmin, updateBookingStatus);

module.exports = router;
