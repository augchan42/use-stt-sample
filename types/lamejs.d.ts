declare module 'lamejs' {
  export class Mp3Encoder {
    constructor(channels: number, sampleRate: number, kbps: number);
    encodeBuffer(left: Int16Array, right?: Int16Array): Int8Array;
    flush(): Int8Array;
  }

  export enum MPEGMode {
    STEREO = 0,
    JOINT_STEREO = 1,
    DUAL_CHANNEL = 2,
    MONO = 3,
    NOT_SET = 4
  }

  const lamejs: {
    Mp3Encoder: typeof Mp3Encoder;
    MPEGMode: typeof MPEGMode;
  };

  export default lamejs;
} 