const mongoose = require('mongoose');

const docSchema = new mongoose.Schema({
  question: String,
  answer: String
});

const Document = mongoose.model('Document', docSchema);

module.exports = Document;
