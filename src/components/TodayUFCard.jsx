import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import gsap from "gsap";

export default function TodayUFCard() {
    const [todayUF, setTodayUF] = useState(null);

    const fetchUF = async () => {
        const user = await supabase.auth.getUser();
        const authId = user.data.user.id;

        const { data: patient } = await supabase
            .from("patients")
            .select("id")
            .eq("auth_id", authId)
            .single();

        const today = new Date().toISOString().split("T")[0];

        const { data } = await supabase
            .from("pd_exchanges")
            .select("uf")
            .eq("patient_id", patient.id)
            .gte("timestamp", `${today}T00:00`)
            .lte("timestamp", `${today}T23:59`);

        const ufSum = data?.reduce((total, row) => total + (row.uf || 0), 0) || 0;
        setTodayUF(ufSum);
    };


    useEffect(() => {
        (async () => {
            await fetchUF();
        })();

        gsap.from(".today-uf-card", {
            opacity: 0,
            y: 20,
            duration: 0.7,
            ease: "power2.out"
        });
    }, []);

    return (
        <div className="today-uf-card" style={styles.card}>
            <h3>Today’s Total UF</h3>
            <h1 style={{ color: todayUF >= 0 ? "red" : "green" }}>
                {todayUF} mL
            </h1>
        </div>
    );
}

const styles = {
    card: {
        background: "#e8f0fe",
        padding: 20,
        borderRadius: 14,
        textAlign: "center",
        marginBottom: 20,
        boxShadow: "0 3px 10px rgba(0,0,0,0.1)"
    }
};
