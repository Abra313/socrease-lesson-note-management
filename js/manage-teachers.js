// Manage Teachers Module
import { initializeFirebase, getCurrentUser, signOut } from './firebase-init.js';

// Initialize Firebase
await initializeFirebase();

// Import Firebase functions
const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
const { getFirestore, collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

const auth = getAuth();
const db = getFirestore();

// Show alert message
function showAlert(message, type = 'success') {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) return;

    const alertClass = type === 'success' ? 'alert-success' : type === 'warning' ? 'alert-warning' : 'alert-error';
    const icon = type === 'success' ? 'fa-check-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-exclamation-circle';

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

// Check authentication
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'admin-login.html';
        return;
    }

    // Verify admin role
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists() || userDoc.data().role !== 'admin') {
        await signOut();
        window.location.href = 'admin-login.html';
        return;
    }

    // Load teachers
    loadTeachers();
});

// Load teachers
async function loadTeachers() {
    try {
        // Get pending teachers
        const pendingQuery = query(
            collection(db, 'users'),
            where('role', '==', 'teacher'),
            where('approved', '==', false)
        );
        const pendingSnapshot = await getDocs(pendingQuery);

        // Get approved teachers
        const approvedQuery = query(
            collection(db, 'users'),
            where('role', '==', 'teacher'),
            where('approved', '==', true)
        );
        const approvedSnapshot = await getDocs(approvedQuery);

        // Display pending teachers
        const pendingContainer = document.getElementById('pendingTeachers');
        if (pendingSnapshot.empty) {
            pendingContainer.innerHTML = '<p style="color: var(--text-light); text-align: center; padding: 2rem;">No pending teacher approvals</p>';
        } else {
            pendingContainer.innerHTML = '';
            pendingSnapshot.forEach((docSnapshot) => {
                const data = docSnapshot.data();
                const card = createTeacherCard(docSnapshot.id, data, false);
                pendingContainer.appendChild(card);
            });
        }

        // Display approved teachers
        const approvedContainer = document.getElementById('approvedTeachers');
        if (approvedSnapshot.empty) {
            approvedContainer.innerHTML = '<p style="color: var(--text-light); text-align: center; padding: 2rem;">No approved teachers yet</p>';
        } else {
            approvedContainer.innerHTML = '';
            approvedSnapshot.forEach((docSnapshot) => {
                const data = docSnapshot.data();
                const card = createTeacherCard(docSnapshot.id, data, true);
                approvedContainer.appendChild(card);
            });
        }

    } catch (error) {
        console.error('Error loading teachers:', error);
        showAlert('Error loading teachers', 'error');
    }
}

// Create teacher card
function createTeacherCard(id, data, isApproved) {
    const card = document.createElement('div');
    card.className = 'lesson-note-card';
    card.style.borderLeft = isApproved ? '4px solid var(--success-color)' : '4px solid var(--warning-color)';

    const date = data.createdAt ? new Date(data.createdAt.toDate()).toLocaleDateString() : 'N/A';

    card.innerHTML = `
        <div class="lesson-note-header">
            <div>
                <h3 class="lesson-note-title">${data.name || 'Unknown'}</h3>
                <div class="lesson-note-meta">
                    <span class="meta-item">
                        <i class="fas fa-envelope"></i> ${data.email || 'N/A'}
                    </span>
                    <span class="meta-item">
                        <i class="fas fa-calendar"></i> Registered: ${date}
                    </span>
                </div>
            </div>
            <span class="status-badge ${isApproved ? 'approved' : 'pending'}">
                ${isApproved ? 'Approved' : 'Pending'}
            </span>
        </div>
        <div class="lesson-note-actions">
            ${!isApproved ? `
                <button class="btn-small btn-success" onclick="approveTeacher('${id}')">
                    <i class="fas fa-check"></i> Approve
                </button>
                <button class="btn-small btn-danger" onclick="rejectTeacher('${id}')">
                    <i class="fas fa-times"></i> Reject
                </button>
            ` : `
                <button class="btn-small btn-warning" onclick="suspendTeacher('${id}')">
                    <i class="fas fa-ban"></i> Suspend
                </button>
            `}
        </div>
    `;

    return card;
}

// Approve teacher
window.approveTeacher = async function(teacherId) {
    if (!confirm('Are you sure you want to approve this teacher?')) return;

    try {
        await updateDoc(doc(db, 'users', teacherId), {
            approved: true
        });

        showAlert('Teacher approved successfully!', 'success');
        loadTeachers();

    } catch (error) {
        console.error('Error approving teacher:', error);
        showAlert('Error approving teacher', 'error');
    }
};

// Reject teacher
window.rejectTeacher = async function(teacherId) {
    if (!confirm('Are you sure you want to reject this teacher? This will delete their account.')) return;

    try {
        // Delete user document
        await deleteDoc(doc(db, 'users', teacherId));

        showAlert('Teacher rejected and account deleted', 'success');
        loadTeachers();

    } catch (error) {
        console.error('Error rejecting teacher:', error);
        showAlert('Error rejecting teacher', 'error');
    }
};

// Suspend teacher
window.suspendTeacher = async function(teacherId) {
    if (!confirm('Are you sure you want to suspend this teacher?')) return;

    try {
        await updateDoc(doc(db, 'users', teacherId), {
            approved: false
        });

        showAlert('Teacher suspended successfully', 'success');
        loadTeachers();

    } catch (error) {
        console.error('Error suspending teacher:', error);
        showAlert('Error suspending teacher', 'error');
    }
};

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    if (confirm('Are you sure you want to logout?')) {
        await signOut();
        window.location.href = 'admin-login.html';
    }
});