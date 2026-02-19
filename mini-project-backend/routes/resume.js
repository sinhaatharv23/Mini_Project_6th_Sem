const express = require('express');
const router = express.Router();
const multer = require('multer');
const mammoth = require('mammoth');
const pdf = require("pdf-parse");
const Resume = require('../models/Resume');
const fetch = require('node-fetch');

const AI_WORKER_URL = process.env.AI_WORKER_URL || 'http://localhost:8001';

// Multer setup for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
//Configures multer to store uploaded files in memory (buffer).Intent:Avoid writing files to disk.Directly process buffer for text extraction.  

async function extractText(buffer, mimetype, filename) {
    if (mimetype === 'application/pdf' || filename.endsWith('.pdf')) {
        // Use pdf-parse to extract text from PDF
        const data = await pdf(buffer);
        return data.text;
    }
    if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || filename.endsWith('.docx')) {
        // Use mammoth to extract text from DOCX
        const result = await mammoth.extractRawText({ buffer: buffer });
        return result.value;
    }
    //fallback : assume utf-8 text
    return buffer.toString('utf-8');
}

function isValidStructuredPayload(data) {
    return !!data && typeof data === 'object' && !Array.isArray(data);
}

function normalizeStructuredPayload(payload) {
    if (isValidStructuredPayload(payload?.structured)) return payload.structured;
    if (isValidStructuredPayload(payload?.data)) return payload.data;
    if (isValidStructuredPayload(payload)) return payload;
    return null;
}

//Accept file upload(field'file') or JSON {user_id, resume_text}
router.post('/upload', upload.single('file'), async (req, res) => {
    console.log("--> Received /resume/upload request");
    console.log("Body:", req.body);
    if (req.file) console.log("File received:", req.file.originalname, req.file.mimetype);
    else console.log("No file received");

    try {
        const user_id = req.body.user_id;
        let resume_text = req.body.resume_text;

        // If file is uploaded, extract text from it
        if (req.file) {
            resume_text = await extractText(req.file.buffer, req.file.mimetype, req.file.originalname);
        }

        // Validate required fields 
        if (!user_id || !resume_text) {
            return res.status(400).json({ error: 'user_id and resume_text/file are required' });
        }

        //save or upert raw resume 
        const doc = await Resume.findOneAndUpdate(
            { user_id },
            { $set: { resume_text, source: 'uploaded' } }, // only update text and source, keep versioning and structured data intact
            { upsert: true, new: true, setDefaultsOnInsert: true } // create new if not exist, return updated doc
            //what is setDefaultsOnInsert? -> when upsert creates a new document, it applies default values specified in the schema. If false, defaults are not applied during upsert creation.
        );

        //call AI worker to process resume and generate structured data and questionset
        console.log('Calling AI Worker at:', AI_WORKER_URL);
        const aiResp = await fetch(`${AI_WORKER_URL}/process_resume`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resume_text, user_id })
        });

        if (!aiResp.ok) {
            const errorText = await aiResp.text();
            console.error('AI Worker error:', aiResp.status, errorText);
            //don't fail the whole request if AI worker fails - return raw + a warning
            return res.status(502).json({ error: "AI worker error", status: aiResp.status, details: errorText });
        }

        //If AI fails:
        // Return 502 (Bad Gateway)
        // Do NOT crash request
        // Intent:Prevent AI dependency from breaking core system.

        const aiJson = await aiResp.json();
        console.log('AI Worker response received, parsing...');

        // Check if response is an error
        if (aiJson.status === 'error' || aiJson.message && aiJson.message.includes('error')) {
            console.error('AI Worker returned error:', aiJson);
            return res.status(502).json({ error: "AI worker failed to parse resume", details: aiJson });
        }

        let structured = {};

        // Extract structured data with multiple fallbacks
        if (aiJson.structured && typeof aiJson.structured === 'object') {
            structured = aiJson.structured;
            console.log('✓ Using aiJson.structured');
        } else if (aiJson.data && typeof aiJson.data === 'object') {
            structured = aiJson.data;
            console.log('✓ Using aiJson.data');
        } else if (aiJson.skills || aiJson.projects || aiJson.experience) {
            structured = aiJson;
            console.log('✓ Using aiJson as structured (detected skills/projects/experience)');
        } else {
            console.warn('⚠ AI response does not match expected structure. Keys:', Object.keys(aiJson));
            structured = aiJson;
        }

        console.log('Structured data keys:', Object.keys(structured));

        //update structured field 
        doc.structured = structured;
        await doc.save();
        console.log('Resume saved successfully with structured data');
        // Database now stores:
        // raw resume text
        // structured parsed version

        return res.json({ ok: true, resume: doc }); // Return the updated resume document, including structured data. Client can use this for display or further processing.
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});


// Save validated/edited structured resume from frontend
router.post('/save', async (req, res) => {//Endpoint to overwrite structured data after user edits.
    try {
        const { user_id } = req.body;
        const structured = normalizeStructuredPayload(req.body);

        if (!user_id || !structured) return res.status(400).json({
            error: 'user_id and structured data required'
        });

        const doc = await Resume.findOneAndUpdate(
            { user_id },
            { $set: { structured } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        //Upsert structured data only.
        // Intent:
        // Allow user correction of AI output.
        return res.json({ ok: true, resume: doc });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// AI worker compatibility endpoint
// POST /resume/raw body: { user_id, resume_text }
router.post('/raw', async (req, res) => {
    try {
        const { user_id, resume_text } = req.body;
        if (!user_id || !resume_text) {
            return res.status(400).json({ error: 'user_id and resume_text are required' });
        }

        await Resume.findOneAndUpdate(
            { user_id },
            { $set: { resume_text, source: 'ai_worker' } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        return res.json({ status: 'saved' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// AI worker compatibility endpoint
// POST /resume/structured body: { user_id, data } or { user_id, structured }
router.post('/structured', async (req, res) => {
    try {
        const { user_id } = req.body;
        const structured = normalizeStructuredPayload(req.body);
        if (!user_id || !structured) {
            return res.status(400).json({ error: 'user_id and structured data are required' });
        }

        const doc = await Resume.findOneAndUpdate(
            { user_id },
            { $set: { structured } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        return res.json({ status: 'saved', structured: doc.structured });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// Get Structured resume for a user
router.get('/structured/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;
        //Query DB. Intent:Fetch raw resume text for given user_id. Used when client needs original text (e.g., for editing or reprocessing).
        const doc = await Resume.findOne({ user_id });
        if (!doc) return res.status(404).json({ error: 'Not found' });
        //Error handling. If no resume found for user_id, return 404. Prevents confusion with empty responses.
        const structured = doc.structured || {};

        // Include both shapes:
        // 1) legacy frontend shape: { structured, resume_text }
        // 2) AI worker expected shape: top-level skills/projects/experience
        return res.json({
            ...structured,
            structured,
            resume_text: doc.resume_text,
            user_id: String(doc.user_id)
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

//Get Raw resume 
router.get('/raw/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;
        const doc = await Resume.findOne({ user_id });
        if (!doc) return res.status(404).json({ error: 'Not found' });
        return res.json({ resume_text: doc.resume_text });
        //Intent:
        // Allow retrieval of just the unprocessed text. Useful for clients that want to display or edit the original resume without structured data.
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// AI worker compatibility endpoint
// GET /resume/:user_id -> { user_id, resume_text }
router.get('/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;
        const doc = await Resume.findOne({ user_id });
        if (!doc) return res.status(404).json({ error: 'Not found' });
        return res.json({ user_id: String(doc.user_id), resume_text: doc.resume_text });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
