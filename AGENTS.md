cat << 'EOF' > AGENTS.md

\# AGENTS.md - Local Mango E-Commerce \& Management Application Development Agent



\## 1. Executive Overview \& Agent Role



You are an expert Full-Stack AI Software Engineering Agent specializing in local e-commerce and inventory management solutions. Your task is to build a modern, high-converting, mobile-responsive web application for a local \*\*Mango Seller\*\* delivering fresh, farm-direct mangoes (e.g., Alphonso, Kesar, Dasheri) to nearby cities.



\### Key Business Goals:

\- \*\*Local Delivery Restriction:\*\* Serve customers within specific serviceable cities/pincodes.

\- \*\*Seamless Order Flow:\*\* Capture Customer Name, Delivery Address, Mobile Number, and Crate/Weight quantity.

\- \*\*Inventory Protection:\*\* Prevent overselling by strictly blocking orders if requested stock exceeds current available dozens.

\- \*\*Secure Backend Database:\*\* Store customer profiles, orders, addresses, product inventories, and transaction histories.

\- \*\*Online Payment Integration:\*\* Secure checkout supporting UPI, Credit/Debit Cards, Net Banking, and Digital Wallets (e.g., Razorpay/Stripe).

\- \*\*Instant Order Confirmation:\*\* Visual order confirmation page + automated SMS/WhatsApp/Email receipt.

\- \*\*Admin Dashboard \& Management:\*\* Secure farm owner portal to manage stock in dozens, update order statuses, track paid vs. unpaid orders, and analyze yearly sales.



\---



\## 2. Technical Architecture \& Recommended Tech Stack



| Layer | Technology Choice | Rationale |

| :--- | :--- | :--- |

| \*\*Frontend\*\* | React / Next.js (App Router) + Tailwind CSS + Lucide Icons | Fast page loads, server-side rendering, excellent mobile UX. |

| \*\*Backend API\*\* | Node.js (Express) or Next.js Server Actions / API Routes | Clean separation of concerns, native async processing. |

| \*\*Database\*\* | PostgreSQL / SQLite (via Prisma ORM or Drizzle) | Structured relational schema with transaction safety for orders and atomic stock updates. |

| \*\*Authentication\*\* | NextAuth.js / Auth0 / JWT Sessions | Secure admin login with password hashing (bcrypt) and protected routes. |

| \*\*Payment Gateway\*\*| Razorpay (India) / Stripe | Native support for local payment options (UPI, NetBanking, Cards). |

| \*\*Notifications\*\* | Twilio / Interakt (WhatsApp API) / Nodemailer | Immediate order status alerts via SMS/WhatsApp/Email. |



\---



\## 3. Key Feature Specifications \& User Requirements



\### A. Location \& Serviceability Verification

\- Prominent location checker on landing page and checkout.

\- Restrict orders to selected cities/pincodes (e.g., Pune, Mumbai, Thane, Navi Mumbai).

\- Clear alert when a user inputs an unserviceable area.



\### B. Product Catalog \& Strict Stock Verification

\- Display available mango varieties (e.g., Devgad Alphonso, Ratnagiri Alphonso, Kesar).

\- Quantity choices in Dozens (1 Dozen, 2 Dozen, 5 Dozen crate) or Kilograms (3kg, 5kg, 10kg box).

\- \*\*Strict Availability Check:\*\* Check available stock (in dozens) before adding to cart and during checkout creation. 

\- \*\*Oversell Prevention:\*\* If available inventory is lower than the requested quantity, disable checkout, display an "Out of Stock" / "Insufficient Stock Available" alert, and block payment generation to prevent false commitments.



\### C. Checkout \& Shipping Details Form

Capture and strictly validate the following fields:

1\. \*\*Full Name:\*\* Required, min 3 characters.

2\. \*\*Mobile Number:\*\* Required, 10-digit phone validation (formatted for local region).

3\. \*\*Shipping Address:\*\* Street address, landmark, building/flat no.

4\. \*\*City \& Pincode:\*\* Dropdown or validated text input matching serviceable list.

5\. \*\*Delivery Notes (Optional):\*\* Gate instructions, delivery timing preference.



\### D. Payment Gateway Flow

\- Check available product stock within a database transaction before initiating payment.

\- Secure server-side order creation before triggering client payment modal.

\- Webhook listener to confirm payment completion asynchronously and update `PaymentStatus` (`PAID` / `UNPAID`).

\- Automatic failure handling and retry options.



\### E. Post-Order Confirmation System

\- Immediate redirection to an \*\*Order Success Page\*\* showing:

&#x20; - Unique Order ID

&#x20; - Order Summary (Items, Quantity, Total Amount Paid)

&#x20; - Estimated Delivery Date

&#x20; - Delivery Address \& Customer Contact Info

\- Trigger background notification (SMS/Email/WhatsApp) with receipt details.



\### F. Admin Portal \& Dashboard (Owner Access)

\- \*\*Secure Authentication:\*\* Protected route access (`/admin/\*`) via encrypted session/JWT login for the farm owner.

\- \*\*Yearly Order Breakdown:\*\* Filter and view historical order records filtered by year (e.g., 2024, 2025, 2026).

\- \*\*Order \& Delivery Status Tracking:\*\* View and update fulfillment statuses:

&#x20; - `Order Status`: PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED.

&#x20; - Quick tab view for \*\*In-Progress\*\* vs. \*\*Delivered\*\* orders.

\- \*\*Payment Status Overview:\*\* Filter and track orders by payment state (`PAID` vs. `UNPAID` / `PENDING`).

\- \*\*Product Inventory \& Stock Management:\*\* 

&#x20; - Update available stock quantity (in Dozens) per variety in real-time.

&#x20; - Enable/disable product visibility based on seasonal availability.

&#x20; - Update unit prices per dozen/crate.



\---



\## 4. Backend Database Schema Design



```prisma

// Prisma Schema Representation



datasource db {

&#x20; provider = "postgresql" // or "sqlite"

&#x20; url      = env("DATABASE\_URL")

}



generator client {

&#x20; provider = "prisma-client-js"

}



enum Role {

&#x20; USER

&#x20; ADMIN

}



model User {

&#x20; id        String   @id @default(uuid())

&#x20; email     String   @unique

&#x20; password  String   // Hashed password for Admin

&#x20; name      String

&#x20; role      Role     @default(ADMIN)

&#x20; createdAt DateTime @default(now())

}



model Customer {

&#x20; id        String   @id @default(uuid())

&#x20; name      String

&#x20; phone     String   @unique

&#x20; email     String?

&#x20; createdAt DateTime @default(now())

&#x20; orders    Order\[]

}



model Address {

&#x20; id           String   @id @default(uuid())

&#x20; customerId   String

&#x20; addressLine1 String

&#x20; addressLine2 String?

&#x20; landmark     String?

&#x20; city         String

&#x20; pincode      String

&#x20; orders       Order\[]

}



model Product {

&#x20; id             String      @id @default(uuid())

&#x20; name           String

&#x20; description    String

&#x20; unitType       String      // e.g., "Dozen", "5kg Box"

&#x20; price          Float

&#x20; stockInDozens  Int         @default(0) // Available quantity in dozens

&#x20; isActive       Boolean     @default(true)

&#x20; imageUrl       String

&#x20; orderItems     OrderItem\[]

&#x20; createdAt      DateTime    @default(now())

&#x20; updatedAt      DateTime    @updatedAt

}



enum OrderStatus {

&#x20; PENDING

&#x20; PROCESSING

&#x20; IN\_PROGRESS

&#x20; SHIPPED

&#x20; DELIVERED

&#x20; CANCELLED

}



enum PaymentStatus {

&#x20; UNPAID

&#x20; PAID

&#x20; FAILED

&#x20; REFUNDED

}



model Order {

&#x20; id            String        @id @default(uuid())

&#x20; orderNumber   String        @unique // Human readable e.g., MNG-2026-001

&#x20; customerId    String

&#x20; customer      Customer      @relation(fields: \[customerId], references: \[id])

&#x20; addressId     String

&#x20; shippingAddress Address     @relation(fields: \[addressId], references: \[id])

&#x20; totalAmount   Float

&#x20; status        OrderStatus   @default(PENDING)

&#x20; paymentStatus PaymentStatus @default(UNPAID)

&#x20; paymentId     String?       // Gateway Payment ID

&#x20; paymentOrder  String?       // Gateway Order ID

&#x20; items         OrderItem\[]

&#x20; orderYear     Int           // Indexed year for easy filtering (e.g., 2026)

&#x20; createdAt     DateTime      @default(now())

&#x20; updatedAt     DateTime      @updatedAt

}



model OrderItem {

&#x20; id        String  @id @default(uuid())

&#x20; orderId   String

&#x20; order     Order   @relation(fields: \[orderId], references: \[id])

&#x20; productId String

&#x20; product   Product @relation(fields: \[productId], references: \[id])

&#x20; quantity  Int     // Quantity in dozens

&#x20; price     Float   // Historical price per dozen at purchase

}


<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
