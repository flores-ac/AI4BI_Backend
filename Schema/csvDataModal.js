const mongoose = require('mongoose');

// Define the User schema
const csvDataSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  fileName: {
    type: String,
    unique: true,
  },
  dataInFile: {
    type: Array,
  }
});

// Create the User model using the schema
const CSVMongooseModal = mongoose.model('csvData', csvDataSchema);

// Export the User model
module.exports = CSVMongooseModal;