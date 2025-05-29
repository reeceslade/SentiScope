import requests
import json
from typing import Dict, Generator, Optional, Tuple
import logging
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
from sentiment_analyzer import BaseSentimentAnalyzer

load_dotenv()

# API Configuration
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3"

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class YouTubeSentimentAnalyzer(BaseSentimentAnalyzer):
    def __init__(self):
        super().__init__()
        self.cache_expiry = timedelta(hours=1)  # Cache expiration time
    
    def _get_from_cache(self, video_id: str, model: str):
        """Get result from cache if it exists, is valid, and matches the current model."""
        if video_id in self.cache:
            cache_entry = self.cache[video_id]
            if isinstance(cache_entry, dict) and 'timestamp' in cache_entry:
                if (datetime.now() - cache_entry['timestamp'] < self.cache_expiry and 
                    cache_entry['data'].get('model') == model):
                    return cache_entry['data']
                del self.cache[video_id]
        return None

    def _add_to_cache(self, video_id: str, result: Dict, model: str):
        """Store result in cache with timestamp for expiration tracking."""
        result['model'] = model  # Store model with cached result
        self.cache[video_id] = {
            'data': result,
            'timestamp': datetime.now()
        }

    def get_video_results(
        self,
        query: str,
        platform: Optional[str] = "youtube",
        num_videos: int = 10,
        sort_by: str = "relevance",  # Unused but kept for interface consistency
        country: Optional[str] = "us",
        channel: Optional[str] = None,
        category: str = "online videos",
        model: str = "gemma3:1b",
        max_days_old: Optional[int] = 30
    ) -> Generator[Dict, None, None]:
        """Fetch recent videos from YouTube API with query in title."""
        try:
            # Prepare API request parameters
            params = {
                "part": "snippet",
                "q": query,
                "type": "video",
                "maxResults": min(num_videos * 3, 50),  # Get extra for filtering
                "key": YOUTUBE_API_KEY,
                "regionCode": country,
                "order": "date",  # Most recent first
                "relevanceLanguage": "en"
            }

            if channel:
                params["channelId"] = channel
            
            if max_days_old:
                published_after = (datetime.now() - timedelta(days=max_days_old)).isoformat() + "Z"
                params["publishedAfter"] = published_after

            logger.info(f"Fetching YouTube videos for: '{query}'")
            response = requests.get(
                f"{YOUTUBE_API_URL}/search",
                params=params,
                timeout=15
            )

            # Handle API response
            if response.status_code != 200:
                error = response.json().get('error', {})
                logger.error(f"YouTube API error: {error.get('code', '')} - {error.get('message', 'Unknown error')}")
                yield {"error": f"YouTube API error: {error.get('message', 'Please try again later')}"}
                return

            search_results = response.json()
            items = search_results.get("items", [])
            
            if not items:
                logger.warning(f"No videos found for query: '{query}'")
                yield {
                    "error": f"No recent videos found for '{query}'. Try different keywords or news sources."
                }
                return

            # Validate and filter items
            valid_items = []
            for item in items:
                if not isinstance(item, dict):
                    continue
                if not item.get("id", {}).get("videoId"):
                    continue
                if not item.get("snippet"):
                    continue
                valid_items.append(item)

            if not valid_items:
                logger.error("No valid video items in API response")
                yield {
                    "error": f"Found videos for '{query}' but couldn't process them. Please try again."
                }
                return

            # Get additional video details
            video_ids = [item["id"]["videoId"] for item in valid_items]
            video_details = self._get_video_details(video_ids)

            # Process videos
            query_terms = self._prepare_query_terms(query)
            included_count = 0
            duplicate_count = 0

            for item in valid_items:
                if included_count >= num_videos:
                    break

                video_id = item["id"]["videoId"]
                title = item["snippet"]["title"]
                channel_name = item["snippet"]["channelTitle"]

                # Skip if query not in title
                if not self._title_matches_query(self._normalize_text(title), query_terms):
                    continue

                cached_result = self._get_from_cache(video_id, model)
                if cached_result:
                    if not self._is_duplicate_entry(title, channel_name, model):
                        self._save_to_database(query, category, title, 
                                               cached_result["sentiment"], channel_name, model)
                        self._add_to_existing_entries(title, channel_name, model)
                    yield cached_result
                    included_count += 1
                    continue

                # Process new video
                details = video_details.get(video_id, {})
                sentiment = self._analyze_sentiment(title, model)
                
                result = self._create_video_result(
                    item, 
                    details, 
                    sentiment, 
                    None  # Explanation can be added later
                )
                
                self._add_to_cache(video_id, result, model)
                
                if not self._is_duplicate_entry(title, channel_name, model):
                    self._save_to_database(query, category, title, sentiment, channel_name, model)
                    self._add_to_existing_entries(title, channel_name, model)
                
                yield result
                included_count += 1

            # Final logging
            logger.info(f"Returned {included_count} videos for '{query}'")
            if included_count == 0:
                yield {
                    "error": f"Found videos for '{query}' but none matched all filters. Try different search terms."
                }

        except requests.exceptions.RequestException as e:
            logger.error(f"YouTube API request failed: {str(e)}")
            yield {"error": f"Network error: Please check your connection and try again."}
        except Exception as e:
            logger.error(f"Unexpected error in get_video_results: {str(e)}")
            yield {"error": f"An unexpected error occurred: {str(e)}"}

    def _get_video_details(self, video_ids: list) -> Dict:
        """Get video statistics with improved error handling."""
        if not video_ids:
            logger.warning("No video IDs provided to _get_video_details")
            return {}
            
        try:
            # Validate video IDs format
            valid_ids = [vid for vid in video_ids if isinstance(vid, str) and vid.strip()]
            if len(valid_ids) != len(video_ids):
                logger.warning(f"Filtered out {len(video_ids) - len(valid_ids)} invalid video IDs")
            
            if not valid_ids:
                logger.error("No valid video IDs to process")
                return {}
                
            # YouTube API allows up to 50 IDs per request
            ids_str = ",".join(valid_ids[:50])
            
            params = {
                "part": "statistics",
                "id": ids_str,
                "key": YOUTUBE_API_KEY
            }
            
            response = requests.get(f"{YOUTUBE_API_URL}/videos", params=params, timeout=10)
            
            if response.status_code == 200:
                details = {}
                items = response.json().get("items", [])
                
                if not items:
                    logger.warning(f"No video details returned for IDs: {video_ids[:3]}...")
                
                for item in items:
                    video_id = item["id"]
                    statistics = item.get("statistics", {})
                    details[video_id] = {
                        "viewCount": statistics.get("viewCount", "0"),
                        "likeCount": statistics.get("likeCount", "0"),
                        "commentCount": statistics.get("commentCount", "0")
                    }
                    
                # Log how many details were successfully retrieved
                logger.info(f"Retrieved details for {len(details)} out of {len(video_ids)} requested videos")
                return details
            else:
                logger.error(f"Failed to get video details: {response.status_code} - {response.text}")
                return {}
                
        except Exception as e:
            logger.error(f"Error in _get_video_details: {str(e)}")
            return {}

    def _create_video_result(self, item: Dict, details: Dict, sentiment: str, explanation: str) -> Dict:
        """Standardize video result format."""
        return {
            "id": item["id"]["videoId"],
            "title": item["snippet"]["title"],
            "description": item["snippet"]["description"],
            "thumbnail": item["snippet"]["thumbnails"]["high"]["url"],
            "channel": item["snippet"]["channelTitle"],
            "publishedAt": item["snippet"]["publishedAt"],
            "viewCount": details.get("viewCount", "N/A"),
            "likeCount": details.get("likeCount", "N/A"),
            "commentCount": details.get("commentCount", "N/A"),
            "url": f"https://youtube.com/watch?v={item['id']['videoId']}",
            "sentiment": sentiment,
            "explanation": explanation,
            "source": "youtube"
        }
            
    def get_sentiment_explanation(
        self,
        video_id: str,
        text: str,
        model: str = "gemma3:1b"
    ) -> Tuple[str, str]:
        """Get detailed sentiment explanation for video titles."""
        try:
            # Check cache first
            cached_result = self._get_from_cache(video_id, model)
            if cached_result and cached_result.get("explanation"):
                return cached_result["sentiment"], cached_result["explanation"]
                
            # Get fresh analysis if not in cache
            sentiment, explanation = self._analyze_sentiment_with_explanation(text, model)
            
            # Update cache if video exists
            if video_id in self.cache:
                if isinstance(self.cache[video_id], dict) and 'data' in self.cache[video_id]:
                    self.cache[video_id]['data'].update({
                        "sentiment": sentiment,
                        "explanation": explanation
                    })
                else:
                    # Handle the case where it's directly in cache
                    self.cache[video_id].update({
                        "sentiment": sentiment,
                        "explanation": explanation
                    })
            
            return sentiment, explanation
            
        except Exception as e:
            logger.error(f"Explanation error: {str(e)}")
            return "error", f"Failed to get explanation: {str(e)}"