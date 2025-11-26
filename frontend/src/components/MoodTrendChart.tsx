import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getMoodHistory, SentimentLog } from '@/lib/api';
import { Loader2 } from 'lucide-react';

const MoodTrendChart = () => {
    const [data, setData] = useState<SentimentLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Hardcoded user_id for prototype
                const history = await getMoodHistory("user123");
                // Sort by timestamp just in case
                const sorted = history.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                setData(sorted);
            } catch (error) {
                console.error("Failed to fetch mood history", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <Card className="h-[400px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </Card>
        );
    }

    // Format data for chart
    const chartData = data.map(item => ({
        ...item,
        date: new Date(item.timestamp).toLocaleDateString(),
        time: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        score: item.sentiment_score
    }));

    return (
        <Card className="col-span-1 md:col-span-3">
            <CardHeader>
                <CardTitle>Longitudinal Emotional Alignment Score (LEAS)</CardTitle>
                <CardDescription>
                    Tracking emotional well-being over time.
                    <span className="text-destructive font-semibold ml-2">--- Clinical Baseline (-0.05)</span>
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    {chartData.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                            No mood data available yet. Start chatting to generate insights.
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis
                                    dataKey="date"
                                    className="text-xs"
                                    tick={{ fill: 'currentColor' }}
                                    tickFormatter={(value) => value}
                                />
                                <YAxis
                                    domain={[-1, 1]}
                                    className="text-xs"
                                    tick={{ fill: 'currentColor' }}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                                    labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                                />
                                <Legend />

                                {/* Clinical Baseline Threshold */}
                                <ReferenceLine y={-0.05} label="Clinical Baseline" stroke="hsl(var(--destructive))" strokeDasharray="3 3" />

                                <Line
                                    type="monotone"
                                    dataKey="score"
                                    stroke="hsl(var(--primary))"
                                    strokeWidth={2}
                                    dot={(props) => {
                                        const { cx, cy, payload } = props;
                                        // Red dot if below baseline
                                        const isBelowBaseline = payload.score < -0.05;
                                        return (
                                            <circle
                                                cx={cx}
                                                cy={cy}
                                                r={4}
                                                fill={isBelowBaseline ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
                                                stroke="none"
                                                key={payload.timestamp}
                                            />
                                        );
                                    }}
                                    activeDot={{ r: 6 }}
                                    name="Sentiment Score"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default MoodTrendChart;
