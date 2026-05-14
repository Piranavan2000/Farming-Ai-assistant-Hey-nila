require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const SensorData = require('./models/SensorData');

const migrateThingSpeakToMongo = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB successfully.');

        const channelId = process.env.THINGSPEAK_CHANNEL_ID;
        const readApiKey = process.env.THINGSPEAK_READ_API_KEY;

        console.log('Fetching historical data from ThingSpeak...');
        // ThingSpeak allows fetching up to 8000 results
        const url = `https://api.thingspeak.com/channels/${channelId}/feeds.json?api_key=${readApiKey}&results=8000`;
        const response = await axios.get(url);
        const feeds = response.data.feeds;

        if (!feeds || feeds.length === 0) {
            console.log('No data found in ThingSpeak to migrate.');
            process.exit(0);
        }

        console.log(`Found ${feeds.length} records. Migrating to MongoDB...`);

        const mongoDocs = feeds.map(feed => {
            return {
                sensor_id: 'JAFFNA_NODE_01', // Default identifier
                timestamp: feed.created_at ? new Date(feed.created_at) : new Date(),
                readings: {
                    humidity: feed.field1 ? parseFloat(feed.field1) : null,
                    temp: feed.field2 ? parseFloat(feed.field2) : null,
                    ec: feed.field3 ? parseFloat(feed.field3) : null,
                    pH: feed.field4 ? parseFloat(feed.field4) : null,
                    N: feed.field5 ? parseFloat(feed.field5) : null,
                    P: feed.field6 ? parseFloat(feed.field6) : null,
                    K: feed.field7 ? parseFloat(feed.field7) : null,
                    water_level: feed.field8 ? parseFloat(feed.field8) : null,
                    light: null // ThingSpeak doesn't seem to have light based on previous controllers
                },
                prediction: 'Unknown' // Replace with real prediction if available
            };
        });

        // Insert into MongoDB
        await SensorData.insertMany(mongoDocs);
        console.log(`Successfully migrated ${mongoDocs.length} historical records from ThingSpeak to MongoDB Atlas!`);

    } catch (error) {
        console.error('Migration failed:', error.message);
    } finally {
        mongoose.connection.close();
        process.exit(0);
    }
};

migrateThingSpeakToMongo();
