import { env } from "../../../env.js"
import { providerJson } from "../../providers/http.js"
import { asSendError, indianMobile, SendError, type SendResult } from "./common.js"

/*
 * WhatsApp business messages, always from a pre-approved template (free-form
 * messages are allowed only inside a customer-opened 24-hour window, which
 * order updates aren't). Meta's Cloud API directly, or Gupshup.
 */

export type WhatsApp = { to: string; params: string[]; template?: { name: string; language: string }; gupshupTemplateId?: string }

const metaReady = () => !!(env.WHATSAPP_META_TOKEN && env.WHATSAPP_META_PHONE_NUMBER_ID)
const gupshupReady = () => !!(env.GUPSHUP_API_KEY && env.GUPSHUP_SOURCE && env.GUPSHUP_APP_NAME)

export function whatsappProvider(): "meta" | "gupshup" | null {
  const chosen = env.NOTIFY_WHATSAPP_PROVIDER
  if (chosen === "none") return null
  if (chosen === "meta") return metaReady() ? "meta" : null
  if (chosen === "gupshup") return gupshupReady() ? "gupshup" : null
  return metaReady() ? "meta" : gupshupReady() ? "gupshup" : null
}

export const whatsappTemplateMissing = (m: Pick<WhatsApp, "template" | "gupshupTemplateId">) => {
  const p = whatsappProvider()
  return (p === "meta" && !m.template) || (p === "gupshup" && !m.gupshupTemplateId)
}

export async function sendWhatsApp(m: WhatsApp): Promise<SendResult> {
  const provider = whatsappProvider()
  if (!provider) throw new SendError("No WhatsApp provider is configured", false)
  const to = indianMobile(m.to)
  if (!to) throw new SendError(`Not an Indian mobile number: ${m.to}`, false)
  try {
    if (provider === "meta") {
      if (!m.template) throw new SendError("No approved WhatsApp template for this message", false)
      const res = await providerJson<{ messages?: { id: string }[] }>("WhatsApp", `${env.WHATSAPP_META_API_BASE}/${env.WHATSAPP_META_API_VERSION}/${env.WHATSAPP_META_PHONE_NUMBER_ID}/messages`, {
        method: "POST",
        headers: { authorization: `Bearer ${env.WHATSAPP_META_TOKEN}` },
        body: {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "template",
          template: { name: m.template.name, language: { code: m.template.language }, components: m.params.length ? [{ type: "body", parameters: m.params.map((text) => ({ type: "text", text })) }] : [] },
        },
      })
      const id = res.messages?.[0]?.id
      if (!id) throw new SendError("WhatsApp returned no message id", true)
      return { provider, messageId: id }
    }
    if (!m.gupshupTemplateId) throw new SendError("No Gupshup template for this message", false)
    const res = await providerJson<{ status?: string; messageId?: string; message?: string }>("Gupshup", `${env.GUPSHUP_API_BASE}/wa/api/v1/template/msg`, {
      method: "POST",
      headers: { apikey: env.GUPSHUP_API_KEY! },
      form: { channel: "whatsapp", source: env.GUPSHUP_SOURCE!, destination: to, "src.name": env.GUPSHUP_APP_NAME!, template: JSON.stringify({ id: m.gupshupTemplateId, params: m.params }) },
    })
    if (res.status !== "submitted" || !res.messageId) throw new SendError(`Gupshup: ${res.message ?? res.status ?? "refused"}`, false)
    return { provider, messageId: res.messageId }
  } catch (e) {
    throw asSendError(e)
  }
}
