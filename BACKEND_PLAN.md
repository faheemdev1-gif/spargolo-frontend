# Spargolo backend

The public site and the staff dashboard share one origin. The Node.js Vercel function uses Hono and a PostgreSQL connection pool. Local development uses the same SQL against embedded PostgreSQL via PGlite, or a real PostgreSQL server when `DATABASE_URL` is set. The application initializes the tables and imports the sample menu once per database. Prices are stored in integer cents.

## API

All paths below are relative to `/api/v1`. Guest submissions accept JSON and require an `Idempotency-Key` header. An identical retry returns the original reference. An existing key with a different payload returns 409.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/public/content` | Public menu, sections, contacts and booking rules. |
| POST | `/public/bookings` | Submit a request with the Milan date/time, party size, guest details and optional menu preferences. |
| POST | `/public/orders` | Submit a menu enquiry. The server resolves item IDs, quantities and current prices. |
| GET | `/photos/:id` | Return an uploaded product image. |
| POST | `/admin/login`, `/admin/logout` | Create or end an authenticated session. |
| GET | `/admin/session` | Return the authenticated email, or 401. |
| POST | `/admin/password` | Change the current password and revoke the account’s sessions. |
| GET | `/admin/catalog` | Return all categories and products, including archived ones. |
| POST, PATCH | `/admin/categories`, `/admin/categories/:id` | Create or edit a category. |
| POST, PATCH | `/admin/products`, `/admin/products/:id` | Create or edit a product, including its category and photo. |
| GET, PUT | `/admin/settings` | Read or update the public content, operational rules and online request switch. |
| GET, POST | `/admin/bookings`, `/admin/orders` | List or create guest requests. |
| GET, PATCH | `/admin/bookings/:id`, `/admin/orders/:id` | Read or update details and status. |

Administration endpoints require an HTTP-only, same-site session cookie except login and logout. Session token digests are stored in the database with a twelve-hour expiration. Passwords use versioned scrypt hashes. The API checks same-origin mutations and limits repeated sign-in and submission attempts. List endpoints return up to 25 guest requests per page. Catalog entries, settings and guest records use revision checks to prevent stale updates.

Orders and reservations retain item names and prices at the time of the request. Category archiving hides its products from the public menu while keeping the admin records and request history. If the venue sets a maximum per arrival slot, confirmation checks it in a transaction. The cap counts confirmed guests assigned to that exact arrival time. Staff handle table placement and service duration.
