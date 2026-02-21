const mongoose = require('mongoose');
const {Schema} = mongoose;

const questionSchema = new Schema({
    section:String,
    question: String,
    answer: String
},{_id:false});

const sessionHistorySchema = new Schema({
    user:{
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    partner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    questions:{
        type:[questionSchema],
        default:[]
    },
    duration:{
        type:Number //in seconds
    },
    status: {
        type: String,
        enum: ['completed','abandoned'],
        required: true
    }
},{timestamps:true});

module.exports=mongoose.model('SessionHistory',sessionHistorySchema);