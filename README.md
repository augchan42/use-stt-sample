# useSTT Example

This is a basic example of using the `useSTT` hook for speech-to-text functionality.

## Requirements

- Modern browser with MediaRecorder API support (Chrome, Firefox, Edge, Safari)
- Microphone access
- OpenAI API key with access to Whisper API

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file with your OpenAI API key:
```bash
OPENAI_API_KEY=your_key_here
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Features

- Record audio using the MediaRecorder API
- Automatic audio format handling for different browsers
  - WebM format for Chrome/Firefox/Edge (native)
  - iOS/Safari recordings automatically converted to WebM using FFmpeg
- Audio processing options:
  - Normalize volume
  - Reduce background noise
  - Voice Activity Detection (VAD)
  - Configurable bitrate and compression
- Transcribe speech to text using OpenAI's Whisper API
- Pause/Resume recording functionality
- Real-time recording status updates
- Error handling and user feedback
- Debug logging for troubleshooting

## Usage Notes

- Click "Start Recording" and allow microphone access when prompted
- Speak clearly into your microphone
- Click "Stop Recording" to get the transcription
- Use Pause/Resume to temporarily halt recording
- The transcript will appear once processing is complete
- Check the debug logs section if something goes wrong

## Troubleshooting

- Make sure your browser has permission to access the microphone
- Check that your OpenAI API key is valid and has access to Whisper API
- Ensure you're using a supported browser
- For iOS/Safari users, the first recording might take longer due to FFmpeg initialization
- Check the debug logs section for detailed error messages 