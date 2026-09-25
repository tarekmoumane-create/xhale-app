import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { COACH_ENABLED } from '@/constants/features';
import { Colors } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <NativeTabs
      backgroundColor={Colors.bg}
      labelStyle={{ default: { color: Colors.text3 }, selected: { color: Colors.text } }}
      tintColor={Colors.accent}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: 'circle.circle', selected: 'circle.circle.fill' }} md="radio_button_checked" />
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="plan">
        <NativeTabs.Trigger.Icon sf="arrow.left.arrow.right" md="swap_horiz" />
        <NativeTabs.Trigger.Label>Plan</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="coach" hidden={!COACH_ENABLED}>
        <NativeTabs.Trigger.Icon sf={{ default: 'bubble.left', selected: 'bubble.left.fill' }} md="chat" />
        <NativeTabs.Trigger.Label>Coach</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="recovery">
        <NativeTabs.Trigger.Icon sf={{ default: 'lungs', selected: 'lungs.fill' }} md="favorite" />
        <NativeTabs.Trigger.Label>Recovery</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
