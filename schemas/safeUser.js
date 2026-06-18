const mongoose = require("mongoose");

const safeUserSchema = new mongoose.Schema({
  guildID: { type: String, required: true },
  numId: { type: Number, required: true },
  id: { type: String, required: true },
  username: { type: String },
  discriminator: { type: String },
  avatar: { type: String },
  avatarURL: { type: String },
  displayName: { type: String },
  joinedAt: { type: Date },
  addedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("SafeUser", safeUserSchema); 