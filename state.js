// state.js
// Mock DB using localStorage

const INITIAL_ROOMS = [
    { id: '1', name: 'Ruang Rapat Alpha', capacity: 10, target: 'User', status: 'available', photo: '/images/room_alpha.png' },
    { id: '2', name: 'Ruang Seminar Beta', capacity: 50, target: 'Admin', status: 'available', photo: '/images/room_beta.png' },
    { id: '3', name: 'Ruang Eksekutif Gamma', capacity: 5, target: 'Guest', status: 'maintenance', photo: '/images/room_gamma.png' }
];

export function initStorage() {
    if (!localStorage.getItem('rooms')) {
        localStorage.setItem('rooms', JSON.stringify(INITIAL_ROOMS));
    }
    if (!localStorage.getItem('bookings')) {
        localStorage.setItem('bookings', JSON.stringify([]));
    }
}

export function getRooms() {
    return JSON.parse(localStorage.getItem('rooms')) || [];
}

export function saveRoom(room) {
    const rooms = getRooms();
    if (room.id) {
        const index = rooms.findIndex(r => r.id === room.id);
        if (index > -1) rooms[index] = room;
        else rooms.push(room);
    } else {
        room.id = Date.now().toString();
        rooms.push(room);
    }
    localStorage.setItem('rooms', JSON.stringify(rooms));
}

export function deleteRoom(id) {
    let rooms = getRooms();
    rooms = rooms.filter(r => r.id !== id);
    localStorage.setItem('rooms', JSON.stringify(rooms));
}

export function getBookings() {
    return JSON.parse(localStorage.getItem('bookings')) || [];
}

export function getBookingsByUser(username) {
    return getBookings().filter(b => b.user === username);
}

export function submitBooking(bookingData) {
    const bookings = getBookings();
    bookingData.id = Date.now().toString();
    bookingData.status = 'Menunggu Konfirmasi';
    bookingData.timestamp = new Date().toISOString();
    bookings.push(bookingData);
    localStorage.setItem('bookings', JSON.stringify(bookings));
}

export function updateBookingStatus(id, newStatus) {
    const bookings = getBookings();
    const index = bookings.findIndex(b => b.id === id);
    if (index > -1) {
        bookings[index].status = newStatus;
        localStorage.setItem('bookings', JSON.stringify(bookings));
    }
}
