import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload } from "lucide-react";
import { uploadKnowledge, UploadStatus } from "@/lib/api";
import { toast } from "sonner";

const Personalization = () => {
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

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
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold text-foreground">Make MindSphere know you better</h1>
                <p className="text-muted-foreground mt-1">
                    Upload documents to personalize your experience
                </p>
            </div>

            {/* Upload Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Upload Knowledge</CardTitle>
                    <CardDescription>
                        Upload PDF files containing mental health information and resources
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Drag & Drop Zone */}
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`
              border-2 border-dashed rounded-lg p-12 text-center transition-colors
              ${isDragging
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50 hover:bg-accent/50'
                            }
              ${isProcessing ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
            `}
                    >
                        <input
                            type="file"
                            accept=".pdf"
                            onChange={handleFileSelect}
                            className="hidden"
                            id="file-upload"
                            disabled={isProcessing}
                        />
                        <label htmlFor="file-upload" className="cursor-pointer">
                            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                            <p className="text-lg font-medium text-foreground mb-2">
                                Drop your PDF here or click to browse
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Supports PDF files up to 50MB
                            </p>
                        </label>
                    </div>

                    {/* Process Button */}
                    <Button
                        onClick={() => document.getElementById('file-upload')?.click()}
                        disabled={isProcessing}
                        className="w-full bg-primary hover:bg-primary-hover"
                        size="lg"
                    >
                        {isProcessing ? "Processing..." : "Select & Process Document"}
                    </Button>
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
    );
};

export default Personalization;
