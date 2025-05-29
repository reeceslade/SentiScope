from flask import Blueprint, render_template

legal_bp = Blueprint('legal', __name__)

@legal_bp.route("/terms_of_service")
def terms():
    return render_template("terms_of_service.html")

@legal_bp.route("/privacy_policy")
def privacy():
    return render_template("privacy_policy.html")
