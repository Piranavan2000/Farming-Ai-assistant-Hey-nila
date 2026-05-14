import pandas as pd
import numpy as np
import pickle
import os
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier, IsolationForest
from sklearn.preprocessing import StandardScaler, LabelEncoder

# Ensure directory exists
os.makedirs('thingspeak_api/ml/models', exist_ok=True)

def train_and_save_models():
    print("Training advanced models...")

    # 1. Forecasting Model (Nitrogen Prediction)
    df_time = pd.read_csv('thingspeak_api/synthetic_agri_data_7days.csv')
    df_time['N_lag_1'] = df_time['N'].shift(1)
    df_time['N_lag_2'] = df_time['N'].shift(2)
    df_time['Timestamp'] = pd.to_datetime(df_time['Timestamp'])
    df_time['hour'] = df_time['Timestamp'].dt.hour
    df_time = df_time.dropna()

    X_forecasting = df_time[['N_lag_1', 'N_lag_2', 'hour']]
    y_forecasting = df_time['N']
    forecast_model = RandomForestRegressor(n_estimators=100, random_state=42)
    forecast_model.fit(X_forecasting, y_forecasting)
    
    with open('thingspeak_api/ml/models/forecast_model.pkl', 'wb') as f:
        pickle.dump(forecast_model, f)
    print("Saved forecast_model.pkl")

    # 2. Anomaly Detection Model
    df_anomaly = pd.read_csv('AgriSense_ML_Ready.csv')
    features = ['N', 'P', 'K', 'temperature', 'humidity', 'ph']
    # Scaler is important for anomaly detection
    scaler = StandardScaler()
    data_scaled = scaler.fit_transform(df_anomaly[features])
    
    anomaly_model = IsolationForest(contamination=0.02, random_state=42)
    anomaly_model.fit(data_scaled)
    
    with open('thingspeak_api/ml/models/anomaly_model.pkl', 'wb') as f:
        pickle.dump(anomaly_model, f)
    with open('thingspeak_api/ml/models/anomaly_scaler.pkl', 'wb') as f:
        pickle.dump(scaler, f)
    print("Saved anomaly_model.pkl and anomaly_scaler.pkl")

    # 3. Feature Importance Model
    df_corr = pd.read_csv('AgriSense_ML_Ready.csv')
    le = LabelEncoder()
    df_corr['label_encoded'] = le.fit_transform(df_corr['label'])
    
    X_corr = df_corr[['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']]
    y_corr = df_corr['label_encoded']
    
    importance_model = RandomForestClassifier(n_estimators=100, random_state=42)
    importance_model.fit(X_corr, y_corr)
    
    with open('thingspeak_api/ml/models/importance_model.pkl', 'wb') as f:
        pickle.dump(importance_model, f)
    
    # Save the label mapping
    label_mapping = dict(zip(le.transform(le.classes_), le.classes_))
    with open('thingspeak_api/ml/models/label_mapping.pkl', 'wb') as f:
        pickle.dump(label_mapping, f)
        
    print("Saved importance_model.pkl and label_mapping.pkl")

if __name__ == "__main__":
    train_and_save_models()
