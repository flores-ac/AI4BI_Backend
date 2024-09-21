const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');

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

// Logout Route - Clear the HTTP-only cookie
router.get("/logout", (req, res) => {
  // Clear the token cookie
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict'
  });
  res.json({
    message: "Logged out successfully",
  });
});

// User Info Route - Protected, should verify JWT instead of relying on req.user
router.get('/user', (req, res) => {
  // Get JWT from the HTTP-only cookie
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);  // Verify the token
    res.status(200).json({ user: decoded });  // Send the decoded user info (from the JWT payload)
  } catch (err) {
    res.status(403).json({ message: 'Invalid token' });
  }
});

module.exports = router;
