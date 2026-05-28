const { EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  name: 'guildMemberRemove',
  async execute(client, member) {
    if (!member.guild) return;
    const logChannelID = config.logChannel;
    if (!logChannelID) return;
    const logChannel = member.guild.channels.cache.get(logChannelID);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setTitle('👋 Üye Ayrıldı')
      .setColor(0x7289da)
      .addFields(
        { name: 'Kullanıcı', value: `<@${member.id}> (${member.user.tag})`, inline: true },
        { name: 'Kullanıcı ID', value: member.id, inline: true }
      )
      .setTimestamp();

    logChannel.send({ embeds: [embed] });
  }
}; 