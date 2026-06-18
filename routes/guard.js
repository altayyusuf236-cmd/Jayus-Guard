const express = require('express');
const router = express.Router();
const Safe = require('../schemas/safe');
const Panel = require('../schemas/Panel');
const { EmbedBuilder } = require('discord.js');

// Yardımcı log fonksiyonu
async function sendLogToChannel(bot, guildID, embedOrMessage) {
  try {
    const Safe = require('../schemas/safe');
    const safeData = await Safe.findOne({ guildID });
    const logChannelID = safeData && safeData.logChannelID;
    if (!logChannelID) return;
    const guild = bot.guilds.cache.get(guildID);
    if (!guild) return;
    const channel = guild.channels.cache.get(logChannelID);
    if (!channel) return;
    if (typeof embedOrMessage === 'string') {
      await channel.send(embedOrMessage);
    } else {
      await channel.send({ embeds: [embedOrMessage] });
    }
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
    const data = await Safe.findOne({ guildID }) || {};
    // Panel ayarlarını al
    const panel = await Panel.findOne({ guildID }) || {};
    
    res.render('guard', {
      guildID,
      guild,
      botUsername: bot.user.username,
      botAvatar: bot.user.displayAvatarURL(),
      botId: bot.user.id,
      guardEnabled: data.guardEnabled || false,
      safeUsers: data.safeUsers || [],
      logChannelID: data.logChannelID || '',
      // Guard ayarları
      channelCreate: data.channelCreate || false,
      channelDelete: data.channelDelete || false,
      channelUpdate: data.channelUpdate || false,
      roleCreate: data.roleCreate || false,
      roleDelete: data.roleDelete || false,
      roleUpdate: data.roleUpdate || false,
      guildUpdate: data.guildUpdate || false,
      banAdd: data.banAdd || false,
      memberRemove: data.memberRemove || false,
      emojiCreate: data.emojiCreate || false,
      emojiDelete: data.emojiDelete || false,
      stickerProtection: data.stickerProtection || false,
      panel // panel değişkenini ekledim
    });
  } catch (error) {
    console.error('Guard error:', error);
    res.status(500).send('Sunucu hatası');
  }
});


// Guard toggle
router.post('/:guildID/toggle', async (req, res) => {
  const guildID = req.params.guildID;
  const { enable } = req.body;
  try {
    const bot = req.app.get('client');
    await Safe.updateOne(
      { guildID },
      { $set: { guardEnabled: enable === 'true' } },
      { upsert: true }
    );
    await sendLogToChannel(bot, guildID, `🛡️ Guard sistemi ${enable === 'true' ? 'AKTİF' : 'PASİF'} edildi.`);
    res.redirect(`/guard/${guildID}`);
  } catch (err) {
    res.status(500).send('Sunucu hatası');
  }
});

// Safe user ekle
router.post('/:guildID/safeuser/add', async (req, res) => {
  const guildID = req.params.guildID;
  const { userID } = req.body;
  try {
    const bot = req.app.get('client');
    const data = await Safe.findOne({ guildID }) || { safeUsers: [] };
    if (!data.safeUsers.find(u => u.id === userID)) {
      data.safeUsers.push({ id: userID, addedAt: new Date() });
      await Safe.updateOne({ guildID }, data, { upsert: true });
      await sendLogToChannel(bot, guildID, `✅ Safe kullanıcı eklendi: ${userID}`);
    }
    res.redirect(`/guard/${guildID}`);
  } catch (err) {
    res.status(500).send('Sunucu hatası');
  }
});

// Safe user çıkar
router.post('/:guildID/safeuser/remove', async (req, res) => {
  const guildID = req.params.guildID;
  const { userID } = req.body;
  try {
    const bot = req.app.get('client');
    const data = await Safe.findOne({ guildID }) || { safeUsers: [] };
    data.safeUsers = data.safeUsers.filter(u => u.id !== userID);
    await Safe.updateOne({ guildID }, data, { upsert: true });
    await sendLogToChannel(bot, guildID, `🗑️ Safe kullanıcı kaldırıldı: ${userID}`);
    res.redirect(`/guard/${guildID}`);
  } catch (err) {
    res.status(500).send('Sunucu hatası');
  }
});

// Log kanalı ayarla
router.post('/:guildID/logchannel', async (req, res) => {
  const guildID = req.params.guildID;
  const { channelID } = req.body;
  try {
    const bot = req.app.get('client');
    await Safe.updateOne(
      { guildID },
      { $set: { logChannelID: channelID } },
      { upsert: true }
    );
    await sendLogToChannel(bot, guildID, `📜 Log kanalı ayarlandı: <#${channelID}>`);
    res.redirect(`/guard/${guildID}`);
  } catch (err) {
    res.status(500).send('Sunucu hatası');
  }
});

// Toplu guard ayarlarını kaydet
router.post('/:guildID', async (req, res) => {
  const guildID = req.params.guildID;
  const bot = req.app.get('client');
  // Checkbox ayarlarını al
  const settings = {
    channelCreate: !!req.body.channelCreate,
    channelDelete: !!req.body.channelDelete,
    channelUpdate: !!req.body.channelUpdate,
    roleCreate: !!req.body.roleCreate,
    roleDelete: !!req.body.roleDelete,
    roleUpdate: !!req.body.roleUpdate,
    guildUpdate: !!req.body.guildUpdate,
    banAdd: !!req.body.banAdd,
    memberRemove: !!req.body.memberRemove,
    emojiCreate: !!req.body.emojiCreate,
    emojiDelete: !!req.body.emojiDelete,
    stickerProtection: !!req.body.stickerProtection
  };
  try {
    // Önce eski ayarları al
    const oldData = await Safe.findOne({ guildID }) || {};
    await Safe.updateOne(
      { guildID },
      { $set: settings },
      { upsert: true }
    );
    // Kullanıcı adı ve avatarı session'dan alınır
    let username = 'Bir kullanıcı';
    let avatarURL = null;
    if (req.session && req.session.userId) {
      const User = require('../schemas/User');
      const userDoc = await User.findById(req.session.userId).lean();
      if (userDoc) {
        username = userDoc.username;
        avatarURL = userDoc.avatarURL || null;
      }
    }
    // Hangi ayar değiştiyse ona göre log mesajı oluştur
    let opened = [];
    let closed = [];
    for (const key in settings) {
      if (settings[key] !== oldData[key]) {
        let label = '';
        switch(key) {
          case 'channelCreate': label = 'Kanal Oluşturma Koruması'; break;
          case 'channelDelete': label = 'Kanal Silme Koruması'; break;
          case 'channelUpdate': label = 'Kanal Güncelleme Koruması'; break;
          case 'roleCreate': label = 'Rol Oluşturma Koruması'; break;
          case 'roleDelete': label = 'Rol Silme Koruması'; break;
          case 'roleUpdate': label = 'Rol Güncelleme Koruması'; break;
          case 'guildUpdate': label = 'Sunucu Ayar Koruması'; break;
          case 'banAdd': label = 'Ban Koruması'; break;
          case 'memberRemove': label = 'Üye Çıkarma Koruması'; break;
          case 'emojiCreate': label = 'Emoji Oluşturma Koruması'; break;
          case 'emojiDelete': label = 'Emoji Silme Koruması'; break;
          case 'stickerProtection': label = 'Sticker Koruması'; break;
          default: label = key;
        }
        if (settings[key]) opened.push(label);
        else closed.push(label);
      }
    }
    // Embedli log
    const embed = new EmbedBuilder()
      .setTitle('🔒 Guard Ayarları Güncellendi')
      .setColor(0xfaa61a)
      .setAuthor({ name: username, iconURL: avatarURL || undefined })
      .setDescription('Guard panelinden ayar(lar) güncellendi.')
      .setTimestamp();
    if (opened.length > 0)
      embed.addFields({ name: 'Açılanlar', value: opened.map(a => `• ${a}`).join('\n'), inline: false });
    if (closed.length > 0)
      embed.addFields({ name: 'Kapatılanlar', value: closed.map(a => `• ${a}`).join('\n'), inline: false });
    if (opened.length === 0 && closed.length === 0)
      embed.addFields({ name: 'Bilgi', value: 'Değişiklik yok.', inline: false });
    await sendLogToChannel(bot, guildID, embed);
    res.redirect(`/guard/${guildID}`);
  } catch (err) {
    res.status(500).send('Sunucu hatası');
  }
});

module.exports = router;
