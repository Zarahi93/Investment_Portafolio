from flask import Flask, render_template, request, jsonify
import yfinance as yf
import pandas as pd
import numpy as np
import json
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense
from sklearn.preprocessing import MinMaxScaler
import os

app = Flask(__name__)
JSON_FILE = "current_analysis.json"

def train_and_predict(ticker):
    try:
        # Descargar histórico del último mes
        df = yf.download(ticker, period="1mo", interval="1d", progress=False)
        if df.empty:
            return {"error": f"No se encontró información para {ticker}"}

        df = df.dropna()
        df["Return"] = df["Close"].pct_change()
        df = df.dropna()

        data = df[["Close"]].values
        scaler = MinMaxScaler(feature_range=(0,1))
        scaled_data = scaler.fit_transform(data)

        # Preparar datos LSTM
        X, y_vals = [], []
        for i in range(10, len(scaled_data)):
            X.append(scaled_data[i-10:i,0])
            y_vals.append(scaled_data[i,0])
        X, y_vals = np.array(X), np.array(y_vals)
        X = np.reshape(X, (X.shape[0], X.shape[1], 1))

        # Modelo LSTM simple
        model = Sequential()
        model.add(LSTM(50, return_sequences=True, input_shape=(X.shape[1],1)))
        model.add(LSTM(50))
        model.add(Dense(1))
        model.compile(optimizer="adam", loss="mean_squared_error")
        model.fit(X, y_vals, epochs=3, batch_size=1, verbose=0)

        # Predicción del siguiente cierre
        last_10 = scaled_data[-10:]
        X_pred = np.reshape(last_10, (1,10,1))
        pred_scaled = model.predict(X_pred, verbose=0)[0][0]
        pred_price = float(scaler.inverse_transform([[pred_scaled]])[0][0])

        last_close = float(df["Close"].iloc[-1])
        decision = "Comprar" if pred_price > last_close else "No comprar"
        volatility = float(np.std(df["Return"]) * np.sqrt(252))
        risk = "Alto" if volatility > 0.03 else "Moderado" if volatility > 0.015 else "Bajo"

        # Construir array de OHLC
        ohlc = []
        for i in range(len(df)):
            ohlc.append({
                "date": df.index[i].strftime("%Y-%m-%d"),
                "open": float(df["Open"].iloc[i]),
                "high": float(df["High"].iloc[i]),
                "low": float(df["Low"].iloc[i]),
                "close": float(df["Close"].iloc[i])
            })

        result = {
            "ticker": ticker,
            "ultimo_cierre": round(last_close,2),
            "prediccion": round(pred_price,2),
            "decision": decision,
            "riesgo": risk,
            "volatilidad": round(volatility,4),
            "ohlc": ohlc
        }

        # Guardar JSON
        with open(JSON_FILE, "w") as f:
            json.dump(result, f)

        return result

    except Exception as e:
        # Guardar error en JSON y devolverlo
        error_result = {"error": str(e)}
        with open(JSON_FILE, "w") as f:
            json.dump(error_result, f)
        return error_result

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json()
    ticker = data.get("ticker","").upper()
    if not ticker:
        return jsonify({"error":"Ticker vacío"}),400
    result = train_and_predict(ticker)
    if "error" in result:
        return jsonify(result), 400
    return jsonify(result)

@app.route("/data")
def data():
    if os.path.exists(JSON_FILE):
        with open(JSON_FILE,"r") as f:
            return jsonify(json.load(f))
    return jsonify({"error":"No hay datos aún"}),404

if __name__=="__main__":
    app.run(debug=True)
