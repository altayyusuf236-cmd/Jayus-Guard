const express = require('express');
const router = express.Router();
const Safe = require('../schemas/safe');
const Log = require('../schemas/logchannel');

// ⚠️ Şema dosyanın adı küçük harfle 'panel.js' ise 'panel' yap kanka, Linux harfe duyarlıdır!
const Panel = require('../schemas/panel'); 

module.exports = (client) => {

  // ⚙️ GENEL AYARLAR SAYFASINI GÖRÜNTÜLEME (GET)
  router.get('/:guildID', async (req, res) => {
    const { guildID } = req.params;

    try {
      if (!client) return res.status(500).send("Bot baglanti hatasi.");

      // 1. Sunucuyu botun cache'inden veya API'den çekiyoruz
      let guild = client.guilds.cache.get(guildID);
      if (!guild) {
        guild = await client.guilds.fetch(guildID).catch(() => null);
      }
      if (!guild) return res.status(404).send("Sunucu bulunamadı kanka.");

      // 🔥 İŞTE EKSİK OLAN PARÇA: Sunucudaki tüm kanalları EJS dropdown listesi için çekiyoruz
      const channels = guild.channels.cache;

      // 2. Veritabanı kayıtlarını çekiyoruz
      const safeData = await Safe.findOne({ guildID }) || { guardEnabled: false };
      const logData = await Log.findOne({ guildID }) || { channelID: null };
      let panelData = await Panel.findOne({ guildID });
      
      if (!panelData) {
        panelData = await Panel.create({ guildID });
      }

      // 3. EJS Şablonuna her şeyi eksiksiz, jilet gibi teslim ediyoruz
      res.render('settings', {
        guildID,
        guild,
        channels, // <--- SS'deki hatayı bitiren, can damarı olan satır burası!
        botAvatar: client.user.displayAvatarURL(),
        botUsername: client.user.username,
        guardEnabled: safeData.guardEnabled || false,
        logChannelID: logData.channelID || '',
        panel: panelData
      });

    } catch (err) {
      console.error("Render Ayarlar GET Hatası:", err);
      res.status(500).send('Genel ayarlar yuklenirken hata olustu.');
    }
  });

  // ⚙️ PANELDEKİ AYARLARI VERİTABANINA KAYDETME (POST)
  router.post('/:guildID', async (req, res) => {
    const { guildID } = req.params;
    const { logChannelID, kanalKoruma, rolKoruma, emojiKoruma, banKickKoruma } = req.body;

    try {
      // 1. Log kanalını güncelle
      await Log.updateOne(
        { guildID },
        { $set: { channelID: logChannelID || null } },
        { upsert: true }
      );

      // 2. Switch durumlarını güncelle
      await Panel.findOneAndUpdate(
        { guildID },
        {
          $set: {
            kanalKoruma: kanalKoruma === 'on',
            rolKoruma: rolKoruma === 'on',
            emojiKoruma: emojiKoruma === 'on',
            banKickKoruma: banKickKoruma === 'on'
          }
        },
        { upsert: true, new: true }
      );

      // İşlem bitince dinamik olarak hangi adresten geldiyse oraya geri atsın
      res.redirect(req.originalUrl);
    } catch (err) {
      console.error("Render Ayarlar POST Hatası:", err);
      res.status(500).send('Ayarlar kaydedilemedi.');
    }
  });

  return router;
};
