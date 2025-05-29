import logging
import requests
import re
import os
import hashlib
from typing import Tuple, Set
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# API Configuration
OLLAMA_API_URL = os.getenv("OLLAMA_API_URL", "http://localhost:11434/api/chat")

# Database configuration
SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
SQLALCHEMY_TRACK_MODIFICATIONS = False

# Create SQLAlchemy models
Base = declarative_base()

class SentimentResult(Base):
    __tablename__ = 'sentiment_results'
    
    id = Column(Integer, primary_key=True)
    query = Column(String)
    category = Column(String)
    title = Column(String)
    sentiment = Column(String)
    source = Column(String)
    model = Column(String)
    
    def __repr__(self):
        return f"<SentimentResult(title='{self.title}', sentiment='{self.sentiment}')>"

class BaseSentimentAnalyzer:
    def __init__(self):
        self.cache = {}
        self.timeout = 300  # Increased timeout for Ollama requests
        
        # Setup database connection
        self.engine = create_engine(SQLALCHEMY_DATABASE_URI)
        Base.metadata.create_all(self.engine)
        
        # Create session factory
        Session = sessionmaker(bind=self.engine)
        self.session = Session()
        
        # Load existing title+source combinations from DB to avoid duplicates
        self.existing_entries = self._load_existing_entries()
        
    def __del__(self):
        """Close the session when the object is deleted"""
        if hasattr(self, 'session'):
            self.session.close()
    
    def _load_existing_entries(self) -> Set[str]:
        """Load existing title+source combinations from database to prevent duplicates."""
        existing_entries = set()
        
        try:
            # Query all title+source combinations
            results = self.session.query(SentimentResult.title, SentimentResult.source).all()
            
            for title, source in results:
                if title and source:
                    entry_key = f"{title.strip()}|{source.strip()}"
                    entry_hash = hashlib.md5(entry_key.encode('utf-8')).hexdigest()
                    existing_entries.add(entry_hash)
            
                
        except Exception as e:
            logger.error(f"Error loading existing entries: {e}")
                
        return existing_entries

    def _is_duplicate_entry(self, title: str, source: str, model: str) -> bool:
        """Check if a title+source+model combination already exists."""
        entry_key = f"{title.strip()}|{source.strip()}|{model.strip()}"
        entry_hash = hashlib.md5(entry_key.encode('utf-8')).hexdigest()
        return entry_hash in self.existing_entries

    def _add_to_existing_entries(self, title: str, source: str, model: str):
        """Add a title+source+model combination to the set of existing entries."""
        entry_key = f"{title.strip()}|{source.strip()}|{model.strip()}"
        entry_hash = hashlib.md5(entry_key.encode('utf-8')).hexdigest()
        self.existing_entries.add(entry_hash)
    
    def _save_to_database(self, query, category, title, sentiment, source, model):
        """Save a sentiment result to the database."""
        try:
            new_result = SentimentResult(
                query=query,
                category=category,
                title=title,
                sentiment=sentiment,
                source=source,
                model=model
            )
            
            self.session.add(new_result)
            self.session.commit()
        except Exception as e:
            self.session.rollback()
            logger.error(f"Error saving to database: {str(e)}")
    
    def _prepare_query_terms(self, query: str) -> list:
        """Prepare query terms for matching by normalizing and splitting."""
        # Split by spaces and convert to lowercase
        query_lower = query.lower()
        # Remove common punctuation from query
        query_clean = re.sub(r'[^\w\s]', '', query_lower)
        # Split into individual terms
        return query_clean.split()
    
    def _normalize_text(self, text: str) -> str:
        """Remove punctuation and convert text to lowercase for better matching."""
        # Convert to lowercase and remove punctuation
        text_lower = text.lower()
        return re.sub(r'[^\w\s]', '', text_lower)

    def _title_matches_query(self, normalized_title: str, query_terms: list) -> bool:
        """Check if any query term is contained in the title."""
        for term in query_terms:
            if term and re.search(rf'\b{term}', normalized_title) or re.search(rf'{term}', normalized_title):
                return True
        return False
    
    def _analyze_sentiment(self, text: str, model: str) -> str:
        """Basic sentiment analysis with caching."""
        cache_key = f"{model}:{text.strip()}"
        if cache_key in self.cache:
            logger.info(f"Cache hit for sentiment: {cache_key}")
            return self.cache[cache_key]

        payload = {
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": "Perform sentiment analysis. Respond ONLY with 'positive', 'negative', or 'neutral'."
                },
                {
                    "role": "user",
                    "content": f"Analyze sentiment: '{text}'\nRespond with one word: positive, negative, or neutral."
                }
            ],
            "stream": False,
        }

        sentiment = self._call_ollama(payload, basic=True)
        self.cache[cache_key] = sentiment
        return sentiment

    def _analyze_sentiment_with_explanation(self, text: str, model: str) -> Tuple[str, str]:
        """Analyze sentiment and provide explanation for the result."""
        cache_key = f"{model}:{text.strip()}_with_explanation"
        if cache_key in self.cache:
            logger.info(f"Cache hit for explanation: {cache_key}")
            return self.cache[cache_key]

        sentiment = self._analyze_sentiment(text, model)
        
        explanation_payload = {
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": f"You are performing sentiment analysis. The sentiment of the following text has been determined to be '{sentiment}'. "
                            f"Please explain why you assigned the sentiment to be '{sentiment}' in one concise sentence."
                },
                {
                    "role": "user",
                    "content": f"Text: '{text}'\nExplain why this is {sentiment}:"
                }
            ],
            "stream": False,
        }

        try:
            response = requests.post(
                OLLAMA_API_URL,
                json=explanation_payload,
                timeout=self.timeout
            )

            if response.status_code == 200:
                explanation = response.json().get("message", {}).get("content", "").strip()
                self.cache[cache_key] = (sentiment, explanation)
                return sentiment, explanation
            else:
                return sentiment, f"Unable to generate explanation: {response.text}"

        except Exception as e:
            return sentiment, f"Explanation error: {str(e)}"

    def _call_ollama(self, payload: dict, basic: bool = False):
        """Generic Ollama API caller with improved error handling."""
        try:
            # Send the request to Ollama API
            response = requests.post(
                OLLAMA_API_URL,
                json=payload,
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                content = response.json().get("message", {}).get("content", "").strip()

                if basic:
                    # Extract the first word and ensure it's a valid sentiment
                    sentiment = content.split()[0].lower().rstrip('.,!?;:')
                    return sentiment if sentiment in ["positive", "negative", "neutral"] else "unknown"
                else:
                    # Split into sentiment and explanation
                    parts = content.split(maxsplit=1)
                    if not parts:
                        return "unknown", "No analysis available"
                    
                    sentiment = parts[0].lower().rstrip('.,!?;:')
                    if sentiment not in ["positive", "negative", "neutral"]:
                        sentiment = "unknown"
                    
                    explanation = parts[1] if len(parts) > 1 else "No explanation provided"
                    return sentiment, explanation
            else:
                error_msg = f"Ollama API error: {response.status_code} - {response.text}"
                logger.error(error_msg)
                return ("error", error_msg) if not basic else "error"
                
        except requests.exceptions.Timeout:
            error_msg = "Ollama request timed out"
            logger.error(error_msg)
            return ("error", error_msg) if not basic else "error"
        except Exception as e:
            error_msg = f"Ollama connection error: {str(e)}"
            logger.error(error_msg)
            return ("error", error_msg) if not basic else "error"