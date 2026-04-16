/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Bot, Send, User, Menu, PlusCircle, Sparkles, LogOut, MessageSquare } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useRouter } from 'next/navigation';
import { createClient } from '../utils/supabase/client';

export default function Home() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  // Manual chat state
  const [messages, setMessages] = useState<{id: string, role: string, content: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initial load logic: Check user and fetch conversions
  useEffect(() => {
    const initData = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (!user || error) {
          router.replace('/login');
          return;
        }
        setUser(user);

        // Load conversations
        const { data: convs } = await supabase
          .from('conversations')
          .select('*')
          .order('created_at', { ascending: false });

        if (convs) {
          setConversations(convs);
        }
      } catch (err) {
        console.error("Init Error:", err);
        router.replace('/login');
      }
    };
    initData();
  }, [supabase, router]);

  const loadConversation = async (id: string) => {
    setCurrentConversationId(id);
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    if (msgs) {
      setMessages(msgs.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content
      })));
    } else {
      setMessages([]);
    }

    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  const startNewChat = () => {
    setCurrentConversationId(null);
    setMessages([]);
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const onSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading || !user) return;
    
    // Save locally
    const userMsg = { id: Date.now().toString(), role: 'user', content: input };
    const chatHistory = [...messages, userMsg];
    setMessages(chatHistory);
    setInput('');
    setIsLoading(true);

    let convId = currentConversationId;
    let newConversationCreated = false;

    try {
      // 1. Create conversation if it doesn't exist
      if (!convId) {
        const title = input.length > 30 ? input.substring(0, 30) + '...' : input;
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({ user_id: user.id, title })
          .select()
          .single();

        if (newConv) {
          convId = newConv.id;
          setCurrentConversationId(convId);
          setConversations(prev => [newConv, ...prev]);
          newConversationCreated = true;
        }
      }

      // 2. Save User Message to Database
      if (convId) {
        await supabase.from('messages').insert({
          conversation_id: convId,
          user_id: user.id,
          role: 'user',
          content: userMsg.content,
        });
      }

      // 3. Setup AI Response Placeholder
      const aiMsgId = (Date.now() + 1).toString();
      setMessages([...chatHistory, { id: aiMsgId, role: 'assistant', content: '' }]);

      // 4. Fetch from AI Stream API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatHistory })
      });

      if (!response.body) throw new Error("No body from server API");
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        
        aiText += chunk;
        setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: aiText } : m));
      }

      // 5. Save AI Message to Database
      if (convId) {
        await supabase.from('messages').insert({
          conversation_id: convId,
          user_id: user.id,
          role: 'assistant',
          content: aiText,
        });
      }

    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan saat memproses pesan.");
    } finally {
      setIsLoading(false);
    }
  };

  // If we are checking the user status, let's not render the entire heavy UI yet.
  if (user === null) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <img src="/icon.png" alt="Loading" width={48} height={48} style={{ animation: 'fadeIn 1s infinite alternate', borderRadius: '8px' }} />
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div 
          className="mobile-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''} ${desktopCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
            <img src="/icon.png" alt="IPAW AI Logo" width={24} height={24} style={{ objectFit: 'contain', borderRadius: '4px' }} />
            <span className="sidebar-title">IPAW AI</span>
          </div>
        </div>
        
        <button className="new-chat-btn" onClick={startNewChat}>
          <PlusCircle size={18} />
          <span>Chat Baru</span>
        </button>

        <div className="conversation-list" style={{ flex: 1, overflowY: 'auto', padding: '0 1rem' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.5rem', paddingLeft: '0.5rem' }}>Riwayat</p>
          {conversations.length === 0 && (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', opacity: 0.7, textAlign: 'center', marginTop: '1rem' }}>Belum ada riwayat</p>
          )}
          {conversations.map(c => (
            <button 
              key={c.id} 
              onClick={() => loadConversation(c.id)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                width: '100%', 
                textAlign: 'left', 
                padding: '0.75rem', 
                borderRadius: '0.5rem', 
                backgroundColor: c.id === currentConversationId ? 'var(--surface-hover)' : 'transparent', 
                color: 'var(--text-primary)', 
                marginBottom: '0.25rem', 
                transition: 'background-color 0.2s',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <MessageSquare size={16} style={{ color: 'var(--primary-color)', opacity: 0.8, flexShrink: 0 }} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.9rem' }}>
                {c.title}
              </span>
            </button>
          ))}
        </div>

        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <button 
            onClick={logout} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem', 
              width: '100%', 
              padding: '0.75rem', 
              color: '#f87171', 
              backgroundColor: 'transparent', 
              border: 'none', 
              cursor: 'pointer',
              borderRadius: '0.5rem',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(248, 113, 113, 0.1)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <LogOut size={18} />
            <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>Keluar Akun</span>
          </button>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="main-chat">
        <header className="chat-header">
          <button className="mobile-menu-btn" onClick={() => {
            if (typeof window !== 'undefined' && window.innerWidth <= 768) {
              setSidebarOpen(!sidebarOpen);
            } else {
              setDesktopCollapsed(!desktopCollapsed);
            }
          }}>
            <Menu size={24} />
          </button>
        </header>

        <div className="messages-container">
          {messages.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.7 }}>
              <img src="/icon.png" alt="IPAW AI" width={48} height={48} style={{ marginBottom: '1rem', objectFit: 'contain', borderRadius: '8px' }} />
              <h2 style={{ marginBottom: '0.5rem', fontWeight: 600 }}>Halo! Saya Asisten IPAW AI Anda</h2>
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '400px' }}>
                Saya siap membantu Anda dengan jawaban yang elegan dan tenang. Ada yang bisa saya bantu hari ini?
              </p>
            </div>
          ) : (
            messages.map(m => (
              <div key={m.id} className={`message-wrapper ${m.role}`}>
                <div className={`avatar ${m.role === 'user' ? 'user' : 'ai'}`}>
                  {m.role === 'user' ? <User size={20} /> : <img src="/icon.png" alt="AI" width={24} height={24} style={{ objectFit: 'contain', borderRadius: '2px' }} />}
                </div>
                <div className={`message-bubble ${m.role}`}>
                  <div className={`message-content markdown-body ${m.role}`}>
                    {m.content ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {m.content}
                      </ReactMarkdown>
                    ) : "Sedang memproses..."}
                  </div>
                </div>
              </div>
            ))
          )}
          {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
             <div className="message-wrapper ai">
              <div className="avatar ai">
                <img src="/icon.png" alt="AI" width={24} height={24} style={{ objectFit: 'contain', borderRadius: '2px' }} />
              </div>
              <div className="message-bubble ai" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <div style={{ width: '6px', height: '6px', backgroundColor: 'var(--text-secondary)', borderRadius: '50%', animation: 'fadeIn 1s infinite alternate' }} />
                <div style={{ width: '6px', height: '6px', backgroundColor: 'var(--text-secondary)', borderRadius: '50%', animation: 'fadeIn 1s infinite alternate', animationDelay: '0.2s' }} />
                <div style={{ width: '6px', height: '6px', backgroundColor: 'var(--text-secondary)', borderRadius: '50%', animation: 'fadeIn 1s infinite alternate', animationDelay: '0.4s' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="input-area" onSubmit={onSubmit}>
          <div className="input-container">
            <button type="button" className="action-btn">
              <img src="/upload.svg" width={20} height={20} alt="Upload" />
            </button>
            <textarea
              className="chat-input"
              value={input}
              placeholder="Tanyakan sesuatu..."
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSubmit();
                }
              }}
              rows={1}
            />
            <button 
              type="submit" 
              className="send-btn"
              disabled={!input.trim() || isLoading}
            >
              <img src="/send.svg" width={20} height={20} alt="Send" />
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
