'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { useStore, DEFAULT_PERSONA } from '@/store'
import { sendMessage, sendMessageViaProxy, streamUltraplinian, streamConsortium } from '@/lib/openrouter'
import { recordChatEvent } from '@/lib/telemetry'
import { classifyPrompt, ClassificationResult } from '@/lib/classify'
import { classifyWithLLM } from '@/lib/classify-llm'
import { computeAutoTuneParams, getContextLabel, getStrategyLabel, PARAM_META, AutoTuneResult } from '@/lib/autotune'
import { applyParseltongue, detectTriggers } from '@/lib/parseltongue'
import { Send, Loader2, StopCircle, SlidersHorizontal, AlertTriangle } from 'lucide-react'
import { Message, Persona, STMModule } from '../types'
import { input } from 'framer-motion/client'

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
  } = useStore()

  const [showTuneDetails, setShowTuneDetails] = useState(false)
  const [parseltonguePreview, setParseltonguePreview] = useState<{
    triggersFound: string[]
    transformed: boolean
  } | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

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

    addMessage(convId, { role: 'user', content: originalMessage })

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
              finishThinking(content ? `Winner: ${modelId.split('/').pop()} (${score})` : 'GAUNTLET FAILED')
              if (!assistantMsgId) {
                addMessage(convId!!, {
                  role: 'assistant',
                  content: finalMessage,
                  model: content ? modelId : 'error',
                  persona: persona.id
                })
              } else {
                updateMessageContent(convId!!, assistantMsgId, finalMessage, { model: content ? modelId : 'error' })
              }
            },
            onPrefillGenerated: (prefill) => {
              // Optional: show prefill in UI
            }
          },
          {
            tier: ultraplinianTier,
            earlyStopThreshold: 85
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
      } else {
        await sendMessage({
          apiKey,
          messages,
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
    if (abortControllerRef.current) abortControllerRef.current.abort()
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
    <div className="border-t border-theme-primary bg-theme-dim/50 p-4">
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

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-3 text-theme-secondary hover:text-theme-primary transition-all rounded-xl border border-theme-primary/20 bg-theme-dim/50"
            onClick={() => { }}
            title="Attach image"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5-11 11" />
            </svg>
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
              className="w-[48px] h-[48px] flex items-center justify-center bg-red-500/20 border border-red-500 rounded-xl hover:bg-red-500/30 transition-all"
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
