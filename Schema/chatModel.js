const mongoose = require('mongoose');

// Define the Chat schema
const chatSchema = new mongoose.Schema({
  userEmail: {
    type: String,
    required: true
  },
  chatHistory: {
    type: Array,
    default: []
  }
});

// Create the Chat model using the schema
const Chat = mongoose.model('Chat', chatSchema);

// Export the Chat model
module.exports = Chat;