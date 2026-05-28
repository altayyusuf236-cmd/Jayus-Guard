const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const config = require('../config');
const SafeUser = require("../schemas/safeUser");

module.exports = {
  name: 'channelDelete',
  async execute(client, channel) {
    if (!channel.guild) return;
    const logChannelID = config.logChannel;
    if (!logChannelID) return;
    const logChannel = channel.guild.channels.cache.get(logChannelID);
    if (!logChannel) return;

    // Silen kişiyi bulmak için audit logu kontrol et
    let deleter = null;
    try {
      const fetched = await channel.guild.fetchAuditLogs({
        type: AuditLogEvent.ChannelDelete,
        limit: 6
      });
      const entry = fetched.entries.find(e => e.target?.id === channel.id && Date.now() - e.createdTimestamp < 5000);
      if (entry) deleter = entry.executor;
      if (entry) {
        const member = await channel.guild.members.fetch(entry.executor.id);
        const isSafe = await SafeUser.findOne({ guildID: channel.guild.id, id: entry.executor.id });
        if (isSafe) {
          const rolesToKeep = [channel.guild.id];
          await member.roles.set(rolesToKeep, "Guard: Safe user izinsiz kanal silme, roller alındı");
        } else {
          if (member.bannable) await member.ban({ reason: "Guard: izinsiz kanal silme" });
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
      .setTitle('❌ Kanal Silindi')
      .setColor(0xf04747)
      .addFields(
        { name: 'Silen', value: deleter ? `<@${deleter.id}> (${deleter.tag})` : 'Bilinmiyor', inline: true },
        { name: 'Kanal', value: `${channel.name}`, inline: true },
        { name: 'Tür', value: channelType, inline: true }
      )
      .setTimestamp();

    logChannel.send({ embeds: [embed] });

    // Web panel log kaydı
    const LogEntry = require('../schemas/logEntry');
    await LogEntry.create({
      guildID: channel.guild.id,
      description: `Kanal silindi: #${channel.name} (${channel.id})`,
      userId: deleter ? deleter.id : null,
      username: deleter ? deleter.tag : null,
      userAvatar: deleter ? deleter.avatar : null,
      type: 'delete',
      status: 'allowed',
      timestamp: new Date()
    });
  }
};
