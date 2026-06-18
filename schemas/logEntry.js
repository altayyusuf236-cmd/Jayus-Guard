
const mongoose = require('mongoose');

const logEntrySchema = new mongoose.Schema({
  guildID: { type: String, required: true },
  description: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  userId: { type: String },
  username: { type: String },
  userAvatar: { type: String },
  type: { type: String }, // create, delete, update, ban, kick, info, etc.
  status: { type: String }, // allowed, blocked, etc.
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LogEntry', logEntrySchema);
