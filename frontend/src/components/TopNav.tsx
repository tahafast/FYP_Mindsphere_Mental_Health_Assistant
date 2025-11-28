import { Brain, Moon, Sun, LayoutDashboard, MessageSquare } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";

export function TopNav() {
  const { theme, setTheme } = useTheme();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border bg-card shadow-sm">
      <div className="flex items-center justify-between h-full px-6">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <Brain className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground tracking-tight">MindSphere</h1>
        </div>

        {/* Center Nav */}
        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
          <NavLink
            to="/"
            className="flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium text-muted-foreground transition-all hover:text-foreground data-[active=true]:bg-background data-[active=true]:text-foreground data-[active=true]:shadow-sm"
            activeClassName="data-[active=true]"
          >
            <MessageSquare className="h-4 w-4" />
            Chat
          </NavLink>
          <NavLink
            to="/dashboard"
            className="flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium text-muted-foreground transition-all hover:text-foreground data-[active=true]:bg-background data-[active=true]:text-foreground data-[active=true]:shadow-sm"
            activeClassName="data-[active=true]"
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </NavLink>
        </div>

        {/* Right Actions */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        >
          {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </Button>
      </div>
    </nav>
  );
}
