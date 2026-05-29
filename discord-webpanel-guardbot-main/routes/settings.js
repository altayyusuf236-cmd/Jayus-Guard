const express = require('express');
const router = express.Router();
const Safe = require('../schemas/safe');
const Log = require('../schemas/logchannel');
const Panel = require('../schemas/panel');

module.exports = (client) => {

  router.get('/:guildID', async (req, res) => {
    const { guildID } = req.params;
    try {
      if (!client) return res.status(500).send("Bot baglanti hatasi.");
      
      let guild = client.guilds.cache.get(guildID);
      if (!guild) guild = await client.guilds.fetch(guildID).catch(() => null);
      if (!guild) return res.status(404).send("Sunucu bulunamadi.");

      // Veritabanı işlemleri
      const safeData = await Safe.findOne({ guildID }) || { guardEnabled: false };
      const logData = await Log.findOne({ guildID }) || { channelID: null };
      const panelData = await Panel.findOne({ guildID }) || { 
        kanalKoruma: false, 
        rolKoruma: false, 
        emojiKoruma: false, 
        banKickKoruma: false,
        detailedLogs: false 
      };

      // EJS'ye verileri eksiksiz yolluyoruz
      res.render('settings', {
        guildID,
        guild,
        botAvatar: client.user.displayAvatarURL(),
        botUsername: client.user.username,
        guardEnabled: safeData.guardEnabled,
        logChannelID: logData.channelID,
        // EJS'nin hata vermemesi için hem panel objesini hem de tek tek değişkenleri gönderiyoruz
        panel: panelData,
        detailedLogs: panelData.detailedLogs || false,
        kanalKoruma: panelData.kanalKoruma || false
      });
    } catch (err) {
      console.error(err);
      res.status(500).send('Sayfa yüklenirken hata oluştu.');
    }
  });

  router.post('/:guildID', async (req, res) => {
    const { guildID } = req.params;
    const { logChannelID, kanalKoruma, rolKoruma, emojiKoruma, banKickKoruma, detailedLogs } = req.body;
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
            detailedLogs: detailedLogs === 'on'
          }
        },
        { upsert: true, new: true }
      );
      res.redirect(`/settings/${guildID}`);
    } catch (err) {
      console.error(err);
      res.status(500).send('Ayarlar kaydedilemedi.');
    }
  });

  return router;
};
