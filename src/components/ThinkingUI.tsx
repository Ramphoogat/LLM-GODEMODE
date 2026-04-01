'use client'

import React, { useEffect, useRef } from 'react'
import { useStore } from '@/store'
import { ThinkingLog, ThinkingModelStatus } from '@/types'
import { motion, AnimatePresence } from 'framer-motion'

export const ThinkingUI: React.FC = () => {
  const { thinking } = useStore()
  const [isMinimized, setIsMinimized] = React.useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [thinking.logs])

  if (!thinking.active && thinking.logs.length === 0) return null

  return (
    <AnimatePresence>
      {isMinimized ? (
        <motion.div
          key="minimized"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          onClick={() => setIsMinimized(false)}
          className="fixed bottom-24 right-8 w-14 h-14 bg-theme-bg/90 backdrop-blur-md border-2 border-theme-primary rounded-full shadow-[0_0_20px_var(--primary)] z-50 flex items-center justify-center cursor-pointer group hover:scale-110 transition-transform"
        >
          <div className="absolute inset-0 rounded-full border-2 border-theme-primary animate-ping opacity-20" />
          <div className="text-theme-primary flex flex-col items-center">
            <span className="text-[8px] font-black uppercase tracking-tighter mb-0.5">Ultra</span>
            <div className="w-2 h-2 rounded-full bg-theme-primary animate-pulse shadow-[0_0_8px_var(--theme-primary)]" />
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="expanded"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-24 right-8 w-96 max-w-[calc(100vw-2rem)] bg-theme-bg-secondary/90 backdrop-blur-md border border-theme-primary/30 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col font-mono"
          style={{ boxShadow: '0 0 30px var(--primary)' }}
        >
          {/* Header */}
          <div className="bg-theme-primary/10 px-4 py-2 border-b border-theme-primary/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-theme-primary animate-pulse shadow-[0_0_10px_var(--theme-primary)]" />
              <span className="text-theme-primary text-xs font-bold tracking-widest uppercase">
                {thinking.title || 'THINKING...'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {thinking.active && (
                <div className="flex gap-1">
                  <span className="w-1 h-3 bg-theme-primary/40 animate-[bounce_1s_infinite_100ms]" />
                  <span className="w-1 h-3 bg-theme-primary/40 animate-[bounce_1s_infinite_300ms]" />
                  <span className="w-1 h-3 bg-theme-primary/40 animate-[bounce_1s_infinite_500ms]" />
                </div>
              )}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMinimized(true);
                }}
                className="text-theme-primary hover:text-white transition-colors p-1"
                title="Minimize"
              >
                <span className="text-lg font-bold">−</span>
              </button>
            </div>
          </div>

          {/* Model Grid */}
          {thinking.models.length > 0 && (
            <div className="p-3 grid grid-cols-4 gap-2 bg-theme-bg/40 border-b border-theme-primary/10">
              {thinking.models.map((model) => (
                <ModelStatusBadge key={model.id} model={model} />
              ))}
            </div>
          )}

          {/* Leader Card */}
          {thinking.currentLeader && (
            <div className="px-4 py-3 bg-theme-primary/5 border-b border-theme-primary/20">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-theme-primary/60 uppercase">Current Leader</span>
                <span className="text-[10px] font-bold text-yellow-500 ring-1 ring-yellow-500/30 px-1 rounded">
                  SCORE: {thinking.currentLeader.score}
                </span>
              </div>
              <div className="text-theme-primary text-xs font-bold truncate">
                {thinking.currentLeader.model.split('/').pop()}
              </div>
              <div className="mt-2 text-[10px] text-theme-primary/40 line-clamp-2 h-6 italic">
                "{thinking.currentLeader.content.slice(0, 100)}..."
              </div>
            </div>
          )}

          {/* Logs */}
          <div 
            ref={scrollRef}
            className="h-48 overflow-y-auto p-4 flex flex-col gap-1 text-[10px] scrollbar-thin scrollbar-thumb-theme-primary/20"
          >
            {thinking.logs.map((log) => (
              <div key={log.id} className="flex gap-2">
                <span className="text-theme-text-dim/40 whitespace-nowrap">
                  [{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
                </span>
                <span className={`
                  ${log.type === 'success' ? 'text-theme-primary' : ''}
                  ${log.type === 'fail' ? 'text-theme-danger' : ''}
                  ${log.type === 'warn' ? 'text-yellow-500' : ''}
                  ${log.type === 'step' ? 'text-blue-500 font-bold' : ''}
                  ${log.type === 'info' ? 'text-theme-text-dim' : ''}
                `}>
                  {log.message}
                </span>
              </div>
            ))}
            {thinking.active && (
              <div className="flex gap-2 animate-pulse">
                <span className="text-theme-text-dim/40">[_:_:_]</span>
                <span className="text-theme-primary">CONTINUING_EXECUTION...</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-theme-bg/60 px-4 py-2 border-t border-theme-primary/10 flex items-center justify-between text-[9px] text-theme-text-dim/50 uppercase tracking-tighter">
            <span>{thinking.active ? 'System Active' : 'Sequence Complete'}</span>
            <span>G0DM0D3 OS v3.5.0</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const ModelStatusBadge: React.FC<{ model: ThinkingModelStatus }> = ({ model }) => {
  const getStatusColor = () => {
    switch (model.status) {
      case 'success': return 'var(--theme-primary)'
      case 'fail': return 'var(--theme-danger)'
      case 'running': return 'var(--ultra-1)'
      default: return 'var(--theme-border)'
    }
  }

  return (
    <div 
      className="flex flex-col items-center gap-1 group relative cursor-help"
      title={`${model.codename}: ${model.status}${model.score ? ` (Score: ${model.score})` : ''}`}
    >
      <div 
        className={`w-full h-1 rounded-full transition-all duration-300 ${model.status === 'running' ? 'animate-pulse' : ''}`}
        style={{ 
          backgroundColor: getStatusColor(),
          boxShadow: model.status === 'success' ? `0 0 8px ${model.color || 'var(--theme-primary)'}` : 'none'
        }}
      />
      <span className="text-[8px] text-theme-text-dim/40 truncate w-full text-center group-hover:text-theme-text transition-colors">
        {model.codename.split(' ').pop()}
      </span>
      {model.score !== null && model.score !== undefined && (
        <span className="absolute -top-4 text-[8px] text-theme-primary font-bold opacity-0 group-hover:opacity-100 transition-opacity bg-black px-1 rounded border border-theme-primary/20">
          {model.score}
        </span>
      )}
    </div>
  )
}
