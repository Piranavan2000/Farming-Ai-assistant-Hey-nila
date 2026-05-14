const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_INVOKE_URL = "https://openrouter.ai/api/v1/chat/completions";

// Short-term memory cache for ML and Sensor Data
let shortTermMemory = {
    liveData: null,
    mlData: null,
    lastUpdated: null
};

// Background loop to update memory every 10 minutes so Voice Assistant has instant access
const updateShortTermMemory = async () => {
    try {
        const port = process.env.PORT || 5000;
        const liveResponse = await axios.get(`http://localhost:${port}/api/thingspeak/live`);
        const mlResponse = await axios.get(`http://localhost:${port}/api/ml-analysis/insights`);
        
        shortTermMemory.liveData = liveResponse.data.data;
        shortTermMemory.mlData = mlResponse.data.data;
        shortTermMemory.lastUpdated = new Date().toISOString();
        console.log('[Voice LLM Cache] Short-term memory successfully updated at', shortTermMemory.lastUpdated);
    } catch (err) {
        console.error('[Voice LLM Cache] Failed to update memory:', err.message);
    }
};

// Initial fetch after server starts (give it 5 seconds to bind port), then every 10 minutes
setTimeout(updateShortTermMemory, 5000);
setInterval(updateShortTermMemory, 10 * 60 * 1000);

exports.processVoiceQuery = async (req, res) => {
    try {
        const role = req.body.role || 'farmer'; 
        let transcribedText = req.body.textQuery || ""; 

        // 1. Transcribe voice using NVIDIA Whisper NIM (Only if audio file exists and no textQuery was provided)
        if (!transcribedText) {
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'No audio file or text query provided' });
            }
            const audioPath = req.file.path;
            const NVIDIA_WHISPER_KEY = "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";
            
            try {
                const formData = new FormData();
                formData.append('file', fs.createReadStream(audioPath), {
                    filename: 'voice-recording.webm',
                    contentType: 'audio/webm'
                });
                
                const whisperResponse = await axios.post('https://ai.api.nvidia.com/v1/audio/transcriptions', formData, {
                    headers: {
                        ...formData.getHeaders(),
                        'Authorization': `Bearer ${NVIDIA_WHISPER_KEY}`
                    }
                });
                transcribedText = whisperResponse.data.text;
            } catch (err) {
                console.error('NVIDIA Whisper transcription failed:', err.response?.data || err.message);
                transcribedText = "What is the status of my farm?";
            } finally {
                if (fs.existsSync(audioPath)) {
                    fs.unlinkSync(audioPath);
                }
            }
        }

        // 2. Use Short-Term Memory (Millisecond Access!)
        if (!shortTermMemory.liveData || !shortTermMemory.mlData) {
            console.log('[Voice LLM] Cache empty. Fetching proactively...');
            await updateShortTermMemory();
        }

        const liveData = shortTermMemory.liveData || { error: "Sensors offline." };
        const mlData = shortTermMemory.mlData || { error: "ML Server offline." };

        // 3. Send to NVIDIA LLM
        const systemPrompt = "You are Nila, a voice AI assistant like Apple Siri for the AgriSense farm platform. You speak exclusively in English. Your answer must be ONE or TWO short sentences MAXIMUM. Be like Siri - ultra brief and direct. Just state the key number or fact. The user may speak with an Indian accent or broken English. Decipher their intent smartly. Do NOT use markdown. Do NOT use asterisks or hashes. Give plain spoken text only.";

        const promptContent = `
User Question: "${transcribedText}"

Live Sensor Data:
${JSON.stringify(liveData, null, 2)}

ML Predictions:
${JSON.stringify(mlData, null, 2)}

Provide a 1-2 sentence spoken answer. Just the key fact.
`;

        const payload = {
            "model": "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
            "messages": [
                {"role": "system", "content": systemPrompt},
                {"role": "user", "content": promptContent}
            ],
            "max_tokens": 1024,
            "temperature": 0.3,
            "top_p": 1.00,
            "stream": false,
            "reasoning": { "enabled": true }
        };

        const nvidiaResponse = await axios.post(OPENROUTER_INVOKE_URL, payload, {
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Accept": "application/json",
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "AgriSense Voice Assistant"
            }
        });

        const message = nvidiaResponse.data.choices[0].message;
        
        console.log('[Voice LLM] Raw message:', JSON.stringify(message, null, 2));
        
        // ONLY extract the final answer (message.content), completely ignoring the AI's internal thoughts
        let answer = '';
        if (typeof message.content === 'string' && message.content.trim().length > 0) {
            answer = message.content;
        }
        
        if (!answer) {
            answer = 'I am sorry, I need more time to think about that.';
        }
        
        // Remove markdown formatting like asterisks and hashes so TTS reads it naturally
        answer = answer.replace(/[*#]/g, '');

        res.json({
            success: true,
            data: {
                question: transcribedText,
                answer: answer,
                role: role
            }
        });

    } catch (error) {
        console.error('Voice Processing Error:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: 'Voice processing failed', error: error.message });
    }
};
