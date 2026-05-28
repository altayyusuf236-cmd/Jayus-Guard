const express = require('express');
const router = express.Router();
const SafeUser = require('../schemas/safeUser');
const Safe = require('../schemas/safe');
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

// Güvenli kullanıcıları listele
router.get('/:guildID', async (req, res) => {
  const guildID = req.params.guildID;
  try {
    const bot = req.app.get('client');
    const guild = bot.guilds.cache.get(guildID);
    if (!guild) {
      return res.status(404).send('Sunucu bulunamadı');
    }
    // SafeUser koleksiyonundan çek
    const safeUsers = await SafeUser.find({ guildID }).sort({ numId: 1 }).lean();
    res.render('safe-users', {
      guildID,
      guild,
      guildIcon: guild.iconURL({ size: 128, extension: 'png' }) || null,
      botUsername: bot.user.username,
      botAvatar: bot.user.displayAvatarURL(),
      botId: bot.user.id,
      guardEnabled: (await Safe.findOne({ guildID }))?.guardEnabled || false,
      safeUsers,
      logChannelID: (await Safe.findOne({ guildID }))?.logChannelID || '',
    });
  } catch (error) {
    console.error('Safe users error:', error);
    res.status(500).send('Sunucu hatası');
  }
});

// Güvenli kullanıcı ekle
router.post('/:guildID/add', async (req, res) => {
  const guildID = req.params.guildID;
  const { userID } = req.body;
  try {
    const bot = req.app.get('client');
    // Kullanıcıyı session'dan bul
    let username = 'Panel Kullanıcısı';
    let avatarURL = null;
    if (req.session && req.session.userId) {
      const User = require('../schemas/User');
      const userDoc = await User.findById(req.session.userId).lean();
      if (userDoc) {
        username = userDoc.username;
        avatarURL = userDoc.avatarURL || null;
      }
    }
    // En büyük numId'yi bul
    const lastUser = await SafeUser.findOne({ guildID }).sort({ numId: -1 });
    const newNumId = lastUser ? lastUser.numId + 1 : 1;
    // Önce aynı ID'li kullanıcıyı sil (varsa)
    await SafeUser.deleteMany({ guildID, id: userID });
    let eklenenKullanici = null;
    try {
      // Discord'dan kullanıcı bilgilerini çek
      const user = await bot.users.fetch(userID);
      const guild = bot.guilds.cache.get(guildID);
      const member = await guild.members.fetch(userID);
      // Avatar URL'lerini oluştur
      const avatarURL2 = user.avatar 
        ? `https://cdn.discordapp.com/avatars/${userID}/${user.avatar}.png?size=128`
        : `https://cdn.discordapp.com/embed/avatars/${user.discriminator % 5}.png`;
      eklenenKullanici = {
        username: user.username,
        tag: user.tag,
        id: userID,
        avatarURL: avatarURL2,
        displayName: member.displayName
      };
      await SafeUser.create({
        guildID,
        numId: newNumId,
        id: userID,
        username: user.username,
        discriminator: user.discriminator,
        avatar: user.avatar,
        avatarURL: avatarURL2,
        displayName: member.displayName,
        joinedAt: member.joinedAt,
        addedAt: new Date()
      });
    } catch (userError) {
      eklenenKullanici = {
        username: 'Bilinmeyen Kullanıcı',
        tag: 'Bilinmiyor',
        id: userID,
        avatarURL: null,
        displayName: 'Bilinmeyen Kullanıcı'
      };
      await SafeUser.create({
        guildID,
        numId: newNumId,
        id: userID,
        username: 'Bilinmeyen Kullanıcı',
        discriminator: '0000',
        avatar: null,
        displayName: 'Bilinmeyen Kullanıcı',
        joinedAt: new Date(),
        addedAt: new Date()
      });
    }
    // Embedli log
    const embed = new EmbedBuilder()
      .setTitle('✅ Safe Kullanıcı Eklendi')
      .setColor(0x43b581)
      .setAuthor({ name: username, iconURL: avatarURL || undefined })
      .addFields(
        { name: 'Eklenen Kullanıcı', value: `<@${eklenenKullanici.id}> (${eklenenKullanici.username})`, inline: true },
        { name: 'Numara', value: String(newNumId), inline: true },
        { name: 'Ekleyen', value: username, inline: true }
      )
      .setTimestamp();
    await sendLogToChannel(bot, guildID, embed);
    res.redirect(`/safe-users/${guildID}`);
  } catch (error) {
    console.error('Add safe user error:', error);
    res.status(500).send('Sunucu hatası');
  }
});

// Güvenli kullanıcı sil
router.post('/:guildID/remove', async (req, res) => {
  const guildID = req.params.guildID;
  const { numId } = req.body;
  try {
    const bot = req.app.get('client');
    // Kullanıcıyı session'dan bul
    let username = 'Panel Kullanıcısı';
    let avatarURL = null;
    if (req.session && req.session.userId) {
      const User = require('../schemas/User');
      const userDoc = await User.findById(req.session.userId).lean();
      if (userDoc) {
        username = userDoc.username;
        avatarURL = userDoc.avatarURL || null;
      }
    }
    if (!numId) {
      return res.status(400).send('numId eksik!');
    }
    const silinen = await SafeUser.findOne({ guildID, numId: Number(numId) });
    await SafeUser.deleteOne({ guildID, numId: Number(numId) });
    // Embedli log
    const embed = new EmbedBuilder()
      .setTitle('🗑️ Safe Kullanıcı Kaldırıldı')
      .setColor(0xf04747)
      .setAuthor({ name: username, iconURL: avatarURL || undefined })
      .addFields(
        { name: 'Kaldırılan Kullanıcı', value: silinen ? `<@${silinen.id}> (${silinen.username})` : `Numara: ${numId}`, inline: true },
        { name: 'Numara', value: String(numId), inline: true },
        { name: 'Kaldıran', value: username, inline: true }
      )
      .setTimestamp();
    await sendLogToChannel(bot, guildID, embed);
    res.redirect(`/safe-users/${guildID}`);
  } catch (error) {
    console.error('Remove safe user error:', error);
    res.status(500).send('Sunucu hatası');
  }
});

// Kullanıcı profilini getir
router.get('/:guildID/user/:userID', async (req, res) => {
  const guildID = req.params.guildID;
  const userID = req.params.userID;
  try {
    const bot = req.app.get('client');
    const guild = bot.guilds.cache.get(guildID);
    if (!guild) {
      return res.json({ success: false, error: 'Sunucu bulunamadı' });
    }
    let user, member, userData;
    async function fetchDiscordUserWithTimeout(timeoutMs = 5000) {
      return Promise.race([
        (async () => {
          try {
            user = await bot.users.fetch(userID);
            member = await guild.members.fetch(userID);
            return { user, member };
          } catch (err) {
            throw err;
          }
        })(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs))
      ]);
    }
    try {
      const { user, member } = await fetchDiscordUserWithTimeout();
      const avatarURL = user.avatar 
        ? `https://cdn.discordapp.com/avatars/${userID}/${user.avatar}.png?size=256`
        : `https://cdn.discordapp.com/embed/avatars/${user.discriminator % 5}.png`;
      const roles = member.roles.cache
        .filter(role => role.id !== guild.id)
        .map(role => ({
          id: role.id,
          name: role.name,
          color: role.hexColor,
          position: role.position
        }))
        .sort((a, b) => b.position - a.position);
      userData = {
        id: user.id,
        username: user.username,
        discriminator: user.discriminator,
        avatar: user.avatar,
        avatarURL: avatarURL,
        displayName: member.displayName,
        createdAt: user.createdAt,
        joinedAt: member.joinedAt,
        roles: roles,
        permissions: member.permissions.toArray(),
        isBot: user.bot,
        isVerified: user.verified,
        guildIcon: guild.iconURL({ size: 128, extension: 'png' }) || null,
        guildName: guild.name
      };
      return res.json({ success: true, user: userData });
    } catch (error) {
      // Discord'dan veri çekilemedi, fallback olarak SafeUser koleksiyonundan bul
      try {
        const safeUser = await SafeUser.findOne({ guildID, id: userID });
        if (safeUser) {
          userData = {
            id: safeUser.id,
            username: safeUser.username || 'Bilinmeyen Kullanıcı',
            discriminator: safeUser.discriminator || '0000',
            avatar: safeUser.avatar || null,
            avatarURL: safeUser.avatarURL || 'https://cdn.discordapp.com/embed/avatars/0.png',
            displayName: safeUser.displayName || 'Bilinmeyen Kullanıcı',
            createdAt: null,
            joinedAt: safeUser.joinedAt || null,
            addedAt: safeUser.addedAt || null,
            roles: [],
            permissions: [],
            isBot: false,
            isVerified: false,
            guildIcon: guild.iconURL({ size: 128, extension: 'png' }) || null,
            guildName: guild.name
          };
          return res.json({ success: true, user: userData, fallback: true });
        } else {
          return res.json({ success: false, error: 'Kullanıcı bulunamadı (veritabanı ve Discord).' });
        }
      } catch (fallbackError) {
        return res.json({ success: false, error: 'Kullanıcı bilgileri alınamadı (fallback).' });
      }
    }
  } catch (error) {
    console.error('Get user details error:', error);
    res.json({ success: false, error: 'Kullanıcı bilgileri alınamadı' });
  }
});

module.exports = router; 