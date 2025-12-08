import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import "../styles/PdExchange.css";

import MobileNav from "../components/MobileNav";
import gsap from "gsap";

export default function PDExchange() {
    const containerRef = useRef(null);

    // Form states
    const [baxterStrength, setBaxterStrength] = useState("1.5%");
    const [bagVolume, setBagVolume] = useState(2000);
    const [leftover, setLeftover] = useState(0);
    const [drain, setDrain] = useState(0);
    const [weight, setWeight] = useState("");
    const [notes, setNotes] = useState(""); // <-- NEW

    const [imageFile, setImageFile] = useState(null);
    const [previewURL, setPreviewURL] = useState(null);

    // Auto IST timestamp
    const defaultIST = new Date()
        .toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" })
        .replace(" ", "T");

    const [timestamp, setTimestamp] = useState(defaultIST);

    // Calculations
    const fillVolume = bagVolume - leftover;
    const uf = fillVolume - drain;

    useEffect(() => {
        gsap.from(containerRef.current, {
            opacity: 0,
            y: 30,
            duration: 0.6,
            ease: "power2.out",
        });
    }, []);

    const handleImageChange = (file) => {
        if (!file) return;
        setImageFile(file);
        setPreviewURL(URL.createObjectURL(file));
    };

    const handleImageUpload = async (file) => {
        const fileName = `${Date.now()}-${file.name}`;
        const { data, error } = await supabase.storage
            .from("pd_images")
            .upload(fileName, file);
        console.log(data, error);

        if (error) {
            alert("Image upload error: " + error.message);
            return null;
        }

        return supabase.storage.from("pd_images").getPublicUrl(fileName).data.publicUrl;
    };

    // Submit handler
    const handleSubmit = async () => {
        const user = await supabase.auth.getUser();
        const authId = user.data.user.id;

        const { data: patient } = await supabase
            .from("patients")
            .select("id")
            .eq("auth_id", authId)
            .single();

        let uploadedImageURL = null;
        if (imageFile) {
            uploadedImageURL = await handleImageUpload(imageFile);
        }

        const { error } = await supabase.from("pd_exchanges").insert({
            patient_id: patient.id,
            timestamp,
            baxter_strength: baxterStrength,
            fill_volume: fillVolume,
            drain_volume: drain,
            weight,
            notes, // <-- NEW
            image_url: uploadedImageURL,
        });

        if (error) {
            alert(error.message);
        } else {
            gsap.to(".submit-btn", { scale: 1.08, duration: 0.15, yoyo: true, repeat: 1 });
            alert("PD Exchange Recorded!");
        }
    };

    return (
        <>
            <div ref={containerRef} className="pd-container">

                <h2 className="pd-title">Peritoneal Dialysis (PD) Exchange</h2>
                <p>* marked fields are mandatory</p>

                {/* TIMESTAMP */}
                <div className="pd-card">
                    <label>Date & Time</label>
                    <input
                        type="datetime-local"
                        value={timestamp}
                        onChange={(e) => setTimestamp(e.target.value)}
                    />
                </div>

                {/* WEIGHT */}
                <div className="pd-card">
                    <label>Weight (kg)*</label>
                    <input
                        type="number"
                        placeholder="Enter weight"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                    />
                </div>

                {/* STRENGTH */}
                <div className="pd-card">
                    <label>Baxter Strength (%)</label>
                    <select value={baxterStrength} onChange={(e) => setBaxterStrength(e.target.value)}>
                        <option value="1.5%">1.5%</option>
                        <option value="2.5%">2.5%</option>
                        <option value="4.25%">4.25%</option>
                    </select>
                </div>

                {/* BAG */}
                <div className="pd-card">
                    <label>Bag Volume (mL)</label>
                    <input
                        type="number"
                        value={bagVolume}
                        onChange={(e) => setBagVolume(Number(e.target.value))}
                    />
                </div>

                <div className="pd-card">
                    <label>Leftover in Bag (mL)*</label>
                    <input
                        type="number"
                        value={leftover}
                        onChange={(e) => setLeftover(Number(e.target.value))}
                    />
                </div>

                {/* DRAIN */}
                <div className="pd-card">
                    <label>Drain (mL)*</label>
                    <input
                        type="number"
                        value={drain}
                        onChange={(e) => setDrain(Number(e.target.value))}
                    />
                </div>

                {/* UF */}
                <div className="uf-display-box">
                    <div className="uf-title">UF:</div>
                    <div className={`uf-value ${uf < 0 ? "uf-neg" : "uf-pos"}`}>
                        {isNaN(uf) ? "-" : `${uf} mL`}
                    </div>
                </div>

                {/* IMAGE UPLOAD */}
                <div className="pd-card">
                    <label>Upload Drain Image (optional)</label>
                    <div className="file-upload-wrapper">
                        <label className="file-upload-btn" htmlFor="drainImage">
                            Choose Image
                        </label>

                        <input
                            id="drainImage"
                            type="file"
                            accept="image/*"
                            className="file-upload-input"
                            onChange={(e) => handleImageChange(e.target.files[0])}
                        />

                        {previewURL && <img src={previewURL} alt="preview" className="image-preview" />}

                        <span className="file-upload-name">
                            {imageFile ? imageFile.name : "No file chosen"}
                        </span>
                    </div>
                </div>

                {/* NOTES */}
                <div className="pd-card">
                    <label>Notes (optional)</label>
                    <textarea
                        placeholder="Enter observations (cloudiness, discomfort, fibrin, color, smell, etc.)"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="pd-notes"
                        rows={3}
                    ></textarea>
                </div>

                <button className="submit-btn" onClick={handleSubmit}>
                    Save Exchange
                </button>
            </div>

            <br /><br /><br />
            <MobileNav />
        </>
    );
}
