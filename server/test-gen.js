
const createReport = require('docx-templates').default;
const fs = require('fs');
const path = require('path');

async function test() {
    const templatePath = 'uploads/1770386254136-Diploma Certificate.docx';
    const templateBuffer = fs.readFileSync(templatePath);

    // Logic from index.js
    const qrImage = {
        width: 4, height: 4, data: Buffer.from('fake-qr'), extension: '.png'
    };

    const finalData = {
        QR: qrImage,
        qr: qrImage,
        QRCODE: qrImage,
        qrcode: qrImage,
        NAME: 'TEST',
        name: 'TEST',
        ISSUED: '2026',
        issued: '2026',
        COORDIANTOR: 'ADMIN',
        coordiantor: 'ADMIN'
    };

    // Add IMAGE QR mapping as the route does in the loop/preprocessor
    finalData['IMAGE QR'] = qrImage;
    finalData['image qr'] = qrImage;

    try {
        console.log('Starting createReport with multi-case data...');
        const output = await createReport({
            template: templateBuffer,
            data: finalData,
            cmdDelimiter: ['{{', '}}'],
            additionalJsContext: {
                IMAGE: (d) => d
            }
        });
        console.log('✅ Success! Generated buffer size:', output.length);
    } catch (e) {
        console.error('❌ Failed!');
        console.error(e.message);
    }
}

test();
