/** The user's own "why", typed in onboarding. Shown as a quote wherever the app reminds them of it. */
export function cleanWhy(why: string) {
  const c = why.trim().replace(/[\s.!]+$/, '');
  return c ? c.charAt(0).toUpperCase() + c.slice(1) : '';
}

export function quoteWhy(why: string) {
  const c = cleanWhy(why);
  return c ? `“${c}”` : '';
}
