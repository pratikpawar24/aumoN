const axios = require('axios');
const User = require('../models/User');

// Expo push API — no SDK needed, just a POST. Tokens look like
// "ExponentPushToken[xxxx]". Best-effort: never throws to callers.
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const isExpoToken = (t) => typeof t === 'string' && t.startsWith('ExponentPushToken');

/**
 * Send a push to every device of a user.
 * @param {string} userId
 * @param {{ title: string, body: string, data?: object }} msg
 */
const sendToUser = async (userId, { title, body, data = {} }) => {
  try {
    if (!userId) return;
    const user = await User.findById(userId).select('pushTokens isBlocked');
    if (!user || user.isBlocked) return;
    const tokens = (user.pushTokens || []).filter(isExpoToken);
    if (!tokens.length) return;

    const messages = tokens.map((to) => ({ to, title, body, data, sound: 'default', priority: 'high' }));
    const res = await axios.post(EXPO_PUSH_URL, messages, {
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      timeout: 8000,
    });

    // Prune tokens Expo reports as unregistered so we stop pushing to dead devices.
    const tickets = res.data?.data || [];
    const dead = [];
    tickets.forEach((t, i) => {
      if (t?.status === 'error' && t?.details?.error === 'DeviceNotRegistered') dead.push(tokens[i]);
    });
    if (dead.length) {
      await User.updateOne({ _id: userId }, { $pull: { pushTokens: { $in: dead } } });
    }
  } catch (err) {
    console.warn('Push send failed:', err.response?.data?.errors?.[0]?.message || err.message);
  }
};

module.exports = { sendToUser };
