'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, MessageSquare, Plus, Trash2, X, CheckCircle, AlertCircle, User, Clock } from 'lucide-react';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatSession {
  id: number;
  title: string;
  last_message: string;
  timestamp: string;
  message_count: number;
}

const suggestedQueries = [
  { icon: '🚌', text: 'Track bus location' },
  { icon: '📋', text: 'Check attendance' },
  { icon: '🗺️', text: 'Route information' },
  { icon: '💰', text: 'Fee status' },
  { icon: '📊', text: 'Generate report' },
];

const botResponses: Record<string, string> = {
  'track bus': 'I can help you track your buses in real-time. Currently, 8 out of 12 vehicles are active. BUS-001 is on Route A moving at 42 km/h with 28 students onboard. Would you like me to show you the live map or get details for a specific bus?',
  'attendance': 'Today\'s attendance summary:\n\n• Total Students: 245\n• Present: 228 (93%)\n• Absent: 12\n• Late: 5\n\nClass 10-A has the lowest attendance at 85%. Would you like me to send absence notifications to parents?',
  'route': 'Here are the active routes today:\n\n1. Route A - Downtown to School (8 stops, 45 min)\n2. Route B - Westside to School (12 stops, 60 min)\n3. Route C - Eastside to School (10 stops, 55 min)\n\nAll routes are running on time. Route B has a 5-minute delay due to traffic on Main Street.',
  'fee': 'Fee collection status for this month:\n\n• Collected: $12,450 (78%)\n• Pending: $3,500 (22%)\n• Overdue: $850\n\n15 students have pending fees. Would you like me to generate a defaulter list or send payment reminders?',
  'report': 'I can generate the following reports:\n\n1. Attendance Report\n2. Fleet Utilization\n3. Route Performance\n4. Fee Collection Summary\n5. Driver Performance\n\nWhich report would you like me to generate? You can also specify a date range.',
  'default': 'I\'m your Busly AI assistant! I can help you with:\n\n• Tracking buses in real-time\n• Checking student attendance\n• Route information and schedules\n• Fee collection status\n• Generating reports\n• Driver and vehicle management\n\nHow can I help you today?',
};

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: 'assistant',
      content: 'Hello! I\'m your Busly AI assistant. I can help you track buses, check attendance, manage routes, and generate reports. How can I help you today?',
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([
    { id: 1, title: 'Bus Tracking Query', last_message: 'Show me all active buses', timestamp: '10:30 AM', message_count: 4 },
    { id: 2, title: 'Attendance Report', last_message: 'Generate weekly report', timestamp: '9:15 AM', message_count: 6 },
    { id: 3, title: 'Fee Collection', last_message: 'Pending fees list', timestamp: 'Yesterday', message_count: 3 },
  ]);
  const [activeSession, setActiveSession] = useState<number | null>(null);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const getBotResponse = (query: string): string => {
    const lower = query.toLowerCase();
    if (lower.includes('track') || lower.includes('bus') || lower.includes('location')) return botResponses['track bus'];
    if (lower.includes('attendance') || lower.includes('present') || lower.includes('absent')) return botResponses['attendance'];
    if (lower.includes('route') || lower.includes('stop') || lower.includes('schedule')) return botResponses['route'];
    if (lower.includes('fee') || lower.includes('payment') || lower.includes('due')) return botResponses['fee'];
    if (lower.includes('report') || lower.includes('generate')) return botResponses['report'];
    return botResponses['default'];
  };

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText) return;

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: messageText,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));

    const botMessage: Message = {
      id: Date.now() + 1,
      role: 'assistant',
      content: getBotResponse(messageText),
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages(prev => [...prev, botMessage]);
    setIsTyping(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startNewChat = () => {
    setMessages(prev => [
      { id: Date.now(), title: 'New Conversation', last_message: '', timestamp: 'Just now', message_count: 0 },
      ...prev,
    ]);
    setMessages([{
      id: 1,
      role: 'assistant',
      content: 'Hello! I\'m your Busly AI assistant. How can I help you today?',
      timestamp: new Date().toLocaleTimeString(),
    }]);
    setActiveSession(null);
    showToast('New chat started', 'success');
  };

  const deleteSession = (sessionId: number) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    showToast('Chat session deleted', 'success');
  };

  return (
    <div className="space-y-6">
      {toast.show && (
        <div className={`fixed top-4 right-4 z-[100] px-5 py-3 rounded-xl shadow-xl border text-sm font-medium flex items-center gap-3 transition-all ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
          <button onClick={() => setToast({ show: false, message: '', type: 'success' })} className="ml-2 opacity-60 hover:opacity-100"><X size={16} /></button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AI Assistant</h1>
          <p className="text-slate-500 mt-1">Your intelligent bus management companion</p>
        </div>
        <button
          onClick={startNewChat}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
        >
          <Plus size={20} />
          New Chat
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Chat Sessions</h3>
            <div className="space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => setActiveSession(session.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all group ${
                    activeSession === session.id ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{session.title}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{session.last_message || 'No messages yet'}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Clock size={12} className="text-slate-400" />
                        <span className="text-xs text-slate-400">{session.timestamp}</span>
                        <span className="text-xs text-slate-400">&bull; {session.message_count} msgs</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                      className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl p-5 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={20} />
              <h3 className="font-semibold">AI Tips</h3>
            </div>
            <p className="text-cyan-100 text-sm">Ask me anything about your bus fleet, student attendance, routes, or fee management.</p>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
                <Bot size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Busly AI</h3>
                <p className="text-xs text-emerald-500 font-medium">Online</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0">
                      <Bot size={16} className="text-white" />
                    </div>
                  )}
                  <div className={`max-w-[80%] ${message.role === 'user' ? 'order-first' : ''}`}>
                    <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      message.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-md'
                        : 'bg-slate-100 text-slate-800 rounded-bl-md'
                    }`}>
                      {message.content.split('\n').map((line, i) => (
                        <p key={i} className={line.startsWith('•') ? 'ml-2' : ''}>{line}</p>
                      ))}
                    </div>
                    <p className={`text-xs text-slate-400 mt-1 ${message.role === 'user' ? 'text-right' : ''}`}>{message.timestamp}</p>
                  </div>
                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                      <User size={16} className="text-white" />
                    </div>
                  )}
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0">
                    <Bot size={16} className="text-white" />
                  </div>
                  <div className="bg-slate-100 px-4 py-3 rounded-2xl rounded-bl-md">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-slate-100">
              <div className="flex flex-wrap gap-2 mb-3">
                {suggestedQueries.map((query, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(query.text)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-lg text-xs font-medium transition-colors"
                  >
                    <span>{query.icon}</span>
                    {query.text}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50"
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isTyping}
                  className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
