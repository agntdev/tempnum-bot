# Virtual Number Marketplace — Bot specification

**Archetype:** commerce

**Voice:** professional and concise — write every user-facing message, button label, error, and empty state in this voice.

Telegram bot selling one-time virtual phone numbers by country. Users receive numbers via DM and can opt to display them publicly in a listings channel. Payments handled as one-off transactions with admin-configurable pricing and country availability.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- General Telegram users
- Verification/testers
- Privacy-conscious users

## Success criteria

- User receives virtual number via DM after payment
- Public listing appears in channel when opted-in
- Admin receives sales notifications

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Open main menu with service explanation and core commands
- **/browse** (command, actor: user, command: /browse) — Show country selection for available virtual numbers
- **View My Numbers** (button, actor: user, callback: orders:history) — Display user's purchased numbers and listing status
  - inputs: Telegram ID
  - outputs: Order list with status
- **/help** (command, actor: user, command: /help) — Show FAQs, refund policy, and admin contact

## Flows

### number_purchase
_Trigger:_ /browse or button

1. User selects country from quick-pick menu
2. Show available SKUs with prices
3. Select number and confirm purchase
4. Process one-time payment
5. Send number via DM with listing prompt

_Data touched:_ User, Virtual Number, Order

### public_listing
_Trigger:_ Post-purchase opt-in

1. User confirms public listing
2. Generate anonymized display name
3. Post number to public channel

_Data touched:_ Public Listing

### admin_monitoring
_Trigger:_ New payment confirmation

1. Send sales notification to admin channel
2. Update number status to sold

_Data touched:_ Order, Virtual Number

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **User** _(retention: persistent)_ — Telegram user with purchase history
  - fields: Telegram ID, display name, purchase history
- **Virtual Number** _(retention: persistent)_ — Available/sold phone numbers by country
  - fields: country, number string, SKU, status, purchase timestamp
- **Order** _(retention: persistent)_ — Completed transactions
  - fields: order ID, buyer Telegram ID, number SKU, price, payment status
- **Public Listing** _(retention: persistent)_ — Opt-in public number display
  - fields: SKU, anonymized buyer handle, visible flag

## Integrations

- **Telegram** (required) — Bot API messaging
- **Payment Processor** (required) — Card/in-app payments for one-time purchases
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- Manage country availability list
- Configure pricing per country
- Purge sold numbers
- Approve/refund requests

## Notifications

- Order confirmation DM to buyer
- Sales alert to admin channel
- Listing update notifications

## Permissions & privacy

- Only store Telegram ID and purchase records
- Anonymize buyer handles in public listings
- No SMS/call routing data stored

## Edge cases

- User selects sold-out number SKU
- Payment processor returns failure
- Duplicate public listing requests
- Admin channel access errors

## Required tests

- End-to-end purchase flow with payment confirmation
- Public listing visibility toggle
- Data persistence after bot restart

## Assumptions

- Using Stripe/Flutterwave for payment processing
- Default base price applies until admin customizes
- Admin channel exists for sales notifications
