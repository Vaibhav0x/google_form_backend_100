const express = require("express");
const auth = require("../middleware/authMiddleware");
const { Form, Question } = require("../models");

const router = express.Router();

// Create Form
router.post("/", auth, async (req, res) => {
    try {
        if (req.user.role !== "admin")
            return res.status(403).json({ message: "Forbidden" });

        const { title, description, fields } = req.body;

        const form = await Form.create({
            title,
            description,
            created_by: req.user.id   // ✅ match your schema
        });

        console.log("Creating form with fields:", fields);
        if (fields && fields.length > 0) {
            for (const field of fields) {
                await Question.create({
                    form_id: form.id,
                    question_text: field.label,   // ✅ schema mapping
                    question_type: field.type,
                    required: field.required,
                    placeholder: field.placeholder || '',  // ✅ Save placeholder
                    options: field.options ? JSON.stringify(field.options) : null,
                    content: field.content,
                    max_images: field.max_images || 1,
                    checkbox_options: field.checkbox_options ? JSON.stringify(field.checkbox_options) : null,
                    choice_question: field.choice_question,
                    choice_options: field.choice_options ? JSON.stringify(field.choice_options) : null,
                    image_only: field.image_only || false,
                    max_images: field.max_images || 1,
                    enable_checkboxes: field.enable_checkboxes || false,
                    enable_multiple_choice: field.enable_multiple_choice || false,
                    multiple_choice_label: field.multiple_choice_label,
                    multiple_choice_options: field.multiple_choice_options ? JSON.stringify(field.multiple_choice_options) : null,
                    max_images: field.max_images || 1,
                    image_options: field.image_options ? JSON.stringify(field.image_options) : null,
                    admin_images: field.adminImages ? JSON.stringify(field.adminImages) : "[]",
                    enable_admin_images: field.enableAdminImages || false
                });
            }
        }

        const createdForm = await Form.findByPk(form.id, {
            include: Question
        });

        return res.json({
            form: {
                id: createdForm.id,
                title: createdForm.title,
                description: createdForm.description,
                fields: createdForm.Questions.map(q => ({
                    id: q.id,
                    label: q.question_text,         // ✅ map back for frontend
                    type: q.question_type,
                    required: q.required,
                    options: q.options ? JSON.parse(q.options) : [],
                    image_only: q.image_only,
                    max_images: q.max_images,
                    enable_checkboxes: q.enable_checkboxes,
                    enable_multiple_choice: q.enable_multiple_choice,
                    multiple_choice_label: q.multiple_choice_label,
                    multiple_choice_options: q.multiple_choice_options ? JSON.parse(q.multiple_choice_options) : []
                }))
            }
        });
    } catch (err) {
        console.error("Error creating form:", err);
        return res.status(500).json({ error: err.message });
    }
});


// Get public form by ID
router.get("/:formId/public", async (req, res) => {
    try {
        const form = await Form.findByPk(req.params.formId, {
            include: [Question],
            attributes: ['id', 'title', 'description']
        });

        if (!form) {
            return res.status(404).json({ message: "Form not found" });
        }

        // ✅ Fix: Directly return the response, don't assign to variable
        return res.json({
            id: form.id,
            title: form.title,
            description: form.description,
            fields: form.Questions.map(q => ({
                uid: q.id,
                label: q.question_text,
                type: q.question_type, // ✅ Make sure this matches frontend expectations
                required: q.required,
                placeholder: q.placeholder || "",
                options: q.options ? JSON.parse(q.options) : [],
                content: q.content || null,
                max_images: q.max_images || 1,
                checkbox_options: q.checkbox_options ? JSON.parse(q.checkbox_options) : [],
                choice_question: q.choice_question || "",
                choice_options: q.choice_options ? JSON.parse(q.choice_options) : [],
                adminImages: q.admin_images ? JSON.parse(q.admin_images) : [],
                enableAdminImages: q.enable_admin_images || false
            }))
        });
    } catch (err) {
        console.error("Error fetching public form:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});


// Get All Forms
router.get("/", auth, async (req, res) => {
    try {
        console.log('Fetching forms for user:', req.user.id);
        const query = {
            include: [Question],
            order: [['created_at', 'DESC']]
        };

        // Only filter by userId if user is not admin
        if (req.user.role !== 'admin') {
            query.where = { created_by: req.user.id };
        }
        const forms = await Form.findAll(query);
        console.log('Found forms:', forms.length);

        return res.json({
            forms: forms.map(f => ({
                id: f.id,
                title: f.title,
                description: f.description,
                created_at: f.created_at,
                created_by: f.created_by
            }))
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// Get Single Form by ID
// router.get("/:id", auth, async (req, res) => {
//     try {
//         const form = await Form.findByPk(req.params.id, { include: Question });
//         if (!form) return res.status(404).json({ message: "Form not found" });

//         console.log("Fetching form:", form.id);
//         const formattedForm = {
//             id: form.id,
//             title: form.title,
//             description: form.description,
//             fields: (form.Questions || []).map(q => ({
//                 id: q.id,
//                 label: q.question_text,
//                 type: q.question_type,
//                 required: q.required,
//                 placeholder: q.placeholder || '',
//                 options: q.options || [],
//                 content: q.content || '',
//                 max_images: q.max_images || 1,
//                 checkbox_options: q.checkbox_options || [],
//                 choice_question: q.choice_question || '',
//                 choice_options: q.choice_options || [],
//                 extra: q.extra || null
//             }))
//         };

//         console.log("Formatted form is:", formattedForm);

//         return res.json({ form: formattedForm });
//     } catch (err) {
//         console.error("Error fetching form:", err);
//         return res.status(500).json({ error: err.message });
//     }
// });
// Get Single Form by ID (debug version)
router.get("/:id", auth, async (req, res) => {
    try {
        const form = await Form.findByPk(req.params.id, { include: Question });
        if (!form) return res.status(404).json({ message: "Form not found" });

        console.log("=== RAW FORM FROM DB ===");
        console.log(JSON.stringify(form, null, 2));

        const formattedForm = {
            id: form.id,
            title: form.title,
            description: form.description,
            fields: (form.Questions || []).map(q => {
                console.log("---- Field Debug ----");
                console.log("ID:", q.id);
                console.log("question_text:", q.question_text);
                console.log("options (raw):", q.options);
                console.log("checkbox_options (raw):", q.checkbox_options);
                console.log("choice_options (raw):", q.choice_options);
                console.log("multiple_choice_options (raw):", q.multiple_choice_options);
                console.log("image_options (raw):", q.image_options);

                return {
                    id: q.id,
                    label: q.question_text,
                    type: q.question_type,
                    required: q.required,
                    placeholder: q.placeholder || '',
                    options: q.options,   // leave raw for now
                    content: q.content || '',
                    max_images: q.max_images || 1,
                    checkbox_options: q.checkbox_options,
                    choice_question: q.choice_question || '',
                    choice_options: q.choice_options,
                    image_only: q.image_only || false,
                    enable_checkboxes: q.enable_checkboxes || false,
                    enable_multiple_choice: q.enable_multiple_choice || false,
                    multiple_choice_label: q.multiple_choice_label || '',
                    multiple_choice_options: q.multiple_choice_options,
                    image_options: q.image_options,
                    extra: q.extra || null
                };
            })
        };

        console.log("=== FORMATTED FORM TO SEND ===");
        console.log(JSON.stringify(formattedForm, null, 2));

        return res.json({ form: formattedForm });
    } catch (err) {
        console.error("Error fetching form:", err);
        return res.status(500).json({ error: err.message });
    }
});



// Update Form
router.put("/:id", auth, async (req, res) => {
    try {
        if (req.user.role !== "admin")
            return res.status(403).json({ message: "Forbidden" });

        const { title, description, fields } = req.body;
        const form = await Form.findByPk(req.params.id);

        if (!form) return res.status(404).json({ message: "Form not found" });

        // Update form title/description
        form.title = title || form.title;
        form.description = description || form.description;
        await form.save();

        // Replace old questions
        await Question.destroy({ where: { form_id: form.id } });

        if (fields && fields.length > 0) {
            for (const field of fields) {
                await Question.create({
                    form_id: form.id,
                    question_text: field.label,
                    question_type: field.type,
                    required: field.required,
                    placeholder: field.placeholder || null,
                    options: field.options ? JSON.stringify(field.options) : null,
                    content: field.content || null,
                    max_images: field.max_images || 1,
                    checkbox_options: field.checkbox_options
                        ? JSON.stringify(field.checkbox_options)
                        : null,
                    choice_question: field.choice_question || null,
                    choice_options: field.choice_options
                        ? JSON.stringify(field.choice_options)
                        : null,
                    image_only: field.image_only || false,
                    enable_checkboxes: field.enable_checkboxes || false,
                    enable_multiple_choice: field.enable_multiple_choice || false,
                    multiple_choice_label: field.multiple_choice_label || null,
                    multiple_choice_options: field.multiple_choice_options
                        ? JSON.stringify(field.multiple_choice_options)
                        : null,
                    image_options: field.image_options
                        ? JSON.stringify(field.image_options)
                        : null,
                    extra: field.extra || null,
                });
            }
        }

        const updatedForm = await Form.findByPk(form.id, {
            include: Question,
        });

        return res.json({
            form: {
                id: updatedForm.id,
                title: updatedForm.title,
                description: updatedForm.description,
                fields: updatedForm.Questions.map((q) => ({
                    id: q.id,
                    label: q.question_text,
                    type: q.question_type,
                    required: q.required,
                    placeholder: q.placeholder,
                    options: q.options ? JSON.parse(q.options) : [],
                    content: q.content,
                    max_images: q.max_images,
                    checkbox_options: q.checkbox_options
                        ? JSON.parse(q.checkbox_options)
                        : [],
                    choice_question: q.choice_question,
                    choice_options: q.choice_options
                        ? JSON.parse(q.choice_options)
                        : [],
                    image_only: q.image_only,
                    enable_checkboxes: q.enable_checkboxes,
                    enable_multiple_choice: q.enable_multiple_choice,
                    multiple_choice_label: q.multiple_choice_label,
                    multiple_choice_options: q.multiple_choice_options
                        ? JSON.parse(q.multiple_choice_options)
                        : [],
                    image_options: q.image_options
                        ? JSON.parse(q.image_options)
                        : [],
                    extra: q.extra,
                })),
            },
        });
    } catch (err) {
        console.error("Error updating form:", err);
        return res.status(500).json({ error: err.message });
    }
});


// Delete Form
router.delete("/:id", auth, async (req, res) => {
    try {
        if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });

        const form = await Form.findByPk(req.params.id);
        if (!form) return res.status(404).json({ message: "Form not found" });

        await form.destroy();
        return res.json({ message: "Form deleted successfully" });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
