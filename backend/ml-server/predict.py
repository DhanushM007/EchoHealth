import joblib
import pandas as pd

# Load trained model
model = joblib.load("model.pkl")

# Load label encoder
label_encoder = joblib.load("label_encoder.pkl")

# Load symptom order
symptoms_list = joblib.load("symptoms.pkl")


def predict_disease(user_symptoms):

    # Create empty symptom vector
    input_vector = []

    # Convert symptoms into binary values
    for symptom in symptoms_list:

        if symptom in user_symptoms:
            input_vector.append(1)
        else:
            input_vector.append(0)

    # Convert into DataFrame
    input_df = pd.DataFrame(
        [input_vector],
        columns=symptoms_list
    )

    # Predict encoded disease
    prediction = model.predict(input_df)

    # Decode disease name
    predicted_disease = label_encoder.inverse_transform(
        prediction
    )[0]

    # Get prediction probabilities
    probabilities = model.predict_proba(input_df)[0]

    # Get highest confidence
    confidence = round(
        max(probabilities) * 100,
        2
    )

    return {
        "disease": predicted_disease,
        "confidence": confidence
    }


# Testing
if __name__ == "__main__":

    result = predict_disease([
        "itching",
        "skin_rash",
        "nodal_skin_eruptions"
    ])

    print(result)