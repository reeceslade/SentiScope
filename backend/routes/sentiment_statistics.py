"""Routes for the sentiment_statistics page."""
from flask import Blueprint, render_template, jsonify, current_app
from flask_login import current_user
import traceback
import logging

# Try both import styles to handle different run contexts
try:
    from models import db, SentimentResults
except ImportError:
    try:
        from models import db, SentimentResults
    except ImportError:
        print("CRITICAL: Could not import database models!")

# Create blueprint
sentiment_statistics_bp = Blueprint('sentiment_statistics', __name__)

logger = logging.getLogger('sentiment_statistics_routes')
handler = logging.StreamHandler()
handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
logger.addHandler(handler)
logger.setLevel(logging.INFO)

def get_logger():
    """Get the appropriate logger - either from the app or local"""
    try:
        return current_app.logger
    except:
        return logger

@sentiment_statistics_bp.route('/sentiment_statistics')
def sentiment_statistics():
    """Render the sentiment_statistics page template"""
    return render_template('sentiment_statistics.html', user=current_user)

@sentiment_statistics_bp.route('/api/sentiment_statistics')
def get_sentiment_statistics():
    """API endpoint to retrieve all sentiment results"""
    log = get_logger()
    
    try:
        log.info("Retrieving sentiment results from database")
        results = db.session.query(SentimentResults).all()
        
        # Convert to dictionaries
        formatted_results = []
        for result in results:
            try:
                if hasattr(result, 'to_dict'):
                    result_dict = result.to_dict()
                else:
                    result_dict = {
                        'Query': getattr(result, 'Query', None),
                        'Source': getattr(result, 'Source', None),
                        'Model': getattr(result, 'Model', None),
                        'Sentiment': getattr(result, 'Sentiment', None),
                    }
                formatted_results.append(result_dict)
            except Exception as item_error:
                log.error(f"Error converting item to dict: {str(item_error)}")
        
        log.info(f"Successfully retrieved {len(formatted_results)} sentiment results")
        return jsonify(formatted_results)
    except Exception as e:
        log.error(f"sentiment_statistics API error: {str(e)}")
        log.error(traceback.format_exc())
        return jsonify({"error": str(e), "message": "Failed to retrieve sentiment data"}), 500

@sentiment_statistics_bp.route('/api/valid-combinations')
def get_valid_combinations():
    """Return all valid query/source/model combinations that exist in the database"""
    log = get_logger()
    
    try:
        log.info("Starting valid combinations query")
        
        # First try to get the data from the sentiment_statistics endpoint as a fallback
        sentiment_statistics_data = []
        try:
            results = db.session.query(SentimentResults).all()
            for result in results:
                if hasattr(result, 'to_dict'):
                    sentiment_statistics_data.append(result.to_dict())
                else:
                    sentiment_statistics_data.append({
                        'Query': getattr(result, 'Query', None),
                        'Source': getattr(result, 'Source', None),
                        'Model': getattr(result, 'Model', None),
                    })
        except Exception as sentiment_statistics_error:
            log.error(f"Error getting sentiment_statistics data: {str(sentiment_statistics_error)}")
        
        # Generate combinations from the sentiment_statistics data as a super-safe fallback
        combinations = []
        seen = set()
        
        for item in sentiment_statistics_data:
            if not item.get('Query') or not item.get('Source') or not item.get('Model'):
                continue
                
            key = f"{item.get('Query')}_{item.get('Source')}_{item.get('Model')}"
            if key in seen:
                continue
                
            seen.add(key)
            combinations.append({
                "query": item.get('Query'),
                "source": item.get('Source'),
                "model": item.get('Model')
            })
        
        log.info(f"Generated {len(combinations)} valid combinations")
        return jsonify(combinations)
        
    except Exception as e:
        log.error(f"Valid combinations API error: {str(e)}")
        log.error(traceback.format_exc())
        return jsonify({"error": str(e), "message": "Failed to retrieve valid combinations"}), 500