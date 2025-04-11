'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { transcribe } from '../app/actions/transcribe';
import type { FFmpegConfig } from 'use-stt';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { convertAudioToWebM, useSTT } from 'use-stt';

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

// Initialize FFmpeg
let ffmpeg: FFmpeg | null = null;

// Wrapper function to handle audio conversion and transcription
async function transcribeAudio(audioBlob: Blob, config: FFmpegConfig) {
  console.log('Client: Received audio blob:', {
    size: audioBlob.size,
    type: audioBlob.type,
    config
  });

  try {
    // Initialize FFmpeg if not already done
    if (!ffmpeg) {
      console.log('Initializing FFmpeg...');
      ffmpeg = new FFmpeg();
      await ffmpeg.load();
    }

    // Convert audio with specified config
    console.log('Converting audio with config:', config);
    const processedBlob = await convertAudioToWebM(ffmpeg, audioBlob, config);
    console.log('Audio conversion complete:', {
      originalSize: audioBlob.size,
      processedSize: processedBlob.size
    });

    // Send to server for transcription
    const formData = new FormData();
    formData.append('file', processedBlob, 'audio.webm');
    
    const result = await transcribe(formData);
    console.log('Client: Received transcription result:', result);
    return result;
  } catch (error) {
    console.error('Audio processing error:', error);
    throw error;
  }
}

export default function ClientWhisperExample() {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [config, setConfig] = useState<FFmpegConfig>(defaultConfig);

  const addLog = useCallback((message: string, type: 'log' | 'error' | 'info') => {
    setLogs(prev => [...prev, {
      timestamp: new Date().toISOString(),
      message: typeof message === 'object' ? JSON.stringify(message, null, 2) : message,
      type
    }]);
  }, []);

  // Memoize the transcribe function with config
  const memoizedTranscribe = useCallback(
    (blob: Blob) => transcribeAudio(blob, config),
    [config]
  );

  const {
    transcript,
    isRecording,
    isProcessing,
    error,
    isInitialized,
    isStopping,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  } = useSTT({
    provider: 'whisper',
    transcribe: memoizedTranscribe
  });

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
            disabled={isProcessing}
          >
            Start Recording
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