declare module 'lamejs2' {
  export class Mp3Encoder {
    constructor(channels: number, sampleRate: number, bitRate: number);
    encodeBuffer(left: Int16Array | Float32Array, right?: Int16Array | Float32Array): Int8Array;
    flush(): Int8Array;
  }
}