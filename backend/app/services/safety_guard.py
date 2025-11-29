import re
import json

class SafetyGuard:
    def __init__(self):
        # Expanded Regex for Medical Emergencies
        # Catches: "chest hurts", "arm is numb", "trouble breathing", "pass out", "dying"
        self.medical_patterns = [
            r"(heart\s*attack|cardiac\s*arrest|stroke)",
            r"(chest\s*(pain|pressure|tightness|discomfort|hurts))",
            r"(can'?t\s*breathe|trouble\s*breathing|shortness\s*of\s*breath|gasping|choking)",
            r"(left\s*arm|jaw|neck|back)\s*(is|feels)?\s*(pain|numb|hurts|tingling)",
            r"(pass\s*out|fainting|lightheaded|dizzy|collapsing)",
            r"(call\s*(911|1122|ambulance|help))",
            r"(dying|death|kill\s*myself|suicide|end\s*it\s*all)"
        ]
        self.compiled_patterns = [re.compile(p, re.IGNORECASE) for p in self.medical_patterns]

    def get_crisis_response(self) -> dict:
        """
        Returns the standard crisis response payload.
        """
        return {
            "isCrisis": True,
            "crisisType": "medical_emergency",
            "message": "⚠️ MEDICAL ALERT DETECTED",
            "immediate_action": {
                "primary_directive": "Stop everything. Sit down comfortably. Loosen tight clothing.",
                "grounding_technique": "Focus on staying conscious. Breathe slowly: Inhale (4s) ... Hold (4s) ... Exhale (4s).",
                "emergency_contacts": [
                    { "name": "Rescue (Ambulance)", "number": "1122", "action": "Call Now" },
                    { "name": "Police", "number": "15", "action": "Backup" }
                ]
            }
        }

    async def validate_input(self, text: str) -> dict:
        """
        Checks input for crisis keywords. Returns structured payload if crisis detected.
        """
        for pattern in self.compiled_patterns:
            if pattern.search(text):
                return self.get_crisis_response()
        
        return {"isCrisis": False}

    async def validate_output(self, text: str) -> bool:
        # Placeholder for output validation
        return True

safety_guard = SafetyGuard()
