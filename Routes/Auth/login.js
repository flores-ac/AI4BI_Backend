const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const User = require("../../Schema/userModel"); 

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000"; // Your frontend URL

const router = express.Router();

// Helper function to create a secure HTTP-only cookie with the JWT
const setTokenCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,  // Cannot be accessed by JavaScript
    maxAge: 24 * 60 * 60 * 1000,  // 1 day expiration
    sameSite: 'Strict'  // Helps mitigate CSRF attacks
  });
};

// Helper function to verify JWT
const verifyTokenFromCookie = (req, res) => {
  const token = req.cookies.token ? req.cookies.token : null;  // Get the JWT from the HTTP-only cookie
  if (!token) {
      throw new Error('Token not found');
  }
  
  try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return decoded;
  } catch (err) {
      return res.status(403).json({ message: 'Invalid token' });
  }
};

  
// Google Callback Route - Get user and JWT token from Passport and set HTTP-only cookie
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login/failed",  // Redirect on failure
  }),
  (req, res) => {
    // Extract token from req.user (which now contains both user and token from Passport.js)
    const { token, user } = req.user;
    
    // Set the JWT in an HTTP-only cookie
    setTokenCookie(res, token);

    // Redirect to client app (no need to send token in URL)
    res.redirect(`${CLIENT_URL}`);
  }
);

// Login Success Route - Return user info, no need to send the token here as it's in the cookie
router.get("/login/success", (req, res) => {
  if (req.user) {
    const { user } = req.user;  // Extract the user info from req.user
    res.status(200).json({
      error: false,
      message: "User has successfully authenticated",
      user: user  // Send the user info
    });
  } else {
    res.status(403).json({
      error: true,
      message: "Not Authorized",
    });
  }
});

// Login Failure Route - Handle login failure
router.get("/login/failed", (req, res) => {
  res.status(401).json({
    error: true,
    message: "Login Failure",
  });
});

// Logout Route - Clear the HTTP-only cookie and send response
router.get("/logout", (req, res) => {
    try {
      // Clear the token cookie
      res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict'
      });
  
      // Send response after clearing the cookie
      return res.status(200).json({
        message: "Logged out successfully",
      });
    } catch (err) {
      console.error(err);
      // If there's an error, return a 500 response
      return res.status(500).json({
        message: "Some error occurred at the server",
      });
    }
  });
  

// User Info Route - Protected, should fetch user from database using decoded JWT userId
router.get('/user', async (req, res) => {
    try{
      const decoded = verifyTokenFromCookie(req, res); 
      const userId = decoded.userId;  // Extract the userId from the decoded JWT
      if (!decoded || decoded.message) {
        // Token verification failure, return with an appropriate error message
        return;
    }
    
    
   

   

        // Fetch the user from the database using the userId, exclude sensitive info like password
        const user = await User.findById(userId).select('-password');

        if (!user) {
            // If no user is found, return a response immediately and stop execution
            return res.status(404).json({ message: 'User not found' });
        }

        // Send user data, including fields like profile picture
        return res.status(200).json({
            userId: user._id,
            email: user.email,
            name: user.name,
            profilePicture: user.profilePicture,
            company: user.company,
            role: user.role
        });

    } catch (err) {
        console.error(err);

        // If the error was a custom error with a status code, return that
        if (err.status) {
            return res.status(err.status).json({ message: err.message });
        }
        else{// Handle unknown errors
          return res.status(500).json({ message: 'Internal server error' });}
        
    }
    
});


module.exports = router;
