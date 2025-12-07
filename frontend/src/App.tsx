import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { DashboardLayout } from "@/components/DashboardLayout";
import { TopNav } from "@/components/TopNav";
import Chat from "./pages/Chat";
import Overview from "./pages/Overview";
import Personalization from "./pages/Personalization";
import Recommendations from "./pages/Recommendations";
import SafetyLogs from "./pages/SafetyLogs";
import JournalPage from "./pages/JournalPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <TopNav />
          <div className="pt-16">
            <Routes>
              {/* Chat Route */}
              <Route path="/" element={<Chat />} />

              {/* Dashboard Routes with Layout */}
              <Route path="/dashboard" element={<DashboardLayout><Overview /></DashboardLayout>} />
              <Route path="/dashboard/personalization" element={<DashboardLayout><Personalization /></DashboardLayout>} />
              <Route path="/dashboard/recommendations" element={<DashboardLayout><Recommendations /></DashboardLayout>} />
              <Route path="/dashboard/safety-logs" element={<DashboardLayout><SafetyLogs /></DashboardLayout>} />
              <Route path="/dashboard/journal" element={<DashboardLayout><JournalPage /></DashboardLayout>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
