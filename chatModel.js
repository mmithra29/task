const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  userMessage: { type: String, required: true },
  botResponse: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;
