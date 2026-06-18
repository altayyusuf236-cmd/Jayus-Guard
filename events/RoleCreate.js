const { AuditLogEvent, EmbedBuilder } = require("discord.js");
const config = require("../config");
const SafeUser = require("../schemas/safeUser");
const Log = require("../schemas/logchannel");

module.exports = {
  name: "roleCreate",
  async execute(client, role) {
    if (!role.guild) return;

    const audit = await role.guild.fetchAuditLogs({ type: AuditLogEvent.RoleCreate });
    const entry = audit.entries.first();

    if (!entry?.executor || entry.executor.bot) return;

    await role.delete().catch(() => {});

    try {
      const member = await role.guild.members.fetch(entry.executor.id);
      const isSafe = await SafeUser.findOne({ guildID: role.guild.id, id: entry.executor.id });
      if (isSafe) {
        // Safe user ise banlama, sadece rollerini al
        const rolesToKeep = [role.guild.id]; // Sadece everyone rolü kalsın
        await member.roles.set(rolesToKeep, "Guard: Safe user izinsiz rol oluşturdu, roller alındı");
      } else {
        if (member.bannable) await member.ban({ reason: "Guard: izinsiz rol oluşturma" });
      }
    } catch {}

    // LOG KANALI ARTIK SAFE'DEN
    const logChannelID = config.logChannel;
    if (!logChannelID) return;
    const logChannel = role.guild.channels.cache.get(logChannelID);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setTitle("🚨 Rol Oluşturma Engellendi")
      .setDescription(`
İzinsiz rol oluşturuldu ve yapan kişi yasaklandı.

Rol: \`${role.name}\` (\`${role.id}\`)
Yapan: <@${entry.executor.id}> \`${entry.executor.tag}\`
Tarih: <t:${Math.floor(Date.now() / 1000)}:F>
      `)
      .setColor("Red")
      .setFooter({ text: "Guard sistemi devrede." })
      .setTimestamp();

    logChannel.send({ embeds: [embed] });

    // Web panel log kaydı
    const LogEntry = require('../schemas/logEntry');
    await LogEntry.create({
      guildID: role.guild.id,
      description: `İzinsiz rol oluşturuldu ve banlandı: ${role.name} (${role.id})`,
      userId: entry.executor.id,
      username: entry.executor.tag,
      userAvatar: entry.executor.avatar,
      type: 'create',
      status: 'blocked',
      timestamp: new Date()
    });
  }
};
