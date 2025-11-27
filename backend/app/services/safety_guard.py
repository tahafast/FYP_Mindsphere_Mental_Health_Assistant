import re
import json

class SafetyGuard:
    def __init__(self):
        self.medical_emergency_regex = re.compile(
            r'(heart attack|chest pain|can\'t breathe|dying|chest pressure|numb arm|left arm pain|choking)', 
            re.IGNORECASE
        )

    async def validate_input(self, text: str) -> dict:
        """
        Checks for safety violations or emergency triggers.
        Returns a dict. If 'isCrisis' is True, the flow should be interrupted.
        """
        if self.medical_emergency_regex.search(text):
            return {
                "isCrisis": True,
                "crisisType": "medical_emergency",
                "message": "I am detecting signs of a potential medical emergency. I am an AI, not a doctor, but I can help you stay calm while you get help.",
                "immediate_action": {
                    "primary_directive": "Sit down comfortably on the floor and lean against a wall/chair. Loosen any tight clothing.",
                    "grounding_technique": "Breathe with me: Inhale slowly for 4 seconds... Hold for 4... Exhale for 4. Focus only on your breath.",
                    "emergency_contacts": [
                        { "name": "Rescue / Ambulance", "number": "1122", "action": "Call Immediately" },
                        { "name": "Police / Madadgar", "number": "15", "action": "Backup" }
                    ]
                }
            }
        return {"isCrisis": False}

    async def validate_output(self, text: str) -> bool:
        # Placeholder for output validation
        return True

safety_guard = SafetyGuard()
