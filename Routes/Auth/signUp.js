const express = require("express");
const User = require("../../Schema/userModel");
const mongoose = require('mongoose');
const bodyParser = require('body-parser');;

const Router = express.Router();

Router.post("/createUser" , bodyParser.json() ,async(req , res , next)=>{
    try {
        // Create a new user based on the request body
        const newUser = new User({
          email: req.body.email,
          password: req.body.password,
        });
    
        // Save the user to the database
        const savedUser = await newUser.save();
    
        res.status(201).json(savedUser);
      } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
})


module.exports = Router;



module.exports = Router;