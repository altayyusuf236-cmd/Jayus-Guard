const { EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  name: 'inviteCreate',
  async execute(client, invite) {
    if (!invite.guild) return;
    const logChannelID = config.logChannel;
    if (!logChannelID) return;
    const logChannel = invite.guild.channels.cache.get(logChannelID);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setTitle('🔗 Davet Oluşturuldu')
      .setColor(0x43b581)
      .addFields(
        { name: 'Davet Kodu', value: invite.code, inline: true },
        { name: 'Oluşturan', value: `<@${invite.inviter?.id || 'Bilinmiyor'}>`, inline: true },
        { name: 'Kanal', value: `<#${invite.channel.id}>`, inline: true }
      )
      .setTimestamp();

    logChannel.send({ embeds: [embed] });

    // Web panel log kaydı
    const LogEntry = require('../schemas/logEntry');
    await LogEntry.create({
      guildID: invite.guild.id,
      description: `Davet oluşturuldu: ${invite.code} (Kanal: ${invite.channel.name})`,
      userId: invite.inviter?.id || null,
      username: invite.inviter?.tag || null,
      userAvatar: invite.inviter?.avatar || null,
      type: 'create',
      status: 'allowed',
      timestamp: new Date()
    });
  }
}; 