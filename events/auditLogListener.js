const { Events, AuditLogEvent } = require('discord.js');
const config = require('../config');
const LogEntry = require('../schemas/logEntry');

module.exports = {
  name: 'guildAuditLogEntryCreate',
  /**
   * @param {import('discord.js').GuildAuditLogsEntry} entry
   * @param {import('discord.js').Guild} guild
   * @param {import('discord.js').Client} client
   */
  async execute(client, entry, guild) {
    try {
      // Sadece ana sunucu için çalışsın
      if (guild.id !== config.guildID) return;
      const actionType = entry.action;
      const executor = entry.executor;
      const target = entry.target;
      const createdAt = entry.createdAt || new Date();
      let description = '';
      // Olay tipine göre açıklama hazırla
      switch (actionType) {
        case AuditLogEvent.RoleCreate:
          description = `🟢 ${executor.tag} (${executor.id}) yeni bir rol oluşturdu: ${target.name} (${target.id})`;
          break;
        case AuditLogEvent.RoleDelete:
          description = `🔴 ${executor.tag} (${executor.id}) bir rol sildi: ${target.name} (${target.id})`;
          break;
        case AuditLogEvent.RoleUpdate:
          description = `🟡 ${executor.tag} (${executor.id}) bir rolü güncelledi: ${target.name} (${target.id})`;
          break;
        case AuditLogEvent.ChannelCreate:
          description = `🟢 ${executor.tag} (${executor.id}) yeni bir kanal oluşturdu: ${target.name} (${target.id})`;
          break;
        case AuditLogEvent.ChannelDelete:
          description = `🔴 ${executor.tag} (${executor.id}) bir kanalı sildi: ${target.name} (${target.id})`;
          break;
        case AuditLogEvent.ChannelUpdate:
          description = `🟡 ${executor.tag} (${executor.id}) bir kanalı güncelledi: ${target.name} (${target.id})`;
          break;
        case AuditLogEvent.EmojiCreate:
          description = `🟢 ${executor.tag} (${executor.id}) yeni bir emoji oluşturdu: ${target.name} (${target.id})`;
          break;
        case AuditLogEvent.EmojiDelete:
          description = `🔴 ${executor.tag} (${executor.id}) bir emojiyi sildi: ${target.name} (${target.id})`;
          break;
        case AuditLogEvent.EmojiUpdate:
          description = `🟡 ${executor.tag} (${executor.id}) bir emojiyi güncelledi: ${target.name} (${target.id})`;
          break;
        case AuditLogEvent.MemberBanAdd:
          description = `⛔ ${executor.tag} (${executor.id}) bir üyeyi banladı: ${target.tag || target.id}`;
          break;
        case AuditLogEvent.MemberBanRemove:
          description = `✅ ${executor.tag} (${executor.id}) bir üyenin banını kaldırdı: ${target.tag || target.id}`;
          break;
        case AuditLogEvent.MemberKick:
          description = `🚫 ${executor.tag} (${executor.id}) bir üyeyi attı: ${target.tag || target.id}`;
          break;
        case AuditLogEvent.WebhookCreate:
          description = `🟢 ${executor.tag} (${executor.id}) yeni bir webhook oluşturdu: ${target.name} (${target.id})`;
          break;
        case AuditLogEvent.WebhookDelete:
          description = `🔴 ${executor.tag} (${executor.id}) bir webhook sildi: ${target.name} (${target.id})`;
          break;
        case AuditLogEvent.WebhookUpdate:
          description = `🟡 ${executor.tag} (${executor.id}) bir webhook güncelledi: ${target.name} (${target.id})`;
          break;
        // Diğer önemli olaylar eklenebilir
        default:
          description = `ℹ️ ${executor.tag} (${executor.id}) bir işlem yaptı: ${actionType}`;
      }
      // Log kanalına gönder
      const Safe = require('../schemas/safe');
      const safeData = await Safe.findOne({ guildID: guild.id });
      const logChannelID = safeData?.logChannelID;
      if (logChannelID) {
        const logChannel = guild.channels.cache.get(logChannelID);
        if (logChannel) {
          // Embedli gönder
          const { EmbedBuilder } = require('discord.js');
          const embed = new EmbedBuilder()
            .setTitle('🔔 Sunucu Olayı')
            .setDescription(description)
            .setColor(0x5865f2)
            .setTimestamp();
          await logChannel.send({ embeds: [embed] });
        }
      }
      // Veritabanına kaydet (detaylı)
      await LogEntry.create({
        guildID: guild.id,
        description,
        createdAt,
        userId: executor?.id || null,
        username: executor?.tag || null,
        userAvatar: executor?.avatar || null,
        type: getLogType(actionType),
        status: 'allowed', // Burada engelleme varsa 'blocked' yapılabilir
        timestamp: createdAt
      });
    } catch (err) {
      console.error('[AuditLogListener] Hata:', err);
    }
  }
};

// Yardımcı fonksiyon: AuditLogEvent tipini string olarak döndür
function getLogType(actionType) {
  switch (actionType) {
    case AuditLogEvent.RoleCreate:
    case AuditLogEvent.ChannelCreate:
    case AuditLogEvent.EmojiCreate:
    case AuditLogEvent.WebhookCreate:
      return 'create';
    case AuditLogEvent.RoleDelete:
    case AuditLogEvent.ChannelDelete:
    case AuditLogEvent.EmojiDelete:
    case AuditLogEvent.WebhookDelete:
      return 'delete';
    case AuditLogEvent.RoleUpdate:
    case AuditLogEvent.ChannelUpdate:
    case AuditLogEvent.EmojiUpdate:
    case AuditLogEvent.WebhookUpdate:
      return 'update';
    case AuditLogEvent.MemberBanAdd:
      return 'ban';
    case AuditLogEvent.MemberKick:
      return 'kick';
    default:
      return 'info';
  }
} 