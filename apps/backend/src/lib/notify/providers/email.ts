import nodemailer, { type Transporter } from "nodemailer"
import { env } from "../../../env.js"
import { asSendError, SendError, signV4, type SendResult } from "./common.js"

/*
 * Email: SMTP (any mailbox or relay) or Amazon SES over its v2 HTTPS API.
 * NOTIFY_EMAIL_PROVIDER picks one; otherwise the first configured is used.
 */

export type Email = { to: string; subject: string; text: string; html?: string }

const smtpReady = () => !!(env.SMTP_HOST && env.MAIL_FROM)
const sesReady = () => !!(env.SES_REGION && env.SES_ACCESS_KEY_ID && env.SES_SECRET_ACCESS_KEY && env.MAIL_FROM)

export function emailProvider(): "smtp" | "ses" | null {
  const chosen = env.NOTIFY_EMAIL_PROVIDER
  if (chosen === "none") return null
  if (chosen === "smtp") return smtpReady() ? "smtp" : null
  if (chosen === "ses") return sesReady() ? "ses" : null
  return smtpReady() ? "smtp" : sesReady() ? "ses" : null
}

let transport: Transporter | null = null
function smtp() {
  transport ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE === "true",
    // Without implicit TLS, STARTTLS is required: credentials never go in clear.
    requireTLS: env.SMTP_SECURE !== "true" && env.NODE_ENV === "production",
    ...(env.SMTP_USER ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS ?? "" } } : {}),
    connectionTimeout: 15_000,
    socketTimeout: 30_000,
  })
  return transport
}

export async function sendEmail(m: Email): Promise<SendResult> {
  const provider = emailProvider()
  if (!provider) throw new SendError("No email provider is configured", false)
  if (provider === "smtp") {
    try {
      const info = await smtp().sendMail({ from: env.MAIL_FROM, to: m.to, subject: m.subject, text: m.text, ...(m.html ? { html: m.html } : {}) })
      return { provider, messageId: info.messageId }
    } catch (e) {
      // SMTP replies: 5xx is a permanent refusal (bad address, rejected); 4xx and connection problems are worth retrying.
      const code = (e as { responseCode?: number }).responseCode
      throw new SendError(`SMTP: ${(e as Error).message}`, !(code && code >= 500))
    }
  }
  const host = new URL(env.SES_API_BASE ?? `https://email.${env.SES_REGION}.amazonaws.com`).host
  const base = env.SES_API_BASE ?? `https://${host}`
  const path = "/v2/email/outbound-emails"
  const body = JSON.stringify({
    FromEmailAddress: env.MAIL_FROM,
    Destination: { ToAddresses: [m.to] },
    Content: {
      Simple: {
        Subject: { Data: m.subject, Charset: "UTF-8" },
        Body: { Text: { Data: m.text, Charset: "UTF-8" }, ...(m.html ? { Html: { Data: m.html, Charset: "UTF-8" } } : {}) },
      },
    },
  })
  const headers = signV4({ method: "POST", host, path, headers: { "content-type": "application/json" }, body, region: env.SES_REGION!, service: "ses", accessKeyId: env.SES_ACCESS_KEY_ID!, secretAccessKey: env.SES_SECRET_ACCESS_KEY! })
  try {
    const res = await fetch(`${base}${path}`, { method: "POST", headers, body, signal: AbortSignal.timeout(15_000) })
    const data = (await res.json().catch(() => ({}))) as { MessageId?: string; message?: string; Message?: string }
    if (!res.ok) throw new SendError(`SES: ${data.message ?? data.Message ?? `HTTP ${res.status}`}`, res.status >= 500 || res.status === 429)
    if (!data.MessageId) throw new SendError("SES returned no message id", true)
    return { provider, messageId: data.MessageId }
  } catch (e) {
    throw e instanceof SendError ? e : asSendError(e)
  }
}
