const express = require('express');
const router = express.Router();
const axios = require('axios');
const { getLatestSensorData, getHistoricalData } = require('../controllers/mongoController');

const CHANNEL_ID = process.env.THINGSPEAK_CHANNEL_ID || '3315917';
const READ_KEY = process.env.THINGSPEAK_READ_API_KEY || '4V4GFLG68RNZH5JI';

// @route   GET /api/thingspeak/latest
// @desc    Get latest sensor data mapped to clear JSON keys
// @access  Public
router.get('/latest', getLatestSensorData);

// @route   GET /api/thingspeak/history
// @desc    Get historical sensor data for graphing
// @access  Public
router.get('/history', getHistoricalData);

// @route   GET /api/thingspeak/live
// @desc    Fetch LATEST data directly from ThingSpeak (no MongoDB lag)
// @access  Public
router.get('/live', async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.thingspeak.com/channels/${CHANNEL_ID}/feeds.json?results=1&api_key=${READ_KEY}`
    );
    const feed = response.data.feeds && response.data.feeds[0];
    if (!feed) return res.status(404).json({ success: false, message: 'No data from ThingSpeak' });

    res.json({
      success: true,
      data: {
        latest: {
          timestamp: feed.created_at,
          entryId: feed.entry_id,
          humidity: parseFloat(feed.field1) || null,
          temperature: parseFloat(feed.field2) || null,
          conductivity: parseFloat(feed.field3) || null,
          pH: parseFloat(feed.field4) || null,
          nitrogen: parseFloat(feed.field5) || null,
          phosphorus: parseFloat(feed.field6) || null,
          potassium: parseFloat(feed.field7) || null,
          distance: parseFloat(feed.field8) || null
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/thingspeak/live/history
// @desc    Fetch historical data directly from ThingSpeak (for charts)
// @access  Public
router.get('/live/history', async (req, res) => {
  try {
    const results = parseInt(req.query.results) || 100;
    const response = await axios.get(
      `https://api.thingspeak.com/channels/${CHANNEL_ID}/feeds.json?results=${results}&api_key=${READ_KEY}`
    );
    const feeds = response.data.feeds;
    if (!feeds || feeds.length === 0) {
      return res.status(404).json({ success: false, message: 'No history from ThingSpeak' });
    }

    const history = feeds.map(feed => ({
      timestamp: feed.created_at,
      entryId: feed.entry_id,
      humidity: parseFloat(feed.field1) || null,
      temperature: parseFloat(feed.field2) || null,
      conductivity: parseFloat(feed.field3) || null,
      pH: parseFloat(feed.field4) || null,
      nitrogen: parseFloat(feed.field5) || null,
      phosphorus: parseFloat(feed.field6) || null,
      potassium: parseFloat(feed.field7) || null,
      distance: parseFloat(feed.field8) || null
    }));

    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/thingspeak/live/average
// @desc    Fetch last 10 minutes of ThingSpeak data and return averaged values (for ML input)
// @access  Public
router.get('/live/average', async (req, res) => {
  try {
    // Fetch last 40 entries (covers ~10 min at 15s interval)
    const response = await axios.get(
      `https://api.thingspeak.com/channels/${CHANNEL_ID}/feeds.json?results=40&api_key=${READ_KEY}`
    );
    const feeds = response.data.feeds;
    if (!feeds || feeds.length === 0) {
      return res.status(404).json({ success: false, message: 'No data from ThingSpeak' });
    }

    // Filter to last 10 minutes
    const tenMinAgo = Date.now() - 10 * 60 * 1000;
    const recent = feeds.filter(f => new Date(f.created_at).getTime() >= tenMinAgo);
    const source = recent.length > 0 ? recent : feeds; // fallback to all if nothing in 10 min

    // Compute averages
    const avg = (field) => {
      const vals = source.map(f => parseFloat(f[field])).filter(v => !isNaN(v) && v > 0);
      return vals.length > 0 ? parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)) : null;
    };

    res.json({
      success: true,
      data: {
        samplesCount: source.length,
        windowMinutes: 10,
        humidity: avg('field1'),
        temperature: avg('field2'),
        conductivity: avg('field3'),
        pH: avg('field4'),
        nitrogen: avg('field5'),
        phosphorus: avg('field6'),
        potassium: avg('field7'),
        distance: avg('field8')
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
