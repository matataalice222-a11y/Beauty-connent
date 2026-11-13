# Cabal Privy Ceremonial & Event Security

A standalone website and Node.js quote-request backend. This project is
independent of GlamRide and does not use Flask, React, or external packages.

## Run locally

Install Node.js 20 or newer, then run from this directory:

```powershell
npm start
```

Open [http://localhost:3000](http://localhost:3000). Quote requests are saved
locally to `backend/data/quotes.jsonl`; that file is excluded from Git.

Run the backend and website tests with:

```powershell
npm test
```

## Personalize the website

- The phone, email, and WhatsApp details are set in `frontend/config.js`.
  Update them there when contact details change. WhatsApp numbers use digits
  only, including the country code.
- Add optional photos as `frontend/images/gallery-1.jpg` through
  `frontend/images/gallery-6.jpg`. The gallery has designed fallbacks when
  photos have not been added.
- Update the business description, service list, location, and social links in
  `frontend/index.html` when the final details are available.

This lightweight backend is intended for local demos. Before using it for real
customer data or deploying publicly, add a production database, retention
policy, HTTPS, and appropriate operational protections.
