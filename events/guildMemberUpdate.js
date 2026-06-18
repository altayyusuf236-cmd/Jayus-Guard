const { EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  name: 'guildMemberUpdate',
  async execute(client, oldMember, newMember) {
    if (!newMember.guild) return;
    const logChannelID = config.logChannel;
    if (!logChannelID) return;
    const logChannel = newMember.guild.channels.cache.get(logChannelID);
    if (!logChannel) return;

    let changes = [];
    if (oldMember.nickname !== newMember.nickname) {
      changes.push(`Takma ad değişti: 
Eski: 
${oldMember.nickname || 'Yok'}
Yeni: ${newMember.nickname || 'Yok'}`);
    }
    if (oldMember.roles.cache.size !== newMember.roles.cache.size) {
      changes.push('Roller değişti.');
    }
    if (changes.length === 0) return;

    const embed = new EmbedBuilder()
      .setTitle('📝 Üye Güncellendi')
      .setColor(0xfaa61a)
      .setDescription(changes.join('\n'))
      .addFields(
        { name: 'Kullanıcı', value: `<@${newMember.id}> (${newMember.user.tag})`, inline: true }
      )
      .setTimestamp();

    logChannel.send({ embeds: [embed] });

    // Web panel log kaydı
    const LogEntry = require('../schemas/logEntry');
    await LogEntry.create({
      guildID: newMember.guild.id,
      description: `Üye güncellendi: ${changes.join(' | ')}`,
      userId: newMember.id,
      username: newMember.user.tag,
      userAvatar: newMember.user.avatar,
      type: 'update',
      status: 'allowed',
      timestamp: new Date()
    });
  }
}; 