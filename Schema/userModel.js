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
  company: {
    type: String,
    default: 'Company_Default',
  },
  role: {
    type: String,
    default: 'employee',
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
