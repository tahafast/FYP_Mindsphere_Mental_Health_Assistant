import { HeroGreeting } from "@/components/HeroGreeting";
import { QuickSnapshots } from "@/components/QuickSnapshots";
import { RecentConversations } from "@/components/RecentConversations";
import { InsightsSnapshot } from "@/components/InsightsSnapshot";
import MoodTrendChart from "@/components/MoodTrendChart";
import { SuggestionCard } from "@/components/SuggestionCard";
import { OverviewFooter } from "@/components/OverviewFooter";

const Overview = () => {
    return (
        <div className="space-y-6 pb-8">
            {/* 1. Hero Greeting Card */}
            <HeroGreeting />

            {/* 2. Quick Snapshot Cards */}
            <QuickSnapshots />

            {/* 3. Recent Conversations */}
            <RecentConversations />

            {/* 4. Insights Snapshot */}
            <InsightsSnapshot />

            {/* 5. LEAS/Sentiment Graph (moved lower) */}
            <MoodTrendChart />

            {/* 6. Suggestion/Quote Card */}
            <SuggestionCard />

            {/* 7. Footer */}
            <OverviewFooter />
        </div>
    );
};

export default Overview;
