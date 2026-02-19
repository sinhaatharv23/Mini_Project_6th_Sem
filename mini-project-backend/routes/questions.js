//imports 
const express = require('express');
const router = express.Router();//Creates an isolated router module.Intent: keep question-related logic separate from other routes.
const fetch = require('node-fetch') //used to call the AI worker service for generating questions from resume data.
const Questionset = require('../models/Questionset'); //Mongoose model for storing generated questionsets in MongoDB 
const Resume = require('../models/Resume'); //Mongoose model for accessing resume data, needed to link questionset to the source resume version.

// NOTE: For local development the AI worker in this workspace is started on port 8001.
// To change this without editing code, set the environment variable `AI_WORKER_URL`.
const AI_WORKER_URL = process.env.AI_WORKER_URL || 'http://localhost:8001'; //URL of the AI worker service, configurable via environment variable.

function normalizeQuestionsPayload(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.questions)) return payload.questions;
    if (payload && Array.isArray(payload.data)) return payload.data;
    return [];
}

async function saveQuestionsForUser(user_id, questionsPayload) {
    const resume = await Resume.findOne({ user_id });
    const normalizedQuestions = normalizeQuestionsPayload(questionsPayload);

    const saved = await Questionset.findOneAndUpdate(
        { user_id },
        {
            $set: {
                questions: normalizedQuestions,
                source_resume_version: resume ? resume.version : undefined
            }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return saved;
}

// Route for AI worker to POST generated questions back to backend
// POST /questions/save body: { user_id, questions }
router.post('/save', async (req, res) => {
    try {
        const { user_id, questions } = req.body;
        if (!user_id || !questions) return res.status(400).json({ error: 'user_id and questions are required' });

        const saved = await saveQuestionsForUser(user_id, questions);

        console.log(`Questions saved for user ${user_id}, id=${saved._id}`);
        return res.json({ ok: true, id: saved._id });
    } catch (err) {
        console.error('Error in /questions/save:', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// GET /questions/:user_id
// Fetch questions for a specific user
router.get('/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;
        const questionset = await Questionset.findOne({ user_id });
        if (!questionset) {
            return res.status(404).json({ error: 'Questions not found' });
        }
        return res.json({ questions: questionset.questions });
    } catch (err) {
        console.error('Error fetching questions:', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// POST /questions body: {user_id}
// Trigger question generation and return questions
router.post('/', async (req, res) => {
    try {
        const { user_id } = req.body;
        if (!user_id) return res.status(400).json({ error: 'user_id is required' }); //validate user_id presence

        const resume = await Resume.findOne({ user_id }); //Queries database for user’s resume.
        if (!resume || !resume.structured || Object.keys(resume.structured).length === 0) {
            return res.status(400).json({ error: 'Structured resume not found. Please upload and save resume first.' });
        }

        // ask AI worker to generate questions 
        //Sends request to AI microservice endpoint /generate_questions.
        const aiResp = await fetch(`${AI_WORKER_URL}/generate_questions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id })
        });

        if (!aiResp.ok) {
            const errorText = await aiResp.text();
            return res.status(aiResp.status).json({ error: 'AI worker error', status: aiResp.status, details: errorText });
        }

        const aiJson = await aiResp.json(); //Parse AI response body.
        if (aiJson && aiJson.status === 'error') {
            return res.status(502).json({ error: 'AI worker failed', details: aiJson.message || aiJson });
        }

        // AI worker returns questions directly
        // Save them and return them
        let savedId;
        let questions = [];

        // Handle different possible response structures
        if (Array.isArray(aiJson)) {
            questions = aiJson;
        } else if (aiJson && Array.isArray(aiJson.questions)) {
            questions = aiJson.questions;
        } else if (aiJson && Array.isArray(aiJson.data)) {
            questions = aiJson.data;
        }

        if (questions.length > 0) {
            const saved = await saveQuestionsForUser(user_id, questions);
            savedId = saved._id;

            return res.json({
                ok: true,
                id: savedId,
                message: 'Questions generation completed',
                questions: questions // Return questions to client
            });
        }

        return res.status(500).json({ error: "Failed to extract questions from AI response", details: aiJson });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;

