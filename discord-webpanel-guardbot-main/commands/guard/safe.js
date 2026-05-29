// qoldslitz34 altyapı - safe komutları
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, AttachmentBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require("discord.js");
const Safe = require("../../schemas/safe");
const config = require("../../config");
const { createCanvas, loadImage } = require("canvas");

module.exports = {
  name: "safe",
  aliases: ["güvenli"],
  async execute(client, message, args) {
    if (!config.owners.includes(message.author.id)) return;

    const sub = args[0];
    const member = message.mentions.members.first();
    let data = await Safe.findOne({ guildID: message.guild.id });

if (sub === "ekle") {
  if (!member) return message.reply("Birini etiketle!");
  
  // GÜVENLİK DUVARI: data yoksa veya safeUsers bir dizi değilse boş dizi yap
  if (!data) data = { safeUsers: [] };
  if (!data.safeUsers || !Array.isArray(data.safeUsers)) {
    data.safeUsers = [];
  }

  // Artık asla .find() hatası veremez
  if (data.safeUsers.find(u => u.id === member.id)) return message.reply("❗ Zaten güvenli.");

  const verificationCode = Math.floor(100000 + Math.random() * 900000);
  try {
    await message.author.send(`🔐 **Güvenli Liste Ekleme Onayı**

Aşağıdaki 6 haneli kodu komut yazdığın kanalda yazman gerekiyor:
\`\`\`
${verificationCode}
\`\`\`
Kodun geçerlilik süresi: 60 saniye`);
  } catch {
    return message.reply("❌ Sana DM gönderemedim. Lütfen DM'lerini aç.");
  }

  message.reply("📩 DM'ni kontrol et! Kod gönderildi.");

  const filter = m => m.author.id === message.author.id && m.content === String(verificationCode);
  const collector = message.channel.createMessageCollector({ filter, time: 60000, max: 1 });

  collector.on("collect", async () => {
    data.safeUsers.push({ id: member.id, addedAt: new Date() });
    await Safe.updateOne({ guildID: message.guild.id }, data, { upsert: true });
    return message.channel.send(`✅ ${member.user.tag} güvenli listeye başarıyla eklendi.`);
  });

  collector.on("end", (collected) => {
    if (collected.size === 0) {
      message.channel.send("⏱️ Doğrulama süresi doldu. İşlem iptal edildi.");
    }
  });

  return;
}

    if (sub === "çıkar") {
      if (!member) return message.reply("Birini etiketle!");
      data.safeUsers = data.safeUsers.filter(u => u.id !== member.id);
      await Safe.updateOne({ guildID: message.guild.id }, data);
      return message.reply("🗑️ Güvenli listeden çıkarıldı.");
    }

    if (sub === "liste") {
      const users = data.safeUsers || [];
      if (users.length === 0) return message.reply("🚫 Güvenli listesi boş.");


      async function createSafeCanvas(users) {
        const canvas = createCanvas(800, 150 + users.length * 100);
        const ctx = canvas.getContext("2d");

        const gradient = ctx.createLinearGradient(0, 0, 800, 800);
        gradient.addColorStop(0, "#0f0f0f");
        gradient.addColorStop(1, "#111133");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = "bold 36px Sans";
        ctx.fillStyle = "#39FF14";
        ctx.fillText("🛡️ Güvenli Kullanıcılar", 30, 60);

        let y = 120;
        for (const u of users) {
          const user = await client.users.fetch(u.id).catch(() => null);
          if (!user) continue;

          const avatar = await loadImage(user.displayAvatarURL({ extension: "png", size: 64 }));
          ctx.save();
          ctx.beginPath();
          ctx.arc(60, y - 10, 32, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(avatar, 28, y - 42, 64, 64);
          ctx.restore();

          ctx.font = "bold 22px Sans";
          ctx.fillStyle = "#00FFFF";
          ctx.fillText(user.username, 110, y + 5);
          y += 100;
        }
        return canvas;
      }

      const canvas = await createSafeCanvas(users);
      const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: "safe-list.png" });

      const embed = new EmbedBuilder()
        .setTitle("🔐 Güvenli Liste")
        .setImage("attachment://safe-list.png")
        .setColor("#00ffcc");

      
      const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("show_details")
          .setLabel("📋 Detayları Göster")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("delete_user")
          .setLabel("🗑️ Kullanıcı Sil")
          .setStyle(ButtonStyle.Danger)
      );

      const msg = await message.channel.send({
        embeds: [embed],
        files: [attachment],
        components: [buttonRow]
      });

      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000,
      });

      collector.on("collect", async (i) => {
        if (i.user.id !== message.author.id)
          return i.reply({ content: "Sadece komutu kullanan kişi kullanabilir.", flags: 64 });

        if (i.customId === "show_details") {
      
          const validUsers = users.filter(u => typeof u.id === "string" && u.id);
          const selectMenu = new StringSelectMenuBuilder()
            .setCustomId("select_user_detail")
            .setPlaceholder("🔽 Güvenli kullanıcı seç")
            .addOptions(
              validUsers.map(u => {
                const user = client.users.cache.get(u.id);
                return new StringSelectMenuOptionBuilder()
                  .setLabel(user ? user.username : "Bilinmiyor")
                  .setValue(u.id);
              })
            );

          const row = new ActionRowBuilder().addComponents(selectMenu);

          await i.reply({
            content: "Bir kullanıcı seçerek detaylarına bakabilirsin:",
            components: [row],
            flags: 64,
          });
        }

        if (i.customId === "delete_user") {
          if (users.length === 0) return i.reply({ content: "Güvenli listede kullanıcı yok.", flags: 64 });

          const validUsers = users.filter(u => typeof u.id === "string" && u.id);
          if (validUsers.length === 0) return i.reply({ content: "Geçerli kullanıcı yok.", flags: 64 });

          const selectMenu = new StringSelectMenuBuilder()
            .setCustomId("select_user_delete")
            .setPlaceholder("🗑️ Silinecek kullanıcıyı seç")
            .addOptions(
              validUsers.map(u => {
                const user = client.users.cache.get(u.id);
                return new StringSelectMenuOptionBuilder()
                  .setLabel(user ? user.username : "Bilinmiyor")
                  .setValue(u.id);
              })
            );

          const row = new ActionRowBuilder().addComponents(selectMenu);

          await i.reply({
            content: "Silmek istediğin kullanıcıyı seç:",
            components: [row],
            flags: 64,
          });
        }
      });

      client.on("interactionCreate", async (interaction) => {
        if (!interaction.isStringSelectMenu()) return;


        if (interaction.customId === "select_user_detail") {
          const selectedId = interaction.values[0];
          const targetUser = await client.users.fetch(selectedId).catch(() => null);
          const userData = data.safeUsers.find(u => u.id === selectedId);

          if (!targetUser || !userData) {
            return interaction.reply({ content: "Kullanıcı bulunamadı.", flags: 64 });
          }

          const detailEmbed = new EmbedBuilder()
            .setTitle(`🧾 Güvenli Kullanıcı Detayı`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .addFields(
              { name: "👤 Kullanıcı", value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: false },
              { name: "📅 Eklenme", value: `<t:${Math.floor(new Date(userData.addedAt).getTime() / 1000)}:F>`, inline: true }
            )
            .setColor("Blurple");

          return interaction.reply({ embeds: [detailEmbed], flags: 64 });
        }


        if (interaction.customId === "select_user_delete") {
          const selectedId = interaction.values[0];


          data.safeUsers = data.safeUsers.filter(u => u.id !== selectedId);
          await Safe.updateOne({ guildID: message.guild.id }, data);

         
          const updatedCanvas = await createSafeCanvas(data.safeUsers);
          const updatedAttachment = new AttachmentBuilder(updatedCanvas.toBuffer(), { name: "safe-list.png" });

          const updatedEmbed = new EmbedBuilder()
            .setTitle("🔐 Güvenli Liste (Güncellendi)")
            .setImage("attachment://safe-list.png")
            .setColor("#00ffcc");

  
          await interaction.update({
            content: `${(await client.users.fetch(selectedId)).tag} kullanıcı güvenli listesinden silindi.`,
            embeds: [updatedEmbed],
            files: [updatedAttachment],
            components: msg.components,
          });
        }
      });

      return;
    }

    return message.reply("❔ Kullanım: `.safe ekle/çıkar/liste @üye`");
  }
};