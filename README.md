# useSTT Example

This is a basic example of using the `useSTT` hook for speech-to-text functionality.

## Requirements

- Modern browser with WebRTC support (Chrome, Firefox, Edge, Safari)
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

- Record audio using your microphone
- Transcribe speech to text using OpenAI's Whisper API
- Pause/Resume recording functionality
- Real-time recording status updates
- Error handling and user feedback
- React StrictMode compatible

## Usage Notes

- Click "Start Recording" and allow microphone access when prompted
- Speak clearly into your microphone
- Click "Stop Recording" to get the transcription
- Use Pause/Resume to temporarily halt recording
- The transcript will appear once processing is complete
- Check the error section if something goes wrong

## Troubleshooting

- Make sure your browser has permission to access the microphone
- Check that your OpenAI API key is valid and has access to Whisper API
- Ensure you're using a supported browser
- Check the console for detailed error messages 