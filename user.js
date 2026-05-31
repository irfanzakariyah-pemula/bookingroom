// user.js
import { checkAuth } from './auth.js';

const API_URL = 'http://localhost:5000/api';

const currentUser = checkAuth('user');

// ─── Helper: Escape HTML untuk mencegah XSS ───────────────────────────────────
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Helper: ambil header Authorization dengan JWT token
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

document.addEventListener('DOMContentLoaded', () => {
    if (!currentUser) return;
    document.getElementById('userNameDisplay').textContent = `Halo, ${currentUser.username}!`;

    renderRooms();
    renderHistory();

    // Listeners
    document.getElementById('btnBackToRooms').addEventListener('click', showRoomList);
    document.getElementById('bookingForm').addEventListener('submit', handleBookingSubmit);
});

async function renderRooms() {
    const container = document.getElementById('roomListContainer');
    container.innerHTML = '';

    try {
        const res = await fetch(`${API_URL}/rooms`);
        const rooms = await res.json();
        const availableRooms = rooms.filter(r => r.status === 'available');

        if (availableRooms.length === 0) {
            container.innerHTML = `<div class="col-12"><div class="alert alert-warning text-center">Tidak Ada Ruangan Tersedia saat ini.</div></div>`;
            return;
        }

        availableRooms.forEach(room => {
            const col = document.createElement('div');
            col.className = 'col-md-4';

            // Bangun card secara aman tanpa injeksi data langsung ke innerHTML
            const card = document.createElement('div');
            card.className = 'card room-card h-100 p-3 bg-white rounded-3 shadow-sm border-0 border-top border-4 border-primary';

            if (room.photo) {
                const img = document.createElement('img');
                img.src = formatImageUrl(room.photo);
                img.className = 'card-img-top mb-3 rounded';
                // alt pakai textContent-style (setAttribute aman untuk atribut non-event)
                img.alt = room.name;
                img.style.cssText = 'height:150px;object-fit:cover;';
                img.setAttribute('referrerpolicy', 'no-referrer');
                card.appendChild(img);
            }

            const body = document.createElement('div');
            body.className = 'card-body d-flex flex-column p-0';

            const title = document.createElement('h5');
            title.className = 'card-title fw-bold';
            title.textContent = room.name; // textContent → aman dari XSS

            const cap = document.createElement('p');
            cap.className = 'card-text text-muted small mb-4';
            cap.textContent = `Kapasitas: ${Number(room.capacity)} Orang`;

            // Tombol pakai data-* bukan onclick string
            const btn = document.createElement('button');
            btn.className = 'btn btn-primary-custom rounded-pill mt-auto';
            btn.textContent = 'Pilih Ruangan';
            btn.dataset.roomId = room.id;
            btn.dataset.roomName = room.name;
            btn.addEventListener('click', () => openBookingForm(room.id, room.name));

            body.appendChild(title);
            body.appendChild(cap);
            body.appendChild(btn);
            card.appendChild(body);
            col.appendChild(card);
            container.appendChild(col);
        });
    } catch (err) {
        console.error('Gagal memuat daftar ruangan:', err);
        container.innerHTML = `<div class="col-12"><div class="alert alert-danger text-center">Gagal memuat daftar ruangan.</div></div>`;
    }
}

// Tidak lagi di-expose ke window — dipanggil melalui event listener
function openBookingForm(id, name) {
    document.getElementById('viewRooms').classList.add('d-none');
    document.getElementById('viewForm').classList.remove('d-none');

    document.getElementById('formRoomId').value = id;
    document.getElementById('formRoomName').value = name;
    // textContent aman — tidak dirender sebagai HTML
    document.getElementById('selectedRoomDisplay').textContent = `Mengajukan Peminjaman: ${name}`;

    document.getElementById('bookingDate').value = '';
    document.getElementById('bookingDuration').value = '';
    document.getElementById('bookingPurpose').value = '';
}

function showRoomList() {
    document.getElementById('viewForm').classList.add('d-none');
    document.getElementById('viewRooms').classList.remove('d-none');
}

async function handleBookingSubmit(e) {
    e.preventDefault();

    const booking = {
        roomId:   document.getElementById('formRoomId').value,
        roomName: document.getElementById('formRoomName').value,
        date:     document.getElementById('bookingDate').value,
        duration: document.getElementById('bookingDuration').value,
        purpose:  document.getElementById('bookingPurpose').value
    };

    try {
        const res = await fetch(`${API_URL}/bookings`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(booking)
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.message || 'Gagal mengirim pengajuan. Coba lagi.');
            return;
        }

        alert('Pengajuan berhasil dikirim! Menunggu konfirmasi admin.');
        showRoomList();
        await renderHistory();
    } catch (err) {
        console.error('Gagal mengirim pengajuan:', err);
        alert('Gagal mengirim pengajuan. Coba lagi.');
    }
}

async function renderHistory() {
    const tbody = document.getElementById('historyTableBody');
    const msg = document.getElementById('noHistoryMsg');
    tbody.innerHTML = '';

    try {
        const res = await fetch(`${API_URL}/bookings/me`, {
            headers: getAuthHeaders()
        });
        const history = await res.json();

        if (history.length === 0) {
            msg.classList.remove('d-none');
            return;
        }

        msg.classList.add('d-none');

        // Status dari backend: 'pending', 'approved', 'rejected'
        history.forEach(b => {
            let badgeColor = 'bg-warning text-dark';
            if (b.status === 'approved') badgeColor = 'bg-success';
            else if (b.status === 'rejected') badgeColor = 'bg-danger';

            const displayStatus = getStatusLabel(b.status);
            const roomName = b.roomName || b.room_name || '-';

            const tr = document.createElement('tr');

            // Semua sel dibangun dengan textContent — aman dari XSS
            const tdDate = document.createElement('td');
            tdDate.textContent = new Date(b.timestamp || b.created_at).toLocaleDateString('id-ID');

            const tdRoom = document.createElement('td');
            tdRoom.className = 'fw-bold';
            tdRoom.textContent = roomName; // data dari API, escape via textContent

            const tdSchedule = document.createElement('td');
            tdSchedule.textContent = `${b.date} (${b.duration || '-'} Jam)`;

            const tdStatus = document.createElement('td');
            const badge = document.createElement('span');
            badge.className = `badge ${badgeColor} status-badge`;
            badge.textContent = displayStatus;
            tdStatus.appendChild(badge);

            const tdAction = document.createElement('td');
            if (b.status === 'rejected') {
                const btn = document.createElement('button');
                btn.className = 'btn btn-sm btn-outline-primary rounded-pill';
                btn.textContent = 'Isi Ulang Form';
                // Pakai data-* bukan onclick string — aman dari XSS
                btn.dataset.roomId = b.roomId || b.room_id;
                btn.dataset.roomName = roomName;
                btn.addEventListener('click', () => openBookingForm(btn.dataset.roomId, btn.dataset.roomName));
                tdAction.appendChild(btn);
            } else {
                const span = document.createElement('span');
                span.className = 'text-muted small';
                span.textContent = 'Menunggu Admin / Selesai';
                tdAction.appendChild(span);
            }

            tr.appendChild(tdDate);
            tr.appendChild(tdRoom);
            tr.appendChild(tdSchedule);
            tr.appendChild(tdStatus);
            tr.appendChild(tdAction);
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Gagal memuat riwayat peminjaman:', err);
        msg.classList.remove('d-none');
    }
}

function formatImageUrl(url) {
    if (!url) return url;
    const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
        return `https://drive.google.com/uc?export=view&id=${fileIdMatch[1]}`;
    }
    const openIdMatch = url.match(/id=([a-zA-Z0-9_-]+)/);
    if (url.includes('drive.google.com') && openIdMatch && openIdMatch[1]) {
        return `https://drive.google.com/uc?export=view&id=${openIdMatch[1]}`;
    }
    return url;
}

// Helper: konversi status backend (EN) ke label tampilan (ID)
function getStatusLabel(status) {
    const map = {
        pending:  'Menunggu Konfirmasi',
        approved: 'Disetujui',
        rejected: 'Ditolak',
    };
    return map[status] || status;
}
