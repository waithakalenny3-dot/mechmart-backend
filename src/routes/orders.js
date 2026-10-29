const express = require('express');
const router = express.Router();
const dbmod = require('../db');
const { adminOnly } = require('./auth');

function db() { return dbmod.getDb(); }

router.post('/', (req, res) => {
  const { name, phone, address, pay, total, items } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Name and phone required' });
  if (!items || !items.length) return res.status(400).json({ error: 'Cart empty' });

  try {
    const d = db();
    d.exec('BEGIN TRANSACTION');
    try {
      for (const it of items) {
        const p = d.prepare('SELECT stock FROM products WHERE id = ?').get(it.id);
        if (!p) continue;
        const newStock = Math.max(0, p.stock - it.qty);
        d.prepare('UPDATE products SET stock = ? WHERE id = ?').run(newStock, it.id);
      }
      const info = d.prepare(
        'INSERT INTO orders (name,phone,address,payment_method,total,status) VALUES (?,?,?,?,?,?)'
      ).run(name, phone, address || '', pay || 'M-Pesa', total, 'pending');
      const orderId = info.lastInsertRowid;
      const insertItem = d.prepare('INSERT INTO order_items (order_id,product_id,product_name,qty,price) VALUES (?,?,?,?,?)');
      for (const it of items) {
        insertItem.run(orderId, it.id, it.product_name || it.name, it.qty, it.price);
      }
      d.exec('COMMIT');
      res.status(201).json({ id: orderId, message: 'Order placed' });
    } catch (e) {
      d.exec('ROLLBACK');
      throw e;
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/', adminOnly, (req, res) => {
  const orders = db().prepare('SELECT * FROM orders ORDER BY id DESC').all();
  for (const o of orders) {
    o.items = db().prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id);
  }
  res.json(orders);
});

module.exports = router;
