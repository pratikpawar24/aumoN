import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, radius, spacing } from '../../theme/theme';
import carpoolService from '../../services/carpoolService';
import { subscribeChatIntent } from '../../services/notificationIntents';
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

  // Open the conversation a tapped push notification refers to.
  useEffect(() => {
    const unsub = subscribeChatIntent(async (intent) => {
      setTab('inbox');
      try {
        const data = await carpoolService.listThreads();
        const t = (data.threads || []).find(
          (x) => String(x.rideId) === String(intent.rideId) && String(x.peerId) === String(intent.peerId)
        );
        if (t) setChat({ ride: t.ride, peerId: t.peerId, peerName: t.peer?.name });
      } catch (_) { /* fall back to the inbox tab */ }
    });
    return unsub;
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>🚗 Smart Carpool</Text>
        <Text style={styles.sub}>Share rides, cut emissions</Text>
      </View>

      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.k} onPress={() => setTab(t.k)} style={[styles.tab, tab === t.k && styles.tabOn]}>
            <Text style={[styles.tabText, tab === t.k && styles.tabTextOn]}>{t.label}</Text>
          </TouchableOpacity>
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
  tabs: { flexDirection: 'row', gap: 6, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.surface },
  tabOn: { backgroundColor: colors.primary },
  tabText: { color: colors.textSubtle, fontWeight: '700', fontSize: font.small },
  tabTextOn: { color: '#04210f' },
  body: { flex: 1 },
});

export default CarpoolScreen;
