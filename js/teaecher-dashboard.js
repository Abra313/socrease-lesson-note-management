// Teacher Dashboard Module
import { initializeFirebase, getCurrentUser, signOut } from './firebase-init.js';

// Initialize Firebase
await initializeFirebase();

// Import Firebase functions
const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
const { getFirestore, collection, query, where, getDocs, doc, getDoc, onSnapshot, orderBy, limit } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

const auth = getAuth();
const db = getFirestore();

// Check authentication
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Verify user role
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists() || userDoc.data().role !== 'teacher') {
        await signOut();
        window.location.href = 'login.html';
        return;
    }

    // Load dashboard data
    loadDashboardData(user);
});

// Load dashboard data
async function loadDashboardData(user) {
    try {
        // Get user data
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();

        // Update user info
        document.getElementById('userName').textContent = userData.name;
        document.getElementById('userAvatar').textContent = userData.name.charAt(0).toUpperCase();

        // Get lesson notes statistics
        const notesQuery = query(
            collection(db, 'lessonNotes'),
            where('teacherId', '==', user.uid)
        );
        const notesSnapshot = await getDocs(notesQuery);

        let totalNotes = 0;
        let pendingNotes = 0;
        let approvedNotes = 0;
        let rejectedNotes = 0;

        notesSnapshot.forEach((doc) => {
            totalNotes++;
            const data = doc.data();
            if (data.status === 'pending') pendingNotes++;
            else if (data.status === 'approved') approvedNotes++;
            else if (data.status === 'rejected') rejectedNotes++;
        });

        // Update stats
        document.getElementById('totalNotes').textContent = totalNotes;
        document.getElementById('pendingNotes').textContent = pendingNotes;
        document.getElementById('approvedNotes').textContent = approvedNotes;
        document.getElementById('rejectedNotes').textContent = rejectedNotes;

        // Load recent lessons
        loadRecentLessons(user.uid);

        // Load notifications
        loadNotifications(user.uid);

        // Load announcements
        loadAnnouncements();

    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Load recent lessons
async function loadRecentLessons(teacherId) {
    try {
        const recentQuery = query(
            collection(db, 'lessonNotes'),
            where('teacherId', '==', teacherId),
            orderBy('createdAt', 'desc'),
            limit(5)
        );

        const snapshot = await getDocs(recentQuery);
        const container = document.getElementById('recentLessons');

        if (snapshot.empty) {
            container.innerHTML = '<p style="color: var(--text-light); text-align: center; padding: 2rem;">No lessons created yet. <a href="create-lesson.html">Create your first lesson</a></p>';
            return;
        }

        container.innerHTML = '';
        snapshot.forEach((doc) => {
            const data = doc.data();
            const lessonCard = createLessonCard(doc.id, data);
            container.appendChild(lessonCard);
        });

    } catch (error) {
        console.error('Error loading recent lessons:', error);
    }
}

// Create lesson card element
function createLessonCard(id, data) {
    const card = document.createElement('div');
    card.className = 'lesson-note-card';

    const statusClass = data.status || 'draft';
    const statusText = statusClass.charAt(0).toUpperCase() + statusClass.slice(1);

    const date = data.createdAt ? new Date(data.createdAt.toDate()).toLocaleDateString() : 'N/A';

    card.innerHTML = `
        <div class="lesson-note-header">
            <div>
                <h3 class="lesson-note-title">${data.topic || 'Untitled'}</h3>
                <div class="lesson-note-meta">
                    <span class="meta-item">
                        <i class="fas fa-book"></i> ${data.subject || 'N/A'}
                    </span>
                    <span class="meta-item">
                        <i class="fas fa-users"></i> ${data.class || 'N/A'}
                    </span>
                    <span class="meta-item">
                        <i class="fas fa-calendar"></i> Week ${data.week || 'N/A'}
                    </span>
                    <span class="meta-item">
                        <i class="fas fa-clock"></i> ${date}
                    </span>
                </div>
            </div>
            <span class="status-badge ${statusClass}">${statusText}</span>
        </div>
        ${data.feedback ? `
            <div class="alert alert-info" style="margin-top: 1rem;">
                <i class="fas fa-comment"></i>
                <span><strong>Feedback:</strong> ${data.feedback}</span>
            </div>
        ` : ''}
        <div class="lesson-note-actions">
            <button class="btn-small btn-primary" onclick="viewLesson('${id}')">
                <i class="fas fa-eye"></i> View
            </button>
            ${statusClass === 'draft' || statusClass === 'rejected' ? `
                <button class="btn-small btn-secondary" onclick="editLesson('${id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
            ` : ''}
            ${statusClass === 'approved' ? `
                <button class="btn-small btn-success" onclick="downloadPDF('${id}')">
                    <i class="fas fa-download"></i> PDF
                </button>
            ` : ''}
        </div>
    `;

    return card;
}

// Load notifications
async function loadNotifications(userId) {
    try {
        const notifQuery = query(
            collection(db, 'notifications'),
            where('userId', '==', userId),
            where('read', '==', false)
        );

        const snapshot = await getDocs(notifQuery);
        document.getElementById('notificationCount').textContent = snapshot.size;

    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

// Load announcements
async function loadAnnouncements() {
    try {
        const announcementsQuery = query(
            collection(db, 'announcements'),
            orderBy('createdAt', 'desc'),
            limit(3)
        );

        const snapshot = await getDocs(announcementsQuery);
        const container = document.getElementById('announcements');

        if (snapshot.empty) {
            container.innerHTML = '<p style="color: var(--text-light); text-align: center; padding: 2rem;">No announcements at this time.</p>';
            return;
        }

        container.innerHTML = '';
        snapshot.forEach((doc) => {
            const data = doc.data();
            const date = data.createdAt ? new Date(data.createdAt.toDate()).toLocaleDateString() : 'N/A';

            const announcement = document.createElement('div');
            announcement.className = 'alert alert-info';
            announcement.style.marginBottom = '1rem';
            announcement.innerHTML = `
                <div>
                    <strong>${data.title || 'Announcement'}</strong>
                    <p style="margin: 0.5rem 0 0 0;">${data.content || ''}</p>
                    <small style="color: var(--text-light);">${date}</small>
                </div>
            `;
            container.appendChild(announcement);
        });

    } catch (error) {
        console.error('Error loading announcements:', error);
    }
}

// AI Assistant functionality
const aiToggle = document.getElementById('aiToggle');
const aiClose = document.getElementById('aiClose');
const aiChatWindow = document.getElementById('aiChatWindow');
const aiInput = document.getElementById('aiInput');
const aiSend = document.getElementById('aiSend');
const aiChatBody = document.getElementById('aiChatBody');

aiToggle?.addEventListener('click', () => {
    aiChatWindow.classList.toggle('active');
});

aiClose?.addEventListener('click', () => {
    aiChatWindow.classList.remove('active');
});

aiSend?.addEventListener('click', sendAIMessage);
aiInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendAIMessage();
});

async function sendAIMessage() {
    const message = aiInput.value.trim();
    if (!message) return;

    // Add user message
    const userMsg = document.createElement('div');
    userMsg.className = 'ai-message user';
    userMsg.textContent = message;
    aiChatBody.appendChild(userMsg);

    aiInput.value = '';
    aiChatBody.scrollTop = aiChatBody.scrollHeight;

    // Simulate AI response (in production, call OpenAI API)
    setTimeout(() => {
        const aiMsg = document.createElement('div');
        aiMsg.className = 'ai-message assistant';
        aiMsg.textContent = 'This is a demo response. In production, this would connect to OpenAI API to provide intelligent assistance with lesson planning, content generation, and teaching tips.';
        aiChatBody.appendChild(aiMsg);
        aiChatBody.scrollTop = aiChatBody.scrollHeight;
    }, 1000);
}

// Logout functionality
document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    if (confirm('Are you sure you want to logout?')) {
        await signOut();
        window.location.href = 'login.html';
    }
});

// Global functions for lesson actions
window.viewLesson = function(id) {
    window.location.href = `view-lesson.html?id=${id}`;
};

window.editLesson = function(id) {
    window.location.href = `create-lesson.html?id=${id}`;
};

window.downloadPDF = async function(id) {
    alert('PDF download functionality will be implemented with jsPDF library');
};