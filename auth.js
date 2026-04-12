// auth.js
import { initStorage } from './state.js';

initStorage();

export function login(username, password) {
    // Mock login logic
    if (username === 'admin' && password === 'admin') {
        localStorage.setItem('currentUser', JSON.stringify({ role: 'admin', username: 'admin' }));
        return { success: true, role: 'admin' };
    } else if (username && password) {
        // Any other user is a regular user for mock purposes
        localStorage.setItem('currentUser', JSON.stringify({ role: 'user', username }));
        return { success: true, role: 'user' };
    }
    return { success: false, message: 'Invalid credentials' };
}

export function getCurrentUser() {
    return JSON.parse(localStorage.getItem('currentUser'));
}

export function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = '/index.html';
}

export function checkAuth(requiredRole) {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = '/index.html';
        return;
    }
    if (requiredRole && user.role !== requiredRole) {
        if (user.role === 'admin') window.location.href = '/admin.html';
        else window.location.href = '/user.html';
    }
    return user;
}

// Hook up logout buttons globally if they exist
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
});
