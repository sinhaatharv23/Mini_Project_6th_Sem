const mongoose = require('mongoose');
const { Schema } = mongoose;

const questionSchema = new Schema({
  section: String,
  question: String,
  answer: String,

  //Edited by: Atharva
  used: {
    type: Boolean,
    default:false
  }
}, { _id: false });

const questionsetSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  questions: { type: [questionSchema], default: [] },
  source_resume_version: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Questionset', questionsetSchema);