import pandas as pd
import joblib

from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestClassifier

# -----------------------------------
# LOAD DATASETS
# -----------------------------------

training_df = pd.read_csv(
    "../datasets/Training.csv"
)

severity_df = pd.read_csv(
    "../datasets/Symptom-severity.csv"
)

# -----------------------------------
# CREATE SEVERITY DICTIONARY
# -----------------------------------

severity_dict = {}

for _, row in severity_df.iterrows():

    symptom = row["Symptom"].strip()
    weight = int(row["weight"])

    severity_dict[symptom] = weight

# -----------------------------------
# FEATURES + LABELS
# -----------------------------------

X = training_df.drop(
    columns=["prognosis"]
)

y = training_df["prognosis"]

# -----------------------------------
# APPLY SEVERITY WEIGHTS
# -----------------------------------

for column in X.columns:

    weight = severity_dict.get(
        column,
        1
    )

    X[column] = X[column] * weight

# -----------------------------------
# ENCODE LABELS
# -----------------------------------

label_encoder = LabelEncoder()

y_encoded = label_encoder.fit_transform(y)

# -----------------------------------
# CREATE MODEL
# -----------------------------------

model = RandomForestClassifier(
    n_estimators=100,
    max_depth=10,
    min_samples_split=5,
    random_state=42
)

# -----------------------------------
# TRAIN MODEL
# -----------------------------------

model.fit(X, y_encoded)

# -----------------------------------
# SAVE FILES
# -----------------------------------

joblib.dump(model, "model.pkl")

joblib.dump(
    label_encoder,
    "label_encoder.pkl"
)

joblib.dump(
    list(X.columns),
    "symptoms.pkl"
)

joblib.dump(
    severity_dict,
    "severity.pkl"
)

print("\nModel trained successfully")