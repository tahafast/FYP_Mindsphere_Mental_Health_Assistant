import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getJournalCalendar, JournalCalendarDay } from "@/lib/api";
import { getTodayISO, isFutureDate } from "@/hooks/useJournal";

const USER_ID = "user123";

interface MiniCalendarProps {
    onDayClick?: (dateIso: string, hasEntry: boolean) => void;
}

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const MOOD_COLORS: Record<string, string> = {
    sad: "bg-blue-400",
    anxious: "bg-amber-400",
    neutral: "bg-gray-400",
    happy: "bg-green-400",
    great: "bg-emerald-500",
};

export function MiniCalendar({ onDayClick }: MiniCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [calendarDays, setCalendarDays] = useState<JournalCalendarDay[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
    const todayIso = getTodayISO();

    // Load calendar data when month changes
    useEffect(() => {
        loadCalendar();
    }, [monthStr]);

    const loadCalendar = async () => {
        setIsLoading(true);
        try {
            const response = await getJournalCalendar(USER_ID, monthStr);
            setCalendarDays(response.days);
        } catch (e) {
            console.error("Failed to load calendar:", e);
        } finally {
            setIsLoading(false);
        }
    };

    const goToPreviousMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    // Get calendar grid data
    const getCalendarGrid = useCallback(() => {
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const startDayOfWeek = firstDayOfMonth.getDay();
        const daysInMonth = lastDayOfMonth.getDate();

        const days: Array<{ day: number | null; dateIso: string | null }> = [];

        // Empty cells before first day
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push({ day: null, dateIso: null });
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dateIso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            days.push({ day, dateIso });
        }

        return days;
    }, [year, month]);

    const getDayEntry = (dateIso: string | null): JournalCalendarDay | undefined => {
        if (!dateIso) return undefined;
        return calendarDays.find(d => d.date_iso === dateIso);
    };

    const isToday = (dateIso: string | null): boolean => {
        if (!dateIso) return false;
        return dateIso === todayIso;
    };

    const handleDayClick = (dateIso: string | null, hasEntry: boolean) => {
        if (!dateIso) return;

        // Don't allow clicking future dates
        if (isFutureDate(dateIso)) {
            return;
        }

        onDayClick?.(dateIso, hasEntry);
    };

    const handleKeyDown = (e: React.KeyboardEvent, dateIso: string | null, hasEntry: boolean) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleDayClick(dateIso, hasEntry);
        }
    };

    const days = getCalendarGrid();
    const monthName = currentDate.toLocaleString("default", { month: "long" });

    return (
        <div
            className="bg-card border border-border rounded-lg p-4"
            role="application"
            aria-label="Journal calendar"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={goToPreviousMonth}
                    aria-label="Previous month"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="font-medium text-sm" aria-live="polite">
                    {monthName} {year}
                </h3>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={goToNextMonth}
                    aria-label="Next month"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-1 mb-2" role="row">
                {DAYS_OF_WEEK.map((day) => (
                    <div
                        key={day}
                        className="text-center text-xs text-muted-foreground font-medium py-1"
                        role="columnheader"
                        aria-label={day === "Su" ? "Sunday" : day === "Mo" ? "Monday" : day === "Tu" ? "Tuesday" : day === "We" ? "Wednesday" : day === "Th" ? "Thursday" : day === "Fr" ? "Friday" : "Saturday"}
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1" role="grid">
                {days.map((item, index) => {
                    const entry = getDayEntry(item.dateIso);
                    const hasEntry = !!entry;
                    const today = isToday(item.dateIso);
                    const isFuture = item.dateIso ? isFutureDate(item.dateIso) : false;

                    // ARIA label for the day
                    let ariaLabel = "";
                    if (item.day && item.dateIso) {
                        const dateObj = new Date(item.dateIso + 'T12:00:00');
                        const formattedDate = dateObj.toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric'
                        });
                        if (isFuture) {
                            ariaLabel = `${formattedDate} — Future date, cannot create journal`;
                        } else if (hasEntry) {
                            ariaLabel = `${formattedDate} — Has journal entry`;
                        } else if (today) {
                            ariaLabel = `${formattedDate} — Today, click to create journal`;
                        } else {
                            ariaLabel = `${formattedDate} — No entry, click to view`;
                        }
                    }

                    return (
                        <button
                            key={index}
                            data-testid={item.dateIso ? `calendar-day-${item.dateIso}` : undefined}
                            onClick={() => handleDayClick(item.dateIso, hasEntry)}
                            onKeyDown={(e) => handleKeyDown(e, item.dateIso, hasEntry)}
                            disabled={!item.day || isFuture}
                            tabIndex={!item.day || isFuture ? -1 : 0}
                            aria-disabled={isFuture ? "true" : undefined}
                            aria-label={ariaLabel}
                            title={isFuture ? "Future date — cannot create journal" : hasEntry ? "View journal entry" : today ? "Create today's journal" : "No entry for this day"}
                            className={`
                                relative aspect-square flex items-center justify-center text-sm rounded-md
                                transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1
                                ${!item.day ? "invisible" : ""}
                                ${today ? "ring-2 ring-primary font-bold text-primary" : ""}
                                ${hasEntry && !today ? "font-medium" : ""}
                                ${isFuture
                                    ? "text-muted-foreground/40 cursor-not-allowed bg-muted/30"
                                    : item.day
                                        ? "hover:bg-accent cursor-pointer"
                                        : ""
                                }
                            `}
                        >
                            {item.day}
                            {/* Entry indicator dot */}
                            {hasEntry && (
                                <span
                                    className={`
                                        absolute bottom-0.5 left-1/2 -translate-x-1/2 
                                        w-1.5 h-1.5 rounded-full
                                        ${entry.mood ? MOOD_COLORS[entry.mood] : "bg-primary"}
                                    `}
                                    aria-hidden="true"
                                />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary" aria-hidden="true" />
                    <span>Has entry</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/40" aria-hidden="true" />
                    <span>Future</span>
                </div>
            </div>
        </div>
    );
}

export default MiniCalendar;
