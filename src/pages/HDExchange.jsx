import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import MobileNav from "../components/MobileNav";
import { MdSave, MdHistory, MdNoteAlt, MdMonitorWeight } from "react-icons/md";
import "../styles/HdExchange.css";

export default function HDExchange() {
    const [patientId, setPatientId] = useState(null);
    const [exchanges, setExchanges] = useState([]);

    const [preWeight, setPreWeight] = useState("");
    const [postWeight, setPostWeight] = useState("");
    const [note, setNote] = useState("");
    const [loading, setLoading] = useState(false);

    /* =========================
        FETCH HD EXCHANGES
    ========================= */
    const fetchHDExchanges = async (pid) => {
        const { data, error } = await supabase
            .from("hd_exchanges")
            .select("*")
            .eq("patient_id", pid)
            .order("timestamp", { ascending: false });

        if (!error) setExchanges(data);
    };

    /* =========================
        LOAD PATIENT
    ========================= */
    useEffect(() => {
        const loadPatient = async () => {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData?.user) {
                window.location.href = "/login";
                return;
            }

            const { data: patient } = await supabase
                .from("patients")
                .select("id")
                .eq("auth_id", userData.user.id)
                .single();

            if (patient) {
                setPatientId(patient.id);
                fetchHDExchanges(patient.id);
            }
        };

        loadPatient();
    }, []);

    /* =========================
        INSERT HD EXCHANGE
    ========================= */
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!patientId) return;

        setLoading(true);

        // ⚠️ Logic Fix: Use parseFloat for weights (e.g., 70.5 kg)
        const { error } = await supabase.from("hd_exchanges").insert({
            patient_id: patientId,
            pre_weight: parseFloat(preWeight),
            post_weight: parseFloat(postWeight),
            note: note || null,
        });

        setLoading(false);

        if (error) {
            alert("Failed to save HD exchange");
            console.error(error);
            return;
        }

        // Reset Form
        setPreWeight("");
        setPostWeight("");
        setNote("");

        fetchHDExchanges(patientId);
    };

    /* =========================
        DATE HELPER
    ========================= */
    const formatDate = (ts) => {
        return new Date(ts).toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <>
            <div className="hd-container page-padding-bottom">

                {/* HEADER */}
                <header className="hd-header">
                    <h2>Hemodialysis Log</h2>
                    <p>Record your pre and post session weights.</p>
                </header>

                {/* INPUT FORM */}
                <form className="hd-form card" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Pre-Dialysis Weight (kg)</label>
                        <div className="input-wrapper">
                            <MdMonitorWeight className="input-icon" />
                            <input
                                type="number"
                                step="0.01" // Allows decimals
                                placeholder="0.00"
                                value={preWeight}
                                onChange={(e) => setPreWeight(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Post-Dialysis Weight (kg)</label>
                        <div className="input-wrapper">
                            <MdMonitorWeight className="input-icon" />
                            <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={postWeight}
                                onChange={(e) => setPostWeight(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Notes (Optional)</label>
                        <div className="input-wrapper">
                            <MdNoteAlt className="input-icon" />
                            <textarea
                                placeholder="Any issues during session?"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                rows="2"
                            />
                        </div>
                    </div>

                    <button className="btn-save" disabled={loading}>
                        <MdSave />
                        {loading ? "Saving..." : "Save Session"}
                    </button>
                </form>

                {/* RECENT HISTORY */}
                <div className="hd-history-section">
                    <h3 className="section-title">
                        <MdHistory /> Recent Sessions
                    </h3>

                    {exchanges.length === 0 && (
                        <div className="empty-state">No sessions recorded yet.</div>
                    )}

                    <div className="history-list">
                        {exchanges.map((ex) => (
                            <div key={ex.id} className="history-card">
                                <div className="card-header">
                                    <span className="card-date">{formatDate(ex.timestamp)}</span>
                                    <span className="uf-badge">
                                        UF: <strong>{ex.uf > 0 ? "+" : ""}{ex.uf} kg</strong>
                                    </span>
                                </div>

                                <div className="card-stats">
                                    <div className="stat-box">
                                        <span className="label">Pre</span>
                                        <span className="value">{ex.pre_weight}</span>
                                    </div>
                                    <div className="stat-arrow">→</div>
                                    <div className="stat-box">
                                        <span className="label">Post</span>
                                        <span className="value">{ex.post_weight}</span>
                                    </div>
                                </div>

                                {ex.note && (
                                    <div className="card-note">
                                        "{ex.note}"
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <MobileNav />
        </>
    );
}