// ipcHandlers.ts

import { ipcMain, app, globalShortcut } from "electron"
import { AppState } from "./main"

export function initializeIpcHandlers(appState: AppState): void {
  ipcMain.handle(
    "update-content-dimensions",
    async (event, { width, height }: { width: number; height: number }) => {
      if (width && height) {
        appState.setWindowDimensions(width, height)
      }
    }
  )

  ipcMain.handle("delete-screenshot", async (event, path: string) => {
    return appState.deleteScreenshot(path)
  })

  ipcMain.handle("take-screenshot", async () => {
    try {
      const screenshotPath = await appState.takeScreenshot()
      const preview = await appState.getImagePreview(screenshotPath)
      return { path: screenshotPath, preview }
    } catch (error) {
      console.error("Error taking screenshot:", error)
      throw error
    }
  })

  ipcMain.handle("get-screenshots", async () => {
    console.log({ view: appState.getView() })
    try {
      let previews = []
      if (appState.getView() === "queue") {
        previews = await Promise.all(
          appState.getScreenshotQueue().map(async (path) => ({
            path,
            preview: await appState.getImagePreview(path)
          }))
        )
      } else {
        previews = await Promise.all(
          appState.getExtraScreenshotQueue().map(async (path) => ({
            path,
            preview: await appState.getImagePreview(path)
          }))
        )
      }
      previews.forEach((preview: any) => console.log(preview.path))
      return previews
    } catch (error) {
      console.error("Error getting screenshots:", error)
      throw error
    }
  })

  ipcMain.handle("toggle-window", async () => {
    appState.toggleMainWindow()
  })

  ipcMain.handle("reset-queues", async () => {
    try {
      appState.clearQueues()
      console.log("Screenshot queues have been cleared.")
      return { success: true }
    } catch (error: any) {
      console.error("Error resetting queues:", error)
      return { success: false, error: error.message }
    }
  })

  // IPC handler for analyzing audio from base64 data
  ipcMain.handle("analyze-audio-base64", async (event, data: string, mimeType: string) => {
    try {
      const result = await appState.processingHelper.processAudioBase64(data, mimeType)
      return result
    } catch (error: any) {
      console.error("Error in analyze-audio-base64 handler:", error)
      throw error
    }
  })

  // IPC handler for analyzing audio from file path
  ipcMain.handle("analyze-audio-file", async (event, path: string) => {
    try {
      const result = await appState.processingHelper.processAudioFile(path)
      return result
    } catch (error: any) {
      console.error("Error in analyze-audio-file handler:", error)
      throw error
    }
  })

  // IPC handler for analyzing image from file path
  ipcMain.handle("analyze-image-file", async (event, path: string) => {
    try {
      const result = await appState.processingHelper.getLLMHelper().analyzeImageFile(path)
      return result
    } catch (error: any) {
      console.error("Error in analyze-image-file handler:", error)
      throw error
    }
  })

  ipcMain.handle("gemini-chat", async (event, message: string, imagePaths?: string[]) => {
    try {
      const result = await appState.processingHelper.getLLMHelper().chatWithGemini(message, imagePaths);
      return result;
    } catch (error: any) {
      console.error("Error in gemini-chat handler:", error);
      throw error;
    }
  });

  ipcMain.handle("quit-app", () => {
    app.quit()
  })

  // Window movement handlers
  ipcMain.handle("move-window-left", async () => {
    appState.moveWindowLeft()
  })

  ipcMain.handle("move-window-right", async () => {
    appState.moveWindowRight()
  })

  ipcMain.handle("move-window-up", async () => {
    appState.moveWindowUp()
  })

  ipcMain.handle("move-window-down", async () => {
    appState.moveWindowDown()
  })

  ipcMain.handle("center-and-show-window", async () => {
    appState.centerAndShowWindow()
  })

  // LLM Model Management Handlers
  ipcMain.handle("get-current-llm-config", async () => {
    try {
      const llmHelper = appState.processingHelper.getLLMHelper();
      return {
        provider: llmHelper.getCurrentProvider(),
        model: llmHelper.getCurrentModel(),
        isOllama: false
      };
    } catch (error: any) {
      console.error("Error getting current LLM config:", error);
      throw error;
    }
  });

  ipcMain.handle("switch-to-gemini", async (_, apiKey?: string, model?: string) => {
    try {
      const llmHelper = appState.processingHelper.getLLMHelper();
      await llmHelper.switchToGemini(apiKey, model);
      return { success: true };
    } catch (error: any) {
      console.error("Error switching to Gemini/OmniKey:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("test-llm-connection", async (event, apiKey?: string, model?: string) => {
    try {
      const llmHelper = appState.processingHelper.getLLMHelper();
      const result = await llmHelper.testConnection(apiKey, model);
      return result;
    } catch (error: any) {
      console.error("Error testing LLM connection:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("get-llm-mode", async () => {
    try {
      const llmHelper = appState.processingHelper.getLLMHelper();
      return llmHelper.getMode();
    } catch (error: any) {
      console.error("Error getting LLM mode:", error);
      throw error;
    }
  });

  ipcMain.handle("set-llm-mode", async (_, mode: 'code' | 'general') => {
    try {
      const llmHelper = appState.processingHelper.getLLMHelper();
      llmHelper.setMode(mode);
      return { success: true };
    } catch (error: any) {
      console.error("Error setting LLM mode:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("clear-chat-context", async () => {
    try {
      appState.processingHelper.getLLMHelper().clearChatHistory();
      return { success: true };
    } catch (error: any) {
      console.error("Error clearing chat context:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("get-onboarding-status", async () => {
    try {
      const config = appState.configHelper.loadConfig();
      return config.onboardingCompleted;
    } catch (error: any) {
      console.error("Error getting onboarding status:", error);
      return false;
    }
  });

  ipcMain.handle("get-app-config", async () => {
    try {
      return appState.configHelper.loadConfig();
    } catch (error: any) {
      console.error("Error getting app config:", error);
      throw error;
    }
  });

  ipcMain.handle("complete-onboarding", async (_, apiKey: string, provider: 'gemini' | 'omnikey', model: string, mode: 'code' | 'general', theme?: 'light' | 'dark', opacity?: number, onboardingCompleted?: boolean, pulseEnabled?: boolean, codingLanguage?: string) => {
    try {
      const llmHelper = appState.processingHelper.getLLMHelper();
      
      // Update config file
      appState.configHelper.updateConfig({
        onboardingCompleted: onboardingCompleted !== undefined ? onboardingCompleted : true,
        apiKey,
        provider,
        model,
        mode,
        theme: theme || 'dark',
        opacity: opacity !== undefined ? opacity : 0.25,
        pulseEnabled: pulseEnabled !== undefined ? pulseEnabled : true,
        codingLanguage: codingLanguage || 'Auto-Detect'
      });

      // Switch in memory
      await llmHelper.switchToGemini(apiKey, model);
      llmHelper.setMode(mode);

      return { success: true };
    } catch (error: any) {
      console.error("Error completing onboarding:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("get-shortcuts", async () => {
    try {
      const config = appState.configHelper.loadConfig()
      return config.shortcuts
    } catch (error: any) {
      console.error("Error getting shortcuts:", error)
      throw error
    }
  })

  ipcMain.handle("save-shortcuts", async (_, newShortcuts: any) => {
    try {
      appState.configHelper.updateConfig({ shortcuts: newShortcuts })
      appState.shortcutsHelper.registerGlobalShortcuts()
      
      const mainWindow = appState.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("shortcuts-updated", newShortcuts)
      }
      
      return { success: true }
    } catch (error: any) {
      console.error("Error saving shortcuts:", error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle("toggle-global-enter", async (_, enable: boolean) => {
    try {
      if (enable) {
        if (!globalShortcut.isRegistered("Enter")) {
          globalShortcut.register("Enter", () => {
            const mainWindow = appState.getMainWindow()
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send("global-enter-pressed")
            }
          })
        }
      } else {
        if (globalShortcut.isRegistered("Enter")) {
          globalShortcut.unregister("Enter")
        }
      }
      return { success: true }
    } catch (error: any) {
      console.error("Error toggling global enter:", error)
      return { success: false, error: error.message }
    }
  })
}
