import React, { useState, useEffect } from "react"
import { 
  Sparkles, 
  Laptop, 
  Key, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  AlertTriangle, 
  Code, 
  Command, 
  Eye,
  EyeOff,
  Palette
} from "lucide-react"

interface OnboardingWizardProps {
  onComplete: () => void
  onStyleChange?: (theme: "light" | "dark", opacity: number) => void
}

type ProviderType = "gemini" | "omnikey"
type ModeType = "code" | "general"

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete, onStyleChange }) => {
  const [step, setStep] = useState<number>(1)
  const [theme, setTheme] = useState<"light" | "dark">("dark")
  const [opacity, setOpacity] = useState<number>(0.25)
  const [provider, setProvider] = useState<ProviderType>("gemini")
  const [apiKey, setApiKey] = useState<string>("")
  const [showApiKey, setShowApiKey] = useState<boolean>(false)
  const [mode, setMode] = useState<ModeType>("code")

  // Connection testing state
  const [isTesting, setIsTesting] = useState<boolean>(false)
  const [testStatus, setTestStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [hasTestedSuccessfully, setHasTestedSuccessfully] = useState<boolean>(false)

  // Live preview styling synchronization
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty("--bg-color", theme === "light" ? "255, 255, 255" : "0, 0, 0")
    root.style.setProperty("--bg-opacity", theme === "light" ? String(opacity * 0.08) : String(opacity))
    root.style.setProperty("--text-color-primary", theme === "light" ? "#000000" : "#f9fafb")
    root.style.setProperty("--text-color-secondary", theme === "light" ? "#111111" : "#d1d5db")
    root.style.setProperty("--text-color-muted", theme === "light" ? "#374151" : "#9ca3af")
    root.style.setProperty("--border-color", theme === "light" ? "rgba(0, 0, 0, 0.12)" : "rgba(255, 255, 255, 0.15)")
    
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    if (onStyleChange) {
      onStyleChange(theme, opacity)
    }
  }, [theme, opacity, onStyleChange])

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      setTestStatus("error")
      setErrorMessage("API Key cannot be empty.")
      return
    }

    setIsTesting(true)
    setTestStatus("idle")
    setErrorMessage("")

    try {
      const modelToTest = provider === "omnikey" ? "auto" : "gemini-2.5-flash"
      
      let keyToTest = apiKey.trim()
      if (provider === "omnikey" && !keyToTest.startsWith("omnikey-")) {
        keyToTest = "omnikey-" + keyToTest
      }

      const result = await window.electronAPI.testLlmConnection(keyToTest, modelToTest)
      
      if (result.success) {
        setTestStatus("success")
        setHasTestedSuccessfully(true)
      } else {
        setTestStatus("error")
        setErrorMessage(result.error || "Connection failed. Please check your key.")
      }
    } catch (err: any) {
      setTestStatus("error")
      setErrorMessage(String(err.message || err))
    } finally {
      setIsTesting(false)
    }
  }

  const handleNext = () => {
    if (step === 3 && !hasTestedSuccessfully) {
      // Must test connection successfully to proceed from the provider step (Step 3)
      return
    }
    setStep((prev) => prev + 1)
  }

  const handleBack = () => {
    setStep((prev) => prev - 1)
  }

  const handleFinish = async () => {
    let finalKey = apiKey.trim()
    if (provider === "omnikey" && !finalKey.startsWith("omnikey-")) {
      finalKey = "omnikey-" + finalKey
    }

    const defaultModel = provider === "omnikey" ? "auto" : "gemini-2.5-flash"

    try {
      const response = await window.electronAPI.invoke(
        "complete-onboarding",
        finalKey,
        provider,
        defaultModel,
        mode,
        theme,
        opacity
      )
      if (response.success) {
        onComplete()
      } else {
        alert("Failed to complete onboarding: " + response.error)
      }
    } catch (err) {
      alert("Error: " + String(err))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-lg p-6 select-none">
      <div className="w-full max-w-lg liquid-glass chat-container p-6 border border-white/20 shadow-2xl flex flex-col min-h-[460px] justify-between relative overflow-hidden">
        
        {/* Shimmer visual decoration */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Progress Header */}
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10 glass-content">
          <span className="text-[11px] font-bold tracking-widest text-muted uppercase">
            CorvusX Setup &bull; Step {step} of 6
          </span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div 
                key={i} 
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === step ? "w-4 bg-white/80" : i < step ? "w-1 bg-white/40" : "w-1 bg-white/10"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content Slides */}
        <div className="flex-1 flex flex-col justify-center py-2 glass-content text-left">
          
          {/* STEP 1: APPEARANCE CUSTOMIZATION */}
          {step === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center gap-2">
                <Palette className="w-6 h-6 text-pink-400" />
                <h1 className="text-lg font-extrabold text-primary tracking-tight">
                  Customize Appearance
                </h1>
              </div>
              <p className="text-xs text-secondary leading-relaxed font-medium">
                Adjust the window styling to ensure all text remains highly readable against your desktop background. Changes apply live below.
              </p>
              
              <div className="space-y-4 pt-2 border-t border-white/10">
                {/* Theme choice */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                    Background Theme
                  </label>
                  <div className="p-3 rounded-xl border border-blue-500/50 bg-white/15 text-primary flex flex-col justify-between shadow-md ring-1 ring-blue-500/10">
                    <span className="text-xs font-bold">🌙 Dark Backdrop (Default)</span>
                    <span className="text-[9px] mt-1 leading-normal opacity-75">
                      Translucent blackish background optimized for stealth HUD integration.
                    </span>
                  </div>
                </div>

                {/* Opacity slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-bold text-muted uppercase tracking-wider">
                    <span>Backdrop Opacity</span>
                    <span className="font-mono text-primary text-xs">{Math.round(opacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="1.00"
                    step="0.05"
                    value={opacity}
                    onChange={(e) => setOpacity(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-black/25 rounded-lg appearance-none cursor-pointer accent-blue-500 border border-white/10"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: WELCOME (Formerly Step 1) */}
          {step === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
                <h1 className="text-lg font-extrabold text-primary tracking-tight">
                  Welcome to CorvusX
                </h1>
              </div>
              <p className="text-xs text-secondary leading-relaxed font-medium">
                Intelligence in the shadows. A premium, always-on-top overlay providing real-time cognitive reasoning, screen analysis, and meeting insights.
              </p>
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center mt-0.5 border border-white/20">
                    <span className="text-[10px] text-primary">🕵️</span>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-primary">Stealth HUD Overlay</h3>
                    <p className="text-[10px] text-muted">Sits silently above all your apps, invisibly, and helps you.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center mt-0.5 border border-white/20">
                    <span className="text-[10px] text-primary">🔍</span>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-primary">Multimodal Intelligence</h3>
                    <p className="text-[10px] text-muted">Instantly extracts problems from screenshots or processes voice transcription clips.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PROVIDER & API KEY (Formerly Step 2) */}
          {step === 3 && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-400" />
                <h1 className="text-lg font-bold text-primary tracking-tight">
                  Configure AI Provider
                </h1>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                  Select Provider
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Gemini */}
                  <button
                    type="button"
                    onClick={() => {
                      setProvider("gemini")
                      setHasTestedSuccessfully(false)
                      setTestStatus("idle")
                    }}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all duration-200 cursor-pointer ${
                      provider === "gemini"
                        ? "bg-white/85 border-blue-500/50 shadow-md ring-1 ring-blue-500/20 text-gray-800"
                        : "bg-white/10 border-white/25 text-primary hover:bg-white/20"
                    }`}
                  >
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      ☁️ Google Gemini
                    </span>
                    <span className="text-[9px] mt-1 leading-normal opacity-70">
                      Direct cloud connection via Google AI Studio.
                    </span>
                  </button>

                  {/* OmniKey */}
                  <button
                    type="button"
                    onClick={() => {
                      setProvider("omnikey")
                      setHasTestedSuccessfully(false)
                      setTestStatus("idle")
                    }}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all duration-200 cursor-pointer ${
                      provider === "omnikey"
                        ? "bg-white/85 border-purple-500/50 shadow-md ring-1 ring-purple-500/20 text-gray-800"
                        : "bg-white/10 border-white/25 text-primary hover:bg-white/20"
                    }`}
                  >
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      🔑 OmniKey Proxy
                    </span>
                    <span className="text-[9px] mt-1 leading-normal opacity-70">
                      Reverse LLM proxy created by felix-au.
                    </span>
                  </button>
                </div>
              </div>

              {/* API Key input */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-wider">
                    API Key
                  </label>
                  {provider === "gemini" && (
                    <a 
                      href="https://aistudio.google.com/app/apikey" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[9px] text-blue-400 hover:underline flex items-center gap-0.5 interactive"
                    >
                      Get free Gemini API Key &rarr;
                    </a>
                  )}
                  {provider === "omnikey" && (
                    <a 
                      href="https://omni-key-ai.vercel.app/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[9px] text-blue-400 hover:underline flex items-center gap-0.5 interactive"
                    >
                      Get free OmniKey Key &rarr;
                    </a>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    placeholder={
                      provider === "gemini"
                        ? "Enter Gemini Key (starts with AIzaSy...)"
                        : "Enter OmniKey Key"
                    }
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value)
                      setHasTestedSuccessfully(false)
                      setTestStatus("idle")
                    }}
                    className="w-full pl-3 pr-10 py-2 bg-white/20 border border-white/40 rounded-lg text-xs text-primary placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(p => !p)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-primary opacity-60 hover:opacity-90 cursor-pointer p-0.5 rounded transition-colors"
                  >
                    {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Connection Status & Test Button */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting || !apiKey.trim()}
                  className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400/50 text-white font-bold text-xs rounded-lg transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  {isTesting ? "Testing..." : "Test Connection"}
                </button>
                
                <div className="flex-1 text-[10px] font-semibold truncate">
                  {testStatus === "success" && (
                    <span className="text-green-500 flex items-center gap-1 font-bold">
                      <Check className="w-3.5 h-3.5" /> Connected Successfully!
                    </span>
                  )}
                  {testStatus === "error" && (
                    <span className="text-red-400 flex items-start gap-0.5 break-all max-w-[280px]">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {errorMessage}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: SELECT ASSISTANT MODE (Formerly Step 3) */}
          {step === 4 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center gap-2">
                <Laptop className="w-5 h-5 text-purple-400" />
                <h1 className="text-lg font-bold text-primary tracking-tight">
                  Choose Assistant Mode
                </h1>
              </div>

              <p className="text-xs text-secondary leading-relaxed">
                Choose the primary style for your Wingman AI. You can switch modes instantly at any time from the HUD overlay.
              </p>

              <div className="space-y-3">
                {/* Code Assistant */}
                <div
                  onClick={() => setMode("code")}
                  className={`p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                    mode === "code"
                      ? "bg-white/85 border-blue-500/50 shadow-md ring-1 ring-blue-500/20 text-gray-800"
                      : "bg-white/10 border-white/20 text-primary hover:bg-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      💻 Code Assistant (Default &amp; Recommended)
                    </span>
                    {mode === "code" && <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />}
                  </div>
                  <p className="text-[10px] mt-1 leading-normal opacity-85">
                    Designed for coding interviews or solving technical programming questions. Returns direct, concise, production-ready code with no fluff.
                  </p>
                </div>

                {/* General Assistant */}
                <div
                  onClick={() => setMode("general")}
                  className={`p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                    mode === "general"
                      ? "bg-white/85 border-purple-500/50 shadow-md ring-1 ring-purple-500/20 text-gray-800"
                      : "bg-white/10 border-white/20 text-primary hover:bg-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      🌟 General Assistant
                    </span>
                    {mode === "general" && <div className="w-2.5 h-2.5 bg-purple-500 rounded-full" />}
                  </div>
                  <p className="text-[10px] mt-1 leading-normal opacity-85">
                    Designed for general meetings, summaries, or daily tasks. Returns direct, concise, conversational replies in a single brief paragraph.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: CONTROLS & SHORTCUTS (Formerly Step 4) */}
          {step === 5 && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="flex items-center gap-2">
                <Command className="w-5 h-5 text-primary" />
                <h1 className="text-lg font-bold text-primary tracking-tight">
                  Master the Shortcuts
                </h1>
              </div>
              <p className="text-xs text-secondary">
                CorvusX sits silently in the background. Memorize these key global shortcuts to activate and use it in stealth mode:
              </p>

              <div className="space-y-2.5 pt-1 max-h-56 overflow-y-auto pr-1">
                {/* Shortcut 1 */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/10 border border-white/15">
                  <div className="text-[10px]">
                    <span className="font-bold text-primary block">Show / Center Overlay</span>
                    <span className="text-secondary opacity-80">Center overlay window on active workspace.</span>
                  </div>
                  <div className="flex gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white/30 rounded text-[9px] font-mono shadow-sm text-primary">⌘/Ctrl</kbd>
                    <kbd className="px-1.5 py-0.5 bg-white/30 rounded text-[9px] font-mono shadow-sm text-primary">Shift</kbd>
                    <kbd className="px-1.5 py-0.5 bg-white/30 rounded text-[9px] font-mono shadow-sm text-primary">Space</kbd>
                  </div>
                </div>

                {/* Shortcut 2 */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/10 border border-white/15">
                  <div className="text-[10px]">
                    <span className="font-bold text-primary block">Stealth Show / Hide</span>
                    <span className="text-secondary opacity-80">Silently toggle window visibility.</span>
                  </div>
                  <div className="flex gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white/30 rounded text-[9px] font-mono shadow-sm text-primary">⌘/Ctrl</kbd>
                    <kbd className="px-1.5 py-0.5 bg-white/30 rounded text-[9px] font-mono shadow-sm text-primary">B</kbd>
                  </div>
                </div>

                {/* Shortcut 3 */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/10 border border-white/15">
                  <div className="text-[10px]">
                    <span className="font-bold text-primary block">Screenshot Analysis</span>
                    <span className="text-secondary opacity-80">Capture current screen and analyze immediately.</span>
                  </div>
                  <div className="flex gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white/30 rounded text-[9px] font-mono shadow-sm text-primary">⌘/Ctrl</kbd>
                    <kbd className="px-1.5 py-0.5 bg-white/30 rounded text-[9px] font-mono shadow-sm text-primary">H</kbd>
                  </div>
                </div>

                 {/* Shortcut 4 */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/10 border border-white/15">
                  <div className="text-[10px]">
                    <span className="font-bold text-primary block">Reset &amp; Clear Context</span>
                    <span className="text-secondary opacity-80">Start a completely fresh chat session.</span>
                  </div>
                  <div className="flex gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white/30 rounded text-[9px] font-mono shadow-sm text-primary">⌘/Ctrl</kbd>
                    <kbd className="px-1.5 py-0.5 bg-white/30 rounded text-[9px] font-mono shadow-sm text-primary">O</kbd>
                  </div>
                </div>

                {/* Shortcut 5 */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/10 border border-white/15">
                  <div className="text-[10px]">
                    <span className="font-bold text-primary block">Clear UI Clutter</span>
                    <span className="text-secondary opacity-80">Clear chat and audio results from UI (retains context).</span>
                  </div>
                  <div className="flex gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white/30 rounded text-[9px] font-mono shadow-sm text-primary">⌘/Ctrl</kbd>
                    <kbd className="px-1.5 py-0.5 bg-white/30 rounded text-[9px] font-mono shadow-sm text-primary">U</kbd>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: READY (Formerly Step 5) */}
          {step === 6 && (
            <div className="space-y-4 text-center animate-fadeIn">
              <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto border border-green-500/20">
                <Check className="w-6 h-6 text-green-500" />
              </div>
              <h1 className="text-lg font-bold text-primary">
                You're Ready to Go!
              </h1>
              <p className="text-xs text-secondary leading-relaxed max-w-sm mx-auto">
                All settings have been successfully configured. CorvusX will now sit silently in the background. Press <kbd className="px-1 py-0.5 bg-black/10 rounded text-[9px] font-mono text-primary">⌘/Ctrl+B</kbd> at any time to toggle the overlay.
              </p>
              
              <div className="p-3 bg-white/10 rounded-xl border border-white/20 inline-block text-left text-[10px] space-y-1 mx-auto max-w-sm">
                <div className="text-primary">🎯 <strong>Initial Mode:</strong> {mode === "code" ? "Code Assistant" : "General Assistant"}</div>
                <div className="text-primary">📡 <strong>Provider:</strong> {provider === "gemini" ? "Google Gemini" : "OmniKey"}</div>
                <div className="text-primary">🎨 <strong>Theme:</strong> {theme === "light" ? "Light Backdrop" : "Dark Backdrop"} ({Math.round(opacity * 100)}% Opacity)</div>
                <div className="text-muted italic mt-1 text-center">Settings saved in config.json</div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10 glass-content">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-primary font-semibold text-xs rounded-lg transition-all border border-white/20 flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          ) : (
            <div />
          )}

          {step < 6 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={step === 3 && !hasTestedSuccessfully}
              className="px-4 py-1.5 bg-gray-700 hover:bg-gray-800 disabled:bg-gray-400 text-white font-bold text-xs rounded-lg transition-all shadow-md flex items-center gap-1 cursor-pointer"
            >
              Next <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="px-5 py-1.5 bg-green-600 hover:bg-green-700 text-white font-extrabold text-xs rounded-lg transition-all shadow-md cursor-pointer"
            >
              Launch CorvusX
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
