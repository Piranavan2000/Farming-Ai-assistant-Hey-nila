import sys
import json
import pickle
import pandas as pd
import os

def predict():
    try:
        # Read JSON from command line arguments
        input_data = json.loads(sys.argv[1])
        
        # Determine the relative path to the model from thingspeak_api folder
        script_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(script_dir, '../../agrisense_rf_minimal.pkl')
        
        with open(model_path, 'rb') as f:
            bundle = pickle.load(f)
            
        model = bundle['model']
        le_fert = bundle['label_encoder']
        features = bundle['features'] # ['humidity', 'temperature', 'ph', 'N', 'P', 'K']
        
        # Build dataframe
        df = pd.DataFrame([{
            'humidity': input_data.get('humidity', 0),
            'temperature': input_data.get('temperature', 0),
            'ph': input_data.get('ph', 0),
            'N': input_data.get('nitrogen', 0),
            'P': input_data.get('phosphorus', 0),
            'K': input_data.get('potassium', 0)
        }], columns=features)
        
        # Predict
        pred_idx = model.predict(df)[0]
        result = le_fert.inverse_transform([pred_idx])[0]
        
        # Print JSON so Node.js can parse it gracefully
        print(json.dumps({'success': True, 'prediction': result}))
        
    except Exception as e:
        print(json.dumps({'success': False, 'error': str(e)}))

if __name__ == '__main__':
    predict()
