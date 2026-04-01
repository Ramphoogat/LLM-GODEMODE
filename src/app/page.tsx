'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ChatInput } from '@/components/ChatInput'
import { SettingsModal } from '@/components/SettingsModal'
import { LogoAnimated } from '@/components/LogoAnimated'
import { ThinkingUI } from '@/components/ThinkingUI'
import { useStore } from '@/store'
import { Conversation, Message } from '@/types'
import { MoreVertical, Edit2, Trash2, Check, X } from 'lucide-react'

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
    setGlobalInput,
    setAutoSubmitPending,
  } = useStore()

  const activeMode = ultraplinianEnabled ? 'ultraplinian' : (consortiumEnabled ? 'consortium' : 'standard')
  const currentMode = MODES.find(m => m.id === activeMode) ?? MODES[0]

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

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
      <main className="main">

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
                className={`px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-full flex items-center gap-2 font-bold text-xs shadow-[0_0_15px_rgba(255,165,0,0.3)] hover:scale-105 transition-all ${modeOpen ? 'scale-105 ring-2 ring-orange-400/50' : ''}`}
                onClick={() => setModeOpen(o => !o)}
              >
                <span className="text-sm">{currentMode.icon}</span>
                <span>{currentMode.label}</span>
                <span className="text-[10px] opacity-70">▼</span>
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
                            {m.id === 'consortium'   && 'Multi-agent hive-mind synthesis. Real-time consensus from top-tier models.'}
                            {m.id === 'standard'     && 'Direct interaction mode. Optimized for speed and single-model efficiency.'}
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
        <div className="messages" id="messagesArea">
          {!currentConversationId || !currentConversation?.messages?.length ? (

            /* ── Welcome Screen (re-matching exactly) ── */
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

              {/* Suggestion grid — 2x2 grid from screen */}
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

            /* ── Messages list ── */
            currentConversation.messages.map((msg: Message, i: number) => (
              <div key={msg.id ?? i} className={`message ${msg.role}`}>
                <div className="message-avatar">
                  {msg.role === 'user' ? 'U' : 'AI'}
                </div>
                <div className="message-wrapper">
                  <div className="message-content" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', minHeight: '1em' }}>{msg.content}</div>
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
            ))
          )}
        </div>

        {/* ── Input area (matches index.html .input-area) ── */}
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

            {/* ChatInput already has the textarea + send button */}
            <ChatInput />

            {/* Keyboard hint */}
            <div className="input-hint">
              Enter to send · Shift+Enter for new line
            </div>
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
