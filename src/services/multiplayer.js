/**
 * 2-Player Multiplayer Synchronization Manager
 * Supports real-time peer-to-peer/broadcast synchronization for Discord Activity sessions.
 * Handless position updates, combat actions, farming state changes, and chat/emotes.
 */

export class MultiplayerManager {
  constructor() {
    this.channelName = 'rpg_2p_coop_channel';
    this.broadcastChannel = null;
    this.listeners = new Set();
    this.localPlayerId = null;
    this.remotePlayerState = null;
    this.connectedPeers = new Map();
    this.pingInterval = null;
  }

  init(playerId, roomName = 'valiant_haven_room') {
    this.localPlayerId = playerId;
    this.channelName = `rpg_2p_${roomName}`;

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel(this.channelName);
      this.broadcastChannel.onmessage = (event) => this.handleMessage(event.data);
    }

    // Announce presence
    this.send({
      type: 'JOIN',
      senderId: this.localPlayerId,
      timestamp: Date.now(),
    });

    // Start periodic heartbeat
    this.pingInterval = setInterval(() => {
      this.send({
        type: 'HEARTBEAT',
        senderId: this.localPlayerId,
        timestamp: Date.now(),
      });
    }, 2000);
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  send(data) {
    const payload = {
      ...data,
      senderId: this.localPlayerId,
      timestamp: Date.now(),
    };

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(payload);
      } catch (err) {
        console.error('[Multiplayer] Send error:', err);
      }
    }
  }

  handleMessage(msg) {
    if (!msg || msg.senderId === this.localPlayerId) return;

    if (msg.type === 'JOIN' || msg.type === 'HEARTBEAT') {
      this.connectedPeers.set(msg.senderId, Date.now());
      // Reply to new player
      if (msg.type === 'JOIN') {
        this.send({
          type: 'ACK_JOIN',
          senderId: this.localPlayerId,
        });
      }
    }

    if (msg.type === 'PLAYER_UPDATE') {
      this.remotePlayerState = msg.payload;
    }

    // Notify all subscribers
    this.listeners.forEach((callback) => callback(msg));
  }

  getRemotePlayerState() {
    return this.remotePlayerState;
  }

  destroy() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.broadcastChannel) this.broadcastChannel.close();
    this.listeners.clear();
  }
}

export const multiplayerManager = new MultiplayerManager();
