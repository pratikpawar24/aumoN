import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, font, spacing } from '../../theme/theme';
import mapService from '../../services/mapService';

// Debounced backend-proxied location search. Calls onSelect with
// { lat, lng, address }. Tapping a result (or the first one) fills the field.
const LocationSearchInput = ({ label, placeholder, value, onSelect, dotColor }) => {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const timer = useRef(null);

  React.useEffect(() => { setQuery(value || ''); }, [value]);

  const search = (q) => {
    clearTimeout(timer.current);
    if (!q || q.trim().length < 2) { setResults([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      try {
        const res = await mapService.autocomplete(q.trim());
        const usable = (res || []).filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng));
        setResults(usable.slice(0, 6));
        setOpen(usable.length > 0);
      } catch (_) {
        setResults([]); setOpen(false);
      }
    }, 350);
  };

  const pick = (r) => {
    setQuery(r.display || r.name);
    setOpen(false);
    setResults([]);
    onSelect?.({ lat: r.lat, lng: r.lng, address: r.display || r.name });
  };

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.field}>
        <View style={[styles.dot, { backgroundColor: dotColor || colors.primary }]} />
        <TextInput
          value={query}
          onChangeText={(t) => { setQuery(t); search(t); }}
          onSubmitEditing={() => results[0] && pick(results[0])}
          placeholder={placeholder}
          placeholderTextColor={colors.textSubtle}
          style={styles.input}
          returnKeyType="search"
        />
        {query ? (
          <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setOpen(false); onSelect?.(null); }}>
            <Ionicons name="close" size={18} color={colors.textSubtle} />
          </TouchableOpacity>
        ) : null}
      </View>

      {open && (
        <View style={styles.dropdown}>
          <FlatList
            keyboardShouldPersistTaps="handled"
            data={results}
            keyExtractor={(item, i) => `${item.id || i}`}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.row} onPress={() => pick(item)}>
                <Ionicons name="location-outline" size={16} color={colors.textSubtle} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{item.name || item.display}</Text>
                  {item.display && item.display !== item.name ? (
                    <Text style={styles.rowSub} numberOfLines={1}>{item.display}</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md, position: 'relative', zIndex: 10 },
  label: { color: colors.textSubtle, fontSize: font.small, marginBottom: 6 },
  field: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 12, minHeight: 50,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  input: { flex: 1, color: colors.text, fontSize: font.body, paddingVertical: 12 },
  dropdown: {
    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong,
    borderRadius: radius.md, maxHeight: 240, zIndex: 50, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  rowTitle: { color: colors.text, fontSize: font.small, fontWeight: '600' },
  rowSub: { color: colors.textSubtle, fontSize: font.tiny, marginTop: 2 },
});

export default LocationSearchInput;
