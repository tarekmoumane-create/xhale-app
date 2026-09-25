import type { Substance } from '@/constants/theme';
import type { State } from '@/lib/store';
import { streakStart } from '@/lib/plan';

const DAY = 86_400_000;

/**
 * What's typically happening in the lungs on a given clean day.
 * Timelines follow the NHS, CDC and American Cancer Society quit timelines; the rest is
 * standard respiratory physiology or a named study. `vape` replaces `body` for vape-only
 * users where the smoke-specific wording (carbon monoxide, tar) doesn't apply.
 */
export type LungUpdate = { day: number; title: string; body: string; vape?: string };

export const LUNG_UPDATES: LungUpdate[] = [
  {
    day: 0,
    title: 'Carbon monoxide is leaving',
    body: 'Carbon monoxide grips your red blood cells over 200 times harder than oxygen. Within 8 hours of stopping, your level typically drops by more than half.',
    vape: 'Within hours of your last hit, the nicotine in your blood starts to fall. Its half-life is about 2 hours.',
  },
  {
    day: 1,
    title: 'Your blood carries full oxygen again',
    body: 'In smokers, up to 1 in 10 of the oxygen-carrying spots on red blood cells can be blocked by carbon monoxide. By now yours are typically back to normal.',
    vape: 'Your airways have gone a full day without aerosol. The irritation it causes starts to settle from here.',
  },
  {
    day: 2,
    title: 'Your lungs start clearing out',
    body: 'Around 48 hours in, your lungs start clearing out mucus and debris left from smoking. Taste and smell begin to sharpen too.',
    vape: 'Around 48 hours in, your lungs start clearing out mucus and debris. Taste and smell begin to sharpen too.',
  },
  {
    day: 3,
    title: 'Your airways open up',
    body: 'At 72 hours, your bronchial tubes begin to relax, so breathing gets easier and energy rises. Nicotine is now mostly out of your body.',
  },
  {
    day: 4,
    title: 'Why you might be coughing',
    body: 'The cells lining your airways each carry around 200 tiny hairs called cilia. As they recover, they push up built-up mucus. That cough is the clean-up.',
  },
  {
    day: 5,
    title: 'Withdrawal is past its peak',
    body: 'Physical nicotine withdrawal usually peaks in the first 3 days. From here the pull eases while your airways keep calming down.',
  },
  {
    day: 6,
    title: 'The sweepers speed up',
    body: 'Healthy cilia beat about 10 to 15 times a second, moving mucus up and out of your lungs. Smoke slows them. Every clear day lets them recover.',
    vape: 'Healthy cilia beat about 10 to 15 times a second, moving mucus up and out of your lungs. Vaping slows them. Every clear day lets them recover.',
  },
  {
    day: 7,
    title: 'One week with no new tar',
    body: 'Tar is the sticky residue that stains teeth and fingers brown. It coats your airways too. For a week, none has been added.',
    vape: 'Vape aerosol leaves fine particles in your airways. For a week, none have been added.',
  },
  {
    day: 8,
    title: '480 million air sacs',
    body: 'Your lungs hold about 480 million tiny air sacs called alveoli, where oxygen enters your blood. Without new smoke, the inflammation around them starts to settle.',
    vape: 'Your lungs hold about 480 million tiny air sacs called alveoli, where oxygen enters your blood. Without new aerosol, the inflammation around them starts to settle.',
  },
  {
    day: 9,
    title: 'Less work for your immune cells',
    body: 'Immune cells called macrophages patrol your lungs and swallow smoke particles. Smokers carry several times more of them. Their workload is dropping.',
    vape: 'Immune cells called macrophages patrol your lungs and swallow inhaled particles. With no new aerosol, their workload is dropping.',
  },
  {
    day: 10,
    title: 'About 70 square metres',
    body: 'Spread flat, the inside of your lungs would cover roughly 70 square metres. That whole surface moves oxygen into your blood, and it works better clear.',
  },
  {
    day: 11,
    title: 'Circulation is improving',
    body: 'Between 2 and 12 weeks after quitting, circulation typically improves. More blood flow means walking and exercise start to feel easier.',
  },
  {
    day: 12,
    title: 'Mucus is thinning',
    body: 'Smoke makes your airways produce extra, thicker mucus. As the irritation fades, production drops back toward normal.',
    vape: 'Vaping irritates your airways into making extra mucus. As the irritation fades, production drops back toward normal.',
  },
  {
    day: 13,
    title: '10,000 litres a day',
    body: 'You breathe roughly 10,000 litres of air a day. For almost two weeks, none of it has carried smoke.',
    vape: 'You breathe roughly 10,000 litres of air a day. For almost two weeks, none of it has carried vapor.',
  },
  {
    day: 14,
    title: 'Lung function starts to rise',
    body: 'Between 2 weeks and 3 months after quitting, lung function typically increases. You’ve just entered that window.',
  },
  {
    day: 15,
    title: 'More oxygen to your muscles',
    body: 'With your blood carrying full oxygen and circulation improving, more of it reaches your muscles. That’s why stairs start to feel easier.',
  },
  {
    day: 16,
    title: 'Your lungs age slower now',
    body: 'Adults lose a little lung function every year. Smoking roughly doubles that rate. Quitting brings it back toward normal.',
  },
  {
    day: 17,
    title: 'Narrow airways widen',
    body: 'Smoke keeps the walls of your small airways swollen. As the swelling goes down, more air gets through with each breath.',
    vape: 'Vaping keeps the walls of your small airways irritated and swollen. As that goes down, more air gets through with each breath.',
  },
  {
    day: 18,
    title: 'Less wheezing',
    body: 'Wheezing is air squeezing through narrowed airways. As they open, many people wheeze less, especially at night.',
  },
  {
    day: 19,
    title: 'A better barrier against germs',
    body: 'Your airway lining and cilia are your lungs’ first defence against germs. As they recover, chest infections become less likely.',
  },
  {
    day: 20,
    title: 'Deeper sleep, easier breathing',
    body: 'Less airway irritation usually means less coughing at night, so you breathe and sleep more easily.',
  },
  {
    day: 21,
    title: 'Three weeks clear',
    body: 'Three weeks with no new smoke. Carbon monoxide has been at normal levels for nearly all of them, and your airways have had 21 days to calm down.',
    vape: 'Three weeks with no new aerosol. Your airways have had 21 days to calm down and start clearing out.',
  },
  {
    day: 22,
    title: 'Your lungs’ cleaning system',
    body: 'Cilia and mucus work together as an escalator, carrying trapped dust and germs up to your throat. Quitting lets that escalator speed back up.',
  },
  {
    day: 23,
    title: 'Why you have more energy',
    body: 'Full oxygen in your blood plus better circulation is why many people feel noticeably more energetic a few weeks in.',
  },
  {
    day: 24,
    title: 'Every breath counts more',
    body: 'During hard exercise your lungs can move over 100 litres of air a minute. Clearer airways mean more of that air reaches the air sacs.',
  },
  {
    day: 25,
    title: 'Healthy cells are taking over',
    body: 'A 2020 study in Nature found that people who quit had up to 4 times more healthy cells lining their airways than people who kept smoking.',
    vape: 'Your airway lining constantly replaces its cells. With no new irritation, the fresh cells coming through are healthier ones.',
  },
  {
    day: 26,
    title: 'Smell and taste are back',
    body: 'The nerve endings for smell and taste, dulled by smoke, have had almost 4 weeks to recover. Food often tastes noticeably better by now.',
    vape: 'The nerve endings for smell and taste have had almost 4 weeks to recover. Food often tastes noticeably better by now.',
  },
  {
    day: 27,
    title: 'What can heal',
    body: 'Inflammation and extra mucus can reverse after quitting. Some damage, like emphysema, can’t, but quitting is the only thing proven to slow it.',
  },
  {
    day: 28,
    title: 'Four weeks clear',
    body: 'Most physical withdrawal is over by now. The extra cough from the clean-up often starts to settle too.',
  },
  {
    day: 29,
    title: 'Your airways, remodelling',
    body: 'Smoke thickens the lining of your airways over time. With it gone, the lining keeps renewing itself with healthier cells.',
    vape: 'Vaping irritates the lining of your airways. With it gone, the lining keeps renewing itself with healthier cells.',
  },
  {
    day: 30,
    title: 'One month clear',
    body: 'Between 1 and 9 months after quitting, your cilia typically regain normal function, and coughing and shortness of breath drop.',
  },
  {
    day: 45,
    title: 'Your brain is resetting too',
    body: 'Nicotine receptors in your brain multiplied while you smoked. They return to non-smoker levels around 6 to 12 weeks after quitting.',
  },
  {
    day: 60,
    title: 'Two months clear',
    body: 'Your mucus escalator keeps getting faster, so your lungs clear dust and germs better than they have in years.',
  },
  {
    day: 90,
    title: 'Lung function up to 10% better',
    body: 'Between 3 and 9 months after quitting, lung function typically improves by up to 10%. Coughing and wheezing keep dropping.',
  },
  {
    day: 180,
    title: 'Half the decline',
    body: 'In the Lung Health Study, people who quit saw lung function rise in the first year, then decline at about half the rate of those who kept smoking.',
  },
  {
    day: 270,
    title: 'Cilia back to normal',
    body: 'By around 9 months, cilia typically work normally again, so your lungs clean themselves and fight infection far better.',
  },
  {
    day: 365,
    title: 'One year clear',
    body: 'Your extra risk of heart disease is now about half a smoker’s, and your lungs have had a full year to rebuild their defences.',
  },
  {
    day: 1825,
    title: 'Five years clear',
    body: 'Your risk of cancer of the mouth, throat and oesophagus is about half what it was when you smoked.',
  },
  {
    day: 3650,
    title: 'Ten years clear',
    body: 'Your risk of dying from lung cancer is about half that of someone who still smokes.',
  },
];

/** When the lungs' clean clock started: the most recent streak start across habits. Null while any habit is still tapering. */
export function lungsSince(state: State, now = Date.now()): number | null {
  if (!state.substances.length) return null;
  const starts = state.substances.map((s) => streakStart(state, s, now));
  if (starts.some((x) => x === null)) return null;
  return Math.max(...(starts as number[]));
}

export function lungDays(since: number, now = Date.now()) {
  return Math.max(0, Math.floor((now - since) / DAY));
}

export function lungUpdate(day: number, vapeOnly = false) {
  const i = Math.max(0, LUNG_UPDATES.findLastIndex((u) => u.day <= day));
  const pick = (u: LungUpdate): LungUpdate => (vapeOnly && u.vape ? { ...u, body: u.vape } : u);
  const next = LUNG_UPDATES[i + 1];
  return { current: pick(LUNG_UPDATES[i]), next: next ? pick(next) : null };
}

/** How clear to draw the lungs, 0 to 1. Illustrative, not a measurement: fast early, slower later. */
export function lungClarity(day: number) {
  return Math.min(1, 0.12 + 0.88 * (Math.log(1 + day) / Math.log(1 + 365)));
}

export type LungFact = {
  text: string;
  source: string;
  from?: number;
  to?: number;
  only?: Substance;
  skipVapeOnly?: boolean;
};

/**
 * Specific facts shown after blowing the smoke away in SOS and in notifications.
 * `from`/`to` limit a fact to a range of clean days so it fits where the user is.
 */
export const LUNG_FACTS: LungFact[] = [
  // Where they are right now
  {
    text: 'Within 8 hours of your last cigarette, carbon monoxide in your blood typically drops by more than half.',
    source: 'NHS',
    to: 2,
    skipVapeOnly: true,
  },
  {
    text: 'Nicotine’s half-life is about 2 hours. Within 3 days it’s mostly gone. This craving is part of it leaving.',
    source: 'Clinical pharmacology',
    to: 4,
  },
  {
    text: 'Around 48 hours after quitting, your lungs start clearing out mucus and debris. Any extra cough is that clean-up.',
    source: 'NHS',
    from: 1,
    to: 21,
  },
  {
    text: 'At 72 hours, your bronchial tubes begin to relax. That’s why breathing starts to feel easier.',
    source: 'NHS',
    from: 2,
    to: 21,
  },
  {
    text: 'Between 2 weeks and 3 months after quitting, circulation improves and lung function starts to increase. You’re in that window now.',
    source: 'American Cancer Society',
    from: 14,
    to: 90,
  },
  {
    text: 'Between 1 and 9 months, your cilia typically regain normal function, so coughing and shortness of breath drop.',
    source: 'American Cancer Society',
    from: 30,
    to: 270,
  },
  {
    text: 'Nicotine receptors in your brain return to non-smoker levels around 6 to 12 weeks after quitting. Cravings fade with them.',
    source: 'Cosgrove et al., 2009',
    from: 21,
    to: 120,
  },
  {
    text: 'Between 3 and 9 months after quitting, lung function typically improves by up to 10%.',
    source: 'NHS',
    from: 60,
    to: 365,
  },
  {
    text: '10 to 15 years after quitting, your risk of dying from lung cancer is about half that of someone who still smokes.',
    source: 'CDC',
    from: 180,
  },

  // What one would undo
  {
    text: 'Carbon monoxide binds to your red blood cells over 200 times more tightly than oxygen. One cigarette puts it straight back.',
    source: 'Respiratory physiology',
    skipVapeOnly: true,
  },
  {
    text: 'Cigarette smoke contains over 7,000 chemicals. About 70 of them are known to cause cancer.',
    source: 'CDC',
    only: 'cig',
  },
  {
    text: 'Healthy cilia beat 10 to 15 times a second to sweep your airways clean. Smoke slows them down.',
    source: 'Respiratory physiology',
  },
  {
    text: 'Your lungs hold about 480 million air sacs. Spread flat, they’d cover roughly 70 square metres.',
    source: 'Ochs et al., 2004',
  },
  {
    text: 'Adults lose a little lung function each year. Smoking roughly doubles that rate. Quitting brings it back toward normal.',
    source: 'Fletcher & Peto, BMJ',
  },
  {
    text: 'People who quit have up to 4 times more healthy cells lining their airways than people who keep smoking.',
    source: 'Nature, 2020',
    skipVapeOnly: true,
  },
  {
    text: 'Quitting is the only thing proven to slow COPD, the lung disease caused mostly by smoking.',
    source: 'GOLD guidelines',
    skipVapeOnly: true,
  },

  // Weed
  {
    text: 'A joint puts about 3 times more tar into your lungs than a cigarette, because of deeper inhales and holding the smoke in.',
    source: 'New England Journal of Medicine, 1988',
    only: 'weed',
  },
  {
    text: 'Smoking a joint raises carbon monoxide in your blood about 5 times more than smoking a cigarette.',
    source: 'New England Journal of Medicine, 1988',
    only: 'weed',
  },
  {
    text: 'Cannabis smoke has been measured with up to 20 times more ammonia than tobacco smoke.',
    source: 'Chemical Research in Toxicology, 2008',
    only: 'weed',
  },
  {
    text: 'Regular weed smoking causes chronic cough and phlegm. Studies show both usually clear up after quitting.',
    source: 'Tashkin, Annals ATS, 2013',
    only: 'weed',
  },

  // Vaping
  {
    text: 'Diacetyl, a flavouring linked to serious lung damage, was found in 39 of 51 flavoured e-liquids tested.',
    source: 'Harvard, 2015',
    only: 'vape',
  },
  {
    text: 'Airway resistance goes up right after vaping. Your airways narrow even after a short session.',
    source: 'Chest, 2012',
    only: 'vape',
  },
  {
    text: 'Heating vape liquid can create formaldehyde and acrolein, two chemicals that irritate the lungs.',
    source: 'New England Journal of Medicine, 2015',
    only: 'vape',
  },
];

/** Facts that fit this user's habits and clean day, stage-specific ones first. */
export function factsFor(substances: Substance[], day: number) {
  const vapeOnly = substances.length === 1 && substances[0] === 'vape';
  const staged = (f: LungFact) => Number(f.from !== undefined || f.to !== undefined);
  return LUNG_FACTS.filter(
    (f) =>
      (f.from === undefined || day >= f.from) &&
      (f.to === undefined || day <= f.to) &&
      (!f.only || substances.includes(f.only)) &&
      !(f.skipVapeOnly && vapeOnly),
  ).sort((a, b) => staged(b) - staged(a));
}

/** One fact, rotating with `n` (e.g. the SOS round or the day). */
export function pickFact(substances: Substance[], day: number, n = 0): LungFact {
  const list = factsFor(substances, day);
  return list[n % list.length] ?? LUNG_FACTS[12];
}
