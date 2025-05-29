from flask import Blueprint, redirect, url_for
from flask_login import current_user
from functools import wraps

admin_bp = Blueprint('admin_routes', __name__)

# Admin required decorator
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin:
            return redirect(url_for('index.index'))
        return f(*args, **kwargs)
    return decorated_function   