const express = require('express');
const router = express.Router();
const multer = require('multer');
const { processVoiceQuery } = require('../controllers/voiceController');

// Setup multer for temporary audio file storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, '/tmp/') // or a local 'uploads' directory
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});
const upload = multer({ dest: 'uploads/' });

// @route   POST /api/voice/ask
// @desc    Process voice audio, get text via Whisper, get ML prediction, get NVIDIA LLM response
// @access  Public
router.post('/ask', upload.single('audio'), processVoiceQuery);

module.exports = router;
