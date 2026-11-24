# Spargolo

A React and Vite website with an Italian-language staff dashboard at `/admin`. The public site and dashboard use the same Node.js API at `/api/v1`. PostgreSQL stores the menu, uploaded product photos, reservations and menu requests.

## Run it on your Mac

Use Node.js 24. Open Terminal in the extracted `spargolo-react` folder and run:

```bash
npm ci
npm run admin:create -- you@example.com
npm run dev
```

Use your email address in the second command. Save the generated password shown in Terminal. From the address printed by Vite, open `/admin` and sign in with those credentials. Vite runs the React site and API together. The local database persists in `.data/spargolo`. Running the admin command again for the same email creates a new password and ends that account’s sessions. Stop the local site before running the admin command against its embedded database.

## Manage the bar

| Dashboard area | What staff can manage |
| --- | --- |
| **Menu** | Add and rename categories, set their order, and archive or restore them. Add products to any active category and edit names, descriptions, prices in euros, allergens, photos, display order and availability. |
| **Prenotazioni** | Review and filter bookings, enter requests received by phone, reschedule, change the party size, confirm or decline, and see the request history. |
| **Richieste** | Review menu enquiries, record requests received in person, and update their status. Each request keeps the item names, quantities and prices supplied by the server at the time of submission. |
| **Impostazioni** | Set booking times, closures, optional maximum confirmed covers per arrival slot, contacts and homepage story. Enable online submissions when the venue is ready. |
| **Account** | Change the password. Each staff member can have a separate login created from the command line. |

For photos, choose a JPEG, PNG or WebP. The browser resizes new uploads before saving them. The included products and opening hours are sample data. Edit or archive them before enabling submissions. Menu edits appear when guests reload the site.

Guest bookings and menu enquiries arrive as pending. Staff can contact the guest from the dashboard using the email and telephone links. Status changes are recorded in the dashboard. No automatic guest email, card payments, delivery or table assignment is configured.

## Deploy to the existing Vercel project

1. In Vercel, connect a PostgreSQL database to the Spargolo project. Neon is one option. A pooled connection string works for the API. Use a dedicated database for a preview deployment if you want to try the dashboard with sample records.
2. Locally, run `npm ci` and `npm run admin:credentials -- you@example.com`. Keep the generated sign-in password private.
3. In the Vercel project’s server-side environment variables, add **`DATABASE_URL`**, **`SPARGOLO_ADMIN_EMAIL`**, and **`SPARGOLO_ADMIN_PASSWORD_HASH`**. Use the first two lines from the credentials command for the last two variables. Use no `VITE_` prefix for credentials.
4. Put the extracted project files at the root of the GitHub repository currently connected to Vercel. Deploy with the **Vite** preset, Node.js 24, `npm run build`, and output directory `dist`. The included `vercel.json` serves `/admin` and routes `/api/v1` to the Node.js function.
5. After deployment, open `/admin`. The API creates its tables and seeds the example menu on the first database connection. Check the menu and booking times, then turn on online submissions under **Impostazioni → Richieste online**. Refresh the public site to confirm the change.

Without `DATABASE_URL`, the production homepage runs in demo mode. If the existing Vercel project explicitly sets `VITE_DATA_MODE=demo`, remove that variable or change it to `api` to connect the public site to the backend. The bootstrap variables provision an account only if its email is new. For additional accounts or password recovery, set `DATABASE_URL` in your private local environment and run `npm run admin:create -- email@example.com` against that database.

References: [Vercel PostgreSQL](https://vercel.com/docs/postgres), [Vercel Node.js Functions](https://vercel.com/docs/functions/runtimes/node-js).

## Verify locally

```bash
npm test
npm run build
npm run preview
```

The integration tests exercise login, category and product edits, photo storage, guest submissions, duplicate retries, price snapshots, reservation limits and session revocation. See `BACKEND_PLAN.md` for the implemented API and `ASSETS.md` for provenance of the original imagery.
