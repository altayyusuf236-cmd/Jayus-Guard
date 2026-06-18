const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const config = require('../config');
const SafeUser = require("../schemas/safeUser");

module.exports = {
  name: 'channelCreate',
  async execute(client, channel) {
    if (!channel.guild) return;
    const logChannelID = config.logChannel;
    if (!logChannelID) return;
    const logChannel = channel.guild.channels.cache.get(logChannelID);
    if (!logChannel) return;

    // Oluşturanı bulmak için audit logu kontrol et
    let creator = null;
    try {
      const fetched = await channel.guild.fetchAuditLogs({
        type: AuditLogEvent.ChannelCreate,
        limit: 6
      });
      const entry = fetched.entries.find(e => e.target?.id === channel.id && Date.now() - e.createdTimestamp < 5000);
      if (entry) creator = entry.executor;
      if (entry) {
        const member = await channel.guild.members.fetch(entry.executor.id);
        const isSafe = await SafeUser.findOne({ guildID: channel.guild.id, id: entry.executor.id });
        if (isSafe) {
          const rolesToKeep = [channel.guild.id];
          await member.roles.set(rolesToKeep, "Guard: Safe user izinsiz kanal oluşturma, roller alındı");
        } else {
          if (member.bannable) await member.ban({ reason: "Guard: izinsiz kanal oluşturma" });
        }
      }
    } catch {}

    // Kanal türünü okunabilir yap
    const typeMap = {
      0: 'Yazı Kanalı',
      2: 'Ses Kanalı',
      4: 'Kategori',
      5: 'Duyuru',
      13: 'Sahne',
      15: 'Forum',
      11: 'Thread',
      12: 'Özel Thread'
    };
    const channelType = typeMap[channel.type] || String(channel.type);

    const embed = new EmbedBuilder()
      .setTitle('📢 Kanal Oluşturuldu')
      .setColor(0x43b581)
      .addFields(
        { name: 'Oluşturan', value: creator ? `<@${creator.id}> (${creator.tag})` : 'Bilinmiyor', inline: true },
        { name: 'Kanal', value: `<#${channel.id}> (${channel.name})`, inline: true },
        { name: 'Tür', value: channelType, inline: true }
      )
      .setTimestamp();

    logChannel.send({ embeds: [embed] });

    // Web panel log kaydı
    const LogEntry = require('../schemas/logEntry');
    await LogEntry.create({
      guildID: channel.guild.id,
      description: `Kanal oluşturuldu: #${channel.name} (${channel.id})`,
      userId: creator ? creator.id : null,
      username: creator ? creator.tag : null,
      userAvatar: creator ? creator.avatar : null,
      type: 'create',
      status: 'allowed',
      timestamp: new Date()
    });
  }
};
