'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { transcribe } from '../app/actions/transcribe';
import type { FFmpegConfig } from 'use-stt';
import { useSTT } from 'use-stt';

interface DebugLog {
  timestamp: string;
  message: string;
  type: 'log' | 'error' | 'info';
}

// Default audio processing config
const defaultConfig: FFmpegConfig = {
  outputSampleRate: 16000,
  outputChannels: 1,
  bitrate: '24k',
  normalize: true,
  normalizationLevel: -16,
  denoise: false,
  vad: false,
  vadLevel: 1,
  compressionLevel: 10
};

// Function to standardize audio to WebM using Web Audio API
async function standardizeAudioToWebM(audioBlob: Blob, isIOS: boolean): Promise<Blob> {
  console.log('Starting audio standardization...', {
    inputSize: audioBlob.size,
    inputType: audioBlob.type,
    isIOS,
    timestamp: new Date().toISOString()
  });
  
  // Create an audio context
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
    sampleRate: 16000 // Whisper prefers 16kHz
  });
  console.log('AudioContext created:', {
    sampleRate: audioContext.sampleRate,
    state: audioContext.state,
    baseLatency: audioContext.baseLatency,
    outputLatency: audioContext.outputLatency
  });

  try {
    // Convert blob to array buffer
    const arrayBuffer = await audioBlob.arrayBuffer();
    console.log('Blob converted to ArrayBuffer:', {
      bufferByteLength: arrayBuffer.byteLength
    });
    
    // Decode the audio data
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    console.log('Audio decoded:', {
      sampleRate: audioBuffer.sampleRate,
      duration: audioBuffer.duration,
      numberOfChannels: audioBuffer.numberOfChannels,
      length: audioBuffer.length,
      timestamp: new Date().toISOString()
    });

    if (isIOS) {
      // For iOS, we'll keep the MP4 format but ensure correct sample rate and channels
      const processedBuffer = audioContext.createBuffer(
        1, // mono
        audioBuffer.length,
        16000 // target sample rate
      );

      // Mix down to mono and resample
      const channelData = processedBuffer.getChannelData(0);
      if (audioBuffer.numberOfChannels === 1) {
        // Copy mono data
        const sourceData = audioBuffer.getChannelData(0);
        for (let i = 0; i < channelData.length; i++) {
          channelData[i] = sourceData[i];
        }
      } else {
        // Mix down to mono
        const left = audioBuffer.getChannelData(0);
        const right = audioBuffer.getChannelData(1);
        for (let i = 0; i < channelData.length; i++) {
          channelData[i] = (left[i] + right[i]) / 2;
        }
      }

      // Create a new MediaRecorder with MP4 format
      const stream = audioContext.createMediaStreamDestination().stream;
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/mp4',
        audioBitsPerSecond: 24000
      });

      const chunks: Blob[] = [];
      return new Promise((resolve, reject) => {
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
          const processedBlob = new Blob(chunks, { type: 'audio/mp4' });
          console.log('iOS audio processing complete:', {
            originalSize: audioBlob.size,
            processedSize: processedBlob.size,
            originalType: audioBlob.type,
            processedType: processedBlob.type
          });
          resolve(processedBlob);
        };

        mediaRecorder.onerror = (err) => reject(err);

        // Start recording
        mediaRecorder.start();
        
        // Play the buffer
        const source = audioContext.createBufferSource();
        source.buffer = processedBuffer;
        source.connect(audioContext.destination);
        source.start();
        source.onended = () => mediaRecorder.stop();
      });
    } else {
      // Non-iOS devices can use WebM
      const destination = audioContext.createMediaStreamDestination();
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 1.0;
      
      source.connect(gainNode);
      gainNode.connect(destination);
      
      const mediaRecorder = new MediaRecorder(destination.stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 24000
      });

      const chunks: Blob[] = [];
      return new Promise((resolve, reject) => {
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
          const webmBlob = new Blob(chunks, { type: 'audio/webm' });
          console.log('Audio standardization complete:', {
            originalSize: audioBlob.size,
            webmSize: webmBlob.size,
            originalType: audioBlob.type,
            webmType: webmBlob.type
          });
          resolve(webmBlob);
        };

        mediaRecorder.onerror = (err) => reject(err);

        mediaRecorder.start();
        source.start(0);
        source.onended = () => mediaRecorder.stop();
      });
    }
  } finally {
    // Ensure AudioContext is closed
    await audioContext.close();
  }
}

// Update the transcribeAudio function to pass isIOS parameter
async function transcribeAudio(audioBlob: Blob) {
  console.log('Client: Received audio blob:', {
    size: audioBlob.size,
    type: audioBlob.type
  });

  try {
    // Check if we need to standardize the audio
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const needsStandardization = isIOS || 
      audioBlob.type.includes('mp4') || 
      audioBlob.type.includes('m4a') ||
      !audioBlob.type.includes('webm');

    let processedBlob = audioBlob;
    if (needsStandardization) {
      console.log('Audio needs standardization');
      processedBlob = await standardizeAudioToWebM(audioBlob, isIOS);
    }

    // Create a File from the blob with proper extension
    const audioFile = new File([processedBlob], isIOS ? 'recording.m4a' : 'recording.webm', {
      type: isIOS ? 'audio/mp4' : 'audio/webm;codecs=opus'
    });

    // Send to server for transcription
    const formData = new FormData();
    formData.append('file', audioFile);
    
    const result = await transcribe(formData);
    console.log('Client: Received transcription result:', result);
    return result;
  } catch (error) {
    console.error('Transcription error:', error);
    throw error;
  }
}

export default function ClientWhisperExample() {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [config, setConfig] = useState<FFmpegConfig>(defaultConfig);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<Error | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  // Refs for audio handling
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isIOSRef = useRef<boolean>(false);

  const addLog = useCallback((message: string, type: 'log' | 'error' | 'info') => {
    setLogs(prev => [...prev, {
      timestamp: new Date().toISOString(),
      message: typeof message === 'object' ? JSON.stringify(message, null, 2) : message,
      type
    }]);
  }, []);

  // Memoize the transcribe function
  const memoizedTranscribe = useCallback(
    (blob: Blob) => transcribeAudio(blob),
    []
  );

  const {
    isInitialized,
    isStopping,
    startRecording: sttStartRecording,
    stopRecording: sttStopRecording,
    pauseRecording,
    resumeRecording,
  } = useSTT({
    provider: 'whisper',
    transcribe: memoizedTranscribe,
    audioConfig: {
      sampleRate: 16000,
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    },
    audioProcessing: {
      sampleRate: config.outputSampleRate,
      channels: config.outputChannels,
      normalize: config.normalize,
      ffmpeg: config
    }
  });

  // Remove the useEffect that initializes audio
  // Instead, create an initAudio function that will be called when starting recording
  const initAudio = async () => {
    try {
      setIsInitializing(true);
      setError(null);

      // Check if running on iOS
      isIOSRef.current = /iPad|iPhone|iPod/.test(navigator.userAgent);
      console.log('Device Info:', {
        type: isIOSRef.current ? 'iOS' : 'Other',
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        vendor: navigator.vendor,
        mediaRecorderSupport: typeof MediaRecorder !== 'undefined',
        supportedMimeTypes: {
          webm: MediaRecorder.isTypeSupported('audio/webm;codecs=opus'),
          mp4: MediaRecorder.isTypeSupported('audio/mp4'),
          wav: MediaRecorder.isTypeSupported('audio/wav')
        }
      });

      // Initialize AudioContext (but don't create it yet on iOS)
      if (!isIOSRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 16000
        });
        console.log('AudioContext initialized:', {
          sampleRate: audioContextRef.current.sampleRate,
          state: audioContextRef.current.state,
          baseLatency: audioContextRef.current.baseLatency
        });
      }

      // Get microphone stream
      const constraints = {
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };
      console.log('Requesting microphone with constraints:', constraints);

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const track = stream.getAudioTracks()[0];
      console.log('Microphone access granted:', {
        track: track.label,
        settings: track.getSettings(),
        constraints: track.getConstraints()
      });
      
      streamRef.current = stream;

      // Set up MediaRecorder with appropriate MIME type
      let mimeType = 'audio/webm;codecs=opus';
      if (isIOSRef.current) {
        // Try different MIME types for iOS
        const supportedTypes = [
          '',  // Let browser choose
          'audio/mp4',
          'audio/webm',
          'audio/webm;codecs=opus',
          'audio/aac',
          'audio/x-m4a'
        ];

        mimeType = supportedTypes.find(type => {
          try {
            return type === '' || MediaRecorder.isTypeSupported(type);
          } catch (e) {
            return false;
          }
        }) || '';

        console.log('iOS MIME type selection:', {
          selectedType: mimeType || 'browser default',
          testedTypes: supportedTypes.map(type => ({
            type,
            supported: type === '' ? true : MediaRecorder.isTypeSupported(type)
          }))
        });
      }

      // Create MediaRecorder with or without explicit MIME type
      mediaRecorderRef.current = mimeType 
        ? new MediaRecorder(stream, {
            mimeType,
            audioBitsPerSecond: 24000
          })
        : new MediaRecorder(stream); // Let browser choose format

      console.log('MediaRecorder initialized:', {
        state: mediaRecorderRef.current.state,
        mimeType: mediaRecorderRef.current.mimeType,
        audioBitsPerSecond: mediaRecorderRef.current.audioBitsPerSecond
      });

      // Set up MediaRecorder event handlers
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
          console.log('Recording chunk received:', {
            chunkSize: e.data.size,
            chunkType: e.data.type,
            totalChunks: chunksRef.current.length
          });
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        try {
          setIsProcessing(true);
          console.log('Recording stopped, processing audio...');
          
          // Create initial blob
          const recordedBlob = new Blob(chunksRef.current, { 
            type: isIOSRef.current ? 'audio/mp4' : 'audio/webm;codecs=opus' 
          });
          console.log('Recording completed:', {
            size: recordedBlob.size,
            type: recordedBlob.type,
            chunks: chunksRef.current.length
          });
          chunksRef.current = []; // Clear chunks for next recording

          // Convert if needed (iOS)
          let finalBlob = recordedBlob;
          if (isIOSRef.current) {
            console.log('iOS detected, converting audio format...');
            // Initialize AudioContext on first user interaction
            if (!audioContextRef.current) {
              audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
                sampleRate: 16000
              });
              console.log('iOS AudioContext initialized');
            }
            finalBlob = await standardizeAudioToWebM(recordedBlob, isIOSRef.current);
          }

          // Create a File from the blob with proper extension
          const audioFile = new File([finalBlob], isIOSRef.current ? 'recording.m4a' : 'recording.webm', {
            type: isIOSRef.current ? 'audio/mp4' : 'audio/webm;codecs=opus'
          });
          console.log('Audio file created:', {
            name: audioFile.name,
            type: audioFile.type,
            size: audioFile.size
          });

          // Send to server for transcription
          const formData = new FormData();
          formData.append('file', audioFile);
          console.log('Sending to server for transcription...');
          
          const result = await transcribe(formData);
          console.log('Transcription completed:', result);
          setTranscript(result.transcript);
        } catch (error) {
          console.error('Processing error:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
          });
          setError(error instanceof Error ? error : new Error('Transcription failed'));
        } finally {
          setIsProcessing(false);
        }
      };

      console.log('Audio system initialization complete');
      return true;
    } catch (error) {
      console.error('Audio initialization error:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      setError(error instanceof Error ? error : new Error('Failed to initialize audio'));
      return false;
    } finally {
      setIsInitializing(false);
    }
  };

  const startRecording = useCallback(async () => {
    try {
      // Always reinitialize audio system for a fresh start
      const initialized = await initAudio();
      if (!initialized) {
        return;
      }

      // Verify MediaRecorder is initialized
      if (!mediaRecorderRef.current) {
        throw new Error('MediaRecorder failed to initialize');
      }

      chunksRef.current = []; // Clear any previous chunks
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setError(null);
      
      console.log('Recording started with fresh audio system');
    } catch (error) {
      console.error('Failed to start recording:', error);
      setError(error instanceof Error ? error : new Error('Failed to start recording'));
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      return;
    }

    try {
      console.log('Stopping recording and releasing microphone...');
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // Stop and release the microphone
      if (streamRef.current) {
        console.log('Stopping audio tracks:', {
          trackCount: streamRef.current.getTracks().length,
          trackTypes: streamRef.current.getTracks().map(track => track.kind)
        });
        
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log('Track stopped:', {
            kind: track.kind,
            label: track.label,
            enabled: track.enabled,
            state: track.readyState
          });
        });
        streamRef.current = null;
      }

      // Close audio context if it exists
      if (audioContextRef.current?.state !== 'closed') {
        console.log('Closing AudioContext:', {
          previousState: audioContextRef.current?.state
        });
        audioContextRef.current?.close();
        audioContextRef.current = null;
      }

      // Clear the media recorder
      mediaRecorderRef.current = null;
      
      console.log('Audio system cleanup complete');
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setError(error instanceof Error ? error : new Error('Failed to stop recording'));
    }
  }, []);

  // Intercept console messages
  useEffect(() => {
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;

    console.log = (...args) => {
      originalConsoleLog.apply(console, args);
      addLog(args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
      ).join(' '), 'log');
    };

    console.error = (...args) => {
      originalConsoleError.apply(console, args);
      addLog(args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
      ).join(' '), 'error');
    };

    return () => {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
    };
  }, [addLog]);

  // Add platform info at start
  useEffect(() => {
    console.log('Platform Info:', {
      userAgent: window.navigator.userAgent,
      platform: window.navigator.platform,
      vendor: window.navigator.vendor,
      language: window.navigator.language,
    });
  }, []);

  // Cleanup function in useEffect
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
    };
  }, []);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Speech-to-Text Demo</h1>
      
      {/* Audio Processing Configuration */}
      <div className="mb-6 p-4 border rounded bg-gray-50">
        <h2 className="font-semibold mb-3">Audio Processing Options</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Basic Options */}
          <div>
            <h3 className="font-medium mb-2">Basic Options</h3>
            <div className="space-y-2">
              <div>
                <label className="block text-sm">Bitrate</label>
                <select 
                  value={config.bitrate} 
                  onChange={(e) => setConfig(prev => ({ ...prev, bitrate: e.target.value }))}
                  className="w-full p-1 border rounded"
                >
                  <option value="16k">16 kbps (Low)</option>
                  <option value="24k">24 kbps (Default)</option>
                  <option value="32k">32 kbps (Better)</option>
                  <option value="48k">48 kbps (High)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Audio Enhancement */}
          <div>
            <h3 className="font-medium mb-2">Audio Enhancement</h3>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.normalize}
                  onChange={(e) => setConfig(prev => ({ ...prev, normalize: e.target.checked }))}
                  className="mr-2"
                />
                Normalize Volume
              </label>
              {config.normalize && (
                <div>
                  <label className="block text-sm">Target Level (dB)</label>
                  <input
                    type="number"
                    value={config.normalizationLevel}
                    onChange={(e) => setConfig(prev => ({ ...prev, normalizationLevel: Number(e.target.value) }))}
                    className="w-full p-1 border rounded"
                    min="-70"
                    max="0"
                  />
                </div>
              )}
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.denoise}
                  onChange={(e) => setConfig(prev => ({ ...prev, denoise: e.target.checked }))}
                  className="mr-2"
                />
                Reduce Background Noise
              </label>
            </div>
          </div>

          {/* Voice Detection */}
          <div>
            <h3 className="font-medium mb-2">Voice Detection</h3>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.vad}
                  onChange={(e) => setConfig(prev => ({ ...prev, vad: e.target.checked }))}
                  className="mr-2"
                />
                Remove Silence (VAD)
              </label>
              {config.vad && (
                <div>
                  <label className="block text-sm">VAD Sensitivity</label>
                  <select
                    value={config.vadLevel}
                    onChange={(e) => setConfig(prev => ({ ...prev, vadLevel: Number(e.target.value) }))}
                    className="w-full p-1 border rounded"
                  >
                    <option value="0">Low</option>
                    <option value="1">Default</option>
                    <option value="2">Aggressive</option>
                    <option value="3">Very Aggressive</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Advanced Options */}
          <div>
            <h3 className="font-medium mb-2">Advanced</h3>
            <div className="space-y-2">
              <div>
                <label className="block text-sm">Opus Compression</label>
                <select
                  value={config.compressionLevel}
                  onChange={(e) => setConfig(prev => ({ ...prev, compressionLevel: Number(e.target.value) }))}
                  className="w-full p-1 border rounded"
                >
                  <option value="0">0 (Fastest)</option>
                  <option value="5">5 (Balanced)</option>
                  <option value="10">10 (Best)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>     

      {/* Recording Controls */}
      <div className="space-x-2 mb-4">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
            disabled={isProcessing || isInitializing}
          >
            {isInitializing ? 'Initializing...' : 'Start Recording'}
          </button>
        ) : (
          <>
            <button
              onClick={stopRecording}
              className="bg-red-500 text-white px-4 py-2 rounded disabled:opacity-50"
              disabled={isStopping}
            >
              {isStopping ? 'Stopping...' : 'Stop Recording'}
            </button>
            <button
              onClick={pauseRecording}
              className="bg-yellow-500 text-white px-4 py-2 rounded"
            >
              Pause
            </button>
            <button
              onClick={resumeRecording}
              className="bg-green-500 text-white px-4 py-2 rounded"
            >
              Resume
            </button>
          </>
        )}
      </div>

      {isProcessing && (
        <div className="text-gray-600 mb-2">Processing audio...</div>
      )}

      {error && (
        <div className="text-red-500 mb-2">Error: {error.message}</div>
      )}

      <div className="border p-4 min-h-[100px] rounded bg-gray-50 mb-4">
        <h2 className="font-semibold mb-2">Transcript:</h2>
        <p>{transcript || 'Start recording to see transcript...'}</p>
      </div>

      <div className="border p-4 rounded bg-gray-50">
        <h2 className="font-semibold mb-2">Debug Logs:</h2>
        <div className="h-64 overflow-y-auto font-mono text-sm">
          {logs.map((log, index) => (
            <div 
              key={index} 
              className={`py-1 ${
                log.type === 'error' ? 'text-red-600' : 
                log.type === 'info' ? 'text-blue-600' : 
                'text-gray-800'
              }`}
            >
              <span className="opacity-50">{new Date(log.timestamp).toLocaleTimeString()}</span>
              {' '}{log.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 