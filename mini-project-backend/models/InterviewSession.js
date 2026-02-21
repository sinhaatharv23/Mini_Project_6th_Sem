const mongoose = require('mongoose');
const {Schema} = mongoose;

const sessionQuestionSchema = new Schema({
    section: String,
    question: String,
    answer: String,
    used: {type: Boolean, default: false}
},{_id: false});

const interviewSessionSchema = new Schema({
    userA: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    userB : {
        type: Schema.Types.ObjectId,
        ref:'User',
        required: true
    },

    //Questions that userA will answer (generated from A's resume):
    questionsForA: {
        type: [sessionQuestionSchema],
        default: []
    },

    //Questions that userB will answer (generated from B's resume)
    questionsForB: {
        type: [sessionQuestionSchema],
        default: []
    },
    indexForA: {
        type: Number,
        default: 0
    },
    indexForB: {
        type: Number,
        default: 0
    },
    currentTurn:{
        type: Schema.Types.ObjectId, //stores userId of current interviewer
        ref: 'User'
    },
    currentQuestion: {
        type: sessionQuestionSchema,
        default: null
    },
    questionActive:{
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['active','ended','abandoned'],
        default: 'active'
    }
},{timestamps:true});

module.exports = mongoose.model('InterviewSession',interviewSessionSchema);