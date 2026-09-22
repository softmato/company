# Fonepay — Checkout by Fonepay (Nabil Bank)

Start here when implementing the Fonepay integration. Everything the bank sent sits
beside this file **on the founder's machine only** (gitignored): this repo is public,
and the bank's documents carry working sample credentials. This file is what was
learned from them.

## Files

| File                                             | What it is                                                                                                                                                   |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `fonepay-checkout-api.pdf` / `.txt`              | "Checkout Intent Flow" API doc v1.10 (May 2026). The `.txt` is a `pdftotext -layout` extraction — read that, the PDF tool here can't render pages.           |
| `fonepay-checkout-brand-guidelines.pdf` / `.txt` | Brand rules for the checkout UI. Mostly images; the `.txt` has the rules.                                                                                    |
| `fonepay-postman-collection.json`                | Fonepay's Postman collection. `username`, `password`, `privateKey`, `accessToken` were **blanked** before committing — fill them locally, never commit them. |

## Status (2026-09-21)

1. ☑ RSA key pair generated and verified (below).
2. ☑ Bank issued our merchant login (in Bitwarden), terminal `2222040021755313`.
3. ☑ Adapter built — `packages/payment-core/providers/fonepay/`. Login, signed
   QR generation, bank list and status were run against the dev gateway with
   the sample merchant before a line was written.
4. ☐ Confirm which host our login belongs to (dev, or production — then the bank
   must also give the production base URL for `FONEPAY_LIVE_BASE_URL`).
5. ☐ One real payment end to end (needs a person with a banking app).

Config: `FONEPAY_*` in `.env.example`. Learned on the wire, not in the PDF:
the QR call answers **202**; a fresh, unscanned QR's status is **`timeout`**
("Data not found.") — treated as pending, never as expired; an unknown
reference label is a **500**; the bank list ignores the signature; dev bank
icons are relative paths (dropped).

**Use `qrType: "DYNAMIC_QR"`, not the documented `INTENT_QR`.** On production an
INTENT_QR scan fails in eSewa and every bank app tried ("internal server error"):
it adds `26-11 = 15` and a `62-10` token that issuer scanners reject. DYNAMIC_QR
(same endpoint, same fields) scanned and paid — NPR 1, trace `1296830344`,
status `success`, `totalTransactionAmount: "1.00"` (2026-09-21). An unknown
`qrType` is a 400 "Invalid QR type". Deep links still use the same payload and
are not yet tried on a phone.

**No scan signal.** Scanning our DYNAMIC_QR in eSewa (2026-09-21) sent nothing on
the WebSocket and left the status at `timeout` — Fonepay only signals the payment
itself. The FoneBiz portal's live view uses its own channel.

**The socket is late and single-delivery; the page polls instead.** Captured on
one NPR 1 payment (2026-09-21, trace `1296837507`): the status API said `success`
~2 s after payment; the socket message came ~16 s after, and reached only one of
three listeners on the same URL. So the checkout polls the status every 3 s
(while visible) and the socket only hurries a check. The message, verbatim shape:

```json
{
  "merchantId": "2222040021755313",
  "deviceId": "433ea55d-…",
  "transactionStatus": "{\"traceId\":1296837507,\"remarks1\":\"INV-2000\",\"transactionDate\":\"Sep 21, 2026, 11:04:08 PM\",\"productNumber\":\"<referenceLabel>\",\"amount\":1,\"message\":\"RES000\",\"success\":true,\"commissionType\":\"Charge\",\"commissionAmount\":0.0,\"totalCalculatedAmount\":1,\"paymentSuccess\":true}",
  "socketUrl": "ws://ws.fonepay.com/merchantEndPoint/<deviceId>/<terminal>/N"
}
```

An unpaid QR's status already carries `totalTransactionAmount: "1"`; only trust
it once `paymentStatus` is `success`.

## Our key

- **Private key** — never in this repo. Stored in Bitwarden, item
  _"Fonepay Checkout – private key (Nabil Bank)"_, and locally at
  `C:\Users\Aanand\.fonepay\fonepay_private_key.pem`. RSA 2048, PKCS#8, unencrypted PEM.
  At runtime it comes from a server secret env var (base64 PKCS#8, no PEM headers,
  same shape as the collection's `privateKey`).
- **Public key** (what the bank has) — base64 SPKI DER, no headers:

```
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvg3896JXlW6z7lAQ7Ta2Daa7zTeNlvlZ9UWGZn16vXJ3m44OTiLMmfZANVJuAs4HMmDKlsgquBh0pcFT3y0XqlQBjNE1dQbuCpJEFhciZFWKEnCyY4e2S7c/tE2ycVmq+lZAXaoLn/Yt2MDGm1yL4gxJRfzrJPVGaAJJa34gemqDODC732bmZXCpKVmbxwKGtuXazMaWyvRjqxQFcwMTW4yfm1tKbVXh7pGi/wch9LmcRGUoFTw5wj7hxrcqMnTEePtiBvS7wWKyPLk/q8p+lveaH3rCIRch1d4O4MkbbifMh9r/x0jtEk/BPJ/tWoaZRnWPMNqxZVRP+44z7zkc8QIDAQAB
```

Verified: deriving the public key from the doc's sample private key reproduces the
doc's sample public key exactly (so this is the format they want), and the doc's
sample signature recovers to a PKCS#1 v1.5 SHA-256 DigestInfo. A Node
`crypto.sign("sha256", body, privateKey)` round trip verifies against the public key above.

**The sample private key, `labasam` login and token printed in the doc/collection
are public. Never use them for anything real.**

## Protocol

Base = `{baseUrl}{basePath}`. Dev from the collection:
`https://dev-external-gateway-new.fonepay.com/merchantThirdparty` +
`/api/merchant/third-party/v2`. (The doc's curl examples use
`uat-new-merchant-api.fonepay.com` and say they may not work.) Production base URL
comes from the bank.

Every call carries:

- `Content-Type: application/json`
- `signature: base64(RSA-SHA256(request body))` — sign the **exact bytes sent**.
  Serialize once, sign that string, send that string. The doc's sample signature
  matched none of the obvious whitespace layouts of its sample JSON, so never
  re-serialize after signing.
- `Authorization` — see each endpoint.

| Step           | Call                                                                                                                                  | Notes                                                                                                                                                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Login          | `POST /login` body `{"username","password"}`, `Authorization: Basic base64(user:pass)` + signature                                    | Returns `accessToken` **already prefixed** `"Bearer …"` — send as-is, don't add another prefix. Also `refreshToken`, `expiresIn: 3600` (seconds). Cache and reuse.                                                              |
| Bank list      | `GET /banks/list`, headers `paymentMode: INTENT`, optional `mobileNo`, `Authorization: <accessToken>`, signature (doc marks optional) | Returns `bankDetails[]`: `bankName`, `bankCode`, `bankIcon`, `packageName` (Android), `intentScheme` (e.g. `LXBLNPKA://payment`). What a GET's signature covers is unspecified — ask Fonepay.                                   |
| Create payment | `POST /generate-intent-qr` body `{amount, billId, terminalId, paymentMode:"QR", referenceLabel, qrType:"INTENT_QR"}`                  | Returns `qrString`, `qrMessage`, `prn` (= referenceLabel), `websocketId` (wss URL), `qrDisplayName`, `fonepayPanNumber`. 409 on duplicate `referenceLabel`, 400 on validation.                                                  |
| Status         | `POST /thirdPartyDynamicQrGetStatus` body `{terminalId, referenceLabel}`                                                              | `paymentStatus`: `success` / `pending` / `failed`; `fonepayTraceId`, `requestedAmount`, `totalTransactionAmount`. 409 = terminal not found. **This is the source of truth** — call it server-side before marking anything paid. |

Validation: `amount` 1–9,999,999; `referenceLabel` alphanumeric only, ≤30 chars,
unique per transaction; `terminalId` ≤16; `qrType` fixed `INTENT_QR`. A QR is single-use.

### Flows

- **Desktop web** — show `qrString` as a QR; open the `websocketId` socket and wait.
- **Mobile (web or app)** — fetch bank list, user picks a bank, open the socket, then
  deep link `{intentScheme}/?qrPayload={qrMessage}` (doc format:
  `(Issuer Swift Code)://payment/?qrPayload=…`). On Android set the intent's
  package to the bank's `packageName`.
- **WebSocket** messages carry `transactionStatus` as a JSON _string_: first a
  `QRVerified` message, then one with `paymentSuccess`. Treat the socket as a hint
  only — on any message, or if none arrives, call the Status API.

## Brand rules (from the guidelines)

- Always written "Checkout by Fonepay". Logo min height 35 px desktop, 30 px in app;
  clearspace = height of the "o"; no recolouring, stretching, outlines or gradients.
- Desktop QR screen: Fonepay network mark before the logo, logo centred over the QR,
  **Check Status** button in Fonepay red `#ce2027`, how-to-pay steps.
- Bank list: search bar at the top; logos not stretched.
- Missing bank app error: "Your selected mobile banking app or wallet isn't
  available right now. Please choose another BFI option to continue your payment."

## Cautions

- One integrator reported that Fonepay's dev environment moves real money. This is
  unconfirmed. Ask the bank before making any test payment.
- `*.pem` is not in `.gitignore`. Never copy the key file into this repo.
