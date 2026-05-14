const axios = require('axios');

// Helper function to calculate averages robustly
const calculateAverage = (feeds) => {
    if (!feeds || feeds.length === 0) return null;
    
    let counts = { humidity: 0, temperature: 0, conductivity: 0, pH: 0, nitrogen: 0, phosphorus: 0, potassium: 0, distance: 0 };
    let sums = { humidity: 0, temperature: 0, conductivity: 0, pH: 0, nitrogen: 0, phosphorus: 0, potassium: 0, distance: 0 };

    feeds.forEach(data => {
        const h = parseFloat(data.field1);
        if (!isNaN(h)) { sums.humidity += h; counts.humidity++; }

        const t = parseFloat(data.field2);
        if (!isNaN(t)) { sums.temperature += t; counts.temperature++; }

        const c = parseFloat(data.field3);
        if (!isNaN(c)) { sums.conductivity += c; counts.conductivity++; }

        const ph = parseFloat(data.field4);
        if (!isNaN(ph)) { sums.pH += ph; counts.pH++; }

        const n = parseFloat(data.field5);
        if (!isNaN(n)) { sums.nitrogen += n; counts.nitrogen++; }

        const p = parseFloat(data.field6);
        if (!isNaN(p)) { sums.phosphorus += p; counts.phosphorus++; }

        const k = parseFloat(data.field7);
        if (!isNaN(k)) { sums.potassium += k; counts.potassium++; }

        const d = parseFloat(data.field8);
        if (!isNaN(d)) { sums.distance += d; counts.distance++; }
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

// Helper function to map a single record
const mapLatest = (data) => {
    if (!data) return null;
    return {
        timestamp: data.created_at || null,
        entryId: data.entry_id || null,
        humidity: data.field1 !== null && data.field1 !== "" && !isNaN(parseFloat(data.field1)) ? parseFloat(data.field1) : null,
        temperature: data.field2 !== null && data.field2 !== "" && !isNaN(parseFloat(data.field2)) ? parseFloat(data.field2) : null,
        conductivity: data.field3 !== null && data.field3 !== "" && !isNaN(parseFloat(data.field3)) ? parseFloat(data.field3) : null,
        pH: data.field4 !== null && data.field4 !== "" && !isNaN(parseFloat(data.field4)) ? parseFloat(data.field4) : null,
        nitrogen: data.field5 !== null && data.field5 !== "" && !isNaN(parseFloat(data.field5)) ? parseFloat(data.field5) : null,
        phosphorus: data.field6 !== null && data.field6 !== "" && !isNaN(parseFloat(data.field6)) ? parseFloat(data.field6) : null,
        potassium: data.field7 !== null && data.field7 !== "" && !isNaN(parseFloat(data.field7)) ? parseFloat(data.field7) : null,
        distance: data.field8 !== null && data.field8 !== "" && !isNaN(parseFloat(data.field8)) ? parseFloat(data.field8) : null
    };
};

// Fetch data from ThingSpeak and return mapped fields and averages
const getLatestSensorData = async (req, res) => {
    try {
        const channelId = process.env.THINGSPEAK_CHANNEL_ID;
        const readApiKey = process.env.THINGSPEAK_READ_API_KEY;

        // Fetch up to the last 8000 entries (maximum allowed by ThingSpeak per request) to compute averages context
        const url = `https://api.thingspeak.com/channels/${channelId}/feeds.json?api_key=${readApiKey}&results=8000&_t=${Date.now()}`;
        const response = await axios.get(url);

        const feeds = response.data.feeds;

        if (!feeds || feeds.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No data found in the ThingSpeak channel.'
            });
        }

        // 1. Get the latest exact reading
        const latestRecord = feeds[feeds.length - 1];
        const latest = mapLatest(latestRecord);

        // 2. Average of ALL historical data fetched (up to 8000)
        const averageAll = calculateAverage(feeds);

        // 3. Average of Last 10 Minutes (relative to the latest data point, not server time)
        let average10Mins = null;
        if (latestRecord && latestRecord.created_at) {
            const latestTimeMs = new Date(latestRecord.created_at).getTime();
            const tenMinutesAgoMs = latestTimeMs - (10 * 60 * 1000);
            
            const feedsLast10Mins = feeds.filter(feed => {
                const feedTimeMs = new Date(feed.created_at).getTime();
                return feedTimeMs >= tenMinutesAgoMs;
            });
            
            average10Mins = calculateAverage(feedsLast10Mins);
        }

        // Send successful response containing all grouped data
        res.status(200).json({
            success: true,
            data: {
                latest,
                average10Mins: average10Mins || null,
                averageAll
            }
        });

    } catch (error) {
        console.error('Error fetching data from ThingSpeak:', error.message);
        
        // Handle axios specific errors
        if (error.response) {
            return res.status(error.response.status).json({
                success: false,
                message: 'Error response from ThingSpeak API',
                error: error.response.data
            });
        }

        // Handle standard errors
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
        const channelId = process.env.THINGSPEAK_CHANNEL_ID;
        const readApiKey = process.env.THINGSPEAK_READ_API_KEY;
        const results = req.query.results || 100; // Default last 100 entries

        const url = `https://api.thingspeak.com/channels/${channelId}/feeds.json?api_key=${readApiKey}&results=${results}&_t=${Date.now()}`;
        const response = await axios.get(url);

        const feeds = response.data.feeds;

        if (!feeds || feeds.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No historical data found.'
            });
        }

        const history = feeds.map(feed => mapLatest(feed));

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
