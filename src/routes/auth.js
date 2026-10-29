const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const dbmod = require('../db');

function db() { return dbmod.getDb(); }

function adminOnly(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: 'Admin login required' });
}

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  const admin = db().prepare('SELECT * FROM admins WHERE username = ?').get(username);
  if (!admin) return res.status(401).json({ error: 'Invalid credentials' });
  bcrypt.compare(password, admin.password_hash, (err, match) => {
    if (err || !match) return res.status(401).json({ error: 'Invalid credentials' });
    req.session.isAdmin = true;
    req.session.adminId = admin.id;
    res.json({ success: true, message: 'Logged in' });
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

router.get('/me', (req, res) => {
  res.json({ isAdmin: !!req.session.isAdmin });
});

module.exports = { router, adminOnly };
