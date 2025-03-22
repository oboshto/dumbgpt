import { useState, useRef, useEffect } from 'react';
import { FiSend, FiTrash2, FiShare2, FiGithub } from 'react-icons/fi';
import { ImSpinner8 } from 'react-icons/im';
import { RiRobot2Fill } from 'react-icons/ri';

// Environmental variables
const API_URL = import.meta.env.VITE_API_URL || 'https://api.dumbgpt.xyz';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

function App() {
  const [input, setInput] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [shareTooltip, setShareTooltip] = useState<string>('Share DumbGPT');
  const [sessionId] = useState<string>(() => {
    const newSessionId = crypto.randomUUID();
    return newSessionId;
  });

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Handle Safari mobile toolbar issues
  useEffect(() => {
    // Единственное что нужно - это установить высоту viewport
    const setViewportHeight = () => {
      // Этот код сохраняем для других аспектов адаптивности
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    // Вызываем при изменении размера окна
    window.addEventListener('resize', setViewportHeight);
    setViewportHeight();
    
    return () => {
      window.removeEventListener('resize', setViewportHeight);
    };
  }, []);

  // Load saved messages when component mounts
  useEffect(() => {
    const savedMessages = localStorage.getItem('dumbgpt-messages');
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        // Convert string timestamps back to Date objects
        const processedMessages = parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(processedMessages);
      } catch (error) {
        console.error('Failed to load saved messages:', error);
      }
    }
  }, []);

  // Save messages to localStorage when they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('dumbgpt-messages', JSON.stringify(messages));
    }
  }, [messages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input field when component mounts or after messages update
  useEffect(() => {
    inputRef.current?.focus();
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [input]);

  // Function to handle clicking on example questions
  const handleExampleClick = (exampleText: string) => {
    setInput(exampleText);
    inputRef.current?.focus();

    // Auto-resize textarea after setting new content
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
        inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
      }
    }, 0);
  };

  // Function to share link using Web Share API
  const shareConversation = async () => {
    const shareTitle = "DumbGPT - Unhelpful AI Assistant";
    const shareText = "Check out DumbGPT - an intentionally unhelpful AI agent.";
    const shareUrl = window.location.origin;

    // Check if Web Share API is supported
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl
        });
        setShareTooltip('Shared successfully!');
      } catch (err) {
        console.error('Error sharing:', err);
        // If user cancelled, don't show error
        if (err instanceof Error && err.name !== 'AbortError') {
          setShareTooltip('Failed to share');
        }
      } finally {
        // Reset tooltip after some time
        setTimeout(() => setShareTooltip('Share DumbGPT'), 2000);
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      try {
        await navigator.clipboard.writeText(`${shareTitle}\n\n${shareText}\n\n${shareUrl}`);
        setShareTooltip('Copied to clipboard!');
        setTimeout(() => setShareTooltip('Share DumbGPT'), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
        setShareTooltip('Failed to copy');
        setTimeout(() => setShareTooltip('Share DumbGPT'), 2000);
      }
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      role: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Call API with session ID
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          sessionId: sessionId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from server');
      }

      const data = await response.json();

      // Add assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response || 'Sorry, I couldn\'t generate a response',
        role: 'assistant',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error fetching response:', error);

      // Add error message from assistant
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Oh no! I had a major brain malfunction while trying to respond. Perhaps the cosmic rays interfered with my neural oscillators. Try asking again - maybe the alignment of the planets will be more favorable this time!',
        role: 'assistant',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear conversation
  const clearConversation = () => {
    setMessages([]);
    localStorage.removeItem('dumbgpt-messages');

    // Generate a new session ID to start fresh
    const newSessionId = crypto.randomUUID();
    localStorage.setItem('dumbgpt-session-id', newSessionId);
    window.location.reload(); // Reload to ensure clean state
  };

  // Handle key press (Enter to submit)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-900 text-gray-100 overflow-hidden">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 py-3 px-6 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-9 w-9 bg-blue-600 rounded-lg">
            <RiRobot2Fill className="text-white text-xl" />
          </div>
          <h1 className="text-xl font-bold text-gray-100">DumbGPT</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative group">
            <button
              onClick={shareConversation}
              className="flex items-center gap-1 px-3 py-1 text-gray-300 rounded-md hover:bg-gray-700 transition-colors"
              title={shareTooltip}
            >
              <FiShare2 /> Share
            </button>
            <div className="absolute top-full right-0 mt-1 py-1 px-2 bg-gray-700 text-xs font-medium text-gray-200 rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {shareTooltip}
            </div>
          </div>
          <button
            onClick={clearConversation}
            className="flex items-center gap-1 px-3 py-1 text-gray-300 rounded-md hover:bg-gray-700 transition-colors"
            title="Clear conversation"
          >
            <FiTrash2 /> Clear
          </button>
        </div>
      </header>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 w-full chat-container">
        <div className="max-w-4xl mx-auto w-full">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center min-h-[70vh]">
              <div className="text-center p-6 max-w-md mx-auto">
                <div className="mx-auto w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mb-4">
                  <RiRobot2Fill className="text-white text-5xl" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-100 mb-2">Welcome to DumbGPT</h2>
                <p className="text-gray-400 mb-4">
                  I'm your unhelpful AI assistant, ready to provide nonsensical answers to all your questions!
                </p>
                <div className="bg-gray-800 p-4 rounded-lg">
                  <p className="text-sm text-gray-300 font-medium mb-2">Examples of what you can ask:</p>
                  <ul className="text-sm text-gray-300 space-y-2">
                    <li
                      onClick={() => handleExampleClick("How do I learn JavaScript?")}
                      className="bg-gray-700 p-2 rounded hover:bg-gray-600 cursor-pointer transition-colors"
                    >"How do I learn JavaScript?"</li>
                    <li
                      onClick={() => handleExampleClick("Explain quantum computing to me")}
                      className="bg-gray-700 p-2 rounded hover:bg-gray-600 cursor-pointer transition-colors"
                    >"Explain quantum computing to me"</li>
                    <li
                      onClick={() => handleExampleClick("What's the best way to stay productive?")}
                      className="bg-gray-700 p-2 rounded hover:bg-gray-600 cursor-pointer transition-colors"
                    >"What's the best way to stay productive?"</li>
                  </ul>
                </div>

                {/* Disclaimer */}
                <div className="mt-8 text-xs text-gray-500 bg-gray-800 p-3 rounded-lg border border-gray-700">
                  <p className="font-medium mb-1">⚠️ Disclaimer</p>
                  <p>
                    DumbGPT is created for entertainment purposes only. The responses are intentionally nonsensical
                    and should not be taken as advice or factual information. Any resemblance to actual
                    intelligence, living or artificial, is purely coincidental.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 w-full">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] md:max-w-[75%] p-4 rounded-lg ${message.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-gray-700 text-gray-100 border border-gray-600 rounded-bl-none shadow-md'
                      }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <div
                      className={`text-xs mt-2 ${message.role === 'user' ? 'text-blue-200' : 'text-gray-400'
                        }`}
                    >
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-700 text-gray-100 border border-gray-600 rounded-lg rounded-bl-none shadow-md p-4 flex items-center">
                    <ImSpinner8 className="animate-spin text-gray-400 mr-2" />
                    <span className="text-gray-400">DumbGPT is thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="input-container">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto w-full">
          <div className="relative flex items-center w-full">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="w-full resize-none max-h-32 bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100 placeholder-gray-400"
              rows={1}
              disabled={isLoading}
            />
            <button
              type="submit"
              className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-white p-1.5 rounded-md ${isLoading || !input.trim()
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
                }`}
              disabled={isLoading || !input.trim()}
            >
              {isLoading ? (
                <ImSpinner8 className="animate-spin" size={18} />
              ) : (
                <FiSend size={18} />
              )}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 mb-0 text-center flex justify-center items-center">
            Press Enter to send. Responses are intentionally unhelpful.
          </p>
          <p className="text-xs text-gray-400 mt-2 mb-0 text-center flex justify-center items-center">
          <a 
              href="https://github.com/oboshto/dumbgpt" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center ml-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
              title="View source code on GitHub"
            >
              <FiGithub className="mr-1 flex-shrink-0" style={{ marginTop: '2px' }} size={10} /> <span>Open Source</span>
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}

export default App;
