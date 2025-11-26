import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileText, Clock, Database } from "lucide-react";
import { uploadKnowledge, getKnowledgeStats, UploadStatus } from "@/lib/api";
import { toast } from "sonner";
import MoodTrendChart from "@/components/MoodTrendChart";

const Knowledge = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
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

      await fetchStats();
      toast.success("Document processed successfully!");
    } catch (error) {
      toast.error("Failed to process document");
      setLogs(prev => [...prev, "[ERROR] Processing failed. Please try again."]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] overflow-y-auto bg-background">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Knowledge Base & Insights</h1>
          <p className="text-muted-foreground mt-1">
            Manage resources and track emotional trends
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
    </div>
  );
};

export default Knowledge;
