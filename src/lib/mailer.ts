import { createTransport, type Transporter } from 'nodemailer'
import { site } from './site'

/**
 * Outbound email for order confirmations.
 *
 * Configure SMTP via env vars (see .env.example). Works with any provider:
 *   - Gmail / Google Workspace  -> smtp.gmail.com:587  (app password)
 *   - Resend                    -> smtp.resend.com:465  (API key as password)
 *   - SendGrid / Mailgun / Brevo -> their host + username/password
 *
 * If SMTP is not configured we DO NOT throw: the order decision must still be
 * recorded. We log the full email instead so the owner can act manually, and
 * the caller gets `sent: false` to surface in the admin UI.
 */

type OrderLine = {
  productName: string
  quantity: number
  unitType: string
  price: number
}

type OrderForEmail = {
  orderNumber: string
  name: string
  email: string | null
  phone: string
  addressLine1: string | null
  addressLine2: string | null
  landmark: string | null
  city: string
  pincode: string
  totalAmount: number
  deliveryNotes: string | null
  items: OrderLine[]
}

type SendResult = {
  sent: boolean
  reason?: string
  messageId?: string
}

const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = Number(process.env.SMTP_PORT || 587)
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const MAIL_FROM = process.env.MAIL_FROM || `${site.name} <no-reply@localhost>`
const SITE_URL = process.env.SITE_URL || 'http://localhost:3000'

let transporter: Transporter | null = null

function getTransporter(): Transporter | null {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null
  if (!transporter) {
    transporter = createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
  }
  return transporter
}

export function isMailConfigured(): boolean {
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS)
}

const rupees = (n: number) =>
  '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function itemsTable(order: OrderForEmail): string {
  const rows = order.items
    .map(
      (i) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(i.productName)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${i.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #dee2e6;text-align:right;">${rupees(i.price)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #dee2e6;text-align:right;font-weight:bold;">${rupees(
          i.quantity * i.price
        )}</td>
      </tr>`
    )
    .join('')

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0;">
      <thead>
        <tr style="background:#f8f9fa;">
          <th align="left"  style="padding:8px 12px;">Item</th>
          <th align="center" style="padding:8px 12px;">Qty</th>
          <th align="right" style="padding:8px 12px;">Rate / dozen</th>
          <th align="right" style="padding:8px 12px;">Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`
}

function addressBlock(order: OrderForEmail): string {
  const lines = [
    order.addressLine1,
    order.addressLine2,
    order.landmark,
    `${order.city} - ${order.pincode}`,
  ].filter(Boolean)
  return lines
    .map((l) => escapeHtml(String(l)))
    .join('<br/>')
}

function shell(title: string, body: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
  <div style="max-width:600px;margin:0 auto;padding:24px 12px;">
    <div style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:#f59e0b;padding:20px 24px;">
        <h1 style="margin:0;font-size:20px;color:#ffffff;">${escapeHtml(site.name)}</h1>
        <p style="margin:4px 0 0;font-size:13px;color:#fef3c7;">${escapeHtml(site.tagline)}</p>
      </div>
      <div style="padding:24px;">
        <h2 style="margin:0 0 16px;font-size:18px;">${title}</h2>
        ${body}
      </div>
      <div style="padding:16px 24px;background:#fafafa;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;">
        <p style="margin:0;">Questions? Call ${escapeHtml(site.phone)} &middot; ${escapeHtml(site.email)}</p>
        <p style="margin:6px 0 0;">${escapeHtml(site.name)} &middot; ${escapeHtml(site.originRegion)}</p>
      </div>
    </div>
  </div>
</body></html>`
}

async function deliver(to: string, subject: string, html: string): Promise<SendResult> {
  const tx = getTransporter()

  if (!tx) {
    // No SMTP configured - log instead of failing the request.
    console.warn(
      `[mailer] SMTP not configured. Email NOT sent to ${to}.\n` +
        `         Subject: ${subject}\n` +
        `         Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and MAIL_FROM in .env to enable sending.`
    )
    return { sent: false, reason: 'SMTP not configured' }
  }

  try {
    const info = await tx.sendMail({
      from: MAIL_FROM,
      to,
      subject,
      html,
    })
    return { sent: true, messageId: info.messageId }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown SMTP error'
    console.error(`[mailer] Failed to send "${subject}" to ${to}: ${message}`)
    return { sent: false, reason: message }
  }
}

/** Sent to the owner when a new order arrives. */
export async function sendOrderPlacedToOwner(order: OrderForEmail) {
  const ownerEmail = process.env.OWNER_EMAIL || site.email
  const body = `
    <p>Hi, a new order has arrived on your website.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;font-size:15px;">
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Order</td>
          <td style="padding:4px 0;font-weight:bold;">${escapeHtml(order.orderNumber)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Customer</td>
          <td style="padding:4px 0;">${escapeHtml(order.name)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Phone</td>
          <td style="padding:4px 0;"><a href="tel:${escapeHtml(order.phone)}">${escapeHtml(order.phone)}</a></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Email</td>
          <td style="padding:4px 0;">${escapeHtml(order.email || '-')}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Total</td>
          <td style="padding:4px 0;font-weight:bold;">${rupees(order.totalAmount)}</td></tr>
    </table>
    ${itemsTable(order)}
    <p style="margin:16px 0;">
      <a href="${SITE_URL}/admin"
         style="display:inline-block;background:#f59e0b;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:bold;">
        Accept or Reject this order
      </a>
    </p>
    <p style="font-size:13px;color:#6b7280;">Stock for these items is reserved until you accept or reject.</p>`

  return deliver(
    ownerEmail,
    `New order ${order.orderNumber} - ${rupees(order.totalAmount)} - ${order.name}`,
    shell(`New order ${escapeHtml(order.orderNumber)}`, body)
  )
}

/** Sent to the customer when the owner ACCEPTS. Includes the payment link. */
export async function sendOrderAcceptedToCustomer(
  order: OrderForEmail,
  paymentLink: string | null,
  note: string | null
) {
  const linkBlock = paymentLink
    ? `
      <div style="margin:22px 0;padding:18px;background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;">
        <p style="margin:0 0 12px;font-weight:bold;color:#92400e;">Pay ${rupees(order.totalAmount)} to confirm your order</p>
        <a href="${escapeHtml(paymentLink)}"
           style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:13px 24px;border-radius:8px;font-weight:bold;">
          Pay now
        </a>
        <p style="margin:12px 0 0;font-size:12px;color:#92400e;word-break:break-all;">
          Or pay using this link: ${escapeHtml(paymentLink)}
        </p>
      </div>`
    : `
      <div style="margin:22px 0;padding:18px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;">
        <p style="margin:0;color:#166534;">Your order is confirmed. Total payable: <strong>${rupees(
          order.totalAmount
        )}</strong>. We will contact you with payment details shortly.</p>
      </div>`

  const noteBlock = note
    ? `<div style="margin:16px 0;padding:12px 14px;background:#f3f4f6;border-left:4px solid #9ca3af;border-radius:6px;">
         <p style="margin:0;font-size:14px;color:#374151;"><strong>Note from the farm:</strong> ${escapeHtml(note)}</p>
       </div>`
    : ''

  const body = `
    <p>Hi ${escapeHtml(order.name)},</p>
    <p>Good news &mdash; your order <strong>${escapeHtml(order.orderNumber)}</strong> has been
       <strong style="color:#16a34a;">accepted</strong> and the mangoes are reserved for you.</p>
    ${linkBlock}
    ${noteBlock}
    ${itemsTable(order)}
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 16px;font-size:15px;">
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Total</td>
          <td style="padding:4px 0;font-weight:bold;">${rupees(order.totalAmount)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Deliver to</td>
          <td style="padding:4px 0;">${addressBlock(order)}</td></tr>
    </table>
    <p style="font-size:14px;">
      <a href="${SITE_URL}/order/${encodeURIComponent(order.orderNumber)}"
         style="color:#b45309;font-weight:bold;">View your order status</a>
    </p>`

  return deliver(
    order.email as string,
    `Order ${order.orderNumber} accepted - ${site.shortName}`,
    shell(`Your order ${escapeHtml(order.orderNumber)} is accepted`, body)
  )
}

/** Sent to the customer when the owner REJECTS. */
export async function sendOrderRejectedToCustomer(
  order: OrderForEmail,
  reason: string | null
) {
  const reasonBlock = reason
    ? `<p style="margin:14px 0;">Reason: <strong>${escapeHtml(reason)}</strong></p>`
    : ''

  const body = `
    <p>Hi ${escapeHtml(order.name)},</p>
    <p>We are sorry &mdash; we could not fulfil your order
       <strong>${escapeHtml(order.orderNumber)}</strong>
       (${rupees(order.totalAmount)}).</p>
    ${reasonBlock}
    <p>Nothing has been charged. The stock held for this order has been released back,
       and you are welcome to place a new order at any time.</p>
    ${itemsTable(order)}
    <p style="margin:16px 0;">
      <a href="${SITE_URL}/products"
         style="display:inline-block;background:#f59e0b;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:bold;">
        Browse available mangoes
      </a>
    </p>
    <p style="font-size:13px;color:#6b7280;">
      If you have questions, call ${escapeHtml(site.phone)} or reply to this email.
    </p>`

  return deliver(
    order.email as string,
    `Order ${order.orderNumber} could not be fulfilled - ${site.shortName}`,
    shell(`Update on order ${escapeHtml(order.orderNumber)}`, body)
  )
}
