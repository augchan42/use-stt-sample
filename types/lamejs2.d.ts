declare module 'lamejs2' {
  interface Mp3EncoderConfig {
    channels: number;
    sampleRate: number;
    bitRate: number;
    mode?: number;
  }

  export class Mp3Encoder {
    constructor(config: Mp3EncoderConfig);
    encodeBuffer(buffer: Int16Array): Uint8Array;
    flush(): Uint8Array;
  }
} 