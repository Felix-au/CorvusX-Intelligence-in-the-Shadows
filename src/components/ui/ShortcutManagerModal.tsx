import React, { useState, useEffect } from "react"
import { X, Keyboard, Check, AlertCircle } from "lucide-react"

interface ShortcutManagerModalProps {
  isOpen: boolean
  onClose: () => void
}

interface ShortcutsMap {
  showCenter: string
  screenshot: string
  toggleStealth: string
  toggleSettings: string
  copyLatest: string
  newSession: string
  declutter: string
  toggleVoice: string
  toggleGhostKeyboard: string
}

const SHORTCUT_LABELS: Record<keyof ShortcutsMap, string> = {
  showCenter: "Show & Center Window",
  screenshot: "Take Screenshot",
  toggleStealth: "Toggle Stealth Overlay",
  toggleSettings: "Toggle Settings & Models list",
  copyLatest: "Copy Latest Response",
  newSession: "New Chat Session",
  declutter: "Declutter UI Display",
  toggleVoice: "Toggle Voice Recording",
  toggleGhostKeyboard: "Toggle Ghost Keyboard Mode"
}

export const ShortcutManagerModal: React.FC<ShortcutManagerModalProps> = ({
  isOpen,
  onClose
}) => {
  const [shortcuts, setShortcuts] = useState<ShortcutsMap | null>(null)
  const [recordingKey, setRecordingKey] = useState<keyof ShortcutsMap | null>(null)
  const [recordedKeys, setRecordedKeys] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)

  useEffect(() => {
    if (isOpen) {
      loadShortcuts()
    }
  }, [isOpen])

  const loadShortcuts = async () => {
    try {
      const data = await window.electronAPI.invoke("get-shortcuts")
      if (data) {
        setShortcuts(data)
      }
    } catch (err) {
      console.error("Failed to load shortcuts:", err)
    }
  }

  useEffect(() => {
    if (!recordingKey) return

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const parts: string[] = []

      // Capture modifiers
      if (e.ctrlKey || e.metaKey) {
        parts.push("CommandOrControl")
      }
      if (e.altKey) {
        parts.push("Alt")
      }
      if (e.shiftKey) {
        parts.push("Shift")
      }

      // Capture actual key
      const key = e.key
      const isModifier = ["Control", "Alt", "Shift", "Meta"].includes(key)

      if (!isModifier) {
        let keyName = key
        if (key === " ") keyName = "Space"
        else if (key === "ArrowLeft") keyName = "Left"
        else if (key === "ArrowRight") keyName = "Right"
        else if (key === "ArrowUp") keyName = "Up"
        else if (key === "ArrowDown") keyName = "Down"
        else if (key.length === 1) keyName = key.toUpperCase()

        parts.push(keyName)
      }

      // De-duplicate parts
      const uniqueParts = Array.from(new Set(parts))
      setRecordedKeys(uniqueParts)

      // Automatically complete recording once we have a main key pressed and total parts is at least 2
      if (!isModifier && uniqueParts.length >= 2) {
        finishRecording(uniqueParts.join("+"))
      }
    }
 
    window.addEventListener("keydown", handleKeyDown, true)
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true)
    }
  }, [recordingKey])
 
  const startRecording = (key: keyof ShortcutsMap) => {
    setRecordingKey(key)
    setRecordedKeys([])
    setError(null)
    setSuccess(false)
  }
 
  const finishRecording = (shortcutString: string) => {
    if (!shortcuts) return
 
    const parts = shortcutString.split("+")
    if (parts.length < 2) {
      setError("Shortcut must contain at least 2 keys (e.g. Ctrl + Key)")
      setRecordingKey(null)
      return
    }

    setShortcuts({
      ...shortcuts,
      [recordingKey!]: shortcutString
    })
    setRecordingKey(null)
  }

  const handleSave = async () => {
    if (!shortcuts) return

    try {
      const res = await window.electronAPI.invoke("save-shortcuts", shortcuts)
      if (res.success) {
        setSuccess(true)
        setTimeout(() => {
          setSuccess(false)
          onClose()
        }, 1500)
      } else {
        setError(res.error || "Failed to save shortcuts")
      }
    } catch (err: any) {
      setError(err.message || "Error saving shortcuts")
    }
  }

  if (!isOpen) return null

  // Format shortcuts string for display
  const formatDisplay = (raw: string) => {
    return raw
      .replace("CommandOrControl", "Ctrl")
      .split("+")
      .join(" + ")
  }

  return (
    <div className="p-4 liquid-glass rounded-lg border border-black/10 dark:border-white/20 space-y-4 text-left select-none text-primary">
      {/* Header */}
      <div className="flex justify-between items-center pb-2 border-b border-black/10 dark:border-white/10">
        <div className="flex items-center gap-2">
          <Keyboard className="w-5 h-5 text-blue-500" />
          <h2 className="text-xs font-extrabold uppercase tracking-wide text-primary">
            Keyboard Shortcuts
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4 text-muted" />
        </button>
      </div>

      {/* Description */}
      <p className="text-[10px] text-secondary leading-relaxed">
        Configure global hotkeys to control the overlay. All active shortcuts must use at least 2 keys (e.g., Ctrl + Key).
      </p>

      {/* Error/Success Feedback */}
      {error && (
        <div className="p-2.5 rounded-lg border border-red-500/30 bg-red-500/10 text-[10px] font-semibold text-red-500 dark:text-red-400 flex items-center gap-1.5 animate-pulse">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-2.5 rounded-lg border border-green-500/30 bg-green-500/10 text-[10px] font-semibold text-green-600 dark:text-green-400 flex items-center gap-1.5 animate-pulse">
          <Check className="w-4 h-4 shrink-0" />
          <span>Shortcuts updated and applied!</span>
        </div>
      )}

      {/* Shortcuts list */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        {shortcuts &&
          Object.keys(SHORTCUT_LABELS).map((key) => {
            const shortcutKey = key as keyof ShortcutsMap
            const isRecording = recordingKey === shortcutKey

            return (
              <div
                key={shortcutKey}
                className="flex items-center justify-between p-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all"
              >
                <span className="text-[11px] font-semibold text-secondary">
                  {SHORTCUT_LABELS[shortcutKey]}
                </span>
                <button
                  onClick={() => startRecording(shortcutKey)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                    isRecording
                      ? "border-blue-500 bg-blue-500/20 text-blue-500 dark:text-blue-300 animate-pulse"
                      : "border-black/10 dark:border-white/20 bg-black/5 dark:bg-white/10 text-blue-600 dark:text-blue-400 hover:border-black/20 dark:hover:border-white/30 hover:text-primary"
                  }`}
                >
                  {isRecording
                    ? recordedKeys.length > 0
                      ? formatDisplay(recordedKeys.join("+"))
                      : "Press keys..."
                    : formatDisplay(shortcuts[shortcutKey])}
                </button>
              </div>
            )
          })}
      </div>

      {/* Footer actions */}
      <div className="flex gap-2 pt-2 border-t border-black/10 dark:border-white/10">
        <button
          onClick={handleSave}
          disabled={recordingKey !== null}
          className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all shadow-md cursor-pointer text-center"
        >
          Apply Changes
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer text-center"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
