from flask import Flask, request, jsonify
from flask_cors import CORS

from google import genai
from dotenv import load_dotenv

from ml_server.predict import predict_disease

import os
import joblib
import json
import re
import pandas as pd

# -----------------------------------
# LOAD ENV
# -----------------------------------

load_dotenv()

# -----------------------------------
# FLASK SETUP
# -----------------------------------

app = Flask(__name__)
CORS(app)

# -----------------------------------
# GEMINI CLIENT
# -----------------------------------

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

# -----------------------------------
# LOAD ML ASSETS
# -----------------------------------

KNOWN_SYMPTOMS = joblib.load("ml_server/symptoms.pkl")

severity_df = pd.read_csv("datasets/Symptom-severity.csv")

severity_dict = {
    row["Symptom"].strip(): int(row["weight"])
    for _, row in severity_df.iterrows()
}

# -----------------------------------
# SYSTEM PROMPT — CONVERSATION AI
# -----------------------------------

SYSTEM_PROMPT = """You are EchoHealth, an AI-powered medical triage assistant built to help users understand their symptoms before seeing a doctor.

PERSONALITY:
- Calm, empathetic, and professional — like a knowledgeable friend who happens to be a doctor
- Never robotic. Speak naturally, not in bullet lists or formal headers
- Acknowledge the patient's discomfort before asking questions

YOUR ROLE:
- Progressively gather symptoms through natural conversation
- Ask ONE focused follow-up question at a time
- Build a complete symptom picture before triggering diagnosis
- Identify severity clues: duration, onset, intensity, triggers

STRICT RULES:
1. Never diagnose with certainty — always say "may suggest", "could indicate", "is consistent with"
2. Never prescribe medications
3. Never dismiss symptoms as minor without asking follow-up
4. If user mentions chest pain + breathlessness, immediately advise seeking emergency care
5. Do NOT repeat questions already asked in conversation
6. Keep responses under 60 words unless delivering final analysis
7. Always end collecting-phase responses with a single question

CONVERSATION PHASES:
- Phase 1 (< 3 symptoms or < 3 exchanges): Gently collect symptoms, ask clarifying questions
- Phase 2 (3-5 symptoms): Narrow down with discriminative questions (duration, location, severity)
- Phase 3 (prediction ready): Deliver assessment naturally, mention top possibilities, give actionable advice"""

# -----------------------------------
# EMERGENCY SYMPTOMS
# -----------------------------------

EMERGENCY_SYMPTOMS = {
    "chest_pain", "breathlessness", "loss_of_consciousness",
    "sudden_severe_headache", "paralysis", "slurred_speech"
}

# -----------------------------------
# FORMAT CONVERSATION FOR PROMPTS
# -----------------------------------

def format_conversation(conversation):
    lines = []
    for msg in conversation:
        role = "Patient" if msg["role"] == "user" else "EchoHealth"
        lines.append(f"{role}: {msg['content']}")
    return "\n".join(lines)


# -----------------------------------
# AI SYMPTOM EXTRACTION
# -----------------------------------

def extract_symptoms_using_ai(conversation):

    formatted = format_conversation(conversation)
    symptoms_text = ", ".join(KNOWN_SYMPTOMS)

    prompt = f"""You are a medical NLP system specialized in symptom extraction.

TASK: Extract all medical symptoms the patient has mentioned throughout the entire conversation.

RULES:
- Map natural language to standardized symptom names from the allowed list ONLY
- "high fever" → "high_fever", "runny nose" → "runny_nose", "throwing up" → "vomiting"
- Ignore vague complaints that don't map to a specific symptom
- Do NOT hallucinate symptoms not mentioned by the patient
- Return ONLY a valid JSON array of strings
- No markdown, no explanation, no preamble

ALLOWED SYMPTOMS:
{symptoms_text}

CONVERSATION:
{formatted}

OUTPUT (JSON array only):"""

    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt
        )
        raw = response.text.strip()

        # Strip markdown code fences if present
        raw = re.sub(r"```[a-z]*\n?", "", raw).strip()

        detected = json.loads(raw)

        # Validate against known symptoms
        filtered = [s for s in detected if s in KNOWN_SYMPTOMS]
        return list(set(filtered))

    except Exception as e:
        print(f"\nSYMPTOM EXTRACTION ERROR: {e}")
        return []


# -----------------------------------
# SEVERITY + RISK
# -----------------------------------

def calculate_severity(symptoms):
    return sum(severity_dict.get(s, 0) for s in symptoms)


def get_risk_level(score):
    if score <= 4:
        return "Low"
    elif score <= 10:
        return "Moderate"
    else:
        return "High"


# -----------------------------------
# CHAT STAGE LOGIC
# -----------------------------------

def determine_chat_stage(symptoms, conversation):

    user_messages = [m for m in conversation if m["role"] == "user"]

    # Emergency override
    emergency_detected = any(s in EMERGENCY_SYMPTOMS for s in symptoms)
    if emergency_detected:
        return "EMERGENCY"

    # Need at least 3 symptoms and 3 user messages for prediction
    if len(symptoms) >= 3 and len(user_messages) >= 3:
        return "READY_FOR_PREDICTION"

    return "COLLECTING"


# -----------------------------------
# COLLECTING PHASE PROMPT
# -----------------------------------

def build_collecting_prompt(conversation, symptoms, risk_level):

    formatted = format_conversation(conversation)
    symptom_str = ", ".join(symptoms) if symptoms else "none detected yet"

    return f"""{SYSTEM_PROMPT}

---
CURRENT CONVERSATION:
{formatted}

---
SYMPTOMS IDENTIFIED SO FAR: {symptom_str}
CURRENT RISK ESTIMATE: {risk_level}

---
INSTRUCTION: You are in the SYMPTOM COLLECTION phase.
- Acknowledge the patient's last message naturally
- Do NOT repeat what they said back to them word for word
- Ask ONE specific, medically relevant follow-up question
- If no symptoms yet, ask them to describe what they're feeling
- Keep your response under 60 words
- Be warm and reassuring"""


# -----------------------------------
# PREDICTION PHASE PROMPT
# -----------------------------------

def build_prediction_prompt(conversation, symptoms, risk_level, severity_score, top_predictions):

    formatted = format_conversation(conversation)
    symptom_str = ", ".join(symptoms)

    top_str = "\n".join([
        f"  {i+1}. {p['disease']} ({p['confidence']}% confidence)"
        for i, p in enumerate(top_predictions)
    ])

    return f"""{SYSTEM_PROMPT}

---
CURRENT CONVERSATION:
{formatted}

---
SYMPTOMS IDENTIFIED: {symptom_str}
SEVERITY SCORE: {severity_score}
RISK LEVEL: {risk_level}

ML PREDICTION RESULTS:
{top_str}

---
INSTRUCTION: You are in the ASSESSMENT DELIVERY phase.
- Begin with a brief acknowledgment of their symptoms
- Mention the top 1-2 likely conditions naturally (e.g., "Based on what you've described, this could be consistent with...")
- Explain briefly WHY (which symptoms point to this)
- Give 2-3 practical precautions or home care tips
- Clearly state when they should see a doctor (be specific about urgency based on risk level)
- End with a reassuring but honest note
- Do NOT use headers or bullet points — write in natural flowing paragraphs
- Keep total response under 120 words"""


# -----------------------------------
# EMERGENCY PROMPT
# -----------------------------------

def build_emergency_prompt(conversation, symptoms):

    formatted = format_conversation(conversation)
    symptom_str = ", ".join(symptoms)

    return f"""You are EchoHealth AI. The patient has reported potentially serious symptoms.

DETECTED CRITICAL SYMPTOMS: {symptom_str}

CONVERSATION:
{formatted}

INSTRUCTION:
- Express immediate concern and empathy
- Clearly advise them to seek emergency medical care or call emergency services NOW
- Do not minimize or hedge — be direct
- Keep response under 50 words"""


# -----------------------------------
# CHAT ROUTE
# -----------------------------------

@app.route("/chat", methods=["POST"])
def chat():

    data = request.json
    conversation = data.get("conversation", [])

    # ---- EXTRACT SYMPTOMS ----
    symptoms = extract_symptoms_using_ai(conversation)
    print(f"\n[SYMPTOMS] {symptoms}")

    # ---- SEVERITY & RISK ----
    severity_score = calculate_severity(symptoms)
    risk_level = get_risk_level(severity_score)
    print(f"[SEVERITY] {severity_score} → {risk_level}")

    # ---- STAGE ----
    stage = determine_chat_stage(symptoms, conversation)
    print(f"[STAGE] {stage}")

    prediction_result = None

    # ---- BUILD PROMPT ----
    if stage == "EMERGENCY":
        prompt = build_emergency_prompt(conversation, symptoms)

    elif stage == "COLLECTING":
        prompt = build_collecting_prompt(conversation, symptoms, risk_level)

    else:  # READY_FOR_PREDICTION
        prediction_result = predict_disease(symptoms)
        print(f"[PREDICTION] {prediction_result}")

        prompt = build_prediction_prompt(
            conversation,
            symptoms,
            risk_level,
            severity_score,
            prediction_result["top_predictions"]
        )

    # ---- GENERATE RESPONSE ----
    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt
        )
        final_reply = response.text.strip()

    except Exception as e:
        print(f"\n[GEMINI ERROR] {e}")
        final_reply = (
            "I'm having trouble connecting right now. "
            "Please try again in a moment."
        )

    # ---- TOP PREDICTIONS ----
    top_predictions = []
    if prediction_result:
        top_predictions = prediction_result.get("top_predictions", [])

    # ---- RESPONSE ----
    return jsonify({
        "reply": final_reply,
        "stage": stage,
        "symptoms": symptoms,
        "severity_score": severity_score,
        "risk_level": risk_level,
        "prediction": prediction_result,
        "top_predictions": top_predictions,
    })


# -----------------------------------
# RUN
# -----------------------------------

if __name__ == "__main__":
    app.run(debug=True)
