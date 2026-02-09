import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "../styles/Auth.css";

export default function Signup() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        username: "",
        email: "",
        hospitalId: "",
        password: ""
    });

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    // Helper function to validate email format
    const isValidEmail = (email) => {
        // Simple but effective regex for email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleSignup = async () => {
        try {
            const { username, email, hospitalId, password } = form;

            // 1️⃣ Validate required fields
            if (!username || !email || !hospitalId || !password) {
                alert("Please fill all fields.");
                return;
            }

            // 2️⃣ Validate Email Format
            if (!isValidEmail(email)) {
                alert("Please enter a valid email address (e.g., user@example.com).");
                return;
            }

            // 3️⃣ Create user in Supabase Auth
            const { data: signupData, error: signupError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { username }
                }
            });

            if (signupError) {
                alert(signupError.message);
                return;
            }

            // Supabase returns a user object even if email confirmation is required,
            // but usually we proceed to insert into our custom table.
            const authUser = signupData.user;

            if (authUser) {
                // 4️⃣ Insert into patients table
                const { error: patientError } = await supabase.from("patients").insert({
                    auth_id: authUser.id,
                    username,
                    email,
                    hospital_id: hospitalId
                });

                if (patientError) {
                    alert(patientError.message);
                    return;
                }

                alert("Account created! You can now log in.");
                navigate("/login");
            }

        } catch (err) {
            console.error(err);
            alert("Unexpected error occurred.");
        }
    };

    return (
        <div className="auth-wrapper">

            <Link className="back-home-btn" to="/">
                ← Home
            </Link>

            <div className="auth-card">

                {/* Logo */}
                <div className="auth-logo-container">
                    <img src="/logo.png" alt="Logo" className="auth-logo" />
                </div>

                <h2 className="auth-title">Create Account</h2>
                <p className="auth-subtitle">Join CARE-ASSIST today</p>

                {/* INPUTS */}
                <input
                    type="text"
                    className="auth-input"
                    placeholder="Username"
                    name="username"
                    onChange={handleChange}
                />

                <input
                    type="email"
                    className="auth-input"
                    placeholder="Email"
                    name="email"
                    onChange={handleChange}
                />

                <input
                    type="text"
                    className="auth-input"
                    placeholder="Hospital ID"
                    name="hospitalId"
                    onChange={handleChange}
                />

                <input
                    type="password"
                    className="auth-input"
                    placeholder="Password"
                    name="password"
                    onChange={handleChange}
                />

                <button className="auth-btn" onClick={handleSignup}>
                    Sign Up
                </button>

                <p className="auth-switch">
                    Already have an account? <Link to="/login">Log in</Link>
                </p>
            </div>
        </div>
    );
}