const express = require('express');
const router = express.Router();
const Safe = require('../schemas/safe');
const Log = require('../schemas/logchannel');
const Panel = require('../schemas/Panel'); 

module.exports = (client) => {

  // ⚙️ GET METODU (Sayfa Açılırken Tetiklenen Yer)
  router.get('/:guildID', async (req, res) => {
    const { guildID } = req.params;

    try {
      if (!client) return res.status(500).send("HATA: Discord Bot bağlantısı sağlanamadı.");

      let guild = client.guilds.cache.get(guildID);
      if (!guild) {
        guild = await client.guilds.fetch(guildID).catch(() => null);
      }
      if (!guild) return res.status(404).send("HATA: Bot bu sunucuda bulunamadı veya sunucu ID'si hatalı.");

      // Kanalları zorla çekiyoruz
      if (guild.channels.cache.size === 0) {
        await guild.channels.fetch().catch(() => null);
      }

      // Veritabanı verilerini çekiyoruz
      const safeData = await Safe.findOne({ guildID }) || { guardEnabled: false };
      const logData = await Log.findOne({ guildID }) || { channelID: null };
      
      // Panel verisini çekiyoruz, yoksa kaydedip sıfırdan oluşturuyoruz
      let panelData = await Panel.findOne({ guildID });
      if (!panelData) {
        panelData = await Panel.create({ guildID }).catch(e => {
            console.error("Panel verisi oluşturulurken DB hatası:", e);
            return null;
        });
      }

      // 💡 EKSİKLİK KONTROLÜ: EJS içinde hata çıkaran değişkenleri güvenceye alıyoruz
      res.render('settings', {
        guildID: guildID,
        guild: guild,
        botAvatar: client.user.displayAvatarURL() || '',
        botUsername: client.user.username || 'Guard Bot',
        guardEnabled: safeData.guardEnabled || false,
        logChannelID: logData.channelID || '',
        panel: panelData || { kanalKoruma: false, rolKoruma: false, emojiKoruma: false, banKickKoruma: false }
      });

    } catch (err) {
      // 🚨 EĞER SAYFA AÇILMIYORSA HATAYI DİREKT TARAYICIYA BASIYORUZ:
      console.error("KRİTİK PANEL GET HATASI:", err);
      res.status(500).send(`<h3>Genel Ayarlar Sayfası Yüklenirken Kod Patladı!</h3><p><b>Hata Detayı:</b> ${err.message}</p><p>Lütfen bu hatayı kontrol edin.</p>`);
    }
  });

  // ⚙️ POST METODU (Ayarları Kaydederken Tetiklenen Yer)
  router.post('/:guildID', async (req, res) => {
    const { guildID } = req.params;
    const { logChannelID, kanalKoruma, rolKoruma, emojiKoruma, banKickKoruma } = req.body;

    try {
      await Log.updateOne({ guildID }, { $set: { channelID: logChannelID || null } }, { upsert: true });
      
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

      res.redirect(`/settings/${guildID}`);
    } catch (err) {
      console.error("KRİTİK PANEL POST HATASI:", err);
      res.status(500).send(`Ayarlar kaydedilirken veritabanı hatası oluştu: ${err.message}`);
    }
  });

  return router;
};
