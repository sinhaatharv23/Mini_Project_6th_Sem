const mongoose = require('mongoose');
const { Schema } = mongoose;

const resumeSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  resume_text: { type: String },
  structured: { type: Schema.Types.Mixed, default: {} },
  version: { type: String, default: '1' },
  source: { type: String, default: 'uploaded' },
  saved_by: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Resume', resumeSchema);