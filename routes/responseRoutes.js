const express = require("express");
const auth = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { Response, Form, Question, Answer, User } = require("../models");
const GoogleDriveService = require("../services/googleDriveService");

const router = express.Router();
const googleDriveService = new GoogleDriveService();

// Configure multer for temporary file storage
const storage = multer.diskStorage({
    destination: async function (req, file, cb) {
        const tempDir = path.join(__dirname, '..', 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        cb(null, tempDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Submit Response (User or Anonymous)
router.post("/:formId/responses", upload.array('files'), async (req, res) => {
    try {
        const { formId } = req.params;
        const { answers, email } = req.body;
        const parsedAnswers = JSON.parse(answers || '[]');
        const ipAddress = req.ip || req.connection.remoteAddress;

        // Get form details
        const form = await Form.findByPk(formId);
        console.log("Form details:", form);
        if (!form) {
            return res.status(404).json({ message: "Form not found" });
        }

        // Check for multiple submissions if not allowed
        if (!form.allow_multiple_responses) {
            // Check by email if required
            if (form.require_email) {
                if (!email) {
                    return res.status(400).json({
                        message: "Email is required for this form"
                    });
                }

                const existingResponseByEmail = await Response.findOne({
                    where: {
                        form_id: formId,
                        respondent_email: email
                    }
                });

                if (existingResponseByEmail) {
                    return res.status(403).json({
                        message: "You have already submitted this form"
                    });
                }
            }

            // Check by IP address as fallback
            const existingResponseByIP = await Response.findOne({
                where: {
                    form_id: formId,
                    ip_address: ipAddress
                }
            });

            if (existingResponseByIP) {
                return res.status(403).json({
                    message: "Multiple submissions are not allowed for this form"
                });
            }
        }

        // Create response
        const response = await Response.create({
            form_id: formId,
            user_id: req.user?.id || null,
            respondent_email: email || null,
            ip_address: ipAddress
        });
        console.log("Created response:", response);
        // Create a folder for this form if it doesn't exist
        let formFolderId;
        try {
            formFolderId = await googleDriveService.createFormFolder(formId, form.title);
        } catch (error) {
            console.error('Error creating form folder:', error);
            formFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER;
        }

        // Process each answer
        for (const answer of answers) {
            try {
                const question = await Question.findByPk(answer.questionId);
                if (!question) continue;

                // Validate the question exists and matches the type
                if (!question || question.question_type !== answer.type) {
                    console.error(`Invalid question ID ${answer.questionId} or type mismatch`);
                    continue;
                }

                const answerData = {
                    response_id: response.id,
                    question_id: answer.questionId
                };

                // Handle files if present
                if (req.files && req.files.length > 0) {
                    const filesForThisQuestion = req.files.filter(file =>
                        file.fieldname === `files_${answer.questionId}`
                    );

                    if (filesForThisQuestion.length > 0) {
                        const fileUrls = [];
                        for (const file of filesForThisQuestion) {
                            try {
                                console.log(`Processing file: ${file.originalname} from path: ${file.path}`);

                                // Check if file exists in temp folder
                                if (!fs.existsSync(file.path)) {
                                    console.error(`File not found in temp folder: ${file.path}`);
                                    continue;
                                }

                                // Upload file to Google Drive
                                console.log(`Uploading to Google Drive folder: ${formFolderId}`);
                                const driveFileId = await googleDriveService.uploadFile(
                                    file.path,
                                    file.originalname,
                                    formFolderId
                                );

                                if (!driveFileId) {
                                    console.error('Failed to get file ID from Google Drive upload');
                                    continue;
                                }

                                // Get shareable link
                                console.log(`Getting shareable link for file ID: ${driveFileId}`);
                                const fileUrl = await googleDriveService.getShareableLink(driveFileId);
                                if (fileUrl) {
                                    fileUrls.push(fileUrl);
                                    console.log(`File uploaded successfully: ${fileUrl}`);
                                }

                                // Delete the temporary file
                                fs.unlink(file.path, (err) => {
                                    if (err) {
                                        console.error('Error deleting temporary file:', err);
                                    } else {
                                        console.log(`Temporary file deleted: ${file.path}`);
                                    }
                                });
                            } catch (error) {
                                console.error('Error uploading file to Google Drive:', error);
                                // Continue with other files even if one fails
                            }
                        }

                        if (fileUrls.length > 0) {
                            answerData.file_paths = JSON.stringify(fileUrls);
                            console.log(`Saved ${fileUrls.length} file URLs to answer data`);
                        }
                    }
                }

                // Handle specific question types
                switch (question.question_type) {
                    case 'image_upload':
                        if (answer.images) {
                            answerData.image_urls = JSON.stringify(answer.images);
                        }
                        if (answer.checkboxes || answer.multipleChoice) {
                            answerData.image_responses = JSON.stringify({
                                checkboxes: answer.checkboxes || [],
                                multiple_choice: answer.multipleChoice
                            });
                        }
                        break;

                    case 'checkboxes':
                        if (Array.isArray(answer.text)) {
                            answerData.selected_options = JSON.stringify(answer.text);
                            answerData.answer_text = answer.text.join(', ');
                        } else if (answer.text) {
                            // Handle single checkbox
                            answerData.selected_options = JSON.stringify([answer.text]);
                            answerData.answer_text = answer.text;
                        }
                        break;

                    case 'multiple_choice':
                        if (answer.text) {
                            answerData.selected_choices = JSON.stringify(answer.text);
                            answerData.answer_text = answer.text;
                        }
                        break;

                    case 'file_upload':
                        // File paths will be handled by the file upload section
                        break;

                    default:
                        // For text inputs and paragraphs
                        answerData.answer_text = answer.text || null;
                }

                await Answer.create(answerData);
            } catch (error) {
                console.error('Error processing answer:', error);
                continue; // Continue with next answer even if one fails
            }
        }

        return res.status(201).json({
            message: "Form response submitted successfully",
            response: {
                id: response.id,
                formId: formId,
                submittedAt: response.submitted_at
            }
        });
    } catch (err) {
        console.error('Form submission error:', err);
        return res.status(500).json({
            error: "Failed to submit form response",
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }

    return res.json(response);
});

// Get Responses for a Form
router.get("/:formId/responses", auth, async (req, res) => {
    try {
        const { formId } = req.params;

        // Check if user has permission to view responses
        const form = await Form.findByPk(formId);
        if (!form) {
            return res.status(404).json({ message: "Form not found" });
        }

        if (req.user.id !== form.created_by && req.user.role !== "admin") {
            return res.status(403).json({ message: "Forbidden" });
        }

        // Get responses with user information
        const responses = await Response.findAll({
            where: { form_id: formId },
            include: [
                {
                    model: Form,
                    attributes: ['title', 'description']
                },
                {
                    model: Answer,
                    include: [{
                        model: Question,
                        attributes: ['question_text', 'question_type', 'options']
                    }]
                },
                {
                    model: User,
                    attributes: ['id', 'name', 'email'],
                    required: false // Left join to include anonymous responses
                }
            ],
            order: [['created_at', 'DESC']]
        });

        // Format response data
        const formattedResponses = responses.map(response => ({
            id: response.id,
            submittedAt: response.created_at,
            respondent: response.User ? {
                name: response.User.name,
                email: response.User.email
            } : {
                name: 'Anonymous',
                email: response.respondent_email || 'N/A'
            },
            answers: response.Answers.map(answer => ({
                question: answer.Question.question_text,
                type: answer.Question.question_type,
                answer: answer.answer_text,
                selectedOptions: answer.selected_options ? JSON.parse(answer.selected_options) : null,
                selectedChoices: answer.selected_choices ? JSON.parse(answer.selected_choices) : null,
                fileUrls: answer.file_paths ? JSON.parse(answer.file_paths) : null,
                imageUrls: answer.image_urls ? JSON.parse(answer.image_urls) : null,
                imageResponses: answer.image_responses ? JSON.parse(answer.image_responses) : null
            }))
        }));

        return res.json(formattedResponses);
    } catch (err) {
        console.error('Error fetching responses:', err);
        return res.status(500).json({ error: err.message });
    }
});

// Export responses as CSV
router.get("/:formId/csv", auth, async (req, res) => {
    try {
        const { formId } = req.params;

        // Check permissions
        const form = await Form.findByPk(formId);
        if (!form) {
            return res.status(404).json({ message: "Form not found" });
        }

        if (req.user.id !== form.created_by && req.user.role !== "admin") {
            return res.status(403).json({ message: "Forbidden" });
        }

        // Get all responses
        const responses = await Response.findAll({
            where: { form_id: formId },
            include: [
                { model: User, attributes: ['name', 'email'], required: false },
                {
                    model: Answer,
                    include: [{
                        model: Question,
                        attributes: ['question_text', 'question_type']
                    }]
                }
            ],
            order: [['created_at', 'DESC']]
        });

        // Get all questions for headers
        const questions = await Question.findAll({
            where: { form_id: formId },
            order: [['id', 'ASC']]
        });

        // Create CSV headers
        const headers = ['Submission ID', 'Submitted At', 'Respondent Name', 'Respondent Email']
            .concat(questions.map(q => q.question_text));

        // Create CSV rows
        const rows = responses.map(response => {
            const baseData = {
                id: response.id,
                submittedAt: response.created_at,
                respondentName: response.User ? response.User.name : 'Anonymous',
                respondentEmail: response.User ? response.User.email : (response.respondent_email || 'N/A')
            };

            // Add answers in the correct order
            const answerMap = {};
            response.Answers.forEach(answer => {
                let displayValue = answer.answer_text;

                if (answer.selected_options) {
                    displayValue = JSON.parse(answer.selected_options).join(', ');
                } else if (answer.file_paths) {
                    displayValue = JSON.parse(answer.file_paths).join(', ');
                }

                answerMap[answer.question_id] = displayValue || 'No response';
            });

            // Add answers in the same order as questions
            const answers = questions.map(q => answerMap[q.id] || 'No response');

            return [
                baseData.id,
                baseData.submittedAt,
                baseData.respondentName,
                baseData.respondentEmail,
                ...answers
            ];
        });

        // Generate CSV content
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell =>
                cell ? `"${String(cell).replace(/"/g, '""')}"` : '""'
            ).join(','))
        ].join('\n');

        // Set headers for CSV download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=form_responses_${formId}.csv`);

        return res.send(csvContent);
    } catch (err) {
        console.error('Error generating CSV:', err);
        return res.status(500).json({ error: err.message });
    }
});


module.exports = router;
