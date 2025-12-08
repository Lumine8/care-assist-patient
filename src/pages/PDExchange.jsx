import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseClient";

import MobileNav from "../components/MobileNav";
import gsap from "gsap";
import "../styles/PdExchange.css";

export default function PDExchange() {
    console.log("PDExchange MOUNTED");

    const containerRef = useRef(null);

    const [baxterStrength, setBaxterStrength] = useState("");
    const [bagVolume, setBagVolume] = useState(2000);
    const [leftover, setLeftover] = useState(0);
    const [drain, setDrain] = useState(0);
    const [imageFile, setImageFile] = useState(null);

    const fillVolume = bagVolume - leftover;
    const uf = drain - fillVolume;

    // ------------------------------
    // GSAP ENTRY ANIMATION
    // ------------------------------
    useEffect(() => {
        const tl = gsap.timeline();
        tl.from(containerRef.current, {
            opacity: 0,
            y: 30,
            duration: 0.5,
            ease: "power2.out"
        });
        tl.from(".pd-card", {
            opacity: 0,
            y: 20,
            duration: 0.4,
            stagger: 0.12
        });
    }, []);

    // ------------------------------
    // UPLOAD IMAGE TO SUPABASE
    // ------------------------------
    const handleImageUpload = async (file) => {
        const fileName = `${Date.now()}-${file.name}`;

        const { error } = await supabase.storage
            .from("pd_images")
            .upload(fileName, file);

        if (error) {
            alert(error.message);
            return null;
        }

        return supabase.storage.from("pd_images").getPublicUrl(fileName).data.publicUrl;
    };

    // ------------------------------
    // SUBMIT TO DATABASE
    // ------------------------------
    const handleSubmit = async () => {
        const user = await supabase.auth.getUser();
        const authId = user.data.user.id;

        const { data: patient } = await supabase
            .from("patients")
            .select("id")
            .eq("auth_id", authId)
            .single();

        let imageUrl = null;
        if (imageFile) imageUrl = await handleImageUpload(imageFile);

        const { error } = await supabase.from("pd_exchanges").insert({
            patient_id: patient.id,
            baxter_strength: baxterStrength,
            fill_volume: fillVolume,
            drain_volume: drain,
            image_url: imageUrl
        });

        if (error) {
            alert(error.message);
        } else {
            gsap.to(".submit-btn", {
                scale: 1.1,
                duration: 0.2,
                yoyo: true,
                repeat: 1
            });
            alert("PD Exchange Recorded!");
        }
    };

    return (
        <>
            <div ref={containerRef} className="pd-container">
                <h2 className="pd-title">Peritoneal Dialysis Exchange</h2>

                {/* Baxter Strength */}
                <div className="pd-card">
                    <label>Baxter Strength (%)</label>
                    <select value={baxterStrength} onChange={(e) => setBaxterStrength(e.target.value)}>
                        <option value="">Select strength</option>
                        <option value="1.5%">1.5%</option>
                        <option value="2.5%">2.5%</option>
                        <option value="4.25%">4.25%</option>
                    </select>
                </div>

                {/* Bag Volume */}
                <div className="pd-card">
                    <label>Bag Volume (mL)</label>
                    <input
                        type="number"
                        value={bagVolume}
                        onChange={(e) => setBagVolume(Number(e.target.value))}
                    />
                </div>

                {/* Leftover */}
                <div className="pd-card">
                    <label>Leftover in Bag (mL)</label>
                    <input
                        type="number"
                        value={leftover}
                        onChange={(e) => setLeftover(Number(e.target.value))}
                    />
                </div>

                {/* Drain */}
                <div className="pd-card">
                    <label>Drain (mL)</label>
                    <input
                        type="number"
                        value={drain}
                        onChange={(e) => setDrain(Number(e.target.value))}
                    />
                </div>

                {/* UF RESULT */}
                <div className="pd-card uf-display">
                    UF:{" "}
                    <span className={uf >= 0 ? "uf-pos" : "uf-neg"}>
                        {isNaN(uf) ? "-" : `${uf} mL`}
                    </span>
                </div>

                {/* Image Upload */}
                <div className="pd-card">
                    <label>Upload Drain Image (optional)</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setImageFile(e.target.files[0])}
                    />
                </div>

                {/* SUBMIT BUTTON */}
                <button className="submit-btn" onClick={handleSubmit}>
                    Save Exchange
                </button>
                <br /><br />
                <br /><br />
            </div>
            <MobileNav />
        </>
    );
}
