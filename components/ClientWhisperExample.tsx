'use client';

import React, { useState, useEffect } from 'react';
import { useSTT } from 'use-stt';
import { transcribe } from '../app/actions/transcribe';

interface DebugLog {
  timestamp: string;
  message: string;
  type: 'log' | 'error' | 'info';
}

// Wrapper function to handle FormData conversion
async function transcribeAudio(audioBlob: Blob) {
  // Check audio format and details
  const audioDetails = {
    size: audioBlob.size,
    type: audioBlob.type,
    lastModified: audioBlob instanceof File ? audioBlob.lastModified : 'N/A',
    details: {
      sizeInMB: (audioBlob.size / (1024 * 1024)).toFixed(2),
      isFile: audioBlob instanceof File,
      timestamp: new Date().toISOString(),
      hasContent: audioBlob.size > 0,
      mimeType: audioBlob.type || 'no-type'
    }
  };
  
  console.log('Client: Audio Recording Details:', audioDetails);

  // Validate audio blob
  if (audioBlob.size === 0) {
    console.error('Audio blob is empty');
    throw new Error('No audio data recorded');
  }

  // For iOS Safari, we might need to convert the audio format
  const isIOS = /iPad|iPhone|iPod/.test(window.navigator.userAgent);
  if (isIOS && (!audioBlob.type || !audioBlob.type.includes('webm'))) {
    console.log('iOS device detected, audio format:', audioBlob.type);
  }

  const formData = new FormData();
  
  // Determine the correct file extension based on MIME type and ensure Whisper compatibility
  let fileExtension;
  if (audioBlob.type.includes('webm')) {
    fileExtension = 'webm';
  } else if (audioBlob.type.includes('mp4') || audioBlob.type.includes('x-m4a')) {
    fileExtension = 'm4a';  // Always use .m4a for MP4 audio
  } else if (audioBlob.type.includes('mpeg') || audioBlob.type.includes('mp3')) {
    fileExtension = 'mp3';
  } else if (audioBlob.type.includes('ogg')) {
    fileExtension = 'ogg';
  } else if (audioBlob.type.includes('wav')) {
    fileExtension = 'wav';
  } else {
    console.warn('Unknown audio type:', audioBlob.type, 'defaulting to m4a');
    fileExtension = 'm4a';  // Default to m4a as it's widely supported
  }

  // Create a new File with explicit MIME type
  const audioFile = new File([audioBlob], `audio.${fileExtension}`, {
    type: audioBlob.type || `audio/${fileExtension}`
  });
  formData.append('file', audioFile);
  
  // Enhanced FormData logging
  const formDataDetails = {
    hasFile: formData.has('file'),
    file: formData.get('file'),
    fileName: formData.get('file') instanceof File ? (formData.get('file') as File).name : null,
    fileSize: formData.get('file') instanceof File ? (formData.get('file') as File).size : null,
    fileType: formData.get('file') instanceof File ? (formData.get('file') as File).type : null,
    isAudioBlob: audioBlob instanceof Blob,
    blobType: audioBlob.type
  };
  
  console.log('Client: FormData details:', formDataDetails);

  try {
    const result = await transcribe(formData);
    console.log('Client: Transcription completed successfully:', result);
    return result;
  } catch (error) {
    console.error('Client: Transcription failed:', error);
    throw error;
  }
}

export default function ClientWhisperExample() {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [audioFormat, setAudioFormat] = useState<string>('');
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  
  // Intercept console messages with deduplication
  useEffect(() => {
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const seenMessages = new Set<string>();

    const addLog = (message: string, type: 'log' | 'error' | 'info') => {
      // Create a simplified version for deduplication
      const simplifiedMsg = typeof message === 'object' 
        ? JSON.stringify(message).replace(/\s+/g, ' ')
        : message;

      // Skip duplicate messages
      if (seenMessages.has(simplifiedMsg)) return;
      seenMessages.add(simplifiedMsg);

      setLogs(prev => [...prev, {
        timestamp: new Date().toISOString(),
        message: typeof message === 'object' ? JSON.stringify(message, null, 2) : message,
        type
      }]);
    };

    console.log = (...args) => {
      originalConsoleLog.apply(console, args);
      // Only log specific messages we care about
      const msg = args[0];
      if (typeof msg === 'string' && (
        msg.includes('Audio Recording Details') ||
        msg.includes('Transcription') ||
        msg.includes('Recording Start Error')
      )) {
        addLog(args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
        ).join(' '), 'log');
      }
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
    transcribe: transcribeAudio
  });

  // Enhanced device info logging - only run once
  useEffect(() => {
    const logDeviceInfo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const tracks = stream.getAudioTracks();
        const settings = tracks[0].getSettings();
        
        // Get more detailed platform and browser info
        const ua = window.navigator.userAgent;
        const browserInfo = ua.match(/(chrome|safari|firefox|edge|opera)\/?\s*(\d+)/i);
        const browser = browserInfo ? browserInfo[1].charAt(0).toUpperCase() + browserInfo[1].slice(1) : 'Unknown';
        
        // Get supported mime types
        const supportedTypes = [
          'audio/webm',
          'audio/webm;codecs=opus',
          'audio/ogg',
          'audio/ogg;codecs=opus',
          'audio/mp4',
          'audio/mp4;codecs=mp4a',
          'audio/wav',
          'audio/aac'
        ].filter(type => {
          try {
            return MediaRecorder.isTypeSupported(type);
          } catch (e) {
            return false;
          }
        });
        
        const deviceInfo = {
          audioFormat: `${settings.sampleRate}Hz`,
          device: tracks[0].label,
          platform: /iPad|iPhone|iPod/.test(ua) ? 'iOS' : 
                   /android/i.test(ua) ? 'Android' :
                   /Win/.test(ua) ? 'Windows' :
                   /Mac/.test(ua) ? 'MacOS' :
                   /Linux/.test(ua) ? 'Linux' : 'Unknown',
          browser: browser,
          supportedFormats: supportedTypes,
          settings: {
            channelCount: settings.channelCount,
            autoGainControl: settings.autoGainControl,
            echoCancellation: settings.echoCancellation,
            noiseSuppression: settings.noiseSuppression
          }
        };

        setDeviceInfo(deviceInfo);
        setAudioFormat(deviceInfo.audioFormat);
        
        // Clean up the test stream
        tracks.forEach(track => track.stop());
      } catch (error) {
        console.error('Failed to get audio capabilities:', error);
      }
    };

    logDeviceInfo();
  }, []); // Only run once on mount

  // Add error handling for getUserMedia
  const handleStartRecording = async () => {
    try {
      await startRecording();
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Recording Start Error:', {
        name: err.name,
        message: err.message,
        stack: err.stack,
        // Additional context for permissions
        permissionState: await navigator.permissions
          .query({ name: 'microphone' as PermissionName })
          .then(result => result.state)
          .catch(e => `Error checking permission: ${e.message}`)
      });
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Speech-to-Text Demo</h1>
      
      <div className="space-x-2 mb-4">
        {!isRecording ? (
          <button
            onClick={handleStartRecording}  // Use the new error handling wrapper
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

      {deviceInfo && (
        <div className="mb-4 p-3 bg-gray-50 rounded text-sm">
          <h2 className="font-semibold mb-2">Device Info:</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3">
            <div className="flex flex-col">
              <span className="text-gray-600 mb-1">Audio Format:</span>
              <span className="text-blue-600 font-medium">{deviceInfo.audioFormat}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-600 mb-1">Device:</span>
              <span className="text-blue-600 font-medium">{deviceInfo.device.split(' (')[0]}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-600 mb-1">Platform:</span>
              <span className="text-blue-600 font-medium">{deviceInfo.platform}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-600 mb-1">Browser:</span>
              <span className="text-blue-600 font-medium">{deviceInfo.browser}</span>
            </div>
          </div>
          <div className="border-t pt-2">
            <div className="text-gray-600 mb-2">Supported Audio Formats:</div>
            <div className="flex flex-col gap-2">
              {deviceInfo.supportedFormats.length > 0 
                ? deviceInfo.supportedFormats.map((format: string) => (
                    <div key={format} className="flex items-center">
                      <span className="inline-block bg-blue-50 text-blue-600 rounded px-2.5 py-1 text-xs font-medium whitespace-nowrap">
                        {format}
                      </span>
                    </div>
                  ))
                : <span className="text-red-500">No supported formats detected</span>
              }
            </div>
          </div>
        </div>
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