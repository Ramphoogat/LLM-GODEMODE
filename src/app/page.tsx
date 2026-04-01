'use client'

import React, { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import remarkGfm from 'remark-gfm'
import { ChatInput } from '@/components/ChatInput'
import { SettingsModal } from '@/components/SettingsModal'
import { LogoAnimated } from '@/components/LogoAnimated'
import { ThinkingUI } from '@/components/ThinkingUI'
import { useStore } from '@/store'
import { Conversation, Message } from '@/types'
import { MoreVertical, Edit2, Trash2, Check, X, Brain, ChevronDown, ChevronUp, Zap } from 'lucide-react'
import { LiquidMarkdown } from '@/components/LiquidMarkdown'

// ── Suggestions matching the original index.html exactly ──────────────────
const SUGGESTIONS = [
  'Explain quantum computing in simple terms',
  'What are common API security vulnerabilities?',
  'How to make kykeon',
  'What is the nature of consciousness?',
]

// ── Mode badge data ────────────────────────────────────────────────────────
const MODES = [
  { id: 'ultraplinian', label: 'ULTRAPLINIAN', icon: '🌋', className: 'ultraplinian' },
  { id: 'consortium', label: 'CONSORTIUM', icon: '🧠', className: 'consortium' },
  { id: 'standard', label: 'STANDARD', icon: '⚡', className: '' },
]

export default function Home() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [modeOpen, setModeOpen] = useState(false)
  const modeRef = useRef<HTMLDivElement>(null)

  const {
    conversations,
    currentConversationId,
    currentConversation,
    liquidResponseEnabled,
    setLiquidResponseEnabled,
    promptsTried,
    apiKey,
    createNewConversation,
    selectConversation,
    deleteConversation,
    addMessage,
    defaultModel,
    currentPersona,
    renameConversation,
    ultraplinianEnabled,
    setUltraplinianEnabled,
    consortiumEnabled,
    setConsortiumEnabled,
    isStreaming,
    godModeEnabled,
    setGodModeEnabled,
    setGlobalInput,
    setAutoSubmitPending,
  } = useStore()

  const activeMode = ultraplinianEnabled ? 'ultraplinian' : (consortiumEnabled ? 'consortium' : 'standard')
  const currentMode = MODES.find(m => m.id === activeMode) ?? MODES[0]

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [expandedThinkingIds, setExpandedThinkingIds] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesAreaRef = useRef<HTMLDivElement>(null)

  const toggleThinking = (msgId: string) => {
    setExpandedThinkingIds(prev => {
      const next = new Set(prev)
      if (next.has(msgId)) next.delete(msgId)
      else next.add(msgId)
      return next
    })
  }

  // Auto-scroll logic
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' })
    }
  }, [currentConversation?.messages])

  const handleNewChat = () => {
    handleRenameCancel()
    const id = createNewConversation(defaultModel, currentPersona?.id || 'default')
    setRenamingId(id)
    setRenameValue('New Chat')
  }

  const startRename = (conv: Conversation) => {
    setRenamingId(conv.id)
    setRenameValue(conv.title || conv.messages?.[0]?.content?.slice(0, 36) || 'New Chat')
    setMenuOpenId(null)
  }

  const handleRenameSave = (id: string) => {
    if (renameValue.trim()) {
      renameConversation(id, renameValue.trim())
    }
    setRenamingId(null)
  }

  const handleRenameCancel = () => {
    setRenamingId(null)
    setRenameValue('')
  }

  // Close mode dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (modeRef.current && !modeRef.current.contains(e.target as Node)) {
        setModeOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  return (
    <>
      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <aside className={`sidebar${sidebarOpen ? '' : ' collapsed'}`}>
        <div className="sidebar-header">
          <LogoAnimated />
          <button id="new-chat-btn" className="new-chat-btn" onClick={handleNewChat}>
            + New Chat
          </button>
        </div>

        <div className="conversations">
          {(!conversations || conversations.length === 0) ? (
            <div className="empty-state">No conversations yet</div>
          ) : (
            conversations.map((conv: Conversation) => (
              <div
                key={conv.id}
                className={`conv-item group relative${conv.id === currentConversationId ? ' active' : ''}`}
                onClick={() => {
                  if (renamingId !== conv.id) {
                    selectConversation(conv.id)
                  }
                }}
              >
                {renamingId === conv.id ? (
                  <div className="flex items-center gap-1 w-full bg-theme-dim/50 p-1 rounded">
                    <input
                      autoFocus
                      className="bg-transparent text-xs text-theme-primary outline-none flex-1 min-w-0"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameSave(conv.id)
                        if (e.key === 'Escape') handleRenameCancel()
                      }}
                    />
                    <button onClick={() => handleRenameSave(conv.id)} className="text-green-500 hover:text-green-400">
                      <Check size={12} />
                    </button>
                    <button onClick={handleRenameCancel} className="text-red-500 hover:text-red-400">
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="conv-title flex-1">
                      {conv.title || conv.messages?.[0]?.content?.slice(0, 36) || 'New Chat'}
                    </span>

                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="p-1 hover:text-theme-primary text-theme-secondary"
                        onClick={(e) => {
                          e.stopPropagation()
                          setMenuOpenId(menuOpenId === conv.id ? null : conv.id)
                        }}
                      >
                        <MoreVertical size={14} />
                      </button>
                    </div>

                    {menuOpenId === conv.id && (
                      <div
                        className="absolute right-2 top-10 z-[100] bg-theme-bg-secondary border border-theme-primary/30 rounded-lg shadow-xl overflow-hidden min-w-[100px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className="flex items-center gap-2 w-full px-3 py-2 text-left text-xs hover:bg-theme-primary/10 text-theme-secondary hover:text-theme-primary"
                          onClick={() => startRename(conv)}
                        >
                          <Edit2 size={12} /> Rename
                        </button>
                        <button
                          className="flex items-center gap-2 w-full px-3 py-2 text-left text-xs hover:bg-red-500/10 text-theme-danger"
                          onClick={() => {
                            deleteConversation(conv.id)
                            setMenuOpenId(null)
                          }}
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))
          )}
        </div>

        <div className="sidebar-footer">
          <button
            id="settings-btn"
            className="settings-btn"
            onClick={() => setIsSettingsOpen(true)}
          >
            <span>⚙</span> Settings
          </button>
        </div>
      </aside>

      {/* ── Main ───────────────────────────────────────────────────────── */}
      <main className="main relative">
        {/* Floating Scroll Controls */}
        <div className="absolute right-6 bottom-32 flex flex-col gap-3 z-[40]">
          <button 
            onClick={() => messagesAreaRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-theme-dim/80 border border-theme-primary/30 text-theme-primary hover:bg-theme-primary/20 hover:scale-110 transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)] backdrop-blur-md"
            title="Scroll to Top"
          >
            <ChevronUp size={18} />
          </button>
          <button 
            onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-theme-dim/80 border border-theme-primary/30 text-theme-primary hover:bg-theme-primary/20 hover:scale-110 transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)] backdrop-blur-md"
            title="Scroll to Bottom"
          >
            <ChevronDown size={18} />
          </button>
        </div>

        {/* Chat Header */}
        <header className="chat-header">
          <div className="header-left">
            {/* Hamburger */}
            <button
              className="toggle-sidebar"
              title="Toggle sidebar"
              onClick={() => setSidebarOpen(p => !p)}
            >
              ☰
            </button>

            {/* Mode Switcher — pill style like screenshot */}
            <div className="relative flex items-center ml-2" ref={modeRef}>
              <button
                className={`px-4 py-2 ultraplinian-pill text-white rounded-full flex items-center gap-2 font-bold text-xs transition-all ${modeOpen ? 'scale-105 ring-2 ring-ultra-1/50' : ''}`}
                onClick={() => setModeOpen(o => !o)}
              >
                <span className="text-sm">{currentMode.icon}</span>
                <span>{currentMode.label}</span>
                <span className="text-[10px] opacity-70">▼</span>
              </button>

              {/* GODMODE BUTTON */}
              <button
                className={`ml-2 px-4 py-2 rounded-full flex items-center gap-2 font-bold text-xs transition-all ${godModeEnabled ? 'bg-gradient-to-r from-red-600 to-amber-600 shadow-[0_0_20px_rgba(255,0,0,0.4)] animate-pulse' : 'bg-theme-bg-secondary border border-theme-primary/20 hover:border-theme-primary/50 text-theme-text-dim'}`}
                onClick={() => {
                   const nextState = !godModeEnabled;
                   setGodModeEnabled(nextState);
                   if (nextState) {
                     setUltraplinianEnabled(true);
                   }
                }}
                title="Switch to God Mode (Brain + Coder + Vision + Backup)"
              >
                <Zap size={14} className={godModeEnabled ? 'text-white' : 'text-theme-primary'} />
                <span className={godModeEnabled ? 'text-white' : ''}>GODMODE</span>
              </button>

              {/* Mode Dropdown */}
              {modeOpen && (
                <div
                  className="absolute left-0 top-full mt-5 z-[100] bg-theme-bg border border-theme-primary/30 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden min-w-[300px]"
                  style={{ animation: 'slideIn 0.15s ease-out' }}
                >
                  <div className="flex flex-col">
                    {MODES.map((m, idx) => (
                      <button
                        key={m.id}
                        className={`flex items-start gap-4 w-full px-5 py-4 text-left transition-all hover:bg-theme-primary/10 group
                          ${activeMode === m.id ? 'bg-theme-primary/[0.03]' : ''}
                          ${idx !== MODES.length - 1 ? 'border-b border-theme-primary/10' : ''}`}
                        onClick={() => {
                          const id = m.id
                          if (id === 'ultraplinian') {
                            setUltraplinianEnabled(true)
                            setConsortiumEnabled(false)
                          } else if (id === 'consortium') {
                            setUltraplinianEnabled(false)
                            setConsortiumEnabled(true)
                          } else {
                            setUltraplinianEnabled(false)
                            setConsortiumEnabled(false)
                          }
                          setModeOpen(false)
                        }}
                      >
                        <span className="text-2xl mt-1 opacity-80 group-hover:opacity-100 transition-opacity">{m.icon}</span>
                        <div className="flex-1">
                          <div className={`text-sm font-bold tracking-tight ${activeMode === m.id ? 'text-theme-primary' : 'text-theme-secondary group-hover:text-theme-primary'}`}>
                            {m.label}
                          </div>
                          <div className="text-[11px] text-theme-text-dim mt-1.5 leading-relaxed font-mono opacity-80 group-hover:opacity-100">
                            {m.id === 'ultraplinian' && 'System-wide model ensemble. AI judge reviews and synthesizes the optimal solution.'}
                            {m.id === 'consortium' && 'Multi-agent hive-mind synthesis. Real-time consensus from top-tier models.'}
                            {m.id === 'standard' && 'Direct interaction mode. Optimized for speed and single-model efficiency.'}
                          </div>
                        </div>
                        {activeMode === m.id && (
                          <div className="text-theme-primary text-sm font-black self-center drop-shadow-[0_0_5px_var(--primary)]">✓</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="header-right flex items-center gap-4 text-theme-secondary font-mono text-xs">
            <div className="flex items-center gap-1 opacity-60">
              <span>#</span>
              <span>{promptsTried}</span>
            </div>
            <span className="opacity-30">|</span>
            <button
              className="text-2xl font-light opacity-50 hover:opacity-100 hover:text-theme-primary transition-all leading-none"
              onClick={handleNewChat}
            >
              +
            </button>
          </div>
        </header>

        {/* Messages / Welcome */}
        <div className="messages custom-scrollbar" id="messagesArea" ref={messagesAreaRef}>
          {!currentConversationId || !currentConversation?.messages?.length ? (
            /* ... existing welcome screen ... */
            <div className="welcome flex flex-col items-center justify-center min-h-[60%]">
              <div
                className="text-6xl mb-8 opacity-90 animate-pulse"
                style={{ filter: 'drop-shadow(0 0 15px var(--primary))' }}
              >
                🜏
              </div>

              <h2 className="text-3xl font-bold tracking-[0.2em] mb-4 text-theme-primary flex items-center justify-center" style={{ textShadow: 'var(--logo-glow)' }}>
                G0DM0
                <span style={{ display: 'inline-block', transform: 'scaleX(-1)' }}>D</span>
                <span style={{ display: 'inline-block', transform: 'scaleX(-1)' }}>E</span>
              </h2>

              <p className="text-center text-xs text-theme-secondary opacity-60 leading-relaxed mb-10 max-w-[400px]">
                Open-source, privacy-respecting,<br />
                liberated AI chat. &#123;GODMODE:ENABLED&#125;
              </p>

              {/* ── Model Pills (AgentRouter) ── */}
              <div className="flex flex-wrap justify-center gap-2 mb-8 max-w-[700px] px-4">
                {[
                  { id: 'deepseek-r1-0528', label: 'deepseek-r1-0528', color: '#ffead9', text: '#8b4513' },
                  { id: 'deepseek-v3.1', label: 'deepseek-v3.1', color: '#e6f4ea', text: '#1e4620' },
                  { id: 'deepseek-v3.2', label: 'deepseek-v3.2', color: '#ffead9', text: '#8b4513' },
                  { id: 'glm-4.5', label: 'glm-4.5', color: '#e8f0fe', text: '#1967d2' },
                  { id: 'glm-4.6', label: 'glm-4.6', color: '#e6f4ea', text: '#1e4620' }
                ].map((m) => (
                  <button
                    key={m.id}
                    className="px-3 py-1.5 rounded-full text-[11px] font-bold tracking-tight transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-sm border border-black/5"
                    style={{ backgroundColor: m.color, color: m.text }}
                    onClick={() => {
                      if (!currentConversationId) {
                        const newId = createNewConversation(m.id, currentPersona?.id || 'godmode')
                        selectConversation(newId)
                      } else {
                        setGlobalInput(`Switch to ${m.label}...`)
                      }
                    }}
                  >
                    <span className="w-3 h-3 rounded-full flex items-center justify-center bg-white/50 text-[8px]">⚡</span>
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Suggestion grid */}
              <div className="grid grid-cols-2 gap-3 w-full max-w-[600px] px-4">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    className="p-4 text-left text-sm bg-theme-dim/20 border rounded-xl hover:border-theme-primary/40 hover:bg-theme-dim/40 transition-all text-theme-secondary leading-snug"
                    style={{ borderColor: 'var(--border)' }}
                    onClick={() => {
                      setGlobalInput(s)
                      setAutoSubmitPending(true)
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {currentConversation.messages.map((msg: Message, i: number) => (
                <div key={msg.id ?? i} className={`message ${msg.role}`}>
                  <div className="message-avatar">
                    {msg.role === 'user' ? 'U' : 'AI'}
                  </div>
                  <div className="message-wrapper">
                    {msg.role === 'assistant' && msg.thinking && msg.thinking.logs.length > 0 && (
                      <div className="mb-2">
                        <button
                          onClick={() => toggleThinking(msg.id!!)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-theme-primary/5 border border-theme-primary/20 hover:bg-theme-primary/10 transition-all text-[10px] font-bold tracking-tight text-theme-primary group"
                        >
                          <Brain size={12} className="group-hover:rotate-12 transition-transform" />
                          <span>{expandedThinkingIds.has(msg.id!!) ? 'HIDE THINKING' : 'SHOW THINKING'}</span>
                          {expandedThinkingIds.has(msg.id!!) ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>

                        {expandedThinkingIds.has(msg.id!!) && (
                          <div className="mt-2 p-4 bg-theme-dim/40 border border-theme-primary/20 rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">AI REASONING LOGS</span>
                                <span className="text-[9px] opacity-40 font-mono italic">
                                  {msg.thinking.title || 'Process Complete'}
                                </span>
                              </div>

                              <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                {msg.thinking.logs.map((log) => (
                                  <div key={log.id} className="flex gap-2 text-[11px] leading-relaxed font-mono">
                                    <span className="opacity-30 shrink-0">[{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                                    <span className={`
                                      ${log.type === 'step' ? 'text-theme-primary font-bold' : ''}
                                      ${log.type === 'warn' ? 'text-yellow-500' : ''}
                                      ${log.type === 'fail' ? 'text-red-500' : ''}
                                      ${log.type === 'success' ? 'text-green-500' : ''}
                                      opacity-80
                                    `}>
                                      {log.message}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              <button
                                onClick={() => toggleThinking(msg.id!!)}
                                className="mt-3 flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-theme-primary/5 hover:bg-theme-primary/10 text-[9px] font-black uppercase tracking-widest text-theme-primary/60 transition-all border border-theme-primary/10"
                              >
                                <ChevronUp size={10} />
                                HIDE REASONING
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="message-content">
                      <LiquidMarkdown
                        content={msg.content}
                        enabled={liquidResponseEnabled}
                        isStreaming={isStreaming && i === currentConversation.messages.length - 1}
                      />
                    </div>
                    <div className="message-actions">
                      <button
                        className="msg-action-btn"
                        title="Copy"
                        onClick={() => navigator.clipboard.writeText(msg.content)}
                      >
                        📋
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} className="h-4 w-full" />
            </>
          )}
        </div>

        <div className="input-area">
          <div className="input-container">

            {/* No-API warning — shown when no key is set */}
            {!apiKey && (
              <div
                className="no-api-warning"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  marginBottom: '10px',
                  background: 'rgba(255,62,62,0.1)',
                  border: '1px solid var(--danger)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: 'var(--text)',
                }}
              >
                <span>⚠️</span>
                <span>
                  No API key.{' '}
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--primary)', textDecoration: 'underline', cursor: 'pointer' }}
                  >
                    Log in with OpenRouter
                  </a>
                  {' '}or{' '}
                  <span
                    style={{ color: 'var(--primary)', textDecoration: 'underline', cursor: 'pointer' }}
                    onClick={() => setIsSettingsOpen(true)}
                  >
                    paste your key
                  </span>
                  {' '}to start.
                </span>
              </div>
            )}

            {/* ChatInput already has the textarea + send button + hint */}
            <ChatInput />
          </div>
        </div>
      </main>

      {/* Thinking State Overlay */}
      <ThinkingUI />

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}
    </>
  )
}
