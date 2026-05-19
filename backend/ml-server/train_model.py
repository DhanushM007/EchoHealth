import pandas as pd
import joblib

from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestClassifier

# Load dataset
training_df = pd.read_csv("../datasets/Training.csv")

# Features and labels
X = training_df.drop(columns=["prognosis"])
y = training_df["prognosis"]

# Encode diseases
label_encoder = LabelEncoder()
y_encoded = label_encoder.fit_transform(y)

# Create model
model = RandomForestClassifier(
    n_estimators=100,
    random_state=42
)

# Train model
model.fit(X, y_encoded)

# Save model
joblib.dump(model, "model.pkl")

# Save label encoder
joblib.dump(label_encoder, "label_encoder.pkl")

# Save symptom order
joblib.dump(list(X.columns), "symptoms.pkl")

print("Model trained successfully")