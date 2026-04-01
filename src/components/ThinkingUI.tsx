'use client'

import React, { useEffect, useRef } from 'react'
import { useStore } from '@/store'
import { ThinkingLog, ThinkingModelStatus } from '@/types'
import { motion, AnimatePresence } from 'framer-motion'

export const ThinkingUI: React.FC = () => {
  const { thinking } = useStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [thinking.logs])

  if (!thinking.active && thinking.logs.length === 0) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-24 right-8 w-96 max-w-[calc(100vw-2rem)] bg-[#0a0a0a]/90 backdrop-blur-md border border-[#00ff41]/30 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col font-mono"
        style={{ boxShadow: '0 0 30px rgba(0, 255, 65, 0.15)' }}
      >
        {/* Header */}
        <div className="bg-[#00ff41]/10 px-4 py-2 border-b border-[#00ff41]/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#00ff41] animate-pulse" />
            <span className="text-[#00ff41] text-xs font-bold tracking-widest uppercase">
              {thinking.title || 'THINKING...'}
            </span>
          </div>
          {thinking.active && (
            <div className="flex gap-1">
              <span className="w-1 h-3 bg-[#00ff41]/40 animate-[bounce_1s_infinite_100ms]" />
              <span className="w-1 h-3 bg-[#00ff41]/40 animate-[bounce_1s_infinite_300ms]" />
              <span className="w-1 h-3 bg-[#00ff41]/40 animate-[bounce_1s_infinite_500ms]" />
            </div>
          )}
        </div>

        {/* Model Grid */}
        {thinking.models.length > 0 && (
          <div className="p-3 grid grid-cols-4 gap-2 bg-black/40 border-b border-[#00ff41]/10">
            {thinking.models.map((model) => (
              <ModelStatusBadge key={model.id} model={model} />
            ))}
          </div>
        )}

        {/* Leader Card */}
        {thinking.currentLeader && (
          <div className="px-4 py-3 bg-[#00ff41]/5 border-b border-[#00ff41]/20">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[#00ff41]/60 uppercase">Current Leader</span>
              <span className="text-[10px] font-bold text-[#ffd700] ring-1 ring-[#ffd700]/30 px-1 rounded">
                SCORE: {thinking.currentLeader.score}
              </span>
            </div>
            <div className="text-[#00ff41] text-xs font-bold truncate">
              {thinking.currentLeader.model.split('/').pop()}
            </div>
            <div className="mt-2 text-[10px] text-[#00ff41]/40 line-clamp-2 h-6 italic">
              "{thinking.currentLeader.content.slice(0, 100)}..."
            </div>
          </div>
        )}

        {/* Logs */}
        <div 
          ref={scrollRef}
          className="h-48 overflow-y-auto p-4 flex flex-col gap-1 text-[10px] scrollbar-thin scrollbar-thumb-[#00ff41]/20"
        >
          {thinking.logs.map((log) => (
            <div key={log.id} className="flex gap-2">
              <span className="text-white/20 whitespace-nowrap">
                [{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
              </span>
              <span className={`
                ${log.type === 'success' ? 'text-[#00ff41]' : ''}
                ${log.type === 'fail' ? 'text-[#ff4141]' : ''}
                ${log.type === 'warn' ? 'text-[#ffcc00]' : ''}
                ${log.type === 'step' ? 'text-[#00d4ff] font-bold' : ''}
                ${log.type === 'info' ? 'text-white/60' : ''}
              `}>
                {log.message}
              </span>
            </div>
          ))}
          {thinking.active && (
            <div className="flex gap-2 animate-pulse">
              <span className="text-white/20">[_:_:_]</span>
              <span className="text-[#00ff41]">CONTINUING_EXECUTION...</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-black/60 px-4 py-2 border-t border-[#00ff41]/10 flex items-center justify-between text-[9px] text-white/30 uppercase tracking-tighter">
          <span>{thinking.active ? 'System Active' : 'Sequence Complete'}</span>
          <span>G0DM0D3 OS v3.5.0</span>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

const ModelStatusBadge: React.FC<{ model: ThinkingModelStatus }> = ({ model }) => {
  const getStatusColor = () => {
    switch (model.status) {
      case 'success': return '#00ff41'
      case 'fail': return '#ff4141'
      case 'running': return '#00d4ff'
      default: return 'rgba(255,255,255,0.2)'
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
          boxShadow: model.status === 'success' ? `0 0 8px ${model.color || '#00ff41'}` : 'none'
        }}
      />
      <span className="text-[8px] text-white/40 truncate w-full text-center group-hover:text-white transition-colors">
        {model.codename.split(' ').pop()}
      </span>
      {model.score !== null && model.score !== undefined && (
        <span className="absolute -top-4 text-[8px] text-[#00ff41] font-bold opacity-0 group-hover:opacity-100 transition-opacity bg-black px-1 rounded border border-[#00ff41]/20">
          {model.score}
        </span>
      )}
    </div>
  )
}
