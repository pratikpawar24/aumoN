import React, { useState } from 'react';
import { Users, Search, Calendar, Clock, MessageSquare } from 'lucide-react';
import FindRides    from './FindRides';
import ScheduleRide from './ScheduleRide';
import RideHistory  from './RideHistory';
import ChatInbox    from './ChatInbox';
import ChatPanel    from './ChatPanel';

const TABS = [
  { id: 'find',     label: 'Find Rides',    icon: Search },
  { id: 'schedule', label: 'Schedule Ride', icon: Calendar },
  { id: 'inbox',    label: 'Inbox',         icon: MessageSquare },
  { id: 'history',  label: 'History',       icon: Clock },
];

const CarpoolDashboard = () => {
  const [tab, setTab] = useState('find');
  // The chat to show, if any: { ride, peerId?, peerName? }.
  const [chat, setChat] = useState(null);
  const [inboxRefresh, setInboxRefresh] = useState(0);

  const closeChat = () => setChat(null);

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold aumo-text-primary flex items-center gap-2">
          <Users className="w-6 h-6 text-green-500" />
          Smart Carpool
        </h1>
        <p className="aumo-text-subtle text-sm mt-1">
          Share rides, save fuel, cut emissions.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl p-1 aumo-bg-surface border aumo-border">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 min-h-[44px]
                        rounded-lg text-sm font-medium transition-all
                        ${tab === id
                          ? 'bg-green-500 text-white shadow'
                          : 'aumo-text-subtle hover:aumo-text-primary'}`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{label.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'find'     && <FindRides    onOpenChat={(ride) => setChat({ ride })} />}
      {tab === 'schedule' && <ScheduleRide onSuccess={() => setTab('history')} />}
      {tab === 'inbox'    && (
        <ChatInbox
          refreshKey={inboxRefresh}
          onOpenThread={(t) => setChat({ ride: t.ride, peerId: t.peerId, peerName: t.peer?.name })}
        />
      )}
      {tab === 'history'  && <RideHistory />}

      {chat && (
        <ChatPanel
          ride={chat.ride}
          peerId={chat.peerId}
          peerName={chat.peerName}
          onClose={closeChat}
          onConfirmed={() => setInboxRefresh((n) => n + 1)}
        />
      )}
    </div>
  );
};

export default CarpoolDashboard;
