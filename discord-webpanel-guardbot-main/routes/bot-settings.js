const express = require('express');
const router = express.Router();
const { exec } = require('child_process');

// Bot paneli - durum, ping, uptime, avatar, isim
router.get('/:guildID', async (req, res) => {
  try {
    const bot = req.app.get('client');
    const guildID = req.params.guildID;
    const guild = bot.guilds.cache.get(guildID);
    if (!guild) return res.status(404).send('Sunucu bulunamadı');
    const ping = Math.round(bot.ws.ping);
    const uptime = bot.uptime;
    // Guard durumunu Safe koleksiyonundan çek
    const Safe = require('../schemas/safe');
    const safeData = await Safe.findOne({ guildID }) || {};
    res.render('bot-settings', {
      guildID,
      botUsername: bot.user.username,
      botAvatar: bot.user.displayAvatarURL(),
      botId: bot.user.id,
      ping,
      uptime,
      guardEnabled: safeData.guardEnabled || false,
      guild // guild bilgisini de ekle
    });
  } catch (err) {
    res.status(500).send('Bot ayarları alınamadı');
  }
});

// Bot restart
router.post('/:guildID/restart', async (req, res) => {
  try {
    // pm2 veya process manager ile restart önerilir, örnek olarak process.exit()
    res.json({ success: true, message: 'Bot yeniden başlatılıyor...' });
    setTimeout(() => process.exit(0), 1000);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Yeniden başlatılamadı.' });
  }
});

// Bot ismini değiştir
router.post('/:guildID/set-username', async (req, res) => {
  try {
    const bot = req.app.get('client');
    const { username } = req.body;
    await bot.user.setUsername(username);
    res.json({ success: true, message: 'Bot ismi güncellendi.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'İsim güncellenemedi.' });
  }
});

// Bot avatarını değiştir
router.post('/:guildID/set-avatar', async (req, res) => {
  try {
    const bot = req.app.get('client');
    // Dosya upload işlemi için multer veya base64 beklenebilir, örnek olarak url ile
    const { avatarURL } = req.body;
    await bot.user.setAvatar(avatarURL);
    res.json({ success: true, message: 'Bot avatarı güncellendi.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Avatar güncellenemedi.' });
  }
});

module.exports = router; 