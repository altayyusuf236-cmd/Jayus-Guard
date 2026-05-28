const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./schemas/User');
const config = require('./config');

async function addUser() {
  await mongoose.connect(config.mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });

  const username = 'onurcanx';
  const password = 'onurcanx';
  const hashed = await bcrypt.hash(password, 10);

  const user = new User({ username, password: hashed });
  await user.save();

  console.log('Kullanıcı başarıyla eklendi!');
  process.exit(0);
}

addUser();