import PostHog from 'posthog-react-native';

/**
 * Usage analytics (PostHog). Off unless EXPO_PUBLIC_POSTHOG_KEY is set.
 * Only screen names and a few key actions are sent, never anything the user types.
 * Keep this in line with the "Usage analytics" section of the privacy policy (web/public/privacy.html).
 */
const KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

const posthog = KEY ? new PostHog(KEY, { host: HOST, captureAppLifecycleEvents: true }) : null;

type Props = Record<string, string | number | boolean>;

export function track(event: string, props?: Props) {
  posthog?.capture(event, props);
}

export function trackScreen(path: string) {
  posthog?.screen(path);
}
