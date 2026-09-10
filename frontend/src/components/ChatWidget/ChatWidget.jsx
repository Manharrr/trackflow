import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { Sparkles, X, Send, RotateCcw, AlertCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { sendChatMessage } from '../../services/chatApi'

/**
 * Helper to build Q&A history pairs for the FastAPI backend.
 * Extracts the latest 5 completed exchanges (user question + assistant answer).
 * Excludes welcome messages, errors, and any current in-progress question.
 */
function buildChatHistory(messages) {
  const history = []
  const chatMessages = messages.filter(
    (m) => (m.role === 'user' || m.role === 'assistant') && !m.isError && !m.isWelcome
  )

  for (let i = 0; i < chatMessages.length - 1; i++) {
    const current = chatMessages[i]
    const next = chatMessages[i + 1]
    if (current.role === 'user' && next.role === 'assistant') {
      history.push({
        question: current.content,
        answer: next.content,
      })
      i++ // Skip next since it is paired
    }
  }

  return history.slice(-5)
}

export default function ChatWidget() {
  const { user } = useAuth()
  const tenantId = user?.tenant?.id || null
  const location = useLocation()
  const isPublic = location.pathname === '/'

  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const abortControllerRef = useRef(null)

  // Auto-scroll scroll container to bottom on message change
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
      // Focus textarea when opened
      if (textareaRef.current) {
        textareaRef.current.focus()
      }
    }
  }, [messages, isOpen, scrollToBottom])

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Update welcome message and clear state when route changes
  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: isPublic
          ? "Hi! I'm TrackFlow AI. Ask me about the TrackFlow platform's roles, duties, and onboarding workflows!"
          : "Hi! I'm TrackFlow AI. Ask me anything about the TrackFlow platform.",
        isWelcome: true,
      },
    ])
    setInput('')
    setIsLoading(false)
  }, [location.pathname, isPublic])

  // Handles text area auto-growth based on scroll height
  const handleInputChanges = (e) => {
    setInput(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 96)}px`
    }
  }

  // Resets local widget states and restores initial greeting
  const handleClearChat = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: isPublic
          ? "Hi! I'm TrackFlow AI. Ask me about the TrackFlow platform's roles, duties, and onboarding workflows!"
          : "Hi! I'm TrackFlow AI. Ask me anything about the TrackFlow platform.",
        isWelcome: true,
      },
    ])
    setInput('')
    setIsLoading(false)
  }

  // Core API interaction logic
  const executeChatMessage = async (questionContent, currentHistory) => {
    setIsLoading(true)

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const response = await sendChatMessage({
        question: questionContent,
        tenantId,
        history: currentHistory,
        isPublic,
        signal: controller.signal,
      })

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: response.answer,
        },
      ])
    } catch (err) {
      if (err.type === 'CANCEL') return

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: err.message || 'Something went wrong, please try again.',
          isError: true,
          failedQuestion: questionContent,
        },
      ])
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  // User trigger to send new message
  const handleSendMessage = (e) => {
    if (e) e.preventDefault()
    if (!input.trim() || isLoading) return

    const userQuestion = input.trim()
    const currentHistory = buildChatHistory(messages)

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: userQuestion,
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    executeChatMessage(userQuestion, currentHistory)
  }

  // Re-submits a failed question
  const handleRetry = (failedQuestion, errorMsgId) => {
    // Remove the error bubble from UI list
    setMessages((prev) => prev.filter((m) => m.id !== errorMsgId))
    const currentHistory = buildChatHistory(messages.filter((m) => m.id !== errorMsgId))
    executeChatMessage(failedQuestion, currentHistory)
  }

  // Custom key handlers for Textarea (Enter = Send, Shift+Enter = Newline)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="font-body text-charcoal">
      {/* 1. FLOATING LAUNCHER BUTTON */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
          aria-label="Open TrackFlow AI"
        >
          <Sparkles className="w-6 h-6 animate-pulse" />
        </button>
      )}

      {/* 2. CHAT PANEL */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-40 w-[360px] h-[500px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-48px)] bg-white rounded-3xl border border-border-light shadow-2xl flex flex-col overflow-hidden transition-all duration-300 animate-fade-in origin-bottom-right">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-primary-dark text-white p-4.5 flex items-center justify-between border-b border-border-light relative overflow-hidden shadow-sm">
            <div className="flex items-center gap-2.5 z-10">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shadow-sm">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-black tracking-tight text-white leading-tight">TrackFlow AI</h3>
                <p className="text-[9px] text-teal-50 font-bold uppercase tracking-wider leading-none mt-0.5">
                  AI-powered assistant
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1 z-10">
              <button
                onClick={handleClearChat}
                className="p-1.5 rounded-xl hover:bg-white/10 text-white transition-colors cursor-pointer"
                title="Clear conversation"
                aria-label="Clear conversation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-white transition-colors cursor-pointer"
                aria-label="Close TrackFlow AI"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-bg-tint/40 flex flex-col">
            {messages.map((msg) => {
              const isUser = msg.role === 'user'
              
              if (msg.isError) {
                return (
                  <div
                    key={msg.id}
                    className="self-start max-w-[85%] rounded-2xl rounded-tl-none p-3.5 bg-red-50/70 border border-red-100/50 text-red-750 text-xs shadow-sm flex items-start gap-2.5"
                  >
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div className="space-y-2 text-left">
                      <p className="font-medium leading-relaxed">{msg.content}</p>
                      <button
                        onClick={() => handleRetry(msg.failedQuestion, msg.id)}
                        className="flex items-center gap-1 text-[10px] font-black text-red-750 hover:text-red-800 transition-colors bg-white px-2.5 py-1 rounded-lg border border-red-200 cursor-pointer shadow-sm w-fit"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                )
              }

              return (
                <div
                  key={msg.id}
                  className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-sm whitespace-pre-wrap break-words ${
                    isUser
                      ? 'self-end bg-primary text-white font-semibold rounded-tr-none text-left'
                      : 'self-start bg-white border border-border-light text-charcoal font-medium rounded-tl-none text-left'
                  }`}
                >
                  {msg.content}
                </div>
              )
            })}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="self-start flex items-center gap-1 bg-white border border-border-light py-3.5 px-4.5 rounded-2xl rounded-tl-none max-w-[80px] shadow-sm">
                <span className="w-1.5 h-1.5 bg-primary/70 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1.5 h-1.5 bg-primary/70 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1.5 h-1.5 bg-primary/70 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Panel */}
          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-border-light flex items-center gap-2">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={handleInputChanges}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1 resize-none bg-slate-50 focus:bg-white hover:bg-slate-100/30 border border-border-light focus:border-primary focus:outline-none rounded-xl py-2 px-3.5 text-xs text-charcoal max-h-24 min-h-[38px] placeholder-slate-400 transition-all duration-200 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="w-[38px] h-[38px] rounded-xl bg-primary hover:bg-primary-dark text-white disabled:bg-slate-50 disabled:text-slate-350 transition-all duration-200 flex items-center justify-center cursor-pointer shadow-sm hover:shadow active:scale-95 shrink-0"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
