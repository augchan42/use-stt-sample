export interface TranscriptionResult {
    text: string;
    timestamp: number;
}

export interface RecordingState {
    isRecording: boolean;
    isProcessing: boolean;
    transcript: string;
    error: Error | null;
}

export interface STTHookProps {
    options: import('use-stt').STTOptions;
} 