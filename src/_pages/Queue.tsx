import React, { useState, useEffect, useRef } from "react"
import { useQuery } from "react-query"
import ScreenshotQueue from "../components/Queue/ScreenshotQueue"
import {
  Toast,
  ToastTitle,
  ToastDescription,
  ToastVariant,
  ToastMessage
} from "../components/ui/toast"
import QueueCommands from "../components/Queue/QueueCommands"
import ModelSelector from "../components/ui/ModelSelector"
import { renderMarkdown } from "../lib/utils"

interface QueueProps {
  setView: React.Dispatch<React.SetStateAction<"queue" | "solutions" | "debug">>
  theme?: "light" | "dark"
}

const Queue: React.FC<QueueProps> = ({ setView, theme = "dark" }) => {
  const [toastOpen, setToastOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<ToastMessage>({
    title: "",
    description: "",
    variant: "neutral"
  })

  const [isTooltipVisible, setIsTooltipVisible] = useState(false)
  const [tooltipHeight, setTooltipHeight] = useState(0)
  const contentRef = useRef<HTMLDivElement>(null)

  const [chatInput, setChatInput] = useState("")
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "gemini", text: string, images?: string[] }[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const chatInputRef = useRef<HTMLInputElement>(null)
  const [attachedScreenshots, setAttachedScreenshots] = useState<{ path: string; preview: string }[]>([])

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [currentModel, setCurrentModel] = useState<{ provider: string; model: string }>({ provider: "gemini", model: "auto" })
  const [audioResult, setAudioResult] = useState<string | null>(null)
  const [mode, setMode] = useState<'code' | 'general'>('code')

  const barRef = useRef<HTMLDivElement>(null)

  const { data: screenshots = [], refetch } = useQuery<Array<{ path: string; preview: string }>, Error>(
    ["screenshots"],
    async () => {
      try {
        const existing = await window.electronAPI.getScreenshots()
        return existing
      } catch (error) {
        console.error("Error loading screenshots:", error)
        showToast("Error", "Failed to load existing screenshots", "error")
        return []
      }
    },
    {
      staleTime: Infinity,
      cacheTime: Infinity,
      refetchOnWindowFocus: true,
      refetchOnMount: true
    }
  )

  const showToast = (
    title: string,
    description: string,
    variant: ToastVariant
  ) => {
    setToastMessage({ title, description, variant })
    setToastOpen(true)
  }

  const handleDeleteScreenshot = async (index: number) => {
    const screenshotToDelete = screenshots[index]

    try {
      const response = await window.electronAPI.deleteScreenshot(
        screenshotToDelete.path
      )

      if (response.success) {
        refetch()
      } else {
        console.error("Failed to delete screenshot:", response.error)
        showToast("Error", "Failed to delete the screenshot file", "error")
      }
    } catch (error) {
      console.error("Error deleting screenshot:", error)
    }
  }

  const handleChatSend = async () => {
    if (!chatInput.trim() && attachedScreenshots.length === 0) return
    const userText = chatInput.trim()
    const userImages = attachedScreenshots.map(s => s.preview)
    const userImagePaths = attachedScreenshots.map(s => s.path)

    setChatMessages((msgs) => [...msgs, { role: "user", text: userText || "Sent screenshots", images: userImages }])
    setChatLoading(true)
    setChatInput("")
    setAttachedScreenshots([])
    try {
      const response = await window.electronAPI.invoke("gemini-chat", userText || "Analyze these screenshots", userImagePaths)
      setChatMessages((msgs) => [...msgs, { role: "gemini", text: response }])
    } catch (err) {
      setChatMessages((msgs) => [...msgs, { role: "gemini", text: "Error: " + String(err) }])
    } finally {
      setChatLoading(false)
      chatInputRef.current?.focus()
    }
  }

  // Load current model configuration and mode on mount
  useEffect(() => {
    const loadCurrentModelAndMode = async () => {
      try {
        const config = await window.electronAPI.getCurrentLlmConfig();
        setCurrentModel({ provider: config.provider, model: config.model });
        
        const activeMode = await window.electronAPI.getLlmMode();
        setMode(activeMode);
      } catch (error) {
        console.error('Error loading current config/mode:', error);
      }
    };
    loadCurrentModelAndMode();
  }, []);

  useEffect(() => {
    const updateDimensions = () => {
      if (contentRef.current) {
        let contentHeight = contentRef.current.scrollHeight
        const contentWidth = contentRef.current.scrollWidth
        if (isTooltipVisible) {
          contentHeight += tooltipHeight
        }
        window.electronAPI.updateContentDimensions({
          width: contentWidth,
          height: contentHeight
        })
      }
    }

    const resizeObserver = new ResizeObserver(updateDimensions)
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current)
    }
    updateDimensions()

    const cleanupFunctions = [
      window.electronAPI.onScreenshotTaken(() => refetch()),
      window.electronAPI.onResetView(() => refetch()),
      window.electronAPI.onSolutionError((error: string) => {
        showToast(
          "Processing Failed",
          "There was an error processing your screenshots.",
          "error"
        )
        setView("queue")
        console.error("Processing error:", error)
      }),
      window.electronAPI.onProcessingNoScreenshots(() => {
        showToast(
          "No Screenshots",
          "There are no screenshots to process.",
          "neutral"
        )
      })
    ]

    return () => {
      resizeObserver.disconnect()
      cleanupFunctions.forEach((cleanup) => cleanup())
    }
  }, [isTooltipVisible, tooltipHeight])

  // Seamless screenshot attachment flow
  useEffect(() => {
    // Listen for screenshot taken event
    const unsubscribe = window.electronAPI.onScreenshotTaken(async (data) => {
      // Add screenshot to the attached list
      setAttachedScreenshots((prev) => [...prev, data]);
      // Open the chat window so the user sees it is attached
      setIsChatOpen(true);
    });
    return () => {
      unsubscribe && unsubscribe();
    };
  }, []);

  const handleTooltipVisibilityChange = (visible: boolean, height: number) => {
    setIsTooltipVisible(visible)
    setTooltipHeight(height)
  }

  const handleChatToggle = () => {
    setIsChatOpen((prev) => !prev)
  }

  const handleSettingsToggle = () => {
    setIsSettingsOpen((prev) => !prev)
  }

  const handleModelChange = (provider: "gemini", model: string) => {
    setCurrentModel({ provider, model })
    // Update chat messages to reflect the model change
    setChatMessages((msgs) => [...msgs, {
      role: "gemini",
      text: `🔄 Switched to ☁️ ${model}. Ready for your questions!`
    }])
  }

  const handleModeToggle = async () => {
    const newMode = mode === 'code' ? 'general' : 'code';
    try {
      setMode(newMode);
      await window.electronAPI.setLlmMode(newMode);
      showToast(
        "Mode Switched",
        `Wingman is now in ${newMode === 'code' ? '💻 Code Mode' : '🌟 General Mode'}.`,
        "neutral"
      );
    } catch (err) {
      console.error("Failed to switch mode:", err);
    }
  }

  const handleClearAll = () => {
    setChatMessages([])
    setAudioResult(null)
  }

  // Keyboard shortcuts: Ctrl+U (De-clutter UI), Ctrl+O (New Chat Context), Ctrl+C (Copy Latest Response), Ctrl+I (Toggle Settings/Models)
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()

      if (isCtrlOrMeta && key === "u") {
        e.preventDefault()
        handleClearAll()
      }

      if (isCtrlOrMeta && key === "o") {
        e.preventDefault()
        handleClearAll()
        try {
          await window.electronAPI.invoke("clear-chat-context")
        } catch (err) {
          console.error("Failed to clear context:", err)
        }
      }

      if (isCtrlOrMeta && key === "i") {
        e.preventDefault()
        handleSettingsToggle()
      }

      if (isCtrlOrMeta && key === "c") {
        const selection = window.getSelection()?.toString()
        if (!selection) {
          e.preventDefault()
          const geminiMsgs = chatMessages.filter(m => m.role === "gemini")
          const latestChatMsg = geminiMsgs.length > 0 ? geminiMsgs[geminiMsgs.length - 1].text : null
          const textToCopy = latestChatMsg || audioResult
          if (textToCopy) {
            navigator.clipboard.writeText(textToCopy)
          }
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [audioResult, chatMessages])


  return (
    <div
      ref={barRef}
      style={{
        position: "relative",
        width: "100%",
        pointerEvents: "auto"
      }}
      className="select-none"
    >
      <div className="bg-transparent w-full">
        <div className="px-2 py-1">
          <Toast
            open={toastOpen}
            onOpenChange={setToastOpen}
            variant={toastMessage.variant}
            duration={3000}
          >
            <ToastTitle>{toastMessage.title}</ToastTitle>
            <ToastDescription>{toastMessage.description}</ToastDescription>
          </Toast>
          <div className="w-fit">
            <QueueCommands
              screenshots={screenshots}
              onTooltipVisibilityChange={handleTooltipVisibilityChange}
              onChatToggle={handleChatToggle}
              onSettingsToggle={handleSettingsToggle}
              audioResult={audioResult}
              setAudioResult={setAudioResult}
              onClearAll={handleClearAll}
              chatMessagesCount={chatMessages.length}
              mode={mode}
              onModeToggle={handleModeToggle}
              theme={theme}
            />
          </div>
          {/* Conditional Settings Interface */}
          {isSettingsOpen && (
            <div className="mt-4 w-full mx-auto">
              <ModelSelector 
                onModelChange={handleModelChange} 
                onChatOpen={() => setIsChatOpen(true)}
                mode={mode}
                onModeSwitch={setMode}
              />
            </div>
          )}

          {/* Conditional Chat Interface */}
          {isChatOpen && (
            <div className="mt-4 w-full mx-auto liquid-glass chat-container p-4 flex flex-col">
              <div className="flex-1 overflow-y-auto mb-3 p-3 rounded-lg bg-black/5 dark:bg-white/10 backdrop-blur-md max-h-64 min-h-[120px] glass-content border border-black/10 dark:border-white/20 shadow-lg">
                {chatMessages.length === 0 ? (
                  <div className="text-sm text-secondary text-center mt-8">
                    💬 Chat with ☁️ {currentModel.model}
                    <br />
                    <span className="text-xs text-muted">Take a screenshot (Cmd+H) for automatic analysis</span>
                    <br />
                    <span className="text-xs text-muted">Click ⚙️ Models to switch AI providers</span>
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`w-full flex ${msg.role === "user" ? "justify-end" : "justify-start"} mb-3`}
                    >
                      <div
                        className={`max-w-[80%] px-3 py-1.5 rounded-xl text-xs shadow-md backdrop-blur-sm border ${msg.role === "user"
                          ? "bg-gray-800/95 dark:bg-gray-700/80 text-gray-100 ml-12 border-gray-700/40 dark:border-gray-600/40"
                          : "bg-white/95 dark:bg-white/10 text-primary mr-12 border-black/10 dark:border-white/10"
                          }`}
                        style={{ wordBreak: "break-word", lineHeight: "1.4" }}
                      >
                        {msg.images && msg.images.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-1.5">
                            {msg.images.map((img, imgIdx) => (
                              <img
                                key={imgIdx}
                                src={img}
                                alt="attached screenshot"
                                className="w-16 h-12 object-cover rounded border border-white/20 shadow-sm"
                              />
                            ))}
                          </div>
                        )}
                        {renderMarkdown(msg.text)}
                      </div>
                    </div>
                  ))
                )}
                {chatLoading && (
                  <div className="flex justify-start mb-3">
                    <div className="bg-white/95 dark:bg-white/10 text-primary px-3 py-1.5 rounded-xl text-xs backdrop-blur-sm border border-black/10 dark:border-white/15 shadow-md mr-12">
                      <span className="inline-flex items-center">
                        <span className="animate-pulse text-muted">●</span>
                        <span className="animate-pulse animation-delay-200 text-muted">●</span>
                        <span className="animate-pulse animation-delay-400 text-muted">●</span>
                        <span className="ml-2 text-secondary">{currentModel.model} is replying...</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
              {attachedScreenshots.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2 p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 backdrop-blur-sm">
                  {attachedScreenshots.map((scr, idx) => (
                    <div key={idx} className="relative w-16 h-12 group">
                      <img
                        src={scr.preview}
                        alt="attachment preview"
                        className="w-full h-full object-cover rounded-md border border-white/20 shadow-md"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setAttachedScreenshots(prev => prev.filter((_, i) => i !== idx))
                        }}
                        className="absolute -top-1.5 -right-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold shadow-md transition-colors"
                        title="Remove attachment"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <form
                className="flex gap-2 items-center glass-content"
                onSubmit={e => {
                  e.preventDefault();
                  handleChatSend();
                }}
              >
                <input
                  ref={chatInputRef}
                  className="flex-1 rounded-lg px-3 py-2 bg-white/40 dark:bg-white/20 backdrop-blur-md text-primary placeholder-secondary/60 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 border border-black/10 dark:border-white/20 shadow-lg transition-all duration-200"
                  placeholder="Type your message..."
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  disabled={chatLoading}
                />
                <button
                  type="submit"
                  className="p-2 rounded-lg bg-gray-700/90 dark:bg-white/10 hover:bg-gray-800 dark:hover:bg-white/20 border border-gray-600/60 dark:border-white/10 flex items-center justify-center transition-all duration-200 backdrop-blur-sm shadow-lg disabled:opacity-50"
                  disabled={chatLoading || (!chatInput.trim() && attachedScreenshots.length === 0)}
                  tabIndex={-1}
                  aria-label="Send"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-white dark:text-primary">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-7.5-15-7.5v6l10 1.5-10 1.5v6z" />
                  </svg>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Queue
