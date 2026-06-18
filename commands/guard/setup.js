const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const Safe = require('../../schemas/safe');
const Log = require('../../schemas/logchannel');

module.exports = {
  name: 'setup',
  description: 'Botun ilk kurulumunu başlatır. Adım adım, rehberli ve modern şekilde ayarları yapar.',
  async execute(client, message, args) {
    if (!message.member.permissions.has('Administrator'))
      return message.reply('🚫 Bu komutu sadece sunucu yöneticileri kullanabilir.');

    const filter = i => i.user.id === message.author.id;
    let logChannelId = null;
    let safeIds = [];
    let guardEnabled = false;
    let guardSettings = {
      channelCreate: false,
      channelDelete: false,
      channelUpdate: false,
      roleCreate: false,
      roleDelete: false,
      roleUpdate: false,
      guildUpdate: false,
      banAdd: false,
      memberRemove: false,
      emojiCreate: false,
      emojiDelete: false,
      stickerProtection: false
    };
    const guardOrder = [
      { key: 'channelCreate', label: 'Kanal Oluşturma Koruması', emoji: '➕' },
      { key: 'channelDelete', label: 'Kanal Silme Koruması', emoji: '➖' },
      { key: 'channelUpdate', label: 'Kanal Düzenleme Koruması', emoji: '🔄' },
      { key: 'roleCreate', label: 'Rol Oluşturma Koruması', emoji: '🎭' },
      { key: 'roleDelete', label: 'Rol Silme Koruması', emoji: '❌' },
      { key: 'roleUpdate', label: 'Rol Düzenleme Koruması', emoji: '📝' },
      { key: 'guildUpdate', label: 'Sunucu Düzenleme Koruması', emoji: '⚙️' },
      { key: 'banAdd', label: 'Ban Koruması', emoji: '🔨' },
      { key: 'memberRemove', label: 'Üye Çıkarma Koruması', emoji: '👢' },
      { key: 'emojiCreate', label: 'Emoji Oluşturma Koruması', emoji: '🌈' },
      { key: 'emojiDelete', label: 'Emoji Silme Koruması', emoji: '💢' },
      { key: 'stickerProtection', label: 'Sticker Koruması', emoji: '🏷️' }
    ];

    // 1. Log kanalı seçimi
    const textChannels = message.guild.channels.cache.filter(c => c.type === ChannelType.GuildText);
    const logSelect = new StringSelectMenuBuilder()
      .setCustomId('log_channel')
      .setPlaceholder('Bir log kanalı seçin...')
      .addOptions(textChannels.first(25).map(c => ({ label: c.name, value: c.id })));
    const logRow = new ActionRowBuilder().addComponents(logSelect);
    const logMsg = await message.reply({
      embeds: [new EmbedBuilder().setTitle('1️⃣ Log Kanalı').setDescription('Lütfen log kanalı olarak kullanılacak metin kanalını seçin.').setColor('#5865f2')],
      components: [logRow]
    });
    const logInt = await logMsg.awaitMessageComponent({ filter, time: 60000 });
    logChannelId = logInt.values[0];
    await logInt.update({ content: `Log kanalı seçildi: <#${logChannelId}>`, embeds: [], components: [] });
    await Log.updateOne(
      { guildID: message.guild.id },
      { channelID: logChannelId },
      { upsert: true }
    );

    // 2. Safe user seçimi (çoklu select menü)
    const members = await message.guild.members.fetch();
    const safeSelect = new StringSelectMenuBuilder()
      .setCustomId('safe_users')
      .setPlaceholder('Güvenli kullanıcı(lar)ı seçin...')
      .setMinValues(1)
      .setMaxValues(Math.min(25, members.size))
      .addOptions(members.first(25).map(m => ({ label: m.user.tag, value: m.id })));
    const safeRow = new ActionRowBuilder().addComponents(safeSelect);
    const safeMsg = await message.channel.send({
      embeds: [new EmbedBuilder().setTitle('2️⃣ Güvenli Kullanıcılar').setDescription('Lütfen safe listeye eklenecek kullanıcı(lar)ı seçin.').setColor('#43b581')],
      components: [safeRow]
    });
    const safeInt = await safeMsg.awaitMessageComponent({ filter, time: 60000 });
    safeIds = safeInt.values;
    await safeInt.update({ content: `Safe kullanıcılar seçildi: ${safeIds.map(id => `<@${id}>`).join(', ')}`, embeds: [], components: [] });
    await Safe.updateOne(
      { guildID: message.guild.id },
      { $set: { safeUsers: safeIds.map(id => ({ id, addedAt: new Date() })) } },
      { upsert: true }
    );

    // 3. Guard anahtarı (aktif/pasif)
    const guardSelect = new StringSelectMenuBuilder()
      .setCustomId('guard_enabled')
      .setPlaceholder('Guard sistemi aktif/pasif')
      .addOptions([
        { label: 'Aktif', value: 'true', emoji: '🟢' },
        { label: 'Pasif', value: 'false', emoji: '🔴' }
      ]);
    const guardRow = new ActionRowBuilder().addComponents(guardSelect);
    const guardMsg = await message.channel.send({
      embeds: [new EmbedBuilder().setTitle('3️⃣ Guard Sistemi').setDescription('Guard sistemi aktif/pasif olarak ayarlayın.').setColor('#faa61a')],
      components: [guardRow]
    });
    const guardInt = await guardMsg.awaitMessageComponent({ filter, time: 60000 });
    guardEnabled = guardInt.values[0] === 'true';
    await guardInt.update({ content: `Guard sistemi: ${guardEnabled ? '🟢 Aktif' : '🔴 Pasif'}`, embeds: [], components: [] });
    await Safe.updateOne(
      { guildID: message.guild.id },
      { $set: { guardEnabled } },
      { upsert: true }
    );

    // 4. Guard detay ayarları (her biri için tek tek evet/hayır)
    for (const item of guardOrder) {
      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('guard_' + item.key)
          .setPlaceholder(`${item.emoji} ${item.label} aktif olsun mu?`)
          .addOptions([
            { label: 'Evet (Açık)', value: 'true', emoji: '🟩' },
            { label: 'Hayır (Kapalı)', value: 'false', emoji: '🟥' }
          ])
      );
      const msg = await message.channel.send({
        embeds: [new EmbedBuilder().setTitle(`🔒 ${item.label}`).setDescription(`${item.emoji} ${item.label} aktif/pasif olarak ayarlayın.`).setColor('#ffb300')],
        components: [row]
      });
      const int = await msg.awaitMessageComponent({ filter, time: 60000 });
      guardSettings[item.key] = int.values[0] === 'true';
      await int.update({ content: `${item.emoji} ${item.label}: ${guardSettings[item.key] ? '🟩 Açık' : '🟥 Kapalı'}`, embeds: [], components: [] });
      await Safe.updateOne(
        { guildID: message.guild.id },
        { $set: { [item.key]: guardSettings[item.key] } },
        { upsert: true }
    );
    }

    // Sonuç embed
    const embed = new EmbedBuilder()
      .setTitle('✅ Kurulum Tamamlandı')
      .setDescription(
        'Botun tüm ayarları başarıyla yapıldı!\n\n' +
        `- Log Kanalı: <#${logChannelId}>\n` +
        `- Safe User: ${safeIds.length ? safeIds.map(id => `<@${id}>`).join(', ') : 'Yok'}\n` +
        `- Guard: ${guardEnabled ? 'Aktif' : 'Pasif'}\n` +
        `- Açık Korumalar: ${guardOrder.filter(o=>guardSettings[o.key]).map(o=>o.label).join(', ') || 'Yok'}`
      )
      .setColor('Green')
      .setFooter({ text: 'qoldslitz34 - setup' })
      .setTimestamp();
    await message.channel.send({ embeds: [embed] });
    await message.channel.send('Bot yeniden başlatılıyor...');
    setTimeout(() => process.exit(0), 2000);
  }
};