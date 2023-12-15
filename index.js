// index.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const loginRoute = require("./Routes/Auth/login");
const signUpRoute = require("./Routes/Auth/signUp");
const file = require("./Routes/FileHandler/fileHandle");

// Create Express app
const app = express();

// Middleware for parsing JSON
app.use(express.json());

// Enable CORS for all routes
app.use(cors());

// MongoDB connection URI (replace with your MongoDB connection string)
const mongoURI = 'mongodb+srv://salehmalik121:salehmalik932160@cluster0.wcon2y3.mongodb.net/?retryWrites=true&w=majority';

// Connect to MongoDB using Mongoose
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

//Routes
app.use("/login" , loginRoute);
app.use("/signup" , signUpRoute);
app.use("/file" , file);
app.get('/', (req, res) => {
  res.send('Hello, Express and MongoDB!');
});



// Set up a server to listen on a port
const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
