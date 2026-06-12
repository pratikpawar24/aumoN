import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radius, spacing } from '../../theme/theme';
import carpoolService from '../../services/carpoolService';
import { apiError } from '../../utils/helpers';
import Loading from '../../components/common/Loading';

const ChatInbox = ({ onOpenThread, reloadKey }) => {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const data = await carpoolService.listThreads();
      setThreads(data.threads || []);
    } catch (e) {
      setErr(apiError(e, 'Could not load conversations.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, reloadKey]);

  if (loading) return <Loading full label="Loading conversations…" />;

  return (
    <FlatList
      data={threads}
      keyExtractor={(t) => `${t.rideId}_${t.peerId}`}
      contentContainerStyle={{ padding: spacing.lg, gap: 10 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="chatbubbles-outline" size={40} color={colors.textSubtle} />
          <Text style={styles.emptyText}>{err || 'No conversations yet'}</Text>
          <Text style={styles.emptySub}>Message a driver from “Find” to negotiate a seat.</Text>
        </View>
      }
      renderItem={({ item }) => {
        const other = item.iAmDriver ? item.peer : item.ride?.userId;
        const name = other?.name || (item.iAmDriver ? 'Passenger' : 'Driver');
        return (
          <TouchableOpacity style={styles.row} onPress={() => onOpenThread(item)}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{name[0].toUpperCase()}</Text></View>
            <View style={{ flex: 1 }}>
              <View style={styles.head}>
                <Text style={styles.name} numberOfLines={1}>{name}</Text>
                <Text style={styles.tag}>{item.iAmDriver ? 'Driving' : 'Passenger'}</Text>
                {item.confirmed ? <Ionicons name="checkmark-circle" size={15} color={colors.primary} /> : null}
              </View>
              <Text style={styles.last} numberOfLines={1}>{item.lastBody}</Text>
              <Text style={styles.route} numberOfLines={1}>
                {item.ride?.pickup?.address?.split(',')[0]} → {item.ride?.dropoff?.address?.split(',')[0]}
              </Text>
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontWeight: '800' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { color: colors.text, fontWeight: '700', flexShrink: 1 },
  tag: { color: colors.textSubtle, fontSize: font.tiny, borderWidth: 1, borderColor: colors.border, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  last: { color: colors.textSubtle, fontSize: font.small, marginTop: 2 },
  route: { color: colors.textSubtle, fontSize: font.tiny, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { color: colors.text, fontWeight: '600' },
  emptySub: { color: colors.textSubtle, fontSize: font.small },
});

export default ChatInbox;
