declare module 'lamejs-patched' {
  export enum MPEGMode {
    STEREO = 0,
    JOINT_STEREO = 1,
    DUAL_CHANNEL = 2,
    MONO = 3,
    NOT_SET = 4
  }

  export interface Mp3Config {
    channels: number;
    sampleRate: number;
    bitRate: number;
    mode?: MPEGMode;
    quality?: number; // 0 (best) to 9 (worst)
    maxBuffer?: number;
  }

  export interface WavHeader {
    dataOffset: number;
    dataLen: number;
    channels: number;
    sampleRate: number;
  }

  export interface EncodedChunk {
    data: Int8Array;
    sampleRate: number;
    channels: number;
  }

  export class Mp3Encoder {
    constructor(channels: number, sampleRate: number, kbps: number);
    encodeBuffer(samples: Int16Array): Int8Array;
    flush(): Int8Array;
    close(): void;
  }

  // Export the module's default export
  const lamejs: {
    Mp3Encoder: typeof Mp3Encoder;
    MPEGMode: typeof MPEGMode;
  };
  
  export default lamejs;
}