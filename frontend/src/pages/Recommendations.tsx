import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Loader2,
    Sparkles,
    Activity,
    Lightbulb,
    AlertCircle,
    TrendingUp,
    TrendingDown,
    Minus,
    RefreshCw,
    Sun,
    Moon,
    Cloud,
    CloudRain,
    Zap
} from "lucide-react";
import { getDailyRecommendation, DailyRecommendation, StatusLabel } from "@/lib/api";

// ============================================================================
// Deterministic Fallback Templates
// ============================================================================

const FALLBACK_TEMPLATES: Record<StatusLabel, { summary: string; suggestion: string }> = {
    Calm: {
        summary: "Your emotional landscape has shown remarkable steadiness over the past few days. There's a sense of groundedness in your reflections, with moments of genuine contentment surfacing through your conversations.",
        suggestion: "Channel this calm energy into something creative or meaningful to you — perhaps journaling about what's been working well."
    },
    Stable: {
        summary: "You've been navigating your days with a balanced emotional rhythm. While there may have been small fluctuations, your overall trajectory suggests resilience and emotional awareness.",
        suggestion: "Consider a brief gratitude reflection this evening to reinforce this positive momentum."
    },
    Mixed: {
        summary: "Your emotional journey has shown some variability — moments of clarity interspersed with periods of uncertainty. This isn't unusual; it often reflects active processing of life's complexities.",
        suggestion: "Try a 5-minute grounding exercise when you notice emotional shifts — it can help anchor you during transitions."
    },
    Elevated: {
        summary: "There's been a noticeable undercurrent of tension in your recent reflections. You may be carrying some weight that hasn't fully surfaced yet, or processing something that requires more time.",
        suggestion: "Consider taking a short break from screens this afternoon — even 10 minutes of quiet can help reset your nervous system."
    },
    Anxious: {
        summary: "The past few days have felt heavier than usual. There's a sense of emotional strain in your conversations, possibly linked to recurring thoughts or external pressures that haven't fully resolved.",
        suggestion: "Be gentle with yourself today. Try a box-breathing exercise (4-4-4-4) and consider reaching out to someone you trust."
    }
};

// ============================================================================
// Status Styling
// ============================================================================

const getStatusStyles = (status: StatusLabel) => {
    switch (status) {
        case "Calm":
            return {
                bg: "bg-emerald-500/10",
                border: "border-emerald-500/30",
                text: "text-emerald-400",
                icon: Sun,
                gradient: "from-emerald-500/20 to-teal-500/10"
            };
        case "Stable":
            return {
                bg: "bg-blue-500/10",
                border: "border-blue-500/30",
                text: "text-blue-400",
                icon: Cloud,
                gradient: "from-blue-500/20 to-cyan-500/10"
            };
        case "Mixed":
            return {
                bg: "bg-slate-500/10",
                border: "border-slate-500/30",
                text: "text-slate-400",
                icon: Minus,
                gradient: "from-slate-500/20 to-gray-500/10"
            };
        case "Elevated":
            return {
                bg: "bg-amber-500/10",
                border: "border-amber-500/30",
                text: "text-amber-400",
                icon: Zap,
                gradient: "from-amber-500/20 to-orange-500/10"
            };
        case "Anxious":
            return {
                bg: "bg-rose-500/10",
                border: "border-rose-500/30",
                text: "text-rose-400",
                icon: CloudRain,
                gradient: "from-rose-500/20 to-red-500/10"
            };
        default:
            return {
                bg: "bg-slate-500/10",
                border: "border-slate-500/30",
                text: "text-slate-400",
                icon: Minus,
                gradient: "from-slate-500/20 to-gray-500/10"
            };
    }
};

const getScoreColor = (score: number): string => {
    if (score > 0.6) return "text-emerald-400";
    if (score > 0.15) return "text-blue-400";
    if (score > -0.14) return "text-slate-400";
    if (score > -0.60) return "text-amber-400";
    return "text-rose-400";
};

const getScoreIcon = (score: number) => {
    if (score > 0.15) return TrendingUp;
    if (score > -0.15) return Minus;
    return TrendingDown;
};

// ============================================================================
// Component
// ============================================================================

export default function Recommendations() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [recommendation, setRecommendation] = useState<DailyRecommendation | null>(null);

    // User ID (hardcoded for prototype, consistent with other pages)
    const userId = "user123";

    // Get user timezone for accurate date calculation
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const fetchRecommendation = async (forceRefresh = false) => {
        if (forceRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        setError(null);

        try {
            const data = await getDailyRecommendation(userId, 3, userTimezone, forceRefresh);
            setRecommendation(data);
        } catch (err) {
            console.error("Failed to fetch recommendation:", err);
            setError("Unable to load personalized recommendations. Showing general guidance.");

            // Set fallback data
            const now = new Date();
            const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });
            const monthDay = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

            setRecommendation({
                daily_digest_title: `Daily Digest • ${weekday}, ${monthDay}`,
                emotional_summary: FALLBACK_TEMPLATES.Mixed.summary,
                suggestion_for_today: FALLBACK_TEMPLATES.Mixed.suggestion,
                average_leas_score: 0,
                status_label: "Mixed",
                trend_points: []
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchRecommendation();
    }, [userId, userTimezone]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <div className="relative">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-amber-400 animate-pulse" />
                </div>
                <p className="text-muted-foreground animate-pulse">Analyzing your emotional patterns...</p>
                <p className="text-xs text-muted-foreground/60">This may take a moment</p>
            </div>
        );
    }

    // Use recommendation data or fallback
    const data = recommendation!;
    const statusStyles = getStatusStyles(data.status_label);
    const StatusIcon = statusStyles.icon;
    const dayCount = data.trend_points?.length || 0;

    return (
        <div className="space-y-6 max-w-4xl mx-auto" data-testid="recommendations-page">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">
                        MindSphere Recommendations
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        AI-driven insights based on your daily interactions
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchRecommendation(true)}
                    disabled={refreshing}
                    className="gap-2"
                >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-500">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">{error}</span>
                </div>
            )}

            {/* Main Summary Card */}
            <Card
                className={`border-primary/20 bg-gradient-to-br ${statusStyles.gradient} backdrop-blur-sm`}
                data-testid="recommendation-summary-card"
            >
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                            <CardTitle className="text-xl">{data.daily_digest_title}</CardTitle>
                        </div>
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${statusStyles.bg} ${statusStyles.text} ${statusStyles.border} border`}>
                            <StatusIcon className="h-3.5 w-3.5" />
                            {data.status_label}
                        </div>
                    </div>
                    <CardDescription>
                        Generated by analyzing your recent conversation patterns
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    {/* Emotional Summary */}
                    <div
                        className="p-5 bg-background/60 rounded-xl border border-border/50"
                        data-testid="recommendation-summary-text"
                    >
                        <p className="text-base leading-relaxed text-foreground/90">
                            {data.emotional_summary}
                        </p>
                    </div>

                    {/* Suggestion */}
                    <div
                        className="flex items-start gap-4 p-5 bg-primary/5 rounded-xl border-l-4 border-primary"
                        data-testid="recommendation-action-text"
                    >
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Lightbulb className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-semibold text-foreground mb-1">Suggestion for Today</h4>
                            <p className="text-muted-foreground leading-relaxed">
                                {data.suggestion_for_today}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Clinical Status Card */}
                <Card data-testid="recommendation-metrics-card">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Activity className="h-4 w-4 text-muted-foreground" />
                            Emotional Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Average Score</span>
                            <span
                                className={`text-2xl font-bold ${getScoreColor(data.average_leas_score)}`}
                                data-testid="recommendation-avg-leas"
                            >
                                {data.average_leas_score.toFixed(2)}
                            </span>
                        </div>

                        {/* Score Bar */}
                        <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
                            {/* Center marker */}
                            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-muted-foreground/30 z-10" />
                            {/* Score indicator */}
                            <div
                                className={`absolute top-0 bottom-0 transition-all duration-500 ${data.average_leas_score >= 0
                                        ? 'left-1/2 bg-gradient-to-r from-slate-500 to-emerald-500'
                                        : 'right-1/2 bg-gradient-to-l from-slate-500 to-rose-500'
                                    }`}
                                style={{
                                    width: `${Math.min(50, Math.abs(data.average_leas_score) * 50)}%`
                                }}
                            />
                        </div>

                        {/* Labels */}
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Anxious</span>
                            <span>Neutral</span>
                            <span>Calm</span>
                        </div>

                        {/* Status Badge */}
                        <div className="pt-2 border-t border-border/50">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Current Status</span>
                                <span
                                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${statusStyles.bg} ${statusStyles.text} ${statusStyles.border} border`}
                                    data-testid="recommendation-category"
                                >
                                    <StatusIcon className="h-3.5 w-3.5" />
                                    {data.status_label}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Trend Points Card */}
                <Card data-testid="recommendation-days-card">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            Trend Points ({dayCount} day{dayCount !== 1 ? 's' : ''})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {dayCount > 0 ? (
                            <div className="space-y-3">
                                {data.trend_points.map((point, idx) => {
                                    const ScoreIcon = getScoreIcon(point.score);
                                    const isToday = idx === 0;
                                    return (
                                        <div
                                            key={point.date}
                                            className={`flex items-center justify-between p-3 rounded-lg transition-colors ${isToday ? 'bg-primary/5 border border-primary/20' : 'bg-muted/30'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <ScoreIcon className={`h-4 w-4 ${getScoreColor(point.score)}`} />
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        {new Date(point.date).toLocaleDateString('en-US', {
                                                            weekday: 'short',
                                                            month: 'short',
                                                            day: 'numeric'
                                                        })}
                                                    </p>
                                                    {isToday && (
                                                        <p className="text-xs text-primary">Today</p>
                                                    )}
                                                </div>
                                            </div>
                                            <span className={`text-lg font-semibold ${getScoreColor(point.score)}`}>
                                                {point.score.toFixed(2)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <Moon className="h-8 w-8 text-muted-foreground/30 mb-2" />
                                <p className="text-sm text-muted-foreground">
                                    No trend data available yet.
                                </p>
                                <p className="text-xs text-muted-foreground/60 mt-1">
                                    Start a conversation to generate insights.
                                </p>
                            </div>
                        )}

                        {dayCount > 0 && dayCount < 3 && (
                            <p className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border/50">
                                <AlertCircle className="h-3 w-3 inline mr-1" />
                                Limited data available. Insights will improve with more conversations.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
