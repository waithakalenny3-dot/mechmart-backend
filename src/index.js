require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const { init } = require('./db');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const serviceRoutes = require('./routes/services');

const app = express();
const PORT = process.env.PORT || 5000;
const INDEX_HTML = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');

init().then(() => {
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(session({
    secret: process.env.SESSION_SECRET || 'dev_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', secure: false }
  }));

  app.use('/api/auth', authRoutes.router);
  app.use('/api/products', productRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/service-requests', serviceRoutes);

  // Serve the single-page frontend (no express.static needed -> no 'mime' dep)
  app.get('*', (req, res) => {
    res.set('Content-Type', 'text/html').send(INDEX_HTML);
  });

  app.listen(PORT, () => console.log(`MechMart backend running on http://localhost:${PORT}`));
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
