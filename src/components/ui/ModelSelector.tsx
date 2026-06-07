import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Check, AlertTriangle } from 'lucide-react';

interface ModelSelectorProps {
  onModelChange?: (provider: "gemini", model: string) => void;
  onChatOpen?: () => void;
  mode?: 'code' | 'general';
  onModeSwitch?: (mode: 'code' | 'general') => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ onModelChange, onChatOpen, mode: propMode, onModeSwitch }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [provider, setProvider] = useState<'gemini' | 'omnikey'>('gemini');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedGeminiModel, setSelectedGeminiModel] = useState<string>("gemini-2.5-flash");
  const [customGeminiModel, setCustomGeminiModel] = useState<string>("");
  const [showCustomModelInput, setShowCustomModelInput] = useState<boolean>(false);
  const [mode, setMode] = useState<'code' | 'general'>(propMode || 'code');
  
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'success' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  const [currentTheme, setCurrentTheme] = useState<"light" | "dark">("dark");
  const [currentOpacity, setCurrentOpacity] = useState<number>(0.25);

  // Sync mode from props
  useEffect(() => {
    if (propMode) {
      setMode(propMode);
    }
  }, [propMode]);

  useEffect(() => {
    loadCurrentConfig();
  }, []);

  const loadCurrentConfig = async () => {
    try {
      setIsLoading(true);
      const config = await window.electronAPI.invoke("get-app-config");
      if (config) {
        setProvider(config.provider || "gemini");
        setGeminiApiKey(config.apiKey || "");
        setCurrentTheme(config.theme || "dark");
        setCurrentOpacity(config.opacity !== undefined ? config.opacity : 0.25);
        
        const modelName = config.model || "gemini-2.5-flash";
        const standardModels = [
          "auto",
          "gemini-3.5-flash",
          "gemini-3-flash-preview",
          "gemini-2.5-flash",
          "gemini-3.1-flash-lite-preview",
          "gemini-2.5-flash-lite"
        ];
        
        if (standardModels.includes(modelName)) {
          setSelectedGeminiModel(modelName);
          setShowCustomModelInput(false);
        } else {
          setSelectedGeminiModel("custom");
          setCustomGeminiModel(modelName);
          setShowCustomModelInput(true);
        }
      }

      const activeMode = await window.electronAPI.getLlmMode();
      setMode(activeMode);
    } catch (error) {
      console.error('Error loading current config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModeSwitch = async (newMode: 'code' | 'general') => {
    try {
      setMode(newMode);
      await window.electronAPI.setLlmMode(newMode);
      onModeSwitch?.(newMode);
    } catch (error) {
      console.error('Error switching mode:', error);
    }
  };

  const testConnection = async () => {
    try {
      setConnectionStatus('testing');
      setErrorMessage('');
      
      let keyToTest = geminiApiKey.trim();
      if (provider === "omnikey" && !keyToTest.startsWith("omnikey-")) {
        keyToTest = "omnikey-" + keyToTest;
      }

      const modelToUse = selectedGeminiModel === 'custom' ? customGeminiModel : selectedGeminiModel;
      const result = await window.electronAPI.testLlmConnection(keyToTest || undefined, modelToUse);
      setConnectionStatus(result.success ? 'success' : 'error');
      if (!result.success) {
        setErrorMessage(result.error || 'Unknown error');
      }
    } catch (error) {
      setConnectionStatus('error');
      setErrorMessage(String(error));
    }
  };

  const handleApplyChanges = async () => {
    try {
      setConnectionStatus('testing');
      setErrorMessage('');
      
      let keyToUse = geminiApiKey.trim();
      if (provider === "omnikey" && !keyToUse.startsWith("omnikey-")) {
        keyToUse = "omnikey-" + keyToUse;
      }

      const modelToUse = selectedGeminiModel === 'custom' ? customGeminiModel : selectedGeminiModel;
      const result = await window.electronAPI.switchToGemini(keyToUse || undefined, modelToUse);

      if (result.success) {
        // Save complete configuration in backend
        await window.electronAPI.invoke(
          "complete-onboarding",
          keyToUse,
          provider,
          modelToUse,
          mode,
          currentTheme,
          currentOpacity
        );

        await loadCurrentConfig();
        setConnectionStatus('success');
        onModelChange?.("gemini", modelToUse);
        
        // Auto-open chat window after successful model change
        setTimeout(() => {
          onChatOpen?.();
        }, 500);
      } else {
        setConnectionStatus('error');
        setErrorMessage(result.error || 'Switch failed');
      }
    } catch (error) {
      setConnectionStatus('error');
      setErrorMessage(String(error));
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'testing': return 'text-yellow-500';
      case 'success': return 'text-green-500';
      case 'error': return 'text-red-400';
      default: return 'text-muted';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'testing': return 'Testing connection...';
      case 'success': return 'Connected successfully';
      case 'error': return errorMessage ? `Error: ${errorMessage}` : 'Connection failed';
      default: return 'Ready';
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 liquid-glass rounded-lg border border-black/10 dark:border-white/20">
        <div className="animate-pulse text-xs text-secondary">Loading configuration...</div>
      </div>
    );
  }

  return (
    <div className="p-4 liquid-glass rounded-lg border border-black/10 dark:border-white/20 space-y-4 text-left">
      <div className="flex items-center justify-between pb-2 border-b border-black/10 dark:border-white/10">
        <h3 className="text-xs font-bold text-primary tracking-wider uppercase">AI Model Selection</h3>
        <div className={`text-[10px] font-bold ${getStatusColor()}`}>
          {getStatusText()}
        </div>
      </div>

      {/* Mode selection (Code vs General) */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-muted uppercase tracking-wider block">AI Mode</label>
        <div className="space-y-2">
          {/* Code Assistant */}
          <div
            onClick={() => handleModeSwitch('code')}
            className={`p-2.5 rounded-xl border cursor-pointer transition-all duration-200 ${
              mode === 'code'
                ? 'bg-white/10 dark:bg-white/20 border-blue-500/50 shadow-md ring-1 ring-blue-500/20 text-primary font-medium'
                : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-secondary hover:bg-black/10 dark:hover:bg-white/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold flex items-center gap-1.5">
                💻 Code Assistant (Default)
              </span>
              {mode === 'code' && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
            </div>
            <p className="text-[9px] mt-0.5 leading-normal opacity-85">
              Returns direct, concise, production-ready code.
            </p>
          </div>

          {/* General Assistant */}
          <div
            onClick={() => handleModeSwitch('general')}
            className={`p-2.5 rounded-xl border cursor-pointer transition-all duration-200 ${
              mode === 'general'
                ? 'bg-white/10 dark:bg-white/20 border-purple-500/50 shadow-md ring-1 ring-purple-500/20 text-primary font-medium'
                : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-secondary hover:bg-black/10 dark:hover:bg-white/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold flex items-center gap-1.5">
                🌟 General Assistant
              </span>
              {mode === 'general' && <div className="w-2 h-2 bg-purple-500 rounded-full" />}
            </div>
            <p className="text-[9px] mt-0.5 leading-normal opacity-85">
              Conversational and generic explanations.
            </p>
          </div>
        </div>
      </div>

      {/* Provider selection (Gemini vs OmniKey) */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-muted uppercase tracking-wider block">AI Provider</label>
        <div className="grid grid-cols-2 gap-2">
          {/* Gemini */}
          <button
            type="button"
            onClick={() => {
              setProvider("gemini");
              setConnectionStatus(null);
            }}
            className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all duration-200 cursor-pointer ${
              provider === "gemini"
                ? "bg-white/10 dark:bg-white/20 border-blue-500/50 text-primary shadow-sm"
                : "bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-secondary hover:bg-black/10 dark:hover:bg-white/10"
            }`}
          >
            <span className="text-[10px] font-bold">☁️ Google Gemini</span>
            <span className="text-[8px] mt-0.5 opacity-70">Direct connection</span>
          </button>

          {/* OmniKey */}
          <button
            type="button"
            onClick={() => {
              setProvider("omnikey");
              setConnectionStatus(null);
            }}
            className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all duration-200 cursor-pointer ${
              provider === "omnikey"
                ? "bg-white/10 dark:bg-white/20 border-purple-500/50 text-primary shadow-sm"
                : "bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-secondary hover:bg-black/10 dark:hover:bg-white/10"
            }`}
          >
            <span className="text-[10px] font-bold">🔑 OmniKey Proxy</span>
            <span className="text-[8px] mt-0.5 opacity-70">Reverse LLM proxy</span>
          </button>
        </div>
      </div>

      {/* API Key */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <label className="text-[10px] font-bold text-muted uppercase tracking-wider">API Key</label>
          {provider === "gemini" ? (
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-[9px] text-blue-400 hover:underline">
              Get free Gemini Key &rarr;
            </a>
          ) : (
            <a href="https://omni-key-ai.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-[9px] text-blue-400 hover:underline">
              Get free OmniKey Key &rarr;
            </a>
          )}
        </div>
        <div className="relative">
          <input
            type={showApiKey ? "text" : "password"}
            placeholder={provider === "gemini" ? "Enter Gemini Key (starts with AIzaSy...)" : "Enter OmniKey Key"}
            value={geminiApiKey}
            onChange={(e) => {
              setGeminiApiKey(e.target.value);
              setConnectionStatus(null);
            }}
            className="w-full pl-3 pr-10 py-1.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/20 rounded-lg text-xs text-primary placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500/40 font-mono"
          />
          <button
            type="button"
            onClick={() => setShowApiKey(p => !p)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-primary opacity-60 hover:opacity-90 cursor-pointer p-0.5 rounded"
          >
            {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Model select */}
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-muted uppercase tracking-wider block">Model</label>
        <select
          value={selectedGeminiModel}
          onChange={(e) => {
            const val = e.target.value;
            setSelectedGeminiModel(val);
            setShowCustomModelInput(val === 'custom');
            setConnectionStatus(null);
          }}
          className="w-full px-3 py-1.5 bg-black/5 dark:bg-white/5 text-primary border border-black/10 dark:border-white/20 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/40 animate-none"
        >
          <option className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value="auto">auto (Recommended for OmniKey)</option>
          <option className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value="gemini-3.5-flash">gemini-3.5-flash</option>
          <option className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value="gemini-3-flash-preview">gemini-3-flash-preview</option>
          <option className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value="gemini-2.5-flash">gemini-2.5-flash (Default)</option>
          <option className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value="gemini-3.1-flash-lite-preview">gemini-3.1-flash-lite-preview</option>
          <option className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value="gemini-2.5-flash-lite">gemini-2.5-flash-lite</option>
          <option className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value="custom">Custom Model Name...</option>
        </select>
      </div>

      {showCustomModelInput && (
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-muted uppercase tracking-wider block">Custom Model Name</label>
          <input
            type="text"
            placeholder="e.g. llama-3.3-70b-versatile"
            value={customGeminiModel}
            onChange={(e) => {
              setCustomGeminiModel(e.target.value);
              setConnectionStatus(null);
            }}
            className="w-full px-3 py-1.5 bg-black/5 dark:bg-white/5 text-primary border border-black/10 dark:border-white/20 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/40"
          />
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-2 border-t border-black/10 dark:border-white/10">
        <button
          onClick={handleApplyChanges}
          disabled={connectionStatus === 'testing' || !geminiApiKey.trim()}
          className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all shadow-md cursor-pointer"
        >
          {connectionStatus === 'testing' ? 'Applying...' : 'Apply Changes'}
        </button>

        <button
          onClick={testConnection}
          disabled={connectionStatus === 'testing' || !geminiApiKey.trim()}
          className="px-3 py-2 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all shadow-md cursor-pointer"
        >
          Test
        </button>
      </div>
    </div>
  );
};

export default ModelSelector;