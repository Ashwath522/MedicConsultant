/** Thin wrapper over the browser MediaRecorder + Wake Lock (keeps the screen on while recording).
 * Works in Chrome (webm/opus) and Safari/iOS (mp4/aac). Needs HTTPS or localhost.
 */
const TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac'];

export function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  return TYPES.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
}

export const extFor = (mime: string) => (mime.includes('mp4') || mime.includes('aac') ? 'm4a' : 'webm');

export class Recorder {
  private rec?: MediaRecorder;
  private stream?: MediaStream;
  private chunks: Blob[] = [];
  private wakeLock: { release: () => Promise<void> } | null = null;
  private audioCtx?: AudioContext;
  private analyser?: AnalyserNode;
  private buf?: Uint8Array<ArrayBuffer>;
  mimeType = '';

  static supported() {
    return !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
  }

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    this.mimeType = pickMimeType();
    this.rec = new MediaRecorder(this.stream, this.mimeType ? { mimeType: this.mimeType } : undefined);
    this.mimeType = this.rec.mimeType || this.mimeType;
    this.chunks = [];
    this.rec.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
    this.rec.start(1000); // collect every second so nothing is lost
    try {
      // Level meter for the live waveform
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AC();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 512;
      this.audioCtx.createMediaStreamSource(this.stream).connect(this.analyser);
      this.buf = new Uint8Array(this.analyser.fftSize);
    } catch { /* waveform is optional */ }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.wakeLock = await (navigator as any).wakeLock?.request('screen');
    } catch { /* not supported — user keeps screen on */ }
  }

  /** Current loudness, 0–1 (RMS of the waveform). */
  level = (): number => {
    if (!this.analyser || !this.buf || this.rec?.state !== 'recording') return 0;
    this.analyser.getByteTimeDomainData(this.buf);
    let sum = 0;
    for (const v of this.buf) { const x = (v - 128) / 128; sum += x * x; }
    return Math.min(1, Math.sqrt(sum / this.buf.length) * 5);
  };

  pause() { this.rec?.state === 'recording' && this.rec.pause(); }
  resume() { this.rec?.state === 'paused' && this.rec.resume(); }

  stop(): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.rec) return resolve(new Blob());
      this.rec.onstop = () => {
        this.cleanup();
        resolve(new Blob(this.chunks, { type: this.mimeType || 'audio/webm' }));
      };
      this.rec.stop();
    });
  }

  cancel() {
    if (this.rec && this.rec.state !== 'inactive') this.rec.stop();
    this.cleanup();
    this.chunks = [];
  }

  private cleanup() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.wakeLock?.release().catch(() => {});
    this.wakeLock = null;
    this.audioCtx?.close().catch(() => {});
    this.audioCtx = undefined;
    this.analyser = undefined;
  }
}
