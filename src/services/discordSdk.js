/**
 * Discord SDK Integration Adapter
 * Connects the 2-Player RPG Game Client to Discord Activity / Embedded App Frame APIs.
 * Automatically falls back to Mock Mode when running in standard standalone browser environment.
 */

export class DiscordService {
  constructor() {
    this.isEmbedded = typeof window !== 'undefined' && window.parent !== window;
    this.sdk = null;
    this.user = {
      id: 'p1_' + Math.random().toString(36).substring(2, 7),
      username: 'Adventurer_1',
      discriminator: '0001',
      avatar: null,
      isHost: true,
    };
    this.instanceId = 'room_default_coop';
    this.channelId = 'channel_default';
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return this.user;

    try {
      // Check if official SDK is loaded via npm or script
      if (window.DiscordSDK) {
        this.sdk = new window.DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID || '123456789');
        await this.sdk.ready();

        // Authorize & Authenticate if configured
        const { code } = await this.sdk.commands.authorize({
          client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
          response_type: 'code',
          state: '',
          prompt: 'none',
          scope: ['identify', 'guilds'],
        });

        const auth = await this.sdk.commands.authenticate({ code });
        if (auth && auth.user) {
          this.user = {
            id: auth.user.id,
            username: auth.user.username,
            avatar: auth.user.avatar,
            isHost: true,
          };
        }
        if (this.sdk.instanceId) this.instanceId = this.sdk.instanceId;
        if (this.sdk.channelId) this.channelId = this.sdk.channelId;
      } else {
        // Mock fallback for standalone testing
        const urlParams = new URLSearchParams(window.location.search);
        const playerNum = urlParams.get('player') || '1';

        this.user = {
          id: `player_${playerNum}`,
          username: playerNum === '1' ? 'Hero_A' : 'Hero_B',
          avatar: null,
          isHost: playerNum === '1',
          playerSlot: parseInt(playerNum, 10),
        };
        this.instanceId = urlParams.get('room') || 'valiant_haven_room';
      }
    } catch (err) {
      console.warn('[DiscordSDK] Running in Mock Fallback Mode:', err.message || err);
      const urlParams = new URLSearchParams(window.location.search);
      const playerNum = urlParams.get('player') || '1';
      this.user = {
        id: `player_${playerNum}`,
        username: playerNum === '1' ? 'Hero_A' : 'Hero_B',
        avatar: null,
        isHost: playerNum === '1',
        playerSlot: parseInt(playerNum, 10),
      };
    }

    this.isInitialized = true;
    return this.user;
  }

  getUser() {
    return this.user;
  }

  getInstanceId() {
    return this.instanceId;
  }
}

export const discordService = new DiscordService();
