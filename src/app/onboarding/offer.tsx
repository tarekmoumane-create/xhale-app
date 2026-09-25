import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BreathOrb } from '@/components/breath';
import { Body, Button, Caption, Enter, Eyebrow, IconButton, LinkButton, Screen, Title } from '@/components/ui';
import { Colors, Fonts } from '@/constants/theme';
import { track } from '@/lib/analytics';
import { unlock } from '@/lib/finish';
import { FALLBACK_PRICES, getPrice, purchase } from '@/lib/purchases';
import { setState } from '@/lib/store';

export default function Offer() {
  const [price, setPrice] = useState(FALLBACK_PRICES.exit);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    track('exit_offer_viewed');
    // Shown once. After this, the paywall has no close button.
    setState({ offerSeen: true });
    getPrice('exit').then(setPrice);
  }, []);

  const claim = async () => {
    setBusy(true);
    setError(null);
    try {
      if (await purchase('exit')) {
        track('subscribed', { plan: 'exit' });
        unlock();
      }
    } catch (e) {
      setError((e as Error).message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      header={
        <View style={{ alignItems: 'flex-end', paddingTop: 4 }}>
          <IconButton icon="xmark" android="close" label="Close" onPress={() => router.back()} />
        </View>
      }
      footer={
        <>
          <Button title={`Claim for ${price}`} tone="accent" loading={busy} onPress={claim} />
          {error ? (
            <Caption center style={{ color: Colors.danger }}>
              {error}
            </Caption>
          ) : null}
          <LinkButton title="No thanks, back to the free trial" onPress={() => router.back()} />
        </>
      }>
      <View style={styles.orb}>
        <BreathOrb size={150} />
      </View>
      <Enter i={0} style={{ gap: 12 }}>
        <Eyebrow style={{ color: Colors.accent }}>A one-time offer</Eyebrow>
        <Title style={{ fontSize: 36, lineHeight: 40 }}>Your first year for {price}.</Title>
        <Body>This price won’t come back.</Body>
      </Enter>
      <Enter i={1}>
        <View style={styles.priceCard}>
          <Text style={styles.was}>$49</Text>
          <Text style={styles.now}>{price}</Text>
          <Caption style={{ color: Colors.text2 }}>for your first year, then $49/year</Caption>
        </View>
      </Enter>
    </Screen>
  );
}

const styles = StyleSheet.create({
  orb: { alignItems: 'center', paddingVertical: 10 },
  priceCard: {
    alignItems: 'center',
    gap: 2,
    paddingVertical: 22,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.accentSoft,
  },
  was: { fontFamily: Fonts.semi, fontSize: 17, color: Colors.text3, textDecorationLine: 'line-through' },
  now: { fontFamily: Fonts.display, fontSize: 60, lineHeight: 66, color: Colors.text },
});
