const express = require('express');
const router = express.Router();
const Safe = require('../schemas/safe');
const Log = require('../schemas/logchannel');
const Panel = require('../schemas/Panel');
const config = require('../config');

// ⚙️ GENEL AYARLAR SAYFASINI GÖRÜNTÜLEME (GET /settings/:guildID)
router.get('/:guildID', async (req, res) => {
  const { guildID } = req.params;
  // index.js içinde tanımladığın app.set('client', client) sayesinde botu buradan güvenle çekiyoruz:
  const client = req.app.get('client'); 

  try {
    // 1. Discord sunucusunu bot üzerinden kontrol ediyoruz
    const guild = await client.guilds.fetch(guildID).catch(() => null);
    if (!guild) return res.status(404).send("Sunucu bulunamadı kanka.");

    // 2. MongoDB'den gerekli tüm ayar şemalarını çekiyoruz
    const safeData = await Safe.findOne({ guildID }) || { guardEnabled: false };
    const logData = await Log.findOne({ guildID }) || { channelID: null };
    let panelData = await Panel.findOne({ guildID });
    
    // Eğer veritabanında bu sunucuya ait panel kaydı yoksa hemen oluşturuyoruz
    if (!panelData) {
      panelData = await Panel.create({ guildID });
    }

    // 3. EJS şablonunun (settings.ejs) çökmesini önlemek için tüm değişkenleri eksiksiz gönderiyoruz
    res.render('settings', {
      guildID,
      guild,
      botAvatar: client.user.displayAvatarURL(),
      botUsername: client.user.username,
      guardEnabled: safeData.guardEnabled || false,
      logChannelID: logData.channelID || '',
      panel: panelData // settings.ejs içindeki panel.kanalKoruma vb. kontroller için kritik!
    });

  } catch (err) {
    console.error("routes/settings.js GET Rota Hatası:", err);
    res.status(500).send('Genel ayarlar yüklenirken sistemsel bir hata oluştu, Render loglarını incele kanka.');
  }
});

// ⚙️ PANELDEKİ AYARLARI VERİTABANINA KAYDETME (POST /settings/:guildID)
router.post('/:guildID', async (req, res) => {
  const { guildID } = req.params;
  const { logChannelID, kanalKoruma, rolKoruma, emojiKoruma, banKickKoruma } = req.body;

  try {
    // 1. Seçilen Log kanalını veritabanına kaydet
    await Log.updateOne(
      { guildID },
      { $set: { channelID: logChannelID || null } },
      { upsert: true }
    );

    // 2. Switch'leri (Açık/Kapalı) güncelle. Switch açıksa 'on' gelir, kapalıysa undefined gelir.
    // Bu yüzden === 'on' kontrolüyle tam true/false yapıyoruz.
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

    // İşlem başarılı olunca sayfayı yenileyerek güncel verileri göster
    res.redirect(`/settings/${guildID}`);
  } catch (err) {
    console.error("routes/settings.js POST Kayıt Hatası:", err);
    res.status(500).send('Ayarlar kaydedilirken bir hata oluştu.');
  }
});

module.exports = router;
