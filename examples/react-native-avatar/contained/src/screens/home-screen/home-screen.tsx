import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import InfoIcon from '../../../assets/info.svg';
import KalturaMark from '../../../assets/kaltura-mark.svg';
import { Screen } from '../../components/screen';
import { BRAND } from '../../theme';
import { capabilities } from './capabilities';
import { CapabilityCard } from './capability-card';

const ICON_SIZE = 24;
const LOGO_SIZE = 40;

export function HomeScreen() {
  const [openId, setOpenId] = useState<string | undefined>(capabilities[0].id);

  return (
    <Screen
      title="Try Kaltura Agent"
      header={
        <View style={styles.brand}>
          <KalturaMark width={LOGO_SIZE} height={LOGO_SIZE} />
          <Text style={styles.logo}>kaltura</Text>
        </View>
      }
    >
      <View style={styles.info}>
        <InfoIcon width={ICON_SIZE} height={ICON_SIZE} fill={BRAND} />
        <Text style={styles.infoText}>
          <Text style={styles.bold}>Demo app.</Text> This app shows how to embed
          Kaltura Agent in a native app. The workout data is sample content.
        </Text>
      </View>

      <Text style={styles.section}>What you can do in this MVP</Text>

      {capabilities.map(capability => (
        <CapabilityCard
          key={capability.id}
          capability={capability}
          open={capability.id === openId}
          onPress={() =>
            setOpenId(current =>
              current === capability.id ? undefined : capability.id,
            )
          }
        />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  logo: {
    marginLeft: 8,
    fontSize: 32,
    fontWeight: '600',
    letterSpacing: -1,
    color: '#1C1C1E',
  },
  info: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    lineHeight: 22,
    color: '#3A3A3C',
  },
  bold: {
    fontWeight: '700',
    color: '#1C1C1E',
  },
  section: {
    marginTop: 24,
    marginBottom: 12,
    fontSize: 15,
    color: '#8E8E93',
  },
});
