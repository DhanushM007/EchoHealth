// -----------------------------------
// PREDICTION CARD
// -----------------------------------

function PredictionCard({
  disease,
  confidence,
  symptoms,
  risk,
  topPredictions = [],
  predictionStrength = "Moderate",
}) {

  // ---- RISK STYLES ----
  const riskStyles = {
    Low: {
      badge: "border-emerald-200 text-emerald-700 bg-emerald-50",
      bar: "bg-emerald-500",
    },
    Moderate: {
      badge: "border-amber-200 text-amber-700 bg-amber-50",
      bar: "bg-amber-500",
    },
    High: {
      badge: "border-red-200 text-red-600 bg-red-50",
      bar: "bg-red-500",
    },
  };

  const riskStyle = riskStyles[risk] || riskStyles.Low;

  // ---- CONFIDENCE COLOR ----
  const confidenceColor =
    confidence >= 70
      ? "text-purple-600"
      : confidence >= 45
      ? "text-amber-600"
      : "text-gray-500";

  // ---- STRENGTH BADGE ----
  const strengthBadge = {
    Strong: "bg-purple-100 text-purple-700",
    Moderate: "bg-blue-100 text-blue-700",
    Weak: "bg-gray-100 text-gray-600",
    Uncertain: "bg-gray-100 text-gray-500",
  };

  return (
    <div className="bg-white border border-gray-200 rounded-[24px] shadow-lg p-6 w-full max-w-[400px] hover:shadow-xl transition-shadow duration-300">

      {/* ---- HEADER ---- */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-purple-100 flex items-center justify-center text-xl shrink-0">
            🩺
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 leading-tight">
              {disease || "Unknown"}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Primary Prediction</p>
          </div>
        </div>

        {/* Strength Badge */}
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${strengthBadge[predictionStrength] || strengthBadge.Moderate}`}>
          {predictionStrength}
        </span>
      </div>

      {/* ---- CONFIDENCE ---- */}
      <div className="mb-5">
        <div className="flex items-end justify-between mb-1.5">
          <p className="text-xs text-gray-400 font-medium">Model Confidence</p>
          <span className={`text-2xl font-bold ${confidenceColor}`}>
            {confidence || 0}%
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-700 ${
              confidence >= 70 ? "bg-purple-500" : confidence >= 45 ? "bg-amber-400" : "bg-gray-400"
            }`}
            style={{ width: `${Math.min(confidence, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* ---- STATUS TAGS ---- */}
      <div className="flex flex-wrap gap-2 mb-5">
        <span className="px-3 py-1 rounded-full border border-purple-200 text-purple-700 text-xs font-medium bg-purple-50">
          AI ANALYZED
        </span>
        <span className={`px-3 py-1 rounded-full border text-xs font-medium ${riskStyle.badge}`}>
          {risk || "LOW"} RISK
        </span>
      </div>

      {/* ---- TOP PREDICTIONS ---- */}
      {topPredictions.length > 1 && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Differential Diagnosis
          </p>
          <div className="space-y-2">
            {topPredictions.map((pred, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-4 shrink-0">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-xs font-medium text-gray-700 truncate">
                      {pred.disease}
                    </span>
                    <span className="text-xs text-gray-400 ml-2 shrink-0">
                      {pred.confidence}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1">
                    <div
                      className={`h-1 rounded-full ${i === 0 ? "bg-purple-400" : "bg-gray-300"}`}
                      style={{ width: `${Math.min(pred.confidence, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- DETECTED SYMPTOMS ---- */}
      {symptoms?.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Detected Symptoms
          </p>
          <div className="flex flex-wrap gap-1.5">
            {symptoms.map((symptom, index) => (
              <span
                key={index}
                className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium"
              >
                {symptom.replaceAll("_", " ")}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ---- DISCLAIMER ---- */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-4">
        <p className="text-xs text-amber-700 leading-relaxed">
          ⚠️ This is an AI-assisted prediction, not a medical diagnosis. Please consult a qualified healthcare professional.
        </p>
      </div>

      {/* ---- FOOTER ---- */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500">EchoHealth AI</p>
          <p className="text-xs text-gray-400">Probabilistic Prediction</p>
        </div>
        <button className="bg-purple-600 hover:bg-purple-700 active:scale-95 text-white px-4 py-2 rounded-full text-xs font-semibold transition-all shadow-sm">
          View Details →
        </button>
      </div>

    </div>
  );
}

export default PredictionCard;
