from flask import Blueprint, render_template, request, jsonify, Response, stream_with_context
import json
from flask_login import current_user

# Try both import styles to handle different run contexts
try:
    from news_source_helper import NewsSentimentAnalyzer
    from video_source_helper import YouTubeSentimentAnalyzer
except ImportError:
    from news_source_helper import NewsSentimentAnalyzer
    from video_source_helper import YouTubeSentimentAnalyzer

# Create blueprint
index_bp = Blueprint('index', __name__)

# Initialize analyzers
news_analyzer = NewsSentimentAnalyzer()
video_analyzer = YouTubeSentimentAnalyzer()

# Helper function
def generate_safe_id(url):
    """Generate a safe ID from a URL for use in the frontend."""
    import hashlib
    return hashlib.md5(url.encode()).hexdigest()

@index_bp.route("/")
def index():
    if current_user.is_authenticated:
        return render_template("index.html", user=current_user)
    return render_template("login.html", user=current_user)


@index_bp.route('/search')
def search():
    data = json.loads(request.args.get('data'))
    category = data.get('category', 'online_news')

    if category == 'online_news':
        results = news_analyzer.get_news_results(
            query=data['query'],
            source=data.get('source'),
            num_articles=int(data.get('num_articles', 10)),
            sort_by=data.get('sort_by', 'popularity'),
            country=data.get('country'),
            model=data.get('model', 'gemma3:1b')
        )
    elif category == 'online_videos':
        results = video_analyzer.get_video_results(
            query=data['query'],
            platform=data.get('platform', 'youtube'),
            num_videos=int(data.get('num_videos', 10)),
            sort_by=data.get('video_sort', 'viewCount'),
            country=data.get('country', 'us'),
            channel=data.get('channel'),
            model=data.get('model', 'gemma3:1b')
        )
    else:
        return jsonify({"error": f"Unsupported category: {category}"}), 400

    @stream_with_context
    def generate():
        for result in results:
            if 'id' not in result:
                result['id'] = generate_safe_id(result.get('url', ''))
            yield f"data: {json.dumps(result)}\n\n"

    return Response(generate(), mimetype='text/event-stream')

@index_bp.route('/get-explanation/<string:id>')
def get_explanation(id):
    text = request.args.get('text')
    model = request.args.get('model')
    source_type = request.args.get('source_type', 'news')

    if not text or not model:
        return jsonify({"error": "Missing required parameters"}), 400

    try:
        analyzer = video_analyzer if source_type == 'video' else news_analyzer
        sentiment, explanation = analyzer.get_sentiment_explanation(id, text, model)
        return jsonify({
            "sentiment": sentiment, 
            "explanation": explanation,
            "model": model  
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500