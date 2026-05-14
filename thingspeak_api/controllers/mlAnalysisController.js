const { spawn } = require('child_process');
const path = require('path');
const axios = require('axios');

const CHANNEL_ID = process.env.THINGSPEAK_CHANNEL_ID || '3315917';
const READ_KEY = process.env.THINGSPEAK_READ_API_KEY || '4V4GFLG68RNZH5JI';

const runPythonAnalysis = (task, inputData) => {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', [
            path.join(__dirname, '../ml/run_analysis.py'),
            task,
            JSON.stringify(inputData)
        ]);

        let dataString = '';
        pythonProcess.stdout.on('data', (data) => {
            dataString += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error(`Python error: ${data}`);
        });

        pythonProcess.on('close', (code) => {
            try {
                if (code !== 0) {
                    reject(new Error(`Process exited with code ${code}`));
                } else {
                    resolve(JSON.parse(dataString));
                }
            } catch (err) {
                reject(err);
            }
        });
    });
};

// Fetch live 10-min averages directly from ThingSpeak
const getLiveAverages = async () => {
    const response = await axios.get(
        `https://api.thingspeak.com/channels/${CHANNEL_ID}/feeds.json?results=40&api_key=${READ_KEY}`
    );
    const feeds = response.data.feeds;
    if (!feeds || feeds.length === 0) throw new Error('No ThingSpeak data');

    // Filter to last 10 minutes, fallback to all if sparse
    const tenMinAgo = Date.now() - 10 * 60 * 1000;
    const recent = feeds.filter(f => new Date(f.created_at).getTime() >= tenMinAgo);
    const source = recent.length > 0 ? recent : feeds;

    const avg = (field) => {
        const vals = source.map(f => parseFloat(f[field])).filter(v => !isNaN(v) && v > 0);
        return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    };

    return {
        averages: {
            N: avg('field5'),
            P: avg('field6'),
            K: avg('field7'),
            pH: avg('field4'),
            temp: avg('field2'),
            humidity: avg('field1')
        },
        // Latest single reading for immediate fertilizer prediction
        latest: {
            N: parseFloat(feeds[feeds.length - 1]?.field5) || 0,
            P: parseFloat(feeds[feeds.length - 1]?.field6) || 0,
            K: parseFloat(feeds[feeds.length - 1]?.field7) || 0,
            pH: parseFloat(feeds[feeds.length - 1]?.field4) || 0,
            temp: parseFloat(feeds[feeds.length - 1]?.field2) || 0,
            humidity: parseFloat(feeds[feeds.length - 1]?.field1) || 0
        },
        prevN: parseFloat(feeds[feeds.length - 2]?.field5) || avg('field5'),
        count: source.length,
        lastTimestamp: feeds[feeds.length - 1]?.created_at || new Date().toISOString()
    };
};

exports.getMLInsights = async (req, res) => {
    try {
        const { averages, latest, prevN, count, lastTimestamp } = await getLiveAverages();

        console.log(`ML Analysis using live ThingSpeak averages (${count} samples):`, averages);

        // 1. Forecast Task
        const forecastInput = {
            last_N: averages.N,
            last_last_N: prevN,
            current_hour: new Date().getHours()
        };
        const forecastResult = await runPythonAnalysis('forecast', forecastInput);

        // 2. Anomaly Task
        const anomalyInput = {
            N: averages.N,
            P: averages.P,
            K: averages.K,
            temp: averages.temp,
            humidity: averages.humidity,
            ph: averages.pH
        };
        const anomalyResult = await runPythonAnalysis('anomaly', anomalyInput);

        // 3. Feature Importance Task
        const importanceResult = await runPythonAnalysis('importance', {});

        // 4. Fertilizer Prediction — uses IMMEDIATE latest reading (not average)
        const fertilizerResult = await runPythonAnalysis('fertilizer', {
            humidity: latest.humidity,
            temperature: latest.temp,
            ph: latest.pH,
            nitrogen: latest.N,
            phosphorus: latest.P,
            potassium: latest.K
        });

        console.log('Live latest used for fertilizer:', latest);
        console.log('Fertilizer prediction result:', fertilizerResult);

        res.status(200).json({
            success: true,
            data: {
                forecast: forecastResult.predictions,
                anomaly: {
                    isAnomaly: anomalyResult.is_anomaly,
                    timestamp: lastTimestamp,
                    currentReadings: { ...averages, N: averages.N, pH: averages.pH },
                    sampleCount: count
                },
                importance: importanceResult.importances,
                fertilizer: fertilizerResult.prediction || 'N/A'
            }
        });

    } catch (error) {
        console.error('ML Analysis Error:', error.message);
        res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
    }
};


