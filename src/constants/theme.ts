export const Colors = {
  bg: '#0A0B0D',
  surface: '#131519',
  surfaceHigh: '#1B1E23',
  border: 'rgba(255,255,255,0.07)',
  borderStrong: 'rgba(255,255,255,0.14)',
  text: '#F5F3EF',
  text2: '#A4A9AE',
  text3: '#7A8086',
  accent: '#7FE7DC',
  accentSoft: 'rgba(127,231,220,0.12)',
  onAccent: '#04201D',
  onLight: '#0A0B0D',
  danger: '#FF6B5E',
  dangerSoft: 'rgba(255,107,94,0.12)',
} as const;

export const Fonts = {
  // Display: Schibsted Grotesk. Heavy and compact, so headlines read like a statement.
  display: 'SchibstedGrotesk_800ExtraBold',
  displaySemi: 'SchibstedGrotesk_700Bold',
  // Text: Familjen Grotesk.
  body: 'FamiljenGrotesk_400Regular',
  semi: 'FamiljenGrotesk_500Medium',
  bold: 'FamiljenGrotesk_600SemiBold',
  italic: 'FamiljenGrotesk_400Regular_Italic',
} as const;

export const Type = {
  hero: { fontFamily: Fonts.display, fontSize: 42, lineHeight: 46, letterSpacing: -0.8, color: Colors.text },
  title: { fontFamily: Fonts.display, fontSize: 32, lineHeight: 36, letterSpacing: -0.6, color: Colors.text },
  heading: { fontFamily: Fonts.displaySemi, fontSize: 22, lineHeight: 27, letterSpacing: -0.2, color: Colors.text },
  body: { fontFamily: Fonts.body, fontSize: 16.5, lineHeight: 24, color: Colors.text2 },
  bodyStrong: { fontFamily: Fonts.semi, fontSize: 16.5, lineHeight: 22, color: Colors.text },
  label: { fontFamily: Fonts.semi, fontSize: 15.5, lineHeight: 20, color: Colors.text },
  small: { fontFamily: Fonts.body, fontSize: 14.5, lineHeight: 20, color: Colors.text2 },
  caption: { fontFamily: Fonts.body, fontSize: 13, lineHeight: 18, color: Colors.text3 },
  eyebrow: { fontFamily: Fonts.semi, fontSize: 14, lineHeight: 18, color: Colors.text3 },
  number: { fontFamily: Fonts.bold, fontVariant: ['tabular-nums' as const], color: Colors.text },
};

export const Space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, gutter: 22 } as const;
export const Radius = { sm: 12, md: 16, lg: 22, pill: 999 } as const;

export type Substance = 'cig' | 'vape' | 'weed';
export const SUBSTANCES: Substance[] = ['cig', 'vape', 'weed'];

export const SubstanceMeta: Record<
  Substance,
  {
    label: string;
    short: string;
    sub: string;
    color: string;
    soft: string;
    track: string;
    icon: string;
    androidIcon: string;
    unit: string;
    units: string;
  }
> = {
  cig: {
    label: 'Cigarettes',
    short: 'Cigarettes',
    sub: 'Cigarettes, rollies, cigars',
    color: '#FF9254',
    soft: 'rgba(255,146,84,0.12)',
    track: 'rgba(255,146,84,0.16)',
    icon: 'flame.fill',
    androidIcon: 'local_fire_department',
    unit: 'cigarette',
    units: 'cigarettes',
  },
  vape: {
    label: 'Vaping',
    short: 'Vape',
    sub: 'Disposables, pods, nic salts',
    color: '#7AA8FF',
    soft: 'rgba(122,168,255,0.12)',
    track: 'rgba(122,168,255,0.16)',
    icon: 'wind',
    androidIcon: 'air',
    unit: 'puff',
    units: 'puffs',
  },
  weed: {
    label: 'Weed',
    short: 'Weed',
    sub: 'Joints, carts, edibles',
    color: '#B6DE6E',
    soft: 'rgba(182,222,110,0.12)',
    track: 'rgba(182,222,110,0.16)',
    icon: 'leaf.fill',
    androidIcon: 'eco',
    unit: 'session',
    units: 'sessions',
  },
};
