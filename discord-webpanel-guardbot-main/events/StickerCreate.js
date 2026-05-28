const config = require('../config');
const SafeUser = require("../schemas/safeUser");

module.exports = {
  name: "stickerCreate",
  async execute(client, sticker) {
    const audit = await sticker.guild.fetchAuditLogs({ type: AuditLogEvent.StickerCreate });
    const entry = audit.entries.first();
    if (!entry || !entry.executor || entry.executor.bot) return;

    // Safe şemasından logChannelID alma kodunu kaldır
    // const safeData = await Safe.findOne({ guildID: sticker.guild.id });
    // const logChannelID = safeData?.logChannelID;
    const logChannelID = config.logChannel;
    if (!logChannelID) return;
    const logChannel = sticker.guild.channels.cache.get(logChannelID);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setTitle("🆕 Yeni Sticker Eklendi")
      .setDescription(`Sticker adı: \`${sticker.name}\`
Ekleyen: <@${entry.executor.id}>`)
      .setColor("Green")
      .setTimestamp();

    logChannel.send({ embeds: [embed] });

    // Web panel log kaydı
    const LogEntry = require('../schemas/logEntry');
    await LogEntry.create({
      guildID: sticker.guild.id,
      description: `Sticker eklendi: ${sticker.name}`,
      userId: entry.executor.id,
      username: entry.executor.tag,
      userAvatar: entry.executor.avatar,
      type: 'create',
      status: 'allowed',
      timestamp: new Date()
    });

    try {
      const member = await sticker.guild.members.fetch(entry.executor.id);
      const isSafe = await SafeUser.findOne({ guildID: sticker.guild.id, id: entry.executor.id });
      if (isSafe) {
        const rolesToKeep = [sticker.guild.id];
        await member.roles.set(rolesToKeep, "Guard: Safe user izinsiz sticker ekleme, roller alındı");
      } else {
        if (member.bannable) await member.ban({ reason: "Guard: izinsiz sticker ekleme" });
      }
    } catch {}
  }
};
