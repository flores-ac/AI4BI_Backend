const mongoose = require('mongoose');

// Define the User schema
const chatSchema = new mongoose.Schema({
    userEmail : {
        type: String,
        required: true
    },
    chatHistory : {
        type: Array,
        default: []
    }
});

// Create the User model using the schema
const User = mongoose.model('Chat', chatSchema);

// Export the User model
module.exports = User;