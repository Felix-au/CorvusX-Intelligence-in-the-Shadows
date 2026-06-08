import React, { useState, useRef } from "react"
import { IoLogOutOutline } from "react-icons/io5"

interface QueueCommandsProps {
  screenshots: Array<{ path: string; preview: string }>
  onChatToggle: () => void
  onSettingsToggle: () => void
  audioResult: string | null
  setAudioResult: React.Dispatch<React.SetStateAction<string | null>>
  onClearAll: () => void
  chatMessagesCount: number
  mode: 'code' | 'general'
  onModeToggle: () => void
  isAudioLoading?: boolean;
  setIsAudioLoading?: (loading: boolean) => void;
}

const QueueCommands: React.FC<QueueCommandsProps> = ({
  screenshots: _screenshots,
  onChatToggle,
  onSettingsToggle,
  audioResult,
  setAudioResult,
  onClearAll,
  chatMessagesCount,
  mode,
  onModeToggle,
  isAudioLoading: _isAudioLoading,
  setIsAudioLoading
}) => {
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])

  const handleRecordClick = async () => {
    if (!isRecording) {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const recorder = new MediaRecorder(stream)
        recorder.ondataavailable = (e) => chunks.current.push(e.data)
        recorder.onstop = async () => {
          const blob = new Blob(chunks.current, { type: chunks.current[0]?.type || 'audio/webm' })
          chunks.current = []
          const reader = new FileReader()
          reader.onloadend = async () => {
            const base64Data = (reader.result as string).split(',')[1]
            try {
              setIsAudioLoading?.(true)
              const result = await window.electronAPI.analyzeAudioFromBase64(base64Data, blob.type)
              setAudioResult(result.text)
            } catch (err) {
              setAudioResult('Audio analysis failed.')
            } finally {
              setIsAudioLoading?.(false)
            }
          }
          reader.readAsDataURL(blob)
        }
        setMediaRecorder(recorder)
        recorder.start()
        setIsRecording(true)
      } catch (err) {
        setAudioResult('Could not start recording.')
      }
    } else {
      // Stop recording
      mediaRecorder?.stop()
      setIsRecording(false)
      setMediaRecorder(null)
    }
  }

  return (
    <div className="w-fit">
      <div className="text-xs text-primary liquid-glass-bar py-1 px-4 flex items-center justify-center gap-4 draggable-area">
        {/* Show/Hide */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] leading-none text-secondary">Show/Hide</span>
          <div className="flex gap-1">
            <button className="bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 border border-black/10 dark:border-white/10 transition-colors rounded-md px-1.5 py-1 text-[11px] leading-none text-primary">
              ⌘
            </button>
            <button className="bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 border border-black/10 dark:border-white/10 transition-colors rounded-md px-1.5 py-1 text-[11px] leading-none text-primary">
              B
            </button>
          </div>
        </div>

        {/* Voice Recording Button */}
        <div className="flex items-center gap-2">
          <button
            className={`bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 border border-black/10 dark:border-white/10 transition-colors rounded-md px-2 py-1 text-[11px] leading-none text-primary flex items-center gap-1 cursor-pointer ${isRecording ? 'bg-red-500/70 dark:bg-red-500/70 hover:bg-red-500/90 dark:hover:bg-red-500/90 text-white animate-pulse' : ''}`}
            onClick={handleRecordClick}
            type="button"
          >
            {isRecording ? (
              <span className="flex items-center gap-1 text-white">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
                <span>Stop Recording</span>
              </span>
            ) : (
              <span>🎤 Record Voice</span>
            )}
          </button>
        </div>

        {/* Chat Button */}
        <div className="flex items-center gap-2">
          <button
            className="bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 border border-black/10 dark:border-white/10 transition-colors rounded-md px-2 py-1 text-[11px] leading-none text-primary flex items-center gap-1 cursor-pointer"
            onClick={onChatToggle}
            type="button"
          >
            💬 Chat
          </button>
        </div>

        {/* Mode Toggle Button */}
        <div className="flex items-center gap-2">
          <button
            className="transition-all duration-200 rounded-md px-2 py-1 text-[11px] leading-none flex items-center gap-1 cursor-pointer bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border border-blue-500/30"
            onClick={onModeToggle}
            type="button"
            title={`Active Mode: ${mode === 'code' ? 'Code (Returns only direct code solutions)' : 'General (Conversational answers)'}. Click to switch.`}
          >
            {mode === 'code' ? '💻 Code' : '🌟 General'}
          </button>
        </div>

        {/* Settings Button */}
        <div className="flex items-center gap-2">
          <button
            className="bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 border border-black/10 dark:border-white/10 transition-colors rounded-md px-2 py-1 text-[11px] leading-none text-primary flex items-center gap-1 cursor-pointer"
            onClick={onSettingsToggle}
            type="button"
            title="Toggle Settings and AI Models (Ctrl+I)"
          >
            ⚙️ Models
          </button>
        </div>

        {/* Clear Button */}
        {(audioResult || chatMessagesCount > 0) && (
          <div className="flex items-center gap-2">
            <button
              className="bg-black/5 dark:bg-white/10 hover:bg-red-500/20 dark:hover:bg-red-500/20 border border-black/10 dark:border-white/10 hover:border-red-500/30 dark:hover:border-red-500/30 transition-all rounded-md px-2 py-1 text-[11px] leading-none text-primary flex items-center gap-1 cursor-pointer"
              onClick={onClearAll}
              type="button"
              title="Clear audio results and chat messages (Ctrl+U)"
            >
              🧹 Clear
            </button>
          </div>
        )}

        {/* Separator */}
        <div className="mx-2 h-4 w-px bg-black/10 dark:bg-white/20" />

        {/* Sign Out Button - Moved to end */}
        <button
          className="text-red-600/70 dark:text-red-500/70 hover:text-red-600 dark:hover:text-red-500 hover:scale-105 transition-all hover:cursor-pointer"
          title="Sign Out"
          onClick={() => window.electronAPI.quitApp()}
        >
          <IoLogOutOutline className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default QueueCommands
