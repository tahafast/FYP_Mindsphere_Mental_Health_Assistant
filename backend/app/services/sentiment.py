import logging
import math
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification

logger = logging.getLogger(__name__)

class SentimentService:
    def __init__(self):
        self.classifier = None
        # Explicitly define the new model name to prevent confusion
        self.MODEL_NAME = "j-hartmann/emotion-english-distilroberta-base"

    def load_model(self):
        """Loads the J-Hartmann RoBERTa model."""
        if not self.classifier:
            logger.info(f"🔄 Loading NEW Sentiment Model: {self.MODEL_NAME}...")
            try:
                # Load model explicitly to ensure no caching issues
                tokenizer = AutoTokenizer.from_pretrained(self.MODEL_NAME)
                model = AutoModelForSequenceClassification.from_pretrained(self.MODEL_NAME, use_safetensors=True)
                
                self.classifier = pipeline(
                    "text-classification", 
                    model=model,
                    tokenizer=tokenizer,
                    top_k=None # Return all scores for granular analysis
)
                logger.info(f"✅ RoBERTa Sentiment model loaded successfully: {self.MODEL_NAME}")
                logger.info(f"📊 Model has {model.config.num_labels} emotion labels")
            except Exception as e:
                logger.error(f"❌ Failed to load model: {e}")
                raise e

    def _sigmoid(self, x):
        """
        Sigmoid smoothing function.
        Maps input x (0 to 1) to a smooth curve between 0 and 1.
        k controls the steepness.
        """
        k = 10  # Steepness factor
        # Center the sigmoid at 0.5 confidence
        return 1 / (1 + math.exp(-k * (x - 0.5)))

    def _preprocess_text(self, text: str) -> str:
        """
        Preprocess text for better sentiment analysis.
        - Capitalize standalone 'i' pronoun
        - Preserve other formatting
        """
        import re
        # Replace standalone lowercase 'i' with 'I' (word boundary)
        # This handles: "i am", "i'm", "i don't", etc.
        processed = re.sub(r'\bi\b', 'I', text)
        return processed

    def analyze_emotion(self, text: str) -> dict:
        if not self.classifier:
            logger.warning("Sentiment model not loaded. Loading now...")
            self.load_model()

        # Preprocess text (capitalize 'i' pronoun, etc.)
        processed_text = self._preprocess_text(text)

        try:
            results = self.classifier(processed_text)
            predictions = results[0]
            
            # Sort by score to find the dominant emotion
            top_emotion = sorted(predictions, key=lambda x: x['score'], reverse=True)[0]
            label = top_emotion['label']
            confidence = top_emotion['score']

            # --- CONFIDENCE-AWARE DYNAMIC MAPPING ---
            # Labels: anger, disgust, fear, joy, neutral, sadness, surprise
            
            score = 0.0
            
            # Apply Sigmoid Smoothing to the confidence
            smoothed_conf = self._sigmoid(confidence)

            # Check for neutral keywords that should override high-confidence joy
            neutral_keywords = ['just okay', 'just ok', 'stable', 'alright', 'fine', 'okay']
            is_neutral_phrase = any(keyword in processed_text.lower() for keyword in neutral_keywords)
            
            # If it's a "joy" classification but contains neutral keywords, treat as mild positive/neutral
            if label == 'joy' and is_neutral_phrase:
                # Force to neutral-to-mild range regardless of confidence
                score = 0.0 + (smoothed_conf * 0.2)  # Max 0.2
                logger.info(f"  ↳ Neutral keyword detected, capping joy score at {score:.2f}")

            elif label == 'joy':
                # Use confidence thresholds for more nuanced mapping
                if confidence < 0.75:
                    # Low-confidence joy (e.g., "fine", "okay") -> Mild positive
                    # Map to 0.0 to +0.4 range
                    score = 0.0 + (smoothed_conf * 0.4)
                else:
                    # High-confidence joy (e.g., "happy", "great") -> Strong positive
                    # Map to +0.5 to +1.0 range
                    score = 0.5 + ((smoothed_conf - 0.5) * 1.0)
                
            elif label == 'neutral':
                # Strict Baseline
                score = 0.0
                
            elif label == 'surprise':
                # Slightly positive, but keep near neutral
                score = 0.1 if confidence > 0.7 else 0.0
                
            elif label == 'sadness':
                # Use confidence thresholds
                if confidence < 0.75:
                    # Low-confidence sadness -> Mild negative
                    score = -0.0 - (smoothed_conf * 0.3)
                else:
                    # High-confidence sadness -> Strong negative
                    score = -0.3 - ((smoothed_conf - 0.5) * 0.7)
                
            elif label in ['anger', 'fear', 'disgust']:
                # High Distress emotions - always negative, scaled by confidence
                if confidence < 0.75:
                    # Moderate negative
                    score = -0.4 - (smoothed_conf * 0.3)
                else:
                    # High negative
                    score = -0.6 - ((smoothed_conf - 0.5) * 0.8)

            # Cap scores to ensure they stay within -1.0 to +1.0
            score = max(-1.0, min(1.0, score))

            logger.info(f"🧠 Model: {self.MODEL_NAME} | Input: '{text[:50]}...' | Label: {label} | RawConf: {confidence:.2f} | Sigmoid: {smoothed_conf:.2f} | FinalScore: {score:.2f}")

            return {
                "score": round(score, 2),
                "label": label,
                "confidence": round(confidence, 2),
                "smoothed_confidence": round(smoothed_conf, 2)
            }

        except Exception as e:
            logger.error(f"Error analyzing emotion: {e}")
            return {"score": 0.0, "label": "neutral", "confidence": 0.0}

# Global instance
sentiment_service = SentimentService()
