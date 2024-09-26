const jwt = require('jsonwebtoken');

// Helper function to verify JWT from HTTP-only cookie
const verifyTokenFromCookie = (req, res) => {
  // Get the JWT from the HTTP-only cookie
  const token = req.cookies.token ? req.cookies.token : null;

  // If the token is not present, throw an error
  if (!token) {
    throw new Error('Token not found');
  }

  try {
    // Verify the JWT using the secret from environment variables
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;  // Return the decoded token (user data)
  } catch (err) {
    console.error('Error verifying token:', err);
    return res.status(403).json({ message: 'Invalid token' });
  }
};

module.exports = { verifyTokenFromCookie };
