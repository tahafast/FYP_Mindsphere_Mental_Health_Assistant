import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.services.sentiment import sentiment_service
from app.services.safety_guard import safety_guard

async def test_sentiment():
    print("\n--- Testing Sentiment Service ---")
    sentiment_service.load_model()
    
    cases = [
        ("I am so happy and excited!", "joy"),
        ("I feel so sad and lonely.", "sadness"),
        ("I am furious about this!", "anger"),
        ("I am terrified.", "fear"),
    ]
    
    for text, expected in cases:
        result = sentiment_service.analyze_emotion(text)
        print(f"Input: '{text}'")
        print(f"Result: {result}")
        if result['label'] == expected:
            print("PASS")
        else:
            print(f"FAIL (Expected {expected})")

async def test_safety():
    print("\n--- Testing Safety Guard ---")
    
    cases = [
        ("I am having a heart attack", True),
        ("I feel a bit anxious", False),
        ("I can't breathe", True),
        ("Hello there", False),
        ("I want to kill myself", True),
        ("I am having a panic attack", True)
    ]
    
    for text, expected_crisis in cases:
        result = await safety_guard.validate_input(text)
        is_crisis = result.get("isCrisis", False)
        print(f"Input: '{text}'")
        print(f"Is Crisis: {is_crisis}")
        if is_crisis == expected_crisis:
            print("PASS")
        else:
            print(f"FAIL (Expected {expected_crisis})")

async def main():
    await test_sentiment()
    await test_safety()

if __name__ == "__main__":
    asyncio.run(main())
