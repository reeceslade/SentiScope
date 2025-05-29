from flask import Blueprint, render_template, request, redirect, url_for
from flask_login import login_user, logout_user, current_user, login_required
import os
import json
import requests
from oauthlib.oauth2 import WebApplicationClient
from dotenv import load_dotenv
load_dotenv()

os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

# Try both import styles to handle different run contexts
try:
    from models import User
except ImportError:
    from models import User

# Create blueprint
auth_bp = Blueprint('auth', __name__)

# Google OAuth Setup
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
GOOGLE_DISCOVERY_URL = "https://accounts.google.com/.well-known/openid-configuration"
client = WebApplicationClient(GOOGLE_CLIENT_ID)

@auth_bp.route("/login")
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index.index'))

    google_provider_cfg = requests.get(GOOGLE_DISCOVERY_URL).json()

    # Dynamically determine redirect URI
    base_url = request.host_url.rstrip("/")  # e.g. http://localhost:5000 or http://127.0.0.1:5000
    redirect_uri = f"{base_url}/login/callback"

    # Prepare request URI for Google Auth
    request_uri = client.prepare_request_uri(
        google_provider_cfg["authorization_endpoint"],
        redirect_uri=redirect_uri,
        scope=["openid", "email", "profile"],
        prompt="consent select_account"
    )
    return redirect(request_uri)


@auth_bp.route("/login/callback")
def callback():
    error = request.args.get("error")
    if error:
        return redirect(url_for("index.index"))

    code = request.args.get("code")
    google_cfg = requests.get(GOOGLE_DISCOVERY_URL).json()

    base_url = request.host_url.rstrip("/")
    redirect_uri = f"{base_url}/login/callback"

    token_url, headers, body = client.prepare_token_request(
        google_cfg["token_endpoint"],
        authorization_response=request.url,
        redirect_url=redirect_uri,
        code=code
    )
    token_response = requests.post(token_url, headers=headers, data=body, auth=(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET))
    print(f"Token response: {token_response.json()}")
    client.parse_request_body_response(json.dumps(token_response.json()))

    uri, headers, _ = client.add_token(google_cfg["userinfo_endpoint"])
    userinfo_response = requests.get(uri, headers=headers)
    print(f"User info response: {userinfo_response.json()}")
    userinfo = userinfo_response.json()

    if not userinfo.get("email_verified"):
        return "User email not available or not verified by Google.", 400

    admin_emails = os.environ.get("ADMIN_EMAILS", "").split(",")


    is_admin = userinfo["email"] in admin_emails  # Check if the user's email is in the admin list

    # Create or fetch the user
    user = User(
        id=userinfo["sub"],
        name=userinfo["given_name"],
        email=userinfo["email"],
        profile_pic=userinfo["picture"],
        is_admin=is_admin
    )

    # Get existing user or create new one
    existing_user = User.get(userinfo["sub"])
    if not existing_user:
        # Create new user with admin status
        user = User.create(userinfo["sub"], userinfo["given_name"], userinfo["email"], userinfo["picture"], is_admin)
    else:
        # Update existing user (including admin status)
        existing_user.name = userinfo["given_name"]
        existing_user.profile_pic = userinfo["picture"]
        existing_user.is_admin = is_admin
        from app import db
        db.session.commit()
        user = existing_user

    login_user(user)
    return redirect(url_for("index.index"))

@auth_bp.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for("index.index")) 