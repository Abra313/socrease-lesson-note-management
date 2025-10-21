// Admin Dashboard Module
import { initializeFirebase, getCurrentUser, signOut } from './firebase-init.js';

// Initialize Firebase
await initializeFirebase();

// Import Firebase functions
const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
const { getFirestore, collection, query, where, getDocs, doc, getDoc, orderBy, limit } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

const auth = getAuth();
const db = getFirestore();

// Check authentication
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Verify admin role
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists() || userDoc.data().role !== 'admin') {
        await signOut();
        window.location.href = 'login.html';
        return;
    }

    // Load dashboard data
    loadDashboardData();
});

// Load dashboard data
async function loadDashboardData() {
    try {
        // Get all teachers
        const teachersQuery = query(collection(db, 'users'), where('role', '==', 'teacher'));
        const teachersSnapshot = await getDocs(teachersQuery);
        const totalTeachers = teachersSnapshot.size;

        // Get all lesson notes
        const notesSnapshot = await getDocs(collection(db, 'lessonNotes'));
        
        let totalLessons = 0;
        let pendingReview = 0;
        let aiGenerated = 0;
        let approved = 0;
        let rejected = 0;
        let draft = 0;

        notesSnapshot.forEach((doc) => {
            totalLessons++;
            const data = doc.data();
            if (data.status === 'pending') pendingReview++;
            if (data.status === 'approved') approved++;
            if (data.status === 'rejected') rejected++;
            if (data.status === 'draft') draft++;
            if (data.aiGenerated) aiGenerated++;
        });

        // Update stats
        document.getElementById('totalTeachers').textContent = totalTeachers;
        document.getElementById('totalLessons').textContent = totalLessons;
        document.getElementById('pendingReview').textContent = pendingReview;
        document.getElementById('aiGenerated').textContent = aiGenerated;

        // Load charts
        loadStatusChart(approved, rejected, pendingReview, draft);
        loadMonthlyChart();

        // Load pending lessons
        loadPendingLessons();

        // Load recent activity
        loadRecentActivity();

    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Load status distribution chart
function loadStatusChart(approved, rejected, pending, draft) {
    const ctx = document.getElementById('statusChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Approved', 'Rejected', 'Pending', 'Draft'],
            datasets: [{
                data: [approved, rejected, pending, draft],
                backgroundColor: [
                    'rgba(39, 174, 96, 0.8)',
                    'rgba(231, 76, 60, 0.8)',
                    'rgba(243, 156, 18, 0.8)',
                    'rgba(149, 165, 166, 0.8)'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Load monthly submissions chart
function loadMonthlyChart() {
    const ctx = document.getElementById('monthlyChart');
    if (!ctx) return;

    // Mock data - in production, calculate from actual data
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const submissions = [45, 52, 48, 65, 58, 72];

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [{
                label: 'Lesson Submissions',
                data: submissions,
                backgroundColor: 'rgba(52, 152, 219, 0.8)',
                borderColor: 'rgba(52, 152, 219, 1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Load pending lessons
async function loadPendingLessons() {
    try {
        const pendingQuery = query(
            collection(db, 'lessonNotes'),
            where('status', '==', 'pending'),
            orderBy('createdAt', 'desc'),
            limit(5)
        );

        const snapshot = await getDocs(pendingQuery);
        const container = document.getElementById('pendingLessons');

        if (snapshot.empty) {
            container.innerHTML = '<p style="color: var(--text-light); text-align: center; padding: 2rem;">No pending lessons to review</p>';
            return;
        }

        container.innerHTML = '';
        
        for (const docSnapshot of snapshot.docs) {
            const data = docSnapshot.data();
            
            // Get teacher info
            const teacherDoc = await getDoc(doc(db, 'users', data.teacherId));
            const teacherName = teacherDoc.exists() ? teacherDoc.data().name : 'Unknown';

            const card = createPendingLessonCard(docSnapshot.id, data, teacherName);
            container.appendChild(card);
        }

    } catch (error) {
        console.error('Error loading pending lessons:', error);
    }
}

// Create pending lesson card
function createPendingLessonCard(id, data, teacherName) {
    const card = document.createElement('div');
    card.className = 'lesson-note-card';

    const date = data.createdAt ? new Date(data.createdAt.toDate()).toLocaleDateString() : 'N/A';

    card.innerHTML = `
        <div class="lesson-note-header">
            <div>
                <h3 class="lesson-note-title">${data.topic || 'Untitled'}</h3>
                <div class="lesson-note-meta">
                    <span class="meta-item">
                        <i class="fas fa-user"></i> ${teacherName}
                    </span>
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
            <span class="status-badge pending">Pending</span>
        </div>
        <div class="lesson-note-actions">
            <a href="review-lessons.html?id=${id}" class="btn-small btn-primary">
                <i class="fas fa-clipboard-check"></i> Review
            </a>
        </div>
    `;

    return card;
}

// Load recent activity
async function loadRecentActivity() {
    try {
        const container = document.getElementById('recentActivity');
        
        // Mock activity data - in production, fetch from activity logs collection
        const activities = [
            { type: 'approval', teacher: 'John Doe', lesson: 'Mathematics - Week 5', time: '2 hours ago' },
            { type: 'rejection', teacher: 'Jane Smith', lesson: 'English - Week 3', time: '4 hours ago' },
            { type: 'submission', teacher: 'Mike Johnson', lesson: 'Science - Week 7', time: '6 hours ago' },
            { type: 'approval', teacher: 'Sarah Williams', lesson: 'Social Studies - Week 2', time: '1 day ago' }
        ];

        container.innerHTML = '';
        
        activities.forEach(activity => {
            const activityItem = document.createElement('div');
            activityItem.style.cssText = 'padding: 1rem; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; gap: 1rem;';
            
            let icon = 'fa-check-circle';
            let color = 'var(--success-color)';
            let action = 'approved';
            
            if (activity.type === 'rejection') {
                icon = 'fa-times-circle';
                color = 'var(--accent-color)';
                action = 'rejected';
            } else if (activity.type === 'submission') {
                icon = 'fa-paper-plane';
                color = 'var(--secondary-color)';
                action = 'submitted';
            }
            
            activityItem.innerHTML = `
                <i class="fas ${icon}" style="font-size: 1.5rem; color: ${color};"></i>
                <div style="flex: 1;">
                    <p style="margin: 0;"><strong>${activity.teacher}</strong> ${action} <em>${activity.lesson}</em></p>
                    <small style="color: var(--text-light);">${activity.time}</small>
                </div>
            `;
            
            container.appendChild(activityItem);
        });

    } catch (error) {
        console.error('Error loading recent activity:', error);
    }
}

// AI Batch Evaluation
document.getElementById('aiEvaluateBtn')?.addEventListener('click', () => {
    document.getElementById('aiEvaluateModal').classList.add('active');
});

document.getElementById('startAiEvaluation')?.addEventListener('click', async () => {
    const progressDiv = document.getElementById('evaluationProgress');
    const progressBar = document.getElementById('evalProgressBar');
    const progressText = document.getElementById('evalProgress');
    const totalText = document.getElementById('evalTotal');

    progressDiv.classList.remove('hidden');

    try {
        // Get all pending lessons
        const pendingQuery = query(
            collection(db, 'lessonNotes'),
            where('status', '==', 'pending')
        );

        const snapshot = await getDocs(pendingQuery);
        const total = snapshot.size;
        totalText.textContent = total;

        let evaluated = 0;

        // Simulate evaluation (in production, call OpenAI API for each lesson)
        for (const doc of snapshot.docs) {
            // Simulate AI evaluation delay
            await new Promise(resolve => setTimeout(resolve, 500));
            
            evaluated++;
            progressText.textContent = evaluated;
            progressBar.style.width = `${(evaluated / total) * 100}%`;
        }

        alert('AI evaluation completed! Check individual lessons for AI suggestions.');
        closeAiEvaluateModal();

    } catch (error) {
        console.error('Error during AI evaluation:', error);
        alert('Error during AI evaluation');
    }
});

// Close modal
window.closeAiEvaluateModal = function() {
    document.getElementById('aiEvaluateModal').classList.remove('active');
    document.getElementById('evaluationProgress').classList.add('hidden');
    document.getElementById('evalProgressBar').style.width = '0%';
};

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    if (confirm('Are you sure you want to logout?')) {
        await signOut();
        window.location.href = 'login.html';
    }
});