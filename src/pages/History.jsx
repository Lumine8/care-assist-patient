import { useEffect, useState, useMemo } from "react";
import { supabase } from "../supabaseClient";
import MobileNav from "../components/MobileNav";
import "../styles/History.css";

export default function History() {
    const [sessions, setSessions] = useState([]);

    /* =========================
       FILTER STATES
    ========================= */
    const [weightCategory, setWeightCategory] = useState("");
    const [ufMin, setUfMin] = useState("");
    const [ufMax, setUfMax] = useState("");
    const [baxter, setBaxter] = useState("");
    const [date, setDate] = useState("");

    const [filtersApplied, setFiltersApplied] = useState(false);

    /* =========================
       FETCH DATA
    ========================= */
    useEffect(() => {
        const fetchSessions = async () => {
            const { data: auth } = await supabase.auth.getUser();
            if (!auth?.user) return;

            const { data: patient, error: pErr } = await supabase
                .from("patients")
                .select("id")
                .eq("auth_id", auth.user.id)
                .single();

            if (pErr || !patient?.id) return;

            const { data, error } = await supabase
                .from("pd_exchanges")
                .select("*")
                .eq("patient_id", patient.id)
                .order("timestamp", { ascending: false });

            if (!error) {
                setSessions(data || []);
            }
        };

        fetchSessions();
    }, []);

    /* =========================
       FILTER LOGIC
    ========================= */
    const filteredSessions = useMemo(() => {
        if (!sessions.length) return [];

        // Calculate user's average weight
        const weights = sessions
            .map(s => Number(s.weight))
            .filter(w => !Number.isNaN(w));

        const avgWeight =
            weights.length > 0
                ? weights.reduce((a, b) => a + b, 0) / weights.length
                : null;

        return sessions.filter(s => {
            const w = Number(s.weight);

            if (weightCategory && avgWeight !== null && !Number.isNaN(w)) {
                if (weightCategory === "below" && w >= avgWeight - 0.5) return false;
                if (weightCategory === "average" && Math.abs(w - avgWeight) > 0.5) return false;
                if (weightCategory === "above" && w <= avgWeight + 0.5) return false;
            }

            if (ufMin && s.uf > Number(ufMin)) return false;
            if (ufMax && s.uf < Number(ufMax)) return false;
            if (baxter && s.baxter_strength !== baxter) return false;

            if (date && s.timestamp) {
                const d = new Date(s.timestamp).toISOString().slice(0, 10);
                if (d !== date) return false;
            }

            return true;
        });
    }, [sessions, weightCategory, ufMin, ufMax, baxter, date]);


    const visibleSessions = filtersApplied ? filteredSessions : sessions;

    const formatTime = (timestamp) => {
        if (!timestamp) return "--";

        const timePart = timestamp.split("T")[1];
        if (!timePart) return "--";

        let [hours, minutes] = timePart.slice(0, 5).split(":");
        hours = Number(hours);

        if (Number.isNaN(hours)) return "--";

        const period = hours >= 12 ? "PM" : "AM";
        const displayHour = hours % 12 || 12;

        return `${displayHour}:${minutes} ${period}`;
    };




    /* =========================
       GROUP BY DATE
    ========================= */
    const groupedByDate = useMemo(() => {
        return visibleSessions.reduce((acc, s) => {
            const d = s.timestamp
                ? new Date(s.timestamp).toISOString().slice(0, 10)
                : "Unknown Date";

            acc[d] = acc[d] || [];
            acc[d].push(s);
            return acc;
        }, {});
    }, [visibleSessions]);

    /* =========================
       DELETE ACTION
    ========================= */
    const deleteSession = async (id) => {
        if (!window.confirm("Delete this PD session?")) return;
        await supabase.from("pd_exchanges").delete().eq("id", id);
        setSessions(prev => prev.filter(s => s.id !== id));
    };

    return (
        <div className="dashboard-container page-padding-bottom">
            <h2 className="dashboard-title">PD History</h2>

            {/* FILTERS SECTION */}
            <div className="history-filters">
                <select
                    value={weightCategory}
                    onChange={e => setWeightCategory(e.target.value)}
                >
                    <option value="">Weight category</option>
                    <option value="below">Below average</option>
                    <option value="average">Average</option>
                    <option value="above">Above average</option>
                </select>

                <input
                    placeholder="UF min"
                    value={ufMin}
                    onChange={e => setUfMin(e.target.value)}
                />
                <input
                    placeholder="UF max"
                    value={ufMax}
                    onChange={e => setUfMax(e.target.value)}
                />
                <select value={baxter} onChange={e => setBaxter(e.target.value)}>
                    <option value="">Baxter %</option>
                    <option value="1.5%">1.5%</option>
                    <option value="2.5%">2.5%</option>
                    <option value="7.5%">7.5%</option>
                </select>
                <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                />

                <div style={{ display: "flex", gap: "10px", marginTop: "10px", }}>
                    <button className="btn primary" onClick={() => setFiltersApplied(true)}>
                        Apply
                    </button>
                    <button
                        className="btn secondary"
                        onClick={() => {
                            setWeightCategory(""); setUfMin(""); setUfMax(""); setBaxter(""); setDate("");
                            setFiltersApplied(false);
                        }}
                    >
                        Clear
                    </button>
                </div>

                <p style={{ fontSize: "0.85rem", opacity: 0.6, marginTop: "8px" }}>
                    Showing {visibleSessions.length} of {sessions.length} sessions
                </p>
            </div>

            {/* LIST OF DAYS */}
            {Object.entries(groupedByDate).map(([dateKey, daySessions]) => {
                const totalUF = daySessions.reduce((sum, s) => sum + (s.uf || 0), 0);

                return (
                    /* 1. UPDATED CLASS: day-group (matches new CSS) */
                    <div key={dateKey} className="day-group">

                        {/* 2. UPDATED CLASS: day-header (matches new CSS) */}
                        <div className="day-header">
                            <span style={{ float: 'left' }}>{dateKey}</span>
                            <span>Total UF: {totalUF} mL</span>
                        </div>

                        {/* 3. CRITICAL: The Scroll Wrapper */}
                        <div className="table-wrapper">
                            <table className="history-table">
                                <thead>
                                    <tr>
                                        <th>Time</th>
                                        <th>Fill</th>
                                        <th>Drain</th>
                                        <th>UF</th>
                                        <th>Weight</th>
                                        <th>Baxter</th>
                                        <th>Notes</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {daySessions.map(s => (
                                        <tr key={s.id}>
                                            <td>
                                                {formatTime(s.timestamp)}
                                            </td>
                                            <td>{s.fill_volume}</td>
                                            <td>{s.drain_volume}</td>

                                            {/* UPDATED CLASS: text-green for negative (screenshot style) */}
                                            <td className={s.uf < 0 ? "text-green" : ""}>
                                                {s.uf}
                                            </td>

                                            <td>{s.weight}</td>
                                            <td>{s.baxter_strength}</td>
                                            <td>{s.notes || "-"}</td>

                                            {/* UPDATED: Button classes for the new style */}
                                            <td className="action-cell">
                                                <button className="btn-icon edit">
                                                    ✏️
                                                </button>
                                                <button
                                                    className="btn-icon del"
                                                    onClick={() => deleteSession(s.id)}
                                                >
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}

            <MobileNav />
            <br /><br /><br /><br />
        </div>
    );
}