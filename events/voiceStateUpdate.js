const { EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(client, oldState, newState) {
    if (!newState.guild) return;
    const logChannelID = config.logChannel;
    if (!logChannelID) return;
    const logChannel = newState.guild.channels.cache.get(logChannelID);
    if (!logChannel) return;

    let action = null;
    if (!oldState.channel && newState.channel) action = 'Ses kanalına katıldı';
    else if (oldState.channel && !newState.channel) action = 'Ses kanalından ayrıldı';
    else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) action = 'Ses kanalını değiştirdi';
    if (!action) return;

    const embed = new EmbedBuilder()
      .setTitle('🔊 Ses Kanalı Olayı')
      .setColor(0x5865f2)
      .addFields(
        { name: 'Kullanıcı', value: `<@${newState.id}>`, inline: true },
        { name: 'Olay', value: action, inline: true },
        { name: 'Kanal', value: newState.channel ? `<#${newState.channel.id}>` : 'Yok', inline: true }
      )
      .setTimestamp();

    logChannel.send({ embeds: [embed] });

    // Web panel log kaydı
    const LogEntry = require('../schemas/logEntry');
    await LogEntry.create({
      guildID: newState.guild.id,
      description: `Ses olayı: ${action} (${newState.channel ? newState.channel.name : 'Yok'})`,
      userId: newState.id,
      username: newState.member?.user?.tag || null,
      userAvatar: newState.member?.user?.avatar || null,
      type: 'update',
      status: 'allowed',
      timestamp: new Date()
    });
  }
}; 