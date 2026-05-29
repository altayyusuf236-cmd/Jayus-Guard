const express = require('express');
const router = express.Router();
const Safe = require('../schemas/safe');
const Log = require('../schemas/logchannel');
const Panel = require('../schemas/Panel'); // ⚠️ Dosya adın küçük harfle 'panel.js' ise burası tam eşleşmeli!

module.exports = (client) => {

  // ⚙️ GENEL AYARLAR SAYFASINI GÖRÜNTÜLEME (GET)
  router.get('/:guildID', async (req, res) => {
    const { guildID } = req.params;

    try {
      if (!client) return res.status(500).send("Bot baglanti hatasi.");

      // 1. Sunucuyu cache'den veya API'den çekiyoruz
      let guild = client.guilds.cache.get(guildID);
      if (!guild) {
        guild = await client.guilds.fetch(guildID).catch(() => null);
      }
      if (!guild) return res.status(404).send("Sunucu bulunamadı kanka.");

      // 🔥 RENDER GARANTİSİ: Eğer kanallar cache'de boş görünüyorsa API'den zorla çekiyoruz
      if (guild.channels.cache.size === 0) {
        await guild.channels.fetch().catch(() => null);
      }

      // 2. Veritabanından mevcut ayarları çekiyoruz (Yoksa boş taslak oluşturuyoruz)
      const safeData = await Safe.findOne({ guildID }) || { guardEnabled: false };
      const logData = await Log.findOne({ guildID }) || { channelID: null };
      let panelData = await Panel.findOne({ guildID });
      
      if (!panelData) {
        panelData = await Panel.create({ guildID });
      }

      // 3. EJS sayfasına tüm verileri eksiksiz gönderiyoruz
      res.render('settings', {
        guildID,
        guild,
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
      // 1. Log kanalı ayarını güncelle
      await Log.updateOne(
        { guildID },
        { $set: { channelID: logChannelID || null } },
        { upsert: true }
      );

      // 2. Switch (Aç/Kapat) koruma durumlarını güncelle
      // HTML formundan gelen switch'ler açıksa 'on' gelir, kapalıysa undefined gelir.
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

      // 3. İşlem bitince sayfayı tekrar yeniliyoruz ki güncel halleri ekrana gelsin
      res.redirect(`/settings/${guildID}`);
    } catch (err) {
      console.error("Render Ayarlar POST Hatası:", err);
      res.status(500).send('Ayarlar kaydedilemedi.');
    }
  });

  return router;
};
