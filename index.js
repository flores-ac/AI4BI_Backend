require('dotenv').config();
const express = require('express');
const passport = require('passport');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const passportSetup = require('./passport');  // Make sure this is setting up the strategy properly
const authRoute = require('./Routes/Auth/login');
const loginRoute = require("./Routes/Auth/login");
const signUpRoute = require("./Routes/Auth/signUp");
const file = require("./Routes/FileHandler/fileHandle");
const EmbeddingStorage = require("./Routes/FileHandler/Embedding");
const langchainRetrival = require("./Routes/Chat/LangchainRetrival");
const testing = require("./Routes/testing/FeatureTesting");
const chat = require("./Routes/Chat/Chat");
const jwt = require('jsonwebtoken');  // Add this for JWT verification
console.log('step 1');

// Create Express app
const app = express();

// Middleware for parsing JSON
app.use(express.json());

// Middleware for parsing URL-encoded bodies
app.use(cookieParser());

// Remove cookie-session since we're using JWT now
// app.use(cookieSession({
//   name: 'session',
//   keys: ["Ai4Bi"], // Use environment variables for keys
//   maxAge: 24 * 60 * 60 * 1000 // 24 hours
// }));

app.use(passport.initialize());
// Remove passport.session() since we're not using sessions anymore
// app.use(passport.session());

// Enable CORS for all routes
app.use(cors({
  origin: 'http://localhost:3000',  // Make sure this is the correct client URL
  methods: 'GET,POST,PUT,DELETE',
  credentials: true  // JWT does not need credentials true, but leave it if needed for some reason
}));

// MongoDB connection URI (replace with your MongoDB connection string)
const mongoURI = 'mongodb+srv://salehmalik121:salehmalik932160@cluster0.wcon2y3.mongodb.net/?retryWrites=true&w=majority';

// Connect to MongoDB using Mongoose (no need for deprecated options)
mongoose.connect(mongoURI);

const db = mongoose.connection;

// Event listener for successful MongoDB connection
db.on('connected', () => {
  console.log('Connected to MongoDB');
});

// Event listener for MongoDB connection error
db.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});


// JWT Middleware for Protected Routes (Read JWT from HTTP-only cookies)
const authenticateJWT = (req, res, next) => {
  const token = req.cookies.token;  // Extract the JWT from the HTTP-only cookie

  if (!token) {
    return res.status(401).json({ message: 'Access denied, no token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);  // Verify JWT
    req.user = decoded;  // Attach the decoded token to req.user
    next();  // Continue to the next middleware or route handler
  } catch (err) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// Routes
app.use("/login", loginRoute);
app.use("/signup", signUpRoute);
app.use("/file", authenticateJWT, file);  // Protect with JWT middleware
app.use("/chat", authenticateJWT, chat);  // Protect with JWT middleware
app.use("/apiv2", authenticateJWT, testing);  // Protect with JWT middleware
app.use("/auth", authRoute);

app.get('/', (req, res) => {
  res.send('Hello, Express and MongoDB!');
});

// Set up a server to listen on a port
const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
