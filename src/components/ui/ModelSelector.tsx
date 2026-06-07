import React, { useState, useEffect } from 'react';

interface ModelConfig {
  provider: "gemini";
  model: string;
}

interface ModelSelectorProps {
  onModelChange?: (provider: "gemini", model: string) => void;
  onChatOpen?: () => void;
  mode?: 'code' | 'general';
  onModeSwitch?: (mode: 'code' | 'general') => void;
  theme?: "light" | "dark";
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ onModelChange, onChatOpen, mode: propMode, onModeSwitch, theme = "dark" }) => {
  const [currentConfig, setCurrentConfig] = useState<ModelConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'success' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [selectedGeminiModel, setSelectedGeminiModel] = useState<string>("gemini-2.5-flash");
  const [customGeminiModel, setCustomGeminiModel] = useState<string>("");
  const [showCustomModelInput, setShowCustomModelInput] = useState<boolean>(false);
  const [mode, setMode] = useState<'code' | 'general'>(propMode || 'code');

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
      const config = await window.electronAPI.getCurrentLlmConfig();
      setCurrentConfig({
        provider: "gemini",
        model: config.model
      });

      const standardModels = [
        "auto",
        "gemini-3.5-flash",
        "gemini-3-flash-preview",
        "gemini-2.5-flash",
        "gemini-3.1-flash-lite-preview",
        "gemini-2.5-flash-lite"
      ];
      if (standardModels.includes(config.model)) {
        setSelectedGeminiModel(config.model);
        setShowCustomModelInput(false);
      } else {
        setSelectedGeminiModel("custom");
        setCustomGeminiModel(config.model);
        setShowCustomModelInput(true);
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
      const modelToUse = selectedGeminiModel === 'custom' ? customGeminiModel : selectedGeminiModel;
      const result = await window.electronAPI.testLlmConnection(geminiApiKey || undefined, modelToUse);
      setConnectionStatus(result.success ? 'success' : 'error');
      if (!result.success) {
        setErrorMessage(result.error || 'Unknown error');
      }
    } catch (error) {
      setConnectionStatus('error');
      setErrorMessage(String(error));
    }
  };

  const handleProviderSwitch = async () => {
    try {
      setConnectionStatus('testing');
      const modelToUse = selectedGeminiModel === 'custom' ? customGeminiModel : selectedGeminiModel;
      const result = await window.electronAPI.switchToGemini(geminiApiKey || undefined, modelToUse);

      if (result.success) {
        await loadCurrentConfig();
        setConnectionStatus('success');
        const activeModel = selectedGeminiModel === 'custom' ? customGeminiModel : selectedGeminiModel;
        onModelChange?.("gemini", activeModel);
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
      case 'testing': return 'text-yellow-600';
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'testing': return 'Testing connection...';
      case 'success': return 'Connected successfully';
      case 'error': return `Error: ${errorMessage}`;
      default: return 'Ready';
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 bg-black/5 dark:bg-white/10 backdrop-blur-md rounded-lg border border-black/10 dark:border-white/20">
        <div className="animate-pulse text-sm text-secondary">Loading model configuration...</div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-black/5 dark:bg-white/10 backdrop-blur-md rounded-lg border border-black/10 dark:border-white/20 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-primary">AI Model Selection</h3>
        <div className={`text-xs ${getStatusColor()}`}>
          {getStatusText()}
        </div>
      </div>

      {/* Mode selection (Code vs General) */}
      <div className="space-y-1.5 bg-black/5 dark:bg-white/10 p-2 rounded-lg border border-black/10 dark:border-white/20">
        <label className="text-xs font-bold text-primary block">AI Mode</label>
        <div className="flex gap-2 p-0.5 bg-black/20 dark:bg-black/40 rounded-lg border border-black/10 dark:border-white/10">
          <button
            type="button"
            onClick={() => handleModeSwitch('code')}
            className={`flex-1 py-1 text-xs font-semibold rounded transition-all duration-200 ${
              mode === 'code'
                ? 'bg-white dark:bg-white/25 text-gray-900 dark:text-white shadow-sm'
                : 'text-secondary opacity-70 hover:opacity-100'
            }`}
          >
            💻 Code (Default)
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch('general')}
            className={`flex-1 py-1 text-xs font-semibold rounded transition-all duration-200 ${
              mode === 'general'
                ? 'bg-white dark:bg-white/25 text-gray-900 dark:text-white shadow-sm'
                : 'text-secondary opacity-70 hover:opacity-100'
            }`}
          >
            🌟 General
          </button>
        </div>
      </div>

      {/* Provider-specific settings (Gemini/OmniKey only) */}
      <div className="space-y-1.5">
        <div className="space-y-1">
          <label className="text-xs font-bold text-primary block">API Key</label>
          <input
            type="password"
            placeholder="Enter Gemini or OmniKey API Key (AIzaSy... or omnikey-...)"
            value={geminiApiKey}
            onChange={(e) => setGeminiApiKey(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white/50 dark:bg-white/10 text-primary border border-black/15 dark:border-white/30 rounded focus:outline-none focus:ring-2 focus:ring-blue-400/60"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-secondary">Model</label>
          <select
            value={selectedGeminiModel}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedGeminiModel(val);
              setShowCustomModelInput(val === 'custom');
            }}
            className="w-full px-3 py-2 text-xs bg-white/50 dark:bg-white/10 text-primary border border-black/15 dark:border-white/30 rounded focus:outline-none focus:ring-2 focus:ring-blue-400/60"
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
          <div>
            <label className="text-xs font-medium text-secondary">Custom Model Name</label>
            <input
              type="text"
              placeholder="e.g. llama-3.3-70b-versatile"
              value={customGeminiModel}
              onChange={(e) => setCustomGeminiModel(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white/50 dark:bg-white/10 text-primary border border-black/15 dark:border-white/30 rounded focus:outline-none focus:ring-2 focus:ring-blue-400/60"
            />
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleProviderSwitch}
          disabled={connectionStatus === 'testing'}
          className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-xs rounded transition-all shadow-md cursor-pointer"
        >
          {connectionStatus === 'testing' ? 'Switching...' : 'Apply Changes'}
        </button>

        <button
          onClick={testConnection}
          disabled={connectionStatus === 'testing'}
          className="px-3 py-2 bg-gray-500 hover:bg-gray-600 disabled:opacity-50 text-white text-xs rounded transition-all shadow-md cursor-pointer"
        >
          Test
        </button>
      </div>

      {/* Help text */}
      <div className="text-xs text-secondary space-y-1">
        <div>💡 <strong>Gemini/OmniKey:</strong> Cloud API or Proxy Key (AIzaSy... or omnikey-...)</div>
      </div>
    </div>
  );
};

export default ModelSelector;