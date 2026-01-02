import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import History from "./pages/History";
import Exchanges from "./pages/Exchanges"; // Import the new combined page

import "../src/styles/History.css";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/dashboard" element={<Dashboard />} />

      {/* The Exchange page now handles the HD vs PD check internally */}
      <Route path="/exchange" element={<Exchanges />} />

      <Route path="/profile" element={<Profile />} />
      <Route path="/history" element={<History />} />
      <Route path="*" element={<p>404 Not Found</p>} />
    </Routes>
  );
}

export default App;