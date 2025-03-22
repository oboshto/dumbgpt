import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import rateLimit from 'express-rate-limit';

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
app.set('trust proxy', 1);

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

interface SessionUsage {
  messageCount: number;
  totalTokens: number;
  lastRequest: Date;
  dailyReset: Date;
  ipAddresses: Set<string>;
}

// Rate limiting middleware
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  message: { error: 'Too many requests, please try again later' },
  keyGenerator: (req) => {
    // Default to IP if no session ID
    const sessionId = req.body?.sessionId || req.query?.sessionId;
    return sessionId || req.ip || req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
  }
});

const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Limit each session to 5 chat requests per minute
  standardHeaders: true,
  message: { error: 'Chat request limit exceeded, please try again later' },
  keyGenerator: (req) => {
    // Default to IP if no session ID
    const sessionId = req.body?.sessionId;
    return sessionId || req.ip || req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
  }
});

// Logging middleware for all requests
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(2, 10);
  const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  
  console.log(`[${new Date().toISOString()}] [${requestId}] 🔄 ${req.method} ${req.originalUrl} from IP: ${clientIp}`);
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

// Apply rate limiting to all API routes
app.use('/api/', (req, res, next) => {
  const keyValue = req.body?.sessionId || req.query?.sessionId || req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  console.log(`Rate limiting key for API request: ${keyValue}`);
  apiLimiter(req, res, next);
});

app.use('/api/chat', (req, res, next) => {
  const keyValue = req.body?.sessionId || req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  console.log(`Rate limiting key for chat request: ${keyValue}`);
  chatLimiter(req, res, next);
});

// Simple in-memory storage for chat sessions
const chatSessions = new Map<string, ChatMessage[]>();

// Usage tracking per session
const sessionUsage = new Map<string, SessionUsage>();

// Reset daily counters at midnight
setInterval(() => {
  const now = new Date();
  sessionUsage.forEach((usage, sessionId) => {
    // If last reset was yesterday or earlier
    if (usage.dailyReset.getDate() !== now.getDate() || 
        usage.dailyReset.getMonth() !== now.getMonth() || 
        usage.dailyReset.getFullYear() !== now.getFullYear()) {
      usage.messageCount = 0;
      usage.dailyReset = now;
      console.log(`Reset daily usage for session ${sessionId}`);
    }
  });
}, 60 * 60 * 1000); // Check every hour

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  console.log('Health check requested');
  res.status(200).json({ status: 'ok', message: 'Dumb-GPT server is running' });
});

const contentFilterMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const { message } = req.body;
  
  if (message && message.length > 500) {
    return res.status(400).json({ 
      error: 'Message too long. Please limit your input to 500 characters.' 
    });
  }
  
  const forbiddenPatterns = [
    /script\s*>/i, 
    /{{\s*.*\s*}}/i, 
    /^\s*select\s+.+\s+from/i,
  ];
  
  if (forbiddenPatterns.some(pattern => pattern.test(message))) {
    return res.status(403).json({ 
      error: 'Potentially harmful content detected'
    });
  }
  
  next();
};

// Chat completion endpoint with additional protections
app.post('/api/chat', contentFilterMiddleware, async (req: Request<{}, {}, ChatRequest>, res: Response) => {
  const { message, sessionId = 'default' } = req.body;
  const ip = req.ip || req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
  
  console.log(`Request from IP: ${ip}`);
  
  if (!message) {
    console.error('Invalid request: Message is missing');
    return res.status(400).json({ error: 'Message is required' });
  }

  console.log(`Processing chat request with message length: ${message.length} characters`);
  console.log(`Session ID: ${sessionId}`);

  // Track usage per session
  if (!sessionUsage.has(sessionId)) {
    sessionUsage.set(sessionId, {
      messageCount: 0,
      totalTokens: 0,
      lastRequest: new Date(),
      dailyReset: new Date(),
      ipAddresses: new Set([ip])
    });
  } else {
    // Add IP to the session's set of IPs
    const usage = sessionUsage.get(sessionId)!;
    usage.ipAddresses.add(ip);
    
    if (usage.ipAddresses.size > 5) {
      console.warn(`Session ${sessionId} accessed from ${usage.ipAddresses.size} different IPs - suspicious activity`);
    }
  }
  
  const usage = sessionUsage.get(sessionId)!;
  
  // Check daily limits
  const dailyMessageLimit = 50; // Adjust as needed
  if (usage.messageCount >= dailyMessageLimit) {
    return res.status(429).json({
      error: 'Daily message limit reached. Please try again tomorrow.',
      limit: dailyMessageLimit,
      used: usage.messageCount
    });
  }

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
  
  // Keep only last 6 messages (plus system prompt) to control costs
  if (sessionMessages.length > 7) {
    // Keep system message at index 0, and last 6 messages
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
    
    // Update usage statistics
    usage.messageCount++;
    usage.totalTokens += completion.usage?.total_tokens || 0;
    usage.lastRequest = new Date();
    
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
  🛡️ Security features: Rate limiting, content filtering
  
  Available endpoints:
  - GET  /api/health       - Health check endpoint
  - POST /api/chat         - Chat completion endpoint
  `);
});
