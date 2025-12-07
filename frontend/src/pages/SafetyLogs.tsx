import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldCheck, AlertTriangle, Loader2, CheckCircle, Eye, AlertOctagon, Heart } from "lucide-react";
import { getSafetyLogs, SafetyEvent, SafetyStatus } from "@/lib/api";

// ============================================================================
// Utilities
// ============================================================================

/**
 * Format timestamp to relative format:
 * - Today: "Today, HH:mm"
 * - Yesterday: "Yesterday, HH:mm"  
 * - Else: "Nov 29, 22:00"
 */
function formatTimestamp(isoString: string): string {
    const date = new Date(isoString);
    const now = new Date();

    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeStr = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });

    if (isToday) {
        return `Today, ${timeStr}`;
    } else if (isYesterday) {
        return `Yesterday, ${timeStr}`;
    } else {
        const monthDay = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
        return `${monthDay}, ${timeStr}`;
    }
}

/**
 * Get status badge styling based on status
 */
function getStatusBadge(status: SafetyStatus) {
    switch (status) {
        case "Resolved":
            return {
                bg: "bg-emerald-500/10",
                text: "text-emerald-500",
                border: "border-emerald-500/30",
                icon: CheckCircle
            };
        case "Monitored":
            return {
                bg: "bg-blue-500/10",
                text: "text-blue-500",
                border: "border-blue-500/30",
                icon: Eye
            };
        case "Escalated":
            return {
                bg: "bg-red-500/10",
                text: "text-red-500",
                border: "border-red-500/30",
                icon: AlertOctagon
            };
        default:
            return {
                bg: "bg-slate-500/10",
                text: "text-slate-500",
                border: "border-slate-500/30",
                icon: Eye
            };
    }
}

// ============================================================================
// Component
// ============================================================================

export default function SafetyLogs() {
    const [logs, setLogs] = useState<SafetyEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await getSafetyLogs();
                setLogs(data);
            } catch (err) {
                console.error("Failed to fetch safety logs:", err);
                setError("Unable to load safety logs. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, []);

    return (
        <div className="space-y-6" data-testid="safety-logs-page">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-foreground">
                    Safety Audit Log
                </h2>
                <p className="text-muted-foreground mt-2 max-w-2xl">
                    MindSphere quietly watches over your wellbeing.
                    Here is a secure, immutable record of safety interventions during your conversations.
                </p>
            </div>

            {/* Main Card */}
            <Card className="shadow-md rounded-xl bg-[#0E1625] border-border/50">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                            Intervention History
                        </CardTitle>
                    </div>
                    <CardDescription>
                        List of automated safety triggers activated by user input.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-muted-foreground text-sm">Loading safety logs...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                            <AlertTriangle className="h-8 w-8 text-amber-500" />
                            <p className="text-muted-foreground">{error}</p>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                            <Heart className="h-12 w-12 text-emerald-500/50" />
                            <div>
                                <p className="text-foreground font-medium">No interventions recorded</p>
                                <p className="text-muted-foreground text-sm mt-2 max-w-md">
                                    If no recent interventions were needed, that's a good sign.
                                    Stay safe, and remember we're always here if you ever feel overwhelmed.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[180px]">Timestamp</TableHead>
                                        <TableHead>Trigger</TableHead>
                                        <TableHead>Action Taken</TableHead>
                                        <TableHead className="text-right">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.map((log) => {
                                        const statusBadge = getStatusBadge(log.status);
                                        const StatusIcon = statusBadge.icon;

                                        return (
                                            <TableRow key={log.id} data-testid="safety-log-row">
                                                <TableCell className="font-mono text-xs text-muted-foreground">
                                                    {formatTimestamp(log.timestamp)}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400 border border-red-500/20">
                                                        <AlertTriangle className="h-3 w-3" />
                                                        {log.detected_trigger}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {log.system_action}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}>
                                                        <StatusIcon className="h-3 w-3" />
                                                        {log.status}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
