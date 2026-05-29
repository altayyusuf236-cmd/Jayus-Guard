const mongoose = require("mongoose");

const panelSchema = new mongoose.Schema({
  guildID: { type: String, required: true },
  kanalKoruma: { type: Boolean, default: false },
  rolKoruma: { type: Boolean, default: false },
  emojiKoruma: { type: Boolean, default: false },
  banKickKoruma: { type: Boolean, default: false },
  // Yeni eklediğin özellikler:
  detailedLogs: { type: Boolean, default: false },
  autoCleanLogs: { type: Boolean, default: false },
  autoBackup: { type: Boolean, default: false },
  twoFactorAuth: { type: Boolean, default: false },
  emailNotifications: { type: Boolean, default: false },
  ipRestriction: { type: Boolean, default: false }
});

module.exports = mongoose.model("Panel", panelSchema);
