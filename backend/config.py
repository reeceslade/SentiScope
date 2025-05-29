import os
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class Config:
    """Base configuration class"""
    DEBUG = False
    TESTING = False
    SECRET_KEY = os.getenv("SECRET_KEY")

    # API keys
    NEWS_API_KEY = os.getenv("NEWS_API_KEY")
    YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")

    if NEWS_API_KEY:
        logger.info("Loaded NEWS_API_KEY from environment")
    if YOUTUBE_API_KEY:
        logger.info("Loaded YOUTUBE_API_KEY from environment")

    # Database configuration
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
    }

    # Google OAuth
    GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
    GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    SECRET_KEY = os.getenv("SECRET_KEY")
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', Config.SQLALCHEMY_DATABASE_URI)

class ProductionConfig(Config):
    """Production configuration"""
    SECRET_KEY = os.getenv("SECRET_KEY")
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL')

# Select configuration based on environment
env = os.getenv("FLASK_ENV", "development").lower()
if env == "production":
    current_config = ProductionConfig
    logger.info("Using ProductionConfig")
else:
    current_config = DevelopmentConfig
    logger.info("Using DevelopmentConfig")

logger.info("Configuration loaded successfully")