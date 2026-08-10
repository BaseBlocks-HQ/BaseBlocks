# Polar one-time purchase amounts and quantities

Research date: 2026-08-10. Sources are Polar's current official documentation and API reference.

## Conclusion

Polar does **not** limit one-time purchases to fixed catalog prices. A one-time product can use **Pay What You Want** (`custom`) pricing, where the buyer chooses the amount, optionally subject to a merchant-defined minimum and with a default prefilled at checkout. Polar's Checkout API also supports temporary **ad-hoc prices** scoped to one checkout, including fixed and custom prices.

However, Polar does **not** expose a generic quantity for an ordinary fixed/custom one-time product. Its checkout `amount` applies only to custom prices and is ignored for fixed/free prices; its `seats` field applies only to seat-based pricing. Seat pricing is designed for assignable team entitlements, not fungible AI-credit units.

BaseBlocks therefore has these practical choices:

- **Arbitrary customer-chosen spend: supported and now implemented in BaseBlocks.** BaseBlocks uses a one-time custom-price product and converts the authoritative paid order amount into credit units.
- **Merchant-calculated arbitrary spend: supported by Polar, but not by BaseBlocks today.** Create an ad-hoc fixed or custom price in the checkout session.
- **A customer-adjustable credit-pack quantity: not supported as a generic Polar quantity.** Modeling credits as seats would provide numeric quantity, but would also invoke Polar's team customer, member assignment, seat pool, and benefit-claim semantics; this is a poor fit for prepaid AI credits.
- **Current BaseBlocks behavior:** Billing offers $5, $10, and $20 preset amounts plus a Custom option. Polar enforces the product's $5 minimum and lets the customer edit the amount. Fulfillment grants the authoritative paid amount rather than a fixed catalog allowance.

## Evidence

### Customer-chosen and dynamic amounts

- Polar lists one-time and recurring products under the same product model and supports Fixed, Pay What You Want, Free, Metered, and Seat-based pricing. Its Pay What You Want description explicitly says the customer chooses the amount and the merchant can set a minimum and default. Pricing type is locked at product creation. [Polar: Products](https://polar.sh/docs/features/products)
- The Create Product API explicitly permits `ProductPriceCustomCreate` in the price list for a one-time product. [Polar API: Create Product](https://polar.sh/docs/api-reference/products/create)
- Checkout creation accepts `amount` in cents only for custom prices and says it is ignored for fixed and free prices. The current documented range is `0..99,999,999`; the custom product's configured minimum still governs what can actually be paid. [Polar API: Create Checkout Session](https://polar.sh/docs/api-reference/checkouts/create-session)
- A Checkout Link can prefill `amount` only for a Pay What You Want product. The customer can edit that amount subject to the product rules. [Polar: Checkout Links](https://polar.sh/docs/features/checkout/links)
- Checkout sessions may supply a `prices` map containing temporary ad-hoc prices for a product. Polar documents this for dynamic or calculated per-checkout pricing, and supports fixed, custom, free, seat-based, and metered ad-hoc price types. [Polar: Checkout API](https://polar.sh/docs/features/checkout/session)

### Quantity is seat-specific

- The checkout `seats`, `min_seats`, and `max_seats` fields are documented as working only with seat-based pricing; they are not general product-quantity fields. [Polar API: Create Checkout Session](https://polar.sh/docs/api-reference/checkouts/create-session)
- Polar defines seat-based pricing as a billing manager buying seats and assigning them to members. A first seat purchase upgrades the customer to a team customer, and each seat is tracked and claimed as a member entitlement. One-time seats are perpetual, with additional seats bought through a new order. [Polar: Seat-Based Pricing](https://polar.sh/docs/features/seat-based-pricing)
- A checkout still produces a purchase of one selected product. Listing several products gives the buyer a choice rather than a bundle; true multi-product checkout is not supported. [Polar: Checkout Links](https://polar.sh/docs/features/checkout/links)
- Polar custom number fields can capture a buyer-entered number, but Polar documents those values as order/subscription data, not as inputs to price calculation. A merchant wanting an exact credit-unit selector should calculate the price before creating checkout (for example, with an ad-hoc fixed price), store the chosen quantity as trusted checkout metadata, and fulfill from the paid order. [Polar: Custom Fields](https://polar.sh/docs/features/custom-fields)

## BaseBlocks implementation

The adapter accepts an optional `amount` for the custom-price product. Preset
buttons prefill that amount; Custom leaves it to Polar's editable checkout.
Checkout intent idempotency includes the requested preset, while webhook
fulfillment derives the credit grant from the authoritative paid order amount.
The fixed catalog `creditUnits` field remains only for recurring Plus grants.
