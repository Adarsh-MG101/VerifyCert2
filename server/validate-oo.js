
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function validate() {
    const serverUrl = process.env.SERVER_PUBLIC_URL || 'http://host.docker.internal:5000';
    const ooUrl = 'http://localhost:8080';

    console.log('--- OnlyOffice Integration Validation ---');
    console.log('Backend URL (Public):', serverUrl);
    console.log('OnlyOffice URL:', ooUrl);

    // 1. Check if OO is healthy
    try {
        const res = await axios.get(`${ooUrl}/healthcheck`);
        console.log('✅ OnlyOffice Healthcheck: OK');
    } catch (e) {
        console.error('❌ OnlyOffice Healthcheck: FAILED. Is it running?');
    }

    // 2. Check if Express is reachable on 0.0.0.0 (via loopback first)
    try {
        const res = await axios.get('http://127.0.0.1:5000/');
        console.log('✅ Express Server: OK');
    } catch (e) {
        console.error('❌ Express Server: FAILED. Is it running on port 5000?');
    }

    // 3. Check if a template file exists
    const uploadsDir = path.join(__dirname, 'uploads');
    const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.docx'));
    if (files.length > 0) {
        console.log(`✅ Template Files: OK (${files.length} found)`);
    } else {
        console.warn('⚠️ No .docx files found in uploads directory.');
    }

    console.log('-----------------------------------------');
}

validate();
