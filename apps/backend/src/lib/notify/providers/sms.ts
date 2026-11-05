import { env } from "../../../env.js"
import { providerJson } from "../../providers/http.js"
import { asSendError, indianMobile, SendError, type SendResult } from "./common.js"

/*
 * SMS: MSG91 (Flow API with a DLT-registered template; the template's
 * variables must be named var1, var2, ... in the order of `params`) or Twilio
 * (plain text from a number or messaging service; for Indian numbers the
 * sender and text must still be DLT-registered with the operator).
 */

export type Sms = { to: string; text: string; params: string[]; msg91FlowId?: string }

const msg91Ready = () => !!env.MSG91_AUTH_KEY
const twilioReady = () => !!(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && (env.TWILIO_FROM || env.TWILIO_MESSAGING_SERVICE_SID))

export function smsProvider(): "msg91" | "twilio" | null {
  const chosen = env.NOTIFY_SMS_PROVIDER
  if (chosen === "none") return null
  if (chosen === "msg91") return msg91Ready() ? "msg91" : null
  if (chosen === "twilio") return twilioReady() ? "twilio" : null
  return msg91Ready() ? "msg91" : twilioReady() ? "twilio" : null
}

/** Whether this provider can send this message (MSG91 needs a template for the event). */
export const smsTemplateMissing = (m: Pick<Sms, "msg91FlowId">) => smsProvider() === "msg91" && !m.msg91FlowId

export async function sendSms(m: Sms): Promise<SendResult> {
  const provider = smsProvider()
  if (!provider) throw new SendError("No SMS provider is configured", false)
  const mobile = indianMobile(m.to)
  if (!mobile) throw new SendError(`Not an Indian mobile number: ${m.to}`, false)
  try {
    if (provider === "msg91") {
      if (!m.msg91FlowId) throw new SendError("No MSG91 flow id for this message", false)
      const vars = Object.fromEntries(m.params.map((v, i) => [`var${i + 1}`, v]))
      const res = await providerJson<{ type?: string; message?: string }>("MSG91", `${env.MSG91_API_BASE}/api/v5/flow`, {
        method: "POST",
        headers: { authkey: env.MSG91_AUTH_KEY! },
        body: { template_id: m.msg91FlowId, short_url: "0", recipients: [{ mobiles: mobile, ...vars }] },
      })
      // MSG91 can answer 200 with type "error".
      if (res.type !== "success") throw new SendError(`MSG91: ${res.message ?? "refused"}`, false)
      return { provider, messageId: res.message ?? "" }
    }
    const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64")
    const res = await providerJson<{ sid: string }>("Twilio", `${env.TWILIO_API_BASE}/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: "POST",
      headers: { authorization: `Basic ${auth}` },
      form: { To: `+${mobile}`, Body: m.text, ...(env.TWILIO_MESSAGING_SERVICE_SID ? { MessagingServiceSid: env.TWILIO_MESSAGING_SERVICE_SID } : { From: env.TWILIO_FROM! }) },
    })
    return { provider, messageId: res.sid }
  } catch (e) {
    throw asSendError(e)
  }
}
