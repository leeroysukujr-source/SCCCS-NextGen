# AI Study Assistant Setup Guide

## Google Gemini API Configuration

The AI Study Assistant uses Google Gemini API to provide intelligent study help. Follow these steps to set it up:

### 1. Get Google Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

### 2. Configure Backend

Add the following to your `.env` file in the `backend` directory:

```env
# Google Gemini AI Configuration
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-pro
GEMINI_ENABLED=true
```

### 3. Install Dependencies

Make sure you have all required packages installed:

```bash
pip install -r requirements.txt
```

The following packages are required for document processing:
- `PyPDF2` - For PDF text extraction
- `python-docx` - For Word document text extraction

### 4. Restart Backend Server

After adding the API key, restart your backend server:

```bash
python run.py
```

### 5. Verify Setup

The AI Study Assistant will automatically check if Gemini is configured. You can verify by:
- Opening a lesson with materials
- Clicking "AI Study Assistant" button
- If configured correctly, you'll see the chat interface
- If not configured, you'll see a message to configure the API key

## Features

The AI Study Assistant provides:

1. **Interactive Chat** - Ask questions about documents and get AI-powered answers
2. **Study Notes Generation** - Automatically generate comprehensive study notes
3. **Quiz Generation** - Create quiz questions with multiple choice answers
4. **Document Summarization** - Get summaries of course materials
5. **Concept Explanation** - Get detailed explanations of specific concepts
6. **Context-Aware** - AI understands the course and lesson context

## API Endpoints

- `POST /api/ai-study/chat` - Chat with AI assistant
- `GET /api/ai-study/extract-text/<file_id>` - Extract text from file
- `POST /api/ai-study/generate-notes` - Generate study notes
- `POST /api/ai-study/generate-quiz` - Generate quiz questions
- `POST /api/ai-study/summarize-document` - Summarize document
- `POST /api/ai-study/explain-concept` - Explain a concept
- `GET /api/ai-study/status` - Check AI service status

## Supported File Types

- PDF (.pdf)
- Word Documents (.docx, .doc)
- Text Files (.txt, .md)
- More formats can be added by extending the extraction functions

## Usage

1. Navigate to a lesson with uploaded materials
2. Click "View Materials" or "AI" button on a lesson
3. Click "AI Study Assistant" button
4. Start chatting or use quick actions:
   - **Notes** - Generate study notes
   - **Quiz** - Create practice questions
   - **Summary** - Get document summary
   - **Explain** - Explain a concept

## Troubleshooting

### AI Assistant Not Available
- Check that `GEMINI_API_KEY` is set in `.env`
- Verify `GEMINI_ENABLED=true`
- Check backend logs for API errors
- Ensure backend server is running

### Text Extraction Fails
- Ensure file is uploaded correctly
- Check file format is supported (PDF, DOCX, TXT)
- Verify file is not corrupted
- Check backend logs for extraction errors

### Slow Responses
- Gemini API may take a few seconds for complex documents
- Large documents are truncated to 50,000 characters
- Check your internet connection
- Verify API key has sufficient quota

## Cost Considerations

Google Gemini API has a free tier with generous limits. Check [Google AI Pricing](https://ai.google.dev/pricing) for current rates.

For production use, consider:
- Implementing rate limiting
- Caching common responses
- Using document chunking for very large files
- Monitoring API usage

