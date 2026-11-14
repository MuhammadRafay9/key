# License Manager — Dukaan Hisaab (vendor tool)

Web app to generate license codes for the Dukaan Hisaab POS, and track activations
per device (count, duration, amount).

## Use

1. Open the deployed URL (or run `start.bat` / `node server.mjs` locally).
2. Enter your **private key** (64-char hex). It is saved only in your browser's
   localStorage — it is NOT part of this repo or the deployed site.
3. Fill client name, Device ID, duration (months/days/hours/minutes), grace, price.
4. **Generate Code** → copy and send to the client.
5. History + per-device summary are stored locally in the browser.

## Security

- The **private key is never committed** and never embedded in this site. Anyone
  visiting the site cannot generate codes without the private key.
- Keep the private key secret. If it leaks, rotate the keypair (app public key +
  keygen private key) and re-issue licenses.
