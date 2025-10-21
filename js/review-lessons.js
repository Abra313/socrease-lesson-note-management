// Review Lessons Module
import { initializeFirebase, getCurrentUser, signOut } from './firebase-init.js';
import { OPENAI_API_KEY } from '../config/firebase-config.js';

// Initialize Firebase
await initializeFirebase();

// Import Firebase functions
const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
const { getFirestore, collection, query, where, getDocs, doc, getDoc, updateDoc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

const auth = getAuth();
const db = getFirestore();

let currentReviewLessonId = null;
let currentTeacherId = null;

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

    // Load lessons
    loadLessons();
    
    // Load filter options
    loadFilterOptions();

    // Check if specific lesson to review
    const urlParams = new URLSearchParams(window.location.search);
    const lessonId = urlParams.get('id');
    if (lessonId) {
        openReviewModal(lessonId);
    }
});

// Load lessons based on filters
async function loadLessons() {
    try {
        const filterStatus = document.getElementById('filterStatus').value;
        const filterSubject = document.getElementById('filterSubject').value;
        const filterClass = document.getElementById('filterClass').value;
        const filterTeacher = document.getElementById('filterTeacher').value;

        let lessonsQuery = collection(db, 'lessonNotes');
        let constraints = [];

        if (filterStatus !== 'all') {
            constraints.push(where('status', '==', filterStatus));
        }
        if (filterSubject !== 'all') {
            constraints.push(where('subject', '==', filterSubject));
        }
        if (filterClass !== 'all') {
            constraints.push(where('class', '==', filterClass));
        }
        if (filterTeacher !== 'all') {
            constraints.push(where('teacherId', '==', filterTeacher));
        }

        if (constraints.length > 0) {
            lessonsQuery = query(lessonsQuery, ...constraints);
        }

        const snapshot = await getDocs(lessonsQuery);
        const container = document.getElementById('lessonsList');

        if (snapshot.empty) {
            container.innerHTML = '<p style="color: var(--text-light); text-align: center; padding: 2rem;">No lessons found matching the filters</p>';
            return;
        }

        container.innerHTML = '';

        for (const docSnapshot of snapshot.docs) {
            const data = docSnapshot.data();
            
            // Get teacher info
            const teacherDoc = await getDoc(doc(db, 'users', data.teacherId));
            const teacherName = teacherDoc.exists() ? teacherDoc.data().name : 'Unknown';

            const card = createLessonCard(docSnapshot.id, data, teacherName);
            container.appendChild(card);
        }

    } catch (error) {
        console.error('Error loading lessons:', error);
    }
}

// Create lesson card
function createLessonCard(id, data, teacherName) {
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
                    ${data.aiGenerated ? '<span class="meta-item"><i class="fas fa-robot"></i> AI Generated</span>' : ''}
                </div>
            </div>
            <span class="status-badge ${statusClass}">${statusText}</span>
        </div>
        ${data.feedback ? `
            <div class="alert alert-info" style="margin-top: 1rem;">
                <i class="fas fa-comment"></i>
                <span><strong>Previous Feedback:</strong> ${data.feedback}</span>
            </div>
        ` : ''}
        <div class="lesson-note-actions">
            <button class="btn-small btn-primary" onclick="openReviewModal('${id}')">
                <i class="fas fa-eye"></i> Review
            </button>
        </div>
    `;

    return card;
}

// Load filter options
async function loadFilterOptions() {
    try {
        // Load subjects
        const subjectsSet = new Set();
        const classesSet = new Set();
        const teachersMap = new Map();

        const notesSnapshot = await getDocs(collection(db, 'lessonNotes'));
        notesSnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.subject) subjectsSet.add(data.subject);
            if (data.class) classesSet.add(data.class);
        });

        const teachersSnapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'teacher')));
        teachersSnapshot.forEach((doc) => {
            const data = doc.data();
            teachersMap.set(doc.id, data.name);
        });

        // Populate subject filter
        const subjectFilter = document.getElementById('filterSubject');
        subjectsSet.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            subjectFilter.appendChild(option);
        });

        // Populate class filter
        const classFilter = document.getElementById('filterClass');
        classesSet.forEach(cls => {
            const option = document.createElement('option');
            option.value = cls;
            option.textContent = cls;
            classFilter.appendChild(option);
        });

        // Populate teacher filter
        const teacherFilter = document.getElementById('filterTeacher');
        teachersMap.forEach((name, id) => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = name;
            teacherFilter.appendChild(option);
        });

    } catch (error) {
        console.error('Error loading filter options:', error);
    }
}

// Open review modal
window.openReviewModal = async function(lessonId) {
    try {
        const lessonDoc = await getDoc(doc(db, 'lessonNotes', lessonId));
        
        if (!lessonDoc.exists()) {
            alert('Lesson not found');
            return;
        }

        const data = lessonDoc.data();
        currentReviewLessonId = lessonId;
        currentTeacherId = data.teacherId;

        // Get teacher info
        const teacherDoc = await getDoc(doc(db, 'users', data.teacherId));
        const teacherName = teacherDoc.exists() ? teacherDoc.data().name : 'Unknown';

        const reviewContent = document.getElementById('reviewContent');
        reviewContent.innerHTML = `
            <div style="padding: 1rem;">
                <div style="background: var(--bg-light); padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                        <div><strong>Teacher:</strong> ${teacherName}</div>
                        <div><strong>Subject:</strong> ${data.subject || 'N/A'}</div>
                        <div><strong>Class:</strong> ${data.class || 'N/A'}</div>
                        <div><strong>Week:</strong> ${data.week || 'N/A'}</div>
                        <div><strong>Term:</strong> ${data.term || 'N/A'}</div>
                        <div><strong>Status:</strong> <span class="status-badge ${data.status}">${data.status}</span></div>
                    </div>
                </div>

                <h2 style="text-align: center; margin-bottom: 2rem;">${data.topic || 'Untitled Lesson'}</h2>
                
                <div style="margin-bottom: 1.5rem;">
                    <h3><i class="fas fa-bullseye"></i> Learning Objectives</h3>
                    <p style="white-space: pre-wrap; background: var(--bg-light); padding: 1rem; border-radius: 8px;">${data.objectives || 'Not provided'}</p>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <h3><i class="fas fa-tools"></i> Instructional Materials</h3>
                    <p style="white-space: pre-wrap; background: var(--bg-light); padding: 1rem; border-radius: 8px;">${data.materials || 'Not provided'}</p>
                </div>

                ${data.introduction ? `
                    <div style="margin-bottom: 1.5rem;">
                        <h3><i class="fas fa-play-circle"></i> Introduction</h3>
                        <p style="white-space: pre-wrap; background: var(--bg-light); padding: 1rem; border-radius: 8px;">${data.introduction}</p>
                    </div>
                ` : ''}

                <div style="margin-bottom: 1.5rem;">
                    <h3><i class="fas fa-tasks"></i> Lesson Development</h3>
                    <p style="white-space: pre-wrap; background: var(--bg-light); padding: 1rem; border-radius: 8px;">${data.development || 'Not provided'}</p>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <h3><i class="fas fa-question-circle"></i> Evaluation</h3>
                    <p style="white-space: pre-wrap; background: var(--bg-light); padding: 1rem; border-radius: 8px;">${data.evaluation || 'Not provided'}</p>
                </div>

                ${data.conclusion ? `
                    <div style="margin-bottom: 1.5rem;">
                        <h3><i class="fas fa-flag-checkered"></i> Conclusion</h3>
                        <p style="white-space: pre-wrap; background: var(--bg-light); padding: 1rem; border-radius: 8px;">${data.conclusion}</p>
                    </div>
                ` : ''}

                ${data.feedback ? `
                    <div class="alert alert-info">
                        <i class="fas fa-comment"></i>
                        <span><strong>Previous Feedback:</strong> ${data.feedback}</span>
                    </div>
                ` : ''}
            </div>
        `;

        // Clear feedback textarea
        document.getElementById('adminFeedback').value = data.feedback || '';

        document.getElementById('reviewModal').classList.add('active');

    } catch (error) {
        console.error('Error opening review modal:', error);
        alert('Error loading lesson details');
    }
};

// Close review modal
window.closeReviewModal = function() {
    document.getElementById('reviewModal').classList.remove('active');
    currentReviewLessonId = null;
    currentTeacherId = null;
};

// Approve lesson
document.getElementById('approveBtn')?.addEventListener('click', async () => {
    if (!currentReviewLessonId) return;

    const feedback = document.getElementById('adminFeedback').value.trim();

    if (confirm('Are you sure you want to approve this lesson?')) {
        try {
            await updateDoc(doc(db, 'lessonNotes', currentReviewLessonId), {
                status: 'approved',
                feedback: feedback || 'Lesson approved',
                reviewedAt: serverTimestamp(),
                reviewedBy: auth.currentUser.uid
            });

            // Create notification for teacher
            await setDoc(doc(collection(db, 'notifications')), {
                userId: currentTeacherId,
                message: 'Your lesson has been approved!',
                type: 'approval',
                lessonId: currentReviewLessonId,
                read: false,
                timestamp: serverTimestamp()
            });

            alert('Lesson approved successfully!');
            closeReviewModal();
            loadLessons();

        } catch (error) {
            console.error('Error approving lesson:', error);
            alert('Error approving lesson');
        }
    }
});

// Reject lesson
document.getElementById('rejectBtn')?.addEventListener('click', async () => {
    if (!currentReviewLessonId) return;

    const feedback = document.getElementById('adminFeedback').value.trim();

    if (!feedback) {
        alert('Please provide feedback before rejecting');
        return;
    }

    if (confirm('Are you sure you want to reject this lesson?')) {
        try {
            await updateDoc(doc(db, 'lessonNotes', currentReviewLessonId), {
                status: 'rejected',
                feedback: feedback,
                reviewedAt: serverTimestamp(),
                reviewedBy: auth.currentUser.uid
            });

            // Create notification for teacher
            await setDoc(doc(collection(db, 'notifications')), {
                userId: currentTeacherId,
                message: 'Your lesson has been rejected. Please review the feedback.',
                type: 'rejection',
                lessonId: currentReviewLessonId,
                read: false,
                timestamp: serverTimestamp()
            });

            alert('Lesson rejected. Teacher will be notified.');
            closeReviewModal();
            loadLessons();

        } catch (error) {
            console.error('Error rejecting lesson:', error);
            alert('Error rejecting lesson');
        }
    }
});

// AI Evaluate single lesson
document.getElementById('aiEvaluateOneBtn')?.addEventListener('click', async () => {
    if (!currentReviewLessonId) return;

    try {
        const lessonDoc = await getDoc(doc(db, 'lessonNotes', currentReviewLessonId));
        const data = lessonDoc.data();

        const prompt = `Evaluate this lesson note for completeness, accuracy, and clarity. Give structured feedback in less than 5 lines.

Subject: ${data.subject}
Class: ${data.class}
Topic: ${data.topic}
Objectives: ${data.objectives}
Development: ${data.development}
Evaluation: ${data.evaluation}

Provide a score (0-100%) and brief feedback.`;

        // Simulate AI evaluation (in production, call OpenAI API)
        setTimeout(() => {
            const aiSuggestion = `AI Evaluation Score: 85%\n\nStrengths: Clear objectives, well-structured development, good evaluation questions.\n\nSuggestions: Consider adding more real-world examples in the development section. The introduction could be more engaging.`;
            
            document.getElementById('adminFeedback').value = aiSuggestion;
            alert('AI evaluation completed! Review the suggestions in the feedback box.');
        }, 1500);

    } catch (error) {
        console.error('Error during AI evaluation:', error);
        alert('Error during AI evaluation');
    }
});

// Filter change handlers
document.getElementById('filterStatus')?.addEventListener('change', loadLessons);
document.getElementById('filterSubject')?.addEventListener('change', loadLessons);
document.getElementById('filterClass')?.addEventListener('change', loadLessons);
document.getElementById('filterTeacher')?.addEventListener('change', loadLessons);

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    if (confirm('Are you sure you want to logout?')) {
        await signOut();
        window.location.href = 'login.html';
    }
});