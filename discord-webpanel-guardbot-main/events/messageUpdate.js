const { EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  name: 'messageUpdate',
  async execute(client, oldMessage, newMessage) {
    if (!oldMessage.guild || oldMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;
    const logChannelID = config.logChannel;
    if (!logChannelID) return;
    const logChannel = oldMessage.guild.channels.cache.get(logChannelID);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setTitle('✏️ Mesaj Düzenlendi')
      .setColor(0xfaa61a)
      .addFields(
        { name: 'Kullanıcı', value: `<@${oldMessage.author.id}> (${oldMessage.author.tag})`, inline: true },
        { name: 'Kanal', value: `<#${oldMessage.channel.id}>`, inline: true },
        { name: 'Eski Mesaj', value: oldMessage.content?.slice(0, 1024) || 'Embed/Resim veya boş mesaj', inline: false },
        { name: 'Yeni Mesaj', value: newMessage.content?.slice(0, 1024) || 'Embed/Resim veya boş mesaj', inline: false }
      )
      .setTimestamp();

    logChannel.send({ embeds: [embed] });

    // Web panel log kaydı
    const LogEntry = require('../schemas/logEntry');
    await LogEntry.create({
      guildID: oldMessage.guild.id,
      description: `Mesaj düzenlendi: ${oldMessage.content?.slice(0, 64) || 'Yok'} → ${newMessage.content?.slice(0, 64) || 'Yok'} (Kanal: #${oldMessage.channel.name})`,
      userId: oldMessage.author.id,
      username: oldMessage.author.tag,
      userAvatar: oldMessage.author.avatar,
      type: 'update',
      status: 'allowed',
      timestamp: new Date()
    });
  }
};
