from flask import Blueprint, jsonify, request, current_app
from flask_login import login_required, current_user
from ..models import db, Class, Student, Assignment, StudentProfile, AssignmentGrade
from ..utils import get_priority_students_count, get_student_status, get_priority_tasks, get_student_academic_status
from ..openai_helper import get_openai_client
from sqlalchemy import func
from datetime import datetime
from calendar import monthcalendar

api_bp = Blueprint('api', __name__, url_prefix='/api')

@api_bp.route('/generate', methods=['POST'])
@login_required
def generate_response():
    try:
        data = request.get_json()
        prompt = data.get('prompt', '')
        
        client = get_openai_client()
        response = client.chat.completions.create(
            model="o1-mini",
            messages=[
                {"role": "user", "content": prompt}
            ],
            max_completion_tokens=2000
        )
        
        result_text = response.choices[0].message.content
        return jsonify({'result': result_text})
    except Exception as e:
        print(f"OpenAI API Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/teacher/stats')
@login_required
def get_teacher_stats():
    try:
        # Get the classes for the current user
        classes = Class.query.filter_by(professor_id=current_user.id).all()
        print(f"Found {len(classes)} classes")
        
        # Count total students
        total_students = db.session.query(func.count(Student.id))\
            .join(Class)\
            .filter(Class.professor_id == current_user.id)\
            .scalar() or 0
        
        # Count assignments
        assignment_count = db.session.query(func.count(Assignment.id))\
            .join(Class)\
            .filter(Class.professor_id == current_user.id)\
            .scalar() or 0
        
        # Count priority students
        priority_count = db.session.query(func.count(Student.id))\
            .join(Class)\
            .filter(
                Class.professor_id == current_user.id,
                Student.percentage < 70
            )\
            .scalar() or 0
        
        stats = {
            'professorName': current_user.username,
            'totalStudents': total_students,
            'upcomingAssessments': assignment_count,
            'priorityStudents': priority_count,
            'classes': [c.name for c in classes]
        }
        
        print("Returning stats:", stats)
        return jsonify(stats)
    except Exception as e:
        print(f"Error in get_teacher_stats: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/teacher/classes/overview')
@login_required
def get_classes_overview():
    """Get overview of all classes for current teacher"""
    try:
        # Get classes directly from the database
        classes = Class.query.filter_by(professor_id=current_user.id).all()
        
        classes_data = []
        for class_ in classes:
            students = Student.query.filter_by(class_id=class_.id).all()
            class_data = {
                'id': class_.id,
                'name': class_.name,
                'studentCount': len(students)
            }
            classes_data.append(class_data)
        
        print("Classes data:", classes_data)  # Debug print
        return jsonify({'classes': classes_data})
    except Exception as e:
        print(f"Error in get_classes_overview: {e}")
        return jsonify({'classes': []})

@api_bp.route('/classes/<int:class_id>')
@login_required
def get_class_details(class_id):
    """Get detailed information for a specific class"""
    class_ = Class.query.get_or_404(class_id)
    
    if class_.professor_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    return jsonify({
        'id': class_.id,
        'name': class_.name,
        'semester': class_.semester,
        'year': class_.year,
        'stats': get_class_stats(class_)
    })

@api_bp.route('/classes/<int:class_id>/students')
@login_required
def get_class_students(class_id):
    """Get students for a specific class"""
    try:
        students = Student.query.filter_by(class_id=class_id).all()
        students_data = []
        for student in students:
            students_data.append({
                'id': student.id,
                'name': student.name,
                'grade': student.grade,
                'percentage': student.percentage,
                'status': 'good' if student.percentage >= 80 else 'warning' if student.percentage >= 70 else 'danger'
            })
        return jsonify(students_data)
    except Exception as e:
        print(f"Error getting students: {e}")
        return jsonify([])

@api_bp.route('/students/<int:student_id>', methods=['GET', 'PATCH'])
@login_required
def manage_student(student_id):
    student = Student.query.get_or_404(student_id)
    
    if request.method == 'PATCH':
        data = request.json
        # Update student data
        for key, value in data.items():
            setattr(student, key, value)
        db.session.commit()
    
    return jsonify(student_to_dict(student))

@api_bp.route('/assignments/<int:assignment_id>/grade', methods=['POST'])
@login_required
def update_assignment_grade(assignment_id):
    """Update grade for a student's assignment"""
    data = request.get_json()
    
    grade = AssignmentGrade.query.filter_by(
        assignment_id=assignment_id,
        student_id=data['student_id']
    ).first()
    
    if not grade:
        grade = AssignmentGrade(
            assignment_id=assignment_id,
            student_id=data['student_id']
        )
        db.session.add(grade)
    
    grade.grade = data['grade']
    grade.feedback = data['feedback']
    db.session.commit()
    
    return jsonify({'success': True})

@api_bp.route('/teacher/priority-students')
@login_required
def get_priority_students():
    """Get list of priority students based on filter"""
    filter_type = request.args.get('filter', 'all')
    
    # Base query for priority students
    query = Student.query.join(Class).filter(
        Class.professor_id == current_user.id
    )
    
    if filter_type == 'grade':
        query = query.filter(Student.percentage < 70)
    elif filter_type == 'engagement':
        query = query.join(StudentProfile).filter(
            StudentProfile.improvements.like('%engagement%')
        )
    
    students = []
    for student in query.all():
        students.append({
            'id': student.id,
            'name': student.name,
            'classId': student.class_id,
            'className': student.class_.name,
            'grade': student.grade,
            'percentage': student.percentage,
            'priority': 'high' if student.percentage < 60 else 'medium' if student.percentage < 70 else 'low',
            'concernReason': get_student_concern(student)
        })
    
    return jsonify(students)

@api_bp.route('/teacher/context')
@login_required
def get_teacher_context():
    try:
        print(f"Current user: {current_user.username}")
        
        # Get current date info
        now = datetime.now()
        current_month = now.strftime('%B')
        current_week = len(monthcalendar(now.year, now.month))
        current_day = now.strftime('%A')
        
        # Get classes for the current user
        classes = Class.query.filter_by(professor_id=current_user.id).all()
        class_names = [c.name for c in classes]  # Just get the names to match stats endpoint
        
        # Get assignment count
        assignment_count = db.session.query(func.count(Assignment.id))\
            .join(Class)\
            .filter(Class.professor_id == current_user.id)\
            .scalar() or 0
        
        context = {
            'professorName': current_user.username,
            'classes': class_names,  # Match the format from stats endpoint
            'week': current_week,
            'month': current_month,
            'day_of_week': current_day,
            'period': 'Spring' if 1 <= now.month <= 5 else 'Fall' if 8 <= now.month <= 12 else 'Summer',
            'workload': {
                'level': 'high' if assignment_count > 10 else 'medium' if assignment_count > 5 else 'low',
                'currentFocus': 'Assignment Grading' if assignment_count > 10 else 'Course Planning',
                'deadlinePressure': 'high' if assignment_count > 10 else 'medium' if assignment_count > 5 else 'low'
            }
        }
        
        print("Returning context:", context)
        return jsonify(context)
    except Exception as e:
        print(f"Error in get_teacher_context: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'professorName': current_user.username,
            'classes': [],
            'week': current_week,
            'month': current_month,
            'day_of_week': current_day,
            'period': 'Spring',
            'workload': {
                'level': 'medium',
                'currentFocus': 'Course Planning',
                'deadlinePressure': 'low'
            }
        })

# Helper functions
def calculate_class_average(class_):
    """Calculate the average grade percentage for a class"""
    if not class_.students:
        return 0
    total = sum(student.percentage for student in class_.students)
    return round(total / len(class_.students), 1)

def get_class_stats(class_):
    """Get detailed statistics for a class"""
    return {
        'averageGrade': calculate_class_average(class_),
        'gradeDistribution': calculate_grade_distribution(class_),
        'assignmentCompletion': get_assignment_completion_rate(class_),
        'upcomingDeadlines': get_upcoming_deadlines(class_)
    }

def student_to_dict(student):
    """Convert student object to dictionary"""
    return {
        'id': student.id,
        'name': student.name,
        'grade': student.grade,
        'percentage': student.percentage,
        'profile': {
            'description': student.profile.description,
            'strengths': student.profile.strengths,
            'improvements': student.profile.improvements
        } if student.profile else None
    }

def get_student_concern(student):
    """Get the main concern for a student"""
    if student.profile and student.profile.improvements:
        return student.profile.improvements[0]
    return "Academic performance needs attention" if student.percentage < 70 else ""

def calculate_grade_distribution(class_):
    """Calculate grade distribution for a class"""
    distribution = {'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0}
    for student in class_.students:
        if student.percentage >= 90: distribution['A'] += 1
        elif student.percentage >= 80: distribution['B'] += 1
        elif student.percentage >= 70: distribution['C'] += 1
        elif student.percentage >= 60: distribution['D'] += 1
        else: distribution['F'] += 1
    return distribution

def get_assignment_completion_rate(class_):
    """Calculate assignment completion rate for a class"""
    assignments = Assignment.query.filter_by(class_id=class_.id).all()
    if not assignments:
        return 0
    completed = sum(1 for a in assignments if a.status == 'completed')
    return round((completed / len(assignments)) * 100, 1)

def get_upcoming_deadlines(class_):
    """Get upcoming assignment deadlines for a class"""
    return Assignment.query.filter_by(
        class_id=class_.id,
        status='upcoming'
    ).order_by(Assignment.due_date).limit(5).all()

# Error handlers
@api_bp.errorhandler(404)
def not_found_error(error):
    return jsonify({'error': 'Not found'}), 404

@api_bp.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({'error': 'Internal server error'}), 500
