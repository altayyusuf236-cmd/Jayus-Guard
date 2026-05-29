const express = require('express');
const router = express.Router();
const Safe = require('../schemas/safe');
const Log = require('../schemas/logchannel');
const Panel = require('../schemas/Panel');

module.exports = (client) => {

  // GET: Sayfa açılışı
  router.get('/:guildID', async (req, res) => {
    const { guildID } = req.params;
    try {
      if (!client) return res.status(500).send("Bot bağlantı hatası.");
      let guild = client.guilds.cache.get(guildID) || await client.guilds.fetch(guildID).catch(() => null);
      if (!guild) return res.status(404).send("Sunucu bulunamadı.");

      const safeData = await Safe.findOne({ guildID }) || { guardEnabled: false };
      const logData = await Log.findOne({ guildID }) || { channelID: null };
      
      // Panel verisini çek, yoksa boş obje oluştur
      let panelData = await Panel.findOne({ guildID });
      if (!panelData) {
        panelData = { 
            kanalKoruma: false, rolKoruma: false, emojiKoruma: false, 
            banKickKoruma: false, detailedLogs: false, autoCleanLogs: false, autoBackup: false 
        };
      }

      // EJS'ye verileri gönderiyoruz (BURASI ÇOK ÖNEMLİ)
      res.render('settings', {
        guildID, guild,
        botAvatar: client.user.displayAvatarURL(),
        botUsername: client.user.username,
        guardEnabled: safeData.guardEnabled,
        logChannelID: logData.channelID,
        panel: panelData,
        // EJS'de kullandığın her checkbox değişkenini buraya eklemelisin:
        detailedLogs: panelData.detailedLogs || false,
        autoCleanLogs: panelData.autoCleanLogs || false,
        autoBackup: panelData.autoBackup || false
      });
    } catch (err) {
      console.error(err);
      res.status(500).send('Hata oluştu: ' + err.message);
    }
  });

  // POST: Ayarları kaydetme
  router.post('/:guildID', async (req, res) => {
    const { guildID } = req.params;
    const { logChannelID, kanalKoruma, rolKoruma, emojiKoruma, banKickKoruma, detailedLogs, autoCleanLogs, autoBackup } = req.body;
    
    try {
      await Log.updateOne({ guildID }, { $set: { channelID: logChannelID || null } }, { upsert: true });
      
      await Panel.findOneAndUpdate(
        { guildID },
        {
          $set: {
            kanalKoruma: kanalKoruma === 'on',
            rolKoruma: rolKoruma === 'on',
            emojiKoruma: emojiKoruma === 'on',
            banKickKoruma: banKickKoruma === 'on',
            detailedLogs: detailedLogs === 'on',
            autoCleanLogs: autoCleanLogs === 'on',
            autoBackup: autoBackup === 'on'
          }
        },
        { upsert: true, new: true }
      );
      res.redirect(`/settings/${guildID}`);
    } catch (err) {
      console.error(err);
      res.status(500).send('Ayarlar kaydedilemedi: ' + err.message);
    }
  });

  return router;
};
