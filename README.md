# Last Time

Track when you last did anything.

## Prerequisites

- Node.js 20+
- A Firebase project with Firestore and Authentication (Google provider) enabled

## Setup

Create a `.env` file with your Firebase config:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Production (Firebase Hosting)

```bash
npm run build
npx firebase-tools deploy --only hosting
```

## Access Control

Only emails listed in the `allowed_emails` Firestore collection can sign in. Add a document with the email address as the document ID and `enabled: true` as a field.

## Release Notes

### v1.1.0 (2026-11-06)
- Add Google Sign-In authentication
- Restrict access via `allowed_emails` Firestore collection
- Add app icon (favicon)
- Add version and build date footer

### v1.0.1 (2026-11-06)
- Add app icon (favicon)
- Add version and build date footer

### v1.0.0 (2026-11-06)
- Initial Firebase release
- Migrate from Express/MongoDB to Firestore
- Real-time activity tracking with Firestore `onSnapshot`
