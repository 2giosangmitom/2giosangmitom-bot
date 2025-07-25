/**
 * @file ffmpeg utility functions
 * @author Vo Quang Chien <voquangchien.dev@proton.me>
 */

import { spawn } from 'child_process';
import { createAudioResource, StreamType } from '@discordjs/voice';

function createFfmpegStream(input: string) {
  const ffmpeg = spawn(
    'ffmpeg',
    [
      '-re',
      '-thread_queue_size',
      '1024',
      '-reconnect',
      '1',
      '-reconnect_streamed',
      '1',
      '-reconnect_delay_max',
      '5',
      '-i',
      input,
      '-f',
      's16le',
      '-ar',
      '48000',
      '-ac',
      '2',
      'pipe:1'
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  );

  if (!ffmpeg.stdout) {
    throw new Error('FFmpeg did not create a stdout stream.');
  }

  return {
    process: ffmpeg,
    resource: createAudioResource(ffmpeg.stdout, {
      inputType: StreamType.Raw
    })
  };
}

export { createFfmpegStream };
