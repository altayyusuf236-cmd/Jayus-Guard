const { AuditLogEvent, EmbedBuilder, PermissionsBitField } = require("discord.js");
const Safe = require("../schemas/safe");
const Log = require("../schemas/logchannel");
const config = require("../config");
const SafeUser = require("../schemas/safeUser");

module.exports = {
  name: "roleDelete",
  async execute(client, role) {
    if (!role.guild) return;

    const audit = await role.guild.fetchAuditLogs({ type: AuditLogEvent.RoleDelete });
    const entry = audit.entries.first();

    if (!entry || !entry.executor || entry.executor.bot) return;


    try {
      const member = await role.guild.members.fetch(entry.executor.id);
      const isSafe = await SafeUser.findOne({ guildID: role.guild.id, id: entry.executor.id });
      if (isSafe) {
        const rolesToKeep = [role.guild.id];
        await member.roles.set(rolesToKeep, "Guard: Safe user izinsiz rol silme, roller alındı");
      } else {
        if (member.bannable) await member.ban({ reason: "Guard: izinsiz rol silme" });
      }
    } catch (err) {
      console.error("Banlama başarısız:", err);
    }


    try {
      await role.guild.roles.create({
        name: role.name,
        color: role.color,
        hoist: role.hoist,
        permissions: role.permissions.bitfield ?? PermissionsBitField.Flags.None,
        mentionable: role.mentionable,
        reason: "Silinen rol guard sistemi tarafından tekrar oluşturuldu",
       
      });
    } catch (err) {
      console.error("Rol yeniden oluşturulamadı:", err);
    }


    // LOG KANALI ARTIK SAFE'DEN
    const logChannelID = config.logChannel;
    if (!logChannelID) return;
    const logChannel = role.guild.channels.cache.get(logChannelID);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setTitle("🚨 Rol Silme Engellendi")
      .setDescription(`
İzinsiz rol silindi ve yapan kişi banlandı.

Rol: \`${role.name}\` (\`${role.id}\`)
Yapan: <@${entry.executor.id}> \`${entry.executor.tag}\`
Tarih: <t:${Math.floor(Date.now() / 1000)}:F>
Rol otomatik olarak yeniden oluşturuldu.
      `)
      .setColor("Red")
      .setFooter({ text: "Guard sistemi devrede." })
      .setTimestamp();

    await logChannel.send({ embeds: [embed] });

    // Web panel log kaydı
    const LogEntry = require('../schemas/logEntry');
    await LogEntry.create({
      guildID: role.guild.id,
      description: `İzinsiz rol silindi ve banlandı: ${role.name} (${role.id})`,
      userId: entry.executor.id,
      username: entry.executor.tag,
      userAvatar: entry.executor.avatar,
      type: 'delete',
      status: 'blocked',
      timestamp: new Date()
    });
  }
};
