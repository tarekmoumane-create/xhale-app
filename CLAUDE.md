@AGENTS.md

## Shipping changes

When a change is done, send it to TestFlight; do not show an Expo Go QR code. Commit, then run:

    npx eas-cli build --platform ios --profile production --auto-submit --non-interactive --no-wait

The build number auto-increments. If the current app version is already live on the App Store, bump `version` in app.json first, because Apple rejects new builds for a released version.
