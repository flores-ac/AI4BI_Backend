const express = require('express');
const { fetchBigQueryData } = require('../../Services/bigQueryService');
const { verifyTokenFromCookie } = require('../../Utils/tokenUtils');  // Import the token utility
const User = require("../../Schema/userModel"); 
const router = express.Router();

// BigQuery Data Route
router.get('/bigquery-data', async (req, res) => {
  try {
    // Step 1: Validate JWT from cookie
    const decoded = verifyTokenFromCookie(req, res);  // Verify the JWT from the cookie
    if (!decoded || decoded.message) {
      return res.status(401).json({ message: 'Unauthorized: Invalid or missing token' });
    }

    // Step 2: Extract userId from decoded token
    const userId = decoded.userId;

    // Step 3: Fetch the user from the database using the userId
    const user = await User.findById(userId).select('-password');  // Exclude sensitive info like password

    if (!user) {
      throw new Error('User not found');
    }

    // Step 4: Get the user's Google access token from the database
    const encryptedGoogleAccessToken = user.googleAccessToken;
    if (!encryptedGoogleAccessToken) {
      return res.status(401).json({ message: 'Unauthorized: No access token found for this user' });
    }

    // Step 5: Fetch data from BigQuery using the encrypted access token
    const data = await fetchBigQueryData(encryptedGoogleAccessToken);

    // Step 6: Return the fetched data as a response
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error in BigQuery route:', error);
    return res.status(500).json({ message: 'Failed to fetch data from BigQuery', error });
  }
});

module.exports = router;
