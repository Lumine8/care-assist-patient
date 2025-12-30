import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import PDExchange from "./pages/PDExchange";
import Profile from "./pages/Profile";
import History from "./pages/History";
import "../src/styles/History.css"

import { Routes, Route } from "react-router-dom";
// import MobileNav from "./components/MobileNav";

function App() {

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/pd-exchange" element={<PDExchange />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/history" element={<History />} />
        <Route path="*" element={<p>404 Not Found</p>} />
      </Routes>
    </>
  );
}

export default App;
