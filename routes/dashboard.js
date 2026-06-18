const express = require('express');
const router = express.Router();
const Safe = require('../schemas/safe');
const LogEntry = require('../schemas/logEntry');

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
    
    // Son aktiviteleri al (son 10 kayıt)
    const logs = await LogEntry.find({ guildID })
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();
    const logsWithFallback = logs.map(log => ({
      userId: log.userId || '',
      username: log.username || '',
      userAvatar: log.userAvatar || '',
      type: log.type || 'info',
      status: log.status || 'allowed',
      timestamp: log.timestamp || log.createdAt,
      description: log.description || '',
    }));
    res.render('dashboard', {
      guildID,
      guild,
      botUsername: bot.user.username,
      botAvatar: bot.user.displayAvatarURL(),
      botId: bot.user.id,
      guardEnabled: safeData.guardEnabled || false,
      safeUsers: safeData.safeUsers || [],
      logChannelID: safeData.logChannelID || '',
      logs: logsWithFallback,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).send('Sunucu hatası');
  }
});

module.exports = router; 