// user.js
import { checkAuth } from './auth.js';
import { getRooms, getBookingsByUser, submitBooking } from './state.js';

const currentUser = checkAuth('user');

document.addEventListener('DOMContentLoaded', () => {
    if(!currentUser) return;
    document.getElementById('userNameDisplay').textContent = `Halo, ${currentUser.username}!`;
    
    renderRooms();
    renderHistory();
    
    // Listeners
    document.getElementById('btnBackToRooms').addEventListener('click', showRoomList);
    document.getElementById('bookingForm').addEventListener('submit', handleBookingSubmit);
});

function renderRooms() {
    const rooms = getRooms();
    const container = document.getElementById('roomListContainer');
    container.innerHTML = '';
    
    const availableRooms = rooms.filter(r => r.status === 'available');
    
    if (availableRooms.length === 0) {
        container.innerHTML = `<div class="col-12"><div class="alert alert-warning text-center">Tidak Ada Ruangan Tersedia saat ini.</div></div>`;
        return;
    }
    
    availableRooms.forEach(room => {
        const col = document.createElement('div');
        col.className = 'col-md-4';
        col.innerHTML = `
            <div class="card room-card h-100 p-3 bg-white rounded-3 shadow-sm border-0 border-top border-4 border-primary">
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title fw-bold">${room.name}</h5>
                    <p class="card-text text-muted small mb-4">Kapasitas: ${room.capacity} Orang</p>
                    <button class="btn btn-primary-custom rounded-pill mt-auto" onclick="window.openBookingForm('${room.id}', '${room.name}')">Pilih Ruangan</button>
                </div>
            </div>
        `;
        container.appendChild(col);
    });
}

window.openBookingForm = (id, name) => {
    document.getElementById('viewRooms').classList.add('d-none');
    document.getElementById('viewForm').classList.remove('d-none');
    
    document.getElementById('formRoomId').value = id;
    document.getElementById('formRoomName').value = name;
    document.getElementById('selectedRoomDisplay').textContent = `Mengajukan Peminjaman: ${name}`;
    
    document.getElementById('bookingDate').value = '';
    document.getElementById('bookingDuration').value = '';
    document.getElementById('bookingPurpose').value = '';
};

function showRoomList() {
    document.getElementById('viewForm').classList.add('d-none');
    document.getElementById('viewRooms').classList.remove('d-none');
}

function handleBookingSubmit(e) {
    e.preventDefault();
    const isEdit = document.getElementById('btnBackToRooms').dataset.editingId; // For rejected forms
    
    const booking = {
        user: currentUser.username,
        roomId: document.getElementById('formRoomId').value,
        roomName: document.getElementById('formRoomName').value,
        date: document.getElementById('bookingDate').value,
        duration: document.getElementById('bookingDuration').value,
        purpose: document.getElementById('bookingPurpose').value
    };
    
    submitBooking(booking);
    alert('Pengajuan berhasil dikirim! Menunggu konfirmasi admin.');
    
    // Switch state
    showRoomList();
    renderHistory();
}

function renderHistory() {
    const history = getBookingsByUser(currentUser.username);
    const tbody = document.getElementById('historyTableBody');
    const msg = document.getElementById('noHistoryMsg');
    tbody.innerHTML = '';
    
    if (history.length === 0) {
        msg.classList.remove('d-none');
        return;
    }
    
    msg.classList.add('d-none');
    
    // Sort descending by time
    history.reverse().forEach(b => {
        let badgeColor = 'bg-warning text-dark';
        if (b.status === 'Disetujui') badgeColor = 'bg-success';
        else if (b.status === 'Ditolak') badgeColor = 'bg-danger';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${new Date(b.timestamp).toLocaleDateString()}</td>
            <td class="fw-bold">${b.roomName}</td>
            <td>${b.date} (${b.duration || '-'} Jam)</td>
            <td><span class="badge ${badgeColor} status-badge">${b.status}</span></td>
            <td>
                ${b.status === 'Ditolak' ? `<button class="btn btn-sm btn-outline-primary rounded-pill" onclick="window.openBookingForm('${b.roomId}', '${b.roomName}')">Isi Ulang Form</button>` : `<span class="text-muted small">Menunggu Admin / Selesai</span>`}
            </td>
        `;
        tbody.appendChild(tr);
    });
}
