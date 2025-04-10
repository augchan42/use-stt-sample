'use server';

export async function transcribe(formData: FormData) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  try {
    // Log incoming FormData
    const file = formData.get('file');
    console.log('Server: Received FormData:', {
      hasFile: formData.has('file'),
      fileName: file instanceof File ? file.name : null,
      fileSize: file instanceof File ? file.size : null,
      fileType: file instanceof File ? file.type : null
    });

    formData.append('model', 'whisper-1');
    formData.append('response_format', 'json');

    console.log('Server: Sending request to Whisper API...');
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Server: Whisper API error:', error);
      throw new Error(`Whisper API error: ${error.error?.message || 'Unknown error'}`);
    }

    const result = await response.json();
    console.log('Server: Received response from Whisper API:', result);
    
    return {
      transcript: result.text,
      confidence: 0.95 // Whisper API doesn't provide confidence scores
    };
  } catch (error) {
    console.error('Server: Transcription error:', error);
    throw new Error(error instanceof Error ? error.message : 'Transcription failed');
  }
} 