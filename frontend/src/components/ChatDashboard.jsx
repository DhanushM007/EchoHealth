import { useEffect, useRef, useState } from "react";
import PredictionCard from "./PredictionCard";

// -----------------------------------
// TIMESTAMP HELPER
// -----------------------------------

function getTime() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// -----------------------------------
// CHAT DASHBOARD
// -----------------------------------

function ChatDashboard() {

  // ---- STATES ----
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [symptoms, setSymptoms] = useState([]);
  const [riskLevel, setRiskLevel] = useState("");
  const [stage, setStage] = useState("COLLECTING");
  const [topPredictions, setTopPredictions] = useState([]);
  const [severityScore, setSeverityScore] = useState(0);

  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  // ---- AUTO SCROLL ----
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, loading]);

  // ---- AUTO RESIZE TEXTAREA ----
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
    }
  }, [message]);

  // ---- SEND MESSAGE ----
  const sendMessage = async () => {
    if (!message.trim() || loading) return;

    const userMsg = {
      role: "user",
      content: message.trim(),
      time: getTime(),
    };

    const updatedChat = [...chat, userMsg];
    setChat(updatedChat);
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:5000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation: updatedChat.map(({ role, content }) => ({
            role,
            content,
          })),
        }),
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const data = await response.json();

      // Store analysis data
      setPrediction(data.prediction);
      setSymptoms(data.symptoms || []);
      setRiskLevel(data.risk_level || "");
      setStage(data.stage || "COLLECTING");
      setTopPredictions(data.top_predictions || []);
      setSeverityScore(data.severity_score || 0);

      // Add AI reply
      setChat([
        ...updatedChat,
        {
          role: "assistant",
          content: data.reply,
          time: getTime(),
          stage: data.stage,
        },
      ]);

    } catch (error) {
      console.error(error);
      setChat([
        ...updatedChat,
        {
          role: "assistant",
          content:
            "I'm having trouble reaching my servers right now. Please try again in a moment.",
          time: getTime(),
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ---- ENTER KEY ----
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ---- NEW CHAT ----
  const resetChat = () => {
    setChat([]);
    setPrediction(null);
    setSymptoms([]);
    setRiskLevel("");
    setStage("COLLECTING");
    setTopPredictions([]);
    setSeverityScore(0);
    setMessage("");
  };

  // ---- RISK COLOR ----
  const riskColor = {
    Low: "text-emerald-600 bg-emerald-50 border-emerald-200",
    Moderate: "text-amber-600 bg-amber-50 border-amber-200",
    High: "text-red-600 bg-red-50 border-red-200",
  };

  const isEmergency = stage === "EMERGENCY";

  // ---- UI ----
  return (
    <div className="min-h-screen bg-[#f0f2f5] p-4 md:p-6 font-sans">
      <div className="max-w-7xl mx-auto bg-white rounded-[28px] shadow-2xl overflow-hidden flex h-[calc(100vh-48px)]">

        {/* ---- SIDEBAR ---- */}
        <div className="w-[260px] shrink-0 bg-[#fafafa] border-r flex flex-col h-full">

          {/* Logo */}
          <div className="p-6 border-b">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white text-lg">
                ✦
              </div>
              <h1 className="text-xl font-bold text-gray-900">EchoHealth</h1>
            </div>
            <p className="text-xs text-gray-400 mt-1 ml-12">AI Diagnostic Assistant</p>
          </div>

          {/* Nav */}
          <div className="p-4 space-y-1 border-b">
            <button className="w-full bg-purple-50 text-purple-700 rounded-xl px-4 py-2.5 text-left text-sm font-semibold">
              💬 AI Health Chat
            </button>
            <button className="w-full hover:bg-gray-100 rounded-xl px-4 py-2.5 text-left text-sm text-gray-600">
              🔬 Symptom Analysis
            </button>
            <button className="w-full hover:bg-gray-100 rounded-xl px-4 py-2.5 text-left text-sm text-gray-600">
              🧬 Disease Prediction
            </button>
            <button className="w-full hover:bg-gray-100 rounded-xl px-4 py-2.5 text-left text-sm text-gray-600">
              📊 Health Insights
            </button>
          </div>

          {/* Live Analysis Panel */}
          {(symptoms.length > 0 || riskLevel) && (
            <div className="p-4 border-b">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Live Analysis
              </p>

              {riskLevel && (
                <div className={`text-xs font-medium px-3 py-1.5 rounded-full border inline-block mb-3 ${riskColor[riskLevel] || "text-gray-600 bg-gray-50 border-gray-200"}`}>
                  {riskLevel} Risk · Score {severityScore}
                </div>
              )}

              {symptoms.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-2">Detected Symptoms</p>
                  <div className="flex flex-wrap gap-1">
                    {symptoms.map((s, i) => (
                      <span
                        key={i}
                        className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full"
                      >
                        {s.replaceAll("_", " ")}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recent Chats */}
          <div className="p-4 flex-1 overflow-y-auto">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Recent Chats
            </p>
            <div className="space-y-2">
              {["Fever and body pain", "Persistent headache", "Skin allergy symptoms"].map((item, i) => (
                <button
                  key={i}
                  className="w-full text-left text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 px-3 py-2 rounded-lg truncate"
                >
                  {item}...
                </button>
              ))}
            </div>
          </div>

          {/* User Card */}
          <div className="p-4 border-t">
            <div className="bg-white border rounded-2xl p-3 flex items-center gap-3 shadow-sm">
              <div className="w-9 h-9 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                DM
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-gray-800 truncate">Dhanush M</p>
                <p className="text-xs text-gray-400">EchoHealth User</p>
              </div>
            </div>
          </div>
        </div>

        {/* ---- MAIN CHAT ---- */}
        <div className="flex-1 flex flex-col h-full min-w-0">

          {/* Top Bar */}
          <div className="flex items-center justify-between px-8 py-4 border-b bg-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-sm font-semibold text-gray-700">EchoHealth AI</span>
              {stage === "READY_FOR_PREDICTION" && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                  Analysis Ready
                </span>
              )}
              {isEmergency && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold animate-pulse">
                  ⚠️ Emergency
                </span>
              )}
            </div>
            <button
              onClick={resetChat}
              className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-full text-sm font-medium transition-colors"
            >
              + New Chat
            </button>
          </div>

          {/* Chat Area */}
          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">

            {/* Welcome State */}
            {chat.length === 0 && (
              <div className="flex flex-col items-start max-w-lg pt-6">
                <div className="w-14 h-14 rounded-2xl bg-purple-600 flex items-center justify-center text-white text-2xl mb-5 shadow-lg">
                  ✦
                </div>
                <h1 className="text-4xl font-bold text-gray-900 leading-tight mb-3">
                  Hi, I'm <span className="text-purple-600">EchoHealth</span>
                </h1>
                <p className="text-gray-500 text-base mb-6">
                  Tell me what you're feeling and I'll help you understand your symptoms.
                </p>

                {/* Suggestion Chips */}
                <div className="flex flex-wrap gap-2">
                  {[
                    "I have a fever and headache",
                    "My stomach has been hurting",
                    "I've had a cough for 3 days",
                    "I feel tired all the time",
                  ].map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => setMessage(suggestion)}
                      className="text-sm border border-gray-200 rounded-full px-4 py-2 hover:border-purple-400 hover:bg-purple-50 hover:text-purple-700 transition-all text-gray-600"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {chat.map((msg, index) => (
              <div
                key={index}
                className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
              >
                {/* Bubble */}
                <div
                  className={`max-w-[72%] px-5 py-3.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                    msg.role === "user"
                      ? "bg-purple-600 text-white rounded-br-sm"
                      : msg.isError
                      ? "bg-red-50 border border-red-200 text-red-700 rounded-bl-sm"
                      : isEmergency && index === chat.length - 1
                      ? "bg-red-600 text-white rounded-bl-sm"
                      : "bg-gray-50 border border-gray-200 text-gray-800 rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                </div>

                {/* Timestamp */}
                {msg.time && (
                  <span className="text-[11px] text-gray-400 mt-1 px-1">
                    {msg.time}
                  </span>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {loading && (
              <div className="flex items-start gap-2">
                <div className="bg-gray-50 border border-gray-200 px-5 py-3.5 rounded-2xl rounded-bl-sm shadow-sm">
                  <div className="flex gap-1.5 items-center h-4">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                  </div>
                </div>
              </div>
            )}

            {/* Prediction Card */}
            {prediction && stage === "READY_FOR_PREDICTION" && (
              <div className="flex justify-start mt-2">
                <PredictionCard
                  disease={prediction.disease}
                  confidence={prediction.confidence}
                  symptoms={symptoms}
                  risk={riskLevel}
                  topPredictions={topPredictions}
                  predictionStrength={prediction.prediction_strength}
                />
              </div>
            )}

            <div ref={chatEndRef}></div>
          </div>

          {/* Input Area */}
          <div className="px-8 pb-6 shrink-0">
            <div className={`bg-white border-2 rounded-[20px] shadow-sm overflow-hidden transition-colors ${
              isEmergency
                ? "border-red-300"
                : loading
                ? "border-purple-200"
                : "border-gray-200 focus-within:border-purple-400"
            }`}>
              <textarea
                ref={textareaRef}
                placeholder={
                  isEmergency
                    ? "Please seek emergency care immediately..."
                    : "Describe your symptoms..."
                }
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                className="w-full resize-none outline-none px-5 pt-4 pb-2 text-sm text-gray-800 placeholder-gray-400 leading-relaxed max-h-40 overflow-y-auto"
              />

              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
                <div className="flex gap-2">
                  <button className="border border-gray-200 px-3 py-1.5 rounded-full text-xs hover:bg-gray-50 text-gray-500 transition-colors">
                    📎 Attach Reports
                  </button>
                  <button className="border border-gray-200 px-3 py-1.5 rounded-full text-xs hover:bg-gray-50 text-gray-500 transition-colors">
                    🖼️ Upload Image
                  </button>
                </div>

                <button
                  onClick={sendMessage}
                  disabled={loading || !message.trim()}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold transition-all ${
                    loading || !message.trim()
                      ? "bg-gray-200 cursor-not-allowed"
                      : "bg-purple-600 hover:bg-purple-700 hover:scale-105 shadow-md"
                  }`}
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    "↑"
                  )}
                </button>
              </div>
            </div>

            <p className="text-center text-xs text-gray-400 mt-2">
              EchoHealth AI · For informational purposes only · Not a substitute for professional medical advice
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatDashboard;
