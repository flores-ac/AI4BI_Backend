
require('dotenv').config();
const express = require('express');
const passport = require('passport');
const mongoose = require('mongoose');
const cookieSession = require('cookie-session');
const cors = require('cors');
const passportSetup = require('./passport');
const authRoute= require('./Routes/Auth/login');
const loginRoute = require("./Routes/Auth/login");
const signUpRoute = require("./Routes/Auth/signUp");
const file = require("./Routes/FileHandler/fileHandle");
const EmbeddingStorage = require("./Routes/FileHandler/Embedding");
const langchainRetrival = require("./Routes/Chat/LangchainRetrival");
const testing = require("./Routes/testing/FeatureTesting")
const chat = require("./Routes/Chat/Chat")
console.log('step 1');
// Create Express app
const app = express();

// Middleware for parsing JSON
app.use(express.json());

//enable cookie session
app.use(cookieSession({
  name: 'session',
  keys: [process.env.COOKIE_KEY1, process.env.COOKIE_KEY2], // Use environment variables for keys
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));


// Enable CORS for all routes
app.use(cors(
  {
    origin: 'http://localhost:3000',
    credentials: true
  }
));

// MongoDB connection URI (replace with your MongoDB connection string)
const mongoURI = 'mongodb+srv://salehmalik121:salehmalik932160@cluster0.wcon2y3.mongodb.net/?retryWrites=true&w=majority';

// Connect to MongoDB using Mongoose
mongoose.connect(mongoURI);

const db = mongoose.connection;

// Event listener for successful MongoDB connection
db.on('connected', () => {
  console.log('Connected to MongoDB');
});

// Event listener fo