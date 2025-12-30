import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

import TodayUFCard from "../components/TodayUFCard";
import DailyUFSummary from "../components/DailyUFSummary";
import UFWeeklyAvgCard from "../components/UFWeeklyAvgCard";
import UFTrendChart from "../components/UFTrendChart";
import MobileNav from "../components/MobileNav";
import ChatAssistant from "../components/ChatAssistant";

import "../styles/DashboardUI.css";

export default function Dashboard() {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);

    const headerRef = useRef(null);
    const ufCardRef = useRef(null);
    const summaryRef = useRef(null);
    const chartRef = useRef(null);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/login");
    };

    useEffect(() => {
        async function loadProfile() {
            const { data: user } = await supabase.auth.getUser();
            if (!user?.user) return;

            const { data: patient } = await supabase
                .from("patients")
                .select("*")
                .eq("auth_id", user.user.id)
                .single();

            setProfile(patient);
        }

        loadProfile();
    }, []);

    if (!profile) return <p>Loading...</p>;

    return (
        <div className="dashboard-page">
            <div className="dashboard-container page-padding-bottom">

                {/* HEADER */}
                <div ref={headerRef} className="dashboard-header">
                    <div>
                        <h2 className="dash-title">Welcome, {profile.username}</h2>
                        <p className="dashboard-subtitle">
                            Hospital ID: {profile.hospital_id}
                        </p>
                    </div>

                    <button className="logout-btn" onClick={handleLogout}>
                        Logout
                    </button>
                </div>

                {/* TODAY UF */}
                <div ref={ufCardRef}>
                    <TodayUFCard />
                </div>

                <hr />
                <div ref={ufCardRef}>
                    <UFWeeklyAvgCard />
                </div>

                {/* EXCHANGES */}
                <div ref={summaryRef}>
                    <DailyUFSummary />
                </div>

                {/* TREND */}
                <div ref={chartRef} className="uf-chart-container">
                    <UFTrendChart />
                </div>

            </div>

            <ChatAssistant />
            <MobileNav />
        </div>
    );
}
