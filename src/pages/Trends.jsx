import TodayUFCard from "../components/TodayUFCard";
import DailyUFSummary from "../components/DailyUFSummary";
import UFTrendChart from "../components/UFTrendChart";
import UFWeeklyAvgCard from "../components/UFWeeklyAvgCard";
import MobileNav from "../components/MobileNav";

import "../styles/Trends.css";

export default function Trends() {
    return (
        <div className="dashboard-container page-padding-bottom">

            <h2 className="dashboard-title">UF Trends</h2>

            <TodayUFCard />
            <UFWeeklyAvgCard />

            <DailyUFSummary />

            <UFTrendChart />
            <br /><br /><br /><br />
            <MobileNav />
        </div>
    );
}
