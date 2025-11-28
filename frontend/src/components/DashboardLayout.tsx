import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
    LayoutDashboard,
    UserCog,
    ShieldAlert,
    Lightbulb,
    Menu,
    X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
    children: React.ReactNode;
}

const sidebarItems = [
    { name: "Overview", path: "/dashboard", icon: LayoutDashboard },
    { name: "Personalization", path: "/dashboard/personalization", icon: UserCog },
    { name: "Recommendations", path: "/dashboard/recommendations", icon: Lightbulb },
    { name: "Safety Logs", path: "/dashboard/safety-logs", icon: ShieldAlert },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const location = useLocation();

    const currentPathName = sidebarItems.find(item => item.path === location.pathname)?.name || "Dashboard";

    return (
        <div className="flex min-h-screen bg-background">
            {/* Mobile Toggle */}
            <Button
                variant="ghost"
                size="icon"
                className="fixed top-4 left-4 z-50 md:hidden"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
                {isSidebarOpen ? <X /> : <Menu />}
            </Button>

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-40 w-64 transform border-r border-border bg-card transition-transform duration-200 ease-in-out md:relative md:translate-x-0",
                    !isSidebarOpen && "-translate-x-full"
                )}
            >
                <nav className="flex-1 space-y-1 p-4 pt-6">
                    {sidebarItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                )}
                            >
                                <item.icon className="h-4 w-4" />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Top Header */}
                <header className="flex h-16 items-center justify-between border-b border-border bg-card/50 px-8 backdrop-blur">
                    <h2 className="text-lg font-semibold text-foreground">{currentPathName}</h2>
                </header>

                {/* Page Content */}
                <div className="flex-1 overflow-y-auto p-8">
                    <div className="mx-auto max-w-5xl">{children}</div>
                </div>
            </main>
        </div>
    );
}
