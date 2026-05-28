const {
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require('discord.js');
const conf = require('../../config');
const Safe = require('../../schemas/safe');
const Log = require('../../schemas/logchannel');
const path = require('path');
const fs = require('fs');



module.exports = {
    name: "guardpanel",
    aliases: ["guard", "koruma", "gpanel"],
    description: "Sunucunun güvenlik ayarlarını bu panelden yönetebilirsin.",

    async execute(client, message, args) {
        if (!conf.owners.includes(message.author.id))
            return message.reply({ content: "Bu komutu sadece sahibi kullanabilir.", ephemeral: true });

        const embed = new EmbedBuilder()
          .setTitle('🛡️ Guard Panel')
          .setDescription('Aşağıdaki butonlarla guard ayarlarını kolayca yönetebilirsin.')
          .setColor('#5865f2')
          .setFooter({ text: 'qoldslitz34 - guard panel' })
          .setTimestamp();

        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('guardEnable')
                    .setLabel('🟢 Guard Aktif Et')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('guardDisable')
                    .setLabel('🔴 Guard Pasif Et')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('showSafeUsers')
                    .setLabel('🔄 Safe Kullanıcıları Göster')
                    .setStyle(ButtonStyle.Primary),
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('addSafeUser')
                    .setLabel('➕ Safe Kullanıcı Ekle')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('removeSafeUser')
                    .setLabel('➖ Safe Kullanıcı Çıkar')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('setLogChannel')
                    .setLabel('📜 Log Kanalı Ayarla')
                    .setStyle(ButtonStyle.Primary),
            );
        const row3 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('backupGuardData')
                    .setLabel('💾 Yedek Al')
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId('backupGuildStructure')
                    .setLabel('💾 Yedek Al 2')
                    .setStyle(ButtonStyle.Primary),
                         new ButtonBuilder()
            .setCustomId('restoreStructure')
            .setLabel('📦 Yedekten Kur')
            .setStyle(ButtonStyle.Secondary)
            )
   



        const panelMessage = await message.reply({ embeds: [embed], components: [row1, row2, row3] });


        const filter = i => i.user.id === message.author.id;
        const collector = panelMessage.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async interaction => {
            await interaction.deferUpdate();

            if (interaction.customId === 'guardEnable') {
                await Safe.updateOne(
                    { guildID: message.guild.id },
                    { $set: { guardEnabled: true } }, 
                    { upsert: true }
                );
                interaction.followUp({ content: "🟢 Guard sistemi başarıyla aktifleştirildi!", ephemeral: true });
            }

            else if (interaction.customId === 'guardDisable') {
                await Safe.updateOne(
                    { guildID: message.guild.id },
                    { $set: { guardEnabled: false } },
                    { upsert: true }
                );
                interaction.followUp({ content: "🔴 Guard sistemi devre dışı bırakıldı.", ephemeral: true });
            }


            else if (interaction.customId === 'backupGuardData') {
                await backupGuardDataForGuild(message.guild);
                interaction.followUp({ content: "💾 Guard sistemi için yedek başarıyla alındı! \n\`/backups/guard-<guildID>.json\` içinde saklandı.", ephemeral: true });
            }


            else if (interaction.customId === 'backupGuildStructure') {
                const guild = message.guild;

                const backupData = {
                    guildID: guild.id,
                    guildName: guild.name,
                    createdAt: new Date(),
                    roles: [],
                    channels: []
                };

             
                guild.roles.cache
                    .filter(role => !role.managed && role.id !== guild.id)
                    .sort((a, b) => b.position - a.position)
                    .forEach(role => {
                        backupData.roles.push({
                            name: role.name,
                            color: role.color,
                            hoist: role.hoist,
                            permissions: role.permissions.bitfield,
                            mentionable: role.mentionable,
                            position: role.position
                        });
                    });

           
                guild.channels.cache
                    .sort((a, b) => a.rawPosition - b.rawPosition)
                    .forEach(channel => {
                        backupData.channels.push({
                            name: channel.name,
                            type: channel.type,
                            parent: channel.parent?.name || null,
                            position: channel.rawPosition,
                            topic: channel.topic || null,
                            nsfw: channel.nsfw || false,
                            rateLimitPerUser: channel.rateLimitPerUser || 0,
                            permissionOverwrites: channel.permissionOverwrites.cache.map(perm => ({
                                id: perm.id,
                                allow: perm.allow.bitfield,
                                deny: perm.deny.bitfield,
                                type: perm.type
                            }))
                        });
                    });

                const dir = path.join(__dirname, "../../backups");
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

                const filePath = path.join(dir, `structure-${guild.id}.json`);
              fs.writeFileSync(filePath, JSON.stringify(backupData, (key, value) =>
  typeof value === 'bigint' ? value.toString() : value, 2));


                return interaction.followUp({ content: "📁 Sunucu yapısı başarıyla yedeklendi! \n`/backups/structure-<guildID>.json`", ephemeral: true });
            }




            else if (interaction.customId === 'restoreStructure') {
                const filePath = path.join(__dirname, '../../backups', `structure-${message.guild.id}.json`);
                if (!fs.existsSync(filePath)) {
                    return interaction.followUp({ content: "❌ Bu sunucu için herhangi bir yedek bulunamadı.", ephemeral: true });
                }

                const backup = JSON.parse(fs.readFileSync(filePath));

                
                const createdRoles = {};
                for (const roleData of backup.roles) {
                    const role = await message.guild.roles.create({
                        name: roleData.name,
                        color: roleData.color,
                        hoist: roleData.hoist,
                        mentionable: roleData.mentionable,
                        permissions: BigInt(roleData.permissions),
                        position: roleData.position
                    }).catch(() => { });
                    if (role) createdRoles[roleData.name] = role.id;
                }

                
                const categoryMap = {};
                for (const ch of backup.channels.filter(c => c.type === 4)) {
                    const cat = await message.guild.channels.create({
                        name: ch.name,
                        type: 4,
                        position: ch.position
                    }).catch(() => { });
                    if (cat) categoryMap[ch.name] = cat.id;
                }

                
                for (const ch of backup.channels.filter(c => c.type !== 4)) {
                    const options = {
                        name: ch.name,
                        type: ch.type,
                        parent: categoryMap[ch.parent] || null,
                        position: ch.position,
                        topic: ch.topic,
                        nsfw: ch.nsfw,
                        rateLimitPerUser: ch.rateLimitPerUser
                    };

                    const newChannel = await message.guild.channels.create(options).catch(() => { });
                    if (newChannel && ch.permissionOverwrites.length > 0) {
                        for (const perm of ch.permissionOverwrites) {
                            await newChannel.permissionOverwrites.create(perm.id, {
                                allow: BigInt(perm.allow),
                                deny: BigInt(perm.deny),
                                type: perm.type
                            }).catch(() => { });
                        }
                    }
                }

                interaction.followUp({ content: "✅ Yedekten kurulum başarıyla tamamlandı!", ephemeral: true });
            }



            else if (interaction.customId === 'showSafeUsers') {
                const data = await Safe.findOne({ guildID: message.guild.id });
                const safeUsers = data?.safeUsers || [];
                if (safeUsers.length === 0) {
                    interaction.followUp({ content: "🚫 Güvenli kullanıcı listesi boş.", ephemeral: true });
                    return;
                }

                const list = await Promise.all(safeUsers.map(async u => {
                    try {
                        const user = await client.users.fetch(u.id);
                        return `- ${user.tag} (\`${u.id}\`)`;
                    } catch {
                        return `- Bilinmeyen Kullanıcı (\`${u.id}\`)`;
                    }
                }));

                interaction.followUp({ content: `🛡️ Güvenli Kullanıcılar:\n${list.join("\n")}`, ephemeral: true });
            }

            else if (interaction.customId === 'addSafeUser') {
                interaction.followUp({ content: "Lütfen eklemek istediğin kullanıcının ID'sini veya mentionunu yaz.", ephemeral: true });

                const filterMsg = m => m.author.id === message.author.id;
                const collectorMsg = message.channel.createMessageCollector({ filter: filterMsg, time: 30000, max: 1 });

                collectorMsg.on('collect', async msg => {
                    let userId;
                    if (msg.mentions.users.size) userId = msg.mentions.users.first().id;
                    else userId = msg.content.trim();

                    try {
                        const user = await client.users.fetch(userId);
                        if (!user) return msg.reply("Geçerli bir kullanıcı değil.");

                        const data = await Safe.findOne({ guildID: message.guild.id }) || { safeUsers: [] };
                        if (data.safeUsers.find(u => u.id === userId)) {
                            return msg.reply("Bu kullanıcı zaten güvenli listede.");
                        }

                        data.safeUsers.push({ id: userId, addedAt: new Date() });
                        await Safe.updateOne({ guildID: message.guild.id }, data, { upsert: true });

                        msg.reply(`✅ ${user.tag} güvenli kullanıcı listesine eklendi!`);
                    } catch {
                        msg.reply("Kullanıcı bulunamadı.");
                    }
                });
            }

            else if (interaction.customId === 'removeSafeUser') {
                interaction.followUp({ content: "Lütfen çıkarmak istediğin kullanıcının ID'sini veya mentionunu yaz.", ephemeral: true });

                const filterMsg = m => m.author.id === message.author.id;
                const collectorMsg = message.channel.createMessageCollector({ filter: filterMsg, time: 30000, max: 1 });

                collectorMsg.on('collect', async msg => {
                    let userId;
                    if (msg.mentions.users.size) userId = msg.mentions.users.first().id;
                    else userId = msg.content.trim();

                    try {
                        const user = await client.users.fetch(userId);
                        if (!user) return msg.reply("Geçerli bir kullanıcı değil.");

                        const data = await Safe.findOne({ guildID: message.guild.id });
                        if (!data || !data.safeUsers.find(u => u.id === userId)) {
                            return msg.reply("Bu kullanıcı güvenli listede değil.");
                        }

                        data.safeUsers = data.safeUsers.filter(u => u.id !== userId);
                        await Safe.updateOne({ guildID: message.guild.id }, data);

                        msg.reply(`✅ ${user.tag} güvenli kullanıcı listesinden çıkarıldı!`);
                    } catch {
                        msg.reply("Kullanıcı bulunamadı.");
                    }
                });
            }

            else if (interaction.customId === 'setLogChannel') {
                interaction.followUp({ content: "Lütfen logların gönderileceği kanalın ID'sini veya mentionunu yaz.", ephemeral: true });

                const filterMsg = m => m.author.id === message.author.id;
                const collectorMsg = message.channel.createMessageCollector({ filter: filterMsg, max: 1 });

                collectorMsg.on('collect', async msg => {
                    let channelId;
                    if (msg.mentions.channels.size) channelId = msg.mentions.channels.first().id;
                    else channelId = msg.content.trim();

                    const channel = message.guild.channels.cache.get(channelId);
                    if (!channel) return msg.reply("Geçerli bir kanal değil.");

           
                    const Log = require('../../schemas/logchannel');
                    await Log.updateOne(
                        { guildID: message.guild.id },
                        { channelID: channelId },
                        { upsert: true }
                    );

                    msg.reply(`✅ Log kanalı başarıyla <#${channelId}> olarak ayarlandı!`);
                });
            }

        });

        collector.on('end', () => {
            panelMessage.edit({ components: [] }).catch(() => { });
        });
    }
};
async function backupGuardDataForGuild(guild) {
    const safeData = await Safe.findOne({ guildID: guild.id }) || {};
    const logData = await Log.findOne({ guildID: guild.id }) || {};

    const backup = {
        guildID: guild.id,
        guardEnabled: safeData.guardEnabled || false,
        safeUsers: safeData.safeUsers || [],
        logChannel: logData.channelID || null,
        backupTime: new Date().toISOString()
    };

    const dir = path.join(__dirname, '../../backups');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);

    const filePath = path.join(dir, `guard-${guild.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(backup, null, 2));
}





///  onur onur onur