# IT and Device Policy

> **Draft — not reviewed by a lawyer.** Fill every `[confirm: …]` before use.

Applies to **everyone** with an account or a device — employees, interns on
every track, contractors, founders. Forms part of your agreement with us.

We run a platform that handles money and holds other people's data. Most of
what follows exists because of that, not because we enjoy rules.

---

## 1. Accounts and access

You get the access your work needs and no more. Ask when you need more; do not
route around it.

- **Everyone uses the password manager we provide.** [confirm: which one.] No
  passwords in notes, spreadsheets, chat, or code.
- **Two-factor authentication is mandatory** on every account that offers it,
  and is not optional for anything touching the admin panel, the database, the
  payment providers, the cloud console, or the code host.
- **Never share a login.** If two people need access, they get two accounts.
  Shared logins destroy the audit trail, and the audit trail is what proves who
  did what when money moved.
- Lock your screen when you step away.
- Tell us the same day if a device or credential is lost or you think something
  is compromised. **Speed matters far more than embarrassment** — nobody has
  ever been in trouble here for reporting fast.

## 2. Credentials, keys, and secrets

- Never commit a secret to the repository. If you do, treat it as leaked:
  **rotate it**, do not just delete the commit.
- Production credentials stay in the secret store, never on a laptop, never in
  chat, never in a ticket.
- Customers' **merchant credentials** are the most sensitive thing we hold. They
  are encrypted at rest and never rendered in full. Do not decrypt, export,
  screenshot, or copy them anywhere, for any reason, including debugging.
- Do not email or message a credential to anyone, including a colleague or a
  client. Use the password manager's sharing.

## 3. Production and customer data

- **Do not pull production data onto your machine.** Debug against anonymised
  or synthetic data. Where you genuinely cannot, ask first and say what you
  need and why.
- Look at a customer's data only when a task requires it. Curiosity is not a
  reason, and access is logged.
- Client production systems: take the narrowest access that does the job, and
  hand it back when the job is done.
- Never move customer or client data into a personal account, drive, or
  repository.

## 4. AI tools

We use AI coding tools and we are not precious about it. The line is what goes
**into** them.

- **Approved tools:** [confirm: list — e.g. Claude Code, and which accounts.]
  Use the company account, not your personal one.
- **Never paste in:** credentials or keys, customer or client production data,
  personal information about anyone, unreleased commercial terms, or source
  code a client has told us to keep confidential.
- Output is Work Product and belongs to the Company, like anything else you
  write — see `ip-and-confidentiality.md`.
- **You own what you ship.** "The model wrote it" is not a review. Read it,
  understand it, and be able to explain it — especially anything touching
  money, auth, or the ledger.

## 5. Devices

[confirm: whether the company issues machines or people use their own.]

**Company devices** stay ours, come back when you leave, and are for work.
Incidental personal use is fine; do not store anything personal you would mind
losing when the device is wiped.

**Your own device**, if used for work: keep the operating system and browser
updated, use full-disk encryption, set a screen lock, and do not let anyone else
use the account you work from. No work data on a device you share with family.

**All devices:** encrypted disk, screen lock, automatic updates on, and no
software from sources you do not trust.

## 6. Software

Use licensed software and respect open-source licences. If something needs a
paid licence for commercial use, we buy it — ask, do not improvise. Tell us
before adding a new dependency with an unusual licence; some of them attach
conditions to everything they touch.

## 7. Email, chat, and the company's name

- Do not use company email or accounts for personal business.
- You speak for the company only when asked to. Personal opinions online are
  yours — make clear they are yours, and do not disclose anything
  confidential.
- **Phishing:** we will never ask you for a password, and a founder will never
  message you asking you to move money or buy vouchers. When something feels
  off, check by another channel before acting. Reporting a suspicious message
  is always the right call, even if it turns out to be nothing.

## 8. Monitoring

We keep audit logs of administrative and financial actions, access logs, and
standard security logging. We look at them to investigate an incident, to meet
a legal obligation, or to fix something broken — **not to watch how you spend
your day**.

We do not read personal messages, and we do not install keystroke or screen
monitoring. Where we ever need to examine an account, we will tell you, unless
telling you would defeat an investigation into serious misconduct.

Logs are personal information and are handled under the **Individual Privacy
Act, 2075** and our Privacy Policy.

## 9. Reporting a security problem

Tell **[confirm: name / security email]** immediately. A suspected breach is
never something to sit on overnight.

If you find a vulnerability in our own systems, report it internally rather
than testing how far it goes. Do not access anyone's data to prove a point.

## 10. When you leave

All access is revoked and all devices returned — see
`offboarding-checklist.md`. Delete company material from personal devices and
accounts and confirm you have done so.

## 11. If you break this policy

We would rather fix a problem than punish one, and most breaches here are
mistakes. Say so quickly and we deal with it together. Deliberate misuse —
exporting customer data, sharing credentials, snooping — is serious misconduct
under `handbook.md`.

---

**Acknowledgement**

I have read and understood this policy.

Name: ******\_\_\_\_****** Signature: ******\_\_\_\_****** Date: **\_\_\_\_**
