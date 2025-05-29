from dotenv import load_dotenv
import os
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from psycopg2.errors import DuplicateDatabase
from urllib.parse import urlparse
import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Parse the DATABASE_URL for connection details
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set in the environment")

parsed_url = urlparse(DATABASE_URL)
DB_NAME = parsed_url.path.lstrip('/')
DB_USER = parsed_url.username
DB_PASS = parsed_url.password
DB_HOST = parsed_url.hostname
DB_PORT = parsed_url.port or 5432

def create_database_if_not_exists(max_retries=5, retry_interval=5):
    """Attempt to create the database with retries if connection fails"""
    retries = 0
    
    while retries < max_retries:
        try:
            # First try to connect to PostgreSQL server
            logger.info(f"Attempting to connect to PostgreSQL at {DB_HOST}:{DB_PORT} (attempt {retries + 1}/{max_retries})...")
            conn = psycopg2.connect(
                dbname='postgres',
                user=DB_USER,
                password=DB_PASS,
                host=DB_HOST,
                port=DB_PORT
            )
            conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            cur = conn.cursor()
            
            # Try to create the database
            try:
                cur.execute(f"CREATE DATABASE {DB_NAME}")
                logger.info(f"Database '{DB_NAME}' created successfully.")
            except DuplicateDatabase:
                logger.info(f"Database '{DB_NAME}' already exists, skipping creation.")
            
            cur.close()
            conn.close()
            return True
            
        except psycopg2.OperationalError as e:
            retries += 1
            if retries >= max_retries:
                logger.error(f"Failed to connect to PostgreSQL after {max_retries} attempts: {e}")
                return False
            logger.warning(f"Connection failed. Retrying in {retry_interval} seconds...")
            time.sleep(retry_interval)
            
    return False

# Create DB if needed before starting Flask app
db_ready = create_database_if_not_exists()

# === Flask app setup ===
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager
from flask_admin import Admin, AdminIndexView
from flask_admin.contrib.sqla import ModelView
from flask_admin.menu import MenuLink
from models import User, Feedback, SentimentResults

app = Flask(__name__, template_folder="templates", static_folder="../static")

# Load configuration from config.py
from config import current_config
app.config.from_object(current_config)


app.secret_key = os.getenv("SECRET_KEY", os.urandom(24))  

# Initialize extensions
from models import db
db.init_app(app)
migrate = Migrate(app, db)
login_manager = LoginManager()
login_manager.init_app(app)


# === Flask-Admin Configuration ===
class AdminModelView(ModelView):
    def is_accessible(self):
        from flask_login import current_user
        return current_user.is_authenticated and current_user.is_admin
    
    def inaccessible_callback(self, name, **kwargs):
        from flask import redirect, url_for
        return redirect(url_for('index.index'))

class AdminIndexView(AdminIndexView):
    def is_accessible(self):
        from flask_login import current_user
        return current_user.is_authenticated and current_user.is_admin
    
    def inaccessible_callback(self, name, **kwargs):
        from flask import redirect, url_for
        return redirect(url_for('index.index'))

admin = Admin(app, name='Sentiment Analysis Admin', template_mode='bootstrap3', index_view=AdminIndexView())

class FeedbackAdmin(AdminModelView):
    column_list = ('id', 'user_email', 'item_id', 'item_title', 'source_type', 'predicted_sentiment', 'feedback_type', 'feedback_text', 'timestamp', 'model_used')
    column_searchable_list = ('item_title', 'feedback_text', 'source_type', 'model_used')
    column_filters = ['predicted_sentiment', 'source_type', 'model_used']

    def _user_email_formatter(self, context, model, name):
        return model.user.email if model.user else 'Unknown'

    column_formatters = {
        'user_email': _user_email_formatter
    }
    column_labels = {
        'user_email': 'User Email',
    }

class SentimentResultsAdmin(AdminModelView):
    column_list = ('id', 'query', 'title', 'sentiment', 'source', 'model')

admin.add_view(FeedbackAdmin(Feedback, db.session))
admin.add_view(SentimentResultsAdmin(SentimentResults, db.session))
admin.add_link(MenuLink(name='Return to Site', url='/'))

# === User Loader ===
@login_manager.user_loader
def load_user(user_id):
    return User.get(user_id)

@app.context_processor
def inject_user():
    from flask_login import current_user
    return dict(user=current_user)

# Configure OAuth for development
if os.getenv("FLASK_ENV") == "development":
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

# Import routes with appropriate paths based on run context
try:
    from routes.index import index_bp
    from routes.sentiment_statistics import sentiment_statistics_bp
    from routes.model_feedback import model_feedback_bp
    from routes.auth import auth_bp
    from routes.admin import admin_bp
    from routes.legal import legal_bp
    from routes.about import about_bp
    from routes.model_performance import model_performance_bp
    logger.info("Using absolute imports for routes")
except ImportError:
    from backend.routes.index import index_bp
    from backend.routes.sentiment_statistics import sentiment_statistics_bp
    from backend.routes.model_feedback import model_feedback_bp
    from backend.routes.auth import auth_bp
    from backend.routes.admin import admin_bp
    from backend.routes.legal import legal_bp
    from backend.routes.about import about_bp
    from backend.routes.model_performance import model_performance_bp
    logger.info("Using relative imports for routes")

# Register Blueprints
app.register_blueprint(index_bp)
app.register_blueprint(sentiment_statistics_bp)
app.register_blueprint(model_feedback_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(legal_bp)
app.register_blueprint(about_bp)
app.register_blueprint(model_performance_bp)

# Initialize database tables
with app.app_context():
    try:
        db.create_all()
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Database initialization error: {e}")
        
if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)