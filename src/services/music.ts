/**
 * @file Music service for handling music-related operations.
 * @author Vo Quang Chien <voquangchien.dev@proton.me>
 */

import {
  EmbedBuilder,
  GuildMember,
  type ChatInputCommandInteraction,
  type Client
} from 'discord.js';
import { resolveUrl, updateClientId } from '~/services/soundcloud';
import {
  createAudioPlayer,
  joinVoiceChannel,
  PlayerSubscription,
  VoiceConnectionStatus
} from '@discordjs/voice';
import { createFfmpegStream } from '~/lib/ffmpeg';
import { setIntervalImmediate } from '~/lib/utils';

type MusicInstance = {
  audioStream: ReturnType<typeof createFfmpegStream>;
  subscription: PlayerSubscription | undefined;
};

class MusicService {
  private clientId: string | undefined;
  private client: Client | undefined;
  private instances = new WeakMap<ReturnType<typeof joinVoiceChannel>, MusicInstance>();

  constructor(client?: Client) {
    this.client = client;

    setIntervalImmediate(
      () => {
        updateClientId()
          .then((clientId) => {
            this.clientId = clientId;
            this.client?.log.info('SoundCloud client ID updated successfully.');
          })
          .catch((error) => {
            client?.log.error(`Failed to update SoundCloud client ID: ${error}`);
          });
      },
      1000 * 60 * 60
    ); // Update client ID every hour
  }

  async play(query: string, interaction: ChatInputCommandInteraction): Promise<void> {
    // Check if the client ID is set
    if (!this.clientId) {
      throw new Error('SoundCloud service is not ready yet.');
    }

    // Ensure the interaction is in a guild and the member is valid
    if (!interaction.guild) {
      throw new Error('This command can only be used in a server.');
    }

    const member = interaction.member;
    if (!(member instanceof GuildMember)) {
      throw new Error('This command can only be used by a guild member.');
    }

    // Check if the member is in a voice channel and has permissions
    const voiceChannel = member.voice.channel;
    if (!voiceChannel) {
      throw new Error('You must be in a voice channel to use this command.');
    }
    const permissions = voiceChannel.permissionsFor(interaction.client.user);

    if (!permissions?.has('Connect') || !permissions?.has('Speak')) {
      throw new Error('I do not have permission to join or speak in your voice channel.');
    }

    // Join the voice channel
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: interaction.guild.id,
      adapterCreator: interaction.guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false
    });

    // Handle existing music instance
    const existingInstance = this.instances.get(connection);
    if (existingInstance) {
      if (existingInstance.subscription) {
        interaction.client.log.info('Stopping existing music instance.');
        existingInstance.subscription.player.stop();
        existingInstance.audioStream.process.kill();
        existingInstance.subscription.unsubscribe();
        existingInstance.subscription = undefined;
      }
    }

    // Check if the query is a URL or a search term
    if (/^https.*/.test(query)) {
      // Check if the URL is a valid SoundCloud URL
      if (!/https:\/\/soundcloud\.com\/[^\s]*/.test(query)) {
        throw new Error('Invalid SoundCloud URL provided.');
      }

      // Resolve the URL to get the track information
      const track = await resolveUrl(query, this.clientId);
      const transcodingUrl = track.media.transcodings.at(0)?.url;
      if (!transcodingUrl) {
        throw new Error('No transcoding URL found for the track.');
      }

      // Fetch the MP3 URL from the transcoding URL
      const resolveResp = await fetch(`${transcodingUrl}?client_id=${this.clientId}`);
      if (!resolveResp.ok) {
        throw new Error(`Failed to resolve URL: ${resolveResp.statusText}`);
      }
      const { url: mp3Url } = (await resolveResp.json()) as { url: string };

      // Create the FFmpeg stream and audio player
      const audioStream = createFfmpegStream(mp3Url);
      const player = createAudioPlayer();

      player.on('error', (err) => interaction.client.log.error(err));

      // Subscribe to the audio player and play the track
      player.play(audioStream.resource);
      const subscription = connection.subscribe(player);
      this.instances.set(connection, { audioStream, subscription });

      connection.on(VoiceConnectionStatus.Destroyed, () => {
        subscription?.unsubscribe();
        player.stop();
        audioStream.process.kill();
      });

      await interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setTitle('🎶 Now playing 🎶')
            .setThumbnail(track.artwork_url)
            .setDescription(`[${track.title}](${track.permalink_url})`)
            .setColor('Orange')
            .setFooter({
              text: 'Powered by SoundCloud',
              iconURL: 'https://a-v2.sndcdn.com/assets/images/sc-icons/ios-a62dfc8fe7.png'
            })
            .setTimestamp()
        ]
      });
    } else {
      await interaction.followUp(
        'Search is not supported yet. Please provide a valid SoundCloud URL.'
      );
      // const searchResult = await searchTracks(query, this.clientId);
      // if (searchResult.collection.length === 0) {
      //   throw new Error('No tracks found for the given query.');
      // }
    }
  }
}

export default MusicService;
