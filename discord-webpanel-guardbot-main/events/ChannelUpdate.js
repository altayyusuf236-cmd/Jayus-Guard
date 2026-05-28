const { AuditLogEvent, EmbedBuilder } = require("discord.js");
const config = require("../config");
const Safe = require("../schemas/safe");
const SafeUser = require("../schemas/safeUser");
const Log = require("../schemas/logchannel");

module.exports = {
  name: "channelUpdate",
  async execute(client, oldChannel, newChannel) {
    const audit = await newChannel.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelUpdate });
    const entry = audit.entries.first();

    if (!entry?.executor || entry.executor.bot) return;

    try {
      const member = await newChannel.guild.members.fetch(entry.executor.id);
      const isSafe = await SafeUser.findOne({ guildID: newChannel.guild.id, id: entry.executor.id });
      if (isSafe) {
        const rolesToKeep = [newChannel.guild.id];
        await member.roles.set(rolesToKeep, "Guard: Safe user izinsiz kanal güncelleme, roller alındı");
      } else {
        if (member.bannable) await member.ban({ reason: "Guard: izinsiz kanal güncelleme" });
      }
    } catch {}

    // LOG KANALI ARTIK SAFE'DEN
    // Safe şemasından logChannelID alma kodunu kaldır
    // const safeData = await Safe.findOne({ guildID: newChannel.guild.id });
    // const logChannelID = safeData?.logChannelID;
    const logChannelID = config.logChannel;
    if (!logChannelID) return;
    const logChannel = newChannel.guild.channels.cache.get(logChannelID);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setTitle("🚨 Kanal Güncellendi")
      .setDescription(`
İzinsiz kanal güncellemesi yapıldı ve kullanıcı banlandı.

Kanal: \`${oldChannel.name}\`
Yapan: <@${entry.executor.id}> \`${entry.executor.tag}\`
      `)
      .setColor("Red")
      .setTimestamp();

    logChannel.send({ embeds: [embed] });

    // Web panel log kaydı
    const LogEntry = require('../schemas/logEntry');
    await LogEntry.create({
      guildID: newChannel.guild.id,
      description: `İzinsiz kanal güncellemesi ve ban: ${oldChannel.name} → ${newChannel.name}`,
      userId: entry.executor.id,
      username: entry.executor.tag,
      userAvatar: entry.executor.avatar,
      type: 'update',
      status: 'blocked',
      timestamp: new Date()
    });
  }
};
