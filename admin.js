// admin.js
import { checkAuth, register } from './auth.js';

const API_URL = 'http://localhost:5000/api';

checkAuth('admin');

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
    renderRooms();
    renderKonfirmasi();
    renderHistory();

    document.getElementById('roomForm').addEventListener('submit', handleRoomSubmit);
    document.getElementById('cancelEditRoom').addEventListener('click', cancelEditForm);
    document.getElementById('roomPhoto').addEventListener('change', previewPhoto);
    document.getElementById('registerForm').addEventListener('submit', handleRegisterSubmit);
});

// ================= MANAJEMEN RUANGAN =================
async function renderRooms() {
    const tbody = document.getElementById('roomTableBody');
    tbody.innerHTML = '';

    try {
        const res = await fetch(`${API_URL}/rooms`);
        const rooms = await res.json();

        rooms.forEach(r => {
            const badge = r.status === 'available' ? 'bg-success' : 'bg-secondary';
            const tr = document.createElement('tr');

            // Kolom Nama — textContent aman dari XSS
            const tdName = document.createElement('td');
            tdName.className = 'fw-bold';
            tdName.textContent = r.name;

            const tdCap = document.createElement('td');
            tdCap.textContent = `${Number(r.capacity)} Orang`;

            const tdStatus = document.createElement('td');
            const statusBadge = document.createElement('span');
            statusBadge.className = `badge ${badge}`;
            statusBadge.textContent = r.status;
            tdStatus.appendChild(statusBadge);

            const tdPhoto = document.createElement('td');
            if (r.photo) {
                const img = document.createElement('img');
                img.src = formatImageUrl(r.photo);
                img.alt = 'foto';
                img.className = 'rounded';
                img.style.cssText = 'width:40px;height:40px;object-fit:cover;';
                img.setAttribute('referrerpolicy', 'no-referrer');
                tdPhoto.appendChild(img);
            } else {
                const noPhoto = document.createElement('span');
                noPhoto.className = 'text-muted small';
                noPhoto.textContent = 'Tanpa Foto';
                tdPhoto.appendChild(noPhoto);
            }

            const tdAction = document.createElement('td');
            // Tombol Edit — data-id bukan onclick string
            const btnEdit = document.createElement('button');
            btnEdit.className = 'btn btn-sm btn-outline-primary rounded-pill me-1';
            btnEdit.textContent = 'Edit';
            btnEdit.dataset.id = r.id;
            btnEdit.addEventListener('click', () => editRoom(r.id));

            const btnDel = document.createElement('button');
            btnDel.className = 'btn btn-sm btn-outline-danger rounded-pill';
            btnDel.textContent = 'Hapus';
            btnDel.dataset.id = r.id;
            btnDel.addEventListener('click', () => removeRoom(r.id));

            tdAction.appendChild(btnEdit);
            tdAction.appendChild(btnDel);

            tr.appendChild(tdName);
            tr.appendChild(tdCap);
            tr.appendChild(tdStatus);
            tr.appendChild(tdPhoto);
            tr.appendChild(tdAction);
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Gagal memuat data ruangan:', err);
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Gagal memuat data ruangan.</td></tr>';
    }
}

async function handleRoomSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('roomId').value;
    
    const formData = new FormData();
    formData.append('name', document.getElementById('roomName').value);
    formData.append('capacity', document.getElementById('roomCapacity').value);
    formData.append('status', document.getElementById('roomStatus').value);

    const photoInput = document.getElementById('roomPhoto');
    if (photoInput.files && photoInput.files[0]) {
        formData.append('photo', photoInput.files[0]);
    } else {
        const existingPhoto = photoInput.getAttribute('data-existing-url');
        if (existingPhoto) {
            formData.append('photo', existingPhoto);
        }
    }

    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` }; // Do not set Content-Type header manually for FormData

    try {
        let res;
        if (id) {
            res = await fetch(`${API_URL}/rooms/${id}`, {
                method: 'PUT',
                headers: headers,
                body: formData
            });
        } else {
            res = await fetch(`${API_URL}/rooms`, {
                method: 'POST',
                headers: headers,
                body: formData
            });
        }

        const data = await res.json();

        if (!res.ok) {
            alert(`Gagal menyimpan ruangan: ${data.message}`);
            return;
        }

        // Tampilkan pesan sukses (termasuk warning jika foto gagal upload)
        alert(data.message);
        cancelEditForm();
        await renderRooms();
    } catch (err) {
        console.error('Gagal menyimpan ruangan:', err);
        alert('Gagal menyimpan ruangan. Pastikan server backend berjalan.');
    }
}

async function editRoom(id) {
    try {
        const res = await fetch(`${API_URL}/rooms`);
        const rooms = await res.json();
        const room = rooms.find(r => String(r.id) === String(id));
        if (room) {
            document.getElementById('formTitle').textContent = 'Edit Ruangan';
            document.getElementById('roomId').value = room.id;
            document.getElementById('roomName').value = room.name;
            document.getElementById('roomCapacity').value = room.capacity;
            document.getElementById('roomStatus').value = room.status;
            document.getElementById('roomPhoto').value = '';
            document.getElementById('roomPhoto').setAttribute('data-existing-url', room.photo || '');
            previewPhoto();
            document.getElementById('cancelEditRoom').classList.remove('d-none');
        }
    } catch (err) {
        console.error('Gagal mengambil data ruangan untuk edit:', err);
    }
}

async function removeRoom(id) {
    if (confirm('Hapus ruangan ini?')) {
        try {
            await fetch(`${API_URL}/rooms/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            await renderRooms();
        } catch (err) {
            console.error('Gagal menghapus ruangan:', err);
            alert('Gagal menghapus ruangan. Coba lagi.');
        }
    }
}

function cancelEditForm() {
    document.getElementById('roomForm').reset();
    document.getElementById('roomId').value = '';
    document.getElementById('roomPhoto').value = '';
    document.getElementById('roomPhoto').removeAttribute('data-existing-url');
    previewPhoto();
    document.getElementById('formTitle').textContent = 'Tambah Ruangan';
    document.getElementById('cancelEditRoom').classList.add('d-none');
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

// ================= REGISTER USER BARU =================
async function handleRegisterSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('registerBtn');
    const alertBox = document.getElementById('registerAlert');

    const userData = {
        nama:     document.getElementById('regNama').value.trim(),
        email:    document.getElementById('regEmail').value.trim(),
        nim:      document.getElementById('regNim').value.trim(),
        username: document.getElementById('regUsername').value.trim(),
        password: document.getElementById('regPassword').value,
        role:     document.getElementById('regRole').value,
    };

    btn.disabled = true;
    btn.textContent = 'Membuat akun...';
    alertBox.className = 'd-none mb-3';

    const result = await register(userData);

    if (result.success) {
        alertBox.className = 'alert alert-success mb-3';
        alertBox.textContent = `✅ Akun "${userData.username}" berhasil dibuat!`;
        document.getElementById('registerForm').reset();
    } else {
        alertBox.className = 'alert alert-danger mb-3';
        alertBox.textContent = `❌ Gagal: ${result.message}`;
    }

    btn.disabled = false;
    btn.textContent = 'Buat Akun';
}

function previewPhoto() {
    const input = document.getElementById('roomPhoto');
    const container = document.getElementById('photoPreviewContainer');
    const img = document.getElementById('photoPreview');
    
    if (input.files && input.files[0]) {
        const file = input.files[0];
        img.src = URL.createObjectURL(file);
        container.classList.remove('d-none');
    } else {
        const existingUrl = input.getAttribute('data-existing-url');
        if (existingUrl) {
            img.src = formatImageUrl(existingUrl);
            container.classList.remove('d-none');
        } else {
            img.src = '';
            container.classList.add('d-none');
        }
    }
}

// ================= KONFIRMASI PEMINJAMAN =================
async function renderKonfirmasi() {
    const container = document.getElementById('konfirmasiList');
    container.innerHTML = '';

    try {
        const res = await fetch(`${API_URL}/bookings`, {
            headers: getAuthHeaders()
        });
        const allBookings = await res.json();
        const bookings = allBookings.filter(b => b.status === 'pending');

        if (bookings.length === 0) {
            container.innerHTML = `<div class="alert alert-secondary text-center">Tidak ada pengajuan peminjaman menunggu konfirmasi.</div>`;
            return;
        }

        bookings.forEach(b => {
            const div = document.createElement('div');
            div.className = 'border p-3 mb-3 rounded-3 shadow-sm bg-white fade-in';

            // Header: username + timestamp (aman via textContent)
            const header = document.createElement('div');
            header.className = 'd-flex justify-content-between align-items-center mb-2';
            const userStrong = document.createElement('strong');
            userStrong.className = 'text-primary';
            userStrong.textContent = b.username || b.user || 'Unknown';
            const timeSmall = document.createElement('small');
            timeSmall.className = 'text-muted';
            timeSmall.textContent = `Mengajukan: ${new Date(b.timestamp || b.created_at).toLocaleString('id-ID')}`;
            header.appendChild(userStrong);
            header.appendChild(timeSmall);

            // Detail: roomName, date, purpose — escapeHTML untuk keamanan di dalam innerHTML
            const detailDiv = document.createElement('div');
            detailDiv.innerHTML = [
                `<p class="mb-1"><strong>Ruangan:</strong> ${escapeHTML(b.roomName || b.room_name)}</p>`,
                `<p class="mb-1"><strong>Tanggal Pakai:</strong> ${escapeHTML(b.date)} (${escapeHTML(String(b.duration || '-'))} Jam)</p>`,
                `<p class="mb-3"><strong>Keperluan:</strong> ${escapeHTML(b.purpose)}</p>`,
            ].join('');

            // Tombol aksi — data-* bukan onclick string
            const btnRow = document.createElement('div');
            btnRow.className = 'd-flex gap-2';

            const btnApprove = document.createElement('button');
            btnApprove.className = 'btn btn-success btn-sm px-4 rounded-pill flex-fill';
            btnApprove.textContent = 'Setujui';
            btnApprove.addEventListener('click', () => processBooking(b.id, 'approved', b.username || b.user));

            const btnReject = document.createElement('button');
            btnReject.className = 'btn btn-danger btn-sm px-4 rounded-pill flex-fill';
            btnReject.textContent = 'Tolak (Ulangi Form)';
            btnReject.addEventListener('click', () => processBooking(b.id, 'rejected', b.username || b.user));

            btnRow.appendChild(btnApprove);
            btnRow.appendChild(btnReject);

            div.appendChild(header);
            div.appendChild(detailDiv);
            div.appendChild(btnRow);
            container.appendChild(div);
        });
    } catch (err) {
        console.error('Gagal memuat konfirmasi:', err);
        container.innerHTML = `<div class="alert alert-danger text-center">Gagal memuat data konfirmasi.</div>`;
    }
}

async function processBooking(id, status, user) {
    const label = status === 'approved' ? 'Setujui' : 'Tolak';
    if (confirm(`Yakin ingin ${label} pengajuan ini?`)) {
        try {
            await fetch(`${API_URL}/bookings/${id}/status`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ status })
            });

            const displayStatus = getStatusLabel(status);
            showNotification(`Pengajuan dari ${escapeHTML(user)} telah ${displayStatus}.`);
            await renderKonfirmasi();
            await renderHistory();
        } catch (err) {
            console.error('Gagal memperbarui status booking:', err);
            alert('Gagal memperbarui status. Coba lagi.');
        }
    }
}

function showNotification(msg) {
    const area = document.getElementById('notificationArea');
    area.innerHTML = `<div class="alert alert-success alert-dismissible fade show pb-2 pt-2" role="alert">
        <i class="me-2">ℹ️</i> ${msg}
        <button type="button" class="btn-close py-2" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>`;
    setTimeout(() => { area.innerHTML = ''; }, 5000);
}

// ================= RIWAYAT ADMIN =================
async function renderHistory() {
    const tbody = document.getElementById('adminHistoryTableBody');
    tbody.innerHTML = '';

    try {
        const res = await fetch(`${API_URL}/bookings`, {
            headers: getAuthHeaders()
        });
        const allBookings = await res.json();
        const bookings = allBookings.filter(b => b.status !== 'pending');

        bookings.forEach(b => {
            const badgeColor = b.status === 'approved' ? 'bg-success' : 'bg-danger';
            const displayStatus = getStatusLabel(b.status);
            const tr = document.createElement('tr');

            // Semua sel diisi via textContent — aman dari XSS
            const tdDate = document.createElement('td');
            tdDate.textContent = new Date(b.timestamp || b.created_at).toLocaleDateString('id-ID');

            const tdUser = document.createElement('td');
            tdUser.textContent = b.username || b.user || '-';

            const tdRoom = document.createElement('td');
            tdRoom.className = 'fw-bold';
            tdRoom.textContent = b.roomName || b.room_name || '-';

            const tdSchedule = document.createElement('td');
            tdSchedule.textContent = `${b.date} (${b.duration || '-'} Jam)`;

            const tdStatus = document.createElement('td');
            const badge = document.createElement('span');
            badge.className = `badge ${badgeColor}`;
            badge.textContent = displayStatus;
            tdStatus.appendChild(badge);

            tr.appendChild(tdDate);
            tr.appendChild(tdUser);
            tr.appendChild(tdRoom);
            tr.appendChild(tdSchedule);
            tr.appendChild(tdStatus);
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Gagal memuat riwayat admin:', err);
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Gagal memuat riwayat.</td></tr>';
    }
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
