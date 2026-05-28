const express = require('express');
const router = express.Router();
const Safe = require('../schemas/safe');
const Panel = require('../schemas/Panel');

// Yardımcı log fonksiyonu
async function sendLogToChannel(bot, guildID, message) {
  try {
    const Safe = require('../schemas/safe');
    const safeData = await Safe.findOne({ guildID });
    const logChannelID = safeData && safeData.logChannelID;
    if (!logChannelID) return;
    const guild = bot.guilds.cache.get(guildID);
    if (!guild) return;
    const channel = guild.channels.cache.get(logChannelID);
    if (!channel) return;
    await channel.send(message);
  } catch (err) {
    console.error('Log kanalı mesaj hatası:', err);
  }
}

// Genel ayarları kaydet (örnek endpoint)
router.post('/:guildID', async (req, res) => {
  const guildID = req.params.guildID;
  const bot = req.app.get('client');
  // Panel koruma ayarlarını al
  const { logChannelID, kanalKoruma, rolKoruma, emojiKoruma, banKickKoruma } = req.body;
  try {
    await Safe.updateOne(
      { guildID },
      { $set: { logChannelID } },
      { upsert: true }
    );
    // Panel koruma ayarlarını güncelle
    await Panel.updateOne(
      { guildID },
      {
        $set: {
          kanalKoruma: !!kanalKoruma,
          rolKoruma: !!rolKoruma,
          emojiKoruma: !!emojiKoruma,
          banKickKoruma: !!banKickKoruma
        }
      },
      { upsert: true }
    );
    await sendLogToChannel(bot, guildID, `⚙️ Genel ayarlar panelden güncellendi. (Log kanalı: <#${logChannelID}>)`);
    res.redirect(`/settings/${guildID}`);
  } catch (err) {
    res.status(500).send('Sunucu hatası');
  }
});

router.get('/:guildID', async (req, res) => {
  const guildID = req.params.guildID;
  
  try {
    // Bot bilgilerini al
    const bot = req.app.get('client');
    const guild = bot.guilds.cache.get(guildID);
    
    if (!guild) {
      return res.status(404).send('Sunucu bulunamadı');
    }

    // Guard ayarlarını al
    const safeData = await Safe.findOne({ guildID }) || {};
    
    // Panel koruma ayarlarını al
    const panel = await Panel.findOne({ guildID }) || {};
    res.render('settings', {
      guildID,
      guild,
      botUsername: bot.user.username,
      botAvatar: bot.user.displayAvatarURL(),
      botId: bot.user.id,
      guardEnabled: safeData.guardEnabled || false,
      safeUsers: safeData.safeUsers || [],
      logChannelID: safeData.logChannelID || '',
      panel
    });
  } catch (error) {
    console.error('Settings error:', error);
    res.status(500).send('Sunucu hatası');
  }
});

module.exports = router; 