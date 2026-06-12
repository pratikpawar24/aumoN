import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, radius, spacing } from '../../theme/theme';
import FindRides from './FindRides';
import ScheduleRide from './ScheduleRide';
import RideHistory from './RideHistory';
import ChatInbox from './ChatInbox';
import ChatScreen from './ChatScreen';
import RideDetailsScreen from './RideDetailsScreen';

const TABS = [
  { k: 'find', label: 'Find' },
  { k: 'schedule', label: 'Schedule' },
  { k: 'inbox', label: 'Inbox' },
  { k: 'history', label: 'History' },
];

const CarpoolScreen = () => {
  const [tab, setTab] = useState('find');
  const [reload, setReload] = useState(0);          // history reload
  const [inboxReload, setInboxReload] = useState(0); // inbox reload
  const [chat, setChat] = useState(null);            // { ride, peerId?, peerName? }
  const [detail, setDetail] = useState(null);        // a history ride

  const goHistory = useCallback(() => { setReload((n) => n + 1); setTab('history'); }, []);
  const closeChat = useCallback(() => setChat(null), []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>🚗 Smart Carpool</Text>
        <Text style={styles.sub}>Share rides, cut emissions</Text>
      </View>

      <View style={styles.tabs}>
        {TABS.map((t) => (
          <Text key={t.k} onPress={() => setTab(t.k)} style={[styles.tab, tab === t.k && styles.tabOn]}>
            {t.label}
          </Text>
        ))}
      </View>

      <View style={styles.body}>
        {tab === 'find' && <FindRides onOpenChat={(ride) => setChat({ ride })} />}
        {tab === 'schedule' && <ScheduleRide onScheduled={goHistory} />}
        {tab === 'inbox' && (
          <ChatInbox
            reloadKey={inboxReload}
            onOpenThread={(t) => setChat({ ride: t.ride, peerId: t.peerId, peerName: t.peer?.name })}
          />
        )}
        {tab === 'history' && <RideHistory reloadKey={reload} onOpenDetail={setDetail} />}
      </View>

      <Modal visible={!!chat} animationType="slide" onRequestClose={closeChat}>
        {chat && (
          <ChatScreen
            ride={chat.ride}
            peerId={chat.peerId}
            peerName={chat.peerName}
            onClose={closeChat}
            onConfirmed={() => setInboxReload((n) => n + 1)}
          />
        )}
      </Modal>

      <Modal visible={!!detail} animationType="slide" onRequestClose={() => setDetail(null)}>
        {detail && (
          <RideDetailsScreen
            ride={detail}
            onClose={() => setDetail(null)}
            onCancelled={() => { setDetail(null); setReload((n) => n + 1); }}
            onMessages={() => { setDetail(null); setTab('inbox'); }}
          />
        )}
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  title: { color: colors.text, fontSize: font.h2, fontWeight: '800' },
  sub: { color: colors.textSubtle, marginTop: 2 },
  tabs: { flexDirection: 'row', gap: 6, padding: spacing.lg },
  tab: {
    flex: 1, textAlign: 'center', paddingVertical: 10, borderRadius: radius.md,
    backgroundColor: colors.surface, color: colors.textSubtle, fontWeight: '700', overflow: 'hidden', fontSize: font.small,
  },
  tabOn: { backgroundColor: colors.primary, color: '#04210f' },
  body: { flex: 1 },
});

export default CarpoolScreen;
