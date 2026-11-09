from flask import Flask, request, jsonify
import json
import os

app = Flask(__name__)

# Mock data para endpoints básicos
MOCK_USER = {
    "id": "uuid-123",
    "name": "Teste Usuário",
    "email": "teste@example.com",
    "risk_profile": "moderado"
}

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "version": "1.0"})

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    return jsonify({"message": "Usuário criado", "user": MOCK_USER})

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    return jsonify({"access_token": "fake-jwt-token", "refresh_token": "fake-refresh-token"})

@app.route('/refresh', methods=['POST'])
def refresh():
    return jsonify({"access_token": "refreshed-token", "expires_in": 3600})

@app.route('/logout', methods=['POST'])
def logout():
    return jsonify({"message": "Logout realizado"})

@app.route('/ai/recommendations', methods=['POST'])
def recommendations():
    portfolio_id = request.json.get('portfolio_id')
    return jsonify({
        "recommendations": [
            {"id": "rec-1", "action": "buy", "asset": {"symbol": "PETR4", "name": "Petrobras"}, "quantity": 10, "targetPrice": 30.5, "confidence": 0.85, "rationale": "Mercado em alta"}
        ]
    })

@app.route('/ai/analyze', methods=['POST'])
def analyze():
    portfolio_id = request.json.get('portfolio_id')
    return jsonify({
        "riskScore": 65,
        "diversificationScore": 80,
        "suggestions": ["Aumente alocação em ETFs", "Reduza exposição em cripto"]
    })

@app.route('/ai/chat', methods=['POST'])
def chat():
    data = request.json
    return jsonify({"message": "Olá! Como posso ajudar com seus investimentos hoje?"})

# Start server
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)