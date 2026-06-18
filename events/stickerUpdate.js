const SafeUser = require("../schemas/safeUser");

module.exports = {
  name: "stickerUpdate",
  async execute(client, oldSticker, newSticker) {
    const audit = await newSticker.guild.fetchAuditLogs({ type: AuditLogEvent.StickerUpdate });
    const entry = audit.entries.first();
    if (!entry || !entry.executor || entry.executor.bot) return;

    try {
      const member = await newSticker.guild.members.fetch(entry.executor.id);
      const isSafe = await SafeUser.findOne({ guildID: newSticker.guild.id, id: entry.executor.id });
      if (isSafe) {
        const rolesToKeep = [newSticker.guild.id];
        await member.roles.set(rolesToKeep, "Guard: Safe user izinsiz sticker güncelleme, roller alındı");
      } else {
        if (member.bannable) await member.ban({ reason: "Guard: izinsiz sticker güncelleme" });
      }
    } catch {}

    const logData = await Log.findOne({ guildID: newSticker.guild.id });
    if (!logData) return;
    const logChannel = client.channels.cache.get(logData.channelID);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setTitle("✏️ Sticker Güncellendi")
      .setDescription(`Sticker: \`${oldSticker.name}\` ➜ \`${newSticker.name}\`
Yapan: <@${entry.executor.id}>`)
      .setColor("Orange")
      .setTimestamp();

    logChannel.send({ embeds: [embed] });
  }
};
