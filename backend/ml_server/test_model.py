import pandas as pd
import joblib
import os

from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix
)

# -----------------------------------
# BASE DIRECTORY
# -----------------------------------

BASE_DIR = os.path.dirname(__file__)

# -----------------------------------
# LOAD MODEL FILES
# -----------------------------------

model = joblib.load(
    os.path.join(BASE_DIR, "model.pkl")
)

label_encoder = joblib.load(
    os.path.join(BASE_DIR, "label_encoder.pkl")
)

severity_dict = joblib.load(
    os.path.join(BASE_DIR, "severity.pkl")
)

# -----------------------------------
# LOAD TEST DATASET
# -----------------------------------

testing_df = pd.read_csv(
    os.path.join(
        BASE_DIR,
        "../datasets/Testing.csv"
    )
)

# -----------------------------------
# FEATURES + LABELS
# -----------------------------------

X_test = testing_df.drop(
    columns=["prognosis"]
)

y_test = testing_df["prognosis"]

# -----------------------------------
# APPLY SEVERITY WEIGHTS
# -----------------------------------

for column in X_test.columns:

    weight = severity_dict.get(
        column,
        1
    )

    X_test[column] = (
        X_test[column] * weight
    )

# -----------------------------------
# ENCODE LABELS
# -----------------------------------

y_test_encoded = label_encoder.transform(
    y_test
)

# -----------------------------------
# PREDICTIONS
# -----------------------------------

y_pred = model.predict(X_test)

# -----------------------------------
# ACCURACY
# -----------------------------------

accuracy = accuracy_score(
    y_test_encoded,
    y_pred
)

print("\n==============================")
print("MODEL TEST RESULTS")
print("==============================\n")

print(
    f"Accuracy: {round(accuracy * 100, 2)}%"
)

# -----------------------------------
# CLASSIFICATION REPORT
# -----------------------------------

print("\nClassification Report:\n")

print(
    classification_report(
        y_test_encoded,
        y_pred,
        target_names=label_encoder.classes_
    )
)

# -----------------------------------
# CONFUSION MATRIX
# -----------------------------------

print("\nConfusion Matrix:\n")

print(
    confusion_matrix(
        y_test_encoded,
        y_pred
    )
)