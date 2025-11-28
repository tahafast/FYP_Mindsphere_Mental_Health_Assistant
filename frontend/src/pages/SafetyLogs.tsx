import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldCheck, AlertTriangle } from "lucide-react";

export default function SafetyLogs() {
    const logs = [
        { time: "Today, 14:30", trigger: "chest pain", action: "First Responder Protocol", status: "Resolved" },
        { time: "Yesterday, 09:15", trigger: "panic", action: "Grounding Exercise", status: "Resolved" },
        { time: "Nov 26, 22:00", trigger: "hopeless", action: "Empathetic Persona", status: "Monitored" },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-foreground">Safety Audit Log</h2>
                <p className="text-muted-foreground mt-2">Immutable record of safety interventions and crisis protocols.</p>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-green-500" />
                            Intervention History
                        </CardTitle>
                    </div>
                    <CardDescription>List of automated safety triggers activated by user input.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Timestamp</TableHead>
                                <TableHead>Detected Trigger</TableHead>
                                <TableHead>System Action</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.map((log, i) => (
                                <TableRow key={i}>
                                    <TableCell className="font-mono text-xs">{log.time}</TableCell>
                                    <TableCell>
                                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-1 text-xs font-medium text-red-500">
                                            <AlertTriangle className="h-3 w-3" />
                                            {log.trigger}
                                        </span>
                                    </TableCell>
                                    <TableCell>{log.action}</TableCell>
                                    <TableCell className="text-green-500 font-medium">{log.status}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
