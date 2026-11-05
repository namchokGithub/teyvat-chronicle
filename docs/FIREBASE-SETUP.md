# Firebase setup (pending)

No Firebase project is connected yet. These steps are for the owner when a project is available.

1. Create a Firebase web app and Cloud Firestore database. Enable **Email/Password** in Firebase Authentication.
2. Copy `.env.example` to `.env.local` and fill in the web app config values. Do not commit `.env.local`.
3. Create the owner account in Firebase Authentication. In Firestore, create an `owners` document whose ID is that account's UID. This document must be created through an administrative console or SDK; clients cannot create it under `firestore.rules`.
4. Review and deploy `firestore.rules` for the project. Before public use, test owner, non-owner, anonymous, draft, and published access against a Firebase emulator or test project.
5. Run the app locally, open `/#bo`, sign in as the owner, and test saving, publishing, and deleting records. Keep the public timeline on mock data until Phase 3 wires published Firestore records into its view.

The rules allow public reads of published content only. Public collection queries must include a `status == "published"` condition; Firestore rules do not filter query results for the client. See the [Firebase rules and queries guide](https://firebase.google.com/docs/firestore/security/rules-query).
