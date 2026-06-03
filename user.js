// user.js
import { checkAuth, getCurrentUser } from './auth.js';

const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : 'https://bookingroom-r3nz.onrender.com/api';

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

function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

document.addEventListener('DOMContentLoaded', () => {
    if (!currentUser) return;
    document.getElementById('userNameDisplay').textContent = `Halo, ${currentUser.nama || currentUser.username}!`;

    renderRooms();
    renderHistory();

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

            const card = document.createElement('div');
            card.className = 'card room-card h-100 p-3 bg-white rounded-3 shadow-sm border-0';

            if (room.photo) {
                const img = document.createElement('img');
                img.src = formatImageUrl(room.photo);
                img.className = 'card-img-top mb-3 rounded';
                img.alt = room.name;
                img.style.cssText = 'height:150px;object-fit:cover;';
                img.setAttribute('referrerpolicy', 'no-referrer');
                card.appendChild(img);
            }

            const body = document.createElement('div');
            body.className = 'card-body d-flex flex-column p-0';

            const title = document.createElement('h5');
            title.className = 'card-title fw-bold';
            title.textContent = room.name;

            const cap = document.createElement('p');
            cap.className = 'card-text text-muted small mb-4';
            cap.textContent = `Kapasitas: ${Number(room.capacity)} Orang`;

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

function openBookingForm(id, name) {
    document.getElementById('viewRooms').classList.add('d-none');
    document.getElementById('viewForm').classList.remove('d-none');

    document.getElementById('formRoomId').value = id;
    document.getElementById('formRoomName').value = name;
    document.getElementById('selectedRoomDisplay').textContent = `Mengajukan Peminjaman: ${name}`;

    document.getElementById('bookingDate').value = '';
    document.getElementById('bookingDuration').value = '';
    document.getElementById('bookingDosenPJ').value = '';
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
        dosen_pj: document.getElementById('bookingDosenPJ').value.trim(),
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

        history.forEach(b => {
            let badgeColor = 'bg-warning text-dark';
            if (b.status === 'approved') badgeColor = 'bg-success';
            else if (b.status === 'rejected') badgeColor = 'bg-danger';

            const displayStatus = getStatusLabel(b.status);
            const roomName = b.roomName || b.room_name || '-';

            const tr = document.createElement('tr');

            const tdDate = document.createElement('td');
            const dateObj = new Date(b.timestamp || b.created_at);
            const hours = String(dateObj.getHours()).padStart(2, '0');
            const minutes = String(dateObj.getMinutes()).padStart(2, '0');
            tdDate.textContent = `${dateObj.toLocaleDateString('id-ID')} ${hours}:${minutes}`;

            const tdRoom = document.createElement('td');
            tdRoom.className = 'fw-bold';
            tdRoom.textContent = roomName;

            const tdSchedule = document.createElement('td');
            tdSchedule.textContent = `${b.date} (${b.duration || '-'} Jam)`;

            const tdDosenPJ = document.createElement('td');
            tdDosenPJ.className = 'small';
            tdDosenPJ.textContent = b.dosen_pj || '-';

            const tdStatus = document.createElement('td');
            const badge = document.createElement('span');
            badge.className = `badge ${badgeColor} status-badge`;
            badge.textContent = displayStatus;
            tdStatus.appendChild(badge);

            // Show rejection reason if rejected
            if (b.status === 'rejected' && b.alasan_penolakan) {
                const reasonDiv = document.createElement('div');
                reasonDiv.className = 'rejection-reason mt-1';
                reasonDiv.textContent = `Alasan: ${b.alasan_penolakan}`;
                tdStatus.appendChild(reasonDiv);
            }

            const tdAction = document.createElement('td');
            if (b.status === 'approved') {
                const btnPrint = document.createElement('button');
                btnPrint.className = 'btn btn-sm btn-gold rounded-pill';
                btnPrint.textContent = '🖨️ Cetak Bukti';
                btnPrint.addEventListener('click', () => printReceipt(b));
                tdAction.appendChild(btnPrint);
            } else if (b.status === 'rejected') {
                const btn = document.createElement('button');
                btn.className = 'btn btn-sm btn-outline-primary rounded-pill';
                btn.textContent = 'Isi Ulang Form';
                btn.dataset.roomId = b.roomId || b.room_id;
                btn.dataset.roomName = roomName;
                btn.addEventListener('click', () => openBookingForm(btn.dataset.roomId, btn.dataset.roomName));
                tdAction.appendChild(btn);
            } else {
                const span = document.createElement('span');
                span.className = 'text-muted small';
                span.textContent = 'Menunggu Admin';
                tdAction.appendChild(span);
            }

            tr.appendChild(tdDate);
            tr.appendChild(tdRoom);
            tr.appendChild(tdSchedule);
            tr.appendChild(tdDosenPJ);
            tr.appendChild(tdStatus);
            tr.appendChild(tdAction);
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Gagal memuat riwayat peminjaman:', err);
        msg.classList.remove('d-none');
    }
}

// ─── Cetak Bukti Peminjaman ────────────────────────────────────────────────────
function printReceipt(booking) {
    const user = getCurrentUser();
    document.getElementById('printNama').textContent = user.nama || user.username;
    document.getElementById('printNim').textContent = user.username;
    document.getElementById('printRoom').textContent = booking.roomName || booking.room_name || '-';
    document.getElementById('printDate').textContent = booking.date;
    document.getElementById('printDuration').textContent = booking.duration || '-';
    document.getElementById('printDosenPJ').textContent = booking.dosen_pj || '-';
    document.getElementById('printPurpose').textContent = booking.purpose || '-';
    document.getElementById('printSigPeminjam').textContent = user.nama || user.username;

    // Trigger browser print
    window.print();
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

function getStatusLabel(status) {
    const map = {
        pending:  'Menunggu Konfirmasi',
        approved: 'Disetujui',
        rejected: 'Ditolak',
    };
    return map[status] || status;
}
