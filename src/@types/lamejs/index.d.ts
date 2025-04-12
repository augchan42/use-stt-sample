declare module 'lamejs' {
  class Mp3Encoder {
    constructor(channels: number, sampleRate: number, kbps: number);
    encodeBuffer(buffer: Int16Array): Uint8Array;
    flush(): Uint8Array;
  }

  const lamejs: { Mp3Encoder: typeof Mp3Encoder };
  export default lamejs;
} 