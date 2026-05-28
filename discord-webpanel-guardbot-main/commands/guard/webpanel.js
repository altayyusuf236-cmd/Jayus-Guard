const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: "webpanel",
  description: "Web panel linkini gösterir.",
  execute: async (client, message) => {
    if(message.author.bot) return;
    const embed = new EmbedBuilder()
      .setTitle('🌐 Web Panel')
      .setDescription('[Web paneli açmak için tıkla](http://localhost:3000)\nKullanıcı adı ve şifre ile giriş yapabilirsiniz.')
      .setColor('#5865f2')
      .setFooter({ text: 'onur - webpanel' })
      .setTimestamp();
    message.channel.send({ embeds: [embed] });
  }
};