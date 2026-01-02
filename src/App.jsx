import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { supabase } from "./supabaseClient";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import History from "./pages/History";
import PDExchange from "./pages/PDExchange";
import HDExchange from "./pages/HDExchange";

import "../src/styles/History.css";

function App() {
  const [dialysisType, setDialysisType] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let subscription;

    const fetchAndSubscribe = async () => {
      // 1. Get Current User
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // 2. Initial Fetch
        const { data } = await supabase
          .from('patients')
          .select('dialysis_type')
          .eq('auth_id', user.id)
          .single();

        if (data) setDialysisType(data.dialysis_type);

        // 3. ⚡️ REALTIME LISTENER
        // This listens for any UPDATE on the patients table for this user
        subscription = supabase
          .channel('patient-updates')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'patients',
              filter: `auth_id=eq.${user.id}`,
            },
            (payload) => {
              console.log("Change detected!", payload);
              // Update state immediately when DB changes
              setDialysisType(payload.new.dialysis_type);
            }
          )
          .subscribe();
      }
      setLoading(false);
    };

    fetchAndSubscribe();

    // Cleanup listener when app closes
    return () => {
      if (subscription) supabase.removeChannel(subscription);
    };
  }, []);

  if (loading) return <div className="loading-screen">Loading...</div>;

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/dashboard" element={<Dashboard />} />

      {/* ⚡️ This will now switch instantly when dialysisType changes */}
      <Route
        path="/exchange"
        element={dialysisType === "HD" ? <HDExchange /> : <PDExchange />}
      />

      <Route path="/profile" element={<Profile />} />
      <Route path="/history" element={<History />} />
      <Route path="*" element={<p>404 Not Found</p>} />
    </Routes>
  );
}

export default App;