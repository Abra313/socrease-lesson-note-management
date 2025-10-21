// Firebase Initialization Module
import { firebaseConfig } from '../config/firebase-config.js';

// Initialize Firebase (using CDN)
let app, auth, db, storage;

// Function to initialize Firebase
export async function initializeFirebase() {
    try {
        // Import Firebase modules from CDN
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
        const { getAuth, onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        const { getFirestore } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        const { getStorage } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js');

        // Initialize Firebase
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        storage = getStorage(app);

        console.log('Firebase initialized successfully');
        return { app, auth, db, storage };
    } catch (error) {
        console.error('Error initializing Firebase:', error);
        throw error;
    }
}

// Export Firebase instances
export { app, auth, db, storage };

// Auth state observer
export function observeAuthState(callback) {
    import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js').then(({ onAuthStateChanged, getAuth }) => {
        const auth = getAuth();
        onAuthStateChanged(auth, callback);
    });
}

// Check if user is authenticated
export async function checkAuth() {
    const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
    const auth = getAuth();
    return new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            unsubscribe();
            resolve(user);
        });
    });
}

// Get current user
export async function getCurrentUser() {
    const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
    const auth = getAuth();
    return auth.currentUser;
}

// Sign out
export async function signOut() {
    const { getAuth, signOut: firebaseSignOut } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
    const auth = getAuth();
    await firebaseSignOut(auth);
}