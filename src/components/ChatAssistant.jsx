import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "../supabaseClient";
// import { PDFDocument, StandardFonts, rgb } from "pdf-lib"; // Commented out for now
import "../styles/ChatAssistant.css";

export default function ChatAssistant() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [mode, setMode] = useState("general");
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    // Loading state for Chat
    const [chatLoading, setChatLoading] = useState(false);

    // const [pdfLoading, setPdfLoading] = useState(false); // Commented out for now

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const MODEL_NAME = "gemini-flash-latest";

    // ------------------------ UPDATED SAFE SYSTEM PROMPTS ------------------------
    const SYSTEM_PROMPTS = {
        general: `You are CARE-ASSIST, a helpful informational assistant for dialysis patients. 
If PD_SESSION_DATA is included, summarize it based on standard guidelines. 
IMPORTANT: You are an AI, not a doctor. Always remind the patient to contact their nephrologist for medical decisions.
Use the supplied data to explain concepts like UF, drainage, and effluent clarity in simple, educational terms.`,

        pd: `You provide educational guidance on Peritoneal Dialysis. 
If PD_SESSION_DATA is provided, review:
- UF trends
- Fill/drain volumes
- Common troubleshooting for drainage issues (e.g., position changes)
- Effluent clarity explanations
Provide practical, non-medical troubleshooting tips (posture, massage, warming bag).
Always advise contacting the clinic if pain or fever occurs.`,

        diet: `Provide kidney-safe nutritional suggestions.
Focus on education regarding potassium, phosphorus, and sodium.
Give practical meal ideas suitable for PD patients.`,

        doctor: `You analyze PD logs to highlight data trends.
If PD_SESSION_DATA is present, summarize:
- UF patterns
- Potential indicators of issues (cloudy effluent, abdominal pain)
- Possible reasons for low UF based on physics/mechanics
Highlight "Red Flags" that require immediate doctor attention.
Do NOT provide a diagnosis; provide a summary for the doctor to review.`,

        support: `Offer emotional support.
Encourage, empathize, and motivate dialysis patients.`
    };

    // ------------------------ FETCH LATEST PD SESSION ------------------------
    async function fetchLatestPDSession() {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth?.user) return null;

        const { data, error } = await supabase
            .from("pd_exchanges")
            .select("*")
            .eq("patient_id", auth.user.id)
            .order("timestamp", { ascending: false })
            .limit(1);

        if (error) {
            console.error("Supabase error:", error);
            return null;
        }

        return data?.[0] || null;
    }

    // ------------------------ PDF REPORT (COMMENTED OUT) ------------------------
    /*
    async function fetchPastPDSessions(limit = 7) {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth?.user) return [];

        const { data, error } = await supabase
            .from("pd_exchanges")
            .select("*")
            .eq("patient_id", auth.user.id)
            .order("timestamp", { ascending: false })
            .limit(limit);

        if (error) {
            console.error("Supabase error:", error);
            return [];
        }

        return data;
    }

    async function generateAIInterpretation(sessions) {
       // ... AI logic for report ...
    }

    async function generateDoctorReport() {
       // ... PDF generation logic ...
    }
    */

    const toBase64 = (file) =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(",")[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

    // ------------------------ SEND MESSAGE ------------------------
    const sendMessage = async () => {
        if (!input.trim() && !imageFile) return;
        if (chatLoading) return;

        setChatLoading(true);

        const userMsg = {
            role: "user",
            content: input || "[Image uploaded]",
            image: imagePreview || null,
        };

        // 1. Update UI immediately
        setMessages((prev) => [...prev, userMsg]);

        let imagePart = null;
        if (imageFile) {
            const base64 = await toBase64(imageFile);
            imagePart = { inlineData: { data: base64, mimeType: imageFile.type } };
        }

        // Capture input and clear UI
        const currentInput = input;
        setInput("");
        setImageFile(null);
        setImagePreview(null);

        try {
            const pdData = await fetchLatestPDSession();
            if (!apiKey) throw new Error("Missing Gemini API Key");

            // 2. Prepare History (Use 'messages' state which represents PREVIOUS history)
            const historyForApi = messages.map((msg) => ({
                role: msg.role === "assistant" ? "model" : "user",
                parts: [{ text: msg.content }],
            }));

            // 3. Prepare Current Request
            const currentParts = [];

            if (pdData) {
                currentParts.push({
                    text: "SYSTEM_INJECTED_DATA (Patient's most recent PD Session):\n" +
                        JSON.stringify(pdData, null, 2),
                });
            }

            if (imagePart) currentParts.push(imagePart);
            currentParts.push({ text: currentInput || "Analyze this image" });

            const apiContents = [
                ...historyForApi,
                { role: "user", parts: currentParts },
            ];

            // 4. Send Request with SAFETY SETTINGS
            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        systemInstruction: {
                            parts: [{ text: SYSTEM_PROMPTS[mode] }],
                        },
                        contents: apiContents,
                        // Fix for PROHIBITED_CONTENT error:
                        safetySettings: [
                            {
                                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                                threshold: "BLOCK_NONE"
                            },
                            {
                                category: "HARM_CATEGORY_HATE_SPEECH",
                                threshold: "BLOCK_NONE"
                            },
                            {
                                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                                threshold: "BLOCK_NONE"
                            },
                            {
                                category: "HARM_CATEGORY_HARASSMENT",
                                threshold: "BLOCK_NONE"
                            }
                        ]
                    }),
                }
            );

            if (!res.ok) {
                if (res.status === 429) throw new Error("Too many requests. Please wait 1 minute.");
                const errorData = await res.json().catch(() => ({}));
                // Check if it was blocked by safety settings specifically
                if (errorData?.promptFeedback?.blockReason) {
                    throw new Error(`Blocked by safety filter: ${errorData.promptFeedback.blockReason}`);
                }
                throw new Error(errorData?.error?.message || "API Error");
            }

            const data = await res.json();
            const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "⚠️ No response received.";

            setMessages((prev) => [...prev, { role: "assistant", content: aiText }]);

        } catch (err) {
            console.error("Chat Error:", err);
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: `❌ ${err.message}` },
            ]);
        } finally {
            setChatLoading(false);
        }
    };

    return (
        <>
            {!open && (
                <button className="chat-fab" onClick={() => setOpen(true)}>🤖</button>
            )}

            {open && (
                <div className="chat-overlay" onClick={() => setOpen(false)}>
                    <div className="chat-window" onClick={(e) => e.stopPropagation()}>

                        {/* HEADER */}
                        <div className="chat-header">
                            <span>MamAI ({mode})</span>
                            {/* Report Button Commented Out */}
                            {/* <button 
                                className="report-btn" 
                                onClick={generateDoctorReport} 
                                disabled={pdfLoading}
                                style={{ opacity: pdfLoading ? 0.5 : 1, cursor: pdfLoading ? 'wait' : 'pointer' }}
                            >
                                {pdfLoading ? "Generating..." : "📄 Report"}
                            </button> 
                            */}
                            <button className="close-btn" onClick={() => setOpen(false)}>✖</button>
                        </div>

                        {/* MODES */}
                        <div className="chat-modes">
                            {Object.keys(SYSTEM_PROMPTS).map((m) => (
                                <button
                                    key={m}
                                    className={`mode-btn ${mode === m ? "active" : ""}`}
                                    onClick={() => setMode(m)}
                                >
                                    {m.charAt(0).toUpperCase() + m.slice(1)}
                                </button>
                            ))}
                        </div>

                        {/* MESSAGES */}
                        <div className="chat-body">
                            {messages.map((msg, i) => (
                                <div key={i} className={`chat-msg ${msg.role}`}>
                                    {msg.image && (
                                        <img src={msg.image} className="chat-img" alt="user upload" />
                                    )}
                                    <div className="markdown-text">
                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                    </div>
                                </div>
                            ))}
                            {chatLoading && (
                                <div className="chat-msg assistant"><p>Thinking...</p></div>
                            )}
                        </div>

                        {/* INPUT */}
                        <div className="chat-input-row">
                            <label className="img-upload" style={{ cursor: chatLoading ? 'not-allowed' : 'pointer' }}>
                                📷
                                <input
                                    type="file"
                                    accept="image/*"
                                    disabled={chatLoading}
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            setImageFile(file);
                                            setImagePreview(URL.createObjectURL(file));
                                        }
                                    }}
                                />
                            </label>

                            <input
                                className="chat-input"
                                value={input}
                                disabled={chatLoading}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                                placeholder="Ask something..."
                            />

                            <button
                                className="send-btn"
                                onClick={sendMessage}
                                disabled={chatLoading}
                            >
                                {chatLoading ? "⏳" : "➤"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}