#  blueprints 
from flask_sqlalchemy import SQLAlchemy
from .auth import auth_bp
from .api import api_bp
from .main import main_bp

# Create the SQLAlchemy instance
db = SQLAlchemy()

def init_blueprints(app):
    # Initialize SQLAlchemy with the Flask app
    db.init_app(app)
    
    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(api_bp)
    app.register_blueprint(main_bp)

__all__ = ['auth_bp', 'api_bp', 'main_bp', 'db', 'init_blueprints']
