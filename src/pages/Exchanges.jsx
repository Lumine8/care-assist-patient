import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import MobileNav from "../components/MobileNav";
import gsap from "gsap";
import {
    MdAccessTime,
    MdMonitorWeight,
    MdOpacity,
    MdWaterDrop,
    MdImage,
    MdNoteAlt,
    MdSave,
    MdDelete,
    MdHistory
} from "react-icons/md";

// Import both stylesheets (ensure these files exist in your styles folder)
import "../styles/PdExchange.css";
import "../styles/HdExchange.css";

/* =========================================================================
   1. PD FORM COMPONENT (Logic from your first file)
   ========================================================================= */
const PDForm = ({ patientId }) => {
    const containerRef = useRef(null);
    const [loading, setLoading] = useState(false);

    // Form States
    const [baxterStrength, setBaxterStrength] = useState("1.5%");
    const [bagVolume, setBagVolume] = useState(2000);
    const [leftover, setLeftover] = useState(0);
    const [drain, setDrain] = useState("");
    const [weight, setWeight] = useState("");
    const [notes, setNotes] = useState("");
    const [imageFile, setImageFile] = useState(null);
    const [previewURL, setPreviewURL] = useState(null);

    // Time & Calculations
    const generateIST = () => {
        const now = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" });
        return now.replace(" ", "T").slice(0, 16);
    };
    const [timestamp, setTimestamp] = useState(generateIST());

    // Auto-calculate UF
    const fillVolume = bagVolume - (leftover || 0);
    const drainVal = drain === "" ? 0 : parseFloat(drain);
    const uf = drainVal - fillVolume;

    // Animation on Mount
    useEffect(() => {
        gsap.from(containerRef.current, {
            opacity: 0, y: 20, duration: 0.5, ease: "power2.out",
        });
    }, []);

    // Image Handling
    const handleImageChange = (file) => {
        if (!file) return;
        setImageFile(file);
        setPreviewURL(URL.createObjectURL(file));
    };

    const removeImage = () => {
        setImageFile(null);
        setPreviewURL(null);
    };

    const handleImageUpload = async (file) => {
        const fileName = `${Date.now()}-${file.name.replace(/\s/g, '')}`;
        const { error } = await supabase.storage.from("pd_images").upload(fileName, file);
        if (error) throw error;
        return supabase.storage.from("pd_images").getPublicUrl(fileName).data.publicUrl;
    };

    // Submit Logic
    const handleSubmit = async () => {
        if (loading) return;
        setLoading(true);

        try {
            let uploadedImageURL = null;
            if (imageFile) {
                uploadedImageURL = await handleImageUpload(imageFile);
            }

            const finalTimestamp = timestamp.length === 16 ? timestamp + ":00" : timestamp;

            const { error } = await supabase.from("pd_exchanges").insert({
                patient_id: patientId,
                timestamp: finalTimestamp,
                baxter_strength: baxterStrength,
                fill_volume: fillVolume,
                drain_volume: drainVal,
                weight: weight || null,
                notes: notes,
                image_url: uploadedImageURL,
            });

            if (error) throw error;

            gsap.to(".submit-btn", { scale: 1.05, duration: 0.1, yoyo: true, repeat: 1 });
            alert("✅ PD Exchange Saved!");

            // Optional: Reset specific fields
            setDrain("");
            setNotes("");
            removeImage();

        } catch (error) {
            alert("Error: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div ref={containerRef} className="pd-container page-padding-bottom">
            <header className="pd-header">
                <h2>PD Exchange</h2>
                <p>Enter your exchange details below.</p>
            </header>

            <div className="pd-form">
                {/* Time & Weight */}
                <div className="form-card">
                    <div className="form-row">
                        <div className="form-group half">
                            <label>Time</label>
                            <div className="input-icon-wrapper">
                                <MdAccessTime className="field-icon" />
                                <input type="datetime-local" value={timestamp} onChange={(e) => setTimestamp(e.target.value)} />
                            </div>
                        </div>
                        <div className="form-group half">
                            <label>Weight (kg)</label>
                            <div className="input-icon-wrapper">
                                <MdMonitorWeight className="field-icon" />
                                <input type="number" step="0.1" placeholder="0.0" value={weight} onChange={(e) => setWeight(e.target.value)} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dialysis Params */}
                <div className="form-card">
                    <div className="form-row">
                        <div className="form-group half">
                            <label>Strength</label>
                            <div className="input-icon-wrapper">
                                <MdOpacity className="field-icon" />
                                <select value={baxterStrength} onChange={(e) => setBaxterStrength(e.target.value)}>
                                    <option value="1.5%">1.5% (Yellow)</option>
                                    <option value="2.5%">2.5% (Green)</option>
                                    <option value="7.5%">7.5% (Purple)</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group half">
                            <label>Bag Vol (mL)</label>
                            <div className="input-icon-wrapper">
                                <MdWaterDrop className="field-icon" />
                                <input type="number" value={bagVolume} onChange={(e) => setBagVolume(Number(e.target.value))} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Fluid Balance */}
                <div className="form-card highlight-card">
                    <h3 className="card-subtitle">Fluid Balance</h3>
                    <div className="form-group">
                        <label>Leftover in Bag (mL)</label>
                        <div className="input-icon-wrapper">
                            <MdWaterDrop className="field-icon" />
                            <input type="number" placeholder="Enter amount left" value={leftover} onChange={(e) => setLeftover(Number(e.target.value))} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Drain Volume (mL)</label>
                        <div className="input-icon-wrapper">
                            <MdOpacity className="field-icon" />
                            <input type="number" placeholder="Enter total drain" value={drain} onChange={(e) => setDrain(e.target.value)} />
                        </div>
                    </div>

                    <div className={`result-box ${uf > 0 ? "positive-uf" : "negative-uf"}`}>
                        <div className="result-label">Net Ultrafiltration (UF)</div>
                        <div className="result-value">
                            {drain ? (uf > 0 ? `+${uf}` : uf) : "--"} mL
                        </div>
                        <div className="result-detail">(Drain {drainVal || 0} - Fill {fillVolume})</div>
                    </div>
                </div>

                {/* Image & Notes */}
                <div className="form-card">
                    <div className="form-group">
                        <label>Upload Image</label>
                        {!previewURL ? (
                            <label className="custom-file-upload">
                                <input type="file" accept="image/*" onChange={(e) => handleImageChange(e.target.files[0])} />
                                <MdImage className="upload-icon" />
                                <span>Tap to upload drain image</span>
                            </label>
                        ) : (
                            <div className="image-preview-container">
                                <img src={previewURL} alt="Preview" />
                                <button className="remove-img-btn" onClick={removeImage}><MdDelete /></button>
                            </div>
                        )}
                    </div>
                    <div className="form-group">
                        <label>Notes</label>
                        <div className="input-icon-wrapper">
                            <MdNoteAlt className="field-icon" />
                            <textarea rows="2" placeholder="Clarity, fibrin, etc." value={notes} onChange={(e) => setNotes(e.target.value)}></textarea>
                        </div>
                    </div>
                </div>

                <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
                    <MdSave className="btn-icon" /> {loading ? "Saving..." : "Save Record"}
                </button>
            </div>
        </div>
    );
};

/* =========================================================================
   2. HD FORM COMPONENT (Logic from your second file)
   ========================================================================= */
/* =========================================================================
   2. HD FORM COMPONENT (Fixed)
   ========================================================================= */
const HDForm = ({ patientId }) => {
    const [exchanges, setExchanges] = useState([]);
    const [preWeight, setPreWeight] = useState("");
    const [postWeight, setPostWeight] = useState("");
    const [note, setNote] = useState("");
    const [loading, setLoading] = useState(false);

    // This state acts as a trigger to reload the list
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // 1. Unified Fetch Logic inside useEffect
    useEffect(() => {
        if (!patientId) return;

        const fetchHDExchanges = async () => {
            const { data, error } = await supabase
                .from("hd_exchanges")
                .select("*")
                .eq("patient_id", patientId)
                .order("timestamp", { ascending: false });

            if (!error) setExchanges(data);
        };

        fetchHDExchanges();

        // Rerun this effect whenever patientId OR refreshTrigger changes
    }, [patientId, refreshTrigger]);


    // 2. Submit Logic
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase.from("hd_exchanges").insert({
            patient_id: patientId,
            pre_weight: parseFloat(preWeight),
            post_weight: parseFloat(postWeight),
            note: note || null,
        });

        setLoading(false);

        if (error) {
            alert("Failed to save HD exchange");
        } else {
            // Clear Form
            setPreWeight("");
            setPostWeight("");
            setNote("");

            // ⚡️ This updates the state, forcing the useEffect above to run again
            setRefreshTrigger(prev => prev + 1);
        }
    };

    const formatDate = (ts) => new Date(ts).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

    return (
        <div className="hd-container page-padding-bottom">
            <header className="hd-header">
                <h2>Hemodialysis Log</h2>
                <p>Record your pre and post session weights.</p>
            </header>

            <form className="hd-form card" onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Pre-Dialysis Weight (kg)</label>
                    <div className="input-wrapper">
                        <MdMonitorWeight className="input-icon" />
                        <input type="number" step="0.01" placeholder="0.00" value={preWeight} onChange={(e) => setPreWeight(e.target.value)} required />
                    </div>
                </div>
                <div className="form-group">
                    <label>Post-Dialysis Weight (kg)</label>
                    <div className="input-wrapper">
                        <MdMonitorWeight className="input-icon" />
                        <input type="number" step="0.01" placeholder="0.00" value={postWeight} onChange={(e) => setPostWeight(e.target.value)} required />
                    </div>
                </div>
                <div className="form-group">
                    <label>Notes (Optional)</label>
                    <div className="input-wrapper">
                        <MdNoteAlt className="input-icon" />
                        <textarea placeholder="Any issues?" value={note} onChange={(e) => setNote(e.target.value)} rows="2" />
                    </div>
                </div>
                <button className="btn-save" disabled={loading}>
                    <MdSave /> {loading ? "Saving..." : "Save Session"}
                </button>
            </form>

            <div className="hd-history-section">
                <h3 className="section-title"><MdHistory /> Recent Sessions</h3>
                {exchanges.length === 0 && <div className="empty-state">No sessions recorded yet.</div>}
                <div className="history-list">
                    {exchanges.map((ex) => (
                        <div key={ex.id} className="history-card">
                            <div className="card-header">
                                <span className="card-date">{formatDate(ex.timestamp)}</span>
                                <span className="uf-badge">UF: <strong>{ex.uf > 0 ? "+" : ""}{ex.uf} kg</strong></span>
                            </div>
                            <div className="card-stats">
                                <div className="stat-box"><span className="label">Pre</span><span className="value">{ex.pre_weight}</span></div>
                                <div className="stat-arrow">→</div>
                                <div className="stat-box"><span className="label">Post</span><span className="value">{ex.post_weight}</span></div>
                            </div>
                            {ex.note && <div className="card-note">"{ex.note}"</div>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

/* =========================================================================
   3. MAIN PARENT COMPONENT
   ========================================================================= */
export default function Exchange() {
    const [loading, setLoading] = useState(true);
    const [patientId, setPatientId] = useState(null);
    const [dialysisType, setDialysisType] = useState("PD"); // Default to PD safely

    useEffect(() => {
        async function loadProfile() {
            const { data: user } = await supabase.auth.getUser();
            if (!user?.user) return; // Handle no user logic if needed

            const { data: patient } = await supabase
                .from("patients")
                .select("id, dialysis_type")
                .eq("auth_id", user.user.id)
                .single();

            if (patient) {
                setPatientId(patient.id);
                // Ensure we handle casing (e.g., "HD" vs "hd")
                setDialysisType(patient.dialysis_type?.toUpperCase() || "PD");
            }
            setLoading(false);
        }
        loadProfile();
    }, []);

    if (loading) return <div style={{ textAlign: "center", padding: "50px" }}>Loading Profile...</div>;

    return (
        <>
            {/* CONDITIONALLY RENDER BASED ON TYPE */}
            {dialysisType === "HD" ? (
                <HDForm patientId={patientId} />
            ) : (
                <PDForm patientId={patientId} />
            )}

            <MobileNav />
        </>
    );
}