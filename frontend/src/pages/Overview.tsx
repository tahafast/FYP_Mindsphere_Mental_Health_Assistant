import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Clock, Database } from "lucide-react";
import { getKnowledgeStats } from "@/lib/api";
import MoodTrendChart from "@/components/MoodTrendChart";

const Overview = () => {
    const [stats, setStats] = useState({
        totalDocuments: 0,
        lastUploaded: "Never",
        vectorStatus: "Idle",
    });

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const newStats = await getKnowledgeStats();
            setStats({
                totalDocuments: newStats.totalDocuments,
                lastUploaded: newStats.lastUploaded,
                vectorStatus: newStats.vectorIndexStatus === 'healthy' ? 'Active' : 'Error',
            });
        } catch (error) {
            console.error("Failed to fetch stats", error);
        }
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold text-foreground">Emotional Journey</h1>
                <p className="text-muted-foreground mt-1">
                    Your emotional trends and knowledge base insights
                </p>
            </div>

            {/* Empathy Dashboard (Mood Trend) */}
            <div className="grid grid-cols-1 gap-4">
                <MoodTrendChart />
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            Total Documents
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalDocuments}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary" />
                            Last Uploaded
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.lastUploaded}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Database className="h-4 w-4 text-primary" />
                            Vector Index Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.vectorStatus}</div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Overview;
