import { Info } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface SourceBadgeProps {
    showTooltip?: boolean;
    className?: string;
}

/**
 * SourceBadge - Displays data source attribution for AI-generated content
 * 
 * Shows "Sources: CBT-Bench + proprietary KB" with tooltip for details.
 * Used in Recommendations and Journal summary UI.
 * 
 * License: CBT-Bench is CC-BY-NC-4.0 (non-commercial, attribution required)
 */
export function SourceBadge({ showTooltip = true, className = "" }: SourceBadgeProps) {
    const badgeContent = (
        <span className={`inline-flex items-center gap-1 text-xs text-muted-foreground ${className}`}>
            <Info className="h-3 w-3" />
            <span>Sources: CBT-Bench + proprietary KB</span>
        </span>
    );

    if (!showTooltip) {
        return badgeContent;
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    {badgeContent}
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                    <div className="text-xs space-y-1">
                        <p className="font-medium">Data Sources</p>
                        <ul className="list-disc pl-4 space-y-0.5">
                            <li>
                                <span className="font-medium">CBT-Bench:</span> Evidence-based CBT techniques
                                (CC-BY-NC-4.0)
                            </li>
                            <li>
                                <span className="font-medium">Counsel-Chat:</span> Professional counseling Q&A
                            </li>
                            <li>
                                <span className="font-medium">Proprietary KB:</span> Curated mental health resources
                            </li>
                        </ul>
                        <p className="text-muted-foreground mt-2">
                            Content is used for educational support only. Not medical advice.
                        </p>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
