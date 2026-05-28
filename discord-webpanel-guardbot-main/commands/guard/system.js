const { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require("discord.js");
const conf = require("../../config");
const Safe = require("../../schemas/safe");

module.exports = {
  name: "sistem",
  aliases: ["sistem"],
  execute: async (client, message) => {
    // ADMINISTRATOR yetkisi ve safelist kontrolü
    if (!conf.owners.includes(message.author.id)) {
      return message.reply({ content: '❌ Bu komutu sadece bot sahipleri kullanabilir.', ephemeral: true });
    }

    let data = await Safe.findOne({ guildID: message.guild.id });
    if (!data) data = await Safe.create({ guildID: message.guild.id });

    const emojiMap = {
      channelCreate: '➕',
      channelDelete: '➖',
      channelUpdate: '🔄', // DÜZELTİLDİ
      roleCreate: '🎭',
      roleDelete: '❌',
      roleUpdate: '📝',
      guildUpdate: '⚙️',
      banAdd: '🔨',
      memberRemove: '👢',
      emojiCreate: '🌈',
      emojiDelete: '💢',
      stickerProtection: '🏷️',
    };
    const labelMap = {
      channelCreate: 'Kanal Oluşturma Koruması',
      channelDelete: 'Kanal Silme Koruması',
      channelUpdate: 'Kanal Düzenleme Koruması',
      roleCreate: 'Rol Oluşturma Koruması',
      roleDelete: 'Rol Silme Koruması',
      roleUpdate: 'Rol Düzenleme Koruması',
      guildUpdate: 'Sunucu Düzenleme Koruması',
      banAdd: 'Ban Koruması',
      memberRemove: 'Üye Çıkarma Koruması',
      emojiCreate: 'Emoji Oluşturma Koruması',
      emojiDelete: 'Emoji Silme Koruması',
      stickerProtection: 'Sticker Koruması',
    };

    const allKeys = Object.keys(labelMap);

    // Safe user listesini hazırla
    const embed = new EmbedBuilder()
      .setTitle('🧬 Gelişmiş Guard Sistem Paneli')
      .setDescription(
        `Aşağıdan bir koruma türü seçip aktif/pasif yapabilirsin.\n\n` +
        allKeys.map(key => `${emojiMap[key]} **${labelMap[key]}:** ${data[key] ? '🟩 Açık' : '🟥 Kapalı'}`).join('\n')
      )
      .setColor('#ffb300')
      .setFooter({ text: 'onur - yeni sistem' })
      .setTimestamp();

    const select = new StringSelectMenuBuilder()
      .setCustomId('guard_select')
      .setPlaceholder('Bir koruma türü seçin...')
      .addOptions([
        ...allKeys.map(key => ({ label: labelMap[key], value: key, emoji: emojiMap[key] })),
        { label: 'Yenile', value: 'refresh', emoji: '🔄' },
      ]);

    const row = new ActionRowBuilder().addComponents(select);
    const msg = await message.reply({ embeds: [embed], components: [row] });

    const collector = msg.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 60000 });
    collector.on('collect', async (i) => {
      await i.deferUpdate();
      if (i.values[0] === 'refresh') {
        embed.setDescription(
          `Aşağıdan bir koruma türü seçip aktif/pasif yapabilirsin.\n\n` +
          allKeys.map(key => `${emojiMap[key]} **${labelMap[key]}:** ${data[key] ? '🟩 Açık' : '🟥 Kapalı'}`).join('\n')
        );
        await msg.edit({ embeds: [embed], components: [row] });
        return;
      }
      const key = i.values[0];
      data[key] = !data[key];
      await data.save();
      embed.setDescription(
        `Aşağıdan bir koruma türü seçip aktif/pasif yapabilirsin.\n\n` +
        allKeys.map(key => `${emojiMap[key]} **${labelMap[key]}:** ${data[key] ? '🟩 Açık' : '🟥 Kapalı'}`).join('\n')
      );
      await msg.edit({ embeds: [embed], components: [row] });

      // LOG: Her işlem loglansın
      const logEmbed = new EmbedBuilder()
        .setTitle('🛡️ Guard Ayarı Değiştirildi')
        .setDescription(`Kullanıcı: <@${i.user.id}> (${i.user.tag})\nAyar: **${labelMap[key]}**\nYeni Durum: ${data[key] ? '🟩 Açık' : '🟥 Kapalı'}\nSunucu: ${message.guild.name} (${message.guild.id})`)
        .setColor(data[key] ? 0x43b581 : 0xf04747)
        .setTimestamp();
      // Log kanalına gönder
      const safeData = await Safe.findOne({ guildID: message.guild.id });
      const logChannelID = safeData?.logChannelID;
      if (logChannelID) {
        const logChannel = message.guild.channels.cache.get(logChannelID);
        if (logChannel) {
          await logChannel.send({ embeds: [logEmbed] });
        }
      }
      // Web panel log kaydı
      const LogEntry = require('../../schemas/logEntry');
      await LogEntry.create({
        guildID: message.guild.id,
        description: `Guard ayarı değiştirildi: ${labelMap[key]} → ${data[key] ? 'Açık' : 'Kapalı'} (Kullanıcı: ${i.user.tag})`,
        userId: i.user.id,
        username: i.user.tag,
        userAvatar: i.user.avatar,
        type: 'update',
        status: 'allowed',
        timestamp: new Date()
      });

      // OWNER DEĞİLSE TÜM ÜSTTEKİ ROLLERİ AL
      if (!conf.owners.includes(i.user.id)) {
        const member = await message.guild.members.fetch(i.user.id).catch(() => null);
        if (member) {
          // En yüksek rol hariç tüm rolleri al
          const rolesToRemove = member.roles.cache
            .filter(r => r.id !== message.guild.roles.highest.id && r.editable)
            .map(r => r.id);
          if (rolesToRemove.length > 0) {
            await member.roles.remove(rolesToRemove, 'Guard panelde izinsiz işlem');
            await i.followUp({ content: '❗ İzinsiz işlem yaptığın için üstteki rollerin alındı.', ephemeral: true });
          }
        }
      }
      await i.followUp({ content: `${emojiMap[key]} ${labelMap[key]} artık: ${data[key] ? '🟩 Açık' : '🟥 Kapalı'}`, ephemeral: true });
    });
  }
}; 