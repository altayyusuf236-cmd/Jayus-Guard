const { EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  name: 'messageReactionAdd',
  async execute(client, reaction, user) {
    if (!reaction.message.guild) return;
    const logChannelID = config.logChannel;
    if (!logChannelID) return;
    const logChannel = reaction.message.guild.channels.cache.get(logChannelID);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setTitle('➕ Mesaja Emoji Eklendi')
      .setColor(0x43b581)
      .addFields(
        { name: 'Kullanıcı', value: `<@${user.id}>`, inline: true },
        { name: 'Emoji', value: `${reaction.emoji}`, inline: true },
        { name: 'Mesaj', value: `[Git](${reaction.message.url})`, inline: true }
      )
      .setTimestamp();

    logChannel.send({ embeds: [embed] });

    // Web panel log kaydı
    const LogEntry = require('../schemas/logEntry');
    await LogEntry.create({
      guildID: reaction.message.guild.id,
      description: `Mesaja emoji eklendi: ${reaction.emoji} (Kullanıcı: ${user.tag || user.id})`,
      userId: user.id,
      username: user.tag || null,
      userAvatar: user.avatar || null,
      type: 'create',
      status: 'allowed',
      timestamp: new Date()
    });
  }
}; 