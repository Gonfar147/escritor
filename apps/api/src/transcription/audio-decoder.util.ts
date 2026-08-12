import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';

const SAMPLE_RATE = 16000; // lo que espera el modelo Whisper

/**
 * Decodifica un buffer de audio/video (cualquier contenedor/códec que soporte
 * ffmpeg: mp3, wav, m4a, ogg, mp4, mov, etc.) a PCM float32 mono a 16kHz, listo
 * para pasarle directo al pipeline de Whisper sin pasar por un AudioContext de
 * navegador (que no existe en Node).
 *
 * Usa el binario estático de `ffmpeg-static` (sin dependencia del sistema) leyendo
 * de stdin y escribiendo el PCM crudo a stdout, para no tocar disco.
 */
export function decodeToPcm16k(buffer: Buffer, maxSeconds?: number): Promise<Float32Array> {
  return new Promise((resolve, reject) => {
    const args = [
      '-hide_banner',
      '-loglevel', 'error',
      '-i', 'pipe:0',
      '-vn', // descarta cualquier stream de video (para archivos tipo VIDEO, solo interesa el audio)
      '-ac', '1',
      '-ar', String(SAMPLE_RATE),
      '-f', 'f32le',
      ...(maxSeconds ? ['-t', String(maxSeconds)] : []),
      'pipe:1',
    ];

    const proc = spawn(ffmpegPath as unknown as string, args);
    const chunks: Buffer[] = [];
    let stderr = '';

    proc.stdout.on('data', (c: Buffer) => chunks.push(c));
    proc.stderr.on('data', (c: Buffer) => (stderr += c.toString()));
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg terminó con código ${code}: ${stderr.slice(0, 500)}`));
        return;
      }
      const raw = Buffer.concat(chunks);
      const floatArray = new Float32Array(raw.buffer, raw.byteOffset, raw.length / Float32Array.BYTES_PER_ELEMENT);
      resolve(new Float32Array(floatArray)); // copia: el Buffer subyacente se libera después
    });

    proc.stdin.write(buffer);
    proc.stdin.end();
  });
}

/** Duración en segundos de un buffer PCM float32 mono decodificado a `SAMPLE_RATE`. */
export function pcmDurationSeconds(pcm: Float32Array): number {
  return pcm.length / SAMPLE_RATE;
}

export { SAMPLE_RATE };
