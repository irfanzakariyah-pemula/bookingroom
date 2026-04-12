// admin.js
import { checkAuth } from './auth.js';
import { getRooms, saveRoom, deleteRoom, getBookings, updateBookingStatus } from './state.js';

checkAuth('admin');

document.addEventListener('DOMContentLoaded', () => {
    renderRooms();
    renderKonfirmasi();
    renderHistory();
    
    document.getElementById('roomForm').addEventListener('submit', handleRoomSubmit);
    document.getElementById('cancelEditRoom').addEventListener('click', cancelEditForm);
});

// ================= CRUD RUANGAN =================
function renderRooms() {
    const rooms = getRooms();
    const tbody = document.getElementById('roomTableBody');
    tbody.innerHTML = '';
    
    rooms.forEach(r => {
        const badge = r.status === 'available' ? 'bg-success' : 'bg-secondary';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="fw-bold">${r.name}</td>
            <td>${r.capacity} Orang</td>
            <td><span class="badge ${badge}">${r.status}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-primary rounded-pill me-1" onclick="window.editRoom('${r.id}')">Edit</button>
                <button class="btn btn-sm btn-outline-danger rounded-pill" onclick="window.removeRoom('${r.id}')">Hapus</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function handleRoomSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('roomId').value;
    const room = {
        name: document.getElementById('roomName').value,
        capacity: document.getElementById('roomCapacity').value,
        status: document.getElementById('roomStatus').value
    };
    if(id) room.id = id;
    
    saveRoom(room);
    cancelEditForm();
    renderRooms();
}

window.editRoom = (id) => {
    const rooms = getRooms();
    const room = rooms.find(r => r.id === id);
    if(room) {
        document.getElementById('formTitle').textContent = 'Edit Ruangan';
        document.getElementById('roomId').value = room.id;
        document.getElementById('roomName').value = room.name;
        document.getElementById('roomCapacity').value = room.capacity;
        document.getElementById('roomStatus').value = room.status;
        document.getElementById('cancelEditRoom').classList.remove('d-none');
    }
};

window.removeRoom = (id) => {
    if(confirm('Hapus ruangan ini?')) {
        deleteRoom(id);
        renderRooms();
    }
};

function cancelEditForm() {
    document.getElementById('roomForm').reset();
    document.getElementById('roomId').value = '';
    document.getElementById('formTitle').textContent = 'Tambah Ruangan';
    document.getElementById('cancelEditRoom').classList.add('d-none');
}

// ================= KONFIRMASI PEMINJAMAN =================
function renderKonfirmasi() {
    const bookings = getBookings().filter(b => b.status === 'Menunggu Konfirmasi');
    const container = document.getElementById('konfirmasiList');
    container.innerHTML = '';
    
    if (bookings.length === 0) {
        container.innerHTML = `<div class="alert alert-secondary text-center">Tidak ada pengajuan peminjaman menunggu konfirmasi.</div>`;
        return;
    }
    
    bookings.forEach(b => {
        const div = document.createElement('div');
        div.className = 'border p-3 mb-3 rounded-3 shadow-sm bg-white fade-in';
        div.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <strong class="text-primary">${b.user}</strong>
                <small class="text-muted">Mengajukan: ${new Date(b.timestamp).toLocaleString()}</small>
            </div>
            <p class="mb-1"><strong>Ruangan:</strong> ${b.roomName}</p>
            <p class="mb-1"><strong>Tanggal Pakai:</strong> ${b.date} (${b.duration || '-'} Jam)</p>
            <p class="mb-3"><strong>Keperluan:</strong> ${b.purpose}</p>
            
            <div class="d-flex gap-2">
                <button class="btn btn-success btn-sm px-4 rounded-pill flex-fill" onclick="window.processBooking('${b.id}', 'Disetujui', '${b.user}')">Setujui</button>
                <button class="btn btn-danger btn-sm px-4 rounded-pill flex-fill" onclick="window.processBooking('${b.id}', 'Ditolak', '${b.user}')">Tolak (Ulangi Form)</button>
            </div>
        `;
        container.appendChild(div);
    });
}

window.processBooking = (id, status, user) => {
    // Ruangan Tersedia? check is simulated by human admin clicking Setujui/Tolak
    if(confirm(`Yakin ingin memberikan status ${status} untuk pengajuan ini?`)) {
        updateBookingStatus(id, status);
        
        // Mock Send Notification ke User
        showNotification(`Notifikasi dikirim ke ${user}: Pengajuan telah ${status}.`);
        
        renderKonfirmasi();
        renderHistory();
    }
};

function showNotification(msg) {
    const area = document.getElementById('notificationArea');
    area.innerHTML = `<div class="alert alert-success alert-dismissible fade show pb-2 pt-2" role="alert">
        <i class="me-2">ℹ️</i> ${msg}
        <button type="button" class="btn-close py-2" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>`;
    setTimeout(() => { area.innerHTML = ''; }, 5000);
}

// ================= RIWAYAT ADMIN =================
function renderHistory() {
    // Only show finished or processed bookings
    const bookings = getBookings().filter(b => b.status !== 'Menunggu Konfirmasi');
    const tbody = document.getElementById('adminHistoryTableBody');
    tbody.innerHTML = '';
    
    bookings.reverse().forEach(b => {
        const badgeColor = b.status === 'Disetujui' ? 'bg-success' : 'bg-danger';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${new Date(b.timestamp).toLocaleDateString()}</td>
            <td>${b.user}</td>
            <td class="fw-bold">${b.roomName}</td>
            <td>${b.date} (${b.duration || '-'} Jam)</td>
            <td><span class="badge ${badgeColor}">${b.status}</span></td>
        `;
        tbody.appendChild(tr);
    });
}
