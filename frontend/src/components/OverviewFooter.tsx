import { Settings, Shield, Download, Mail } from "lucide-react";

export function OverviewFooter() {
    return (
        <footer className="mt-8 pt-6 border-t border-border">
            <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
                <button
                    className="flex items-center gap-2 hover:text-foreground transition-colors duration-200"
                    disabled
                    title="Coming soon"
                >
                    <Settings className="h-4 w-4" />
                    Settings
                </button>
                <button
                    className="flex items-center gap-2 hover:text-foreground transition-colors duration-200"
                    disabled
                    title="Coming soon"
                >
                    <Shield className="h-4 w-4" />
                    Data & Privacy
                </button>
                <button
                    className="flex items-center gap-2 hover:text-foreground transition-colors duration-200"
                    disabled
                    title="Coming soon"
                >
                    <Download className="h-4 w-4" />
                    Export Data
                </button>
                <button
                    className="flex items-center gap-2 hover:text-foreground transition-colors duration-200"
                    disabled
                    title="Coming soon"
                >
                    <Mail className="h-4 w-4" />
                    Contact Support
                </button>
            </div>
            <p className="text-center text-xs text-muted-foreground/60 mt-4">
                MindSphere is an AI assistant, not a licensed therapist. For emergencies, call 911 or 988.
            </p>
        </footer>
    );
}
