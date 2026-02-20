const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const axios = require('axios');

const API_KEY = process.env.API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

router.post('/edit', auth, async (req, res) => {
    console.log(`[AI] Edit request received. Command: ${req.body.command}`);
    try {
        const { text, command } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'No text provided' });
        }

        const prompt = `
            Task: ${command || 'Improve this text'}
            Text to edit: "${text}"
            
            Instructions:
            1. ONLY return the edited text.
            2. Do not explain anything.
            3. Do not use quotes around the response unless they are part of the text.
            4. Maintain the professional tone of a certificate or official document.
            5. If context suggests it's a placeholder (like {{NAME}}), keep the placeholder format.
        `;

        const response = await axios.post(GEMINI_URL, {
            contents: [{
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature: 0.1,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 1024,
            }
        });

        const resultText = response.data.candidates[0].content.parts[0].text.trim();

        console.log('🤖 AI Edit Success:', { command, original: text.substring(0, 20) + '...', result: resultText.substring(0, 20) + '...' });

        res.json({ result: resultText });
    } catch (err) {
        console.error('❌ AI Edit Error:', err.response?.data || err.message);
        res.status(500).json({ error: 'AI processing failed' });
    }
});

module.exports = router;
