HEAD
# patilfarm
Patil Mango Farm - Next.js Application
=======
# Patil Mango Farm

A full-stack, mobile-first e-commerce site for a **seasonal Konkan mango seller** selling
farm-direct **Alphonso & Kesar** mangoes (from Ratnagiri / Devgad) to customers across
**Mumbai, Thane & Navi Mumbai**.

Built with **Next.js (App Router) + Tailwind CSS + Prisma (SQLite)** — a Node.js stack.

---

## ✨ Features

- **Attractive landing page** with farm imagery, trust badges, feature highlights and a hero CTA.
- **Product catalog** (Devgad Alphonso, Ratnagiri Alphonso, Konkan Kesar) with quantity in **dozens**.
- **Serviceability check** — validates the customer's pincode against a serviceable list before checkout.
- **Cart + Checkout** with full form validation (name, 10-digit mobile, address, city, pincode).
- **Strict stock / oversell protection** — the owner sets stock per mango type; customers only ever
  see what is actually available, and no order is accepted beyond it. Stock, customer and order are
  created atomically in a database transaction, so stock can never go negative.
- **Owner Accept / Reject on every order** — reserved stock is committed on accept and returned to
  sale on reject, and the customer is emailed automatically (with a payment link on accept).
- **Order confirmation page** — unique order ID (e.g. `MNG-2026-0001`), items, total, delivery details.
- **Admin portal** (`/admin`) with secure login:
  - 📦 **Inventory** — set stock, update price, upload product photos, hide/show products seasonally.
  - 🧾 **Orders** — accept or reject new orders, attach a payment link, filter by year/status/payment, update order & payment status.
  - 📈 **Sales** — yearly breakdown: total orders, revenue, paid/unpaid, monthly chart, status split.

---

## 🚀 Getting Started

Requirements: **Node.js 18.18+** (tested on 22).

```bash
# 1. Install dependencies
npm install

# 2. Set up the database (SQLite) + seed admin, areas & products
npx prisma db push
npm run db:seed
```

> On Windows PowerShell, if `npm` is blocked by the execution policy, use `npm.cmd ...`
> or run with `powershell -ExecutionPolicy Bypass`.

### Run in development

```bash
npm run dev
```

Open http://localhost:3000

> On Windows PowerShell, if `npm` is blocked by the execution policy, use `npm.cmd ...`
> or run with `powershell -ExecutionPolicy Bypass`.

### 🌐 Accessing the dev server from other devices (phone / tablet / LAN)

`npm run dev` prints **two** addresses:

```
- Local:    http://localhost:3000
- Network:  http://192.168.1.x:3000     <- your IP changes with DHCP!
```

**Two gotchas that look like app bugs but aren't:**

1. **"Login / Add to Cart does nothing" on the Network address.**
   Next.js blocks the client JS bundles for unlisted hosts, so the page loads but no
   JavaScript runs. Fix is already applied in `next.config.ts` via `allowedDevOrigins`,
   which uses **wildcard** patterns (`192.168.*.*`, `10.*.*.*`) so a new DHCP-assigned
   IP keeps working — you never need to edit it again. If you ever add a new option,
   remember it must be a **string** (`next.config.ts` rejects regex objects here).
   After changing `next.config.ts`, **restart** the dev server.

2. **"I get logged out when I open the home page."**
   The admin session cookie is bound to the **exact host** you logged in from. Logging in
   at `localhost:3000` and then opening `192.168.1.x:3000` (or vice-versa) sends a
   different cookie jar, so the server sees no session and redirects to `/admin/login`.

   **Fix:** pick **one** address and stay on it.
   - On this PC → use `http://localhost:3000`
   - On a phone/other device → use the `Network:` address and log in once on that device

   This is expected cookie behaviour and disappears after cloud deploy (one public domain).

> If a change looks like it "didn't take", hard-refresh with **Ctrl+Shift+R** — the browser
> caches both product photos and dev JS chunks aggressively.

### Run in production

```bash
npm run build
npm start
```

---

## 🔐 Default Admin Login

| Field    | Value                 |
| -------- | --------------------- |
| URL      | http://localhost:3000/admin |
| Email    | `admin@patilfarm.com` |
| Password | `admin123`            |

**Change the password** via `prisma/seed.mjs` (or re-seed after editing the hash) and
**change `JWT_SECRET`** in `.env` before deploying.

### 🧾 Managing stock, and accepting / rejecting orders

**Setting stock (owner only)**

Admin → **Inventory** → edit the **Stock (dozen)** box for any mango type. That is the number of
dozens available to sell. Customers see the live figure on the product card
(*"36 dozen in stock"*, *"Only 3 left!"*, or *"Sold Out"*), and the Add to Cart button is
disabled automatically when stock hits zero. Only the logged-in owner can change it.

**How stock is protected from over-commitment**

| Event | Effect on available stock |
| --- | --- |
| Customer places an order | Stock is **held** for that order straight away, so two customers can never claim the same last mango |
| Owner clicks **Accept** | Stock stays committed — the order is real and the mangoes are sold |
| Owner clicks **Reject** | Stock is **returned** to available and can be sold to someone else |

Orders beyond the available stock are refused by the database transaction itself
(*"We only have 1 dozen of Konkan Kesar left"*), so stock can never go negative.

**Accept / Reject + customer email**

Admin → **Orders** shows every order with **Accept** and **Reject** buttons while it is `PENDING`.

- **Accept** → you can paste a **payment link** (Razorpay/PayU/UPI — any http(s) URL) and an
  optional note. The customer is emailed immediately with the order details and the payment link.
  Leave the link blank to confirm without one (useful for cash/UPI collected offline).
- **Reject** → the customer is emailed that the order could not be fulfilled, and the reason you
  give. Their stock is returned to your available quantity automatically.

An order can only be decided **once** — you cannot flip an accepted order to rejected (or
double-accept it), so stock can never be settled twice. Afterwards you manage
`ACCEPTED → PROCESSING → SHIPPED → DELIVERED` and mark payment `PAID` as usual.

Customers also see the decision on their order page (`/order/MNG-2026-0001`), which shows
*"Waiting for confirmation"* while pending and a **Pay now** button once accepted.

**Enabling email delivery**

Order emails need SMTP credentials in `.env` (see `.env.example` for Gmail and Resend
examples). Until they are set the whole flow still works — the site just logs the email
to the terminal instead of sending it, and the Orders tab shows
*"customer email NOT sent"* so you know to call them instead.

<details>
<summary><b>Gmail setup (already configured on this machine)</b></summary>

Sending is live via `smtp.gmail.com` on port 587. To reproduce or change it:

1. Enable **2-Step Verification** — https://myaccount.google.com/security
   (Gmail issues App Passwords only when 2FA is on.)
2. Create an App Password — https://myaccount.google.com/apppasswords
   Google shows a 16-character password **once**; copy it without the spaces.
3. Put it in `.env`:

   ```bash
   SMTP_HOST="smtp.gmail.com"
   SMTP_PORT="587"
   SMTP_USER="your.address@gmail.com"       # must match the account the App Password came from
   SMTP_PASS="abcd efgh ijkl mnop"          # spaces are fine in .env
   MAIL_FROM="Patil Mango Farm <your.address@gmail.com>"
   OWNER_EMAIL="your.address@gmail.com"     # where new-order alerts go
   SITE_URL="http://localhost:3000"
   ```

4. Restart the dev server — `.env` is only read at startup.

Troubleshooting: `535-5.7.8 Username and Password not accepted` almost always means the
address in `SMTP_USER` doesn't match the account the App Password was generated from, or
the App Password was revoked. Regenerate at the link in step 2.

> Gmail caps sending at roughly **500 messages/day** and flags bulk mail as spam. Fine for
> a single farm shop; move to a transactional provider (Resend, Brevo, Postmark) if you
> ever outgrow it.

</details>



Placeholder images are auto-generated at `public/images/` and referenced by the products in the
database (`imageUrl`). To use your **original mango farm pictures**:

1. Drop your photos into `public/images/` (e.g. `public/images/hero-farm.jpg`,
   `public/images/devgad-alphonso.jpg`, etc.). Recommended size:
   - Hero: 1600×900 (landscape)
   - Products: square, ~800×800
2. Replace the filenames listed in the `Product.imageUrl` field (update via the admin
   **Inventory** tab / DB seed) so the site points at your real shots.

### Uploading product photos from the admin panel

You don't need to touch the DB or filenames. In **Admin → Inventory**, each product row has
an **Upload photo** button:

1. Pick a photo → it is saved to `public/images/uploads/<timestamp>-<rand>.jpg` (gitignored).
2. The product's `imageUrl` is updated automatically, and the new photo appears on that
   mango's card on the **home page** and the **catalog** page.

Notes:
- **The hero banner is separate.** Uploading a product photo does not change the big
  homepage banner (fixed `public/images/hero-farm.jpg` in `src/app/page.tsx`).
- **Accepted formats:** JPEG, PNG, WebP, GIF, AVIF — up to **10 MB**.
- JPEG uploads work even when the browser reports a non-standard type (`image/jpg`) or no
  MIME type at all (common with phone/WhatsApp/email downloads) — the server validates the
  real file bytes, not just the declared type.
- Re-uploading generates a **new filename**, so customers never see a stale cached photo.

---

## 📁 Project Structure

```
prisma/
  schema.prisma      # DB models (Product, Order, Customer, User, ServiceableArea)
  seed.mjs           # Seeds admin, serviceable pincodes, and mango products
src/
  app/
    page.tsx            # Landing page
    products/page.tsx   # Catalog
    checkout/page.tsx   # Checkout + serviceability + cart
    order/[id]/page.tsx # Order confirmation
    admin/login/...     # Owner login
    admin/page.tsx      # Admin dashboard (sales / inventory / orders)
    api/                # REST API routes (products, orders, serviceable, admin/*)
  components/
    ProductCard.tsx     # Add-to-cart card
    CartProvider.tsx    # Client cart state (localStorage)
    Navbar.tsx / Footer.tsx
    admin/AdminDashboard.tsx
  lib/
    prisma.ts           # Prisma client singleton
    auth.ts             # JWT cookie auth for admin
    cart.ts / site.ts / orders.ts
```

---

## 🌤️ Deploying to the cloud

The project is configured with `output: "standalone"` (`next.config.ts`), so it can run on any
Node host (Railway, Render, Fly.io, a VPS, or a Docker container).

- **Create a `server.js`** (or use `node .next/standalone/server.js` directly) and copy
  `public/` + `.next/static/` into the standalone folder.
- **Set environment variables**: `DATABASE_URL` and a strong `JWT_SECRET`.
- For Postgres in production, change the Prisma `datasource` provider to `postgresql` and point
  `DATABASE_URL` at your database, then run `npx prisma db push` on the server.
- Because the storefront pages read live stock, they are rendered dynamically — no stale data.

---

> **Note:** The business name, tagline, contact phone/email and WhatsApp are all defined once in
> **`src/lib/site.ts`** and used across the header, footer, page metadata, checkout and every
> customer email. Current name: **Patil Mango Farm**. Update it there and it changes everywhere.
>
> The `phone`, `whatsapp` and delivery details are still **placeholders** (`+91 98765 43210`) —
> replace them with your real numbers before launch.
 09bedaa (Initial commit)
