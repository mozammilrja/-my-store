import { createDecipheriv, createECDH, createHash, createHmac, createVerify, generateKeyPairSync, randomBytes } from "node:crypto"
import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import { createServer as createTcpServer } from "node:net"
import type { AddressInfo } from "node:net"

/*
 * Local stand-ins for the notification providers, following each one's
 * documented request and response shapes: an SMTP server, Amazon SES v2
 * (checks the SigV4 signature), MSG91 Flow, Twilio Messages, Meta WhatsApp
 * Cloud, Gupshup, Google OAuth + FCM v1 (checks the RS256 assertion), and a
 * web push service that decrypts the RFC 8291 payload with the subscriber's
 * keys, as a browser would. They prove the requests are well-formed; they
 * don't prove the real services accept a given account or template.
 */

export type Recorded = { path: string; headers: IncomingMessage["headers"]; body: any; raw: Buffer }

export function createNotifyStub() {
  const state = {
    http: [] as Recorded[],
    mail: [] as { from: string; to: string[]; data: string; auth?: string }[],
    /** Next responses by path prefix: status codes to return instead of success, consumed in order. */
    fail: new Map<string, number[]>(),
    /** Recipients the SMTP server refuses with 550. */
    smtpReject: new Set<string>(),
    sesSecret: "ses-secret-for-tests",
    pushedPayloads: [] as unknown[],
    /** Web push subscriber keys (the "browser" side), made by `browserSubscription()`. */
    subscribers: new Map<string, { ecdh: ReturnType<typeof createECDH>; auth: Buffer }>(),
  }
  const fcmKeys = generateKeyPairSync("rsa", { modulusLength: 2048, publicKeyEncoding: { type: "spki", format: "pem" }, privateKeyEncoding: { type: "pkcs8", format: "pem" } })

  const json = (res: ServerResponse, status: number, body: unknown) => {
    res.writeHead(status, { "content-type": "application/json" })
    res.end(JSON.stringify(body))
  }
  const failNext = (path: string) => {
    for (const [prefix, codes] of state.fail) if (path.startsWith(prefix) && codes.length) return codes.shift()!
    return 0
  }

  const http = createServer(async (req, res) => {
    const chunks: Buffer[] = []
    for await (const c of req) chunks.push(c as Buffer)
    const raw = Buffer.concat(chunks)
    const url = new URL(req.url!, "http://stub")
    const type = req.headers["content-type"] ?? ""
    const body = type.includes("json") ? JSON.parse(raw.toString() || "{}") : type.includes("urlencoded") ? Object.fromEntries(new URLSearchParams(raw.toString())) : null
    state.http.push({ path: url.pathname, headers: req.headers, body, raw })
    const forced = failNext(url.pathname)
    if (forced) return json(res, forced, { message: `forced ${forced}`, error: { message: `forced ${forced}` } })

    // MSG91 Flow
    if (url.pathname === "/api/v5/flow") {
      if (!req.headers.authkey) return json(res, 401, { type: "error", message: "Authentication failure" })
      return json(res, 200, { type: "success", message: `msg91-${randomBytes(6).toString("hex")}` })
    }
    // Twilio
    if (/^\/2010-04-01\/Accounts\/[^/]+\/Messages\.json$/.test(url.pathname)) {
      if (!String(req.headers.authorization).startsWith("Basic ")) return json(res, 401, { code: 20003, message: "Authenticate" })
      return json(res, 201, { sid: `SM${randomBytes(16).toString("hex")}`, status: "queued" })
    }
    // Meta WhatsApp Cloud
    if (/^\/v\d+\.\d+\/[^/]+\/messages$/.test(url.pathname)) {
      if (body?.messaging_product !== "whatsapp" || body?.type !== "template") return json(res, 400, { error: { message: "Invalid parameter", code: 100 } })
      return json(res, 200, { messaging_product: "whatsapp", contacts: [{ input: body.to, wa_id: body.to }], messages: [{ id: `wamid.${randomBytes(8).toString("hex")}` }] })
    }
    // Gupshup
    if (url.pathname === "/wa/api/v1/template/msg") {
      if (!req.headers.apikey) return json(res, 401, { status: "error", message: "Authentication Failed" })
      return json(res, 202, { status: "submitted", messageId: randomBytes(8).toString("hex") })
    }
    // Amazon SES v2: the signature must verify with the shared secret.
    if (url.pathname === "/v2/email/outbound-emails") {
      const auth = String(req.headers.authorization ?? "")
      const m = /Credential=([^/]+)\/(\d{8})\/([^/]+)\/ses\/aws4_request, SignedHeaders=([^,]+), Signature=([0-9a-f]+)/.exec(auth)
      if (!m) return json(res, 403, { message: "Missing Authentication Token" })
      const [, , day, region, signed, signature] = m
      const names = signed!.split(";")
      const canonical = ["POST", url.pathname, "", ...names.map((n) => `${n}:${String(req.headers[n]).trim()}`), "", signed, createHash("sha256").update(raw).digest("hex")].join("\n")
      const scope = `${day}/${region}/ses/aws4_request`
      const toSign = ["AWS4-HMAC-SHA256", String(req.headers["x-amz-date"]), scope, createHash("sha256").update(canonical).digest("hex")].join("\n")
      const h = (k: string | Buffer, d: string) => createHmac("sha256", k).update(d).digest()
      const key = h(h(h(h(`AWS4${state.sesSecret}`, day!), region!), "ses"), "aws4_request")
      if (createHmac("sha256", key).update(toSign).digest("hex") !== signature) return json(res, 403, { message: "The request signature we calculated does not match the signature you provided." })
      return json(res, 200, { MessageId: `ses-${randomBytes(8).toString("hex")}` })
    }
    // Google OAuth (service-account JWT bearer) and FCM v1
    if (url.pathname === "/token") {
      const [h, p, s] = String(body?.assertion ?? "").split(".")
      const ok = h && p && s && createVerify("RSA-SHA256").update(`${h}.${p}`).verify(fcmKeys.publicKey, Buffer.from(s, "base64url"))
      if (body?.grant_type !== "urn:ietf:params:oauth:grant-type:jwt-bearer" || !ok) return json(res, 400, { error: "invalid_grant" })
      return json(res, 200, { access_token: "ya29.stub", expires_in: 3600, token_type: "Bearer" })
    }
    if (/^\/v1\/projects\/[^/]+\/messages:send$/.test(url.pathname)) {
      if (req.headers.authorization !== "Bearer ya29.stub") return json(res, 401, { error: { message: "Request had invalid authentication credentials." } })
      if (String(body?.message?.token).startsWith("gone-")) return json(res, 404, { error: { code: 404, message: "Requested entity was not found.", status: "NOT_FOUND", details: [{ errorCode: "UNREGISTERED" }] } })
      return json(res, 200, { name: `projects/stub/messages/${randomBytes(6).toString("hex")}` })
    }
    // Web push service: decrypt like the browser would.
    const sub = /^\/push\/(.+)$/.exec(url.pathname)
    if (sub) {
      const s = state.subscribers.get(sub[1]!)
      if (!s) return json(res, 410, { reason: "unsubscribed" })
      if (!String(req.headers.authorization).startsWith("vapid t=") || req.headers["content-encoding"] !== "aes128gcm") return json(res, 400, { reason: "bad request" })
      state.pushedPayloads.push(JSON.parse(decryptPush(raw, s.ecdh, s.auth)))
      res.writeHead(201, { location: `/push/${sub[1]}/msg-${randomBytes(4).toString("hex")}` })
      return res.end()
    }
    json(res, 404, { message: "Not found" })
  })

  // A small SMTP server: enough of RFC 5321 for nodemailer (EHLO, AUTH PLAIN/LOGIN, MAIL, RCPT, DATA, QUIT).
  const smtp = createTcpServer((socket) => {
    let mail: { from: string; to: string[]; data: string; auth?: string } = { from: "", to: [], data: "" }
    let inData = false
    let loginStep = 0
    let buffer = ""
    const say = (line: string) => socket.write(`${line}\r\n`)
    say("220 stub.smtp ESMTP ready")
    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8")
      while (true) {
        if (inData) {
          const end = buffer.indexOf("\r\n.\r\n")
          if (end < 0) return
          mail.data += buffer.slice(0, end)
          buffer = buffer.slice(end + 5)
          inData = false
          state.mail.push(mail)
          say(`250 OK queued as stub-${randomBytes(4).toString("hex")}`)
          mail = { from: "", to: [], data: "", ...(mail.auth ? { auth: mail.auth } : {}) }
          continue
        }
        const nl = buffer.indexOf("\r\n")
        if (nl < 0) return
        const line = buffer.slice(0, nl)
        buffer = buffer.slice(nl + 2)
        const cmd = line.toUpperCase()
        if (loginStep === 1) {
          loginStep = 2
          mail.auth = Buffer.from(line, "base64").toString()
          say("334 UGFzc3dvcmQ6")
        } else if (loginStep === 2) {
          loginStep = 0
          say("235 2.7.0 Authentication successful")
        } else if (cmd.startsWith("EHLO")) {
          socket.write("250-stub.smtp\r\n250-AUTH PLAIN LOGIN\r\n250 8BITMIME\r\n")
        } else if (cmd.startsWith("HELO")) say("250 stub.smtp")
        else if (cmd.startsWith("AUTH PLAIN")) {
          mail.auth = Buffer.from(line.split(" ")[2] ?? "", "base64").toString().split("\0")[1]
          say("235 2.7.0 Authentication successful")
        } else if (cmd.startsWith("AUTH LOGIN")) {
          loginStep = 1
          say("334 VXNlcm5hbWU6")
        } else if (cmd.startsWith("MAIL FROM:")) {
          mail.from = line.slice(10).replace(/[<>]/g, "").split(" ")[0]!
          say("250 OK")
        } else if (cmd.startsWith("RCPT TO:")) {
          const to = line.slice(8).replace(/[<>]/g, "").trim()
          if (state.smtpReject.has(to)) say("550 5.1.1 Mailbox unavailable")
          else {
            mail.to.push(to)
            say("250 OK")
          }
        } else if (cmd === "DATA") {
          inData = true
          say("354 End data with <CR><LF>.<CR><LF>")
        } else if (cmd === "QUIT") {
          say("221 Bye")
          socket.end()
        } else if (cmd === "RSET" || cmd === "NOOP") say("250 OK")
        else say("502 Command not implemented")
      }
    })
    socket.on("error", () => {})
  })

  return {
    state,
    fcmPrivateKey: fcmKeys.privateKey,
    async start() {
      await new Promise<void>((r) => http.listen(0, "127.0.0.1", r))
      await new Promise<void>((r) => smtp.listen(0, "127.0.0.1", r))
      return { url: `http://127.0.0.1:${(http.address() as AddressInfo).port}`, smtpPort: (smtp.address() as AddressInfo).port }
    },
    close: () => Promise.all([new Promise<void>((r) => http.close(() => r())), new Promise<void>((r) => smtp.close(() => r()))]),
    /** A browser's push subscription at this stub: its endpoint and the keys the server encrypts to. */
    browserSubscription(base: string, id: string) {
      const ecdh = createECDH("prime256v1")
      ecdh.generateKeys()
      const auth = randomBytes(16)
      state.subscribers.set(id, { ecdh, auth })
      return { endpoint: `${base}/push/${id}`, keys: { p256dh: ecdh.getPublicKey().toString("base64url"), auth: auth.toString("base64url") } }
    },
    recorded: (prefix: string) => state.http.filter((r) => r.path.startsWith(prefix)),
  }
}

/** RFC 8291 / RFC 8188 (aes128gcm) decryption on the user agent's side. */
function decryptPush(body: Buffer, ua: ReturnType<typeof createECDH>, authSecret: Buffer) {
  const salt = body.subarray(0, 16)
  const idlen = body[20]!
  const asPublic = body.subarray(21, 21 + idlen)
  const ciphertext = body.subarray(21 + idlen)
  const hmac = (key: Buffer, data: Buffer) => createHmac("sha256", new Uint8Array(key)).update(new Uint8Array(data)).digest()
  const ecdhSecret = ua.computeSecret(new Uint8Array(asPublic))
  const prkKey = hmac(authSecret, ecdhSecret)
  const keyInfo = Buffer.concat([Buffer.from("WebPush: info\0"), ua.getPublicKey(), asPublic, Buffer.from([1])].map((b) => new Uint8Array(b)))
  const ikm = hmac(prkKey, keyInfo)
  const prk = hmac(salt, ikm)
  const cek = hmac(prk, Buffer.from("Content-Encoding: aes128gcm\0\x01", "binary")).subarray(0, 16)
  const nonce = hmac(prk, Buffer.from("Content-Encoding: nonce\0\x01", "binary")).subarray(0, 12)
  const decipher = createDecipheriv("aes-128-gcm", new Uint8Array(cek), new Uint8Array(nonce))
  decipher.setAuthTag(new Uint8Array(ciphertext.subarray(ciphertext.length - 16)))
  const plain = Buffer.concat([decipher.update(new Uint8Array(ciphertext.subarray(0, ciphertext.length - 16))), decipher.final()].map((b) => new Uint8Array(b)))
  // Last record: content, then the 0x02 delimiter, then zero padding.
  let end = plain.length - 1
  while (end >= 0 && plain[end] === 0) end--
  return plain.subarray(0, end).toString("utf8")
}
