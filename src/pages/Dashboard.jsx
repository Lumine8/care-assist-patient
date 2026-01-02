import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";

// Icons
import {
    MdWaterDrop,
    MdMonitorWeight,
    MdTimeline,
    MdPerson,
    MdBloodtype,
    MdHistory,
    MdSettingsPower,
    MdNotificationsNone
} from "react-icons/md";

// Components
import TodayUFCard from "../components/TodayUFCard";
import DailyUFSummary from "../components/DailyUFSummary";
import UFTrendChart from "../components/UFTrendChart";
import MobileNav from "../components/MobileNav";
import ChatAssistant from "../components/ChatAssistant";

import "../styles/DashboardUI.css";

export default function Dashboard() {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const containerRef = useRef(null);

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
            setLoading(false);
        }
        loadProfile();
    }, []);

    // Animation on load
    useEffect(() => {
        if (!loading) {
            gsap.fromTo(containerRef.current,
                { opacity: 0, y: 15 },
                { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }
            );
        }
    }, [loading]);

    if (loading) return <div className="loading-screen">Loading...</div>;

    // Get first name safely
    const firstName = profile?.username?.split(" ")[0] || "Patient";

    return (
        <div className="dashboard-page">

            {/* TOP BAR */}
            <header className="dash-header">
                <div className="user-info">
                    <h1>Hello, {firstName}</h1>
                    {/* <span className="date-badge">Hospital ID: {profile?.hospital_id}</span> */}
                    <span className="date-badge">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' })}
                    </span>
                </div>
                <div className="header-actions">
                    <button className="icon-btn" onClick={() => alert("No new notifications")}>
                        <MdNotificationsNone />
                    </button>
                    <button className="icon-btn logout" onClick={handleLogout}>
                        <MdSettingsPower />
                    </button>
                </div>
            </header>

            <div ref={containerRef} className="dashboard-content page-padding-bottom">

                {/* 1. HERO STAT CARD (Replaces simple text) */}
                <section className="hero-section">
                    <div className="section-label">Current Status</div>
                    <TodayUFCard />
                </section>

                {/* 2. QUICK ACTION TILES */}
                <section className="actions-section">
                    <div className="section-label">Quick Actions</div>
                    <div className="tiles-grid">
                        {/* DYNAMIC LOG BUTTON */}
                        <button
                            className={`tile-btn ${profile?.dialysis_type === "HD" ? "red" : "blue"}`}
                            onClick={() => navigate("/exchange")}
                        >
                            <div className="tile-icon">
                                {profile?.dialysis_type === "HD" ? <MdBloodtype /> : <MdWaterDrop />}
                            </div>
                            <span>
                                {profile?.dialysis_type === "HD" ? "Log HD" : "Log PD"}
                            </span>
                        </button>

                        <button className="tile-btn green" onClick={() => navigate("/profile")}>
                            <div className="tile-icon"><MdPerson /></div>
                            <span>Profile</span>
                        </button>

                        <button className="tile-btn purple" onClick={() => navigate("/history")}>
                            <div className="tile-icon"><MdHistory /></div>
                            <span>History</span>
                        </button>
                    </div>
                </section>

                {/* 3. INSIGHTS SECTION */}
                <section className="insights-section">
                    <div className="section-header">
                        <div className="section-label">Your Trends</div>
                        <button className="text-link" onClick={() => navigate("/history")}>View All</button>
                    </div>

                    <div className="chart-card-wrapper">
                        <UFTrendChart />
                    </div>
                </section>

                {/* 4. RECENT SUMMARY */}
                <section className="summary-section">
                    <div className="section-label">Recent Activity</div>
                    <DailyUFSummary />
                </section>

            </div>
            <br /><br /><br /><br /><br />
            <ChatAssistant />
            <MobileNav />
        </div>
    );
}