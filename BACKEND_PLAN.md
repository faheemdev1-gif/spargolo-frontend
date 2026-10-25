# Next phase: backend and admin panel

This document is a proposed integration contract, not an implemented server. The frontend is ready to be connected to this contract. No CRUD operation currently persists data.

## Operational model

The website introduces the venue, helps visitors discover its menu, and accepts requests that staff can review. Reservations and menu selections start as **pending**. The backend, rather than the browser, must decide whether a table or dish is available and what an order costs.

## Public API — base URL `/api/v1`

| Method | Path               | Purpose                                                                                                                                                                                       |
| ------ | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/public/content`  | Return the complete version-1 site content, categories, menu, contact details, hours, and rules. Match `src/data/site.js`; use owner-approved content and `preview: false` for a real launch. |
| POST   | `/public/bookings` | Create a pending reservation request and its menu preferences.                                                                                                                                |
| POST   | `/public/orders`   | Create a pending menu enquiry with selected items; not paid checkout.                                                                                                                         |

The frontend sends JSON and an `Idempotency-Key` header for submissions. The backend should store the key and request hash, return the existing result for an identical retry, and reject reuse with different content. Allow the frontend's production origin and the required headers in CORS; include OPTIONS handling.

### Booking request

```json
{
  "date": "2026-11-03",
  "time": "19:30",
  "timeZone": "Europe/Rome",
  "guestCount": 4,
  "customer": {
    "name": "Example Guest",
    "email": "guest@example.com",
    "phone": ""
  },
  "notes": "Example preference",
  "menuPreferences": [{ "menuItemId": "c1", "quantity": 2 }]
}
```

Successful response: HTTP 201 with `{ "id": "server-record-id", "status": "pending" }`. If the backend actually assigns capacity atomically and follows the accepted booking policy, it may return `confirmed`. The frontend distinguishes these states.

### Menu enquiry request

```json
{
  "type": "menu_inquiry",
  "customer": {
    "name": "Example Guest",
    "email": "guest@example.com",
    "phone": ""
  },
  "notes": "Please contact me about this selection.",
  "items": [{ "menuItemId": "c1", "quantity": 2 }]
}
```

Successful response: HTTP 201 with `{ "id": "server-record-id", "status": "pending" }`. Resolve IDs against the current menu and calculate totals on the server. Store names and price snapshots for historical records. The frontend deliberately sends no trusted price or payable amount. Delivery, takeaway time slots, checkout, and payments require a separate owner-approved workflow and are not implemented here.

Errors should use the appropriate HTTP status and `{ "message": "Customer-friendly explanation" }`. Do not return database internals or stack traces to visitors.

## Admin CRUD and controls

| Resource           | Operations and fields                                                                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Menu categories    | Create, list, rename, reorder, archive/delete unused categories.                                                                                                          |
| Menu items         | Create, read, update, archive; category, name, description, price in cents, images/video, allergens, availability, display order. Preserve historical order references.   |
| Bookings           | List, filter by date/status, view details, add/edit, confirm, decline, reschedule, cancel; store party size, contacts, notes, preferences, timestamps, and staff history. |
| Orders / enquiries | List, filter, view, create/edit, confirm/decline/cancel, update fulfilment status; store customer, quantities, prices, notes, and staff history.                          |
| Site content       | Edit brand, headings, copy, hero media, story, family content, wine moods, contact details, social links, and attributed review excerpts.                                                             |
| Opening rules      | Weekly hours, closed dates, exceptional openings, booking horizon, lead time, party limits, slots, and capacity.                                                          |
| Media library      | Upload, list, replace, label, and remove unused images/video; validate type and size.                                                                                     |
| Notifications      | Send real booking/order notifications and confirmation messages after records are committed. Log delivery outcomes.                                                       |
| Admin accounts     | Secure sign-in, roles, password reset, and session management.                                                                                                            |

Suggested private routes are `/admin/menu-items`, `/admin/categories`, `/admin/bookings`, `/admin/orders`, `/admin/content`, `/admin/media`, and `/admin/settings`. Each resource can use GET/POST/PATCH/DELETE as appropriate. Treat destructive deletion of historical financial or guest records according to the owner's retention policy; use archive/status transitions where history matters.

## Persistence and integrity

Use a relational database such as PostgreSQL for menu items, order lines, bookings, capacity, and their relationships. Store uploaded media in object storage and store media references in the database. Keep money in integer cents and venue-local booking dates plus the venue timezone. Use transactions for capacity assignment and status changes; enforce the rules server-side even when the browser already checks them.

Guest information should be accessible only to authorized staff. Add input validation, rate limiting, secure server-side sessions, database backups, and access logging. The business must approve the public privacy information, data-retention policy, contact details, menu/allergen information, and booking policy before accepting real guest data.

## Suggested delivery sequence

1. Deploy this frontend to Vercel and agree on the visual direction with the owner.
2. Obtain final menu/content, booking capacity, notification destination, and service rules.
3. Build and test the API, database, admin authentication, and media storage.
4. Build the admin screens and CRUD workflows.
5. Connect the public frontend, test real request creation and staff confirmation, then enable live mode.
