// Create Lesson Module
import { initializeFirebase, getCurrentUser, signOut } from './firebase-init.js';
import { OPENAI_API_KEY } from '../config/firebase-config.js';

// Initialize Firebase
await initializeFirebase();

// Import Firebase functions
const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
const { getFirestore, collection, doc, setDoc, getDoc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

const auth = getAuth();
const db = getFirestore();

let currentLessonId = null;
let autoSaveInterval = null;

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

    // Check if editing existing lesson
    const urlParams = new URLSearchParams(window.location.search);
    const lessonId = urlParams.get('id');
    if (lessonId) {
        loadLesson(lessonId, user.uid);
    }

    // Start auto-save
    startAutoSave(user.uid);
});

// Load existing lesson for editing
async function loadLesson(lessonId, userId) {
    try {
        const lessonDoc = await getDoc(doc(db, 'lessonNotes', lessonId));
        
        if (!lessonDoc.exists()) {
            showAlert('Lesson not found', 'error');
            return;
        }

        const data = lessonDoc.data();
        
        // Verify ownership
        if (data.teacherId !== userId) {
            showAlert('You do not have permission to edit this lesson', 'error');
            setTimeout(() => window.location.href = 'teacher-dashboard.html', 2000);
            return;
        }

        // Populate form
        document.getElementById('subject').value = data.subject || '';
        document.getElementById('class').value = data.class || '';
        document.getElementById('week').value = data.week || '';
        document.getElementById('term').value = data.term || '';
        document.getElementById('topic').value = data.topic || '';
        document.getElementById('objectives').value = data.objectives || '';
        document.getElementById('materials').value = data.materials || '';
        document.getElementById('introduction').value = data.introduction || '';
        document.getElementById('development').value = data.development || '';
        document.getElementById('evaluation').value = data.evaluation || '';
        document.getElementById('conclusion').value = data.conclusion || '';

        currentLessonId = lessonId;
        showAlert('Lesson loaded successfully', 'success');

    } catch (error) {
        console.error('Error loading lesson:', error);
        showAlert('Error loading lesson', 'error');
    }
}

// Show alert message
function showAlert(message, type = 'error') {
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

// Auto-save functionality
function startAutoSave(userId) {
    autoSaveInterval = setInterval(() => {
        saveDraft(userId, true);
    }, 10000); // Auto-save every 10 seconds
}

// Save draft
async function saveDraft(userId, isAutoSave = false) {
    try {
        const formData = getFormData();
        
        // Validate required fields for auto-save
        if (!formData.subject || !formData.class || !formData.week) {
            if (!isAutoSave) {
                showAlert('Please fill in at least Subject, Class, and Week', 'warning');
            }
            return;
        }

        const lessonData = {
            ...formData,
            teacherId: userId,
            status: 'draft',
            aiGenerated: false,
            updatedAt: serverTimestamp()
        };

        if (currentLessonId) {
            // Update existing draft
            await updateDoc(doc(db, 'lessonNotes', currentLessonId), lessonData);
        } else {
            // Create new draft
            const newDocRef = doc(collection(db, 'lessonNotes'));
            lessonData.createdAt = serverTimestamp();
            await setDoc(newDocRef, lessonData);
            currentLessonId = newDocRef.id;
        }

        if (!isAutoSave) {
            showAlert('Draft saved successfully', 'success');
        }

    } catch (error) {
        console.error('Error saving draft:', error);
        if (!isAutoSave) {
            showAlert('Error saving draft', 'error');
        }
    }
}

// Get form data
function getFormData() {
    return {
        subject: document.getElementById('subject').value.trim(),
        class: document.getElementById('class').value.trim(),
        week: document.getElementById('week').value.trim(),
        term: document.getElementById('term').value.trim(),
        topic: document.getElementById('topic').value.trim(),
        objectives: document.getElementById('objectives').value.trim(),
        materials: document.getElementById('materials').value.trim(),
        introduction: document.getElementById('introduction').value.trim(),
        development: document.getElementById('development').value.trim(),
        evaluation: document.getElementById('evaluation').value.trim(),
        conclusion: document.getElementById('conclusion').value.trim()
    };
}

// Submit lesson for review
document.getElementById('lessonForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) return;

    const formData = getFormData();

    // Validate required fields
    if (!formData.subject || !formData.class || !formData.week || !formData.topic || 
        !formData.objectives || !formData.materials || !formData.development || !formData.evaluation) {
        showAlert('Please fill in all required fields', 'error');
        return;
    }

    try {
        const lessonData = {
            ...formData,
            teacherId: user.uid,
            status: 'pending',
            aiGenerated: false,
            updatedAt: serverTimestamp()
        };

        if (currentLessonId) {
            await updateDoc(doc(db, 'lessonNotes', currentLessonId), lessonData);
        } else {
            const newDocRef = doc(collection(db, 'lessonNotes'));
            lessonData.createdAt = serverTimestamp();
            await setDoc(newDocRef, lessonData);
        }

        showAlert('Lesson submitted for review successfully!', 'success');
        
        setTimeout(() => {
            window.location.href = 'teacher-dashboard.html';
        }, 2000);

    } catch (error) {
        console.error('Error submitting lesson:', error);
        showAlert('Error submitting lesson', 'error');
    }
});

// Save draft button
document.getElementById('saveDraftBtn')?.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (user) {
        await saveDraft(user.uid, false);
    }
});

// AI Generate button
document.getElementById('aiGenerateBtn')?.addEventListener('click', () => {
    const subject = document.getElementById('subject').value;
    const classValue = document.getElementById('class').value;
    const week = document.getElementById('week').value;
    const topic = document.getElementById('topic').value;

    if (!subject || !classValue || !week || !topic) {
        showAlert('Please fill in Subject, Class, Week, and Topic before generating with AI', 'warning');
        return;
    }

    document.getElementById('aiModal').classList.add('active');
});

// Confirm AI generation
document.getElementById('confirmAiGenerate')?.addEventListener('click', async () => {
    await generateWithAI();
    closeAiModal();
});

// Generate lesson with AI
async function generateWithAI() {
    const formData = getFormData();

    if (!formData.subject || !formData.class || !formData.week || !formData.topic) {
        showAlert('Please fill in Subject, Class, Week, and Topic', 'error');
        return;
    }

    showAlert('Generating lesson with AI... This may take a moment.', 'info');

    try {
        const prompt = `Write a professional Nigerian school lesson note for ${formData.subject} in week ${formData.week} for class ${formData.class}.

Topic: ${formData.topic}

Include the following sections:
1. Learning Objectives (3-5 clear, measurable objectives)
2. Instructional Materials (list of materials needed)
3. Introduction (how to introduce the lesson, 2-3 sentences)
4. Lesson Development (detailed step-by-step teaching process, at least 5 steps)
5. Evaluation Questions (5-7 questions to assess understanding)
6. Conclusion (how to wrap up the lesson, 2-3 sentences)

Align content with the Nigerian curriculum style and use clear, teacher-friendly language.

Format the response as JSON with keys: objectives, materials, introduction, development, evaluation, conclusion`;

        // Call OpenAI API (demo - in production, use proper API call)
        const response = await callOpenAI(prompt);

        if (response) {
            // Populate form with AI-generated content
            document.getElementById('objectives').value = response.objectives || '';
            document.getElementById('materials').value = response.materials || '';
            document.getElementById('introduction').value = response.introduction || '';
            document.getElementById('development').value = response.development || '';
            document.getElementById('evaluation').value = response.evaluation || '';
            document.getElementById('conclusion').value = response.conclusion || '';

            showAlert('Lesson generated successfully! You can now edit and submit.', 'success');
        }

    } catch (error) {
        console.error('Error generating lesson:', error);
        showAlert('Error generating lesson with AI. Please try again.', 'error');
    }
}

// Call OpenAI API
async function callOpenAI(prompt) {
    // Demo implementation - returns mock data
    // In production, implement actual OpenAI API call
    
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                objectives: `1. Students will be able to identify and explain the key concepts of ${document.getElementById('topic').value}
2. Students will demonstrate understanding through practical examples
3. Students will apply learned concepts to solve related problems
4. Students will work collaboratively in group activities
5. Students will develop critical thinking skills related to the topic`,

                materials: `1. Textbooks and reference materials
2. Whiteboard and markers
3. Charts and diagrams
4. Worksheets and handouts
5. Multimedia resources (projector, laptop)
6. Real-life examples and models`,

                introduction: `Begin the lesson by asking students what they already know about ${document.getElementById('topic').value}. Use a brief story or real-life example to capture their interest and connect the topic to their daily experiences. This will help activate prior knowledge and set the context for new learning.`,

                development: `Step 1: Present the main concept using clear explanations and visual aids. Write key terms on the board and ensure students understand the basic definitions.

Step 2: Demonstrate practical examples related to the topic. Use charts, diagrams, or real objects to make the concept concrete and relatable.

Step 3: Engage students in a guided practice activity. Ask questions and encourage participation to check for understanding.

Step 4: Organize students into small groups for collaborative learning. Assign tasks that require them to apply the concepts learned.

Step 5: Have groups present their findings or solutions. Provide constructive feedback and clarify any misconceptions.

Step 6: Summarize the key points and connect them back to the learning objectives. Ensure all students have grasped the essential concepts.`,

                evaluation: `1. What is ${document.getElementById('topic').value}? Explain in your own words.
2. Give three examples of how this concept applies in real life.
3. What are the main characteristics or features discussed in today's lesson?
4. How would you solve this problem using what you learned today?
5. Compare and contrast the different aspects we covered.
6. Why is this topic important? How can you use this knowledge?
7. Create your own example demonstrating understanding of the concept.`,

                conclusion: `Review the main points covered in the lesson and ask students to share one thing they learned. Assign homework that reinforces the concepts and preview the next lesson topic. Thank students for their participation and encourage them to practice what they've learned.`
            });
        }, 2000);
    });
}

// Improve section with AI
window.aiImproveSection = async function(sectionId) {
    const textarea = document.getElementById(sectionId);
    const currentContent = textarea.value.trim();

    if (!currentContent) {
        showAlert('Please enter some content first before improving with AI', 'warning');
        return;
    }

    showAlert('Improving content with AI...', 'info');

    try {
        const prompt = `Improve the following ${sectionId} section of a Nigerian school lesson note. Make it more clear, professional, and aligned with curriculum standards. Keep the same meaning but enhance the language and structure:

${currentContent}

Return only the improved version.`;

        // In production, call OpenAI API
        setTimeout(() => {
            textarea.value = currentContent + '\n\n[AI-improved version would appear here in production]';
            showAlert('Content improved! Review and edit as needed.', 'success');
        }, 1500);

    } catch (error) {
        console.error('Error improving content:', error);
        showAlert('Error improving content', 'error');
    }
};

// Preview lesson
document.getElementById('previewBtn')?.addEventListener('click', () => {
    const formData = getFormData();
    
    const previewContent = document.getElementById('previewContent');
    previewContent.innerHTML = `
        <div style="padding: 1rem;">
            <h2 style="text-align: center; margin-bottom: 2rem;">${formData.topic || 'Lesson Preview'}</h2>
            
            <div style="margin-bottom: 1.5rem;">
                <strong>Subject:</strong> ${formData.subject || 'N/A'}<br>
                <strong>Class:</strong> ${formData.class || 'N/A'}<br>
                <strong>Week:</strong> ${formData.week || 'N/A'}<br>
                <strong>Term:</strong> ${formData.term || 'N/A'}
            </div>

            <div style="margin-bottom: 1.5rem;">
                <h3>Learning Objectives</h3>
                <p style="white-space: pre-wrap;">${formData.objectives || 'Not provided'}</p>
            </div>

            <div style="margin-bottom: 1.5rem;">
                <h3>Instructional Materials</h3>
                <p style="white-space: pre-wrap;">${formData.materials || 'Not provided'}</p>
            </div>

            ${formData.introduction ? `
                <div style="margin-bottom: 1.5rem;">
                    <h3>Introduction</h3>
                    <p style="white-space: pre-wrap;">${formData.introduction}</p>
                </div>
            ` : ''}

            <div style="margin-bottom: 1.5rem;">
                <h3>Lesson Development</h3>
                <p style="white-space: pre-wrap;">${formData.development || 'Not provided'}</p>
            </div>

            <div style="margin-bottom: 1.5rem;">
                <h3>Evaluation</h3>
                <p style="white-space: pre-wrap;">${formData.evaluation || 'Not provided'}</p>
            </div>

            ${formData.conclusion ? `
                <div style="margin-bottom: 1.5rem;">
                    <h3>Conclusion</h3>
                    <p style="white-space: pre-wrap;">${formData.conclusion}</p>
                </div>
            ` : ''}
        </div>
    `;

    document.getElementById('previewModal').classList.add('active');
});

// Modal close functions
window.closeAiModal = function() {
    document.getElementById('aiModal').classList.remove('active');
};

window.closePreviewModal = function() {
    document.getElementById('previewModal').classList.remove('active');
};

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    if (confirm('Are you sure you want to logout? Any unsaved changes will be lost.')) {
        clearInterval(autoSaveInterval);
        await signOut();
        window.location.href = 'login.html';
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
    }
});