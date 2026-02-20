const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const https = require('https');
const http = require('http');
const { exec } = require('child_process');
const puppeteer = require('puppeteer');
const PizZip = require('pizzip');
const mammoth = require('mammoth');

const Template = require('../models/Template');
const auth = require('../middleware/auth');
const { tenantScope, verifyOwnership } = require('../middleware/tenantScope');

// Middleware to log all requests to this router
router.use((req, res, next) => {
    console.log(`📡 [OnlyOffice API] ${req.method} ${req.url} - IP: ${req.ip}`);
    next();
});

// ============================================================
// CONFIG
// ============================================================
const ONLYOFFICE_URL = process.env.ONLYOFFICE_URL || 'http://localhost:8080';
const SERVER_URL = process.env.SERVER_PUBLIC_URL || 'http://host.docker.internal:5000';
// For OnlyOffice to reach back to our Express server, it needs the 
// host-accessible URL. When running in Docker, use host.docker.internal.
// When running natively, use localhost.

// ============================================================
// Helper: Extract Placeholders (same logic from main routes)
// ============================================================
async function extractPlaceholders(filePath) {
    const buffer = fs.readFileSync(filePath);
    const zip = new PizZip(buffer);
    const xmlFiles = zip.file(/\.xml$/);

    const matches = new Set();
    const regex = /\{\{(.*?)\}\}/g;

    xmlFiles.forEach(file => {
        try {
            const content = file.asText();
            const cleanText = content.replace(/<[^>]+>/g, '');
            let match;
            while ((match = regex.exec(cleanText)) !== null) {
                const placeholder = match[1].trim().toUpperCase();
                const systemTags = ['CERTIFICATE_ID', 'QR_CODE', 'QR', 'IMAGE QR', 'IMAGE_QR', 'QRCODE'];
                if (!systemTags.includes(placeholder) && placeholder.length > 0 && !placeholder.includes('IMAGE ')) {
                    matches.add(placeholder);
                }
            }
        } catch (e) {
            console.error(`Error reading XML file ${file.name}:`, e);
        }
    });

    try {
        const result = await mammoth.extractRawText({ buffer });
        let match;
        while ((match = regex.exec(result.value)) !== null) {
            const placeholder = match[1].trim().toUpperCase();
            const systemTags = ['CERTIFICATE_ID', 'QR_CODE', 'QR', 'IMAGE QR', 'IMAGE_QR', 'QRCODE'];
            if (!systemTags.includes(placeholder) && placeholder.length > 0 && !placeholder.includes('IMAGE ')) {
                matches.add(placeholder);
            }
        }
    } catch (e) { }

    return Array.from(matches);
}

// ============================================================
// Helper: Generate Thumbnail
// ============================================================
async function generateThumbnail(docxPath, outputId) {
    const tempPdfName = path.basename(docxPath, '.docx') + '.pdf';
    const tempPdfPath = path.join(path.dirname(docxPath), tempPdfName);
    const pngPath = path.join(path.dirname(docxPath), `${outputId}.png`);

    const possiblePaths = [
        'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
        'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe'
    ];
    let sofficePath = possiblePaths.find(p => fs.existsSync(p)) || 'soffice';
    const outputDir = path.dirname(docxPath);
    const cmd = `"${sofficePath}" --headless --convert-to pdf --outdir "${outputDir}" "${docxPath}"`;

    await new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) resolve(stdout);
            else resolve(stdout);
        });
    });

    if (!fs.existsSync(tempPdfPath)) {
        throw new Error('PDF conversion failed, cannot generate thumbnail.');
    }

    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars', '--force-device-scale-factor=2']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 905 });
        const absolutePdfPath = path.resolve(tempPdfPath);
        const pdfUrl = `file:///${absolutePdfPath.replace(/\\/g, '/')}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`;
        await page.goto(pdfUrl, { waitUntil: 'networkidle0' });
        await new Promise(r => setTimeout(r, 1500));
        await page.screenshot({ path: pngPath, omitBackground: true });
    } finally {
        await browser.close();
        if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
    }

    return `uploads/${outputId}.png`;
}


// ============================================================
// 1. GET /onlyoffice/config/:templateId
//    Returns the OnlyOffice editor configuration for a template
// ============================================================
router.get('/config/:templateId', auth, tenantScope, async (req, res) => {
    console.log(`[OnlyOffice] Fetching config for template: ${req.params.templateId}`);
    try {
        const template = await Template.findById(req.params.templateId);
        if (!template) return res.status(404).json({ error: 'Template not found' });
        if (!verifyOwnership(template, req)) return res.status(403).json({ error: 'Access denied' });

        // The unique key forces OnlyOffice to pull a fresh copy when the document changes
        const docKey = `${template._id}_${Date.now()}`;

        const config = {
            document: {
                fileType: 'docx',
                key: docKey,
                title: template.name + '.docx',
                url: `${SERVER_URL}/api/onlyoffice/file/${template._id}`,
                permissions: {
                    download: true,
                    edit: true,
                    print: true,
                    review: false,
                    comment: false,
                }
            },
            editorConfig: {
                mode: 'edit',
                callbackUrl: `${SERVER_URL}/api/onlyoffice/callback/${template._id}`,
                lang: 'en',
                customization: {
                    autosave: true,
                    chat: false,
                    comments: false,
                    compactHeader: false,
                    compactToolbar: false,
                    forcesave: true,
                    help: false,
                    hideRightMenu: false,
                    hideRulers: false,
                    logo: {
                        image: '',
                        url: ''
                    },
                    macros: false,
                    toolbarNoTabs: false,
                    uiTheme: 'theme-light',
                    zoom: -1,
                },
                plugins: {
                    autostart: [
                        "asc.{6B50059E-9A97-4081-BE2C-35C3E002B376}"
                    ],
                    pluginsData: [
                        `${process.env.BASE_URL || 'http://localhost:3000'}/plugins/aitoolkit/config.json`
                    ]
                }
            },
            documentType: 'word',
        };

        res.json({
            config,
            onlyofficeUrl: ONLYOFFICE_URL,
            templateName: template.name,
            templateId: template._id,
            placeholders: template.placeholders
        });
    } catch (err) {
        console.error('OnlyOffice config error:', err);
        res.status(500).json({ error: err.message });
    }
});


// ============================================================
// 2. GET /onlyoffice/file/:templateId
//    Serves the actual DOCX file for OnlyOffice to load
// ============================================================
router.get('/file/:templateId', async (req, res) => {
    console.log(`[OnlyOffice] Serving file for template: ${req.params.templateId}`);
    try {
        const template = await Template.findById(req.params.templateId);
        if (!template) return res.status(404).json({ error: 'Template not found' });

        const absolutePath = path.resolve(template.filePath);
        if (!fs.existsSync(absolutePath)) {
            return res.status(404).json({ error: 'Template file not found on disk' });
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${template.name}.docx"`);
        res.sendFile(absolutePath);
    } catch (err) {
        console.error('File serve error:', err);
        res.status(500).json({ error: err.message });
    }
});


// ============================================================
// 3. POST /onlyoffice/callback/:templateId
//    OnlyOffice calls this when the document status changes
//    Status codes:
//      0 - no document with the key identifier (not used)
//      1 - document is being edited
//      2 - document is ready for saving (user closed editor / force-saved)
//      3 - document saving error
//      4 - document closed with no changes
//      6 - document is being edited but force save requested
//      7 - force save error
// ============================================================
router.post('/callback/:templateId', async (req, res) => {
    try {
        const { status, url, key } = req.body;
        const templateId = req.params.templateId;

        console.log(`📝 OnlyOffice Callback - Template: ${templateId}, Status: ${status}, Key: ${key}`);

        // Status 2 = document ready for saving
        // Status 6 = force save requested
        if (status === 2 || status === 6) {
            const template = await Template.findById(templateId);
            if (!template) {
                console.error('Template not found for callback:', templateId);
                return res.json({ error: 0 });
            }

            // Download the updated file from OnlyOffice
            const absolutePath = path.resolve(template.filePath);
            const fileStream = fs.createWriteStream(absolutePath);

            const downloadPromise = new Promise((resolve, reject) => {
                const protocol = url.startsWith('https') ? https : http;
                protocol.get(url, (response) => {
                    response.pipe(fileStream);
                    fileStream.on('finish', () => {
                        fileStream.close();
                        resolve();
                    });
                }).on('error', (err) => {
                    fs.unlink(absolutePath, () => { });
                    reject(err);
                });
            });

            await downloadPromise;
            console.log(`✅ Template file updated: ${template.name}`);

            // Re-extract placeholders from the updated file
            try {
                const newPlaceholders = await extractPlaceholders(absolutePath);
                template.placeholders = newPlaceholders;
                console.log(`🔍 Re-extracted ${newPlaceholders.length} placeholders:`, newPlaceholders);
            } catch (e) {
                console.error('Failed to re-extract placeholders:', e);
            }

            // Regenerate thumbnail
            try {
                // Delete old thumbnail
                if (template.thumbnailPath) {
                    const oldThumbPath = path.join(__dirname, '..', template.thumbnailPath);
                    if (fs.existsSync(oldThumbPath)) fs.unlinkSync(oldThumbPath);
                }

                const outputId = Date.now() + '-preview';
                const newThumbPath = await generateThumbnail(absolutePath, outputId);
                template.thumbnailPath = newThumbPath;
                console.log(`🖼️ Thumbnail regenerated: ${newThumbPath}`);
            } catch (e) {
                console.error('Failed to regenerate thumbnail:', e);
            }

            await template.save();
        }

        // OnlyOffice expects { "error": 0 } to acknowledge the callback
        res.json({ error: 0 });
    } catch (err) {
        console.error('❌ OnlyOffice Callback Error:', err);
        res.json({ error: 0 });
    }
});


// ============================================================
// 4. POST /onlyoffice/forcesave/:templateId
//    Manually trigger a force save from the frontend
// ============================================================
router.post('/forcesave/:templateId', auth, tenantScope, async (req, res) => {
    console.log(`[OnlyOffice] Requesting force save for template: ${req.params.templateId}`);
    try {
        const template = await Template.findById(req.params.templateId);
        if (!template) return res.status(404).json({ error: 'Template not found' });
        if (!verifyOwnership(template, req)) return res.status(403).json({ error: 'Access denied' });

        res.json({ success: true, message: 'Force save signal sent. OnlyOffice will trigger the callback.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ============================================================
// 5. POST /onlyoffice/refresh/:templateId
//    Re-extract placeholders and regenerate thumbnail
//    (used after editing in OnlyOffice)
// ============================================================
router.post('/refresh/:templateId', auth, tenantScope, async (req, res) => {
    console.log(`[OnlyOffice] Refreshing template data: ${req.params.templateId}`);
    try {
        const template = await Template.findById(req.params.templateId);
        if (!template) return res.status(404).json({ error: 'Template not found' });
        if (!verifyOwnership(template, req)) return res.status(403).json({ error: 'Access denied' });

        const absolutePath = path.resolve(template.filePath);
        if (!fs.existsSync(absolutePath)) {
            return res.status(404).json({ error: 'Template file not found' });
        }

        // Re-extract placeholders
        const newPlaceholders = await extractPlaceholders(absolutePath);
        template.placeholders = newPlaceholders;

        // Regenerate thumbnail
        try {
            if (template.thumbnailPath) {
                const oldThumbPath = path.join(__dirname, '..', template.thumbnailPath);
                if (fs.existsSync(oldThumbPath)) fs.unlinkSync(oldThumbPath);
            }
            const outputId = Date.now() + '-preview';
            const newThumbPath = await generateThumbnail(absolutePath, outputId);
            template.thumbnailPath = newThumbPath;
        } catch (e) {
            console.error('Thumbnail regeneration failed:', e);
        }

        await template.save();

        res.json({
            success: true,
            placeholders: newPlaceholders,
            thumbnailPath: template.thumbnailPath
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


module.exports = router;
