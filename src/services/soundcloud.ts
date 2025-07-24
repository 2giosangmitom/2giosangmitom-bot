/**
 * @file SoundCloud service for handling SoundCloud-related operations.
 * @author Vo Quang Chien <voquangchien.dev@proton.me>
 */

import type { SoundCloudSearchResponse, SoundCloudTrack } from '~/types';

// Get the client ID from SoundCloud
// Thanks to the yt-dlp project for the method
async function updateClientId() {
  const res = await fetch('https://soundcloud.com');
  if (!res.ok) {
    throw new Error(`Failed to fetch SoundCloud: ${res.statusText}`);
  }

  const html = await res.text();
  const match = html.matchAll(/<script[^>]+src="([^"]+)"/g);

  for (const src of match) {
    const script = await fetch(src[1]!);
    if (!script.ok) {
      throw new Error(`Failed to fetch script: ${script.statusText}`);
    }
    const scriptText = await script.text();
    const clientIdMatch = scriptText.match(/client_id\s*:\s*"([0-9a-zA-Z]{32})"/);
    if (clientIdMatch) {
      const clientId = clientIdMatch[1];
      return clientId;
    }
  }
}

// Search for tracks on soundcloud
async function searchTracks(query: string, clientId: string) {
  const res = await fetch(
    `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(query)}&client_id=${clientId}&limit=10`
  );
  if (!res.ok) {
    throw new Error(`Failed to search tracks: ${res.statusText}`);
  }
  const data = (await res.json()) as SoundCloudSearchResponse;

  return {
    collection: data.collection.map((track) => {
      return {
        artwork_url: track.artwork_url,
        created_at: track.created_at,
        duration: track.duration,
        title: track.title,
        permalink_url: track.permalink_url,
        media: {
          transcodings: track.media.transcodings
            .map((transcoding) => ({
              url: transcoding.url,
              preset: transcoding.preset,
              quality: transcoding.quality,
              is_legacy_transcoding: transcoding.is_legacy_transcoding,
              format: {
                protocol: transcoding.format.protocol,
                mime_type: transcoding.format.mime_type
              }
            }))
            .filter((transcoding) => {
              return transcoding.format.protocol === 'hls' && transcoding.preset === 'opus_0_0';
            })
        }
      };
    }),
    next_href: data.next_href
  };
}

// Resolve information of a track by given url
async function resolveUrl(url: string, clientId: string) {
  const res = await fetch(`https://api-v2.soundcloud.com/resolve?url=${url}&client_id=${clientId}`);

  if (!res.ok) {
    throw new Error(`Failed to search tracks: ${res.statusText}`);
  }

  const track = (await res.json()) as SoundCloudTrack;

  return {
    artwork_url: track.artwork_url,
    created_at: track.created_at,
    duration: track.duration,
    title: track.title,
    permalink_url: track.permalink_url,
    media: {
      transcodings: track.media.transcodings
        .map((transcoding) => ({
          url: transcoding.url,
          preset: transcoding.preset,
          quality: transcoding.quality,
          is_legacy_transcoding: transcoding.is_legacy_transcoding,
          format: {
            protocol: transcoding.format.protocol,
            mime_type: transcoding.format.mime_type
          }
        }))
        .filter((transcoding) => {
          return transcoding.format.protocol === 'hls' && transcoding.preset === 'opus_0_0';
        })
    }
  };
}

export { updateClientId, searchTracks, resolveUrl };
