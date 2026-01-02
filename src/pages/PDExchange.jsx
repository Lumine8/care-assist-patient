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
    MdDelete
} from "react-icons/md";
import "../styles/PdExchange.css";

export default function PDExchange() {
    const containerRef = useRef(null);
    const [loading, setLoading] = useState(false);

    // -------------------------
    // FORM STATES
    // -------------------------
    const [baxterStrength, setBaxterStrength] = useState("1.5%");
    const [bagVolume, setBagVolume] = useState(2000);
    const [leftover, setLeftover] = useState(0);
    const [drain, setDrain] = useState(""); // Default to empty string for better UX
    const [weight, setWeight] = useState("");
    const [notes, setNotes] = useState("");

    const [imageFile, setImageFile] = useState(null);
    const [previewURL, setPreviewURL] = useState(null);

    // -------------------------
    // TIME & CALCULATIONS
    // -------------------------
    const generateIST = () => {
        const now = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" });
        return now.replace(" ", "T").slice(0, 16);
    };

    const [timestamp, setTimestamp] = useState(generateIST());

    // Auto-calculate UF
    // Note: Kept your formula: (Bag - Leftover) - Drain
    const fillVolume = bagVolume - (leftover || 0);
    const drainVal = drain === "" ? 0 : parseFloat(drain);
    const uf = drainVal - fillVolume; // ⚡️ Standard logic: Drain - Fill = Removed Fluid

    useEffect(() => {
        gsap.from(containerRef.current, {
            opacity: 0,
            y: 20,
            duration: 0.5,
            ease: "power2.out",
        });
    }, []);

    // -------------------------
    // IMAGE HANDLING
    // -------------------------
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
        const { error } = await supabase.storage
            .from("pd_images")
            .upload(fileName, file);

        if (error) throw error;

        return supabase.storage
            .from("pd_images")
            .getPublicUrl(fileName).data.publicUrl;
    };

    // -------------------------
    // SUBMIT
    // -------------------------
    const handleSubmit = async () => {
        if (loading) return;
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user found");

            const { data: patient } = await supabase
                .from("patients")
                .select("id")
                .eq("auth_id", user.id)
                .single();

            let uploadedImageURL = null;
            if (imageFile) {
                uploadedImageURL = await handleImageUpload(imageFile);
            }

            const finalTimestamp = timestamp.length === 16 ? timestamp + ":00" : timestamp;

            const { error } = await supabase.from("pd_exchanges").insert({
                patient_id: patient.id,
                timestamp: finalTimestamp,
                baxter_strength: baxterStrength,
                fill_volume: fillVolume,
                drain_volume: drainVal,
                // uf: uf,
                weight: weight || null,
                notes: notes,
                image_url: uploadedImageURL,
            });

            if (error) throw error;

            gsap.to(".submit-btn", { scale: 1.05, duration: 0.1, yoyo: true, repeat: 1 });
            alert("✅ Exchange Saved Successfully!");

            // Optional: Reset form or redirect
            // window.location.href = "/history";

        } catch (error) {
            alert("Error: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div ref={containerRef} className="pd-container page-padding-bottom">

                <header className="pd-header">
                    <h2>PD Exchange</h2>
                    <p>Enter your exchange details below.</p>
                </header>

                <div className="pd-form">

                    {/* SECTION 1: TIMING & WEIGHT */}
                    <div className="form-card">
                        <div className="form-row">
                            <div className="form-group half">
                                <label>Time</label>
                                <div className="input-icon-wrapper">
                                    <MdAccessTime className="field-icon" />
                                    <input
                                        type="datetime-local"
                                        value={timestamp}
                                        onChange={(e) => setTimestamp(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="form-group half">
                                <label>Weight (kg)</label>
                                <div className="input-icon-wrapper">
                                    <MdMonitorWeight className="field-icon" />
                                    <input
                                        type="number"
                                        step="0.1"
                                        placeholder="0.0"
                                        value={weight}
                                        onChange={(e) => setWeight(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: DIALYSIS PARAMS */}
                    <div className="form-card">
                        <div className="form-row">
                            <div className="form-group half">
                                <label>Strength</label>
                                <div className="input-icon-wrapper">
                                    <MdOpacity className="field-icon" />
                                    <select
                                        value={baxterStrength}
                                        onChange={(e) => setBaxterStrength(e.target.value)}
                                    >
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
                                    <input
                                        type="number"
                                        value={bagVolume}
                                        onChange={(e) => setBagVolume(Number(e.target.value))}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3: FLUID BALANCE (The Logic Core) */}
                    <div className="form-card highlight-card">
                        <h3 className="card-subtitle">Fluid Balance</h3>

                        <div className="form-group">
                            <label>Leftover in Bag (mL)</label>
                            <div className="input-icon-wrapper">
                                <MdWaterDrop className="field-icon" />
                                <input
                                    type="number"
                                    placeholder="Enter amount left in bag"
                                    value={leftover}
                                    onChange={(e) => setLeftover(Number(e.target.value))}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Drain Volume (mL)</label>
                            <div className="input-icon-wrapper">
                                <MdOpacity className="field-icon" />
                                <input
                                    type="number"
                                    placeholder="Enter total drain"
                                    value={drain}
                                    onChange={(e) => setDrain(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* LIVE CALCULATION DISPLAY */}
                        <div className={`result-box ${uf > 0 ? "positive-uf" : "negative-uf"}`}>
                            <div className="result-label">Net Ultrafiltration (UF)</div>
                            <div className="result-value">
                                {drain ? (uf > 0 ? `+${uf}` : uf) : "--"} mL
                            </div>
                            <div className="result-detail">
                                (Drain {drainVal || 0} - Fill {fillVolume})
                            </div>
                        </div>
                    </div>

                    {/* SECTION 4: EXTRAS */}
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
                                    <button className="remove-img-btn" onClick={removeImage}>
                                        <MdDelete />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label>Notes</label>
                            <div className="input-icon-wrapper">
                                <MdNoteAlt className="field-icon" />
                                <textarea
                                    rows="2"
                                    placeholder="Clarity, fibrin, pain, etc."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                ></textarea>
                            </div>
                        </div>
                    </div>

                    {/* SUBMIT BUTTON */}
                    <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
                        <MdSave className="btn-icon" />
                        {loading ? "Saving..." : "Save Record"}
                    </button>

                </div>
            </div>
            <MobileNav />
        </>
    );
}