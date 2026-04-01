'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { useStore, DEFAULT_PERSONA } from '@/store'
import { sendMessage, sendMessageViaProxy, streamUltraplinian, streamConsortium } from '@/lib/openrouter'
import { recordChatEvent } from '@/lib/telemetry'
import { classifyPrompt, ClassificationResult } from '@/lib/classify'
import { classifyWithLLM } from '@/lib/classify-llm'
import { computeAutoTuneParams, getContextLabel, getStrategyLabel, PARAM_META, AutoTuneResult } from '@/lib/autotune'
import { applyParseltongue, detectTriggers } from '@/lib/parseltongue'
import { Send, Loader2, StopCircle, SlidersHorizontal, AlertTriangle, Brain, Zap, ChevronDown, Paperclip, Image as ImageIcon, FileText, XCircle } from 'lucide-react'
import { Message, Persona, STMModule, Attachment } from '../types'

import { ULTRAPLINIAN_MODELS, FREE_MODELS, IMAGE_MODELS, getModelDisplayName } from '@/lib/models'

const AGENTROUTER_MODELS = [
  { id: 'deepseek-r1-0528', name: 'DeepSeek R1', provider: 'AgentRouter' },
  { id: 'glm-4.5', name: 'GLM 4.5', provider: 'AgentRouter' },
]

// Deduplicated merged list
const ALL_MODELS = [
  ...Array.from(new Set([...ULTRAPLINIAN_MODELS, ...FREE_MODELS, ...IMAGE_MODELS])).map(id => ({
    id,
    name: getModelDisplayName(id),
    provider: 'OpenRouter',
    isFree: id.endsWith(':free') || FREE_MODELS.includes(id)
  })),
  ...AGENTROUTER_MODELS.map(m => ({ ...m, isFree: false }))
]

interface ChatInputProps {
  onSubmit?: (msg: any) => void;
}

export function ChatInput({ onSubmit }: ChatInputProps = {}) {
  const {
    currentConversationId,
    currentConversation,
    addMessage,
    updateMessageContent,
    apiKey,
    agentRouterApiKey,
    isStreaming,
    setIsStreaming,
    personas,
    stmModules,
    noLogMode,
    autoTuneEnabled,
    autoTuneStrategy,
    autoTuneOverrides,
    autoTuneLastResult,
    setAutoTuneLastResult,
    feedbackState,
    memories,
    memoriesEnabled,
    parseltongueConfig,
    customSystemPrompt,
    useCustomSystemPrompt,
    liquidResponseEnabled,
    liquidMinDelta,
    incrementPromptsTried,
    ultraplinianEnabled,
    ultraplinianTier,
    ultraplinianApiUrl,
    ultraplinianApiKey,
    datasetGenerationEnabled,
    createNewConversation,
    defaultModel,
    currentPersona,
    consortiumEnabled,
    consortiumTier,
    consortiumPhase,
    setConsortiumPhase,
    setConsortiumProgress,
    resetConsortium,
    initThinking,
    addThinkingLog,
    updateThinkingModel,
    setThinkingModels,
    setThinkingLeader,
    finishThinking,
    resetThinking,
    globalInput,
    setGlobalInput,
    autoSubmitPending,
    setAutoSubmitPending,
    updateConversationModel,
    setDefaultModel,
    godModeEnabled,
  } = useStore()

  const [showTuneDetails, setShowTuneDetails] = useState(false)
  const [showModelSelector, setShowModelSelector] = useState(false)
  const [parseltonguePreview, setParseltonguePreview] = useState<{
    triggersFound: string[]
    transformed: boolean
  } | null>(null)

  const [attachments, setAttachments] = useState<Attachment[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    for (const file of files) {
      const reader = new FileReader()
      reader.onload = (loadEvent) => {
        const base64 = loadEvent.target?.result as string
        const newAttachment: Attachment = {
          id: Math.random().toString(36).substring(7),
          type: file.type.startsWith('image/') ? 'image' : 'file',
          mimeType: file.type,
          name: file.name,
          url: base64
        }
        setAttachments(prev => [...prev, newAttachment])
      }
      reader.readAsDataURL(file)
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [globalInput])

  const [livePreview, setLivePreview] = useState<AutoTuneResult | null>(null)
  useEffect(() => {
    if (!autoTuneEnabled || !globalInput.trim()) {
      setLivePreview(null)
      return
    }
    const timer = setTimeout(() => {
      const history = (currentConversation?.messages || []).map((m: Message) => ({
        role: m.role,
        content: m.content
      }))
      const result = computeAutoTuneParams({
        strategy: autoTuneStrategy,
        message: globalInput.trim(),
        conversationHistory: history,
        overrides: autoTuneOverrides,
        learnedProfiles: feedbackState.learnedProfiles
      })
      setLivePreview(result)
    }, 300)
    return () => clearTimeout(timer)
  }, [globalInput, autoTuneEnabled, autoTuneStrategy, autoTuneOverrides, currentConversation, personas, feedbackState])

  useEffect(() => {
    if (!parseltongueConfig.enabled || !globalInput.trim()) {
      setParseltonguePreview(null)
      return
    }
    const timer = setTimeout(() => {
      const triggers = detectTriggers(globalInput.trim(), parseltongueConfig.customTriggers)
      if (triggers.length > 0) {
        setParseltonguePreview({ triggersFound: triggers, transformed: true })
      } else {
        setParseltonguePreview(null)
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [globalInput, parseltongueConfig])

  useEffect(() => {
    if (autoSubmitPending && globalInput.trim() && !isStreaming) {
      setAutoSubmitPending(false)
      handleSubmit()
    }
  }, [autoSubmitPending, globalInput, isStreaming, setAutoSubmitPending])

  const proxyMode = !apiKey && !!ultraplinianApiUrl && !!ultraplinianApiKey

  const handleSubmit = async () => {
    if (!globalInput.trim() || isStreaming) return
    if (!apiKey && !proxyMode) return

    let convId = currentConversationId
    if (!convId) {
      convId = createNewConversation(defaultModel, currentPersona?.id || personas[0]?.id || DEFAULT_PERSONA.id)
    }

    const originalMessage = globalInput.trim()
    setGlobalInput('')
    setIsStreaming(true)
    incrementPromptsTried()

    if (onSubmit) onSubmit(originalMessage)

    const parseltongueResult = applyParseltongue(originalMessage, parseltongueConfig)
    const userMessage = parseltongueResult.transformedText

    addMessage(convId, {
      role: 'user',
      content: originalMessage,
      attachments: attachments.length > 0 ? [...attachments] : undefined
    })

    const msgAttachments = [...attachments]
    setAttachments([])

    const persona = currentPersona || personas[0] || DEFAULT_PERSONA
    const model = currentConversation?.model || defaultModel

    const activeMemories = memoriesEnabled ? memories.filter((m: any) => m.active) : []
    let memoryContext = ''
    if (activeMemories.length > 0) {
      memoryContext = '\n\n<user_memory>\n'
      activeMemories.forEach((m: any) => { memoryContext += `- [${m.type}] ${m.content}\n` })
      memoryContext += '</user_memory>\n'
    }

    const basePrompt = useCustomSystemPrompt ? customSystemPrompt : (persona.systemPrompt || persona.coreDirective || '')
    const systemPrompt = basePrompt + memoryContext

    const messages = [
      ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
      ...((currentConversation?.messages || []).map((m: Message) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }))),
      { role: 'user' as const, content: userMessage }
    ]

    let promptClassification: ClassificationResult = classifyPrompt(userMessage)
    const llmClassifyPromise = apiKey
      ? classifyWithLLM(userMessage, apiKey).then((result: ClassificationResult) => { promptClassification = result })
      : Promise.resolve()

    let tuneResult: AutoTuneResult | null = null
    if (autoTuneEnabled) {
      const history = (currentConversation?.messages || []).map((m: Message) => ({
        role: m.role,
        content: m.content
      }))
      tuneResult = computeAutoTuneParams({
        strategy: autoTuneStrategy,
        message: userMessage,
        conversationHistory: history,
        overrides: autoTuneOverrides,
        learnedProfiles: feedbackState.learnedProfiles
      })
      setAutoTuneLastResult(tuneResult)
    }

    const params = tuneResult?.params || { temperature: 0.7, max_tokens: 4096, top_p: 1.0 }

    let assistantMsgId = ''
    const onDelta = (delta: string) => {
      if (!assistantMsgId) {
        assistantMsgId = addMessage(convId!!, {
          role: 'assistant',
          content: delta,
          model: ultraplinianEnabled ? 'ultraplinian' : (consortiumEnabled ? 'consortium' : model),
          persona: persona.id
        })
      } else {
        const currentContent = useStore.getState().conversations.find(c => c.id === convId)?.messages.find(m => m.id === assistantMsgId)?.content || ''
        updateMessageContent(convId!!, assistantMsgId, currentContent + delta)
      }
    }

    try {
      abortControllerRef.current = new AbortController()

      if (ultraplinianEnabled && apiKey) {
        initThinking('ULTRAPLINIAN RACE ACTIVE')

        await streamUltraplinian(
          apiKey,
          messages,
          {
            onStart: (data) => {
              setThinkingModels(data.models)
              addThinkingLog(`Starting race with ${data.models.length} models`, 'step')
            },
            onLog: (msg, type) => {
              addThinkingLog(msg, type)
            },
            onModelUpdate: (id, status, score, error) => {
              updateThinkingModel(id, status, score, error)
            },
            onLeaderChange: (content, modelId, score) => {
              setThinkingLeader(modelId, score, content)
              if (!assistantMsgId) {
                assistantMsgId = addMessage(convId!!, {
                  role: 'assistant',
                  content,
                  model: modelId,
                  persona: persona.id
                })
              } else {
                updateMessageContent(convId!!, assistantMsgId, content, { model: modelId })
              }
            },
            onComplete: (content, modelId, score) => {
              const finalMessage = content || '⚠️ **ULTRA RACE FAILURE**: No models generated a valid response. Please check your API key or connection.'
              const currentThinking = useStore.getState().thinking;
              
              finishThinking(content ? `Winner: ${modelId.split('/').pop()} (${score})` : 'GAUNTLET FAILED')
              
              const thinkingData = {
                logs: [...currentThinking.logs],
                models: [...currentThinking.models],
                title: currentThinking.title
              };

              if (!assistantMsgId) {
                addMessage(convId!!, {
                  role: 'assistant',
                  content: finalMessage,
                  model: content ? modelId : 'error',
                  persona: persona.id,
                  thinking: thinkingData
                })
              } else {
                updateMessageContent(convId!!, assistantMsgId, finalMessage, { 
                  model: content ? modelId : 'error',
                  thinking: thinkingData
                })
              }
            },
            onPrefillGenerated: (prefill) => {
              // Optional: show prefill in UI
            }
          },
          {
            tier: godModeEnabled ? 'godmode' : ultraplinianTier,
            earlyStopThreshold: 85,
            signal: abortControllerRef.current.signal
          }
        )
      } else if (consortiumEnabled) {
        // Placeholder for consortium
        addMessage(convId!!, {
          role: 'assistant',
          content: 'Consortium mode is active but logic is pending migration.',
          model: 'consortium',
          persona: persona.id
        })
      } else if (apiKey) {
        await sendMessage({
          apiKey,
          agentRouterApiKey,
          messages,
          model,
          onDelta,
          signal: abortControllerRef.current.signal
        })
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        onDelta(' _[Response stopped by user]_')
      } else {
        console.error('Error sending message:', error)
        onDelta(`\n\n**Error:** ${error.message || 'Failed to get response.'}`)
      }
    } finally {
      setIsStreaming(false)
      abortControllerRef.current = null
    }
  }

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    finishThinking('STOPPED BY USER')
    setIsStreaming(false)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const displayResult = livePreview || autoTuneLastResult
  const activeMemoryCount = memoriesEnabled ? memories.filter((m: any) => m.active).length : 0

  return (
    <div className="border-y-2 border-t-2 border-b-2 border-x-2 border-theme-primary bg-theme-dim/50 p-4">
      <div className="max-w-4xl mx-auto">
        {autoTuneEnabled && displayResult && showTuneDetails && (
          <div className="mb-3 p-3 bg-theme-bg border border-theme-primary rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold theme-primary font-mono">
                <SlidersHorizontal className="w-3 h-3" />
                AUTOTUNE {autoTuneStrategy === 'adaptive'
                  ? `// ${getContextLabel(displayResult.detectedContext)} (${Math.round(displayResult.confidence * 100)}%)`
                  : `// ${getStrategyLabel(autoTuneStrategy)}`
                }
              </div>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {(Object.entries(displayResult.params) as [string, number][]).map(([key, value]) => (
                <div key={key} className="text-center p-1.5 rounded border border-theme-primary/30 bg-theme-dim">
                  <div className="text-[10px] theme-secondary font-mono">{PARAM_META[key]?.short || key}</div>
                  <div className="text-sm font-bold theme-primary font-mono">{typeof value === 'number' ? value.toFixed(2) : value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {datasetGenerationEnabled && (
          <div className="mb-2 flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-xs text-yellow-500">
            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
            <span className="font-semibold uppercase tracking-wider">Dataset Mode</span>
            <span className="opacity-70">— your prompts are being collected for research.</span>
          </div>
        )}

        {/* ── Model Selector ── */}
        <div className="relative mb-3">
          <button
            onClick={() => setShowModelSelector(!showModelSelector)}
            className="flex items-center gap-2 group px-3 py-1.5 rounded-lg bg-theme-dim/40 border border-theme-primary/20 hover:border-theme-primary/50 transition-all text-[11px] font-bold tracking-tight theme-secondary"
          >
            <Brain className="w-3.5 h-3.5 text-theme-primary group-hover:scale-110 transition-transform" />
            <span className="opacity-60">MODEL:</span>
            <span className="text-theme-primary">
              {ALL_MODELS.find((m: any) => m.id === (currentConversation?.model || defaultModel))?.name || (currentConversation?.model || defaultModel)}
            </span>
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showModelSelector ? 'rotate-180' : ''}`} />
          </button>

          {showModelSelector && (
            <div className="absolute bottom-full left-0 mb-2 w-[320px] bg-theme-dim border border-theme-primary/30 rounded-xl shadow-2xl backdrop-blur-xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="p-2 border-b border-theme-primary/10 flex justify-between items-center">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 px-2 py-1">Select Model ({ALL_MODELS.length})</p>
                <div className="flex gap-2 mr-2">
                  <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-theme-primary" /><span className="text-[7px]">OR</span></div>
                  <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#ffcc00]" /><span className="text-[7px]">AR</span></div>
                </div>
              </div>
              <div className="max-h-[400px] overflow-y-auto p-1 custom-scrollbar">
                {ALL_MODELS.map((m: any) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      if (currentConversationId) {
                        updateConversationModel(currentConversationId, m.id)
                      }
                      setDefaultModel(m.id)
                      setShowModelSelector(false)
                    }}
                    className={`w-full flex items-start gap-3 p-2.5 rounded-lg transition-all text-left group
                      ${(currentConversation?.model || defaultModel) === m.id
                        ? 'bg-theme-primary/10 border border-theme-primary/20'
                        : 'hover:bg-theme-primary/5 border border-transparent'
                      }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${m.provider === 'AgentRouter' ? 'bg-[#ffcc00] shadow-[0_0_8px_#ffcc00]' : 'bg-theme-primary shadow-[0_0_8px_var(--primary-glow)]'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 truncate">
                          <span className={`text-[11px] font-bold truncate ${m.provider === 'AgentRouter' ? 'text-[#ffcc00]' : 'theme-primary'}`}>{m.name}</span>
                          {m.isFree && (
                            <span className="px-1 py-0.5 rounded-[4px] bg-green-500/20 text-green-400 text-[7px] font-black uppercase tracking-tighter border border-green-500/30">FREE</span>
                          )}
                        </div>
                        <span className="text-[8px] font-black opacity-30 shrink-0">{m.provider}</span>
                      </div>
                      <p className="text-[9px] theme-secondary opacity-40 truncate mt-0.5">{m.id}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Attachments Preview ── */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {attachments.map((file) => (
              <div key={file.id} className="relative group">
                <div className="w-20 h-20 rounded-xl overflow-hidden border border-theme-primary/30 bg-theme-dim flex items-center justify-center group-hover:border-theme-primary/60 transition-all shadow-lg">
                  {file.type === 'image' ? (
                    <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-1 p-2">
                      <FileText className="w-8 h-8 text-theme-primary/60" />
                      <span className="text-[8px] font-bold truncate w-14 text-center opacity-60">{file.name}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeAttachment(file.id)}
                  className="absolute -top-2 -right-2 bg-theme-bg border border-theme-primary/40 rounded-full p-0.5 text-red-500 hover:scale-110 transition-transform shadow-xl"
                >
                  <XCircle className="w-4 h-4 fill-theme-bg" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-1.5 w-full">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt"
          />
          <button
            type="button"
            className="p-3 text-theme-secondary hover:text-theme-primary hover:bg-theme-primary/10 transition-all rounded-xl border border-theme-primary/20 bg-theme-dim/50 group"
            onClick={() => fileInputRef.current?.click()}
            title="Attach files (Images, Documents)"
          >
            <Paperclip className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>

          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={globalInput}
              onChange={(e) => setGlobalInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={apiKey ? "Message..." : "Set API key in Settings"}
              disabled={!apiKey || isStreaming}
              rows={1}
              className="w-full px-4 py-3 bg-theme-bg/60 border border-theme-primary/30 rounded-xl resize-none focus:outline-none focus:border-theme-primary/80 focus:bg-theme-bg/80 placeholder:theme-secondary disabled:opacity-50 transition-all duration-200 font-mono text-sm leading-relaxed"
              style={{ minHeight: '48px', maxHeight: '200px' }}
            />
          </div>

          {isStreaming ? (
            <button
              onClick={handleStop}
              className="w-[54px] h-[54px] flex items-center justify-center bg-red-500/20 border border-red-500 rounded-xl hover:bg-red-500/30 transition-all flex-shrink-0"
            >
              <StopCircle className="w-6 h-6 text-red-500" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!globalInput.trim() || !apiKey}
              className="w-[54px] h-[54px] flex items-center justify-center bg-theme-primary text-black rounded-xl hover:opacity-90 hover:scale-105 transition-all disabled:opacity-50 disabled:grayscale"
            >
              <span className="text-3xl font-black leading-none group-hover:translate-x-1 transition-transform">→</span>
            </button>
          )}
        </div>

        <div className="flex items-center justify-between mt-2 text-[10px] uppercase font-bold tracking-widest text-theme-secondary opacity-60">
          <div className="flex items-center gap-4">
            {autoTuneEnabled && (
              <button
                onClick={() => setShowTuneDetails(!showTuneDetails)}
                className={`flex items-center gap-1 hover:text-theme-primary transition-colors ${showTuneDetails ? 'text-theme-primary' : ''}`}
              >
                <SlidersHorizontal className="w-2.5 h-2.5" />
                AutoTune
              </button>
            )}
            {noLogMode && <span>No-Log</span>}
            {activeMemoryCount > 0 && <span>{activeMemoryCount} Memories</span>}
            {parseltongueConfig.enabled && <span>Parseltongue</span>}
            {ultraplinianEnabled && <span className="text-orange-400">Ultraplinian</span>}
          </div>
          {isStreaming && (
            <span className="flex items-center gap-1 animate-pulse">
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
              Thinking...
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
