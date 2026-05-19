from flask import Flask, request, jsonify
from flask_cors import CORS
from google import genai
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)
CORS(app)

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

SYSTEM_PROMPT = """
You are an AI healthcare assistant.

Your responsibilities:
- collect symptoms progressively
- ask ONE medically relevant follow-up question
- do NOT give final diagnosis
- do NOT prescribe medicines
- keep responses concise
"""

@app.route("/chat", methods=["POST"])
def chat():

    data = request.json

    conversation = data.get("conversation", [])

    formatted_conversation = ""

    for msg in conversation:
        formatted_conversation += (
            f"{msg['role']}: {msg['content']}\n"
        )

    prompt = (
        SYSTEM_PROMPT +
        "\n\nConversation:\n" +
        formatted_conversation
    )

    response = client.models.generate_content(
        model=os.getenv("GEMINI_MODEL"),
        contents=prompt
    )

    return jsonify({
        "reply": response.text
    })

if __name__ == "__main__":
    app.run(debug=True)