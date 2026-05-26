import joblib
import pandas as pd
import os

# -----------------------------------
# PATHS
# -----------------------------------

BASE_DIR = os.path.dirname(__file__)

# -----------------------------------
# LOAD ML ASSETS
# -----------------------------------

model = joblib.load(os.path.join(BASE_DIR, "model.pkl"))
label_encoder = joblib.load(os.path.join(BASE_DIR, "label_encoder.pkl"))
symptoms_list = joblib.load(os.path.join(BASE_DIR, "symptoms.pkl"))
severity_dict = joblib.load(os.path.join(BASE_DIR, "severity.pkl"))


# -----------------------------------
# BUILD WEIGHTED INPUT VECTOR
# -----------------------------------

def create_input_vector(user_symptoms):
    """
    Convert symptom list to a weighted feature vector.
    Each position corresponds to a known symptom.
    Present symptoms get their severity weight; absent get 0.
    """
    return [
        severity_dict.get(symptom, 1) if symptom in user_symptoms else 0
        for symptom in symptoms_list
    ]


# -----------------------------------
# PREDICTION STRENGTH LABEL
# -----------------------------------

def get_prediction_strength(confidence):
    """
    Translate numeric confidence into a human-readable strength label.
    """
    if confidence >= 75:
        return "Strong"
    elif confidence >= 50:
        return "Moderate"
    elif confidence >= 30:
        return "Weak"
    else:
        return "Uncertain"


# -----------------------------------
# PREDICT DISEASE
# -----------------------------------

def predict_disease(user_symptoms):
    """
    Run ML prediction on detected symptoms.

    Returns:
        dict with disease, confidence, top_predictions,
        prediction_strength, and input_vector
    """

    if not user_symptoms:
        return {
            "disease": "Insufficient data",
            "confidence": 0,
            "top_predictions": [],
            "prediction_strength": "Uncertain",
            "input_vector": []
        }

    # Build feature vector
    input_vector = create_input_vector(user_symptoms)

    input_df = pd.DataFrame(
        [input_vector],
        columns=symptoms_list
    )

    # Get probabilities across all classes
    probabilities = model.predict_proba(input_df)[0]

    # Top 3 predictions sorted by confidence (descending)
    top_indices = probabilities.argsort()[-3:][::-1]

    top_predictions = []
    for idx in top_indices:
        disease = label_encoder.inverse_transform([idx])[0]
        confidence = round(float(probabilities[idx]) * 100, 2)

        # Only include predictions with meaningful confidence
        if confidence > 1.0:
            top_predictions.append({
                "disease": disease,
                "confidence": confidence
            })

    # Primary prediction
    primary = top_predictions[0] if top_predictions else {
        "disease": "Unknown",
        "confidence": 0
    }

    return {
        "disease": primary["disease"],
        "confidence": primary["confidence"],
        "top_predictions": top_predictions,
        "prediction_strength": get_prediction_strength(primary["confidence"]),
        "input_vector": input_vector
    }


# -----------------------------------
# QUICK TEST
# -----------------------------------

if __name__ == "__main__":
    test_symptoms = ["itching", "skin_rash", "nodal_skin_eruptions"]
    result = predict_disease(test_symptoms)

    print(f"\nDisease     : {result['disease']}")
    print(f"Confidence  : {result['confidence']}%")
    print(f"Strength    : {result['prediction_strength']}")
    print(f"\nTop Predictions:")
    for p in result["top_predictions"]:
        print(f"  - {p['disease']}: {p['confidence']}%")