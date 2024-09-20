const express = require('express');
const passport = require('passport');
const mongoose = require('mongoose');
const userModel = require('./models/user'); // Adjust the path as necessary

const Router = express.Router();

router.get(
    "/google/callback",
    passport.authenticate("google", {
        successRedirect: "process.env.CLIENT_URL",
        failureRedirect: "/login/failed",
    })
);
router.get("/login/success", (req, res) => {
    if(req.user){
        res.status(200).json({
            error:false,
            message:"User has successfully authenticated",
            user:req.user
        });
    } else {
        res.status(403).json({
            error:true,
            message:"Not Authorized"
        });
    }
});
router.get("/login/failed", (req, res) => {
    res.status(401).json({
        error:true,
        message:"log in Failure",
    });
});
router.get("/logout", (req, res) => {
    req.logout();
    res.redirect(process.env.CLIENT_URL);
});




module.exports = Router;