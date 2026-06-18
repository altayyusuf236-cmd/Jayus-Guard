const config = require('../config');
const SafeUser = require("../schemas/safeUser");

module.exports = {
  name: "webhookUpdate",
  async execute(client, channel) {
    const audit = await channel.guild.fetchAuditLogs({ type: AuditLogEvent.WebhookUpdate });
    const entry = audit.entries.first();
    if (!entry || !entry.executor || entry.executor.bot) return;

    // Safe şemasından logChannelID alma kodunu kaldır
    // const safeData = await Safe.findOne({ guildID: channel.guild.id });
    // const logChannelID = safeData?.logChannelID;
    const logChannelID = config.logChannel;
    if (!logChannelID) return;
    const logChannel = channel.guild.channels.cache.get(logChannelID);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setTitle("🛠️ Webhook Güncellemesi")
      .setDescription(`Bir webhook oluşturuldu veya değiştirildi.
Kanal: <#${channel.id}>
Yapan: <@${entry.executor.id}>`)
      .setColor("Purple")
      .setTimestamp();

    logChannel.send({ embeds: [embed] });

    // Web panel log kaydı
    const LogEntry = require('../schemas/logEntry');
    await LogEntry.create({
      guildID: channel.guild.id,
      description: `Webhook güncellendi: Kanal #${channel.name}`,
      userId: entry.executor.id,
      username: entry.executor.tag,
      userAvatar: entry.executor.avatar,
      type: 'update',
      status: 'allowed',
      timestamp: new Date()
    });

    try {
      const member = await channel.guild.members.fetch(entry.executor.id);
      const isSafe = await SafeUser.findOne({ guildID: channel.guild.id, id: entry.executor.id });
      if (isSafe) {
        const rolesToKeep = [channel.guild.id];
        await member.roles.set(rolesToKeep, "Guard: Safe user izinsiz webhook güncelleme, roller alındı");
      } else {
        if (member.bannable) await member.ban({ reason: "Guard: izinsiz webhook güncelleme" });
      }
    } catch {}
  }
};
