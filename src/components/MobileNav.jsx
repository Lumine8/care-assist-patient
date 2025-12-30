import { NavLink, } from "react-router-dom";
import "../styles/MobileNav.css";

export default function MobileNav() {

    return (
        <nav className="mobile-nav">

            <NavLink to="/dashboard" className="nav-btn">
                <span className="nav-icon">📊</span>
                <span className="nav-label">Dashboard</span>
            </NavLink>

            <NavLink to="/pd-exchange" className="nav-btn">
                <span className="nav-icon">➕</span>
                <span className="nav-label">Add PD</span>
            </NavLink>

            <NavLink to="/history" className="nav-btn">
                <span className="nav-icon">📈</span>
                <span className="nav-label">History</span>
            </NavLink>

            <NavLink to="/profile" className="nav-btn">
                <span className="nav-icon">👤</span>
                <span className="nav-label">Profile</span>
            </NavLink>

        </nav>
    );
}
