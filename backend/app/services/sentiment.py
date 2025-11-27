import logging
from transformers import pipeline
from functools import lru_cache

logger = logging.getLogger(__name__)

class SentimentService:
    def __init__(self):
        self.classifier = None

    def load_model(self):
        """
        Loads the emotion classification model. 
        Should be called at application startup.
        """
        if not self.classifier:
            logger.info("Loading sentiment analysis model...")
            try:
                # Using a distilled BERT model fine-tuned for emotion detection
                self.classifier = pipeline(
                    "text-classification", 
                    model="bhadresh-savani/distilbert-base-uncased-emotion", 
                    top_k=None # Return all scores to analyze confidence
                )
                logger.info("Sentiment model loaded successfully.")
            except Exception as e:
                logger.error(f"Failed to load sentiment model: {e}")
                raise e

    def analyze_emotion(self, text: str) -> dict:
        """
        Analyzes the emotion of the given text and maps it to a LEAS score.
        Returns a dictionary with 'score' and 'label'.
        """
        if not self.classifier:
            logger.warning("Sentiment model not loaded. Attempting to load now (this may slow down the request).")
            self.load_model()

        try:
            # Run classification
            results = self.classifier(text)
            # results is a list of lists (batch size 1), e.g., [[{'label': 'joy', 'score': 0.9}, ...]]
            predictions = results[0]
            
            # Sort by score descending to get the top emotion
            top_emotion = sorted(predictions, key=lambda x: x['score'], reverse=True)[0]
            label = top_emotion['label']
            confidence = top_emotion['score']

            # Map to LEAS Score
            score = 0.0
            
            if label in ['joy', 'love']:
                # Positive: +0.5 to +1.0
                score = 0.5 + (confidence * 0.5)
            elif label == 'surprise':
                # Neutral-ish: 0.0 (or slightly positive/negative depending on context, keeping 0.0 for simplicity)
                score = 0.0
            elif label == 'sadness':
                # Negative: -0.1 to -0.5
                score = -0.1 - (confidence * 0.4)
            elif label in ['fear', 'anger']:
                # Distressed: -0.6 to -1.0
                score = -0.6 - (confidence * 0.4)

            return {
                "score": round(score, 2),
                "label": label,
                "confidence": round(confidence, 2)
            }

        except Exception as e:
            logger.error(f"Error analyzing emotion: {e}")
            # Fallback to neutral
            return {"score": 0.0, "label": "neutral", "confidence": 0.0}

# Global instance
sentiment_service = SentimentService()
