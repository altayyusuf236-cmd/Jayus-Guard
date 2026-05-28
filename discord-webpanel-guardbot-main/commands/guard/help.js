const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: "help",
  description: "Tüm bot komutlarını modern ve detaylı şekilde gösterir.",
  async execute(client, message) {
    const commands = [
      {
        emoji: '🛠️',
        name: '.setup',
        desc: 'Adım adım, rehberli ve modern kurulum sihirbazı',
        example: '.setup'
      },
      {
        emoji: '🛡️',
        name: '.safe ekle/çıkar/liste @üye',
        desc: 'Güvenli kullanıcı ekle, çıkar veya listele',
        example: '.safe ekle @qoldslitz34'
      },
      {
        emoji: '🧬',
        name: '.system',
        desc: 'Gelişmiş guard sistem paneli (select menü ile)',
        example: '.system'
      },
      {
        emoji: '🛡️',
        name: '.guardpanel',
        desc: 'Butonlu guard yönetim paneli',
        example: '.guardpanel'
      },
      {
        emoji: '📊',
        name: '.guardstatus',
        desc: 'Sunucu güvenlik durumu ve guard özet raporu',
        example: '.guardstatus'
      },
      {
        emoji: '🌐',
        name: '.webpanel',
        desc: 'Web panel linkini gösterir',
        example: '.webpanel'
      },
      {
        emoji: '❓',
        name: '.help',
        desc: 'Tüm komutları ve açıklamalarını gösterir',
        example: '.help'
      }
    ];

    const embed = new EmbedBuilder()
      .setTitle('✨ Komut Listesi & Yardım Paneli')
      .setDescription('Aşağıda botun tüm komutlarını ve açıklamalarını bulabilirsin. Her komut yeni nesil, hızlı ve stabil çalışır!')
      .setColor('#00e1ff')
      .setThumbnail('https://cdn.discordapp.com/icons/833656201623109712/7e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e.webp?size=256')
      .setFooter({ text: 'onur - modern guard bot', iconURL: 'https://cdn.discordapp.com/avatars/833656201623109712/7e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e.webp?size=128' })
      .setTimestamp();

    for (const cmd of commands) {
      embed.addFields({
        name: `${cmd.emoji}  ${cmd.name}`,
        value: `> ${cmd.desc}\n\`Örnek: ${cmd.example}\``,
        inline: false
      });
    }

    embed.addFields({
      name: '💡 Ekstra Bilgi',
      value: '• Tüm komutlar slashsız (nokta ile) çalışır.\n• Detaylı kurulum için `.setup` kullanın.\n• Web panelde daha fazla ayar ve log görüntüleyebilirsiniz.',
      inline: false
    });

    await message.reply({ embeds: [embed] });
  }
};