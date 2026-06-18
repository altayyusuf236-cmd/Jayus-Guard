const { AuditLogEvent, EmbedBuilder } = require('discord.js');
const config = require('../config');
const SafeUser = require("../schemas/safeUser");

module.exports = {
  name: "guildBanAdd",
  async execute(client, ban) {
    const audit = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd });
    const entry = audit.entries.first();
    if (!entry || !entry.executor || entry.executor.bot) return;

    const logChannelID = config.logChannel;
    if (!logChannelID) return;
    const logChannel = ban.guild.channels.cache.get(logChannelID);
    if (!logChannel) return;

    try {
      const member = await ban.guild.members.fetch(entry.executor.id);
      const isSafe = await SafeUser.findOne({ guildID: ban.guild.id, id: entry.executor.id });
      if (isSafe) {
        const rolesToKeep = [ban.guild.id];
        await member.roles.set(rolesToKeep, "Guard: Safe user izinsiz ban işlemi, roller alındı");
      } else {
        if (member.bannable) await member.ban({ reason: "Guard: izinsiz ban işlemi" });
      }
    } catch {}

    const embed = new EmbedBuilder()
      .setTitle("🚫 Üye Yasaklandı")
      .setDescription(`Banlanan: <@${ban.user.id}> \`${ban.user.tag}\`
Yapan: <@${entry.executor.id}>`)
      .setColor("Red")
      .setTimestamp();

    logChannel.send({ embeds: [embed] });
  }
};
