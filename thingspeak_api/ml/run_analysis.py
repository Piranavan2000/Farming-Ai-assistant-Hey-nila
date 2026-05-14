import sys
import json
import pickle
import pandas as pd
import numpy as np
import os

# Base path for models
MODELS_PATH = os.path.join(os.path.dirname(__file__), 'models')

def load_pkl(filename):
    with open(os.path.join(MODELS_PATH, filename), 'rb') as f:
        return pickle.load(f)

def run_analysis(task, input_data):
    try:
        if task == 'forecast':
            # Predict 48 hours of Nitrogen
            model = load_pkl('forecast_model.pkl')
            # input_data expected: {'last_N': float, 'last_last_N': float, 'current_hour': int}
            last_n1 = float(input_data['last_N'])
            last_n2 = float(input_data['last_last_N'])
            current_hour = int(input_data['current_hour'])
            
            future_preds = []
            for i in range(48):
                # Features as DataFrame to match training
                features = pd.DataFrame([[last_n1, last_n2, (current_hour + i) % 24]],
                                        columns=['N_lag_1', 'N_lag_2', 'hour'])
                pred = model.predict(features)[0]
                future_preds.append(float(pred))
                last_n2 = last_n1
                last_n1 = pred
            
            return {"success": True, "task": "forecast", "predictions": future_preds}

        elif task == 'anomaly':
            # Check if current reading is an anomaly
            model = load_pkl('anomaly_model.pkl')
            scaler = load_pkl('anomaly_scaler.pkl')
            # input_data: {'N':, 'P':, 'K':, 'temp':, 'humidity':, 'ph':}
            cols = ['N', 'P', 'K', 'temp', 'humidity', 'ph']
            vals_df = pd.DataFrame([[
                float(input_data['N']),
                float(input_data['P']),
                float(input_data['K']),
                float(input_data['temp']),
                float(input_data['humidity']),
                float(input_data['ph'])
            ]], columns=cols)
            scaled = scaler.transform(vals_df)
            scaled_df = pd.DataFrame(scaled, columns=cols)
            pred = model.predict(scaled_df)[0] # 1 for normal, -1 for anomaly
            return {"success": True, "task": "anomaly", "is_anomaly": bool(pred == -1), "score": int(pred)}

        elif task == 'importance':
            # Get feature importance for classification
            model = load_pkl('importance_model.pkl')
            features = ['Nitrogen', 'Phosphorus', 'Potassium', 'Temperature', 'Humidity', 'pH', 'Rainfall']
            importances = model.feature_importances_
            importance_map = {f: float(i) for f, i in zip(features, importances)}
            return {"success": True, "task": "importance", "importances": importance_map}

        elif task == 'fertilizer':
            # Call the fertilizer predict model directly
            script_dir = os.path.dirname(os.path.abspath(__file__))
            model_path = os.path.join(script_dir, '../../agrisense_rf_minimal.pkl')
            with open(model_path, 'rb') as f:
                bundle = pickle.load(f)
            model_fert = bundle['model']
            le_fert = bundle['label_encoder']
            features_list = bundle.get('features', ['humidity', 'temperature', 'ph', 'N', 'P', 'K'])
            df = pd.DataFrame([{
                'humidity': float(input_data.get('humidity', 0)),
                'temperature': float(input_data.get('temperature', 0)),
                'ph': float(input_data.get('ph', 0)),
                'N': float(input_data.get('nitrogen', 0)),
                'P': float(input_data.get('phosphorus', 0)),
                'K': float(input_data.get('potassium', 0))
            }], columns=features_list)
            pred_idx = model_fert.predict(df)[0]
            result = le_fert.inverse_transform([pred_idx])[0]
            return {"success": True, "task": "fertilizer", "prediction": result}

        else:
            return {"success": False, "error": f"Unknown task: {task}"}

    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "error": "Missing task or input data"}))
        sys.exit(1)
        
    task = sys.argv[1]
    try:
        input_data = json.loads(sys.argv[2])
        result = run_analysis(task, input_data)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
