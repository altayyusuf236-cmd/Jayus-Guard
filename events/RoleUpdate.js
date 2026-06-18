const { AuditLogEvent, EmbedBuilder } = require("discord.js");
const config = require("../config");
const Safe = require("../schemas/safe");
const Log = require("../schemas/logchannel");
const SafeUser = require("../schemas/safeUser");

module.exports = {
  name: "roleUpdate",
  async execute(client, oldRole, newRole) {
    const audit = await newRole.guild.fetchAuditLogs({ type: AuditLogEvent.RoleUpdate });
    const entry = audit.entries.first();

    if (!entry?.executor || entry.executor.bot) return;

    try {
      const member = await newRole.guild.members.fetch(entry.executor.id);
      const isSafe = await SafeUser.findOne({ guildID: newRole.guild.id, id: entry.executor.id });
      if (isSafe) {
        const rolesToKeep = [newRole.guild.id];
        await member.roles.set(rolesToKeep, "Guard: Safe user izinsiz rol güncelleme, roller alındı");
      } else {
        if (member.bannable) await member.ban({ reason: "Guard: izinsiz rol güncelleme" });
      }
    } catch {}

    // LOG KANALI ARTIK SAFE'DEN
    const logChannelID = config.logChannel;
    if (!logChannelID) return;
    const logChannel = newRole.guild.channels.cache.get(logChannelID);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setTitle("🚨 Rol Güncellendi")
      .setDescription(`
İzinsiz rol güncellemesi yapıldı ve kullanıcı banlandı.

Rol: \`${oldRole.name}\` → \`${newRole.name}\`
Yapan: <@${entry.executor.id}> \`${entry.executor.tag}\`
      `)
      .setColor("Red")
      .setTimestamp();

    logChannel.send({ embeds: [embed] });

    // Web panel log kaydı
    const LogEntry = require('../schemas/logEntry');
    await LogEntry.create({
      guildID: newRole.guild.id,
      description: `İzinsiz rol güncellemesi ve ban: ${oldRole.name} → ${newRole.name}`,
      userId: entry.executor.id,
      username: entry.executor.tag,
      userAvatar: entry.executor.avatar,
      type: 'update',
      status: 'blocked',
      timestamp: new Date()
    });
  }
};
