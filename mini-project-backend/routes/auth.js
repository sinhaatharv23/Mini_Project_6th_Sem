const router = require('express').Router();
//router handles /api/auth/* routes - so no need to mention /api/auth here
const User = require('../models/User');
//import User model 
// moongoose schema is in models/User.js - mapped to MongoDB collection 'users'

//POST /api/auth/register 

router.post('/register', async (req,res)=>{ //define route handler,mounted later as /api/auth/register
    try{
        const newUser = new User(req.body); //create new User document from request body
        const user = await newUser.save(); //save to DB - returns saved document
        res.status(200).json(user); //return saved user with 200 OK status
    }catch(err){
        res.status(500).json(err); //on error return 500 status with error object
    }
});

// POST /api/auth/login 
//declare route handler for login 
//decribes login endpoint

router.post('/login',async(req,res) => {
    try{
        const user = await User.findOne({email: req.body.email}) ; //searches for user by email ;the very first email in the request body , returns user document if found and null if not found
        if(!user) return res.status(404).json("User not found"); //if user not found return 404 status with message

        //check password - in real app, use hashed passwords and compare with bcrypt
        if(user.password !== req.body.password){
            return res.status(400).json("Invalid password"); //if password doesn't match return 400 status
        }
        res.status(200).json(user); //if login successful return user document with 200 OK status
    }catch(err){
        res.status(500).json(err); //on error return 500 status with error object
    }
});
// end of login route handler

//export the router to be used in main app
module.exports = router;



// Structural problems (non-optional to understand)
// Passwords are stored and compared in plain text
// -Must be hashed (bcrypt)
// User object is returned directly
// -Leaks password, internal fields
// No validation
// -Any junk data can be saved
// No authentication token
// -Login has no session or JWT

// Mental model

// This file defines authentication routes
// Express receives request → router matches path → handler runs
// MongoDB is accessed via Mongoose
// Response is manually constructed using res

// This code works mechanically. It is not safe.