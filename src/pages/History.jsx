import { useEffect, useState, useMemo } from "react";
import { supabase } from "../supabaseClient";
import MobileNav from "../components/MobileNav";
import "../styles/History.css";

export default function History() {
    const [sessions, setSessions] = useState([]);
    const [activeType, setActiveType] = useState(null); // PD | HD
    const [isSaving, setIsSaving] = useState(false);

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
        EDIT STATES (PD ONLY)
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
                .select("id, dialysis_type")
                .eq("auth_id", auth.user.id)
                .single();

            if (!patient?.id) return;

            setActiveType(patient.dialysis_type);

            const { data: pdData } = await supabase
                .from("pd_exchanges")
                .select("*")
                .eq("patient_id", patient.id);

            const { data: hdData } = await supabase
                .from("hd_exchanges")
                .select("*")
                .eq("patient_id", patient.id);

            const pdSessions = (pdData || []).map((s) => ({ ...s, type: "PD" }));
            const hdSessions = (hdData || []).map((s) => ({ ...s, type: "HD" }));

            const merged = [...pdSessions, ...hdSessions].sort(
                (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
            );

            setSessions(merged);
        };

        fetchSessions();
    }, []);

    /* =========================
        FILTER LOGIC
    ========================= */
    const typeFilteredSessions = useMemo(() => {
        if (!activeType) return [];
        return sessions.filter((s) => s.type === activeType);
    }, [sessions, activeType]);

    const filteredSessions = useMemo(() => {
        if (!typeFilteredSessions.length) return [];

        const pdWeights = typeFilteredSessions
            .filter((s) => s.type === "PD")
            .map((s) => Number(s.weight))
            .filter((w) => !Number.isNaN(w));

        const avgWeight =
            pdWeights.length > 0
                ? pdWeights.reduce((a, b) => a + b, 0) / pdWeights.length
                : null;

        return typeFilteredSessions.filter((s) => {
            if (s.type === "PD" && weightCategory && avgWeight !== null) {
                const w = Number(s.weight);
                if (!Number.isNaN(w)) {
                    if (weightCategory === "below" && w >= avgWeight - 0.5) return false;
                    if (weightCategory === "average" && Math.abs(w - avgWeight) > 0.5) return false;
                    if (weightCategory === "above" && w <= avgWeight + 0.5) return false;
                }
            }

            if (ufMin && s.uf < Number(ufMin)) return false;
            if (ufMax && s.uf > Number(ufMax)) return false;
            if (baxter && s.type === "PD" && s.baxter_strength !== baxter) return false;

            if (date && s.timestamp) {
                const rowDate = new Date(s.timestamp).toLocaleDateString('en-CA');
                if (rowDate !== date) return false;
            }

            return true;
        });
    }, [typeFilteredSessions, weightCategory, ufMin, ufMax, baxter, date]);

    const visibleSessions = filtersApplied ? filteredSessions : typeFilteredSessions;

    /* =========================
        HELPERS
    ========================= */
    const formatTime = (timestamp) => {
        if (!timestamp) return "--";

        // Works for ISO strings: YYYY-MM-DDTHH:mm:ss(.sss)
        const timePart = timestamp.split("T")[1];
        if (!timePart) return "--";

        let [hours, minutes] = timePart.slice(0, 5).split(":");
        hours = Number(hours);

        const period = hours >= 12 ? "PM" : "AM";
        const displayHour = hours % 12 || 12;

        return `${displayHour}:${minutes} ${period}`;
    };


    const formatDateHeader = (dateStr) => {
        if (!dateStr || dateStr === "Unknown Date") return dateStr;

        // dateStr is already YYYY-MM-DD
        const [year, month, day] = dateStr.split("-").map(Number);

        const date = new Date(year, month - 1, day); // LOCAL, no TZ shift

        return date.toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };


    const groupedByDate = useMemo(() => {
        return visibleSessions.reduce((acc, s) => {
            const d = s.timestamp
                ? new Date(s.timestamp).toLocaleDateString('en-CA')
                : "Unknown Date";
            acc[d] = acc[d] || [];
            acc[d].push(s);
            return acc;
        }, {});
    }, [visibleSessions]);

    /* =========================
        EDIT LOGIC
    ========================= */
    const recomputeUF = (form) => {
        const fill = form.fill_volume === "" ? 0 : Number(form.fill_volume);
        const drain = form.drain_volume === "" ? 0 : Number(form.drain_volume);
        return { ...form, uf: drain - fill };
    };

    const startEdit = (s) => {
        if (s.type !== "PD") return;
        setEditingId(s.id);
        setEditForm({
            fill_volume: s.fill_volume ?? "",
            drain_volume: s.drain_volume ?? "",
            uf: s.uf ?? 0,
            weight: s.weight ?? "",
            baxter_strength: s.baxter_strength ?? "",
            notes: s.notes ?? "",
        });
    };

    const saveEdit = async (id) => {
        if (isSaving) return;
        setIsSaving(true);

        const updates = {
            fill_volume: editForm.fill_volume === "" ? null : Number(editForm.fill_volume),
            drain_volume: editForm.drain_volume === "" ? null : Number(editForm.drain_volume),
            weight: editForm.weight === "" ? null : Number(editForm.weight),
            baxter_strength: editForm.baxter_strength,
            notes: editForm.notes,
        };

        const { data, error } = await supabase
            .from("pd_exchanges")
            .update(updates)
            .eq("id", id)
            .select();

        setIsSaving(false);

        if (error) {
            alert("Error saving: " + error.message);
        } else if (data && data.length > 0) {
            setSessions((prev) =>
                prev.map((s) =>
                    s.id === id ? { ...data[0], type: "PD" } : s
                )
            );
            setEditingId(null);
        }
    };

    const deleteSession = async (id) => {
        if (!window.confirm("Delete this PD session?")) return;
        const { error } = await supabase.from("pd_exchanges").delete().eq("id", id);
        if (!error) setSessions((prev) => prev.filter((s) => s.id !== id));
    };

    return (
        <div className="dashboard-container page-padding-bottom">
            <h2 className="dashboard-title">
                {activeType === "PD" ? "Peritoneal Dialysis History" : "Hemodialysis History"}
            </h2>

            {/* 🆕 1. SHOW RECORD COUNT */}
            <p className="subtitle" style={{ textAlign: "center", marginBottom: "1rem", color: "#666" }}>
                No. of records: {visibleSessions.length}
            </p>

            {/* 🆕 2. HIDE FILTER IF HD */}
            {activeType === "PD" && (
                <div className="history-filters">
                    <select value={weightCategory} onChange={(e) => setWeightCategory(e.target.value)}>
                        <option value="">Weight (PD)</option>
                        <option value="below">Below avg</option>
                        <option value="average">Average</option>
                        <option value="above">Above avg</option>
                    </select>

                    <input placeholder="UF min" value={ufMin} onChange={(e) => setUfMin(e.target.value)} />
                    <input placeholder="UF max" value={ufMax} onChange={(e) => setUfMax(e.target.value)} />

                    <select value={baxter} onChange={(e) => setBaxter(e.target.value)}>
                        <option value="">Baxter %</option>
                        <option value="1.5%">1.5%</option>
                        <option value="2.5%">2.5%</option>
                        <option value="7.5%">7.5%</option>
                    </select>

                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />

                    <button className="btn primary" onClick={() => setFiltersApplied(true)}>Apply</button>
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
            )}

            {/* TABLE LIST */}
            {Object.entries(groupedByDate).map(([d, rows]) => (
                <div key={d} className="day-group">
                    <div className="day-header">
                        <span>{formatDateHeader(d)}</span>
                        <span>Total UF: <span className="highlight-uf">{rows.reduce((a, b) => a + (b.uf || 0), 0)}</span></span>
                    </div>

                    <div className="table-wrapper">
                        <table className="history-table">
                            <thead>
                                <tr>
                                    <th>Time</th>
                                    {activeType === "PD" ? (
                                        <>
                                            <th>Fill</th><th>Drain</th><th>UF</th><th>Weight</th><th>Baxter</th><th>Actions</th>
                                        </>
                                    ) : (
                                        <>
                                            <th>Pre</th><th>Post</th><th>UF</th><th>Notes</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((s) => (
                                    <tr key={s.id} className={editingId === s.id ? "editing-row" : ""}>
                                        <td>{formatTime(s.timestamp)}</td>

                                        {/* PD COLUMNS */}
                                        {activeType === "PD" && (
                                            <>
                                                <td>
                                                    {editingId === s.id ? (
                                                        <input
                                                            className="edit-input"
                                                            type="number"
                                                            autoFocus
                                                            value={editForm.fill_volume}
                                                            onChange={(e) => {
                                                                const updated = { ...editForm, fill_volume: e.target.value };
                                                                setEditForm(recomputeUF(updated));
                                                            }}
                                                        />
                                                    ) : s.fill_volume}
                                                </td>

                                                <td>
                                                    {editingId === s.id ? (
                                                        <input
                                                            className="edit-input"
                                                            type="number"
                                                            value={editForm.drain_volume}
                                                            onChange={(e) => {
                                                                const updated = { ...editForm, drain_volume: e.target.value };
                                                                setEditForm(recomputeUF(updated));
                                                            }}
                                                        />
                                                    ) : s.drain_volume}
                                                </td>

                                                <td className={s.uf < 0 ? "negative-uf" : "positive-uf"}>
                                                    {editingId === s.id ? <strong>{editForm.uf}</strong> : s.uf}
                                                </td>

                                                <td>
                                                    {editingId === s.id ? (
                                                        <input
                                                            className="edit-input"
                                                            type="number"
                                                            value={editForm.weight}
                                                            onChange={(e) => setEditForm({ ...editForm, weight: e.target.value })}
                                                        />
                                                    ) : s.weight}
                                                </td>

                                                <td>
                                                    {editingId === s.id ? (
                                                        <select
                                                            className="edit-select"
                                                            value={editForm.baxter_strength}
                                                            onChange={(e) => setEditForm({ ...editForm, baxter_strength: e.target.value })}
                                                        >
                                                            <option value="1.5%">1.5%</option>
                                                            <option value="2.5%">2.5%</option>
                                                            <option value="7.5%">7.5%</option>
                                                        </select>
                                                    ) : (
                                                        <span className={`badge ${String(s.baxter_strength).replace("%", "").replace(".", "")}-badge`}>
                                                            {s.baxter_strength}
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="action-cell">
                                                    {editingId === s.id ? (
                                                        <>
                                                            <button
                                                                onClick={() => saveEdit(s.id)}
                                                                className="btn-icon save-btn"
                                                                disabled={isSaving}
                                                            >
                                                                {isSaving ? "⏳" : "💾"}
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingId(null)}
                                                                className="btn-icon cancel-btn"
                                                                disabled={isSaving}
                                                            >
                                                                ❌
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button onClick={() => startEdit(s)} className="btn-icon">✏️</button>
                                                            <button onClick={() => deleteSession(s.id)} className="btn-icon delete-btn">🗑️</button>
                                                        </>
                                                    )}
                                                </td>
                                            </>
                                        )}

                                        {/* HD COLUMNS */}
                                        {activeType === "HD" && (
                                            <>
                                                <td>{s.pre_weight}</td>
                                                <td>{s.post_weight}</td>
                                                <td>{s.uf}</td>
                                                <td>{s.note || "-"}</td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
            <br /><br /><br /><br />
            <MobileNav />
        </div>
    );
}