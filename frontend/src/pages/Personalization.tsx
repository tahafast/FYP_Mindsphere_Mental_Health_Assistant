import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, BookOpen, Info, Tag, Loader2 } from "lucide-react";
import { uploadKnowledge, UploadStatus, getRecentJournalTags, JournalTagCount } from "@/lib/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

const USER_ID = "user123";
const SETTINGS_KEY = "mindsphere_user_settings";

interface UserSettings {
    allowJournalTraining: boolean;
}

const Personalization = () => {
    const navigate = useNavigate();
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    // Journal opt-in settings
    const [userSettings, setUserSettings] = useState<UserSettings>({
        allowJournalTraining: false
    });

    // Recent journal themes
    const [journalTags, setJournalTags] = useState<JournalTagCount[]>([]);
    const [tagsLoading, setTagsLoading] = useState(true);

    // Load settings from localStorage
    useEffect(() => {
        const stored = localStorage.getItem(SETTINGS_KEY);
        if (stored) {
            try {
                setUserSettings(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to load settings:", e);
            }
        }
    }, []);

    // Load journal tags
    useEffect(() => {
        loadJournalTags();
    }, []);

    const loadJournalTags = async () => {
        setTagsLoading(true);
        try {
            const tags = await getRecentJournalTags(USER_ID, 15);
            setJournalTags(tags);
        } catch (e) {
            console.error("Failed to load journal tags:", e);
        } finally {
            setTagsLoading(false);
        }
    };

    const handleSettingsChange = (key: keyof UserSettings, value: boolean) => {
        const newSettings = { ...userSettings, [key]: value };
        setUserSettings(newSettings);
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
        toast.success("Settings updated");
    };

    const handleTagClick = (tag: string) => {
        // Navigate to journal page with tag filter
        navigate(`/dashboard/journal?tag=${encodeURIComponent(tag)}`);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFileUpload(files[0]);
        }
    };

    const handleFileUpload = async (file: File) => {
        if (!file.name.endsWith('.pdf')) {
            toast.error("Please upload a PDF file");
            return;
        }

        setIsProcessing(true);
        setLogs([]);

        try {
            await uploadKnowledge(file, (status: UploadStatus) => {
                const timestamp = new Date().toLocaleTimeString();
                setLogs(prev => [...prev, `[${timestamp}] ${status.message}`]);
            });

            toast.success("Document processed successfully!");
        } catch (error) {
            toast.error("Failed to process document");
            setLogs(prev => [...prev, "[ERROR] Processing failed. Please try again."]);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <TooltipProvider>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Personalization</h1>
                        <p className="text-muted-foreground mt-1">
                            Customize how MindSphere learns about you
                        </p>
                    </div>
                </div>

                {/* Privacy Settings Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5" />
                            Journal Privacy Settings
                        </CardTitle>
                        <CardDescription>
                            Control how your journal data is used
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                            <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="journal-training" className="font-medium">
                                        Help improve MindSphere
                                    </Label>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <Info className="h-4 w-4 text-muted-foreground" />
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                            <p>
                                                Allow MindSphere to use your journal data to personalize
                                                recommendations and improve the system. This setting applies
                                                to future entries. Your data is never shared externally.
                                            </p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Use journal entries to enhance personalization and AI suggestions
                                </p>
                            </div>
                            <Switch
                                id="journal-training"
                                checked={userSettings.allowJournalTraining}
                                onCheckedChange={(checked) => handleSettingsChange('allowJournalTraining', checked)}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Note: This setting only affects new journal entries. Previously saved entries
                            retain their individual privacy settings.
                        </p>
                    </CardContent>
                </Card>

                {/* Recent Journal Themes Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Tag className="h-5 w-5" />
                            Recent Journal Themes
                        </CardTitle>
                        <CardDescription>
                            Topics and emotions extracted from your journal entries
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {tagsLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : journalTags.length === 0 ? (
                            <div className="text-center py-8">
                                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                                <p className="text-sm text-muted-foreground">
                                    No journal entries yet. Start writing to see your themes appear here.
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-4"
                                    onClick={() => navigate('/dashboard/journal')}
                                >
                                    Go to Journal
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex flex-wrap gap-2">
                                    {journalTags.map(({ tag, count }) => (
                                        <Badge
                                            key={tag}
                                            variant="secondary"
                                            className="cursor-pointer hover:bg-primary/20 transition-colors px-3 py-1"
                                            onClick={() => handleTagClick(tag)}
                                        >
                                            <span className="capitalize">{tag}</span>
                                            <span className="ml-1.5 text-xs opacity-60">({count})</span>
                                        </Badge>
                                    ))}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Click a theme to view related journal entries
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Document Upload Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Knowledge Base Enhancement</CardTitle>
                        <CardDescription>
                            Upload documents to enhance AI responses with personalized context
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Drop Zone */}
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`
                                border-2 border-dashed rounded-lg p-8 text-center transition-all
                                ${isDragging
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-primary/50'
                                }
                            `}
                        >
                            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-sm text-muted-foreground mb-2">
                                Drag and drop a PDF file here, or
                            </p>
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={handleFileSelect}
                                className="hidden"
                                id="file-upload"
                                disabled={isProcessing}
                            />
                            <Button
                                asChild
                                variant="outline"
                                disabled={isProcessing}
                                size="lg"
                            >
                                <label htmlFor="file-upload" className="cursor-pointer">
                                    {isProcessing ? "Processing..." : "Select & Process Document"}
                                </label>
                            </Button>
                        </div>

                        {/* Info */}
                        <div className="bg-muted/50 rounded-lg p-4">
                            <h4 className="font-medium text-sm mb-2">How it works</h4>
                            <ul className="text-xs text-muted-foreground space-y-1">
                                <li>• Upload therapy notes, self-help books, or journal exports</li>
                                <li>• Documents are chunked and embedded for semantic search</li>
                                <li>• AI uses this context to provide more personalized responses</li>
                                <li>• Your documents are stored securely and never shared</li>
                            </ul>
                        </div>
                    </CardContent>
                </Card>

                {/* Status Log */}
                {logs.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Processing Log</CardTitle>
                            <CardDescription>Real-time status of document processing</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-64 w-full rounded-md border border-border bg-slate-950 p-4">
                                <div className="font-mono text-sm space-y-1">
                                    {logs.map((log, index) => (
                                        <div
                                            key={index}
                                            className={`
                                                ${log.includes('success') || log.includes('complete') ? 'text-green-400' : ''}
                                                ${log.includes('ERROR') || log.includes('failed') ? 'text-red-400' : ''}
                                                ${!log.includes('ERROR') && !log.includes('success') && !log.includes('complete') ? 'text-blue-400' : ''}
                                            `}
                                        >
                                            {log}
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                )}
            </div>
        </TooltipProvider>
    );
};

export default Personalization;
