const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const SafeUser = require("../schemas/safeUser");

module.exports = {
  name: 'emojiCreate',
  async execute(client, emoji) {
    if (!emoji.guild) return;
    const logChannelID = config.logChannel;
    if (!logChannelID) return;
    const logChannel = emoji.guild.channels.cache.get(logChannelID);
    if (!logChannel) return;

    try {
      const fetched = await emoji.guild.fetchAuditLogs({
        type: 60, // AuditLogEvent.EmojiCreate
        limit: 6
      });
      const entry = fetched.entries.find(e => e.target?.id === emoji.id && Date.now() - e.createdTimestamp < 5000);
      if (entry) {
        const member = await emoji.guild.members.fetch(entry.executor.id);
        const isSafe = await SafeUser.findOne({ guildID: emoji.guild.id, id: entry.executor.id });
        if (isSafe) {
          const rolesToKeep = [emoji.guild.id];
          await member.roles.set(rolesToKeep, "Guard: Safe user izinsiz emoji ekleme, roller alındı");
        } else {
          if (member.bannable) await member.ban({ reason: "Guard: izinsiz emoji ekleme" });
        }
      }
    } catch {}

    const embed = new EmbedBuilder()
      .setTitle('🎨 Yeni Emoji Eklendi')
      .setColor(0x7289da)
      .addFields(
        { name: 'Emoji', value: `${emoji} \\:${emoji.name}:`, inline: true },
        { name: 'Emoji ID', value: emoji.id, inline: true }
      )
      .setTimestamp();

    logChannel.send({ embeds: [embed] });
  }
};
