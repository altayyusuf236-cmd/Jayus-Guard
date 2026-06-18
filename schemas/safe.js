const mongoose = require("mongoose");

const safeSchema = new mongoose.Schema({
  guildID: {
    type: String,
    required: true,
    unique: true
  },
  safeUsers: { type: Array, default: [] },
  guardEnabled: {
    type: Boolean,
    default: false
  },
  // Guard ayarları
  channelCreate: { type: Boolean, default: false },
  channelDelete: { type: Boolean, default: false },
  channelUpdate: { type: Boolean, default: false },
  roleCreate: { type: Boolean, default: false },
  roleDelete: { type: Boolean, default: false },
  roleUpdate: { type: Boolean, default: false },
  guildUpdate: { type: Boolean, default: false },
  banAdd: { type: Boolean, default: false },
  memberRemove: { type: Boolean, default: false },
  emojiCreate: { type: Boolean, default: false },
  emojiDelete: { type: Boolean, default: false },
  stickerProtection: { type: Boolean, default: false },
  bannedCount: {
    type: Number,
    default: 0
  },
  logChannelID: {
    type: String,
    default: null
  }
});

module.exports = mongoose.model("Safe", safeSchema);
