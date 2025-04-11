'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSTT } from 'use-stt';
import { transcribe } from '../app/actions/transcribe';

interface DebugLog {
  timestamp: string;
  message: string;
  type: 'log' | 'error' | 'info';
}

// Wrapper function to handle audio conversion and transcription
async function transcribeAudio(audioBlob: Blob) {
  console.log('Client: Received audio blob:', {
    size: audioBlob.size,
    type: audioBlob.type
  });

  const formData = new FormData();
  // Skip conversion for WebM format since it's supported by Whisper API
  const isWebM = audioBlob.type.includes('webm');
  const filename = isWebM ? 'audio.webm' : 'audio.wav';
  formData.append('file', audioBlob, filename);
  
  // Log FormData contents (for debugging)
  console.log('Client: FormData contents:', {
    hasFile: formData.has('file'),
    fileName: formData.get('file') instanceof File ? (formData.get('file') as File).name : null,
    fileSize: formData.get('file') instanceof File ? (formData.get('file') as File).size : null,
    fileType: formData.get('file') instanceof File ? (formData.get('file') as File).type : null,
    format: isWebM ? 'WebM' : 'Other'
  });

  const result = await transcribe(formData);
  console.log('Client: Received transcription result:', result);
  return result;
}

export default function ClientWhisperExample() {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  
  // Memoize the transcribe function
  const memoizedTranscribe = useCallback(
    (blob: Blob) => transcribeAudio(blob),
    []
  );

  // Intercept console messages
  useEffect(() => {
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;

    const addLog = (message: string, type: 'log' | 'error' | 'info') => {
      setLogs(prev => [...prev, {
        timestamp: new Date().toISOString(),
        message: typeof message === 'object' ? JSON.stringify(message, null, 2) : message,
        type
      }]);
    };

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
  }, []);

  const {
    transcript,
    isRecording,
    isProcessing,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  } = useSTT({
    provider: 'whisper',
    transcribe: memoizedTranscribe
  });

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
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Speech-to-Text Demo</h1>
      
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
              className="bg-red-500 text-white px-4 py-2 rounded"
            >
              Stop Recording
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