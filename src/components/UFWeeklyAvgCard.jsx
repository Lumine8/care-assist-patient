import { useEffect, useState, useCallback } from "react";
import "../styles/UFWeeklyAvgCard.css";
import { supabase } from "../supabaseClient";

export default function UFWeeklyAvgCard() {
    const [avgUF, setAvgUF] = useState(null);

    const loadWeeklyAvg = useCallback(async () => {
        const { data: user } = await supabase.auth.getUser();
        if (!user?.user) return;

        const authId = user.user.id;

        const { data: patient } = await supabase
            .from("patients")
            .select("id")
            .eq("auth_id", authId)
            .single();

        if (!patient?.id) return;

        // 🗓 Get date 7 days ago (only YYYY-MM-DD)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysISO = sevenDaysAgo.toISOString().split("T")[0];

        // 🔥 Query using timestamp instead of created_at
        const { data } = await supabase
            .from("pd_exchanges")
            .select("uf, timestamp")
            .eq("patient_id", patient.id)
            .gte("timestamp", `${sevenDaysISO}T00:00`)
            .order("timestamp", { ascending: true });

        if (!data || data.length === 0) {
            setAvgUF(0);
            return;
        }

        const total = data.reduce((sum, r) => sum + Number(r.uf || 0), 0);
        setAvgUF(Math.round(total / data.length));

    }, []);

    // ⬇️ Keep useEffect EXACTLY as asked
    useEffect(() => {
        const run = async () => await loadWeeklyAvg();
        run();
    }, [loadWeeklyAvg]);

    return (
        <div className="uf-card">
            <div className="uf-card-title">7-Day Avg UF</div>

            <div className="uf-card-value" style={{ color: avgUF < 0 ? "#008f5a" : "#d9534f" }}>
                {avgUF !== null ? `${avgUF} mL` : "Loading..."}
            </div>
        </div>
    );
}
