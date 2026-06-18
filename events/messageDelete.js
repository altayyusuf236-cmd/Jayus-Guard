const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const config = require('../config');

module.exports = {
  name: 'messageDelete',
  async execute(client, message) {
    if (!message.guild || message.author?.bot) return;
    const logChannelID = config.logChannel;
    if (!logChannelID) return;
    const logChannel = message.guild.channels.cache.get(logChannelID);
    if (!logChannel) return;

    // Silen kişiyi bulmak için audit logu kontrol et
    let deleter = null;
    try {
      const fetched = await message.guild.fetchAuditLogs({
        type: AuditLogEvent.MessageDelete,
        limit: 6
      });
      const entry = fetched.entries.find(e => e.target?.id === message.author.id && Date.now() - e.createdTimestamp < 5000);
      if (entry) deleter = entry.executor;
    } catch {}

    const embed = new EmbedBuilder()
      .setTitle('🗑️ Mesaj Silindi')
      .setColor(0xf04747)
      .addFields(
        { name: 'Silen', value: deleter ? `<@${deleter.id}> (${deleter.tag})` : 'Bilinmiyor', inline: true },
        { name: 'Mesaj Sahibi', value: `<@${message.author.id}> (${message.author.tag})`, inline: true },
        { name: 'Kanal', value: `<#${message.channel.id}>`, inline: true },
        { name: 'İçerik', value: message.content?.slice(0, 1024) || 'Embed/Resim veya boş mesaj', inline: false }
      )
      .setTimestamp();

    logChannel.send({ embeds: [embed] });

    // Web panel log kaydı
    const LogEntry = require('../schemas/logEntry');
    await LogEntry.create({
      guildID: message.guild.id,
      description: `Mesaj silindi: ${message.content?.slice(0, 128) || 'Embed/Resim veya boş mesaj'} (Kanal: #${message.channel.name})`,
      userId: deleter ? deleter.id : null,
      username: deleter ? deleter.tag : null,
      userAvatar: deleter ? deleter.avatar : null,
      type: 'delete',
      status: 'allowed',
      timestamp: new Date()
    });
  }
}; 