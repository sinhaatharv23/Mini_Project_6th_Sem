const express = require('express');
const router = express.Router();
const SessionHistory = require('../models/SessionHistory');

//GET last 3 sessions:- 
router.get('/:user_id',async(req,res)=>{
    try{
        const {user_id} = req.params;

        const sessions = await SessionHistory.find({user: user_id})
            .sort({createdAt: -1})
            .limit(3)
            .populate("partner","username");
        const totalSessions = await SessionHistory.countDocuments({user: user_id});
        res.json({
            totalSessions,
            recentSessions: sessions
        });
    }catch(err){
        console.log(err);
        res.status(500).json({error:"Server erroe"});
    }
});

module.exports = router;