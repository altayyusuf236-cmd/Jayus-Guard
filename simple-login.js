const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 4000;

// Mongo bağlantısı
mongoose.connect('mongodb://localhost:27017/test', { useNewUrlParser: true, useUnifiedTopology: true });

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String
});
const User = mongoose.model('User', UserSchema);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: 'sade-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, sameSite: 'strict' }
}));

// Kullanıcı ekleme (ilk kullanıcıyı eklemek için)
(async () => {
  const username = 'testuser';
  const password = 'testpass';
  const hashed = await bcrypt.hash(password, 10);
  try {
    await User.create({ username, password: hashed });
    console.log('Kullanıcı eklendi: testuser / testpass');
  } catch (e) {
    console.log('Kullanıcı zaten var!');
  }
})();

// Login formu
app.get('/login', (req, res) => {
  res.send(`
    <form method="POST" action="/login">
      <input name="username" placeholder="Kullanıcı Adı" required><br>
      <input name="password" type="password" placeholder="Şifre" required><br>
      <button type="submit">Giriş Yap</button>
    </form>
    ${req.query.error ? `<div style='color:red;'>${req.query.error}</div>` : ''}
  `);
});

// Login işlemi
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.redirect('/login?error=Kullanıcı bulunamadı');
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.redirect('/login?error=Şifre hatalı');
  req.session.userId = user._id;
  res.redirect('/panel');
});

// Korumalı panel
app.get('/panel', (req, res) => {
  if (!req.session.userId) return res.redirect('/login?error=Oturum yok');
  res.send('Panel: Giriş başarılı! <a href="/logout">Çıkış</a>');
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login?error=Çıkış yapıldı'));
});

app.listen(PORT, () => console.log('Sade login örneği http://localhost:' + PORT)); 