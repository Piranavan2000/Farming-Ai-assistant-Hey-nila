require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const SensorData = require('./models/SensorData');
const { updateSystemHealth } = require('./controllers/systemController');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/agrisense')
  .then(() => console.log('ThingSpeak Poller: Connected to MongoDB'))
  .catch(err => console.error('ThingSpeak Poller: MongoDB connection error:', err));

const THINGSPEAK_CHANNEL_ID = process.env.THINGSPEAK_CHANNEL_ID || '3315917';
const THINGSPEAK_READ_API_KEY = process.env.THINGSPEAK_READ_API_KEY || '4V4GFLG68RNZH5JI';
const POLL_INTERVAL_MS = 15000; // Poll every 15 seconds

let lastEntryId = null;

const fetchAndSaveData = async () => {
  try {
    const response = await axios.get(`https://api.thingspeak.com/channels/${THINGSPEAK_CHANNEL_ID}/feeds.json?results=1&api_key=${THINGSPEAK_READ_API_KEY}`);
    const data = response.data;

    if (data.feeds && data.feeds.length > 0) {
      const feed = data.feeds[0];
      
      // Prevent saving duplicates
      if (lastEntryId === feed.entry_id) {
        return; // Already saved this entry
      }

      console.log(`Received new feed (Entry ${feed.entry_id}):`, feed);

      const newReading = new SensorData({
        sensor_id: 'JAFFNA_NODE_01',
        timestamp: new Date(feed.created_at),
        readings: {
          humidity: parseFloat(feed.field1) || 0,
          temp: parseFloat(feed.field2) || 0,
          ec: parseFloat(feed.field3) || 0,
          pH: parseFloat(feed.field4) || 0,
          N: parseFloat(feed.field5) || 0,
          P: parseFloat(feed.field6) || 0,
          K: parseFloat(feed.field7) || 0,
          water_level: parseFloat(feed.field8) || 0
        },
        prediction: 'Unknown'
      });

      await newReading.save();
      lastEntryId = feed.entry_id;
      
      // Update system health
      updateSystemHealth(true, false, JSON.stringify(feed));
      console.log('Saved new reading to MongoDB successfully.');
    }
  } catch (error) {
    console.error('Error fetching data from ThingSpeak:', error.message);
    updateSystemHealth(false, false, error.message);
  }
};

// Start Polling
console.log(`Starting ThingSpeak Poller. Fetching data every ${POLL_INTERVAL_MS / 1000} seconds...`);
fetchAndSaveData(); // Initial fetch
setInterval(fetchAndSaveData, POLL_INTERVAL_MS);
