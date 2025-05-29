import requests
import json
from typing import Dict, Generator, Optional
import logging
import os
from dotenv import load_dotenv
from sentiment_analyzer import BaseSentimentAnalyzer

load_dotenv()

# API Configuration
NEWS_API_KEY = os.getenv("NEWS_API_KEY")
NEWS_API_URL = "https://newsapi.org/v2/everything"

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class NewsSentimentAnalyzer(BaseSentimentAnalyzer):
    def __init__(self):
        super().__init__()
        
    def _get_from_cache(self, article_id: int, model: str):
        """Get cached result if valid and matches current model"""
        if article_id in self.cache:
            cached = self.cache[article_id]
            if isinstance(cached, dict) and cached.get('model') == model:
                return cached
        return None

    def _add_to_cache(self, article_id: int, result: Dict, model: str):
        """Add result to cache with model info"""
        result['model'] = model
        self.cache[article_id] = result

    def get_news_results(
        self,
        query: str,
        source: Optional[str],
        num_articles: int,
        sort_by: str,
        country: Optional[str],
        category: str = "online news",
        model: str = "gemma3:1b"
    ) -> Generator[Dict, None, None]:
        """Fetch news articles from NewsAPI ensuring query is in the title."""
        params = {
            "q": query,
            "sources": source,
            "pageSize": 100,  # Always fetch maximum results to handle filtering
            "sortBy": sort_by,
            "apiKey": NEWS_API_KEY,
            "language": "en",
        }
        try:
            logger.info(f"Sending request to NewsAPI: {json.dumps({k: v for k, v in params.items() if k != 'apiKey'})}")
            response = requests.get(NEWS_API_URL, params=params, timeout=10)
            
            if response.status_code == 429:
                error_msg = "API quota exceeded: NewsAPI request limit reached (429)."
                logger.warning(f"Rate limit hit: {response.text}")
                yield {"error": error_msg}
                return

            elif response.status_code == 200:
                articles = response.json().get("articles", [])
                
                # Initialize counters for logging
                total_results = len(articles)
                filtered_count = 0
                included_count = 0
                duplicate_count = 0
                
                # Process query terms for improved title matching
                query_terms = self._prepare_query_terms(query)
                
                logger.info(f"NewsAPI returned {total_results} total results for query: '{query}'")
                logger.info("Filtering to only include articles with query in title")
                
                for article in articles:
                    if included_count >= num_articles:
                        break

                    article_id = hash(article["url"])
                    title = article.get("title", "")
                    description = article.get("description", "")
                    source_name = article.get("source", {}).get("name", "Unknown")
                    published_at = article.get("publishedAt", "")

                    title_normalized = self._normalize_text(title)

                    if not self._title_matches_query(title_normalized, query_terms):
                        filtered_count += 1
                        logger.debug(f"Filtered out: '{title}' from {source_name} (query not in title)")
                        continue

                    included_count += 1
                    logger.info(f"Including article {included_count}: '{title}' from {source_name}")

                    # Check if in cache first
                    if article_id in self.cache:
                        result = self._get_from_cache(article_id, model)
                        if result:
                            is_duplicate = self._is_duplicate_entry(title, source_name, model)
                            if is_duplicate:
                                duplicate_count += 1
                                logger.debug(f"Found duplicate (from cache): '{title}' from {source_name}")
                            else:
                                self._save_to_database(query, category, title, 
                                                       result["sentiment"], source_name, model)
                                self._add_to_existing_entries(title, source_name, model)
                                
                            yield result
                            continue

                    # Not in cache, analyze sentiment
                    try:
                        sentiment = self._analyze_sentiment(title, model)
                    except Exception as e:
                        logger.error(f"Sentiment analysis error: {e}")
                        sentiment = 'unknown'

                    result = {
                        "id": article_id,
                        "title": title,
                        "description": description,
                        "url": article["url"],
                        "source": source_name,
                        "publishedAt": published_at,
                        "sentiment": sentiment,
                        "explanation": None
                    }

                    self._add_to_cache(article_id, result, model)
                    
                    # Check for duplicate entry (same title + source combination)
                    is_duplicate = self._is_duplicate_entry(title, source_name, model)
                    if is_duplicate:
                        duplicate_count += 1
                        logger.debug(f"Found duplicate: '{title}' from {source_name} (not saving to database)")
                    else:
                        # Save to database
                        self._save_to_database(query, category, title, sentiment, source_name, model)
                        self._add_to_existing_entries(title, source_name, model)
                    
                    yield result

                # Final summary log
                logger.info(f"Summary: Requested {num_articles} articles, API returned {total_results}, filtered out {filtered_count}, included {included_count}, skipped saving {duplicate_count} duplicates to database")
                
                if included_count == 0:
                    yield {"error": f"No articles found with your query '{query}'. Please try different keywords."}
                
            else:
                error_msg = f"NewsAPI request failed: {response.status_code} - {response.text}"
                logger.error(error_msg)
                yield {"error": error_msg}
                
        except Exception as e:
            error_msg = f"NewsAPI error: {str(e)}"
            logger.error(error_msg)
            yield {"error": error_msg}

    def get_sentiment_explanation(
        self,
        article_id: int,
        text: str,
        model: str = "gemma3:1b"
    ):
        """Get detailed sentiment explanation."""
        try:
            # Check cache first
            if article_id in self.cache and self.cache[article_id]["explanation"]:
                return (
                    self.cache[article_id]["sentiment"],
                    self.cache[article_id]["explanation"]
                )

            # Get sentiment and explanation in one call
            sentiment, explanation = self._analyze_sentiment_with_explanation(text, model)
            
            # Update cache if article exists
            if article_id in self.cache:
                self.cache[article_id]["sentiment"] = sentiment
                self.cache[article_id]["explanation"] = explanation
            
            return sentiment, explanation
        except Exception as e:
            logger.error(f"Explanation error: {str(e)}")
            return "error", f"Failed to get explanation: {str(e)}"