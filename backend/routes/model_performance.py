from flask import Blueprint, render_template, jsonify
from flask_login import current_user

# Try both import styles to handle different run contexts
try:
    from models import db, Feedback
except ImportError:
    from models import db, Feedback

# Create blueprint
model_performance_bp = Blueprint('model_performance', __name__)

@model_performance_bp.route('/model_performance')
def model_performance():
    """Render the model performance page."""
    return render_template('model_performance.html', user=current_user)

@model_performance_bp.route('/api/model_performance_stats')
def get_model_performance_stats():
    """Get stats for model performance based on user feedback."""
    try:
        # First get all unique models
        models = db.session.query(Feedback.model_used).distinct().all()
        models = [model[0] for model in models if model[0]]  # Filter out None/empty values
        
        result = []
        for model in models:
            # Get thumbs up count
            thumbs_up = db.session.query(Feedback).filter(
                Feedback.model_used == model,
                Feedback.feedback_type == 'thumbs_up'
            ).count()
            
            # Get thumbs down count
            thumbs_down = db.session.query(Feedback).filter(
                Feedback.model_used == model,
                Feedback.feedback_type == 'thumbs_down'
            ).count()
            
            # Calculate total and percentages
            total = thumbs_up + thumbs_down
            up_percentage = (thumbs_up / total * 100) if total > 0 else 0
            down_percentage = (thumbs_down / total * 100) if total > 0 else 0
            
            result.append({
                'model': model,
                'thumbs_up': thumbs_up,
                'thumbs_down': thumbs_down,
                'total': total,
                'up_percentage': up_percentage,
                'down_percentage': down_percentage
            })
            
        return jsonify(result)
    except Exception as e:
        model_performance_bp.logger.error(f"Model performance stats error: {str(e)}")
        return jsonify({"error": str(e)}), 500