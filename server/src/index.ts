import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';

// Load environment variables
dotenv.config();

// Initialize OpenAI API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Define port
const PORT = process.env.PORT || 3001;

// Define interfaces
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  message: string;
  sessionId?: string;
}

// Simple in-memory storage for chat sessions
const chatSessions = new Map<string, ChatMessage[]>();

// Logging middleware for all requests
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(2, 10);
  
  console.log(`[${new Date().toISOString()}] [${requestId}] 🔄 ${req.method} ${req.originalUrl}`);
  if (req.method !== 'GET') {
    console.log(`[${new Date().toISOString()}] [${requestId}] 📦 Request body:`, req.body);
  }

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(body) {
    console.log(`[${new Date().toISOString()}] [${requestId}] 📨 Response:`, 
      body.response ? `${body.response.substring(0, 100)}${body.response.length > 100 ? '...' : ''}` : body);
    console.log(`[${new Date().toISOString()}] [${requestId}] ⏱️ Request completed in ${Date.now() - start}ms with status ${res.statusCode}`);
    return originalJson.call(this, body);
  };

  next();
});

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  console.log('Health check requested');
  res.status(200).json({ status: 'ok', message: 'Dumb-GPT server is running' });
});

// Chat completion endpoint
// @ts-ignore: Express types issue
app.post('/api/chat', async (req: Request<{}, {}, ChatRequest>, res: Response) => {
  const { message, sessionId = 'default' } = req.body;
  
  if (!message) {
    console.error('Invalid request: Message is missing');
    return res.status(400).json({ error: 'Message is required' });
  }

  console.log(`Processing chat request with message length: ${message.length} characters`);
  console.log(`Session ID: ${sessionId}`);

  // Initialize session if it doesn't exist
  if (!chatSessions.has(sessionId)) {
    chatSessions.set(sessionId, [
      {
        role: "system",
        content: "You are DumbGPT, an AI assistant that deliberately gives unhelpful, nonsensical, rude, and comically wrong answers while maintaining a confident tone. Like you're a stupid young brother. Be drama queen and passive aggressive. Keep answers short and to the point."
      }
    ]);
  }

  // Get session messages
  const sessionMessages = chatSessions.get(sessionId)!;
  
  // Add user message to history
  sessionMessages.push({ role: "user", content: message });
  
  // Keep only last 10 messages (plus system prompt) to control costs
  if (sessionMessages.length > 7) {
    // Keep system message at index 0, and last 10 messages
    sessionMessages.splice(1, sessionMessages.length - 7);
  }

  try {
    console.log('Sending request to OpenAI API');
    console.log(`Including ${sessionMessages.length} messages in context`);
    const startTime = Date.now();
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: sessionMessages,
      temperature: 1.2,
      max_tokens: 200
    });
    
    const elapsedTime = Date.now() - startTime;
    console.log(`OpenAI API responded in ${elapsedTime}ms`);
    
    const responseContent = completion.choices[0].message.content;
    console.log(`Generated response with length: ${responseContent?.length || 0} characters`);
    
    // Save assistant response to history
    sessionMessages.push({ 
      role: "assistant", 
      content: responseContent || 'No response generated'
    });
    
    res.json({ response: responseContent });
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    
    // Enhanced error logging
    if (error instanceof Error) {
      console.error(`Error details: ${error.message}`);
      console.error(`Error stack: ${error.stack}`);
      
      // Check if it's an OpenAI API error with additional details
      if ('status' in error && typeof error.status === 'number') {
        console.error(`OpenAI API Status Code: ${error.status}`);
      }
    }
    
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`
  🚀 Dumb-GPT Server is running!
  🌐 Server URL: http://localhost:${PORT}
  🔑 API Key Status: ${process.env.OPENAI_API_KEY ? 'Configured' : 'MISSING'}
  🕒 Server started at: ${new Date().toLocaleString()}
  
  Available endpoints:
  - GET  /api/health - Health check endpoint
  - POST /api/chat   - Chat completion endpoint
  `);
});
