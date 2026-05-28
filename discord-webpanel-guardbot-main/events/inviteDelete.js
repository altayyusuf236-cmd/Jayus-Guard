const { EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  name: 'inviteDelete',
  async execute(client, invite) {
    if (!invite.guild) return;
    const logChannelID = config.logChannel;
    if (!logChannelID) return;
    const logChannel = invite.guild.channels.cache.get(logChannelID);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setTitle('❌ Davet Silindi')
      .setColor(0xf04747)
      .addFields(
        { name: 'Davet Kodu', value: invite.code, inline: true },
        { name: 'Kanal', value: `<#${invite.channel.id}>`, inline: true }
      )
      .setTimestamp();

    logChannel.send({ embeds: [embed] });
  }
}; 