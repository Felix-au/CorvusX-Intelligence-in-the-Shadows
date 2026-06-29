import React from "react"
import { IoLogOutOutline } from "react-icons/io5"

interface QueueCommandsProps {
  screenshots: Array<{ path: string; preview: string }>
  onChatToggle: () => void
  onSettingsToggle: () => void
  onShortcutsToggle: () => void
  audioResult: string | null
  onClearAll: () => void
  chatMessagesCount: number
  mode: 'code' | 'general'
  onModeToggle: () => void
  isAudioLoading?: boolean;
  isRecording?: boolean;
  onRecordingToggle?: () => void;
  statusLedEnabled?: boolean;
  isChatLoading?: boolean;
  hasError?: boolean;
}

const QueueCommands: React.FC<QueueCommandsProps> = ({
  screenshots: _screenshots,
  onChatToggle,
  onSettingsToggle,
  onShortcutsToggle,
  audioResult,
  onClearAll,
  chatMessagesCount,
  mode,
  onModeToggle,
  isAudioLoading = false,
  isRecording = false,
  onRecordingToggle,
  statusLedEnabled = true,
  isChatLoading = false,
  hasError = false
}) => {

  const getStatusDetails = () => {
    if (hasError) {
      return {
        colorClass: "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]",
        title: "System Error"
      };
    }
    if (isChatLoading || isAudioLoading) {
      return {
        colorClass: "bg-yellow-500 shadow-[0_0_6px_rgba(234,179,8,0.6)] animate-pulse",
        title: "AI Processing..."
      };
    }
    return {
      colorClass: "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.4)]",
      title: "Stealth Assistant Idle & Ready"
    };
  };

  const { colorClass, title: statusTitle } = getStatusDetails();

  return (
    <div className="w-fit overflow-visible">
      <div className="text-xs text-primary liquid-glass-bar py-1 px-4 flex flex-row flex-nowrap items-center justify-center gap-4 draggable-area whitespace-nowrap overflow-visible">
        
        {/* Stealth Status LED */}
        {statusLedEnabled && (
          <div className="flex items-center justify-center shrink-0 w-2.5 h-2.5" title={statusTitle}>
            <span className={`w-2 h-2 rounded-full ${colorClass}`} />
          </div>
        )}

        {/* Show/Hide */}
        <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
          <span className="text-[11px] leading-none text-secondary shrink-0 whitespace-nowrap">Show/Hide</span>
          <div className="flex gap-1 shrink-0">
            <button className="bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 border border-black/10 dark:border-white/10 transition-colors rounded-md px-1.5 py-1 text-[11px] leading-none text-primary shrink-0 whitespace-nowrap">
              ⌘
            </button>
            <button className="bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 border border-black/10 dark:border-white/10 transition-colors rounded-md px-1.5 py-1 text-[11px] leading-none text-primary shrink-0 whitespace-nowrap">
              B
            </button>
          </div>
        </div>

        {/* Voice Recording Button */}
        <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
          <button
            className={`bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 border border-black/10 dark:border-white/10 transition-colors rounded-md px-2 py-1 text-[11px] leading-none text-primary flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap ${isRecording ? 'bg-red-500/70 dark:bg-red-500/70 hover:bg-red-500/90 dark:hover:bg-red-500/90 text-white animate-pulse' : ''}`}
            onClick={onRecordingToggle}
            type="button"
          >
            {isRecording ? (
              <span className="flex items-center gap-1 text-white shrink-0 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
                <span>Stop Recording</span>
              </span>
            ) : (
              <span className="shrink-0 whitespace-nowrap">🎤 Record Voice</span>
            )}
          </button>
        </div>

        {/* Chat Button */}
        <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
          <button
            className="bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 border border-black/10 dark:border-white/10 transition-colors rounded-md px-2 py-1 text-[11px] leading-none text-primary flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
            onClick={onChatToggle}
            type="button"
          >
            <span className="shrink-0 whitespace-nowrap">💬 Chat</span>
          </button>
        </div>

        {/* Mode Toggle Button */}
        <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
          <button
            className="transition-all duration-200 rounded-md px-2 py-1 text-[11px] leading-none flex items-center gap-1 cursor-pointer bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border border-blue-500/30 shrink-0 whitespace-nowrap"
            onClick={onModeToggle}
            type="button"
            title={`Active Mode: ${mode === 'code' ? 'Code (Returns only direct code solutions)' : 'General (Conversational answers)'}. Click to switch.`}
          >
            <span className="shrink-0 whitespace-nowrap">{mode === 'code' ? '💻 Code' : '🌟 General'}</span>
          </button>
        </div>

        {/* Settings Button */}
        <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
          <button
            className="bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 border border-black/10 dark:border-white/10 transition-colors rounded-md px-2 py-1 text-[11px] leading-none text-primary flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
            onClick={onSettingsToggle}
            type="button"
            title="Toggle Settings and AI Models (Ctrl+I)"
          >
            <span className="shrink-0 whitespace-nowrap">⚙️ Models</span>
          </button>
        </div>

        {/* Shortcuts Button */}
        <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
          <button
            className="bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 border border-black/10 dark:border-white/10 transition-colors rounded-md px-2 py-1 text-[11px] leading-none text-primary flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
            onClick={onShortcutsToggle}
            type="button"
            title="Configure global keyboard shortcuts"
          >
            <span className="shrink-0 whitespace-nowrap">⌨️ Hotkeys</span>
          </button>
        </div>

        {/* Clear Button */}
        {(audioResult || chatMessagesCount > 0) && (
          <div className="flex items-center gap-2 shrink-0 whitespace-nowrap animate-fadeIn">
            <button
              className="bg-black/5 dark:bg-white/10 hover:bg-red-500/20 dark:hover:bg-red-500/20 border border-black/10 dark:border-white/10 hover:border-red-500/30 dark:hover:bg-red-500/30 transition-all rounded-md px-2 py-1 text-[11px] leading-none text-primary flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
              onClick={onClearAll}
              type="button"
              title="Clear audio results and chat messages (Ctrl+U)"
            >
              <span className="shrink-0 whitespace-nowrap">🧹 Clear</span>
            </button>
          </div>
        )}

        {/* Separator */}
        <div className="mx-2 h-4 w-px bg-black/10 dark:bg-white/20 shrink-0" />

        {/* Sign Out Button - Moved to end */}
        <button
          className="text-red-600/70 dark:text-red-500/70 hover:text-red-600 dark:hover:text-red-500 hover:scale-105 transition-all hover:cursor-pointer shrink-0"
          title="Sign Out"
          onClick={() => window.electronAPI.quitApp()}
        >
          <IoLogOutOutline className="w-4 h-4 shrink-0" />
        </button>
      </div>
    </div>
  )
}

export default QueueCommands
