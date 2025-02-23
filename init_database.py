import sys
from server import create_app, db
from server.init_db import init_db

def initialize_database(reset=False):
    app = create_app()
    with app.app_context():
        if reset:
            # Drop all tables and recreate
            print("Warning: This will delete all existing data!")
            confirm = input("Are you sure you want to reset the database? (yes/no): ")
            if confirm.lower() == 'yes':
                db.drop_all()
                db.create_all()
                init_db()
                print("Database reset and reinitialized successfully!")
            else:
                print("Database reset cancelled.")
        else:
            # Just create tables if they don't exist
            db.create_all()
            if not init_db():  # init_db returns False if data already exists
                print("Database tables exist and contain data. No changes made.")
            else:
                print("Database initialized with test data!")

if __name__ == '__main__':
    # Check if reset flag is provided
    reset_mode = '--reset' in sys.argv
    initialize_database(reset=reset_mode) 