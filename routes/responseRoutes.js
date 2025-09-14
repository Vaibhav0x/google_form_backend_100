const express = require("express");
const auth = require("../middleware/authMiddleware");
const { Response, Form, Question, Answer } = require("../models");

const router = express.Router();

// Submit Response (User)
router.post("/:formId", auth, async (req, res) => {
    try {
        const { formId } = req.params;
        const { answers } = req.body;

        const response = await Response.create({
            form_id: formId,
            user_id: req.user.id
        });

        // Process each answer
        for (const answer of answers) {
            const question = await Question.findByPk(answer.questionId);
            if (!question) continue;

            const answerData = {
                response_id: response.id,
                question_id: answer.questionId,
                answer_text: answer.text || null
            };

            // Handle image upload answers
            if (question.question_type === 'image_upload' && answer.images) {
                answerData.image_urls = answer.images;
                answerData.image_responses = {
                    checkboxes: answer.checkboxes || [],
                    multiple_choice: answer.multipleChoice || []
                };
            }

            await Answer.create(answerData);
        }

        return res.json(response);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// Get Responses for a Form (Admin)
router.get("/:formId", auth, async (req, res) => {
    try {
        if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });

        const { formId } = req.params;
        const responses = await Response.findAll({
            where: { form_id: formId },
            include: [
                { model: Form },
                {
                    model: Answer,
                    include: [{ model: Question }]
                }
            ],
        });

        return res.json(responses);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
