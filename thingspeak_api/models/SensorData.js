const mongoose = require('mongoose');

const SensorDataSchema = new mongoose.Schema({
  sensor_id: { type: String, required: true },
  timestamp: { type: Date, required: true },
  readings: {
    N: { type: Number },
    P: { type: Number },
    K: { type: Number },
    pH: { type: Number },
    temp: { type: Number },
    humidity: { type: Number },
    ec: { type: Number },
    light: { type: Number },
    water_level: { type: Number }
  },
  prediction: { type: String }
});

module.exports = mongoose.model('SensorData', SensorDataSchema);
