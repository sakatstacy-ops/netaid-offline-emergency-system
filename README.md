# NetAid

NetAid is an offline-first emergency response web app concept. The app shell, safety guides, contacts, and incident-report form are available in the browser. Reports and contacts are stored locally in that browser, so they remain available without a network connection.

## Features

- Responsive landing page and local response kit
- Installable progressive web app with a cached application shell
- Incident reports saved locally with type, priority, location, and timestamp
- Locally stored emergency contacts with tap-to-call links
- Safety reference content available offline after the first successful load
- Optional automatic report sync through a configured HTTPS endpoint

## Run locally

The app is static. Serve this directory with any local web server; service workers require `localhost` or HTTPS.

For example, with Node.js installed:

```powershell
npx serve .
```

Open the localhost URL printed by the server, then load the app once while online so its service worker can cache the app shell. Disconnect the network and reload to try the offline experience.

## Report sync integration

The demo stores all reports locally by default. It does **not** include a cloud backend, account system, or server-side row-level security. To enable upload, add this tag to `index.html` and provide an authenticated HTTPS API endpoint that accepts `POST` requests with a JSON report body:

```html
<meta name="netaid-sync-endpoint" content="https://your-service.example/api/reports">
```

The app attempts to send pending reports when it starts, when a report is saved, and when the browser comes back online. A report is marked synced only after the endpoint returns a successful HTTP response. Failed uploads remain stored locally and can be retried on the next connection. The endpoint must authenticate and authorize the user, validate input, protect sensitive information, and return a non-2xx response when a report is not accepted. Use a properly secured backend before collecting or transmitting real emergency information.

## Privacy and emergency notice

Browser storage is device-local, not an encrypted vault. Anyone with access to the browser profile may be able to view locally saved information. This project is a prototype and is not an emergency dispatch service. For immediate danger, use the emergency number verified for your location and follow instructions from local authorities.
