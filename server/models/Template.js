const mongoose = require('mongoose');

const TemplateSchema = new mongoose.Schema({
    name: { type: String, required: true },
    filePath: { type: String, required: true }, // Path to uploaded .docx
    thumbnailPath: { type: String }, // Path to preview PNG
    placeholders: [{ type: String }],
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    enabled: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

// Compound index: template name must be unique within an organization
TemplateSchema.index({ name: 1, organization: 1 }, { unique: true });

module.exports = mongoose.model('Template', TemplateSchema);
