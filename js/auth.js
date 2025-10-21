// Authentication Module
import { initializeFirebase } from './firebase-init.js';

// Initialize Firebase
await initializeFirebase();

// Import Firebase Auth functions
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
const { getFirestore, doc, setDoc, getDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

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

// Register Form Handler
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fullName = document.getElementById('fullName').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Validation
        if (password !== confirmPassword) {
            showAlert('Passwords do not match!');
            return;
        }

        if (password.length < 6) {
            showAlert('Password must be at least 6 characters long!');
            return;
        }

        // Show loading
        const btnText = document.getElementById('registerBtnText');
        const btnLoading = document.getElementById('registerBtnLoading');
        btnText.classList.add('hidden');
        btnLoading.classList.remove('hidden');

        try {
            // Create user account
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Store user data in Firestore
            await setDoc(doc(db, 'users', user.uid), {
                name: fullName,
                email: email,
                role: 'teacher',
                approved: false, // Requires admin approval
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            showAlert('Registration successful! Please wait for admin approval before you can login.', 'success');

            // Sign out the user immediately after registration
            await auth.signOut();

            // Redirect to login page
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 3000);

        } catch (error) {
            console.error('Registration error:', error);
            let errorMessage = 'Registration failed. Please try again.';

            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'This email is already registered.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email address.';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'Password is too weak.';
            }

            showAlert(errorMessage);

            // Hide loading
            btnText.classList.remove('hidden');
            btnLoading.classList.add('hidden');
        }
    });
}

// Login Form Handler
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
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

            // Check if teacher is approved
            if (userData.role === 'teacher' && !userData.approved) {
                await auth.signOut();
                showAlert('Your account is pending admin approval. Please wait for approval before logging in.');
                btnText.classList.remove('hidden');
                btnLoading.classList.add('hidden');
                return;
            }

            showAlert('Login successful! Redirecting...', 'success');

            // Redirect based on role
            setTimeout(() => {
                if (userData.role === 'admin') {
                    window.location.href = 'admin-dashboard.html';
                } else {
                    window.location.href = 'teacher-dashboard.html';
                }
            }, 1500);

        } catch (error) {
            console.error('Login error:', error);
            let errorMessage = 'Login failed. Please check your credentials.';

            if (error.code === 'auth/user-not-found') {
                errorMessage = 'No account found with this email.';
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

// Check if user is already logged in
auth.onAuthStateChanged(async (user) => {
    if (user && (window.location.pathname.includes('login.html') || window.location.pathname.includes('register.html'))) {
        // User is logged in, redirect to appropriate dashboard
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.role === 'admin') {
                window.location.href = 'admin-dashboard.html';
            } else {
                window.location.href = 'teacher-dashboard.html';
            }
        }
    }
});