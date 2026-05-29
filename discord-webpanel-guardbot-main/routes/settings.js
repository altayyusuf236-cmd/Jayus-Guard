const express = require('express');
const router = express.Router();
const Safe = require('../schemas/safe'); // Bot komutlarının (system.js) kullandığı şema
const config = require('../config');

// GET: Ayarları veritabanından çek ve sayfaya gönder
router.get('/:guildID', async (req, res) => {
    const { guildID } = req.params;
    const client = req.app.get('client');
    
    try {
        const guild = await client.guilds.fetch(guildID).catch(() => null);
        if (!guild) return res.status(404).send("Sunucu bulunamadı.");

        // Botun kullandığı ortak Safe verisini çekiyoruz
        let data = await Safe.findOne({ guildID });
        if (!data) {
            data = await Safe.create({ guildID });
        }

        res.render('settings', {
            guildID,
            guild,
            botAvatar: client.user.displayAvatarURL(),
            botUsername: client.user.username,
            guardEnabled: data.guardEnabled || false,
            logChannelID: data.logChannelID || '',
            detailedLogs: data.detailedLogs || false,
            autoCleanLogs: data.autoCleanLogs || false,
            autoBackup: data.autoBackup || false,
            twoFactorAuth: data.twoFactorAuth || false,
            ipRestriction: data.ipRestriction || false
        });
    } catch (err) {
        console.error("Ayarlar yüklenirken hata:", err);
        res.status(500).send('Sunucu hatası oluştu.');
    }
});

// POST: Panelden gelen tüm ayarları tek seferde kaydet
router.post('/:guildID', async (req, res) => {
    const { guildID } = req.params;
    const { logChannelID } = req.body;

    // Checkbox'lar seçiliyse 'on' gelir, seçili değilse undefined gelir.
    // === 'on' yaparak tam boolean (true/false) durumuna eşitleyerek kaydediyoruz.
    const detailedLogs = req.body.detailedLogs === 'on';
    const autoCleanLogs = req.body.autoCleanLogs === 'on';
    const autoBackup = req.body.autoBackup === 'on';
    const twoFactorAuth = req.body.twoFactorAuth === 'on';
    const ipRestriction = req.body.ipRestriction === 'on';

    try {
        await Safe.findOneAndUpdate(
            { guildID },
            { 
                $set: {
                    logChannelID,
                    detailedLogs,
                    autoCleanLogs,
                    autoBackup,
                    twoFactorAuth,
                    ipRestriction
                }
            },
            { upsert: true, new: true }
        );

        // İşlem bitince sayfayı yenile (opsiyonel olarak alert eklenebilir)
        res.redirect(`/settings/${guildID}?success=true`);
    } catch (err) {
        console.error("Ayarlar kaydedilirken hata:", err);
        res.status(500).send('Ayarlar kaydedilemedi.');
    }
});

module.exports = router;
