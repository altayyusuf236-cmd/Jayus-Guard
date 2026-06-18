const { EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  name: 'messageReactionRemove',
  async execute(client, reaction, user) {
    if (!reaction.message.guild) return;
    const logChannelID = config.logChannel;
    if (!logChannelID) return;
    const logChannel = reaction.message.guild.channels.cache.get(logChannelID);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setTitle('➖ Mesajdan Emoji Kaldırıldı')
      .setColor(0xf04747)
      .addFields(
        { name: 'Kullanıcı', value: `<@${user.id}>`, inline: true },
        { name: 'Emoji', value: `${reaction.emoji}`, inline: true },
        { name: 'Mesaj', value: `[Git](${reaction.message.url})`, inline: true }
      )
      .setTimestamp();

    logChannel.send({ embeds: [embed] });
  }
}; 