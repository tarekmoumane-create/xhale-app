// Web is only used for design previews; the app ships on iOS and Android.
const ls = typeof window !== 'undefined' ? window.localStorage : null;

export const kv = {
  get: (key: string) => ls?.getItem(key) ?? null,
  set: (key: string, value: string) => ls?.setItem(key, value),
  remove: (key: string) => ls?.removeItem(key),
};
