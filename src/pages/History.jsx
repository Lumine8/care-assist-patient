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
        EDIT STATES
    ========================= */
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({
        fill_volume: "",
        drain_volume: "",
        uf: 0,
        weight: "",
        baxter_strength: "",
        notes: "",
    });

    /* =========================
        FETCH DATA
    ========================= */
    useEffect(() => {
        const fetchSessions = async () => {
            const { data: auth } = await supabase.auth.getUser();
            if (!auth?.user) return;

            const { data: patient } = await supabase
                .from("patients")
                .select("id")
                .eq("auth_id", auth.user.id)
                .single();

            if (!patient?.id) return;

            const { data } = await supabase
                .from("pd_exchanges")
                .select("*")
                .eq("patient_id", patient.id)
                .order("timestamp", { ascending: false });

            setSessions(data || []);
        };

        fetchSessions();
    }, []);

    /* =========================
        FILTER LOGIC
    ========================= */
    const filteredSessions = useMemo(() => {
        if (!sessions.length) return [];

        const weights = sessions
            .map((s) => Number(s.weight))
            .filter((w) => !Number.isNaN(w));

        const avgWeight =
            weights.length > 0
                ? weights.reduce((a, b) => a + b, 0) / weights.length
                : null;

        return sessions.filter((s) => {
            const w = Number(s.weight);

            if (weightCategory && avgWeight !== null && !Number.isNaN(w)) {
                if (weightCategory === "below" && w >= avgWeight - 0.5) return false;
                if (weightCategory === "average" && Math.abs(w - avgWeight) > 0.5)
                    return false;
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

    /* =========================
        TIME FORMAT
    ========================= */
    const formatTime = (timestamp) => {
        if (!timestamp) return "--";
        const time = timestamp.split("T")[1]?.slice(0, 5);
        if (!time) return "--";

        let [h, m] = time.split(":");
        h = Number(h);
        const period = h >= 12 ? "PM" : "AM";
        const display = h % 12 || 12;
        return `${display}:${m} ${period}`;
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
        UF RECOMPUTE (Local only)
    ========================= */
    const recomputeUF = (form) => {
        const fill = form.fill_volume === "" ? 0 : Number(form.fill_volume);
        const drain = form.drain_volume === "" ? 0 : Number(form.drain_volume);
        return {
            ...form,
            uf: drain - fill,
        };
    };

    /* =========================
        EDIT HANDLERS
    ========================= */
    const startEdit = (s) => {
        setEditingId(s.id);
        setEditForm({
            fill_volume: s.fill_volume !== null ? s.fill_volume : "",
            drain_volume: s.drain_volume !== null ? s.drain_volume : "",
            uf: s.uf || 0,
            weight: s.weight !== null ? s.weight : "",
            baxter_strength: s.baxter_strength || "",
            notes: s.notes || "",
        });
    };

    const saveEdit = async (id) => {
        // 1. Prepare updates (Exclude 'uf')
        const updates = {
            fill_volume: editForm.fill_volume === "" ? null : Number(editForm.fill_volume),
            drain_volume: editForm.drain_volume === "" ? null : Number(editForm.drain_volume),
            weight: editForm.weight === "" ? null : Number(editForm.weight),
            baxter_strength: editForm.baxter_strength,
            notes: editForm.notes,
        };

        // 2. Send update (Remove .single() to avoid "JSON object" error)
        const { data, error } = await supabase
            .from("pd_exchanges")
            .update(updates)
            .eq("id", id)
            .select();

        if (error) {
            console.error("Update failed:", error);
            alert("Failed to update: " + error.message);
        } else if (data && data.length > 0) {
            // 3. Manually grab the first item
            const updatedRecord = data[0];

            setSessions((prev) =>
                prev.map((s) => (s.id === id ? updatedRecord : s))
            );
            setEditingId(null);
        }
    };

    const deleteSession = async (id) => {
        if (!window.confirm("Delete this PD session?")) return;
        const { error } = await supabase.from("pd_exchanges").delete().eq("id", id);

        if (error) {
            alert("Error deleting: " + error.message);
        } else {
            setSessions((prev) => prev.filter((s) => s.id !== id));
        }
    };

    return (
        <div className="dashboard-container page-padding-bottom">
            <h2 className="dashboard-title">PD History</h2>

            {/* FILTER UI */}
            <div className="history-filters">
                <select
                    value={weightCategory}
                    onChange={(e) => setWeightCategory(e.target.value)}
                >
                    <option value="">Weight category</option>
                    <option value="below">Below average</option>
                    <option value="average">Average</option>
                    <option value="above">Above average</option>
                </select>

                <input
                    placeholder="UF min"
                    value={ufMin}
                    onChange={(e) => setUfMin(e.target.value)}
                />
                <input
                    placeholder="UF max"
                    value={ufMax}
                    onChange={(e) => setUfMax(e.target.value)}
                />

                <select value={baxter} onChange={(e) => setBaxter(e.target.value)}>
                    <option value="">Baxter %</option>
                    <option value="1.5%">1.5%</option>
                    <option value="2.5%">2.5%</option>
                    <option value="7.5%">7.5%</option>
                </select>

                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                />

                <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                    <button
                        className="btn primary"
                        onClick={() => setFiltersApplied(true)}
                    >
                        Apply
                    </button>
                    <button
                        className="btn secondary"
                        onClick={() => {
                            setWeightCategory("");
                            setUfMin("");
                            setUfMax("");
                            setBaxter("");
                            setDate("");
                            setFiltersApplied(false);
                        }}
                    >
                        Clear
                    </button>
                </div>

                <p style={{ fontSize: "0.85rem", opacity: 0.6 }}>
                    Showing {visibleSessions.length} of {sessions.length} sessions
                </p>
            </div>

            {/* TABLE */}
            {Object.entries(groupedByDate).map(([dateKey, daySessions]) => {
                const totalUF = daySessions.reduce((sum, s) => sum + (s.uf || 0), 0);

                return (
                    <div key={dateKey} className="day-group">
                        <div className="day-header">
                            <span>{dateKey}</span>
                            <span>Total UF: {totalUF} mL</span>
                        </div>

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
                                    {daySessions.map((s) => (
                                        <tr key={s.id}>
                                            <td>{formatTime(s.timestamp)}</td>

                                            {/* Fill */}
                                            <td>
                                                {editingId === s.id ? (
                                                    <input
                                                        type="number"
                                                        value={editForm.fill_volume}
                                                        onChange={(e) => {
                                                            const updated = {
                                                                ...editForm,
                                                                fill_volume: e.target.value,
                                                            };
                                                            setEditForm(recomputeUF(updated));
                                                        }}
                                                    />
                                                ) : (
                                                    s.fill_volume
                                                )}
                                            </td>

                                            {/* Drain */}
                                            <td>
                                                {editingId === s.id ? (
                                                    <input
                                                        type="number"
                                                        value={editForm.drain_volume}
                                                        onChange={(e) => {
                                                            const updated = {
                                                                ...editForm,
                                                                drain_volume: e.target.value,
                                                            };
                                                            setEditForm(recomputeUF(updated));
                                                        }}
                                                    />
                                                ) : (
                                                    s.drain_volume
                                                )}
                                            </td>

                                            {/* UF (Read Only) */}
                                            <td className={s.uf < 0 ? "text-green" : ""}>
                                                {editingId === s.id ? editForm.uf : s.uf}
                                            </td>

                                            {/* Weight */}
                                            <td>
                                                {editingId === s.id ? (
                                                    <input
                                                        type="number"
                                                        value={editForm.weight}
                                                        onChange={(e) =>
                                                            setEditForm({
                                                                ...editForm,
                                                                weight: e.target.value,
                                                            })
                                                        }
                                                    />
                                                ) : (
                                                    s.weight
                                                )}
                                            </td>

                                            {/* Baxter */}
                                            <td>
                                                {editingId === s.id ? (
                                                    <select
                                                        value={editForm.baxter_strength}
                                                        onChange={(e) =>
                                                            setEditForm({
                                                                ...editForm,
                                                                baxter_strength: e.target.value,
                                                            })
                                                        }
                                                    >
                                                        <option value="1.5%">1.5%</option>
                                                        <option value="2.5%">2.5%</option>
                                                        <option value="7.5%">7.5%</option>
                                                    </select>
                                                ) : (
                                                    s.baxter_strength
                                                )}
                                            </td>

                                            {/* Notes */}
                                            <td>
                                                {editingId === s.id ? (
                                                    <input
                                                        type="text"
                                                        value={editForm.notes}
                                                        onChange={(e) =>
                                                            setEditForm({
                                                                ...editForm,
                                                                notes: e.target.value,
                                                            })
                                                        }
                                                    />
                                                ) : (
                                                    s.notes || "-"
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="action-cell">
                                                {editingId === s.id ? (
                                                    <>
                                                        <button
                                                            className="btn-icon save"
                                                            onClick={() => saveEdit(s.id)}
                                                        >
                                                            💾
                                                        </button>
                                                        <button
                                                            className="btn-icon cancel"
                                                            onClick={() => setEditingId(null)}
                                                        >
                                                            ❌
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            className="btn-icon edit"
                                                            onClick={() => startEdit(s)}
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button
                                                            className="btn-icon del"
                                                            onClick={() => deleteSession(s.id)}
                                                        >
                                                            🗑️
                                                        </button>
                                                    </>
                                                )}
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
        </div>
    );
}