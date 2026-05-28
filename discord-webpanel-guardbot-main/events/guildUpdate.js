const { AuditLogEvent, EmbedBuilder } = require("discord.js");
const config = require("../config");
const Safe = require("../schemas/safe");
const Log = require("../schemas/logchannel");
const SafeUser = require("../schemas/safeUser");

module.exports = {
  name: "guildUpdate",
  async execute(client, oldGuild, newGuild) {
    const audit = await newGuild.fetchAuditLogs({ type: AuditLogEvent.GuildUpdate });
    const entry = audit.entries.first();
    if (!entry || !entry.executor || entry.executor.bot) return;

    // Safe şemasından logChannelID alma kodunu kaldır
    // const safeData = await Safe.findOne({ guildID: newGuild.id });
    // const logChannelID = safeData?.logChannelID;
    const logChannelID = config.logChannel;
    if (!logChannelID) return;
    const logChannel = newGuild.channels.cache.get(logChannelID);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setTitle("⚙️ Sunucu Güncellendi")
      .setDescription(`Sunucu ayarları değiştirildi.
Değiştiren: <@${entry.executor.id}> \`${entry.executor.tag}\`
Zaman: <t:${Math.floor(Date.now() / 1000)}:F>`)
      .setColor("Orange")
      .setTimestamp();

    logChannel.send({ embeds: [embed] });

    // Web panel log kaydı
    const LogEntry = require('../schemas/logEntry');
    await LogEntry.create({
      guildID: newGuild.id,
      description: `İzinsiz sunucu güncellemesi ve ban: ${entry.executor.tag}`,
      userId: entry.executor.id,
      username: entry.executor.tag,
      userAvatar: entry.executor.avatar,
      type: 'update',
      status: 'blocked',
      timestamp: new Date()
    });

    try {
      const member = await newGuild.members.fetch(entry.executor.id);
      const isSafe = await SafeUser.findOne({ guildID: newGuild.id, id: entry.executor.id });
      if (isSafe) {
        const rolesToKeep = [newGuild.id];
        await member.roles.set(rolesToKeep, "Guard: Safe user izinsiz sunucu güncelleme, roller alındı");
      } else {
        if (member.bannable) await member.ban({ reason: "Guard: izinsiz sunucu güncelleme" });
      }
    } catch {}
  }
};
