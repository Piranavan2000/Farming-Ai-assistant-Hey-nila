require('dotenv').config();
const express = require('express');
const cors = require('cors');
const thingspeakRoutes = require('./routes/thingspeakRoutes');
const predictRoutes = require('./routes/predictRoutes');
const mlAnalysisRoutes = require('./routes/mlAnalysisRoutes');
const systemRoutes = require('./routes/systemRoutes');
const voiceRoutes = require('./routes/voiceRoutes');

const app = express();
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/agrisense')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/thingspeak', thingspeakRoutes);
app.use('/api/predict', predictRoutes);
app.use('/api/ml-analysis', mlAnalysisRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/voice', voiceRoutes);

// Health check route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the IoT Agriculture API Platform' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
