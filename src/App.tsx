import React, { useState, useEffect } from 'react';
import { LandingView } from './views/LandingView';
import { HostView } from './views/HostView';
import { RemoteView } from './views/RemoteView';
import { SearchTrack } from './types';

export default function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'host' | 'remote'>('landing');
  const [activeRoomCode, setActiveRoomCode] = useState<string>('');
  const [activeGuestName, setActiveGuestName] = useState<string>('');

  // Handle URL path parsing on initial mount & back/forward navigation
  useEffect(() => {
    const parseUrl = () => {
      const path = window.location.pathname;
      const hostMatch = path.match(/^\/host\/([A-Za-z0-9]+)/);
      const remoteMatch = path.match(/^\/remote\/([A-Za-z0-9]+)/);

      if (hostMatch && hostMatch[1]) {
        setActiveRoomCode(hostMatch[1].toUpperCase());
        setCurrentView('host');
      } else if (remoteMatch && remoteMatch[1]) {
        setActiveRoomCode(remoteMatch[1].toUpperCase());
        setCurrentView('remote');
      } else {
        setCurrentView('landing');
      }
    };

    parseUrl();
    window.addEventListener('popstate', parseUrl);
    return () => window.removeEventListener('popstate', parseUrl);
  }, []);

  const navigateTo = (view: 'landing' | 'host' | 'remote', code: string = '', guestName: string = '') => {
    setActiveRoomCode(code);
    setActiveGuestName(guestName);
    setCurrentView(view);

    let path = '/';
    if (view === 'host' && code) path = `/host/${code}`;
    else if (view === 'remote' && code) path = `/remote/${code}`;

    window.history.pushState({}, '', path);
  };

  const handleCreateRoom = async (roomName: string) => {
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: roomName }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.room?.code) {
          navigateTo('host', data.room.code);
          return;
        }
      }
    } catch (err) {
      console.error('Failed to create room:', err);
    }
    // Fallback to demo room
    navigateTo('host', 'KARA88');
  };

  const handleJoinRoom = (code: string, guestName: string) => {
    navigateTo('remote', code.toUpperCase(), guestName);
  };

  const handleQuickPlay = async (track: SearchTrack) => {
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `${track.title.slice(0, 20)} Lounge` }),
      });

      if (res.ok) {
        const data = await res.json();
        const code = data.room?.code || 'KARA88';

        // Connect and route to host
        navigateTo('host', code);

        // Queue the track via REST or WebSocket after room creation
        setTimeout(async () => {
          try {
            const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
            const tempWs = new WebSocket(wsUrl);
            tempWs.onopen = () => {
              tempWs.send(
                JSON.stringify({
                  type: 'join_room',
                  roomCode: code,
                  role: 'host',
                  guestName: 'Quick Host',
                })
              );
              tempWs.send(
                JSON.stringify({
                  type: 'add_to_queue',
                  roomCode: code,
                  track: {
                    video_id: track.video_id,
                    title: track.title,
                    channel_title: track.channel_title,
                    thumbnail_url: track.thumbnail_url,
                    duration: track.duration,
                    added_by: 'Quick Singer',
                  },
                })
              );
              setTimeout(() => tempWs.close(), 1000);
            };
          } catch (e) {}
        }, 300);
      }
    } catch (err) {
      console.error('Quick play error:', err);
      navigateTo('host', 'KARA88');
    }
  };

  const handleGoHome = () => {
    navigateTo('landing');
  };

  if (currentView === 'host' && activeRoomCode) {
    return <HostView roomCode={activeRoomCode} onGoHome={handleGoHome} />;
  }

  if (currentView === 'remote' && activeRoomCode) {
    return (
      <RemoteView
        roomCode={activeRoomCode}
        initialGuestName={activeGuestName || 'Singer'}
        onGoHome={handleGoHome}
      />
    );
  }

  return (
    <LandingView
      onCreateRoom={handleCreateRoom}
      onJoinRoom={handleJoinRoom}
      onQuickPlay={handleQuickPlay}
    />
  );
}
