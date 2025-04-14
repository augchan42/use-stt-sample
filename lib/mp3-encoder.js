import lamejs from 'lamejs';

export class Mp3EncoderWrapper {
    constructor(channels, sampleRate, kbps) {
        try {
            // Log initialization parameters
            console.log('Initializing Mp3Encoder with:', {
                channels,
                sampleRate,
                kbps
            });

            // Create encoder instance directly from the Mp3Encoder class
            const Mp3Encoder = lamejs.Mp3Encoder;
            this.encoder = new Mp3Encoder(channels, sampleRate, kbps);
            
            // Store configuration
            this.channels = channels;
            this.sampleRate = sampleRate;
            this.kbps = kbps;
            
            // For debugging
            console.log('Mp3Encoder created successfully:', {
                channels,
                sampleRate,
                kbps,
                encoderType: typeof this.encoder,
                hasEncodeBuffer: typeof this.encoder.encodeBuffer === 'function',
                hasFlush: typeof this.encoder.flush === 'function'
            });
        } catch (error) {
            console.error('Failed to create Mp3Encoder:', {
                error: error.message,
                stack: error.stack,
                channels,
                sampleRate,
                kbps
            });
            throw error;
        }
    }

    encodeBuffer(samples) {
        if (!this.encoder) {
            throw new Error('Encoder not initialized');
        }

        try {
            // Log buffer details
            console.log('Encoding buffer:', {
                samplesLength: samples.length,
                channels: this.channels,
                sampleRate: this.sampleRate
            });

            // Encode the buffer
            const mp3Data = this.encoder.encodeBuffer(samples);
            
            console.log('Buffer encoded:', {
                inputLength: samples.length,
                outputLength: mp3Data.length
            });
            
            return mp3Data;
        } catch (error) {
            console.error('Error encoding buffer:', {
                error: error.message,
                stack: error.stack,
                samplesLength: samples.length
            });
            throw error;
        }
    }

    flush() {
        if (!this.encoder) {
            throw new Error('Encoder not initialized');
        }

        try {
            // Flush any remaining data
            const mp3Data = this.encoder.flush();
            
            console.log('Encoder flushed:', {
                dataLength: mp3Data.length
            });
            
            return mp3Data;
        } catch (error) {
            console.error('Error flushing encoder:', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
} 