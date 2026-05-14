const express = require('express');
const router = express.Router();
const { getSystemStatus } = require('../controllers/systemController');

// @route   GET /api/system/status
// @desc    Get real-time system health, logs and diagnostic data
// @access  Public
router.get('/status', getSystemStatus);

module.exports = router;
