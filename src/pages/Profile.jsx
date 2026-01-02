import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import gsap from "gsap";
import "../styles/Profile.css";
import MobileNav from "../components/MobileNav";

export default function Profile() {
    const containerRef = useRef(null);
    const [profile, setProfile] = useState(null);

    const loadProfile = async () => {
        const { data: user } = await supabase.auth.getUser();
        if (!user?.user) {
            window.location.href = "/login";
            return;
        }

        const { data: patient } = await supabase
            .from("patients")
            .select("*")
            .eq("auth_id", user.user.id)
            .single();

        setProfile(patient);
    };

    const toggleDialysisType = async () => {
        const nextType = profile.dialysis_type === "PD" ? "HD" : "PD";

        const { error } = await supabase
            .from("patients")
            .update({ dialysis_type: nextType })
            .eq("auth_id", (await supabase.auth.getUser()).data.user.id);

        if (error) {
            console.error(error);
            alert("Failed to update dialysis type");
            return;
        }

        // update UI immediately
        setProfile((prev) => ({
            ...prev,
            dialysis_type: nextType,
        }));
    };


    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = "/login";
    };

    useEffect(() => {
        const fetchProfile = async () => {
            await loadProfile();
        };
        fetchProfile();

        gsap.from(containerRef.current, {
            opacity: 0,
            y: 30,
            duration: 0.6,
            ease: "power2.out"
        });

        gsap.from(".profile-card", {
            opacity: 0,
            y: 20,
            duration: 0.5,
            stagger: 0.1,
            ease: "power1.out"
        });
    }, []);

    if (!profile) return <p style={{ padding: 20 }}>Loading...</p>;

    return (
        <>  <div ref={containerRef} className="profile-container page-padding-bottom">
            <h2 className="profile-title">My Profile</h2>

            <div className="profile-card">
                <h3>Account Details</h3>
                <p><strong>Username:</strong> {profile.username}</p>
                <p><strong>Email:</strong> {profile.email}</p>
                <p><strong>Hospital ID:</strong> {profile.hospital_id}</p>
                <p><strong>Dialysis Type:</strong> {profile.dialysis_type == "PD" ? "Peritoneal Dialysis"
                    : profile.dialysis_type == "HD" ? "Hemodialysis" : "Unknown"}</p>
            </div>

            <div className="profile-card">
                <h3>Preferences</h3>
                <p><strong>Theme:</strong> Light Mode (customizable later)</p>
                <p><strong>Meal Preferences:</strong> Coming soon</p>
            </div>

            <div className="profile-card action-card">
                <button className="profile-btn">Edit Profile</button>
                <button className="profile-btn" onClick={toggleDialysisType}>
                    {profile.dialysis_type === "PD"
                        ? "Change to Hemodialysis"
                        : "Change to Peritoneal Dialysis"}
                </button>

                <button className="logout-btn" onClick={handleLogout}>
                    Logout
                </button>
            </div>
        </div>
            <br /><br /><br /><br />
            <MobileNav />
        </>
    );
}
