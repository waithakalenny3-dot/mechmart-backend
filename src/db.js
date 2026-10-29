const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const TABLE_FILES = {
  admins: 'admins.json',
  products: 'products.json',
  orders: 'orders.json',
  order_items: 'order_items.json',
  service_requests: 'service_requests.json'
};

function tablePath(table) { return path.join(DATA_DIR, TABLE_FILES[table]); }
function readTable(table) {
  try { return JSON.parse(fs.readFileSync(tablePath(table), 'utf8')); }
  catch { return []; }
}
function writeTable(table, rows) {
  fs.writeFileSync(tablePath(table), JSON.stringify(rows, null, 2));
}

function nextId(rows) { return rows.length ? Math.max(...rows.map(r => r.id)) + 1 : 1; }

// Evaluate a row against a WHERE clause (supports col op val, AND chains, LIKE with %/_)
function evalWhere(row, where, params) {
  let pIdx = 0;
  const parts = where.split(/\s+AND\s+/i);
  for (const part of parts) {
    const cond = part.trim();
    if (!cond) continue;
    const m = cond.match(/^\s*([\w.]+)\s*(=|<>|!=|>|<|>=|<=|LIKE)\s*('?\s*\?\s*'?|'[^']*'|\d+(?:\.\d+)?)\s*$/i);
    if (!m) continue;
    const [, col, op, raw] = m;
    let cell = row[col];
    let cmpVal;
    if (raw.trim() === '?' || raw.trim() === "'?'") { cmpVal = params[pIdx++]; }
    else if (raw.startsWith("'")) cmpVal = raw.slice(1, -1);
    else cmpVal = Number(raw);
    const up = op.toUpperCase();
    if (up === 'LIKE') {
      const pat = String(cmpVal).toLowerCase();
      const rx = new RegExp('^' + pat.replace(/[%_]/g, c => c === '%' ? '.*' : c === '_' ? '.' : '\\' + c) + '$');
      if (!rx.test(String(cell == null ? '' : cell).toLowerCase())) return false;
    } else {
      let ok;
      if (up === '=') ok = cell == cmpVal;
      else if (up === '<>' || up === '!=') ok = cell != cmpVal;
      else if (up === '>') ok = Number(cell) > Number(cmpVal);
      else if (up === '<') ok = Number(cell) < Number(cmpVal);
      else if (up === '>=') ok = Number(cell) >= Number(cmpVal);
      else if (up === '<=') ok = Number(cell) <= Number(cmpVal);
      else ok = true;
      if (!ok) return false;
    }
  }
  return true;
}

class Statement {
  constructor(sql) { this.sql = sql.trim(); this.params = []; }
  bind(...p) { this.params = p; return this; }
  get(...p) { this.params = p; const r = this._exec(); return Array.isArray(r) ? r[0] : r; }
  all(...p) { this.params = p; const r = this._exec(); return Array.isArray(r) ? r : (r ? [r] : []); }
  run(...p) { this.params = p; return this._exec() || { changes: 0, lastInsertRowid: null }; }

  _exec() {
    const sql = this.sql;
    const params = this.params;

    // CREATE TABLE IF NOT EXISTS -> no-op
    if (/^CREATE\s+TABLE/i.test(sql)) return { changes: 0 };

    // BEGIN / COMMIT / ROLLBACK -> no-op
    if (/^(BEGIN|COMMIT|ROLLBACK)\s+TRANSACTION$/i.test(sql)) return { changes: 0 };

    // SELECT
    const sel = sql.match(/^\s*SELECT\s+(.*?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.*?))?(?:\s+ORDER\s+BY\s+(\w+)(?:\s+(DESC|ASC))?)?\s*$/i);
    if (sel) {
      const [, cols, table, where, orderCol, orderDir] = sel;
      let rows = readTable(table);
      if (where) rows = rows.filter(r => evalWhere(r, where, params));
      const distinct = /^\s*DISTINCT\s+/i.test(cols);
      if (distinct) {
        const col = cols.replace(/^\s*DISTINCT\s+/i, '').trim();
        const seen = new Set();
        rows = rows.filter(r => {
          const v = r[col];
          if (seen.has(v)) return false;
          seen.add(v);
          return true;
        });
      }
      if (orderCol) rows.sort((a, b) => {
        const av = a[orderCol], bv = b[orderCol];
        if (av < bv) return orderDir === 'DESC' ? 1 : -1;
        if (av > bv) return orderDir === 'DESC' ? -1 : 1;
        return 0;
      });
      if (/^\s*COUNT\s*\(\s*\*\s*\)/i.test(cols.trim())) return [{ c: rows.length }];
      return rows;
    }

    // INSERT INTO table (...) VALUES (...)
    const ins = sql.match(/^\s*INSERT\s+INTO\s+(\w+)\s*\(([^)]*)\)\s*VALUES\s*\(([^)]*)\)\s*$/i);
    if (ins) {
      const [, table, colsRaw, valsRaw] = ins;
      const cols = colsRaw.split(',').map(c => c.trim());
      const vals = params;
      const rows = readTable(table);
      const row = {};
      cols.forEach((c, i) => row[c] = vals[i]);
      if (row.id == null) row.id = nextId(rows);
      rows.push(row);
      writeTable(table, rows);
      return { changes: 1, lastInsertRowid: row.id };
    }

    // UPDATE table SET ... WHERE id = ?
    const upd = sql.match(/^\s*UPDATE\s+(\w+)\s+SET\s+(.*?)\s+WHERE\s+(\w+)\s*=\s*\?\s*$/i);
    if (upd) {
      const [, table, setRaw, idCol] = upd;
      const rows = readTable(table);
      const idVal = params[params.length - 1];
      const assignments = setRaw.split(',').map(a => {
        const m = a.match(/^\s*(\w+)\s*=\s*\?\s*$/);
        return m ? [m[1], null] : null;
      }).filter(Boolean);
      // fill values in order for assignments
      let vi = 0;
      assignments.forEach(a => { a[1] = params[vi++]; });
      let changes = 0;
      rows.forEach(r => {
        if (r[idCol] == idVal) {
          assignments.forEach(([c, v]) => { r[c] = v; });
          changes++;
        }
      });
      writeTable(table, rows);
      return { changes };
    }

    // DELETE FROM table WHERE id = ?
    const del = sql.match(/^\s*DELETE\s+FROM\s+(\w+)\s+WHERE\s+(\w+)\s*=\s*\?\s*$/i);
    if (del) {
      const [, table, idCol] = del;
      const rows = readTable(table);
      const idVal = params[0];
      const before = rows.length;
      const filtered = rows.filter(r => r[idCol] != idVal);
      writeTable(table, filtered);
      return { changes: before - filtered.length };
    }

    return { changes: 0 };
  }
}

class DB {
  prepare(sql) { return new Statement(sql); }
  exec(sql) {
    if (/^(BEGIN|COMMIT|ROLLBACK)\s+TRANSACTION$/i.test(sql) || /^CREATE\s+TABLE/i.test(sql)) return;
  }
}

const db = new DB();

// Seed default admin + products if empty
(function seed() {
  const admins = readTable('admins');
  if (!admins.length) {
    const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10);
    writeTable('admins', [{ id: 1, username: process.env.ADMIN_USERNAME || 'admin', password_hash: hash }]);
  }
  const products = readTable('products');
  if (!products.length) {
    const defaultProducts = [
      ['Digital Vernier Caliper 150mm', 'Workshop Tools', 2500, 15, '', '0-150mm | 0.01mm | SS', 'Precision measurement for workshop and students', 'fa-ruler-combined'],
      ['Ball Bearing 6205 ZZ', 'Bearings & Fasteners', 650, 50, '', '25x52x15mm | 14kN', 'High carbon steel for motors, posho mills', 'fa-gear'],
      ['Welding Electrodes E6013 5kg', 'Fabrication Materials', 1800, 30, '', '3.2mm | 5kg | Mild Steel', 'General purpose welding rods', 'fa-fire'],
      ['Auto-Dark Welding Helmet', 'Safety & PPE', 4500, 10, '', 'Shade 9-13 | Solar Power', 'Professional safety helmet', 'fa-helmet-safety'],
      ['Engineering Drawing Set', 'Student Kits', 1200, 40, '', '8 pcs | Compass Set', 'Complete set for ME students', 'fa-pen-ruler'],
      ['Cutting Disc 9 inch (5pcs)', 'Fabrication Materials', 900, 60, '', '230mm | 6600 RPM', 'Metal cutting discs for grinder', 'fa-circle-notch'],
      ['Mild Steel Plate 3mm 4x8ft', 'Fabrication Materials', 7500, 8, '', '3mm | 4x8ft | Grade MS', 'For gates, tanks fabrication', 'fa-table-cells'],
      ['Safety Boots Steel Toe', 'Safety & PPE', 3800, 20, '', 'Size 39-45 | Steel Toe', 'Workshop safety boots', 'fa-shoe-prints']
    ];
    const rows = defaultProducts.map((p, i) => ({
      id: i + 1, name: p[0], category: p[1], price: p[2], stock: p[3],
      image_url: p[4], specs: p[5], description: p[6], icon: p[7]
    }));
    writeTable('products', rows);
  }
})();

function getDb() { return db; }

module.exports = { init: async () => {}, getDb };
