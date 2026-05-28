const express = require('express');
const router = express.Router();
const Safe = require('../schemas/safe');
const LogEntry = require('../schemas/logEntry');

// Yardımcı log fonksiyonu
async function sendLogToChannel(bot, guildID, message) {
  try {
    const Safe = require('../schemas/safe');
    const safeData = await Safe.findOne({ guildID });
    const logChannelID = safeData && safeData.logChannelID;
    if (!logChannelID) return;
    const guild = bot.guilds.cache.get(guildID);
    if (!guild) return;
    const channel = guild.channels.cache.get(logChannelID);
    if (!channel) return;
    await channel.send(message);
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
    const safeData = await Safe.findOne({ guildID }) || {};
    
    res.render('roles', {
      guildID,
      guild,
      botUsername: bot.user.username,
      botAvatar: bot.user.displayAvatarURL(),
      botId: bot.user.id,
      guardEnabled: safeData.guardEnabled || false,
      safeUsers: safeData.safeUsers || [],
      logChannelID: safeData.logChannelID || '',
    });
  } catch (error) {
    console.error('Roles error:', error);
    res.status(500).send('Sunucu hatası');
  }
});

// Örnek rol ekleme endpointi
router.post('/:guildID/add-role', async (req, res) => {
  const guildID = req.params.guildID;
  const bot = req.app.get('client');
  const { roleName } = req.body;
  try {
    const guild = bot.guilds.cache.get(guildID);
    if (!guild) return res.status(404).send('Sunucu bulunamadı');
    const newRole = await guild.roles.create({ name: roleName, reason: 'Panelden eklendi' });
    const logMsg = `🆕 Rol eklendi: ${newRole.name} (${newRole.id})`; 
    await sendLogToChannel(bot, guildID, logMsg);
    await LogEntry.create({ guildID, description: logMsg });
    res.redirect(`/roles/${guildID}`);
  } catch (err) {
    res.status(500).send('Sunucu hatası');
  }
});

// Rol silme endpointi
router.post('/:guildID/delete-role/:roleID', async (req, res) => {
  const guildID = req.params.guildID;
  const roleID = req.params.roleID;
  const bot = req.app.get('client');
  try {
    const guild = bot.guilds.cache.get(guildID);
    if (!guild) return res.status(404).send('Sunucu bulunamadı');
    const role = guild.roles.cache.get(roleID);
    if (!role) return res.status(404).send('Rol bulunamadı');
    await role.delete('Panelden silindi');
    const logMsg = `🗑️ Rol silindi: ${role.name} (${role.id})`;
    await sendLogToChannel(bot, guildID, logMsg);
    await LogEntry.create({ guildID, description: logMsg });
    res.redirect(`/roles/${guildID}`);
  } catch (err) {
    res.status(500).send('Sunucu hatası');
  }
});

// Rol düzenleme endpointi
router.post('/:guildID/edit-role/:roleID', async (req, res) => {
  const guildID = req.params.guildID;
  const roleID = req.params.roleID;
  const bot = req.app.get('client');
  const { name, color, position, mentionable, hoist, permissions } = req.body;
  try {
    const guild = bot.guilds.cache.get(guildID);
    if (!guild) return res.json({ success: false, error: 'Sunucu bulunamadı' });
    const role = guild.roles.cache.get(roleID);
    if (!role) return res.json({ success: false, error: 'Rol bulunamadı' });
    // İzinler
    let newPerms = role.permissions;
    if (permissions && Array.isArray(permissions)) {
      // Sadece önemli izinler güncelleniyor, diğerleri korunuyor
      const importantPerms = [
        'Administrator', 'ManageGuild', 'ManageRoles', 'ManageChannels',
        'KickMembers', 'BanMembers', 'ManageMessages', 'ManageWebhooks'
      ];
      // Önce önemli izinleri kaldır
      newPerms = newPerms.remove(importantPerms);
      // Sonra seçilenleri ekle
      newPerms = newPerms.add(permissions);
    }
    await role.edit({
      name: name,
      color: color,
      position: Number(position),
      mentionable: mentionable === 'true',
      hoist: hoist === 'true',
      permissions: newPerms
    });
    // Log ve veritabanı kaydı
    const logMsg = `✏️ Rol güncellendi: ${name} (${roleID})`;
    await sendLogToChannel(bot, guildID, logMsg);
    await LogEntry.create({ guildID, description: logMsg });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Bir rolün işlem geçmişini dönen endpoint
router.get('/:guildID/role-history/:roleID', async (req, res) => {
  const { guildID, roleID } = req.params;
  try {
    // Son 50 logdan ilgili role ait olanları getir
    const logs = await LogEntry.find({
      guildID,
      description: { $regex: roleID }
    }).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ success: true, logs });
  } catch (err) {
    res.json({ success: false, error: 'Loglar alınamadı.' });
  }
});

module.exports = router; 