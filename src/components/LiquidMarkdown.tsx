'use client'

import React, { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import remarkGfm from 'remark-gfm'
import { motion, AnimatePresence } from 'framer-motion'

interface LiquidMarkdownProps {
  content: string
  enabled: boolean
  isStreaming: boolean
}

export const LiquidMarkdown: React.FC<LiquidMarkdownProps> = ({ content, enabled, isStreaming }) => {
  const [displayedContent, setDisplayedContent] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!enabled) {
      setDisplayedContent(content)
      return
    }

    // When new content arrives (streaming)
    if (isStreaming) {
      // If we are far behind, catch up faster
      const diff = content.length - displayedContent.length
      if (diff > 0) {
        const speed = diff > 50 ? 5 : 20 // Adjust speed based on distance
        
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => {
          // Add one more character or word
          // For "word by word" feel, let's look for the next space
          const nextSpace = content.indexOf(' ', displayedContent.length + 1)
          const nextEnd = nextSpace === -1 ? content.length : nextSpace
          
          // But don't take too long chunks
          const nextTarget = Math.min(nextEnd, displayedContent.length + 10)
          setDisplayedContent(content.substring(0, nextTarget))
        }, speed)
      }
    } else {
      // If generation finished, make sure we finish the typing
      setDisplayedContent(content)
    }

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [content, enabled, isStreaming, displayedContent])

  return (
    <ReactMarkdown 
      remarkPlugins={[remarkGfm]}
      components={{
        code({ node, inline, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || '')
          return !inline && match ? (
            <SyntaxHighlighter
              style={atomDark as any}
              language={match[1]}
              PreTag="div"
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          )
        },
        table: ({ children }: any) => (
          <div className="overflow-x-auto my-4 w-full border border-theme-primary/20 rounded-xl bg-theme-dim/30">
            <table className="min-w-full divide-y divide-theme-primary/10">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }: any) => <thead className="bg-theme-primary/5">{children}</thead>,
        th: ({ children }: any) => <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-theme-primary">{children}</th>,
        td: ({ children }: any) => <td className="px-4 py-3 text-sm text-theme-secondary/80 border-t border-theme-primary/5">{children}</td>,
        h1: ({ children }: any) => <h1 className="text-xl font-bold mb-4 mt-2 text-theme-primary">{children}</h1>,
        h2: ({ children }: any) => <h2 className="text-lg font-bold mb-3 mt-4 text-theme-primary/90">{children}</h2>,
        ul: ({ children }: any) => <ul className="list-disc list-inside space-y-1 mb-4">{children}</ul>,
        ol: ({ children }: any) => <ol className="list-decimal list-inside space-y-1 mb-4">{children}</ol>,
        li: ({ children }: any) => <li className="text-sm leading-relaxed">{children}</li>,
        img: ({ src, alt }: any) => (
          <div className="my-4 rounded-xl overflow-hidden border border-theme-primary/20 shadow-lg hover:scale-[1.02] transition-transform duration-300 bg-theme-dim/20">
            <img src={src} alt={alt || 'AI Generated Image'} className="w-full h-auto object-cover" />
            <div className="p-2 bg-theme-bg/60 backdrop-blur-sm text-[10px] text-theme-text-dim/60 italic text-center border-t border-theme-primary/10">
              {alt || 'AI GENERATED VISUAL'}
            </div>
          </div>
        ),
      }}
    >
      {displayedContent}
    </ReactMarkdown>
  )
}
