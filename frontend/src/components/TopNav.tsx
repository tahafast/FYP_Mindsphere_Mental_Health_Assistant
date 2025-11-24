import { Brain, Moon, Sun } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";

export function TopNav() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border bg-card shadow-sm">
      <div className="flex items-center justify-between h-full px-4">
        {/* Left: Brand */}
        <div className="flex items-center gap-2">
          <Brain className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">MindEase</h1>
        </div>

        {/* Center: Navigation Links */}
        <div className="flex items-center gap-1">
          <NavLink
            to="/"
            className="px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            activeClassName="text-foreground bg-accent"
          >
            Chat
          </NavLink>
          <NavLink
            to="/knowledge"
            className="px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            activeClassName="text-foreground bg-accent"
          >
            Knowledge Base
          </NavLink>
        </div>

        {/* Right: Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === "light" ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
        </Button>
      </div>
    </nav>
  );
}
