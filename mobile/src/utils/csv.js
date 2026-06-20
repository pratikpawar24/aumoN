import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// Build a CSV string and open the native share sheet so the admin can save or
// send it. Returns the file URI written to the cache directory.
export const exportCsv = async (filename, header, rows) => {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const body = rows.map((r) => r.map(esc).join(',')).join('\n');
  const csv = [header, body].join('\n');
  const uri = FileSystem.cacheDirectory + filename;
  await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: filename, UTI: 'public.comma-separated-values-text' });
  }
  return uri;
};
