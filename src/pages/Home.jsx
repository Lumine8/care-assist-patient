import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import {
    MdWaterDrop,
    MdTimeline,
    MdHealthAndSafety,
    MdShare,
    MdCheckCircle
} from "react-icons/md";
import "../styles/Home.css";

export default function Home() {
    const containerRef = useRef(null);
    const phoneRef = useRef(null);
    const screenRef = useRef(null);

    useEffect(() => {
        // GSAP Context handles cleanup automatically
        let ctx = gsap.context(() => {

            // 1. Entrance Animations (HERO ONLY)
            const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

            tl.from(".hero-content > *", {
                y: 30,
                opacity: 0,
                duration: 0.8,
                stagger: 0.1
            })
                .from(phoneRef.current, {
                    y: 50,
                    opacity: 0,
                    rotationX: 15,
                    duration: 1
                }, "-=0.6");

            // REMOVED THE FEATURE CARD ANIMATION CAUSING THE BUG

        }, containerRef);

        return () => ctx.revert();
    }, []);

    // 2. Parallax Logic
    const handleParallax = (e) => {
        if (window.innerWidth < 768 || !phoneRef.current) return;

        const phone = phoneRef.current;
        const rect = phone.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;

        phone.style.setProperty("--tiltX", `${y * -10}deg`);
        phone.style.setProperty("--tiltY", `${x * 10}deg`);

        if (screenRef.current) {
            screenRef.current.style.transform = `translate(${x * 20}px, ${y * 20}px)`;
        }
    };

    const handleLeave = () => {
        if (!phoneRef.current) return;
        phoneRef.current.style.setProperty("--tiltX", "0deg");
        phoneRef.current.style.setProperty("--tiltY", "0deg");
        if (screenRef.current) {
            screenRef.current.style.transform = `translate(0px, 0px)`;
        }
    };

    return (
        <div className="home" ref={containerRef}>

            <div className="hero-wrapper">
                {/* LEFT: TEXT CONTENT */}
                <section className="hero-content">
                    <img src="/logo.png" alt="Care-Assist Logo" className="hero-logo" />
                    <br />
                    <div className="badge">New: Patient Portal 2.0</div>
                    <h1 className="hero-title">
                        Your <span className="highlight">Dialysis</span> <br />
                        Companion.
                    </h1>
                    <p className="hero-subtitle">
                        Track UF trends, manage PD exchanges, and share health insights
                        with your nephrologist instantly.
                    </p>

                    <div className="hero-buttons">
                        <Link to="/login" className="btn primary">Login</Link>
                        <Link to="/signup" className="btn secondary">Create Account</Link>
                    </div>

                    <div className="trust-badges">
                        <span>🛡️ HIPAA Compliant</span>
                        <span>🔒 Secure Data</span>
                    </div>
                </section>

                {/* RIGHT: INTERACTIVE PHONE */}
                <div
                    className="phone-container"
                    onMouseMove={handleParallax}
                    onMouseLeave={handleLeave}
                >
                    <div className="phone-mockup" ref={phoneRef}>
                        <div className="notch"></div>
                        <div className="screen" ref={screenRef}>
                            {/* Fake App UI */}
                            <div className="app-header">
                                <div className="time">9:41</div>
                                <div>📶 🔋</div>
                            </div>
                            <div className="app-content">
                                <div className="app-card">
                                    <small>Today's Total UF</small>
                                    <h2>-420 mL</h2>
                                    <div className="mini-chart">
                                        <div className="bar" style={{ height: '40%' }}></div>
                                        <div className="bar" style={{ height: '70%' }}></div>
                                        <div className="bar" style={{ height: '50%' }}></div>
                                        <div className="bar active" style={{ height: '85%' }}></div>
                                    </div>
                                </div>
                                <div className="list-item">
                                    <div className="dot yellow"></div>
                                    <div>
                                        <strong>1.5% Dextrose</strong><br />
                                        <small style={{ color: '#94a3b8' }}>8:00 AM</small>
                                    </div>
                                    <span className="val">-120</span>
                                </div>
                                <div className="list-item">
                                    <div className="dot green"></div>
                                    <div>
                                        <strong>2.5% Dextrose</strong><br />
                                        <small style={{ color: '#94a3b8' }}>12:30 PM</small>
                                    </div>
                                    <span className="val">-180</span>
                                </div>
                            </div>
                        </div>
                        <div className="glare"></div>
                    </div>
                </div>
            </div>

            {/* FEATURES SECTION */}
            <section className="features-section">
                <div className="section-header-center">
                    <h2>Everything you need</h2>
                    <p>Designed for PD patients, by experts.</p>
                </div>

                <div className="feature-grid">
                    <FeatureCard
                        icon={<MdWaterDrop />}
                        title="Smart PD Logs"
                        desc="Record fill, drain, concentration & UF instantly."
                    />
                    <FeatureCard
                        icon={<MdTimeline />}
                        title="Visual Trends"
                        desc="Spot fluid retention early with clear graphs."
                    />
                    <FeatureCard
                        icon={<MdHealthAndSafety />}
                        title="Health Vitals"
                        desc="Log BP, Weight, and Blood Sugar in one place."
                    />
                    <FeatureCard
                        icon={<MdShare />}
                        title="Clinician Sync"
                        desc="Securely share PDF reports with your doctor."
                    />
                </div>
            </section>

            {/* WHY SECTION (UPDATED LIST) */}
            <section className="why-section">
                <div className="why-content">
                    <h2>Why use Care-Assist?</h2>
                    <ul className="why-list">
                        <li>
                            <MdCheckCircle className="check-icon" />
                            <span><strong>Prevent Complications</strong>Avoid dangerous over-draining.</span>
                        </li>
                        <li>
                            <MdCheckCircle className="check-icon" />
                            <span><strong>Visualize Trends</strong>Spot fluid balance changes instantly.</span>
                        </li>
                        <li>
                            <MdCheckCircle className="check-icon" />
                            <span><strong>Go Paperless</strong>Ditch the notebook for secure logs.</span>
                        </li>
                        <li>
                            <MdCheckCircle className="check-icon" />
                            <span><strong>Better Doctor Visits</strong>Share accurate reports easily.</span>
                        </li>
                    </ul>
                </div>
            </section>

            <footer className="footer">
                <p>Made with <span className="heart">❤️</span> to support dialysis patients.</p>
                <p>© 2025 Care-Assist. Making dialysis easier.</p>
            </footer>
        </div>
    );
}

function FeatureCard({ icon, title, desc }) {
    return (
        <div className="feature-card">
            <div className="icon-box">{icon}</div>
            <h3>{title}</h3>
            <p>{desc}</p>
        </div>
    );
}