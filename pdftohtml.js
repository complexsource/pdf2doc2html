const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const { v4: uuidv4 } = require('uuid');
const convertapi = require('convertapi')('secret_6WYtmqkaUNigHSGf');

const app = express();
const PORT = 3000;
const tempBaseDir = path.join(__dirname, 'temp');

// Ensure temp directory exists
if (!fs.existsSync(tempBaseDir)) {
    fs.mkdirSync(tempBaseDir);
}

app.use(express.json());

app.post('/convert-pdf-url-to-html', async (req, res) => {
    const { pdfUrl } = req.body;
    if (!pdfUrl) return res.status(400).json({ error: 'No pdfUrl provided' });

    const pdfFileName = `${uuidv4()}.pdf`;
    const docxOutputDir = path.join(tempBaseDir, uuidv4());
    const pdfPath = path.join(tempBaseDir, pdfFileName);

    try {
        // Step 1: Download PDF to temp
        const response = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
        fs.writeFileSync(pdfPath, response.data);

        // Step 2: Convert PDF to DOCX using ConvertAPI
        const result = await convertapi.convert('docx', { File: pdfPath }, 'pdf');
        const savedFiles = await result.saveFiles(docxOutputDir);

        const docxPath = savedFiles[0];
        const docxBuffer = fs.readFileSync(docxPath);

        // Step 3: Convert DOCX buffer to HTML
        const htmlResult = await mammoth.convertToHtml({ buffer: docxBuffer });

        // Step 4: Clean up
        if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
        if (fs.existsSync(docxPath)) fs.unlinkSync(docxPath);
        if (fs.existsSync(docxOutputDir)) fs.rmSync(docxOutputDir, { recursive: true, force: true });

        res.json({ success: true, html: htmlResult.value });

    } catch (error) {
        console.error('Error:', error.message);
        if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
        if (fs.existsSync(docxOutputDir)) fs.rmSync(docxOutputDir, { recursive: true, force: true });

        res.status(500).json({ error: 'Conversion failed', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});