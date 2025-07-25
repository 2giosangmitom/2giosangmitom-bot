/**
 * @file Music service for handling music-related operations.
 * @author Vo Quang Chien <voquangchien.dev@proton.me>
 */

import {
  EmbedBuilder,
  GuildMember,
  type ChatInputCommandInteraction,
  type Client,
  type VoiceBasedChannel
} from 'discord.js';
import { resolveUrl, updateClientId, searchTracks } from '~/services/soundcloud';
import {
  createAudioPlayer,
  joinVoiceChannel,
  PlayerSubscription,
  VoiceConnectionStatus,
  AudioPlayerStatus,
  type VoiceConnection,
  type AudioPlayer
} from '@discordjs/voice';
import { createFfmpegStream } from '~/lib/ffmpeg';
import { setIntervalImmediate } from '~/lib/utils';

interface QueueItem {
  title: string;
  url: string;
  thumbnailUrl: string;
  duration: number;
  requestedBy: string;
  mp3Url?: string;
}

interface GuildMusicData {
  queue: QueueItem[];
  currentTrack: QueueItem | null;
  connection: VoiceConnection | null;
  player: AudioPlayer | null;
  subscription: PlayerSubscription | null;
  volume: number;
  isPlaying: boolean;
  isPaused: boolean;
  isLooping: boolean;
  voiceChannelId: string | null;
  textChannelId: string | null;
  lastActivity: number;
  currentProcess: ReturnType<typeof createFfmpegStream>['process'] | null;
}

class MusicService {
  private clientId: string | undefined;
  private client: Client | undefined;
  private guilds = new Map<string, GuildMusicData>();
  private isClientIdReady = false;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(client?: Client) {
    this.client = client;
    this.initializeClientId();
    this.startCleanupTimer();
  }

  private async initializeClientId(): Promise<void> {
    try {
      this.clientId = await updateClientId();
      this.isClientIdReady = true;
      this.client?.log.info('SoundCloud client ID initialized successfully.');

      // Continue updating every hour
      setIntervalImmediate(
        () => {
          updateClientId()
            .then((clientId) => {
              this.clientId = clientId;
              this.client?.log.info('SoundCloud client ID updated successfully.');
            })
            .catch((error) => {
              this.client?.log.error(`Failed to update SoundCloud client ID: ${error}`);
            });
        },
        1000 * 60 * 60
      );
    } catch (error) {
      this.client?.log.error(`Failed to initialize SoundCloud client ID: ${error}`);
    }
  }

  private startCleanupTimer(): void {
    // Clean up inactive connections every 5 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.cleanupInactiveConnections();
      },
      5 * 60 * 1000
    );
  }

  private cleanupInactiveConnections(): void {
    const now = Date.now();
    const inactiveThreshold = 10 * 60 * 1000; // 10 minutes

    for (const [guildId, guildData] of this.guilds.entries()) {
      if (
        !guildData.isPlaying &&
        guildData.queue.length === 0 &&
        now - guildData.lastActivity > inactiveThreshold
      ) {
        this.client?.log.info(`Cleaning up inactive connection for guild ${guildId}`);
        this.leaveVoiceChannel(guildId);
      }
    }
  }

  private initializeGuildData(guildId: string): GuildMusicData {
    const guildData: GuildMusicData = {
      queue: [],
      currentTrack: null,
      connection: null,
      player: null,
      subscription: null,
      volume: 1.0,
      isPlaying: false,
      isPaused: false,
      isLooping: false,
      voiceChannelId: null,
      textChannelId: null,
      lastActivity: Date.now(),
      currentProcess: null
    };

    this.guilds.set(guildId, guildData);
    return guildData;
  }

  private getGuildData(guildId: string): GuildMusicData {
    return this.guilds.get(guildId) || this.initializeGuildData(guildId);
  }

  private async createConnection(
    voiceChannel: VoiceBasedChannel,
    guildId: string
  ): Promise<VoiceConnection> {
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: guildId,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false
    });

    // Handle connection events
    connection.on(VoiceConnectionStatus.Disconnected, () => {
      this.client?.log.info(`Voice connection disconnected for guild ${guildId}`);
      this.cleanupGuild(guildId);
    });

    connection.on(VoiceConnectionStatus.Destroyed, () => {
      this.client?.log.info(`Voice connection destroyed for guild ${guildId}`);
      this.cleanupGuild(guildId);
    });

    return connection;
  }

  private createAudioPlayer(guildId: string): AudioPlayer {
    const player = createAudioPlayer();
    const guildData = this.getGuildData(guildId);

    player.on(AudioPlayerStatus.Playing, () => {
      guildData.isPlaying = true;
      guildData.isPaused = false;
      guildData.lastActivity = Date.now();
      this.client?.log.info(`Now playing in guild ${guildId}: ${guildData.currentTrack?.title}`);
    });

    player.on(AudioPlayerStatus.Paused, () => {
      guildData.isPaused = true;
      guildData.lastActivity = Date.now();
    });

    player.on(AudioPlayerStatus.Idle, () => {
      guildData.isPlaying = false;
      guildData.isPaused = false;
      guildData.lastActivity = Date.now();

      // Clean up current process
      if (guildData.currentProcess && !guildData.currentProcess.killed) {
        guildData.currentProcess.kill('SIGTERM');
        guildData.currentProcess = null;
      }

      // Play next song in queue or loop current
      this.handleTrackEnd(guildId);
    });

    player.on('error', (error) => {
      this.client?.log.error(`Audio player error in guild ${guildId}:`, error);
      guildData.isPlaying = false;
      guildData.isPaused = false;

      // Clean up current process
      if (guildData.currentProcess && !guildData.currentProcess.killed) {
        guildData.currentProcess.kill('SIGTERM');
        guildData.currentProcess = null;
      }

      this.handleTrackEnd(guildId);
    });

    return player;
  }

  private async handleTrackEnd(guildId: string): Promise<void> {
    const guildData = this.getGuildData(guildId);

    if (guildData.isLooping && guildData.currentTrack) {
      // Loop current track
      await this.playCurrentTrack(guildId);
    } else if (guildData.queue.length > 0) {
      // Play next track
      await this.playNext(guildId);
    } else {
      // No more tracks, clean current track
      guildData.currentTrack = null;
    }
  }

  private async resolveTrackMp3Url(track: QueueItem): Promise<string> {
    if (!this.clientId) {
      throw new Error('SoundCloud service is not ready yet.');
    }

    if (track.mp3Url) {
      return track.mp3Url;
    }

    const trackData = await resolveUrl(track.url, this.clientId);
    const transcodingUrl = trackData.media.transcodings.at(0)?.url;
    if (!transcodingUrl) {
      throw new Error('No transcoding URL found for the track.');
    }

    const resolveResp = await fetch(`${transcodingUrl}?client_id=${this.clientId}`);
    if (!resolveResp.ok) {
      throw new Error(`Failed to resolve URL: ${resolveResp.statusText}`);
    }

    const { url: mp3Url } = (await resolveResp.json()) as { url: string };
    track.mp3Url = mp3Url; // Cache the URL
    return mp3Url;
  }

  private async playCurrentTrack(guildId: string): Promise<void> {
    const guildData = this.getGuildData(guildId);

    if (!guildData.currentTrack || !guildData.player || !guildData.connection) {
      return;
    }

    try {
      const mp3Url = await this.resolveTrackMp3Url(guildData.currentTrack);
      const audioStream = createFfmpegStream(mp3Url);

      // Store process reference for cleanup
      guildData.currentProcess = audioStream.process;

      guildData.player.play(audioStream.resource);
    } catch (error) {
      this.client?.log.error(`Failed to play track in guild ${guildId}:`, error);
      await this.handleTrackEnd(guildId);
    }
  }

  private async playNext(guildId: string): Promise<void> {
    const guildData = this.getGuildData(guildId);

    if (guildData.queue.length === 0) {
      guildData.currentTrack = null;
      return;
    }

    guildData.currentTrack = guildData.queue.shift()!;
    await this.playCurrentTrack(guildId);
  }

  private cleanupGuild(guildId: string): void {
    const guildData = this.guilds.get(guildId);
    if (!guildData) return;

    // Stop and cleanup player
    if (guildData.player) {
      guildData.player.stop();
      guildData.player.removeAllListeners();
    }

    // Cleanup subscription
    if (guildData.subscription) {
      guildData.subscription.unsubscribe();
    }

    // Cleanup FFmpeg process
    if (guildData.currentProcess && !guildData.currentProcess.killed) {
      guildData.currentProcess.kill('SIGTERM');
    }

    // Destroy connection
    if (guildData.connection) {
      guildData.connection.destroy();
    }

    // Remove guild data
    this.guilds.delete(guildId);
    this.client?.log.info(`Cleaned up guild data for ${guildId}`);
  }

  // Public methods

  public async play(query: string, interaction: ChatInputCommandInteraction): Promise<void> {
    if (!this.isClientIdReady || !this.clientId) {
      throw new Error('SoundCloud service is not ready yet. Please try again in a moment.');
    }

    if (!interaction.guild) {
      throw new Error('This command can only be used in a server.');
    }

    const member = interaction.member;
    if (!(member instanceof GuildMember)) {
      throw new Error('This command can only be used by a guild member.');
    }

    const voiceChannel = member.voice.channel;
    if (!voiceChannel) {
      throw new Error('You must be in a voice channel to use this command.');
    }

    const permissions = voiceChannel.permissionsFor(interaction.client.user);
    if (!permissions?.has('Connect') || !permissions?.has('Speak')) {
      throw new Error('I do not have permission to join or speak in your voice channel.');
    }

    const guildId = interaction.guild.id;
    const guildData = this.getGuildData(guildId);

    // Check if bot is already in a different voice channel
    if (guildData.voiceChannelId && guildData.voiceChannelId !== voiceChannel.id) {
      throw new Error('I am already playing music in a different voice channel.');
    }

    let track: QueueItem;

    // Handle URL vs search
    if (/^https.*/.test(query)) {
      if (!/https:\/\/soundcloud\.com\/[^\s]*/.test(query)) {
        throw new Error('Invalid SoundCloud URL provided.');
      }

      const trackData = await resolveUrl(query, this.clientId);
      track = {
        title: trackData.title,
        url: trackData.permalink_url,
        thumbnailUrl: trackData.artwork_url,
        duration: trackData.duration,
        requestedBy: member.user.username
      };
    } else {
      // Search functionality
      const searchResult = await searchTracks(query, this.clientId);
      if (searchResult.collection.length === 0) {
        throw new Error('No tracks found for the given query.');
      }

      const firstTrack = searchResult.collection[0];
      if (!firstTrack) {
        throw new Error('No tracks found for the given query.');
      }

      track = {
        title: firstTrack.title,
        url: firstTrack.permalink_url,
        thumbnailUrl: firstTrack.artwork_url,
        duration: firstTrack.duration,
        requestedBy: member.user.username
      };
    }

    // Setup connection and player if needed
    if (!guildData.connection) {
      guildData.connection = await this.createConnection(voiceChannel, guildId);
      guildData.voiceChannelId = voiceChannel.id;
    }

    if (!guildData.player) {
      guildData.player = this.createAudioPlayer(guildId);
      guildData.subscription = guildData.connection.subscribe(guildData.player) || null;
    }

    guildData.textChannelId = interaction.channelId;

    // Add to queue or play immediately
    if (guildData.currentTrack && guildData.isPlaying) {
      guildData.queue.push(track);
      await interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setTitle('🎵 Added to Queue')
            .setThumbnail(track.thumbnailUrl)
            .setDescription(`[${track.title}](${track.url})`)
            .addFields(
              { name: 'Position in Queue', value: `${guildData.queue.length}`, inline: true },
              { name: 'Requested by', value: track.requestedBy, inline: true }
            )
            .setColor('Blue')
            .setTimestamp()
        ]
      });
    } else {
      guildData.currentTrack = track;
      await this.playCurrentTrack(guildId);

      await interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setTitle('🎶 Now Playing')
            .setThumbnail(track.thumbnailUrl)
            .setDescription(`[${track.title}](${track.url})`)
            .addFields({ name: 'Requested by', value: track.requestedBy, inline: true })
            .setColor('Green')
            .setFooter({
              text: 'Powered by SoundCloud',
              iconURL: 'https://a-v2.sndcdn.com/assets/images/sc-icons/ios-a62dfc8fe7.png'
            })
            .setTimestamp()
        ]
      });
    }
  }

  public async skip(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) {
      throw new Error('This command can only be used in a server.');
    }

    const guildData = this.getGuildData(interaction.guild.id);

    if (!guildData.isPlaying) {
      throw new Error('No music is currently playing.');
    }

    if (guildData.player) {
      guildData.player.stop(); // This will trigger the 'idle' event and play next
    }

    await interaction.followUp('⏭️ Skipped the current track.');
  }

  public async pause(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) {
      throw new Error('This command can only be used in a server.');
    }

    const guildData = this.getGuildData(interaction.guild.id);

    if (!guildData.isPlaying) {
      throw new Error('No music is currently playing.');
    }

    if (guildData.player) {
      guildData.player.pause();
    }

    await interaction.followUp('⏸️ Paused the current track.');
  }

  public async resume(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) {
      throw new Error('This command can only be used in a server.');
    }

    const guildData = this.getGuildData(interaction.guild.id);

    if (!guildData.isPaused) {
      throw new Error('No music is currently paused.');
    }

    if (guildData.player) {
      guildData.player.unpause();
    }

    await interaction.followUp('▶️ Resumed the current track.');
  }

  public async stop(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) {
      throw new Error('This command can only be used in a server.');
    }

    const guildData = this.getGuildData(interaction.guild.id);

    if (!guildData.isPlaying && !guildData.isPaused) {
      throw new Error('No music is currently playing.');
    }

    // Clear queue and stop
    guildData.queue = [];
    guildData.currentTrack = null;

    if (guildData.player) {
      guildData.player.stop();
    }

    await interaction.followUp('⏹️ Stopped music and cleared the queue.');
  }

  public async leaveVoiceChannel(guildId: string): Promise<void> {
    this.cleanupGuild(guildId);
  }

  public async getQueue(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) {
      throw new Error('This command can only be used in a server.');
    }

    const guildData = this.getGuildData(interaction.guild.id);

    if (!guildData.currentTrack && guildData.queue.length === 0) {
      await interaction.followUp('The queue is empty.');
      return;
    }

    const embed = new EmbedBuilder().setTitle('🎵 Music Queue').setColor('Purple').setTimestamp();

    if (guildData.currentTrack) {
      embed.addFields({
        name: '🎶 Now Playing',
        value: `[${guildData.currentTrack.title}](${guildData.currentTrack.url})\nRequested by: ${guildData.currentTrack.requestedBy}`,
        inline: false
      });
    }

    if (guildData.queue.length > 0) {
      const queueList = guildData.queue
        .slice(0, 10) // Show first 10 items
        .map(
          (track, index) => `${index + 1}. [${track.title}](${track.url}) - ${track.requestedBy}`
        )
        .join('\n');

      embed.addFields({
        name: `📝 Queue (${guildData.queue.length} tracks)`,
        value: queueList + (guildData.queue.length > 10 ? '\n... and more' : ''),
        inline: false
      });
    }

    await interaction.followUp({ embeds: [embed] });
  }

  public destroy(): void {
    // Cleanup all guild connections
    for (const guildId of this.guilds.keys()) {
      this.cleanupGuild(guildId);
    }

    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

export default MusicService;
