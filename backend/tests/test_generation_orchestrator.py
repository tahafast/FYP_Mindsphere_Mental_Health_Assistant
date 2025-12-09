"""
Unit tests for GenerationOrchestrator intent-first template selection.

Tests the fix for duplicate greeting bug where positive sentiment
was causing greeting template even when Stage A extracted intent=initial_share.
"""

import pytest
from unittest.mock import patch, MagicMock


class TestShouldUseGreetingTemplate:
    """Test intent-first template selection logic."""
    
    @pytest.fixture
    def orchestrator(self):
        """Create orchestrator instance with mocked LLM clients."""
        with patch('app.services.generation_orchestrator.settings') as mock_settings:
            mock_settings.OPENAI_API_KEY = None  # Skip LLM init
            from app.services.generation_orchestrator import GenerationOrchestrator
            return GenerationOrchestrator()
    
    def test_substantive_positive_uses_initial_share(self, orchestrator):
        """
        Long positive message should use therapeutic template, NOT greeting.
        This is the main bug fix test case.
        """
        metadata = {
            "intent_type": "initial_share",
            "emotion_estimate": "positive",
            "short_phrases": ["good day", "work", "lunch with friends", "coffee"]
        }
        user_text = "I had a good day today, went to work, had lunch with friends, went out for coffee, and now im home, feels good."
        
        result = orchestrator._should_use_greeting_template(metadata, user_text)
        assert result == False, "initial_share intent should NOT use greeting template"
    
    def test_short_greeting_intent_uses_greeting(self, orchestrator):
        """Explicit greeting intent should use greeting template."""
        metadata = {
            "intent_type": "greeting",
            "emotion_estimate": "neutral",
            "short_phrases": []
        }
        user_text = "Hey! How are you?"
        
        result = orchestrator._should_use_greeting_template(metadata, user_text)
        assert result == True, "greeting intent should use greeting template"
    
    def test_smalltalk_intent_uses_greeting(self, orchestrator):
        """Smalltalk intent should also use greeting template."""
        metadata = {
            "intent_type": "smalltalk",
            "emotion_estimate": "neutral",
            "short_phrases": []
        }
        user_text = "What's up?"
        
        result = orchestrator._should_use_greeting_template(metadata, user_text)
        assert result == True, "smalltalk intent should use greeting template"
    
    def test_crisis_intent_never_uses_greeting(self, orchestrator):
        """Crisis intent should never use greeting template."""
        metadata = {
            "intent_type": "crisis",
            "emotion_estimate": "sadness",
            "short_phrases": ["self-harm", "hopeless"]
        }
        user_text = "I want to hurt myself"
        
        result = orchestrator._should_use_greeting_template(metadata, user_text)
        assert result == False, "crisis intent should NEVER use greeting template"
    
    def test_follow_up_intent_not_greeting(self, orchestrator):
        """Follow-up intent should not use greeting template."""
        metadata = {
            "intent_type": "follow_up",
            "emotion_estimate": "neutral",
            "short_phrases": ["continuing discussion"]
        }
        user_text = "Yes, and also I was wondering about..."
        
        result = orchestrator._should_use_greeting_template(metadata, user_text)
        assert result == False, "follow_up intent should not use greeting"
    
    def test_question_intent_not_greeting(self, orchestrator):
        """Question intent should not use greeting template."""
        metadata = {
            "intent_type": "question",
            "emotion_estimate": "neutral",
            "short_phrases": ["anxiety", "tips"]
        }
        user_text = "What can I do about my anxiety?"
        
        result = orchestrator._should_use_greeting_template(metadata, user_text)
        assert result == False, "question intent should not use greeting"


class TestIsSubstantive:
    """Test the substantive text detection helper."""
    
    @pytest.fixture
    def orchestrator(self):
        """Create orchestrator instance with mocked LLM clients."""
        with patch('app.services.generation_orchestrator.settings') as mock_settings:
            mock_settings.OPENAI_API_KEY = None
            from app.services.generation_orchestrator import GenerationOrchestrator
            return GenerationOrchestrator()
    
    def test_short_text_not_substantive(self, orchestrator):
        """Short text should not be considered substantive."""
        short_text = "Hey!"
        assert orchestrator._is_substantive(short_text) == False
    
    def test_long_char_count_is_substantive(self, orchestrator):
        """Text over 120 chars should be substantive."""
        long_text = "I had a good day today, went to work, had lunch with friends, went out for coffee, and now I'm home. It feels really good to share this with you."
        assert len(long_text) > 120
        assert orchestrator._is_substantive(long_text) == True
    
    def test_many_words_is_substantive(self, orchestrator):
        """Text with more than 12 words should be substantive."""
        many_words = "one two three four five six seven eight nine ten eleven twelve thirteen"
        assert len(many_words.split()) > 12
        assert orchestrator._is_substantive(many_words) == True
    
    def test_medium_text_not_substantive(self, orchestrator):
        """Medium length text under thresholds is not substantive."""
        medium_text = "I'm having an okay day today"  # 6 words, ~30 chars
        assert orchestrator._is_substantive(medium_text) == False


class TestIntegration:
    """Integration tests - may require mocking MongoDB."""
    
    @pytest.fixture
    def orchestrator(self):
        """Create orchestrator instance with mocked LLM clients."""
        with patch('app.services.generation_orchestrator.settings') as mock_settings:
            mock_settings.OPENAI_API_KEY = None
            from app.services.generation_orchestrator import GenerationOrchestrator
            return GenerationOrchestrator()
    
    def test_positive_substantive_share_full_flow(self, orchestrator):
        """
        End-to-end test: positive substantive share should NOT get greeting.
        This replicates the exact bug scenario from the user's screenshot.
        """
        # Simulate Stage A output (what we saw in the logs)
        stage_a_metadata = {
            "emotion_estimate": "positive",
            "intensity": "medium",
            "intent_type": "initial_share",  # Stage A correctly identified this
            "short_phrases": ["good day", "work", "lunch with friends", "coffee"],
            "safety_flag": False
        }
        user_text = "I had a good day today, went to work, had lunch with friends, went out for coffee, and now im home, feels good"
        
        # The bug was that _should_use_greeting_template returned True here
        # After fix, it should return False
        should_use_greeting = orchestrator._should_use_greeting_template(stage_a_metadata, user_text)
        
        assert should_use_greeting == False, (
            "BUG REGRESSION: Positive substantive share is incorrectly getting greeting template. "
            "Stage A intent=initial_share should override positive emotion."
        )
