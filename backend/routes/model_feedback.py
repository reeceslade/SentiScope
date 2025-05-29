from flask import Blueprint, render_template, jsonify, request, current_app
from flask_login import current_user, login_required
from datetime import datetime
from models import Feedback
import uuid
import traceback

# Try both import styles to handle different run contexts
try:
    from models import db, Feedback
except ImportError:
    from models import db, Feedback

# Create blueprint
model_feedback_bp = Blueprint('model_feedback', __name__)

@model_feedback_bp.route('/model_feedback')
@login_required
def model_feedback():
    try:
        feedback_data = db.session.query(Feedback).all()
        return render_template('model_feedback.html', feedback_data=[f.to_dict() for f in feedback_data], user=current_user)
    except Exception as e:
        model_feedback_bp.logger.error(f"Feedback error: {str(e)}")
        return render_template('error.html', message="Could not load feedback data", user=current_user)

@model_feedback_bp.route('/api/model_feedback_stats')
@login_required
def get_model_stats():
    try:
        feedback_data = db.session.query(Feedback).join(Feedback.user).all()
        return jsonify([f.to_dict() for f in feedback_data])
    except Exception as e:
        model_feedback_bp.logger.error(f"Model stats error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@model_feedback_bp.route('/submit-feedback', methods=['POST'])
def submit_feedback():
    try:
        data = request.json
        
        # Log incoming data for debugging
        #current_app.logger.info(f"Received feedback data: {data}")
        
        # Validate required fields
        if not data:
            return jsonify({"status": "error", "message": "No data provided"}), 400
            
        if 'feedback_type' not in data:
            return jsonify({"status": "error", "message": "Missing feedback_type"}), 400
        
        # Check if user has already submitted feedback for this item
        existing_feedback = Feedback.query.filter_by(
            user_id=current_user.id,
            item_title=data.get('item_title', 'Unknown title'),
            model_used=data.get('model_used', '')
        ).first()

        
        if existing_feedback:
            return jsonify({
                "status": "error", 
                "message": "You have already provided feedback for this item"
            }), 400
        
        # Generate a unique ID if none is provided
        item_id = data.get('item_id')
        if item_id is None:
            item_id = str(uuid.uuid4())
            current_app.logger.info(f"Generated new item_id: {item_id}")
        
        feedback = Feedback(
            item_id=item_id,
            item_title=data.get('item_title', 'Unknown title'),
            source_type=data.get('source_type', 'news'),
            predicted_sentiment=data.get('predicted_sentiment', 'Unknown'),
            feedback_type=data.get('feedback_type'),
            feedback_text=data.get('feedback_text', ''),
            timestamp=datetime.now(),
            user_id=current_user.id,
            model_used=data.get('model_used', '') 
        )
        
        current_app.logger.info(f"Creating feedback entry: {feedback.to_dict()}")
        
        db.session.add(feedback)
        db.session.commit()
        
        current_app.logger.info(f"Successfully saved feedback with ID: {feedback.id}")
        return jsonify({"status": "success", "message": "Feedback submitted successfully"})
    except Exception as e:
        error_details = traceback.format_exc()
        current_app.logger.error(f"Submit feedback error: {str(e)}\n{error_details}")
        db.session.rollback()
        
        # Handle the integrity error specifically for duplicate feedback
        if "unique_user_item_feedback" in str(e):
            return jsonify({
                "status": "error", 
                "message": "You have already provided feedback for this item"
            }), 400
            
        return jsonify({"status": "error", "message": str(e)}), 500