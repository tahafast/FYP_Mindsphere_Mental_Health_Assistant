import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserInsights, getMoodHistory, getWeeklyStats, UserInsights, SentimentLog, WeeklyStats } from "@/lib/api";
import { TrendingUp, Loader2 } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

const USER_ID = "user123";

export function InsightsSnapshot() {
    const [insights, setInsights] = useState<UserInsights | null>(null);
    const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
    const [sparklineData, setSparklineData] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInsights();
    }, []);

    const fetchInsights = async () => {
        try {
            const [insightsData, moodHistory, stats] = await Promise.all([
                getUserInsights(USER_ID),
                getMoodHistory(USER_ID),
                getWeeklyStats(USER_ID)
            ]);

            setInsights(insightsData);
            setWeeklyStats(stats);

            // Get last 7 days of sentiment scores for sparkline
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);

            const recentScores = moodHistory
                .filter(log => new Date(log.timestamp) >= weekAgo)
                .map(log => log.sentiment_score);

            setSparklineData(recentScores);
        } catch (error) {
            console.error("Failed to fetch insights", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </CardContent>
            </Card>
        );
    }

    const chartData = sparklineData.map((score, idx) => ({ value: score, index: idx }));

    return (
        <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Weekly Insights
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                    {/* Sparkline */}
                    <div className="md:col-span-1">
                        <p className="text-xs text-muted-foreground mb-2">Mood Trend (7 days)</p>
                        {sparklineData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={60}>
                                <LineChart data={chartData}>
                                    <Line
                                        type="monotone"
                                        dataKey="value"
                                        stroke="hsl(var(--primary))"
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-sm text-muted-foreground">No data yet</p>
                        )}
                    </div>

                    {/* Interpretation */}
                    <div className="md:col-span-2">
                        <p className="text-xs text-muted-foreground mb-2">Interpretation</p>
                        <p className="text-sm leading-relaxed">
                            {insights?.interpretation || "Start chatting to generate insights."}
                        </p>
                        <div className="flex gap-4 mt-4">
                            <div>
                                <p className="text-2xl font-bold text-primary">
                                    {weeklyStats?.check_ins ?? <Loader2 className="h-6 w-6 animate-spin inline" />}
                                </p>
                                <p className="text-xs text-muted-foreground">Check-ins</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-primary">
                                    {weeklyStats?.exercises ?? <Loader2 className="h-6 w-6 animate-spin inline" />}
                                </p>
                                <p className="text-xs text-muted-foreground">Exercises</p>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
