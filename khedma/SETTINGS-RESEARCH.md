# Khedma settings research — 3 October 2026

Sources: [Apple account security](https://support.apple.com/en-gb/guide/personal-safety/ips7d5628cc5/web), [Meta account settings, April 2026](https://about.fb.com/news/2026/04/meta-account/), [Meta Accounts Center background](https://about.fb.com/news/2023/01/centralizing-apps-settings-in-accounts-center/).

Apple documents a central account area and a Sign-In & Security section for contact details, passwords and trusted devices. Meta describes centralized personal information and security controls, with app-specific preferences managed separately. Some Facebook Help Center pages required login during this review; the public Meta documentation supplied the usable reference. This is a review of public documentation, not a reproduction of logged-in Apple/Facebook interfaces or a user study.

## Applied to Khedma

- One settings page with direct section navigation: personal details, worker services, sign-in and security, preferences, privacy and help.
- Separate the profile Save action from preferences that apply immediately. Show unsaved and saved states, focus feedback, and warn before browser refresh/close with unsaved profile edits. Internal navigation is not blocked.
- Show/hide password controls and explain whether the account uses a password or a social provider. Provider accounts link to the provider's own security page.
- Persist language, reduced motion and larger text in this browser. These preferences do not synchronize across accounts/devices.
- Describe actual public/private data boundaries and provide an authenticated data download that excludes credentials and other accounts' unrelated bookings.
- Explain the current recovery and booking workflows without offering settings for unimplemented features.

These address inferred usability risks: buried controls, unclear saving, confusion between site/provider passwords, lost edits and unclear visibility of contact details. The sources do not quantify how common those issues are for Khedma users. A later user test should ask a client and worker to update a phone, change availability, locate privacy information and adjust language without assistance.

## Still needed before a full account-control system

Forgotten-password recovery, verified email/phone changes, active-session management, notification delivery/preferences and account deletion/deactivation need separate backend workflows. No inactive switches for these were added. Google/Apple sign-in still requires developer credentials and a live provider test. Current data export includes account/profile information and authorized booking/review records; it is not a full audit-log export.
