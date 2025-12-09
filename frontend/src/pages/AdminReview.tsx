import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Star, Check, X, MessageSquare, ThumbsUp, ThumbsDown, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

interface ResponseSample {
    id: string;
    user_input: string;
    response: string;
    persona: string;
    timestamp: string;
    ratings?: {
        empathy: number;
        specificity: number;
        helpfulness: number;
        comments: string;
    };
}

/**
 * Admin Review Page
 * 
 * Allows human raters to review sampled AI responses and rate:
 * - Empathy/Validation (1-5)
 * - Specificity/Personalization (1-5)
 * - Utility/Helpfulness (1-5)
 * 
 * Ratings are stored for downstream analysis and model improvement.
 */
export default function AdminReview() {
    const navigate = useNavigate();
    const [samples, setSamples] = useState<ResponseSample[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [ratings, setRatings] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    // Mock data for demonstration
    useEffect(() => {
        // In production, this would fetch from API
        const mockSamples: ResponseSample[] = [
            {
                id: "sample_001",
                user_input: "I feel completely overwhelmed by work and can't seem to focus on anything.",
                response: `## Performance & Stress

I hear that you're feeling completely overwhelmed by your work, and that you can't seem to focus. That sounds incredibly draining.

**What I'm noticing:**
- The pressure is affecting your ability to concentrate
- You may be experiencing cognitive overload

**Action Steps:**
1. **Right now (2 min):** Close your eyes, take three deep breaths
2. **Today (15 min):** Write down your top 3 priorities
3. **This week:** Block one 90-minute focus session daily

When we're overwhelmed, our brain struggles to prioritize. Breaking tasks into smaller pieces can help restore control.`,
                persona: "therapist",
                timestamp: new Date().toISOString()
            },
            {
                id: "sample_002",
                user_input: "I want to start exercising but I always give up after a few days.",
                response: `## Performance & Stress

I love that you want to start exercising! And you're not alone in giving up after a few days - that's one of the most common challenges.

**What's Working:**
- You have the desire to change - that's step one
- You've tried before, so you know what doesn't work

**Action Steps:**
1. **Today (5 min):** Choose ONE type of movement you actually enjoy
2. **Tomorrow (10 min):** Schedule your first workout like an appointment
3. **This week:** Start with just 10 minutes - so short it feels easy

The secret isn't motivation - it's making it so easy you can't say no! 🚀`,
                persona: "coach",
                timestamp: new Date().toISOString()
            },
            {
                id: "sample_003",
                user_input: "My friends all seem to have their lives together and I feel like such a mess.",
                response: `## Emotional Summary

Okay, real talk - when your friends all seem to have their lives together and you feel like such a mess? That's literally the most relatable thing ever.

**Here's the thing:**
- Nobody has it as together as they seem on the outside
- You're comparing your behind-the-scenes to their highlight reel

**What might help:**
1. **Today:** Text one friend and just say "having a rough day"
2. **This week:** Do ONE thing that makes you feel like you've got it together
3. **Remember:** Progress isn't linear, and everyone's on their own timeline

You're not a mess. You're a human figuring it out. Same as the rest of us. 💙`,
                persona: "friend",
                timestamp: new Date().toISOString()
            }
        ];

        setSamples(mockSamples);
        setLoading(false);

        // Check admin status (would verify JWT in production)
        const adminKey = localStorage.getItem("admin_review_key");
        setIsAdmin(!!adminKey);
    }, []);

    const currentSample = samples[currentIndex];

    const handleRating = (category: string, value: number) => {
        if (!currentSample) return;

        setRatings(prev => ({
            ...prev,
            [currentSample.id]: {
                ...prev[currentSample.id],
                [category]: value
            }
        }));
    };

    const handleComment = (comment: string) => {
        if (!currentSample) return;

        setRatings(prev => ({
            ...prev,
            [currentSample.id]: {
                ...prev[currentSample.id],
                comments: comment
            }
        }));
    };

    const handleSubmit = () => {
        if (!currentSample) return;

        // In production, send to API
        console.log("Submitting rating:", {
            sampleId: currentSample.id,
            ...ratings[currentSample.id]
        });

        // Move to next
        if (currentIndex < samples.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const StarRating = ({
        category,
        label
    }: {
        category: string;
        label: string;
    }) => {
        const currentRating = ratings[currentSample?.id]?.[category] || 0;

        return (
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">{label}</label>
                <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            onClick={() => handleRating(category, star)}
                            className="p-1 hover:scale-110 transition-transform"
                        >
                            <Star
                                className={`h-6 w-6 ${star <= currentRating
                                        ? "fill-yellow-400 text-yellow-400"
                                        : "text-gray-600"
                                    }`}
                            />
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-8">
                <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
                <h1 className="text-xl font-bold text-white mb-2">Admin Access Required</h1>
                <p className="text-gray-400 text-center mb-6">
                    This page is for authorized reviewers only.
                </p>
                <input
                    type="password"
                    placeholder="Enter admin key"
                    className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white mb-4"
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            localStorage.setItem("admin_review_key", (e.target as HTMLInputElement).value);
                            setIsAdmin(true);
                        }
                    }}
                />
                <button
                    onClick={() => navigate("/")}
                    className="text-purple-400 hover:text-purple-300"
                >
                    Return to Home
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 p-8">
            {/* Header */}
            <div className="max-w-4xl mx-auto mb-8">
                <button
                    onClick={() => navigate("/")}
                    className="flex items-center gap-2 text-gray-400 hover:text-white mb-4"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Dashboard
                </button>

                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Response Review</h1>
                        <p className="text-gray-400">
                            Rate AI responses for quality improvement
                        </p>
                    </div>
                    <div className="text-sm text-gray-500">
                        {currentIndex + 1} / {samples.length} samples
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="max-w-4xl mx-auto mb-6">
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${((currentIndex + 1) / samples.length) * 100}%` }}
                    />
                </div>
            </div>

            {/* Main Content */}
            {currentSample && (
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* User Input */}
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <div className="flex items-center gap-2 mb-3 text-gray-400">
                            <MessageSquare className="h-4 w-4" />
                            <span className="text-sm font-medium">User Message</span>
                        </div>
                        <p className="text-white">{currentSample.user_input}</p>
                    </div>

                    {/* AI Response */}
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 text-gray-400">
                                <span className="text-sm font-medium">AI Response</span>
                                <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/20 text-purple-300 capitalize">
                                    {currentSample.persona}
                                </span>
                            </div>
                        </div>
                        <div className="prose prose-invert max-w-none">
                            <pre className="whitespace-pre-wrap font-sans text-white text-sm">
                                {currentSample.response}
                            </pre>
                        </div>
                    </div>

                    {/* Rating Form */}
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 space-y-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Rate this response</h3>

                        <div className="grid grid-cols-3 gap-6">
                            <StarRating category="empathy" label="Empathy / Validation" />
                            <StarRating category="specificity" label="Specificity / Personalization" />
                            <StarRating category="helpfulness" label="Utility / Helpfulness" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">
                                Additional Comments (optional)
                            </label>
                            <textarea
                                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 resize-none"
                                rows={3}
                                placeholder="Any feedback for improving this response..."
                                value={ratings[currentSample.id]?.comments || ""}
                                onChange={(e) => handleComment(e.target.value)}
                            />
                        </div>

                        {/* Quick Actions */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                            <div className="flex gap-4">
                                <button
                                    onClick={() => handleRating("quick_good", 1)}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30"
                                >
                                    <ThumbsUp className="h-4 w-4" />
                                    Good Response
                                </button>
                                <button
                                    onClick={() => handleRating("quick_bad", 1)}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                                >
                                    <ThumbsDown className="h-4 w-4" />
                                    Needs Improvement
                                </button>
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={!ratings[currentSample.id]?.empathy || !ratings[currentSample.id]?.specificity || !ratings[currentSample.id]?.helpfulness}
                                className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Check className="h-4 w-4" />
                                Submit & Next
                            </button>
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex justify-between text-sm">
                        <button
                            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                            disabled={currentIndex === 0}
                            className="text-gray-400 hover:text-white disabled:opacity-50"
                        >
                            ← Previous
                        </button>
                        <button
                            onClick={() => setCurrentIndex(Math.min(samples.length - 1, currentIndex + 1))}
                            disabled={currentIndex === samples.length - 1}
                            className="text-gray-400 hover:text-white disabled:opacity-50"
                        >
                            Next →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
