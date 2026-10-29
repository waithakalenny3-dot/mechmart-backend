const express = require('express');
const router = express.Router();
const dbmod = require('../db');
const { adminOnly } = require('./auth');

function db() { return dbmod.getDb(); }

router.post('/', (req, res) => {
  const { name, phone, type, details } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const info = db().prepare(
    'INSERT INTO service_requests (name,phone,type,details) VALUES (?,?,?,?)'
  ).run(name, phone || '', type || '', details || '');
  res.status(201).json({ id: info.lastInsertRowid, message: 'Request sent' });
});

router.get('/', adminOnly, (req, res) => {
  const rows = db().prepare('SELECT * FROM service_requests ORDER BY id DESC').all();
  res.json(rows);
});

module.exports = router;
