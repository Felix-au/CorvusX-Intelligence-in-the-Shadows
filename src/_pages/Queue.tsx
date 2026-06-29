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
import { ShortcutManagerModal } from "../components/ui/ShortcutManagerModal"
import { renderMarkdown } from "../lib/utils"

interface ShortcutsMap {
  showCenter: string
  screenshot: string
  toggleStealth: string
  toggleSettings: string
  copyLatest: string
  newSession: string
  declutter: string
}

const matchShortcut = (e: KeyboardEvent, shortcutStr: string): boolean => {
  if (!shortcutStr) return false
  const parts = shortcutStr.split("+").map(p => p.trim())
  
  const hasCtrlOrMeta = parts.includes("CommandOrControl") || parts.includes("Ctrl")
  const hasAlt = parts.includes("Alt")
  const hasShift = parts.includes("Shift")

  const eventCtrlOrMeta = e.ctrlKey || e.metaKey
  if (hasCtrlOrMeta !== eventCtrlOrMeta) return false
  if (hasAlt !== e.altKey) return false
  if (hasShift !== e.shiftKey) return false

  const actionKey = parts.find(p => !["CommandOrControl", "Ctrl", "Alt", "Shift", "Meta"].includes(p))
  if (!actionKey) return false

  let keyName = e.key
  if (e.key === " ") keyName = "Space"
  else if (e.key === "ArrowLeft") keyName = "Left"
  else if (e.key === "ArrowRight") keyName = "Right"
  else if (e.key === "ArrowUp") keyName = "Up"
  else if (e.key === "ArrowDown") keyName = "Down"
  else if (e.key.length === 1) keyName = e.key.toUpperCase()

  return keyName.toLowerCase() === actionKey.toLowerCase()
}

interface QueueProps {
  setView: React.Dispatch<React.SetStateAction<"queue" | "solutions" | "debug">>
  opacity?: number
  onOpacityChange?: (opacity: number) => void
}

const Queue: React.FC<QueueProps> = ({ setView, opacity = 0.25, onOpacityChange }) => {
  const [toastOpen, setToastOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<ToastMessage>({
    title: "",
    description: "",
    variant: "neutral"
  })

  const contentRef = useRef<HTMLDivElement>(null)

  const [chatInput, setChatInput] = useState("")
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "gemini", text: string, images?: string[] }[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const chatInputRef = useRef<HTMLInputElement>(null)
  const [attachedScreenshots, setAttachedScreenshots] = useState<{ path: string; preview: string }[]>([])

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false)
  const [currentModel, setCurrentModel] = useState<{ provider: string; model: string }>({ provider: "gemini", model: "auto" })
  const [audioResult, setAudioResult] = useState<string | null>(null)
  const [isAudioLoading, setIsAudioLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const isRecordingRef = useRef(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const [mode, setMode] = useState<'code' | 'general'>('code')
  const [shortcuts, setShortcuts] = useState<ShortcutsMap | null>(null)
  const [isGhostActive, setIsGhostActive] = useState(false)

  useEffect(() => {
    const fetchShortcuts = async () => {
      try {
        const data = await window.electronAPI.invoke("get-shortcuts")
        if (data) setShortcuts(data)
      } catch (err) {
        console.error("Failed to load shortcuts:", err)
      }
    }
    fetchShortcuts()

    const unsubscribe = window.electronAPI.onShortcutsUpdated((newShortcuts: ShortcutsMap) => {
      setShortcuts(newShortcuts)
    })

    return () => {
      unsubscribe()
    }
  }, [])

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
    _title: string,
    _description: string,
    _variant: ToastVariant
  ) => {
    // No-op to suppress all toast notifications as requested by the user
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
    const userText = chatInput.trim()
    const userImages = attachedScreenshots.map((scr) => scr.preview)
    const userImagePaths = attachedScreenshots.map((scr) => scr.path)

    if (!userText && userImages.length === 0) return

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

  const handleCopyCode = (text: string) => {
    const codeBlockRegex = /```(?:\w*)\n([\s\S]*?)```/g;
    const matches: string[] = [];
    let match;
    while ((match = codeBlockRegex.exec(text)) !== null) {
      matches.push(match[1].trim());
    }
    const textToCopy = matches.length > 0 ? matches.join("\n\n") : text;
    window.electronAPI.invoke("write-to-clipboard", textToCopy);
  };

  const handleRegenerate = async () => {
    if (chatLoading) return;
    setChatLoading(true);
    setChatMessages(prev => {
      const copy = [...prev];
      if (copy.length > 0 && copy[copy.length - 1].role === "gemini") {
        copy.pop();
      }
      return copy;
    });

    try {
      const response = await window.electronAPI.invoke("gemini-regenerate");
      setChatMessages(prev => [...prev, { role: "gemini", text: response }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: "gemini", text: "Error: " + String(err) }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleRecordingToggle = async () => {
    if (!isRecordingRef.current) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const recorder = new MediaRecorder(stream)
        chunksRef.current = []
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunksRef.current.push(e.data)
          }
        }
        recorder.onstop = async () => {
          const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || 'audio/webm' })
          chunksRef.current = []
          const reader = new FileReader()
          reader.onloadend = async () => {
            const base64Data = (reader.result as string).split(',')[1]
            try {
              setIsAudioLoading(true)
              const result = await window.electronAPI.analyzeAudioFromBase64(base64Data, blob.type)
              setAudioResult(result.text)
            } catch (err: any) {
              const errMsg = err?.message || String(err)
              setAudioResult('Audio analysis failed: ' + errMsg.replace(/^Error:\s*/i, ''))
            } finally {
              setIsAudioLoading(false)
            }
          }
          reader.readAsDataURL(blob)
        }
        mediaRecorderRef.current = recorder
        recorder.start()
        isRecordingRef.current = true
        setIsRecording(true)
      } catch (err) {
        setAudioResult('Could not start recording.')
      }
    } else {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop()
      }
      mediaRecorderRef.current = null
      isRecordingRef.current = false
      setIsRecording(false)
    }
  }

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  // Listen to global voice recording toggle IPC event
  useEffect(() => {
    const unsubscribe = window.electronAPI.onToggleVoiceRecording(() => {
      handleRecordingToggle()
    })
    return () => {
      unsubscribe()
    }
  }, [])

  // Dynamically toggle global enter registration based on chat content presence
  useEffect(() => {
    const hasInput = chatInput.trim() !== "" || attachedScreenshots.length > 0
    window.electronAPI.invoke("toggle-global-enter", hasInput)
    
    return () => {
      window.electronAPI.invoke("toggle-global-enter", false)
    }
  }, [chatInput, attachedScreenshots])

  // Always invoke the latest closure of handleChatSend via mutable ref
  const handleChatSendRef = useRef(handleChatSend)
  useEffect(() => {
    handleChatSendRef.current = handleChatSend
  }, [handleChatSend])

  // Listen to global enter keypress IPC event
  useEffect(() => {
    const unsubscribe = window.electronAPI.onGlobalEnterPressed(() => {
      handleChatSendRef.current()
    })
    return () => {
      unsubscribe()
    }
  }, [])

  // Listen to global copy latest response IPC event
  useEffect(() => {
    const unsubscribe = window.electronAPI.onCopyLatestResponse(() => {
      const geminiMsgs = chatMessages.filter(m => m.role === "gemini")
      const latestChatMsg = geminiMsgs.length > 0 ? geminiMsgs[geminiMsgs.length - 1].text : null
      let textToCopy = latestChatMsg || audioResult
      if (textToCopy) {
        const codeBlockRegex = /^```(?:\w*)\n([\s\S]*?)```$/
        const match = codeBlockRegex.exec(textToCopy.trim())
        if (match) {
          textToCopy = match[1].trim()
        }
        window.electronAPI.invoke("write-to-clipboard", textToCopy)
      }
    })
    return () => {
      unsubscribe()
    }
  }, [chatMessages, audioResult])

  // Listen to global simulate typing latest response IPC event
  useEffect(() => {
    const unsubscribe = window.electronAPI.onSimulateLatestResponse(() => {
      const geminiMsgs = chatMessages.filter(m => m.role === "gemini")
      const latestChatMsg = geminiMsgs.length > 0 ? geminiMsgs[geminiMsgs.length - 1].text : null
      let textToType = latestChatMsg || audioResult
      if (textToType) {
        const codeBlockRegex = /^```(?:\w*)\n([\s\S]*?)```$/
        const match = codeBlockRegex.exec(textToType.trim())
        if (match) {
          textToType = match[1].trim()
        }
        window.electronAPI.invoke("simulate-typing", textToType)
      }
    })
    return () => {
      unsubscribe()
    }
  }, [chatMessages, audioResult])

  // Listen to Ghost Keyboard toggling
  useEffect(() => {
    const unsubscribe = window.electronAPI.onToggleGhostMode((isActive) => {
      setIsGhostActive(isActive)
      if (isActive) {
        setIsChatOpen(true)
      }
    })
    return () => {
      unsubscribe()
    }
  }, [])

  // Listen to incoming mirrored keystrokes
  useEffect(() => {
    const unsubscribe = window.electronAPI.onGhostKeypress((data) => {
      if (data.action === "append") {
        setChatInput((prev) => prev + data.char)
      } else if (data.action === "backspace") {
        setChatInput((prev) => prev.slice(0, -1))
      } else if (data.action === "submit") {
        handleChatSendRef.current()
      }
    })
    return () => {
      unsubscribe()
    }
  }, [])

  const handleRegenerateRef = useRef(handleRegenerate);
  useEffect(() => {
    handleRegenerateRef.current = handleRegenerate;
  }, [handleRegenerate]);

  // Listen to global regenerate response IPC event
  useEffect(() => {
    const unsubscribe = window.electronAPI.onRegenerateLastResponse(() => {
      handleRegenerateRef.current();
    });
    return () => {
      unsubscribe();
    };
  }, []);

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
        const contentHeight = contentRef.current.scrollHeight
        const contentWidth = contentRef.current.scrollWidth
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
  }, [])

  // Seamless screenshot attachment flow
  useEffect(() => {
    const unsubscribe = window.electronAPI.onScreenshotTaken(async (data) => {
      setAttachedScreenshots((prev) => [...prev, data]);
      setIsChatOpen(true);
    });
    return () => {
      unsubscribe && unsubscribe();
    };
  }, []);

  const handleChatToggle = () => {
    setIsChatOpen((prev) => !prev)
  }

  const handleSettingsToggle = () => {
    setIsSettingsOpen((prev) => !prev)
  }

  const handleShortcutsToggle = () => {
    setIsShortcutsOpen((prev) => !prev)
  }

  const handleModelChange = (provider: "gemini", model: string) => {
    setCurrentModel({ provider, model })
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

  // Keyboard shortcuts: De-clutter UI, New Chat Context, Copy Latest Response, Toggle Settings/Models
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Keep Q hardcoded as exit shortcut
      const isCtrlOrMeta = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()
      if (isCtrlOrMeta && key === "q") {
        e.preventDefault()
        window.electronAPI.quitApp()
        return
      }

      if (!shortcuts) return

      if (matchShortcut(e, shortcuts.declutter)) {
        e.preventDefault()
        handleClearAll()
      }

      else if (matchShortcut(e, shortcuts.newSession)) {
        e.preventDefault()
        handleClearAll()
        try {
          await window.electronAPI.invoke("clear-chat-context")
        } catch (err) {
          console.error("Failed to clear context:", err)
        }
      }

      else if (matchShortcut(e, shortcuts.toggleSettings)) {
        e.preventDefault()
        handleSettingsToggle()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [audioResult, chatMessages, shortcuts])

  return (
    <div
      ref={barRef}
      style={{
        position: "relative",
        width: "100%",
        pointerEvents: "auto"
      }}
      className="select-none flex flex-col items-center justify-center w-full"
    >
      <div className="bg-transparent w-full flex flex-col items-center" ref={contentRef}>
        <div className="px-2 py-1 flex flex-col items-center w-full">
          <Toast
            open={toastOpen}
            onOpenChange={setToastOpen}
            variant={toastMessage.variant}
            duration={3000}
          >
            <ToastTitle>{toastMessage.title}</ToastTitle>
            <ToastDescription>{toastMessage.description}</ToastDescription>
          </Toast>
          
          <div className="w-fit flex justify-center">
            <QueueCommands
              screenshots={screenshots}
              onChatToggle={handleChatToggle}
              onSettingsToggle={handleSettingsToggle}
              onShortcutsToggle={handleShortcutsToggle}
              audioResult={audioResult}
              onClearAll={handleClearAll}
              chatMessagesCount={chatMessages.length}
              mode={mode}
              onModeToggle={handleModeToggle}
              isAudioLoading={isAudioLoading}
              isRecording={isRecording}
              onRecordingToggle={handleRecordingToggle}
            />
          </div>

          {/* Conditional Audio Loading/Result Interface (Styled like Chat Section, broader space) */}
          {(isAudioLoading || audioResult) && (
            <div className="mt-4 w-full max-w-[600px] liquid-glass chat-container p-3 flex flex-col text-left">
              <div className="flex items-center justify-between mb-2 pb-1 border-b border-black/10 dark:border-white/10">
                <span className="text-[11px] font-bold text-primary flex items-center gap-1">
                  🎤 Voice Input Status
                </span>
                {(audioResult && !isAudioLoading) && (
                  <button
                    onClick={() => setAudioResult(null)}
                    className="text-[10px] text-secondary hover:text-primary transition-colors cursor-pointer"
                  >
                    ✕ Close
                  </button>
                )}
              </div>
              {isAudioLoading ? (
                <div className="p-3 rounded-lg bg-black/5 dark:bg-white/10 backdrop-blur-md glass-content border border-black/10 dark:border-white/20 shadow-lg text-[11px] text-primary flex items-center gap-2">
                  <span className="flex gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:0.4s]" />
                  </span>
                  <span className="text-secondary animate-pulse">Processing voice recording & transcribing request...</span>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-black/5 dark:bg-white/10 backdrop-blur-md glass-content border border-black/10 dark:border-white/20 shadow-lg text-[11px] text-primary max-h-32 overflow-y-auto leading-relaxed">
                  {renderMarkdown(audioResult || "")}
                </div>
              )}
            </div>
          )}

          {/* Conditional Settings Interface (broader space) */}
          {isSettingsOpen && (
            <div className="mt-4 w-full max-w-[600px]">
              <ModelSelector 
                onModelChange={handleModelChange} 
                onChatOpen={() => setIsChatOpen(true)}
                mode={mode}
                onModeSwitch={setMode}
                opacity={opacity}
                onOpacityChange={onOpacityChange}
              />
            </div>
          )}

          {/* Conditional Keyboard Shortcuts Interface (broader space) */}
          {isShortcutsOpen && (
            <div className="mt-4 w-full max-w-[600px]">
              <ShortcutManagerModal
                isOpen={isShortcutsOpen}
                onClose={() => setIsShortcutsOpen(false)}
              />
            </div>
          )}

          {/* Conditional Chat Interface (broader space) */}
          {isChatOpen && (
            <div className={`mt-4 w-full max-w-[600px] liquid-glass chat-container p-4 flex flex-col text-left ${isGhostActive ? "animate-pulse-border" : ""}`}>
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
                        {msg.role === "gemini" && (
                          <div className="flex items-center gap-3 mt-1.5 pt-1 border-t border-black/5 dark:border-white/5 select-none">
                            <button
                              type="button"
                              onClick={() => handleCopyCode(msg.text)}
                              className="text-[9px] text-secondary hover:text-primary flex items-center gap-0.5 cursor-pointer transition-colors border-none bg-transparent p-0"
                              title="Copy Code Solution"
                            >
                              📄 Copy Code
                            </button>
                            {idx === chatMessages.length - 1 && (
                              <button
                                type="button"
                                onClick={handleRegenerate}
                                disabled={chatLoading}
                                className="text-[9px] text-secondary hover:text-primary disabled:opacity-50 flex items-center gap-0.5 cursor-pointer transition-colors border-none bg-transparent p-0"
                                title="Regenerate Last Response"
                              >
                                🔄 Regenerate
                              </button>
                            )}
                          </div>
                        )}
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
                  className={`flex-1 rounded-lg px-3 py-2 bg-white/40 dark:bg-white/20 backdrop-blur-md text-primary placeholder-secondary/60 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 border shadow-lg transition-all duration-200 ${
                    isGhostActive
                      ? "border-purple-500/50 dark:border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.25)]"
                      : "border-black/10 dark:border-white/20"
                  }`}
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
