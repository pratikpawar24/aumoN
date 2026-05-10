import React, { useEffect, useRef, useState } from 'react';
import { X, Send, Lock } from 'lucide-react';
import carpoolService from '../../services/carpoolService';
import { getSocket } from '../../services/socket';
import { useAuth } from '../../hooks/useAuth';
import { Spinner } from '../Common/Loading';
import { formatRelativeTime } from '../../utils/helpers';
import toast from 'react-hot-toast';

const ChatPanel = ({ ride, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const socketRef = useRef(null);

  const rideId = ride?._id;

  // Initial fetch + socket subscription
  useEffect(() => {
    if (!rideId) return;
    let cancelled = false;

    carpoolService.listMessages(rideId)
      .then((data) => { if (!cancelled) setMessages(data.messages || []); })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err.response?.data?.message || 'Could not load chat');
        onClose?.();
      })
      .finally(() => !cancelled && setLoading(false));

    const socket = getSocket();
    socketRef.current = socket;
    socket.emit('join-chat-room', rideId);
    const handler = (msg) => {
      // De-dupe by _id
      setMessages((prev) =>
        prev.find((m) => m._id === msg._id) ? prev : [...prev, msg]
      );
    };
    socket.on('chat-message', handler);

    return () => {
      cancelled = true;
      socket.off('chat-message', handler);
      socket.emit('leave-chat-room', rideId);
    };
  }, [rideId, onClose]);

  // Auto-scroll to latest
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const res = await carpoolService.sendMessage(rideId, body);
      // Server emits to room; we still optimistically push for self in case
      // of any socket gap.
      setMessages((prev) =>
        prev.find((m) => m._id === res.message._id) ? prev : [...prev, res.message]
      );
      setText('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send');
    } finally {
      setSending(false);
    }
  };

  if (!ride) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4
                    bg-black/50 backdrop-blur-sm animate-fade-in"
         onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg h-[85vh] sm:h-[600px] flex flex-col
                   rounded-t-2xl sm:rounded-2xl border aumo-border aumo-bg-surface
                   shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b aumo-border">
          <div className="min-w-0">
            <h3 className="font-semibold aumo-text-primary truncate">
              {ride.userId?.name || 'Driver'}
            </h3>
            <p className="text-xs aumo-text-subtle truncate">
              {ride.pickup?.address?.split(',')[0]} → {ride.dropoff?.address?.split(',')[0]}
            </p>
          </div>
          <button onClick={onClose}
                  className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center
                             rounded-lg aumo-text-muted hover:aumo-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Privacy notice */}
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20
                        flex items-center gap-2 text-xs text-amber-500">
          <Lock className="w-3 h-3 flex-shrink-0" />
          <span>Contact info is hidden. Share manually if needed. Chat auto-deletes 24h after departure.</span>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {loading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : !messages.length ? (
            <p className="text-center aumo-text-subtle text-sm py-8">
              No messages yet. Say hi!
            </p>
          ) : (
            messages.map((m) => {
              const mine = String(m.userId?._id || m.userId) === String(user?._id);
              return (
                <div key={m._id}
                     className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm
                                   ${mine
                                     ? 'bg-green-500 text-white rounded-br-md'
                                     : 'aumo-bg-elevated aumo-text-primary rounded-bl-md border aumo-border'}`}>
                    {!mine && (
                      <p className="text-xs font-semibold mb-0.5 opacity-80">
                        {m.userId?.name || 'User'}
                      </p>
                    )}
                    <p className="break-words whitespace-pre-wrap">{m.body}</p>
                    <p className={`text-[10px] mt-0.5 ${mine ? 'text-white/70' : 'aumo-text-subtle'}`}>
                      {formatRelativeTime(m.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSend}
              className="flex gap-2 p-3 border-t aumo-border">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
            placeholder="Message…"
            className="flex-1 rounded-full px-4 py-3 min-h-[44px] text-sm aumo-text-primary
                       aumo-bg-input border aumo-border focus:border-green-500/50 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="px-4 min-h-[44px] min-w-[44px] flex items-center justify-center
                       bg-green-500 hover:bg-green-600 disabled:opacity-50
                       text-white rounded-full transition-colors"
          >
            {sending ? <Spinner size="sm" color="white" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;
