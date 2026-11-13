# REVORA business and finance working plan

Status: planning draft. Prices below preserve the existing website decisions. Manufacturing figures are working assumptions until supplier quotes and measured print data replace them. Indian tax, privacy, payment, and registration steps must be checked with a chartered accountant or qualified adviser before launch.

## 1. Offer and pricing

Keep software subscriptions separate from the physical hardware invoice.

| Plan | Monthly price | Intended scope | Guardrail |
|---|---:|---|---|
| Starter | ₹499 | One location, one active stand, NFC + QR, feedback flow, basic dashboard | Hardware, delivery and taxes billed separately |
| Growth | ₹999 | Up to three active stands, private issue routing, branding and fuller analytics | Hardware billed per stand; define one business/location limit |
| Managed | ₹2,499 | Custom stand count, monthly report and assisted setup | Replace “unlimited hardware” with a fair-use/custom quantity; define support hours |

The subscription pays for the software, dashboard, hosting, maintenance, analytics, support and ongoing updates. A one-time hardware/setup charge protects cash flow and pays for production before the monthly revenue arrives.

Working hardware prices to test:

- Standard stand: ₹1,499 one time, plus delivery and tax if applicable.
- Custom-branded stand: ₹1,999 one time, plus delivery and tax if applicable.
- Replacement or extra stand: price after the first measured production batch.

Do not advertise a hardware price until the first ten prototypes establish the real cost and failure rate.

## 2. Manufacturing cost model

Current product direction: opaque black PETG card, metallic-silver painted PETG base, embedded NFC tag, printed full-face graphic or direct print, optional retaining magnets/steel discs, and non-slip feet.

| Cost item | Low estimate | Working estimate | High estimate |
|---|---:|---:|---:|
| PETG filament | ₹160 | ₹240 | ₹340 |
| Printer electricity, wear and failed-print allowance | ₹60 | ₹120 | ₹200 |
| NFC tag | ₹18 | ₹35 | ₹60 |
| Printed face/label and protective finish | ₹20 | ₹40 | ₹90 |
| Primer, silver paint and clear coat | ₹35 | ₹80 | ₹140 |
| Magnets, steel discs, adhesive and feet | ₹25 | ₹55 | ₹100 |
| Finishing, assembly and quality-check labour | ₹100 | ₹180 | ₹300 |
| Packaging | ₹40 | ₹75 | ₹130 |
| Production wastage/returns reserve | ₹55 | ₹90 | ₹160 |
| **Estimated cost per stand before delivery** | **₹513** | **₹915** | **₹1,520** |

The working estimate is deliberately cautious. Replace it using this formula after printing prototypes:

`material grams × filament cost per gram + machine hours × machine-hour cost + bought parts + finishing labour + packaging + wastage reserve`

Record for every prototype: PETG grams, print hours, failed prints, preparation time, finishing time, NFC failure rate, label/UV-print price, packaging and delivery.

At ₹1,499, a ₹915 build has a ₹584 gross hardware contribution before delivery, tax, payment fees, acquisition and warranty replacements. A custom ₹1,999 unit provides more room for design/setup labour. If the measured cost stays above ₹1,000, raise the hardware price or simplify production before selling at scale.

## 3. Subscription contribution model

Planning assumption: online collection costs roughly 2% plus GST on the gateway fee. Confirm the actual gateway quote. Approximate receipts before software/support costs:

| Plan | Customer pays | Approx. payment fee | Approx. receipt |
|---|---:|---:|---:|
| Starter | ₹499 | ₹12 | ₹487 |
| Growth | ₹999 | ₹24 | ₹975 |
| Managed | ₹2,499 | ₹59 | ₹2,440 |

Suggested internal monthly cost allowances per account for hosting, messages, support and expected refunds: Starter ₹100, Growth ₹200, Managed ₹700. This produces provisional contribution of about ₹387, ₹775 and ₹1,740 respectively before fixed business costs.

Example: if fixed monthly costs reach ₹10,000, break-even is roughly 26 Starter customers, 13 Growth customers, 6 Managed customers, or a mixed portfolio. Hardware profit and founder salary should not be counted as recurring software revenue.

Track monthly recurring revenue, new subscriptions, cancellations, average revenue per business, payment failures, hardware gross margin, customer acquisition cost, support time, and cash in bank.

## 4. Payment and subscription setup

Short-term launch flow:

1. Create the business banking/current-account setup and accounting process.
2. Complete KYC with an Indian payment gateway such as Razorpay or Cashfree; compare their current subscription, UPI AutoPay, settlement, refund and chargeback terms.
3. Publish business identity, contact details, pricing, tax treatment, terms, privacy notice, cancellation/refund policy and delivery policy before gateway review.
4. Start with a one-time hardware invoice plus a subscription mandate. Offer a manual UPI/invoice fallback for pilot customers.
5. Let the gateway collect card/UPI mandates and handle regulated authentication and notifications. REVORA must never store card or UPI credentials.
6. Verify signed payment webhooks on the server, use idempotency keys, and update subscription state only after verified events.
7. Generate numbered invoices and reconcile gateway settlements, fees, refunds and taxes every month.

## 5. Indian business and compliance checklist

- Choose an entity. A sole proprietorship is usually the simplest pilot structure; evaluate LLP or private limited when there are co-founders, investors, liability or larger contracts.
- Obtain PAN-linked business banking and consider free Udyam/MSME registration if eligible.
- Check Maharashtra Shops and Establishments and local registration requirements for the actual operating setup.
- GST registration for services is commonly linked to an aggregate-turnover threshold of ₹20 lakh in Maharashtra, with exceptions. Confirm the current rule and interstate/e-commerce implications with a CA before relying on the threshold.
- Keep purchase records, production costs, invoices, bank statements and gateway reports from day one.
- Use written customer terms covering hardware ownership, replacement, subscription renewal, cancellation, service availability, prohibited use, support scope and liability.
- Follow Indian privacy requirements, including the Digital Personal Data Protection framework as brought into force. Use a clear notice, purpose limitation, reasonable security, deletion/retention rules and a grievance contact.
- Collect the minimum guest data. Anonymous ratings are safer than names, phone numbers or email addresses unless those details are genuinely needed and consented to.
- Do not “review gate.” Every guest must be free to leave honest feedback and choose whether to post publicly, regardless of rating. Do not publish or impersonate the guest. Any draft remains editable and requires the guest’s active choice.

## 6. Product dashboard plan

The current private dashboard handles demo leads. Customer analytics requires a separate multi-tenant data model.

Core records:

- businesses and users;
- locations and stands;
- subscription/customer identifiers from the payment gateway;
- tap/scan sessions;
- feedback responses and optional comments;
- review-link clicks;
- issue status and follow-up notes;
- audit logs and consent/retention metadata.

Roles:

- REVORA platform administrator;
- business owner;
- location manager;
- read-only analyst, only if a customer needs it.

Security requirements:

- Supabase Row Level Security on every tenant table using `business_id` membership;
- server-verified administrator role and strong MFA;
- no authorization based on a hidden URL;
- signed and idempotent payment webhooks;
- aggregate analytics that avoid unnecessary guest identifiers;
- export and deletion controls;
- audit logging for admin changes;
- rate limits and abuse monitoring.

Useful customer metrics: taps/scans, completed feedback, completion rate, score distribution, recurring issue categories, location/stand comparison and review-link clicks. Do not claim the number of published Google reviews unless a reliable authorized source actually confirms publication.

### Per-stand guest links

Every physical stand receives one public, unguessable code. The NFC tag and printed QR both contain a short REVORA URL such as `/r/{public_code}`. The public code maps server-side to one active stand, location and business theme; it must not expose a sequential database ID or grant any dashboard permission.

Admin setup flow:

1. Create or select a business and location.
2. Add a stand and generate its public code.
3. Preview the exact guest page.
4. Copy the NFC URL and download a print-ready QR.
5. Record which physical tag/stand received the code.
6. Disable, rotate or replace the public code if the stand is lost or moved.

The guest route must be a separate lightweight bundle with no map, video, WebGL or dashboard code. It loads the business name, logo, colours, permitted questions and review destination after validating the active public code. Feedback writes go through a rate-limited server endpoint. The browser must never receive private dashboard records, administrative keys or another business’s data.

Recommended records: `businesses`, `locations`, `stands`, `stand_public_codes`, `feedback_sessions`, `feedback_answers`, `review_clicks` and `audit_logs`. Keep code rotation history so an old QR can be revoked safely.

## 7. NFC compatibility guide for India

NFC support differs by exact model and Indian SKU. Never state that an entire Android brand supports NFC.

| Brand family | Planning guidance |
|---|---|
| Apple iPhone | Recent iPhones are the most consistent; older generations may require a reader control/app. Verify the exact minimum experience before publishing. |
| Google Pixel | Generally NFC-capable; verify the India model specification. |
| Samsung Galaxy S/Z | Usually NFC-capable. Galaxy A/M/F models vary by exact India SKU. |
| OnePlus | Flagships commonly support NFC; Nord and CE variants vary. |
| Nothing | Recent Phone models commonly support NFC; verify each model. |
| Motorola | Edge models commonly support NFC; Moto G variants vary. |
| Xiaomi/Redmi/POCO | Many Indian variants omit NFC even when a global version includes it. Exact-SKU verification is essential. |
| vivo/iQOO/OPPO/realme | Support is inconsistent across popular budget and mid-range India models. Verify individually. |

Build a searchable compatibility table only from current official India specification pages. Store brand, exact model, India SKU, NFC yes/no, source URL and last-verified date. Keep the QR code large and high-contrast because it is the universal fallback for every phone with a camera.

## 8. Launch sequence

1. Print and test ten prototypes across several phones and real counter conditions.
2. Measure actual cost and finalize the hardware price.
3. Pilot with one café, one salon and one different retail/service business.
4. Use manual invoicing and a simple subscription/payment link during the pilot.
5. Measure completion, support time and retention before promising advanced analytics.
6. Finalize contracts, privacy, refund and warranty terms with professional review.
7. Add the customer dashboard and automated subscriptions after the pilot proves the workflow.
8. Publish real case studies and verified results with customer permission.
