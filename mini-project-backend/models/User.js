const mongoose = require('mongoose');

// Schema defines what a user looks like in the database 
const userSchema = new mongoose.Schema({
    username: {type: String, required :true },
    email:    {type: String, required:true ,unique: true},
    password: {type: String, required:true }, //hashing not included for simplicity
    role:    {type: String, default : 'user' }
    },{timestamps: true}
  // adds createdAt and updatedAt fields 
)

module.exports = mongoose.model('User', userSchema);