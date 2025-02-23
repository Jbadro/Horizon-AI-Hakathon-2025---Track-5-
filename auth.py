from flask import Blueprint, request, flash, redirect, url_for, render_template
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import check_password_hash
from ..models import User

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        print("User is already authenticated, redirecting to dashboard")
        return redirect(url_for('main.dashboard'))

    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        print(f"Login attempt - Username: {username}")
        
        user = User.query.filter_by(username=username).first()
        if user:
            print(f"User found: {user.username}")
            if check_password_hash(user.password_hash, password):
                login_user(user, remember=True)
                print(f"Login successful. User authenticated: {current_user.is_authenticated}")
                next_page = request.args.get('next')
                print(f"Redirecting to: {next_page or 'main.dashboard'}")
                return redirect(next_page or url_for('main.dashboard'))
            else:
                print("Invalid password")
        else:
            print("User not found")
        
        flash('Invalid username or password')
    return render_template('login.html')

@auth_bp.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('auth.login'))
