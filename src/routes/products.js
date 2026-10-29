const express = require('express');
const router = express.Router();
const dbmod = require('../db');
const { adminOnly } = require('./auth');

function db() { return dbmod.getDb(); }

router.get('/', (req, res) => {
  let sql = 'SELECT * FROM products';
  const params = [];
  const clauses = [];
  if (req.query.inStock === 'true') clauses.push('stock > 0');
  if (req.query.search) { clauses.push('name LIKE ?'); params.push(`%${req.query.search}%`); }
  if (req.query.category) { clauses.push('category = ?'); params.push(req.query.category); }
  if (clauses.length) sql += ' WHERE ' + clauses.join(' AND ');
  sql += ' ORDER BY id DESC';
  const rows = db().prepare(sql).all(...params);
  res.json(rows);
});

router.get('/categories', (req, res) => {
  const rows = db().prepare('SELECT DISTINCT category FROM products ORDER BY category').all();
  res.json(rows.map(r => r.category));
});

router.get('/:id', (req, res) => {
  const row = db().prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.post('/', adminOnly, (req, res) => {
  const { name, category, price, stock, image_url, specs, description, icon } = req.body;
  if (!name || !category || price == null || stock == null) {
    return res.status(400).json({ error: 'Name, category, price and stock are required' });
  }
  const info = db().prepare(
    'INSERT INTO products (name,category,price,stock,image_url,specs,description,icon) VALUES (?,?,?,?,?,?,?,?)'
  ).run(name, category, price, stock, image_url || '', specs || '', description || '', icon || 'fa-box');
  res.status(201).json({ id: info.lastInsertRowid, message: 'Product added' });
});

router.put('/:id', adminOnly, (req, res) => {
  const { name, category, price, stock, image_url, specs, description, icon } = req.body;
  const row = db().prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  db().prepare(
    'UPDATE products SET name=?, category=?, price=?, stock=?, image_url=?, specs=?, description=?, icon=? WHERE id=?'
  ).run(name, category, price, stock, image_url || '', specs || '', description || '', icon || 'fa-box', req.params.id);
  res.json({ message: 'Product updated' });
});

router.delete('/:id', adminOnly, (req, res) => {
  const row = db().prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  db().prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ message: 'Product removed' });
});

module.exports = router;
