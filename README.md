# GlamRide

GlamRide is a React beauty marketplace frontend backed by a Flask REST API and
a SQLite database. Customers can find artists, request and manage appointments,
choose a demo payment method, and review completed bookings. Stylists can apply,
manage their availability, and update appointment status. Administrators review
stylist applications and manage bookings.

## Run locally

### Flask API

From the project directory, create and activate a virtual environment, then run:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
python backend\run.py
```

The API starts at `http://127.0.0.1:5000`. It creates and seeds
`instance\glamride.db` on first run.

The backend loads configuration from the project-root `.env` file. Copy
`.env.example` to `.env` to customize settings. By default, `DATABASE_URL` uses
a local SQLite database. To use PostgreSQL, set it to a PostgreSQL connection
URL; the PostgreSQL driver is installed from `backend\requirements.txt`. Keep
`.env` private and never commit database credentials.

Set a long, unique `FLASK_SECRET_KEY` in `.env` before deploying; without one,
a new random key is generated when the app starts, so existing sessions are
signed out after a restart. When deploying behind HTTPS, also set
`SESSION_COOKIE_SECURE=1`.
Create the first administrator interactively from the project directory:

```powershell
flask --app backend/legacy_cli.py create-admin
```

The command prompts for the administrator email, name, and password. Do not
use a shared or production password for a local demo. The email must not
already belong to a customer, stylist, or administrator in this database.

To change an existing administrator password, run this from the project
directory. It prompts for the administrator email and new password without
displaying the password:

```powershell
flask --app backend/legacy_cli.py reset-admin-password
```

## Deploy to Render

The Render Docker service builds the React app and serves it from the Flask
backend, so the UI and API share one origin and session cookies work without
cross-origin configuration.

1. Push this repository to GitHub and sign in to [Render](https://render.com/).
2. In Render, create a managed PostgreSQL database. Choose a region and plan,
   then wait until the database is available.
3. Create a new **Web Service** and connect
   `matataalice222-a11y/Beauty-connent`, branch `main`. Select the **Docker**
   runtime and use the same region as the database. Leave the root directory
   blank so Render finds the root `Dockerfile`. Set its health check path to
   `/api/health`.
4. In the web service's **Environment** settings, add:
   - `DATABASE_URL`: use the PostgreSQL database's **internal** connection
     string from Render. Do not use the local `.env` value.
   - `FLASK_SECRET_KEY`: generate a long, unique random value.
   - `SESSION_COOKIE_SECURE`: `1`.
   - `ADMIN_EMAIL` and `ADMIN_PASSWORD`: optional; set both temporarily if you
     want the first administrator created on deploy. Use a unique production
     password. Remove these variables after the admin account is created; its
     password hash remains in the database.
5. Choose a plan for the web service and create it. Watch the deploy logs for
   the Docker build and application startup to complete.
6. Open `https://<your-service>.onrender.com/api/health`. A healthy response
   includes `"status":"ok"` and `"database":"ok"`. Then open the service's
   root URL to check the frontend.
7. Test customer registration, sign-in, and sign-out. If you did not seed an
   admin in step 4, create one from the Render Shell with
   `flask --app backend/legacy_cli.py create-admin`, then remove any temporary
   admin environment variables and redeploy.

Keep database and admin credentials in Render's environment settings, not in
GitHub or chat. The app's demo payment flow does not charge money or connect to
a payment provider.

### React app

In a second terminal:

```powershell
Set-Location frontend
npm install
npm run dev
```

Open the local URL printed by Vite. Its development server proxies `/api`
requests to Flask.

## Features

- **Customers:** sign up, sign in, book services, track and cancel eligible
  bookings, chat with their assigned stylist, opt in to live GPS sharing during
  accepted appointments, simulate a demo payment, and review completed appointments.
- **Stylists:** apply for approval, sign in, set availability, and accept,
  decline, start, or complete their assigned bookings. Stylists can view full
  booking details, chat with customers, and opt in to live GPS sharing. They
  can also share a private GPS pin so nearby customers can find them.
- **Administrators:** approve or decline artist applications, view platform
  totals, and update booking statuses.
- **GPS and directions:** customers may opt in to browser location to search
  for opted-in artists by distance, choose a search radius, and share an exact
  appointment pin with their selected stylist. During an accepted or in-progress
  booking, either participant can separately opt in to live location sharing
  with the other participant and stop sharing at any time. Live pins expire
  after a minute without updates and are cleared when the booking is completed
  or cancelled. Assigned stylists can open customer-shared appointment pins in
  Google Maps for directions. GPS access requires permission and a secure
  context (HTTPS, or localhost during
  development); neighbourhood search and typed addresses remain available
  without GPS. Exact customer appointment pins are only included in responses
  visible to that customer, their assigned stylist, and administrators.
- **Booking chat:** each booking has a saved text conversation between its
  customer and assigned stylist. Messages are limited to 1,000 characters and
  only the booking participants can read or send them.
- **Payments:** M-Pesa and cash are preference labels only in this demo.
  “Simulate demo payment” records a demo status; it does not connect to a
  provider or transfer/charge money.
- **Beauty services:** braids, wig styling, hair care, makeup, nails, brows and
  lashes, and skin and spa appointments.
- **Photography and video:** locally stored stock photographs are illustrative
  and do not represent the sample stylist profiles or guarantee a particular
  service result. The landing-page salon video is by
  [Kampus Production on Pexels](https://www.pexels.com/video/hairdresser-cutting-clients-hair-8830244/)
  and is used under the [Pexels License](https://www.pexels.com/license/). It is
  externally hosted; a local photo is shown when reduced motion is enabled.

## API

- `GET /api/health` — API health
- `GET /api/services` — services; optionally filter with `?category=Braids`
- `GET /api/stylists` — available, approved artists; optionally filter with `?location=Westlands`
- `GET /api/stylists?latitude=-1.28&longitude=36.82&radius_km=25` — nearby artists, closest first; only artists who opted in to a GPS pin are included
- `GET /api/stylists/<id>` — one artist profile
- `GET /api/stylists/<id>/reviews` — public reviews for an artist
- `POST /api/register`, `POST /api/login`, `POST /api/logout`, `GET /api/me` — account session
- `POST /api/stylist/register` — submit a stylist application
- `POST /api/bookings`, `GET /api/bookings`, `PATCH /api/bookings/<id>/status` — appointments
- `GET/POST /api/bookings/<id>/messages` — private booking chat
- `POST/DELETE /api/bookings/<id>/live-location` — participant-controlled live GPS sharing
- `POST /api/bookings/<id>/demo-payment` — record a no-charge demo payment
- `POST /api/bookings/<id>/reviews` — review a completed appointment
- `GET /api/stylist/dashboard`, `PATCH /api/stylist/availability` — stylist tools
- `PATCH /api/stylist/location` — opt in to or update a private stylist GPS pin
- `GET /api/admin/dashboard`, `PATCH /api/admin/stylists/<id>` — administrator tools

## Tests

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s backend -p "test_*.py" -v
Set-Location frontend
npm run build
```

The included names, profiles, ratings, and reviews counts are sample content
for local development. Stylist accounts created through the site stay hidden
from customers until an administrator approves them.
