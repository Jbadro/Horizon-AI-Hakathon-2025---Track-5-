from flask import Blueprint, render_template
from flask_login import login_required, current_user

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
@login_required
def dashboard():
    print(f"Dashboard accessed. User authenticated: {current_user.is_authenticated}")
    print(f"Current user: {current_user.username if current_user.is_authenticated else 'None'}")
    return render_template('index.html')
