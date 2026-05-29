const { Client, Collection, GatewayIntentBits } = require("discord.js");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const express = require("express");
const Safe = require('./schemas/safe');
const Log = require('./schemas/logchannel');
const config = require("./config");
const session = require('express-session');
const LogEntry = require('./schemas/logEntry');
const bcrypt = require('bcryptjs');
const User = require('./schemas/User');


const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

client.commands = new Collection();

fs.readdirSync("./commands").forEach(dir => {
  fs.readdirSync(`./commands/${dir}`)
    .filter(f => f.endsWith(".js"))
    .forEach(f => {
      const cmd = require(`./commands/${dir}/${f}`);
      client.commands.set(cmd.name, cmd);
      (cmd.aliases || []).forEach(a => client.commands.set(a, cmd));
    });
});

fs.readdirSync("./events").filter(file => file.endsWith(".js")).forEach(file => {
  const evt = require(`./events/${file}`);
  if (!evt.name || typeof evt.execute !== "function") return;
  client.on(evt.name, evt.execute.bind(null, client));
});
const activities = [
  { name: 'discors.gg/jayus', type: 0 },
  { name: 'By qoldslitz34', type: 3 },
  { name: 'discord.gg/jayus', type: 0 },
  { name: '️By qoldslitz34', type: 5 },
  { name: '.help komutlarıma bak!', type: 2 },
];

let index = 0;

setInterval(() => {
  const activity = activities[index % activities.length];
  client.user.setActivity(activity.name, { type: activity.type });
  index++;
}, 10000);



mongoose.connect(config.mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB connected"))
  .catch(console.error);

// Bot başladığında session store'u temizle
const sessionStore = new Map();
console.log("🔄 Session store temizlendi - Tüm kullanıcılar çıkış yapıldı");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

// Statik dosya servisi
app.use(express.static('public'));

// Güvenlik middleware'leri
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/backups', express.static(path.join(__dirname, 'backups')));
app.use(session({
  secret: 'güçlü-bir-gizli-kelime',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // HTTPS kullanıyorsan true yap
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 saat
    sameSite: 'strict'
  }
}));

// Session kontrol middleware
function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  
  // Oturum süresi kontrolü (24 saat)
  const now = Date.now();
  const loginTime = req.session.loginTime || 0;
  const sessionDuration = 24 * 60 * 60 * 1000; // 24 saat
  
  if ((now - loginTime) > sessionDuration) {
    req.session.destroy(() => {
      return res.redirect('/login');
    });
    return;
  }
  
  next();
}

// Brute force koruması için basit rate limiting
const loginAttempts = new Map();

// Login route
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  
  // Rate limiting kontrolü
  const attempts = loginAttempts.get(clientIP) || { count: 0, lastAttempt: 0 };
  const now = Date.now();
  
  // 5 dakika içinde 5 başarısız deneme limiti
  if (attempts.count >= 5 && (now - attempts.lastAttempt) < 5 * 60 * 1000) {
    return res.render('login', { error: 'Çok fazla başarısız deneme. 5 dakika bekleyin.' });
  }
  
  // 5 dakika geçtiyse sayacı sıfırla
  if ((now - attempts.lastAttempt) > 5 * 60 * 1000) {
    attempts.count = 0;
  }
  
  const { username, password } = req.body;
  
  // Input sanitization
  if (!username || !password || 
      typeof username !== 'string' || typeof password !== 'string' ||
      username.length > 50 || password.length > 100) {
    attempts.count++;
    attempts.lastAttempt = now;
    loginAttempts.set(clientIP, attempts);
    return res.render('login', { error: 'Geçersiz giriş bilgileri.' });
  }
  
  try {
    const user = await User.findOne({ username: username.trim() });
    if (!user) {
      attempts.count++;
      attempts.lastAttempt = now;
      loginAttempts.set(clientIP, attempts);
      return res.render('login', { error: 'Kullanıcı bulunamadı.' });
    }
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      attempts.count++;
      attempts.lastAttempt = now;
      loginAttempts.set(clientIP, attempts);
      return res.render('login', { error: 'Şifre hatalı.' });
    }
    
    // Başarılı giriş - sayacı sıfırla
    loginAttempts.delete(clientIP);
    
    req.session.userId = user._id;
    req.session.loginTime = now;
    
    try {
      const guildID = config.guildID;
      res.redirect(`/dashboard/${guildID}`);
    } catch (err) {
      console.error("Dashboard yönlendirme hatası:", err);
      res.redirect('/dashboard');
    }
  } catch (error) {
    console.error('Login error:', error);
    attempts.count++;
    attempts.lastAttempt = now;
    loginAttempts.set(clientIP, attempts);
    res.render('login', { error: 'Sunucu hatası oluştu.' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// Tüm korumalı route'lara session kontrolü
app.use(['/dashboard', '/guard', '/safe-users', '/logs', '/roles', '/channels', '/settings'], requireLogin);

// Slash ile sayfa geçişini engelle (ör: /dashboard vs /dashboard/123)
app.get(['/dashboard', '/guard', '/safe-users', '/logs', '/roles', '/channels', '/settings'], (req, res) => {
  res.redirect('/dashboard');
});

const { tempPasswords } = require('./commands/guard/webpanel');

app.post('/panel-login', (req, res) => {
  const { userId, password } = req.body;
  const temp = tempPasswords.get(userId);

  if (!temp) return res.render('login', { error: 'Geçici şifre bulunamadı veya süresi doldu.' });

  if (temp.password === password && temp.expires > Date.now()) {
    req.session.userId = userId;
    tempPasswords.delete(userId);


    return res.redirect('/');
  } else {
    return res.render('login', { error: 'Şifre yanlış veya süresi dolmuş.' });
  }
});
const Announcement = require('./schemas/Announcement');
// Bot client'ını app'e ekle
app.set('client', client);

// Route'ları ekle
app.use('/dashboard', require('./routes/dashboard'));
app.use('/guard', require('./routes/guard'));
app.use('/safe-users', require('./routes/safe-users'));
app.use('/logs', require('./routes/logs'));
app.use('/roles', require('./routes/roles'));
app.use('/channels', require('./routes/channels'));
app.use('/settings', require('./routes/settings')(client));
app.use('/bot-settings', require('./routes/bot-settings'));

app.get('/', async (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  
  try {
    const guildID = config.guildID;
    const guild = await client.guilds.fetch(guildID);
    
    // Dashboard'a yönlendir
    res.redirect(`/dashboard/${guildID}`);
  } catch (err) {
    console.error("Ana sayfa yüklenemedi:", err);
    res.status(500).send('Sunucu hatası');
  }
}); const { ChannelType, PermissionsBitField } = require('discord.js');







const CustomCommand = require('./schemas/customCommand');


app.post('/custom-commands', async (req, res) => {
  const {
    command,
    response,
    type,
    imageUrl,
    embedTitle,
    embedColor,
    embedFooter
  } = req.body;

  try {
    await CustomCommand.findOneAndUpdate(
      { guildID: config.guildID, command: command.trim().toLowerCase() },
      {
        response,
        type,
        imageUrl,
        embedTitle,
        embedColor,
        embedFooter
      },
      { upsert: true, new: true }
    );

    res.status(200).json({ success: true, message: "Komut başarıyla eklendi!" });
  } catch (err) {
    console.error("Komut eklenirken hata:", err);
    res.status(500).json({ success: false, message: "Komut eklenirken hata oluştu." });
  }
});



app.get('/api/live-stats', async (req, res) => {
  try {
    const guildID = config.guildID;
    const guild = await client.guilds.fetch(guildID);

    const totalMembers = guild.memberCount;


    let bots = 0;
    try {
      const members = await guild.members.fetch({ time: 7000 });
      bots = members.filter(m => m.user.bot).size;
    } catch (err) {

    }

    const humans = totalMembers - bots;


    const voiceChannelMembers = guild.channels.cache
      .filter(ch => ch.type === 2 || ch.type === 13)
      .reduce((acc, ch) => acc + ch.members.size, 0);

    res.json({
      totalMembers,
      bots,
      humans,
      voiceChannelMembers
    });

  } catch (error) {
    console.error('[API] Canlı istatistik hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

app.post('/announcement-settings', async (req, res) => {
  const { channelID, message } = req.body;
  const guildID = config.guildID;

  try {
    const guild = await client.guilds.fetch(guildID);
    const channel = await guild.channels.fetch(channelID);

    if (!channel) return res.status(400).json({ success: false, message: 'Kanal bulunamadı' });

    await Announcement.findOneAndUpdate(
      { guildID },
      { channelID, message, updatedAt: new Date() },
      { upsert: true }
    );

    await channel.send(message);

    return res.json({ success: true, message: 'Duyuru gönderildi' });
  } catch (err) {
    console.error('[Duyuru Hatası]', err);
    return res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});


app.get('/api/safe/list', async (req, res) => {
  try {
    const guildID = config.guildID;
    const safeData = await Safe.findOne({ guildID }) || { safeUsers: [] };

    const safeUsers = await Promise.all(
      safeData.safeUsers.map(async u => {
        try {
          const user = await client.users.fetch(u.id);
          return {
            id: u.id,
            tag: user.tag,
            avatar: user.displayAvatarURL({ extension: 'png', size: 64 }),
            addedAt: u.addedAt || new Date()
          };
        } catch {
          return {
            id: u.id,
            tag: 'Bilinmeyen Kullanıcı',
            avatar: 'https://via.placeholder.com/64?text=?',
            addedAt: u.addedAt || new Date()
          };
        }
      })
    );

    res.json({ success: true, safeUsers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Safe kullanıcılar alınamadı.' });
  }
});



app.post('/api/create-role', async (req, res) => {
  const { name, color, permissions } = req.body;
  if (!name || !color || !permissions) return res.status(400).json({ message: 'Eksik parametre' });

  try {
    const guildID = config.guildID;
    if (!guildID) return res.status(404).json({ message: 'Sunucu bulunamadı' });

    const guild = await client.guilds.fetch(guildID);
    if (!guild) return res.status(404).json({ message: 'Sunucu bulunamadı' });


    const discordPerms = permissions
      .map(p => PermissionsBitField.Flags[p])
      .filter(Boolean);

    if (discordPerms.length === 0) {
      return res.status(400).json({ message: 'Geçerli izin bulunamadı' });
    }

    const newRole = await guild.roles.create({
      name,
      color,
      permissions: discordPerms,
      reason: 'Guard Bot Web Panelinden oluşturuldu'
    });

    res.json({ message: 'Rol oluşturuldu', roleName: newRole.name, roleId: newRole.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Rol oluşturulamadı', error: error.message });
  }
});


app.delete('/api/delete-role/:id', async (req, res) => {
  const roleId = req.params.id;
  const guildID = config.guildID;

  try {
    const guild = await client.guilds.fetch(guildID);
    const role = await guild.roles.fetch(roleId);
    if (!role) return res.status(404).json({ message: 'Rol bulunamadı.' });

    await role.delete('Web panelden silindi.');
    res.json({ message: 'Rol başarıyla silindi.' });
  } catch (error) {
    console.error('Rol silme hatası:', error);
    res.status(500).json({ message: 'Rol silinirken hata oluştu.', error: error.message });
  }
});

app.post('/log-channel-settings', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, message: "Giriş yapmanız gerekiyor." });
  }

  const { channelID } = req.body;
  const guildID = config.guildID;

  try {
    let logData = await Log.findOne({ guildID });
    if (!logData) {
      logData = new Log({ guildID });
    }

    logData.channelID = channelID || null;
    await logData.save();

    res.json({ success: true, message: "Log kanalı başarıyla ayarlandı!" });
  } catch (err) {
    console.error("Log kanalı ayarlanırken hata:", err);
    res.status(500).json({ success: false, message: "Sunucu hatası." });
  }
});




app.get('/api/roles', async (req, res) => {
  try {
    const guild = await client.guilds.fetch(config.guildID);
    const roles = await guild.roles.fetch();

    const roleList = roles.map(role => ({
      id: role.id,
      name: role.name,
      color: role.hexColor,
      permissions: role.permissions.toArray(),
      position: role.position
    }));

    res.json({ roles: roleList });
  } catch (err) {
    console.error('Roller alınamadı:', err);
    res.status(500).json({ message: 'Roller alınamadı.', error: err.message });
  }
});






app.post('/toggle-guard', async (req, res) => {
  const { state } = req.body;
  const guildID = config.guildID;
  await Safe.updateOne({ guildID }, { $set: { guardEnabled: state === 'enable' } }, { upsert: true });
  res.redirect('/');
});


app.post('/backup', async (req, res) => {
  const guildID = config.guildID;
  const safeData = await Safe.findOne({ guildID }) || {};
  const logData = await Log.findOne({ guildID }) || {};

  const backup = {
    guildID,
    guardEnabled: safeData.guardEnabled || false,
    safeUsers: safeData.safeUsers || [],
    logChannel: logData.channelID || null,
    backupTime: new Date().toISOString()
  };

  const backupsDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir);

  const fileName = `guard-${guildID}-${Date.now()}.json`;
  const filePath = path.join(backupsDir, fileName);
  fs.writeFileSync(filePath, JSON.stringify(backup, null, 2));

  res.redirect('/');
});


app.post('/api/safe/add', async (req, res) => {
  try {
    const guildID = config.guildID;
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Kullanıcı ID gereklidir' });

    const safeData = await Safe.findOne({ guildID }) || new Safe({ guildID, safeUsers: [], guardEnabled: false });
    if (safeData.safeUsers.some(u => u.id === id)) return res.status(400).json({ error: 'Zaten listede' });

    safeData.safeUsers.push({ id, addedAt: new Date() });
    await safeData.save();

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});


app.post('/api/safe/remove', async (req, res) => {
  try {
    const guildID = config.guildID;
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Kullanıcı ID gerekli' });

    const safeData = await Safe.findOne({ guildID });
    if (!safeData) return res.status(404).json({ error: 'Liste bulunamadı' });

    safeData.safeUsers = safeData.safeUsers.filter(u => u.id !== id);
    await safeData.save();

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});


app.post('/api/logchannel/set', async (req, res) => {
  try {
    const guildID = config.guildID;
    const { channelID } = req.body;
    if (!channelID) return res.status(400).json({ error: 'Kanal ID gereklidir' });

    await Log.updateOne({ guildID }, { $set: { channelID } }, { upsert: true });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

const Panel = require('./schemas/Panel');

app.get('/api/guard-settings', async (req, res) => {
  const guildID = config.guildID;
  let panel = await Panel.findOne({ guildID });
  if (!panel) panel = await Panel.create({ guildID });
  res.json(panel);
});

app.post('/api/guard-settings', async (req, res) => {
  // Gelen verileri kontrol et: Eğer true veya 'on' ise true yap, gelmediyse (kapalıysa) direkt false yap!
  const kanalKoruma = req.body.kanalKoruma === true || req.body.kanalKoruma === 'on';
  const rolKoruma = req.body.rolKoruma === true || req.body.rolKoruma === 'on';
  const emojiKoruma = req.body.emojiKoruma === true || req.body.emojiKoruma === 'on';
  const banKickKoruma = req.body.banKickKoruma === true || req.body.banKickKoruma === 'on';

  const guildID = config.guildID;
  try {
    const updated = await Panel.findOneAndUpdate(
      { guildID },
      { kanalKoruma, rolKoruma, emojiKoruma, banKickKoruma },
      { new: true, upsert: true }
    );
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: "Güncelleme hatası" });
  }
});

// 🔐 SADECE BİR KEZ ÇALIŞTIRILACAK KALICI HESAP OLUŞTURUCU
app.get('/kalici-hesap-yarat', async (req, res) => {
  try {
    // ⬇️ Kanka buraları tamamen kendi istediğin gibi değiştir:
    const seninKullaniciAdin = "qoldslitz34"; // Örn: yusuf, admin, kurucu vs.
    const seninKalıcıSifren   = "3644AB3644";     // Girişte kullanacağın şifren

    const hashedPassword = await bcrypt.hash(seninKalıcıSifren, 10);
    
    await User.findOneAndUpdate(
      { username: seninKullaniciAdin.trim() },
      { username: seninKullaniciAdin.trim(), password: hashedPassword },
      { upsert: true, new: true }
    );
    
    res.send(`✅ Kalıcı hesabın MongoDB'ye kaydedildi kanka! Kullanıcı adı: ${seninKullaniciAdin}`);
  } catch (err) {
    res.status(500).send('Hata oluştu kanka: ' + err.message);
  }
});



client.login(config.token).then(() => {
  app.listen(PORT, () => {
    console.log(`🌐 Web paneli http://localhost:${PORT} adresinde çalışıyor.`);
  });
});
