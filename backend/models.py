from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from flask_login import UserMixin

# Initialize SQLAlchemy
db = SQLAlchemy()

class SentimentResults(db.Model):
    __tablename__ = 'sentiment_results'

    id = db.Column(db.Integer, primary_key=True)
    query = db.Column(db.String(255))
    category = db.Column(db.String(255))
    title = db.Column(db.String(255))
    sentiment = db.Column(db.String(50))
    source = db.Column(db.String(255))
    model = db.Column(db.String(255))

    def __repr__(self):
        return f"<SentimentResult {self.title[:20]}...>"
    
    def to_dict(self):
        return {
            'id': self.id,
            'query': self.query,
            'category': self.category,
            'title': self.title,
            'sentiment': self.sentiment,
            'source': self.source,
            'model': self.model
        }

class Feedback(db.Model):
    __tablename__ = 'feedback'
    
    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.String(36), nullable=False)
    item_title = db.Column(db.String(255), nullable=False)
    source_type = db.Column(db.String(50), nullable=False)
    predicted_sentiment = db.Column(db.String(50), nullable=False)
    feedback_type = db.Column(db.String(50), nullable=False)
    feedback_text = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.String(100), db.ForeignKey('users.id'), nullable=False)
    model_used = db.Column(db.String(100), nullable=True)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'item_title', 'model_used', name='unique_user_item_model_feedback'),
    )
    
    # Relationship to User
    user = db.relationship('User', backref='feedbacks')

    def __repr__(self):
        return f"<Feedback {self.item_title}>"
    
    def to_dict(self):
        return {
            'id': self.id,
            'item_id': self.item_id,
            'item_title': self.item_title,
            'source_type': self.source_type,
            'predicted_sentiment': self.predicted_sentiment,
            'feedback_type': self.feedback_type,
            'feedback_text': self.feedback_text,
            'timestamp': self.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
            'user_email': self.user.email if self.user else 'Unknown',
            'user_name': self.user.name if self.user else 'Anonymous',
            'model_used': self.model_used
        }
        
class User(UserMixin, db.Model):
    __tablename__ = 'users'

    id = db.Column(db.String(100), primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    profile_pic = db.Column(db.String(200), nullable=False)
    is_admin = db.Column(db.Boolean, default=False) 

    def __repr__(self):
        return f"<User {self.email}>"

    @staticmethod
    def get(user_id):
        return User.query.get(user_id)

    @staticmethod
    def create(id_, name, email, profile_pic, is_admin=False):
        user = User(id=id_, name=name, email=email, profile_pic=profile_pic, is_admin=is_admin)
        db.session.add(user)
        db.session.commit()
        return user