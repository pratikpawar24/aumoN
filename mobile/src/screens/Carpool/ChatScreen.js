import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radius, spacing } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';
import carpoolService from '../../services/carpoolService';
import { getSocket } from '../../services/socket';
import { apiError } from '../../utils/helpers';

const samePeer = (a, b) => String(a ?? '') === String(b ?? '');

// Full-screen 1:1 negotiation chat. `peerId` is the passenger party; a
// passenger talks in their own thread, a driver opens a specific passenger's.
const ChatScreen = ({ ride, peerId, peerName, onClose, onConfirmed }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const listRef = useRef(null);

  const rideId = ride?._id;
  const me = user?._id;
  const driverId = ride?.userId?._id || ride?.userId;
  const isDriver = String(driverId) === String(me);
  const effectivePeerId = peerId != null ? peerId : (isDriver ? undefined : me);

  useEffect(() => {
    if (!rideId) return;
    let cancelled = false;

    carpoolService.listMessages(rideId, effectivePeerId)
      .then((d) => { if (!cancelled) setMessages(d.messages || []); })
      .catch((e) => { if (!cancelled) { Alert.alert('Chat', apiError(e)); onClose?.(); } });

    const socket = getSocket();
    socket.emit('join-chat-room', rideId);
    const handler = (msg) => {
      if (!samePeer(msg.peerId, effectivePeerId)) return;
      setMessages((prev) => (prev.find((m) => m._id === msg._id) ? prev : [...prev, msg]));
    };
    socket.on('chat-message', handler);
    return () => {
      socket.off('chat-message', handler);
      socket.emit('leave-chat-room', rideId);
    };
  }, [rideId, effectivePeerId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (messages.length) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messages.length]);

  const send = useCallback(async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const res = await carpoolService.sendMessage(rideId, body, effectivePeerId);
      setMessages((prev) => (prev.find((m) => m._id === res.message._id) ? prev : [...prev, res.message]));
      setText('');
    } catch (e) {
      Alert.alert('Could not send', apiError(e));
    } finally {
      setSending(false);
    }
  }, [text, sending, rideId, effectivePeerId]);

  const confirm = useCallback(() => {
    Alert.alert('Confirm ride', `Confirm this passenger for the ride?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          try {
            const res = await carpoolService.confirmRide(rideId, effectivePeerId);
            setConfirmed(true);
            if (res.message) setMessages((p) => (p.find((m) => m._id === res.message._id) ? p : [...p, res.message]));
            onConfirmed?.();
          } catch (e) {
            Alert.alert('Could not confirm', apiError(e));
          }
        },
      },
    ]);
  }, [rideId, effectivePeerId]);

  const title = isDriver ? (peerName || 'Passenger') : (ride?.userId?.name || 'Driver');
  const canConfirm = isDriver && effectivePeerId && !confirmed && (ride?.seatsAvailable ?? 0) >= 1;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn}><Ionicons name="chevron-back" size={24} color={colors.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            <Text style={styles.sub} numberOfLines={1}>
              {ride?.pickup?.address?.split(',')[0]} → {ride?.dropoff?.address?.split(',')[0]}
            </Text>
          </View>
          {canConfirm ? (
            <TouchableOpacity onPress={confirm} style={styles.confirmBtn}>
              <Ionicons name="checkmark-circle" size={16} color="#04210f" />
              <Text style={styles.confirmText}>Confirm</Text>
            </TouchableOpacity>
          ) : confirmed ? (
            <Text style={styles.confirmedTag}>✓ Confirmed</Text>
          ) : null}
        </View>

        <View style={styles.notice}><Ionicons name="lock-closed" size={12} color={colors.warning} />
          <Text style={styles.noticeText}>Contact info hidden. Chat auto-deletes 24h after departure.</Text></View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m._id}
          contentContainerStyle={{ padding: spacing.lg, gap: 8 }}
          ListEmptyComponent={<Text style={styles.empty}>No messages yet. Say hi!</Text>}
          renderItem={({ item }) => {
            if (item.kind === 'system') {
              return <View style={styles.sysWrap}><Text style={styles.sys}>{item.body}</Text></View>;
            }
            const mine = String(item.userId?._id || item.userId) === String(me);
            return (
              <View style={[styles.bubbleRow, mine ? styles.right : styles.left]}>
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                  {!mine ? <Text style={styles.bubbleName}>{item.userId?.name || 'User'}</Text> : null}
                  <Text style={mine ? styles.bubbleTextMine : styles.bubbleText}>{item.body}</Text>
                </View>
              </View>
            );
          }}
        />

        <View style={styles.inputRow}>
          <TextInput
            value={text} onChangeText={setText} placeholder="Message…" placeholderTextColor={colors.textSubtle}
            style={styles.input} multiline maxLength={1000}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={send} disabled={!text.trim() || sending}>
            <Ionicons name="send" size={18} color="#04210f" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  iconBtn: { padding: 4 },
  title: { color: colors.text, fontWeight: '800', fontSize: font.h3 },
  sub: { color: colors.textSubtle, fontSize: font.tiny },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 8 },
  confirmText: { color: '#04210f', fontWeight: '800', fontSize: font.small },
  confirmedTag: { color: colors.primary, fontWeight: '700', fontSize: font.small },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(245,158,11,0.1)', paddingHorizontal: spacing.lg, paddingVertical: 8 },
  noticeText: { color: colors.warning, fontSize: font.tiny, flex: 1 },
  empty: { color: colors.textSubtle, textAlign: 'center', marginTop: 40 },
  sysWrap: { alignItems: 'center', marginVertical: 4 },
  sys: { color: colors.primary, backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4, fontSize: font.small },
  bubbleRow: { flexDirection: 'row' },
  left: { justifyContent: 'flex-start' },
  right: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '80%', borderRadius: radius.lg, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  bubbleName: { color: colors.textSubtle, fontSize: font.tiny, fontWeight: '700', marginBottom: 2 },
  bubbleText: { color: colors.text, fontSize: font.body },
  bubbleTextMine: { color: '#04210f', fontSize: font.body },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10, color: colors.text, maxHeight: 110 },
  sendBtn: { backgroundColor: colors.primary, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});

export default ChatScreen;
