# MechMart | Mechanical Engineer Store

A full-stack e-commerce website for a mechanical engineering workshop in Kenya. MechMart sells mechanical tools, spares, and fabrication materials, plus on-demand CNC cutting, welding, and equipment repair services. It includes a secure admin dashboard for inventory management, order tracking, and service requests.

## Features

### Storefront (Customer)
- **Product catalog** — browse tools, bearings, welding rods, PPE, steel plates, student kits, etc.
- **Category filter** — filter products by category (Workshop Tools, Bearings & Fasteners, Fabrication Materials, Safety & PPE, Student Kits)
- **Search** — search products by name
- **Product details** — price, stock level, specs, description, and fallback Font Awesome icon
- **Shopping cart** — add items, adjust quantities, persistent cart (localStorage)
- **Checkout** — place an order with name, phone, address, and payment method (M-Pesa or Cash on Delivery)
- **Stock auto-decrement** — placing an order reduces product stock; out-of-stock items are hidden from customers

### Services
- **Service request form** — customers submit fabrication quote requests (CNC cutting, welding, equipment repair, custom design)
- **Admin view** — engineers see all service requests

### Admin Dashboard (Secure)
- **Login** — bcrypt-hashed password, express-session authentication
- **Add / Edit / Delete products** — manage inventory through a form
- **Update stock** — change stock quantities per product
- **View orders** — see all customer orders with items and totals
- **View service requests** — see all quote requests
- **Dashboard stats** — total revenue, order count, live vs out-of-stock products

### Value Creation Model
A dedicated section explaining how the site generates revenue and business value for the owner:
1. Product sales margin
2. Fabrication service fees
3. Delivery fees
4. Commission model (other fundis listing on the site)
5. Maintenance contracts (schools, etc.)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js (v18+) |
| Framework | Express |
| Database | File-based JSON (no external DB server required) |
| Auth | express-session + bcryptjs |
| Frontend | HTML + Tailwind CSS (CDN) + Font Awesome icons |
| CORS | cors |

## Folder Structure

```
mechmart-backend/
├── public/
│   └── index.html          # Single-page frontend (calls the API)
├── src/
│   ├── index.js            # Express app entry point
│   ├── db.js               # File-based JSON database (seeds defaults)
│   └── routes/
│       ├── auth.js         # Admin login/logout/session
│       ├── products.js     # CRUD for products + categories
│       ├── orders.js       # Place order + admin order list
│       └── services.js     # Service requests + admin list
├── data/                   # Runtime JSON database (created on first run)
├── .env                    # Environment variables (NOT committed)
├── .gitignore              # Git exclusions
├── package.json
└── README.md
```

## Installation

1. **Clone the repo**
   ```bash
   git clone https://github.com/waithakalenny3-dot/mechmart-backend.git
   cd mechmart-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   Copy `.env` and set your own secrets:
   ```
   PORT=5000
   SESSION_SECRET=your_random_secret_here
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=your_strong_password
   ```

4. **Start the server**
   ```bash
   npm start
   ```
   Or for development:
   ```bash
   npm run dev
   ```

5. **Open the app**
   Visit **http://localhost:5000**

## Default Admin Credentials

After first run, the database seeds a default admin account:
- **Username:** `admin`
- **Password:** `admin123` (change this in `.env` before production)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `SESSION_SECRET` | Secret for session cookies | *(required)* |
| `ADMIN_USERNAME` | Admin login username | `admin` |
| `ADMIN_PASSWORD` | Admin login password | `admin123` |

## API Endpoints

### Public
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/products` | List products (query: `?search=`, `?category=`, `?inStock=true`) |
| `GET` | `/api/products/:id` | Get single product |
| `GET` | `/api/products/categories` | List distinct categories |
| `POST` | `/api/orders` | Place an order (decrements stock) |
| `POST` | `/api/service-requests` | Submit a fabrication quote request |
| `POST` | `/api/auth/login` | Admin login |
| `POST` | `/api/auth/logout` | Admin logout |
| `GET` | `/api/auth/me` | Check admin session |

### Admin (requires session)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/products` | Add a new product |
| `PUT` | `/api/products/:id` | Update a product |
| `DELETE` | `/api/products/:id` | Remove a product |
| `GET` | `/api/orders` | List all orders |
| `GET` | `/api/service-requests` | List all service requests |

## Git Exclusions

The following are **not** committed to GitHub (see `.gitignore`):
- `node_modules/` — installed via `npm install`
- `.env` — contains secrets (create your own locally)
- `data/` — runtime JSON database (regenerated on first server start)
- `server.log` — server logs

## License

MIT

---

**MechMart © 2026** | Group Members: [Add Names & Admission Nos] | Value: Product Sales + Services + Delivery
