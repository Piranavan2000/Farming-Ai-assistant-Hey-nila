const SensorData = require('../models/SensorData');

// Helper function to calculate averages robustly from MongoDB data
const calculateAverage = (feeds) => {
    if (!feeds || feeds.length === 0) return null;
    
    let counts = { humidity: 0, temperature: 0, conductivity: 0, pH: 0, nitrogen: 0, phosphorus: 0, potassium: 0, distance: 0 };
    let sums = { humidity: 0, temperature: 0, conductivity: 0, pH: 0, nitrogen: 0, phosphorus: 0, potassium: 0, distance: 0 };

    feeds.forEach(data => {
        const readings = data.readings || {};
        
        const h = readings.humidity;
        if (h != null) { sums.humidity += h; counts.humidity++; }

        const t = readings.temp;
        if (t != null) { sums.temperature += t; counts.temperature++; }

        const c = readings.ec;
        if (c != null) { sums.conductivity += c; counts.conductivity++; }

        const ph = readings.pH;
        if (ph != null) { sums.pH += ph; counts.pH++; }

        const n = readings.N;
        if (n != null) { sums.nitrogen += n; counts.nitrogen++; }

        const p = readings.P;
        if (p != null) { sums.phosphorus += p; counts.phosphorus++; }

        const k = readings.K;
        if (k != null) { sums.potassium += k; counts.potassium++; }

        const d = readings.water_level; // Mapping distance to water_level
        if (d != null) { sums.distance += d; counts.distance++; }
    });

    return {
        humidity: counts.humidity > 0 ? Number((sums.humidity / counts.humidity).toFixed(2)) : null,
        temperature: counts.temperature > 0 ? Number((sums.temperature / counts.temperature).toFixed(2)) : null,
        conductivity: counts.conductivity > 0 ? Number((sums.conductivity / counts.conductivity).toFixed(2)) : null,
        pH: counts.pH > 0 ? Number((sums.pH / counts.pH).toFixed(2)) : null,
        nitrogen: counts.nitrogen > 0 ? Number((sums.nitrogen / counts.nitrogen).toFixed(2)) : null,
        phosphorus: counts.phosphorus > 0 ? Number((sums.phosphorus / counts.phosphorus).toFixed(2)) : null,
        potassium: counts.potassium > 0 ? Number((sums.potassium / counts.potassium).toFixed(2)) : null,
        distance: counts.distance > 0 ? Number((sums.distance / counts.distance).toFixed(2)) : null,
        samplesCount: feeds.length
    };
};

// Helper function to map a single record to frontend format
const mapLatest = (data) => {
    if (!data) return null;
    const readings = data.readings || {};
    return {
        timestamp: data.timestamp || null,
        entryId: data._id || null,
        humidity: readings.humidity != null ? parseFloat(readings.humidity) : null,
        temperature: readings.temp != null ? parseFloat(readings.temp) : null,
        conductivity: readings.ec != null ? parseFloat(readings.ec) : null,
        pH: readings.pH != null ? parseFloat(readings.pH) : null,
        nitrogen: readings.N != null ? parseFloat(readings.N) : null,
        phosphorus: readings.P != null ? parseFloat(readings.P) : null,
        potassium: readings.K != null ? parseFloat(readings.K) : null,
        distance: readings.water_level != null ? parseFloat(readings.water_level) : null,
        prediction: data.prediction || null
    };
};

// Fetch data from MongoDB and return mapped fields and averages
const getLatestSensorData = async (req, res) => {
    try {
        // Fetch up to the last 8000 entries
        const feeds = await SensorData.find().sort({ timestamp: 1 }).limit(8000);

        if (!feeds || feeds.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No data found in MongoDB.'
            });
        }

        // 1. Get the latest exact reading
        const latestRecord = feeds[feeds.length - 1];
        const latest = mapLatest(latestRecord);

        // 2. Average of ALL historical data fetched
        const averageAll = calculateAverage(feeds);

        // 3. Average of Last 10 Minutes
        let average10Mins = null;
        if (latestRecord && latestRecord.timestamp) {
            const latestTimeMs = new Date(latestRecord.timestamp).getTime();
            const tenMinutesAgoMs = latestTimeMs - (10 * 60 * 1000);
            
            const feedsLast10Mins = feeds.filter(feed => {
                const feedTimeMs = new Date(feed.timestamp).getTime();
                return feedTimeMs >= tenMinutesAgoMs;
            });
            
            average10Mins = calculateAverage(feedsLast10Mins);
        }

        res.status(200).json({
            success: true,
            data: {
                latest,
                average10Mins: average10Mins || null,
                averageAll
            }
        });

    } catch (error) {
        console.error('Error fetching data from MongoDB:', error.message);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error while fetching sensor data.',
            error: error.message
        });
    }
};

// Fetch historical data for graphing
const getHistoricalData = async (req, res) => {
    try {
        const results = req.query.results ? parseInt(req.query.results) : 100;

        const feeds = await SensorData.find().sort({ timestamp: -1 }).limit(results);

        if (!feeds || feeds.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No historical data found.'
            });
        }

        // Reverse to get chronological order
        const history = feeds.reverse().map(feed => mapLatest(feed));

        res.status(200).json({
            success: true,
            data: history
        });

    } catch (error) {
        console.error('Error fetching historical data:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch history.',
            error: error.message
        });
    }
};

module.exports = {
    getLatestSensorData,
    getHistoricalData
};
