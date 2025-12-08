import { useState } from "react";
import "../styles/ChatAssistant.css";

export default function ChatAssistant() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [mode, setMode] = useState("general");
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    const SYSTEM_PROMPTS = {
        general: "You are CARE-ASSIST, a helpful assistant.",
        pd: "You help with PD exchanges, UF, symptoms, and dialysis guidance.",
        diet: "You recommend kidney-safe foods.",
        doctor: "You analyze UF logs clinically.",
        support: "You offer emotional support to dialysis patients."
    };

    const toBase64 = (file) =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(",")[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

    const sendMessage = async () => {
        if (!input.trim() && !imageFile) return;

        const userMsg = {
            role: "user",
            content: input || "[Image uploaded]",
            image: imagePreview || null
        };

        setMessages((prev) => [...prev, userMsg]);

        let imagePart = null;

        if (imageFile) {
            const base64 = await toBase64(imageFile);
            imagePart = { inlineData: { data: base64, mimeType: imageFile.type } };
        }

        setInput("");
        setImageFile(null);
        setImagePreview(null);

        try {
            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        systemInstruction: { parts: [{ text: SYSTEM_PROMPTS[mode] }] },
                        contents: [{ parts: [...(imagePart ? [imagePart] : []), { text: input }] }]
                    }),
                }
            );

            const data = await res.json();

            const aiText =
                data?.candidates?.[0]?.content?.parts?.[0]?.text || "⚠️ No response.";

            setMessages((prev) => [...prev, { role: "assistant", content: aiText }]);
        } catch (err) {
            console.error("Error:", err);
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: "⚠️ Error. Try again." }
            ]);
        }
    };

    return (
        <>
            {/* Floating AI Button */}
            <button className="chat-fab" onClick={() => setOpen(true)}>🤖</button>

            {/* Slide-up Chat Window */}
            {open && (
                <div className="chat-overlay" onClick={() => setOpen(false)}>
                    <div className="chat-window" onClick={(e) => e.stopPropagation()}>
                        {/* HEADER */}
                        <div className="chat-header">
                            <span>CARE-ASSIST AI</span>
                            <button className="close-btn" onClick={() => setOpen(false)}>✖</button>
                        </div>

                        {/* MODES */}
                        <div className="chat-modes">
                            {["general", "pd", "diet", "doctor", "support"].map((m) => (
                                <button
                                    key={m}
                                    className={`mode-btn ${mode === m ? "active" : ""}`}
                                    onClick={() => setMode(m)}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>

                        {/* MESSAGES */}
                        <div className="chat-body">
                            {messages.map((msg, i) => (
                                <div key={i} className={`chat-msg ${msg.role}`}>
                                    {msg.image && <img src={msg.image} className="chat-img" />}
                                    <p>{msg.content}</p>
                                </div>
                            ))}
                        </div>

                        {/* IMAGE PREVIEW */}
                        {imagePreview && (
                            <div className="chat-image-preview">
                                <img src={imagePreview} alt="preview" />
                                <button onClick={() => { setImagePreview(null); setImageFile(null); }}>
                                    Remove
                                </button>
                            </div>
                        )}

                        {/* INPUT BAR */}
                        <div className="chat-input-row">
                            <label className="img-upload">
                                📷
                                <input
                                    type="file"
                                    accept="image/*"
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
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask something..."
                            />

                            <button className="send-btn" onClick={sendMessage}>➤</button>
                        </div>
                    </div>

                    <br /><br /><br /><br />
                </div>
            )}
        </>
    );
}
