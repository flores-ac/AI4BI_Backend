const mongoose = require('mongoose');

// Define the User schema
const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  name: {
    type: String,
  },
  profilePicture: {
    type: String, // Store the URL of the profile picture
  },
  company: {
    type: String,
    default: 'Company_Default',
  },
  role: {
    type: String,
    default: 'employee',
  },
  googleAccessToken: {
    type: String,  // Encrypted Google access token
  },
  googleRefreshToken: {
    type: String,  // Encrypted Google refresh token
  },
  dateCreated: {
    type: Date,
    default: Date.now,
  },
});

// Create the User model using the schema
const User = mongoose.model('User', userSchema);

// Export the User model
module.exports = User;
