// Admin Authentication Module
import { initializeFirebase } from './firebase-init.js';

// Initialize Firebase
await initializeFirebase();

// Import Firebase Auth functions
const { getAuth, signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
const { getFirestore, doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

const auth = getAuth();
const db = getFirestore();

// Show alert message
function showAlert(message, type = 'error') {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) return;

    const alertClass = type === 'success' ? 'alert-success' : 'alert-error';
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';

    alertContainer.innerHTML = `
        <div class="alert ${alertClass}">
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        </div>
    `;

    setTimeout(() => {
        alertContainer.innerHTML = '';
    }, 5000);
}

// Admin Login Form Handler
const adminLoginForm = document.getElementById('adminLoginForm');
if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        // Show loading
        const btnText = document.getElementById('loginBtnText');
        const btnLoading = document.getElementById('loginBtnLoading');
        btnText.classList.add('hidden');
        btnLoading.classList.remove('hidden');

        try {
            // Sign in user
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Get user data from Firestore
            const userDoc = await getDoc(doc(db, 'users', user.uid));

            if (!userDoc.exists()) {
                throw new Error('User data not found');
            }

            const userData = userDoc.data();

            // Verify admin role
            if (userData.role !== 'admin') {
                await auth.signOut();
                throw new Error('Access denied. Admin credentials required.');
            }

            showAlert('Admin login successful! Redirecting...', 'success');

            // Redirect to admin dashboard
            setTimeout(() => {
                window.location.href = 'admin-dashboard.html';
            }, 1500);

        } catch (error) {
            console.error('Admin login error:', error);
            let errorMessage = 'Login failed. Please check your credentials.';

            if (error.message === 'Access denied. Admin credentials required.') {
                errorMessage = error.message;
            } else if (error.code === 'auth/user-not-found') {
                errorMessage = 'No admin account found with this email.';
            } else if (error.code === 'auth/wrong-password') {
                errorMessage = 'Incorrect password.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email address.';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Too many failed attempts. Please try again later.';
            }

            showAlert(errorMessage);

            // Hide loading
            btnText.classList.remove('hidden');
            btnLoading.classList.add('hidden');
        }
    });
}

// Check if admin is already logged in
auth.onAuthStateChanged(async (user) => {
    if (user && window.location.pathname.includes('admin-login.html')) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().role === 'admin') {
            window.location.href = 'admin-dashboard.html';
        }
    }
});