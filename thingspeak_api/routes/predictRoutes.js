const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const router = express.Router();

router.post('/', (req, res) => {
    const { tenMinAverage, tankHeight, radius } = req.body;
    
    if (!tenMinAverage || !tankHeight || !radius) {
        return res.status(400).json({ success: false, message: "Missing required fields: tenMinAverage, tankHeight, or radius" });
    }

    // 1. Calculate Rule-Based Physics
    // ultrasonic distance sensor = empty space from top of tank.
    // Water height = total tank height - distance reading
    let waterHeight = tankHeight - tenMinAverage.distance;
    if (waterHeight < 0) waterHeight = 0; // cannot be negative

    // Volume in Litres = (PI * r^2 * h) / 1000 cm3
    const volumeLiters = (Math.PI * Math.pow(radius, 2) * waterHeight) / 1000;
    
    // Low water warning if water level is under 20% of tank height
    const isWaterLow = waterHeight <= (tankHeight * 0.2);
    
    // 2. Machine Learning Prediction Execution
    const pythonScriptPath = path.join(__dirname, '../ml/predict.py');
    const inputPayload = JSON.stringify({
        humidity: tenMinAverage.humidity,
        temperature: tenMinAverage.temperature,
        ph: tenMinAverage.pH,
        nitrogen: tenMinAverage.nitrogen,
        phosphorus: tenMinAverage.phosphorus,
        potassium: tenMinAverage.potassium
    });

    const pythonProcess = spawn('python', [pythonScriptPath, inputPayload]);

    let pyOutput = '';
    let pyError = '';

    pythonProcess.stdout.on('data', (data) => {
        pyOutput += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
        pyError += data.toString();
    });

    pythonProcess.on('close', (code) => {
        try {
            // Parse python JSON
            const mlResult = JSON.parse(pyOutput.trim());
            
            if (!mlResult.success) {
                return res.status(500).json({ success: false, message: 'ML Model Error', error: mlResult.error });
            }

            // Synthesize the response
            return res.json({
                success: true,
                data: {
                    fertilizer: mlResult.prediction,
                    physics: {
                        waterHeightCm: waterHeight.toFixed(2),
                        volumeLiters: volumeLiters.toFixed(2),
                        isWaterLow: isWaterLow,
                        safeCapacity: isWaterLow ? "Not enough water (Below 20%)" : "Adequate capacity"
                    }
                }
            });

        } catch (err) {
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to process python script output',
                rawOutput: pyOutput,
                errorStr: pyError
            });
        }
    });
});

module.exports = router;
