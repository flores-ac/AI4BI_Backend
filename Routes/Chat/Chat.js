const express = require("express");
const bodyParser = require("body-parser");
const chatModel = require("../../Schema/chatModel");
const LangchainRetrival = require("./LangchainRetrivalOld");
const jwt = require("jsonwebtoken");  // Import jwt to verify the token
const router = express.Router();
const User = require("../../Schema/userModel"); 

// Helper function to verify JWT
const verifyTokenFromCookie = (req, res) => {
  const token = req.cookies.token;  // Get the JWT from the HTTP-only cookie
  if (!token) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);  // Verify the JWT
    return decoded;  // Return the decoded token (this contains user info like email, userId, etc.)
  } catch (err) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// Get chat history for the authenticated user
router.get("/", async (req, res) => {
  const decoded = verifyTokenFromCookie(req, res);  // Verify and decode the token
  if (!decoded || decoded.message) return;  // If not authenticated, stop further execution

  const userId = decoded.userId;  // Extract the userId from the decoded JWT

  try {
    // Fetch the user from the database using the userId
    const user = await User.findById(userId);
    
    if (!user) {
      console.error('User not found with userId:', userId);
      throw new Error('User not found');
    }

    const email = user.email;  // Get the user's email from the database

    // Log for debugging
    console.log(`Fetching chat history for user with email: ${email}`);

    // Fetch chat history using the user's email
    const userChats = await chatModel.find({ userEmail: email });
    res.status(200).json({ userChats });
  } catch (err) {
    console.error('Error fetching chat history:', err);
    res.status(500).json({ message: "Some error occurred at the server" });
  }
});


// Create a new chat for the authenticated user
router.get("/createChat", async (req, res) => {
  const decoded = verifyTokenFromCookie(req, res);  // Verify and decode the token
  if (!decoded || decoded.message) return;  // If not authenticated, stop further execution

  const userId = decoded.userId;  // Extract the userId from the decoded JWT

  try {
    // Fetch the user from the database using the userId
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error('User not found');;
    }

    const email = user.email;  // Get the user's email from the database

    // Create a new chat with the user's email
    const newChat = await chatModel.create({ userEmail: email });
    res.status(200).json(newChat);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Some error occurred at the server" });
  }
});

// Add user prompt and response to chat history
router.post("/prompt/:chatId", bodyParser.json(), async (req, res) => {
  const decoded = verifyTokenFromCookie(req, res);  // Verify and decode the token
  if (!decoded || decoded.message) return;  // If not authenticated, stop further execution

  const chatId = req.params.chatId;
  const { prompt } = req.body;

  try {
    // Save user message
    await chatModel.findOneAndUpdate(
      { _id: chatId },
      { $push: { chatHistory: { message: prompt, responseFrom: "User" } } }
    );

    // Get AI response
    const aiResponse = await LangchainRetrival(1, chatId, prompt);

    // Save AI response
    await chatModel.findOneAndUpdate(
      { _id: chatId },
      { $push: { chatHistory: { message: aiResponse, responseFrom: "OpenAI" } } }
    );

    res.status(200).json({ message: aiResponse, responseFrom: "OpenAI" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error });
  }
});

// Delete a chat
router.delete("/:chatId", async (req, res) => {
  const decoded = verifyTokenFromCookie(req, res);  // Verify and decode the token
  if (!decoded || decoded.message) return;  // If not authenticated, stop further execution

  const chatId = req.params.chatId;

  try {
    await chatModel.findOneAndDelete({ _id: chatId });
    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unexpected server error occurred" });
  }
});

module.exports = router;
