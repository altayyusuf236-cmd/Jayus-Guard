const express = require('express');
const router = express.Router();
const Safe = require('../schemas/safe');
const LogEntry = require('../schemas/logEntry');

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
    
    res.render('channels', {
      guildID,
      guild,
      botUsername: bot.user.username,
      botAvatar: bot.user.displayAvatarURL(),
      botId: bot.user.id,
      guardEnabled: safeData.guardEnabled || false,
      safeUsers: safeData.safeUsers || [],
      logChannelID: safeData.logChannelID || '',
    });
  } catch (error) {
    console.error('Channels error:', error);
    res.status(500).send('Sunucu hatası');
  }
});

// Örnek kanal ekleme endpointi
router.post('/:guildID/add-channel', async (req, res) => {
  const guildID = req.params.guildID;
  const bot = req.app.get('client');
  const { channelName } = req.body;
  try {
    const guild = bot.guilds.cache.get(guildID);
    if (!guild) return res.status(404).send('Sunucu bulunamadı');
    const newChannel = await guild.channels.create({ name: channelName, reason: 'Panelden eklendi' });
    const logMsg = `🆕 Kanal eklendi: ${newChannel.name} (${newChannel.id})`;
    await sendLogToChannel(bot, guildID, logMsg);
    await LogEntry.create({ guildID, description: logMsg });
    res.redirect(`/channels/${guildID}`);
  } catch (err) {
    res.status(500).send('Sunucu hatası');
  }
});

// Kanal silme endpointi
router.post('/:guildID/delete-channel/:channelID', async (req, res) => {
  const guildID = req.params.guildID;
  const channelID = req.params.channelID;
  const bot = req.app.get('client');
  try {
    const guild = bot.guilds.cache.get(guildID);
    if (!guild) return res.status(404).send('Sunucu bulunamadı');
    const channel = guild.channels.cache.get(channelID);
    if (!channel) return res.status(404).send('Kanal bulunamadı');
    await channel.delete('Panelden silindi');
    const logMsg = `🗑️ Kanal silindi: ${channel.name} (${channel.id})`;
    await sendLogToChannel(bot, guildID, logMsg);
    await LogEntry.create({ guildID, description: logMsg });
    res.redirect(`/channels/${guildID}`);
  } catch (err) {
    res.status(500).send('Sunucu hatası');
  }
});

// Kanal düzenleme endpointi
router.post('/:guildID/edit-channel/:channelID', async (req, res) => {
  const guildID = req.params.guildID;
  const channelID = req.params.channelID;
  const bot = req.app.get('client');
  const { name, position, slowmode, nsfw } = req.body;
  try {
    const guild = bot.guilds.cache.get(guildID);
    if (!guild) return res.json({ success: false, error: 'Sunucu bulunamadı' });
    const channel = guild.channels.cache.get(channelID);
    if (!channel) return res.json({ success: false, error: 'Kanal bulunamadı' });
    // Sadece metin kanalı için örnek (gerekirse diğer türler için genişlet)
    if (channel.type === 0) {
      await channel.edit({
        name: name,
        position: Number(position),
        rateLimitPerUser: Number(slowmode) || 0,
        nsfw: nsfw === 'true'
      });
    } else {
      await channel.edit({
        name: name,
        position: Number(position)
      });
    }
    // Log ve veritabanı kaydı
    const logMsg = `✏️ Kanal güncellendi: ${name} (${channelID})`;
    await sendLogToChannel(bot, guildID, logMsg);
    await LogEntry.create({ guildID, description: logMsg });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Bir kanalın işlem geçmişini dönen endpoint
router.get('/:guildID/channel-history/:channelID', async (req, res) => {
  const { guildID, channelID } = req.params;
  try {
    // Son 50 logdan ilgili kanala ait olanları getir
    const logs = await LogEntry.find({
      guildID,
      description: { $regex: channelID }
    }).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ success: true, logs });
  } catch (err) {
    res.json({ success: false, error: 'Loglar alınamadı.' });
  }
});

module.exports = router; 