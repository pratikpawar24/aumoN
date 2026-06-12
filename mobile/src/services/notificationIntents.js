// Tiny pub/sub so a notification tap (which can fire before the Carpool screen
// is mounted, e.g. cold start) can hand a "open this chat" intent to whoever
// is listening. If no one is subscribed yet, the latest intent is buffered and
// delivered when a subscriber appears.
let subscriber = null;
let pending = null;

export const emitChatIntent = (intent) => {
  if (subscriber) subscriber(intent);
  else pending = intent;
};

export const subscribeChatIntent = (fn) => {
  subscriber = fn;
  if (pending) {
    const p = pending;
    pending = null;
    fn(p);
  }
  return () => { if (subscriber === fn) subscriber = null; };
};
