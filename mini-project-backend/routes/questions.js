//imports 
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const Questionset = require('../models/Questionset'); 
const Resume = require('../models/Resume');

const AI_WORKER_URL = process.env.AI_WORKER_URL || 'http://localhost:8001';

function normalizeQuestionsPayload(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.questions)) return payload.questions;
    if (payload && Array.isArray(payload.data)) return payload.data;
    return [];
}

async function saveQuestionsForUser(user_id, questionsPayload) {
    const resume = await Resume.findOne({ user_id });
    const normalizedQuestions = normalizeQuestionsPayload(questionsPayload)
                                .map(q => ({
                                    section: q.section,
                                    question: q.question,
                                    answer: q.answer || "",
                                    used: false
                                }));

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

//////////////////////////////////////////////////////////////
// ✅ STEP 1 ADDED: CHECK IF USER CAN START INTERVIEW
// GET /questions/check/:userId
//////////////////////////////////////////////////////////////

router.get('/check/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const questionSet = await Questionset.findOne({ user_id: userId });

        if (!questionSet) {
            return res.json({ canStart: false });
        }

        const unusedQuestions = questionSet.questions.filter(q => !q.used);

        if (unusedQuestions.length < 5) {
            return res.json({ canStart: false });
        }

        return res.json({ canStart: true });

    } catch (err) {
        console.error("Error checking questions:", err);
        return res.status(500).json({ canStart: false });
    }
});

//////////////////////////////////////////////////////////////

// Route for AI worker to POST generated questions back to backend
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
router.post('/', async (req, res) => {
    try {
        const { user_id } = req.body;
        if (!user_id) return res.status(400).json({ error: 'user_id is required' });

        const REQUIRED = 5;
        const existing = await Questionset.findOne({ user_id });

        if (existing) {
            const unused = existing.questions.filter(q => !q.used);

            if (unused.length >= REQUIRED) {
                console.log("⚡ Returning stored unused questions");

                return res.json({
                    ok: true,
                    id: existing._id,
                    message: "Using stored unused questions",
                    questions: unused.slice(0, REQUIRED)
                });
            }
        }

        const resume = await Resume.findOne({ user_id });
        if (!resume || !resume.structured || Object.keys(resume.structured).length === 0) {
            return res.status(400).json({ error: 'Structured resume not found. Please upload and save resume first.' });
        }

        console.log("🤖 Generating fresh questions via AI worker...");

        const aiResp = await fetch(`${AI_WORKER_URL}/generate_questions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id })
        });

        if (!aiResp.ok) {
            const errorText = await aiResp.text();
            return res.status(aiResp.status).json({ error: 'AI worker error', status: aiResp.status, details: errorText });
        }

        const aiJson = await aiResp.json();
        if (aiJson && aiJson.status === 'error') {
            return res.status(502).json({ error: 'AI worker failed', details: aiJson.message || aiJson });
        }

        let questions = [];

        if (Array.isArray(aiJson)) {
            questions = aiJson;
        } else if (aiJson && Array.isArray(aiJson.questions)) {
            questions = aiJson.questions;
        } else if (aiJson && Array.isArray(aiJson.data)) {
            questions = aiJson.data;
        }

        if (questions.length > 0) {

            if (existing) {

                const newQuestions = questions.map(q => ({
                    section: q.section,
                    question: q.question,
                    answer: q.answer || "",
                    used: false
                }));

                existing.questions.push(...newQuestions);
                await existing.save();

                const finalQuestions = existing.questions
                    .filter(q => !q.used)
                    .slice(0, REQUIRED);

                return res.json({
                    ok: true,
                    message: "Questions ready",
                    questions: finalQuestions
                });

            } else {

                const saved = await saveQuestionsForUser(user_id, questions);

                return res.json({
                    ok: true,
                    id: saved._id,
                    message: "Questions ready",
                    questions: saved.questions.slice(0, REQUIRED)
                });
            }
        }

        return res.status(500).json({ error: "Failed to extract questions from AI response", details: aiJson });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;