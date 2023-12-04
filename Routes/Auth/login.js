const express = require("express");
const userModel = require("../../Schema/userModel");
const mongoose = require("mongoose");

const Router = express.Router();

Router.get("/Authentication/:email/:password" , async(req , res , next)=>{
    const email = req.params.email;
    const password = req.params.password;
    const data = await userModel.findOne({email : { $regex: new RegExp("^" + email + "$", "i") }});
    if(data === null){
        res.status(200).json({
            "status" : "err",
            "message" : "No User Found"
        })
    }else{
        if(password === data.password){
            res.status(200).json({
                "status" : "awk",
                "allowed" : true,
                "email" : data.email
            })  
        }else{
            res.status(200).json({
                "status" : "err",
                "message" : "Invalid Credentials"
            })
        }
    }
})

Router.get("/Authorization/:id" , async(req , res , next)=>{
    const id = req.params.id;
    const objectId = new mongoose.Types.ObjectId(id);
    const data = await userModel.findOne({"_id" : objectId})

    if(data === null){
        
    }


})




module.exports = Router;