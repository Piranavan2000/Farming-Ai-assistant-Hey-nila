const express = require('express');
const router = express.Router();
const { getMLInsights } = require('../controllers/mlAnalysisController');

// @route   GET /api/ml-analysis/insights
// @desc    Get 48h Forecast, Anomaly Detection status, and Feature Importance
// @access  Public
router.get('/insights', getMLInsights);

module.exports = router;
