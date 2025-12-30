import { NavLink } from "react-router-dom";
import {
    MdDashboard,
    MdAddCircleOutline,
    MdHistory,
    MdPerson
} from "react-icons/md";
// Md = Material Design icons
// You can also use "react-icons/fa" (FontAwesome) or "react-icons/fi" (Feather)

import "../styles/MobileNav.css";

export default function MobileNav() {

    return (
        <nav className="mobile-nav">

            <NavLink to="/dashboard" className="nav-btn">
                <MdDashboard className="nav-icon" />
                <span className="nav-label">Dashboard</span>
            </NavLink>

            <NavLink to="/pd-exchange" className="nav-btn">
                <MdAddCircleOutline className="nav-icon" />
                <span className="nav-label">Add PD</span>
            </NavLink>

            <NavLink to="/history" className="nav-btn">
                <MdHistory className="nav-icon" />
                <span className="nav-label">History</span>
            </NavLink>

            <NavLink to="/profile" className="nav-btn">
                <MdPerson className="nav-icon" />
                <span className="nav-label">Profile</span>
            </NavLink>

        </nav>
    );
}