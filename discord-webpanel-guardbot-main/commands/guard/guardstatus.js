const { EmbedBuilder } = require('discord.js');
const Safe = require('../../schemas/safe');
const Log = require('../../schemas/logchannel');
const config = require("../../config");

module.exports = {
  name: "guardstatus",
  description: "Sunucu güvenlik durumu ve guard özet raporu.",
  aliases: ["güvenlikraporu", "guardraporu"],

  async execute(client, message, args) {
    if (!config.owners.includes(message.author.id))
      return message.reply("🚫 Bu komutu sadece bot sahibi kullanabilir.");

    const data = await Safe.findOne({ guildID: message.guild.id }) || {};
    const logData = await Log.findOne({ guildID: message.guild.id }) || {};
    const guild = message.guild;
    const bot = client.user;

    // Modern özet panel için bilgiler
    const guardDurum = data.guardEnabled ? "🟢 Aktif" : "🔴 Pasif";
    const logKanal = logData?.channelID ? `<#${logData.channelID}>` : "❌ Ayarlanmamış";
    const safeCount = data.safeUsers ? data.safeUsers.length : 0;
    const bannedCount = data.bannedCount || 0;
    const uptime = Math.floor(client.uptime / 1000);
    const upH = Math.floor(uptime / 3600);
    const upM = Math.floor((uptime % 3600) / 60);
    const upS = uptime % 60;
    const ping = Math.round(client.ws.ping);

    // Aktif korumalar
    const korumaMap = {
      channelCreate: '➕ Kanal Oluşturma',
      channelDelete: '➖ Kanal Silme',
      channelUpdate: '🔄 Kanal Düzenleme',
      roleCreate: '🎭 Rol Oluşturma',
      roleDelete: '❌ Rol Silme',
      roleUpdate: '📝 Rol Düzenleme',
      guildUpdate: '⚙️ Sunucu Düzenleme',
      banAdd: '🔨 Ban',
      memberRemove: '👢 Üye Çıkarma',
      emojiCreate: '🌈 Emoji Oluşturma',
      emojiDelete: '💢 Emoji Silme',
      stickerProtection: '🏷️ Sticker',
    };
    const aktifler = Object.entries(korumaMap)
      .filter(([k]) => data[k])
      .map(([, v]) => v);

    const embed = new EmbedBuilder()
      .setTitle('🛡️ Sunucu Güvenlik Durumu')
      .setColor(data.guardEnabled ? '#43b581' : '#f04747')
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .setDescription(`
> **Sunucu:** ${guild.name}  
> **Bot:** <@${bot.id}>  
> **Durum:** ${guardDurum}
      `)
      .addFields(
        { name: '🔒 Aktif Korumalar', value: aktifler.length ? aktifler.map(a => `• ${a}`).join('\n') : 'Yok', inline: false },
        { name: '👤 Safe Kullanıcılar', value: `${safeCount} kişi`, inline: true },
        { name: '📜 Log Kanalı', value: logKanal, inline: true },
        { name: '⏱️ Uptime', value: `${upH}sa ${upM}dk ${upS}sn`, inline: true },
        { name: '🏓 Ping', value: `${ping} ms`, inline: true },
        { name: '🚫 Engellenen İşlem', value: `${bannedCount} işlem`, inline: true }
      )
      .setFooter({ text: 'onur - yeni nesil guard status', iconURL: bot.displayAvatarURL() })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};