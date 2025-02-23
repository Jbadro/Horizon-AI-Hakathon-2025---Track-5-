// static/main.js

// Global state
const state = {
    initialized: false,
    currentSection: 'home',
    sidebarActive: false
};

// Add this at the top of your file with other global variables
let classData = {};

// Menu toggle function
function toggleMenu() {
    console.log('Toggle menu called');
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        state.sidebarActive = !state.sidebarActive;
        sidebar.classList.toggle('active');
        console.log('Sidebar toggled');
    }
}

// Section loading function
function loadSection(section) {
    console.log('Loading section:', section);
    
    // Hide all sections
    document.querySelectorAll('.section').forEach(el => {
        el.style.display = 'none';
    });
    
    // Show selected section
    const selectedSection = document.getElementById(section);
    if (selectedSection) {
        selectedSection.style.display = 'block';
        
        // Handle specific section initialization
        switch(section) {
            case 'home':
                loadTeacherStats();
                break;
            case 'progress':
                initializeProgressSection();
                break;
            case 'resources':
                initializeResourcesSection();
                break;
            case 'assessments':
                initializeAssessmentsSection();
                break;
            // Add other sections as needed
        }
    }

    // Update active state in sidebar
    document.querySelectorAll('#sidebar li').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-section') === section) {
            item.classList.add('active');
        }
    });
}

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('DOM Content Loaded');
        
        // Initialize basic dashboard components
        await fetchClassData();
        loadSection('home');
        loadTeacherStats();
        
        // Initialize AI chat if needed
        const aiChatContainer = document.getElementById('ai-chat-container');
        if (aiChatContainer) {
            initializeAIChat();
        }

        // Event listener for burger menu
        const burgerMenu = document.querySelector('.burger-menu');
        if (burgerMenu) {
            burgerMenu.addEventListener('click', toggleMenu);
        }

        // Event listener for home button
        const homeButton = document.getElementById('home-button');
        if (homeButton) {
            homeButton.addEventListener('click', () => {
                loadSection('home');
            });
        }

        // Event listeners for sidebar links
        const sidebarLinks = {
            'lesson-plans-link': 'lesson-plans',
            'assessments-link': 'assessments',
            'resources-link': 'resources',
            'progress-link': 'progress'
        };

        Object.entries(sidebarLinks).forEach(([linkId, sectionId]) => {
            const link = document.getElementById(linkId);
            if (link) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    loadSection(sectionId);
                    if (window.innerWidth <= 768) {
                        toggleMenu(); // Close menu on mobile
                    }
                });
            }
        });

        // Close button for sidebar
        const closeBtn = document.getElementById('close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', toggleMenu);
        }

    } catch (error) {
        console.error('Error initializing dashboard:', error);
    }
});

async function loadTeacherStats() {
    const welcomeContainer = document.getElementById('ai-welcome-message');
    if (!welcomeContainer) return;

    welcomeContainer.innerHTML = `
        <div class="welcome-stats">
            <h2>Welcome to your Dashboard</h2>
            <div class="loading">Loading your statistics...</div>
        </div>
    `;

    try {
        const response = await fetch('/api/teacher/stats');
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch stats');
        }
        
        welcomeContainer.innerHTML = `
            <div class="welcome-stats">
                <h2>Welcome, ${data.professorName}</h2>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-value">${data.totalStudents}</span>
                        <span class="stat-label">Total Students</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${data.upcomingAssessments}</span>
                        <span class="stat-label">Upcoming Assessments</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${data.priorityStudents}</span>
                        <span class="stat-label">Priority Students</span>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading stats:', error);
        welcomeContainer.innerHTML = `
            <div class="welcome-stats">
                <h2>Welcome to your Dashboard</h2>
                <div class="error">
                    Unable to load statistics. Please try again later.
                    <button onclick="loadTeacherStats()">Retry</button>
                </div>
            </div>
        `;
    }
}

function loadAssessments() {
    const container = document.getElementById('assessments');
    if (container) {
        container.innerHTML = '<h2>Assessments</h2><div class="loading">Loading assessments...</div>';
    }
}

function loadProgress() {
    const container = document.getElementById('progress');
    if (container) {
        container.innerHTML = '<h2>Student Progress</h2><div class="loading">Loading progress data...</div>';
    }
}

// Add initialization functions for each section
async function initializeProgressSection() {
    console.log('Initializing progress section');
    const progressSection = document.getElementById('progress');
    
    try {
        const response = await fetch('/api/teacher/classes/overview');
        const data = await response.json();
        console.log('Classes data received:', data);  // Debug log
        
        const classes = data.classes || [];
        
        if (classes.length === 0) {
            progressSection.innerHTML = `
                <div class="empty-state">
                    <h3>No Classes Found</h3>
                    <p>You don't have any classes assigned yet.</p>
                </div>
            `;
            return;
        }
        
        progressSection.innerHTML = `
            <div class="classes-container">
                <div class="class-selector">
                    <h3>Your Classes</h3>
                    <div class="class-list">
                        ${classes.map(classInfo => `
                            <div class="class-item" data-class="${classInfo.id}">
                                <span class="class-name">${classInfo.name}</span>
                                <span class="student-count">${classInfo.studentCount} students</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="students-container">
                    <div id="students-list">
                        <h3>Select a class to view students</h3>
                    </div>
                </div>
            </div>
        `;
        
        // Add click handlers to class items
        document.querySelectorAll('.class-item').forEach(item => {
            item.addEventListener('click', async () => {
                const classId = item.getAttribute('data-class');
                const className = item.querySelector('.class-name').textContent;
                await loadStudents(classId, className);
            });
        });
        
        // Select first class by default
        if (classes.length > 0) {
            document.querySelector('.class-item').click();
        }
        
    } catch (error) {
        console.error('Error:', error);
        progressSection.innerHTML = `
            <div class="error">
                <p>Failed to load classes. Please try again.</p>
                <button onclick="initializeProgressSection()">Retry</button>
            </div>
        `;
    }
}

async function loadStudents(classId, className) {
    const studentsList = document.getElementById('students-list');
    try {
        const response = await fetch(`/api/classes/${classId}/students`);
        const students = await response.json();
        
        studentsList.innerHTML = `
            <h3>${className}</h3>
            <div class="students-grid">
                ${students.map(student => `
                    <div class="student-card status-${student.status}">
                        <div class="student-name">${student.name}</div>
                        <div class="student-grade">
                            <span class="grade">${student.grade}</span>
                            <span class="percentage">${student.percentage}%</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error loading students:', error);
        studentsList.innerHTML = `
            <h3>${className}</h3>
            <p class="error">Failed to load students. Please try again.</p>
        `;
    }
}

function initializeResourcesSection() {
    console.log('Initializing resources section');
    filterPriorityStudents('all');
    const priorityStudents = getPriorityStudents();
    updateInsights(priorityStudents);
}

function initializeAssessmentsSection() {
    console.log('Initializing assessments section');
    filterAssessments('all');
    updateAssessmentStats();
}

// Add function to fetch class data if needed
async function fetchClassData() {
    try {
        const response = await fetch('/api/classes');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        classData = data;
        console.log('Fetched class data:', classData);
        return classData;
    } catch (error) {
        console.error('Error fetching class data:', error);
        // Initialize with empty data structure
        classData = {};
        return classData;
    }
}

// Add sorting functions
async function sortStudentsByGrade(classId, ascending) {
    try {
        // Use API endpoint with sorting parameters
        const response = await fetch(`/api/classes/${classId}/students?sort=grade&order=${ascending ? 'asc' : 'desc'}`);
        const students = await response.json();
        return students;
    } catch (error) {
        console.error('Error sorting students by grade:', error);
        return [];
    }
}

async function sortStudentsByName(classId, ascending) {
    try {
        // Use API endpoint with sorting parameters
        const response = await fetch(`/api/classes/${classId}/students?sort=name&order=${ascending ? 'asc' : 'desc'}`);
        const students = await response.json();
        return students;
    } catch (error) {
        console.error('Error sorting students by name:', error);
        return [];
    }
}

// Update the class data structure to include student count
function updateStudentCount(classId) {
    const studentCount = Object.keys(classData[classId].students).length;
    const countElement = document.querySelector(`[data-class="${classId}"] .student-count`);
    if (countElement) {
        countElement.textContent = `${studentCount} students`;
    }
}

// Update populateStudentList function with working sorting
async function populateStudentList(classId, sortBy = 'name', ascending = null) {
    const studentList = document.querySelector('.student-list');
    
    // Get current state or initialize
    if (ascending === null) {
        const currentSortBtn = document.querySelector(`.sort-btn[data-sort="${sortBy}"]`);
        ascending = currentSortBtn ? currentSortBtn.getAttribute('data-ascending') === 'true' : true;
        ascending = !ascending; // Toggle direction
    }

    try {
        // Get sorted students
        let sortedStudents;
        if (sortBy === 'grade') {
            sortedStudents = await sortStudentsByGrade(classId, ascending);
        } else {
            sortedStudents = await sortStudentsByName(classId, ascending);
        }

        // Clear and add sorting controls
        studentList.innerHTML = `
            <div class="sorting-controls">
                <button onclick="populateStudentList('${classId}', 'name')" 
                        class="sort-btn ${sortBy === 'name' ? 'active' : ''}"
                        data-sort="name"
                        data-ascending="${sortBy === 'name' ? ascending : true}">
                    Name ${sortBy === 'name' ? (ascending ? '↓' : '↑') : ''}
                </button>
                <button onclick="populateStudentList('${classId}', 'grade')" 
                        class="sort-btn ${sortBy === 'grade' ? 'active' : ''}"
                        data-sort="grade"
                        data-ascending="${sortBy === 'grade' ? ascending : true}">
                    Grade ${sortBy === 'grade' ? (ascending ? '↓' : '↑') : ''}
                </button>
            </div>
        `;

        // Create student list with grade-based styling
        sortedStudents.forEach(student => {
            studentList.innerHTML += `
                <div class="student-item grade-${student.status.toLowerCase()}" 
                     onclick="showStudentDetails('${student.id}', '${classId}')">
                    <span class="student-name">${student.name}</span>
                    <div class="grade-info">
                        <span class="grade">${student.grade}</span>
                        <span class="percentage">${student.percentage}%</span>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error('Error populating student list:', error);
        studentList.innerHTML = '<div class="error">Failed to load student list</div>';
    }
}

// Update switchClass function to use database
async function switchClass(element, className) {
    const classId = element.getAttribute('data-class');
    
    try {
        // Update active class in UI
        document.querySelectorAll('.class-item').forEach(item => {
            item.classList.remove('active');
        });
        element.classList.add('active');

        // Get students for the selected class
        const response = await fetch(`/api/classes/${classId}/students`);
        const students = await response.json();

        // Update header
        document.querySelector('.students-header h3').textContent = className;

        // Update student list
        const studentList = document.querySelector('.student-list');
        studentList.innerHTML = `
            <div class="sorting-controls">
                <button onclick="sortStudents(${classId}, 'name')" class="sort-btn" data-sort="name">
                    Name ↓
                </button>
                <button onclick="sortStudents(${classId}, 'grade')" class="sort-btn" data-sort="grade">
                    Grade ↓
                </button>
            </div>
            ${students.map(student => `
                <div class="student-item grade-${student.status.toLowerCase()}" 
                     onclick="showStudentDetails(${student.id}, ${classId})">
                    <span class="student-name">${student.name}</span>
                    <div class="grade-info">
                        <span class="grade">${student.grade}</span>
                        <span class="percentage">${student.percentage}%</span>
                    </div>
                </div>
            `).join('')}
        `;

        // Show students view, hide details view
        document.getElementById('students-view').style.display = 'block';
        document.getElementById('student-details-view').style.display = 'none';

    } catch (error) {
        console.error('Error switching class:', error);
        alert('Failed to load student data. Please try again.');
    }
}

async function sortStudents(classId, sortBy) {
    try {
        const button = document.querySelector(`.sort-btn[data-sort="${sortBy}"]`);
        const isAscending = button.textContent.includes('↓');
        
        // Update sort buttons
        document.querySelectorAll('.sort-btn').forEach(btn => {
            btn.textContent = btn.textContent.replace(/[↑↓]/, '↓');
        });
        button.textContent = button.textContent.replace('↓', isAscending ? '↑' : '↓');

        // Fetch sorted students
        const response = await fetch(`/api/classes/${classId}/students?sort=${sortBy}&order=${isAscending ? 'desc' : 'asc'}`);
        const students = await response.json();

        // Update student list
        const studentList = document.querySelector('.student-list');
        const existingControls = studentList.querySelector('.sorting-controls');
        studentList.innerHTML = existingControls.outerHTML + students.map(student => `
            <div class="student-item grade-${student.status.toLowerCase()}" 
                 onclick="showStudentDetails(${student.id}, ${classId})">
                <span class="student-name">${student.name}</span>
                <div class="grade-info">
                    <span class="grade">${student.grade}</span>
                    <span class="percentage">${student.percentage}%</span>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error sorting students:', error);
        alert('Failed to sort students. Please try again.');
    }
}

async function showStudentDetails(studentId, classId) {
    try {
        const response = await fetch(`/api/students/${studentId}`);
        const student = await response.json();

        document.getElementById('students-view').style.display = 'none';
        const detailsView = document.getElementById('student-details-view');
        detailsView.style.display = 'block';

        detailsView.innerHTML = `
            <div class="details-header">
                <button class="back-btn" onclick="showStudentList()">← Back to Class</button>
                <h3>Student Details</h3>
            </div>
            
            <div class="student-info">
                <h4>${student.name}</h4>
                <div class="overall-grade">
                    <span>Overall Grade:</span>
                    <span class="grade">${student.grade}</span>
                    <span class="percentage">(${student.percentage}%)</span>
                </div>
            </div>

            ${student.profile ? `
                <div class="student-profile">
                    <h4>Student Profile</h4>
                    <p class="profile-description">${student.profile.description}</p>
                    <div class="profile-points">
                        <h5>Strengths:</h5>
                        <ul>
                            ${student.profile.strengths.map(strength => `<li>${strength}</li>`).join('')}
                        </ul>
                        <h5>Areas for Improvement:</h5>
                        <ul>
                            ${student.profile.improvements.map(improvement => `<li>${improvement}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            ` : ''}
        `;
    } catch (error) {
        console.error('Error showing student details:', error);
        alert('Failed to load student details. Please try again.');
    }
}

function showStudentList() {
    document.getElementById('students-view').style.display = 'block';
    document.getElementById('student-details-view').style.display = 'none';
}

// Add these functions for the Student Development section
function getPriorityStudents() {
    const priorityStudents = [];
    
    Object.entries(classData).forEach(([classId, classInfo]) => {
        Object.entries(classInfo.students).forEach(([studentId, student]) => {
            const gradeValue = getGradeValue(student.grade);
            const needsHelp = student.profile.points.some(point => 
                point.toLowerCase().includes('needs') || 
                point.toLowerCase().includes('could improve') ||
                point.toLowerCase().includes('struggling')
            );
            
            if (gradeValue <= 7 || needsHelp) { // C+ or lower
                priorityStudents.push({
                    id: studentId,
                    classId: classId,
                    className: classInfo.name,
                    ...student,
                    priority: gradeValue <= 6 ? 'high' : gradeValue <= 8 ? 'medium' : 'low'
                });
            }
        });
    });
    
    return priorityStudents.sort((a, b) => getGradeValue(a.grade) - getGradeValue(b.grade));
}

function getGradeValue(grade) {
    const gradeOrder = {
        'A+': 13, 'A': 12, 'A-': 11, 'B+': 10, 'B': 9, 'B-': 8,
        'C+': 7, 'C': 6, 'C-': 5, 'D+': 4, 'D': 3, 'D-': 2, 'F': 1
    };
    return gradeOrder[grade];
}

function filterPriorityStudents(filter) {
    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    const priorityList = document.getElementById('priority-list');
    let students = getPriorityStudents();

    if (filter === 'grade') {
        students = students.filter(student => getGradeValue(student.grade) <= 7);
    } else if (filter === 'engagement') {
        students = students.filter(student => 
            student.profile.points.some(point => 
                point.toLowerCase().includes('engagement') ||
                point.toLowerCase().includes('participation')
            )
        );
    }

    priorityList.innerHTML = students.map(student => `
        <div class="priority-student-card priority-${student.priority}" 
             onclick="showStudentDetails('${student.id}', '${student.classId}')">
            <div class="student-header">
                <h4>${student.name}</h4>
                <span class="class-label">${student.className}</span>
            </div>
            <div class="grade-info">
                <span class="grade">${student.grade}</span>
                <span class="percentage">${student.percentage}</span>
            </div>
            <p class="concern-point">${student.profile.points.find(point => 
                point.toLowerCase().includes('needs') || 
                point.toLowerCase().includes('could improve') ||
                point.toLowerCase().includes('struggling')
            )}</p>
        </div>
    `).join('');

    updateInsights(students);
}

function updateInsights(priorityStudents) {
    const insightsContent = document.getElementById('insights-content');
    const totalStudents = priorityStudents.length;
    const gradeDistribution = priorityStudents.reduce((acc, student) => {
        acc[student.grade] = (acc[student.grade] || 0) + 1;
        return acc;
    }, {});

    insightsContent.innerHTML = `
        <div class="insight-card">
            <div class="insight-title">Overview</div>
            <p>${totalStudents} students currently need additional support</p>
            <div class="action-points">
                <li>${priorityStudents.filter(s => s.priority === 'high').length} students require immediate attention</li>
                <li>${priorityStudents.filter(s => s.priority === 'medium').length} students need moderate support</li>
                <li>${priorityStudents.filter(s => s.priority === 'low').length} students need minor assistance</li>
            </div>
        </div>
        <div class="insight-card">
            <div class="insight-title">Recommended Actions</div>
            <div class="action-points">
                <li>Schedule one-on-one sessions with high-priority students</li>
                <li>Create study groups for students with similar challenges</li>
                <li>Review teaching methods for commonly struggling topics</li>
                <li>Consider implementing peer tutoring programs</li>
            </div>
        </div>
    `;
}

// Update filterAssessments function to handle submission display
function filterAssessments(type) {
    // Update active filter button
    document.querySelectorAll('.assessment-filters .filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick').includes(`'${type}'`)) {
            btn.classList.add('active');
        }
    });

    // Get selected class
    const selectedClassId = document.getElementById('class-select').value;
    const classInfo = assessmentData[selectedClassId];

    // Get assessments from selected class only
    let assessments = classInfo.assessments.map(assessment => ({
        ...assessment,
        className: classInfo.name,
        classId: selectedClassId
    }));

    // Filter assessments if needed
    if (type !== 'all') {
        assessments = assessments.filter(a => a.type === type);
    }

    // Sort by due date
    assessments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    // Update the upcoming list
    const upcomingList = document.getElementById('upcoming-list');
    upcomingList.innerHTML = assessments.map(assessment => `
        <div class="assessment-item ${assessment.type}" onclick="showAssessmentDetails('${assessment.id}')">
            <div class="assessment-header">
                <span class="assessment-title">${assessment.title}</span>
                <span class="due-date">${formatDate(assessment.dueDate)}</span>
            </div>
            <p class="assessment-description">${assessment.description}</p>
            <div class="assessment-meta">
                <span class="class-name">${assessment.className}</span>
                ${assessment.type === 'assignment' ? `
                    <div class="submission-info">
                        <span class="submitted">${assessment.submissions?.submitted?.length || 0} submitted</span>
                        <span class="missing">${assessment.submissions?.missing?.length || 0} missing</span>
                    </div>
                ` : ''}
                <span class="status-badge status-${assessment.status}">${assessment.status.replace('-', ' ')}</span>
            </div>
        </div>
    `).join('');

    updateAssessmentStats();
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function updateAssessmentStats() {
    const classId = document.getElementById('class-select').value;
    const classInfo = assessmentData[classId];
    
    // Get all students in the class
    const students = classData[classId].students;
    
    // Get past assessments from student profiles
    const pastAssessments = new Set();
    Object.values(students).forEach(student => {
        student.assignments.forEach(assignment => {
            pastAssessments.add(assignment.name);
        });
    });
    
    // Count assessments by type and status
    const stats = {
        total: {
            all: classInfo.assessments.length + pastAssessments.size,
            tests: classInfo.assessments.filter(a => a.type === 'test').length + 
                   Array.from(pastAssessments).filter(name => name.toLowerCase().includes('exam')).length,
            quizzes: classInfo.assessments.filter(a => a.type === 'quiz').length +
                    Array.from(pastAssessments).filter(name => name.toLowerCase().includes('quiz')).length,
            assignments: classInfo.assessments.filter(a => a.type === 'assignment').length +
                        Array.from(pastAssessments).filter(name => 
                            name.toLowerCase().includes('homework') || 
                            name.toLowerCase().includes('problem set') ||
                            name.toLowerCase().includes('lab')
                        ).length
        },
        upcoming: classInfo.assessments.filter(a => a.status === 'upcoming').length,
        dueSoon: classInfo.assessments.filter(a => a.status === 'due-soon').length,
        completed: pastAssessments.size
    };

    document.getElementById('assessment-stats').innerHTML = `
        <div class="stats-card">
            <h4>Class Overview</h4>
            <div class="overview-stats">
                <div class="stat-group">
                    <h5>Total Assessments</h5>
                    <p>All: ${stats.total.all}</p>
                    <p>Tests: ${stats.total.tests}</p>
                    <p>Quizzes: ${stats.total.quizzes}</p>
                    <p>Assignments: ${stats.total.assignments}</p>
                </div>
                <div class="stat-group">
                    <h5>Status</h5>
                    <p>Completed: ${stats.completed}</p>
                    <p>Upcoming: ${stats.upcoming}</p>
                    <p>Due Soon: ${stats.dueSoon}</p>
                </div>
            </div>
        </div>
        <div class="weight-distribution">
            <h4>Weight Distribution</h4>
            <div class="weight-groups">
                ${['test', 'quiz', 'assignment'].map(type => `
                    <div class="weight-group">
                        <h5>${type.charAt(0).toUpperCase() + type.slice(1)}s</h5>
                        ${classInfo.assessments
                            .filter(a => a.type === type)
                            .map(a => `
                                <div class="weight-item ${a.status}">
                                    <span>${a.title}</span>
                                    <span>${a.weight}</span>
                                </div>
                            `).join('')}
                        ${type === 'test' ? 
                            Array.from(pastAssessments)
                                .filter(name => name.toLowerCase().includes('exam'))
                                .map(name => `
                                    <div class="weight-item completed">
                                        <span>${name}</span>
                                        <span>-</span>
                                    </div>
                                `).join('') : ''}
                        ${type === 'quiz' ? 
                            Array.from(pastAssessments)
                                .filter(name => name.toLowerCase().includes('quiz'))
                                .map(name => `
                                    <div class="weight-item completed">
                                        <span>${name}</span>
                                        <span>-</span>
                                    </div>
                                `).join('') : ''}
                        ${type === 'assignment' ? 
                            Array.from(pastAssessments)
                                .filter(name => 
                                    name.toLowerCase().includes('homework') || 
                                    name.toLowerCase().includes('problem set') ||
                                    name.toLowerCase().includes('lab')
                                )
                                .map(name => `
                                    <div class="weight-item completed">
                                        <span>${name}</span>
                                        <span>-</span>
                                    </div>
                                `).join('') : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Initialize assessments view when loading the section
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('upcoming-list')) {
        filterAssessments('all');
    }
});

// Add filterAssessmentsByClass function
function filterAssessmentsByClass() {
    const classId = document.getElementById('class-select').value;
    
    // Update active filter button to 'all'
    document.querySelectorAll('.assessment-filters .filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick').includes("'all'")) {
            btn.classList.add('active');
        }
    });
    
    // Update stats for the selected class
    updateAssessmentStats();
    
    // Re-filter assessments with 'all' filter type
    filterAssessments('all');
}

// Add click event handler to close modal when clicking outside
function closeAssessmentDetails() {
    const modalContainer = document.getElementById('modal-container');
    if (modalContainer) {
        modalContainer.style.display = 'none';
    }
}

// Update showAssessmentDetails function
function showAssessmentDetails(assessmentId) {
    // Find the class that contains this assessment
    const classInfo = Object.values(assessmentData).find(c => 
        c.assessments.some(a => a.id === assessmentId)
    );
    
    if (!classInfo) return;
    
    // Find the specific assessment
    const assessment = classInfo.assessments.find(a => a.id === assessmentId);
    if (!assessment) return;

    // Create modal container if it doesn't exist
    let modalContainer = document.getElementById('modal-container');
    if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = 'modal-container';
        modalContainer.addEventListener('click', (e) => {
            if (e.target === modalContainer) {
                closeAssessmentDetails();
            }
        });
        document.body.appendChild(modalContainer);
    }

    // Get the class ID for student lookup
    const classId = Object.keys(assessmentData).find(key => assessmentData[key] === classInfo);

    // Generate modal content
    modalContainer.innerHTML = `
        <div class="assessment-details-modal" onclick="event.stopPropagation()">
            <div class="modal-header">
                <h3>${assessment.title}</h3>
                <span class="close-modal" onclick="closeAssessmentDetails()">×</span>
            </div>
            <div class="modal-content">
                <div class="assessment-info">
                    <p class="due-date">Due: ${formatDate(assessment.dueDate)}</p>
                    <p class="status ${assessment.status}">${assessment.status}</p>
                    <p class="weight">Weight: ${assessment.weight}</p>
                </div>
                
                ${assessment.type === 'assignment' && assessment.submissions ? `
                    <div class="submission-status">
                        <h4>Submission Status</h4>
                        <div class="submission-stats">
                            <div class="stat-item">
                                <span class="stat-label">Submitted</span>
                                <span class="stat-value">${assessment.submissions.submitted.length}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Missing</span>
                                <span class="stat-value">${assessment.submissions.missing.length}</span>
                            </div>
                        </div>
                        
                        <div class="missing-students">
                            <h4>Missing Submissions</h4>
                            <ul class="student-list">
                                ${assessment.submissions.missing.map(studentId => {
                                    const student = classData[classId].students[studentId];
                                    return `<li>${student ? student.name : studentId}</li>`;
                                }).join('')}
                            </ul>
                        </div>
                    </div>
                ` : ''}

                <div class="specifications">
                    <h4>Specifications</h4>
                    ${assessment.specifications && assessment.specifications.duration ? 
                        `<p><strong>Duration:</strong> ${assessment.specifications.duration}</p>` : ''}
                    ${assessment.specifications && assessment.specifications.format ? 
                        `<p><strong>Format:</strong> ${assessment.specifications.format}</p>` : ''}
                    ${assessment.specifications && assessment.specifications.requirements ? 
                        `<p><strong>Requirements:</strong> ${assessment.specifications.requirements}</p>` : ''}
                </div>
            </div>
        </div>
    `;

    // Show the modal
    modalContainer.style.display = 'block';
}
