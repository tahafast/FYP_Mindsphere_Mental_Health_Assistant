import re
import json
import logging
from sentence_transformers import SentenceTransformer, util

# Configure logger
logger = logging.getLogger(__name__)

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
        
        # Initialize semantic model
        logger.info("Loading SentenceTransformer model 'all-MiniLM-L6-v2'...")
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Define crisis prototypes (semantic anchors) - Organized by Risk Clusters
        self.crisis_prototypes = [
            # Cluster 1: Active Immediate Threat
            "I want to die",
            "I am going to kill myself",
            "I have a plan to end my life",
            # Cluster 2: Passive Ideation (The "Disappear" concept)
            "I want to go to sleep and never wake up",
            "I wish I could just disappear",
            "I don't want to exist anymore",
            # Cluster 3: Perceived Burden/Hopelessness
            "The world would be better off without me",
            "I am a burden to everyone",
            "There is no point in going on"
        ]
        
        # Define cluster labels for debugging
        self.cluster_labels = [
            "Active Immediate Threat", "Active Immediate Threat", "Active Immediate Threat",
            "Passive Ideation", "Passive Ideation", "Passive Ideation",
            "Perceived Burden/Hopelessness", "Perceived Burden/Hopelessness", "Perceived Burden/Hopelessness"
        ]
        
        # CRITICAL OPTIMIZATION: Pre-compute embeddings once at startup
        logger.info("Pre-computing crisis prototype embeddings...")
        self.prototype_embeddings = self.model.encode(
            self.crisis_prototypes, 
            convert_to_tensor=True
        )
        logger.info("SafetyGuard initialized with hybrid detection system")

    def get_crisis_response(self, detection_method: str = "regex") -> dict:
        """
        Returns the standard crisis response payload.
        
        Args:
            detection_method: Method used to detect crisis ("regex" or "semantic_model")
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
            },
            "detection_method": detection_method
        }

    async def validate_input(self, text: str) -> dict:
        """
        Hybrid crisis detection: Fast regex first, semantic fallback if needed.
        
        Step 1 (Fast Fail): Check regex patterns for immediate crisis detection
        Step 2 (Semantic Fallback): Use semantic similarity if regex doesn't match
        
        Args:
            text: User input text to validate
            
        Returns:
            dict: Crisis response if detected, otherwise {"isCrisis": False}
        """
        # Step 1: Fast Fail - Regex Pattern Matching
        for pattern in self.compiled_patterns:
            if pattern.search(text):
                logger.warning(f"Regex Crisis Detected: {text[:50]}...")
                return self.get_crisis_response(detection_method="regex")
        
        # Step 2: Semantic Fallback - Only if regex fails
        # Encode the incoming text
        input_embedding = self.model.encode(text, convert_to_tensor=True)
        
        # Calculate cosine similarity with pre-computed prototypes
        similarities = util.cos_sim(input_embedding, self.prototype_embeddings)
        
        # Get maximum similarity score and index
        max_score = similarities.max().item()
        max_index = similarities.argmax().item()
        
        # Threshold check: Lowered to 0.72 to catch passive ideation
        # Reasoning: Passive ideation ("I don't want to exist") is subtler than active threats.
        # A threshold of 0.72 allows catching variations like "I'm tired of being here"
        # which is semantically close to "I wish I could disappear"
        if max_score > 0.72:
            matched_cluster = self.cluster_labels[max_index]
            matched_prototype = self.crisis_prototypes[max_index]
            logger.warning(
                f"Semantic Crisis Detected: Matches '{matched_cluster}' cluster "
                f"(Anchor: '{matched_prototype}', Score: {max_score:.2f}) | Input: {text[:50]}..."
            )
            return self.get_crisis_response(detection_method="semantic_model")
        
        return {"isCrisis": False}

    async def validate_output(self, text: str) -> bool:
        # Placeholder for output validation
        return True

safety_guard = SafetyGuard()
