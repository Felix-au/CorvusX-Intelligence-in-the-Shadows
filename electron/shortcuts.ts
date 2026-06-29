import { globalShortcut, app } from "electron"
import { AppState } from "./main" // Adjust the import path if necessary

export class ShortcutsHelper {
  private appState: AppState

  constructor(appState: AppState) {
    this.appState = appState
  }

  public registerGlobalShortcuts(): void {
    // Unregister any active shortcuts first to prevent double-registration errors
    globalShortcut.unregisterAll()

    const config = this.appState.configHelper.loadConfig()
    const shortcuts = config.shortcuts || {
      showCenter: "CommandOrControl+Shift+Space",
      screenshot: "CommandOrControl+H",
      toggleStealth: "CommandOrControl+B",
      toggleSettings: "CommandOrControl+I",
      copyLatest: "CommandOrControl+Alt+C",
      newSession: "CommandOrControl+O",
      declutter: "CommandOrControl+U",
      toggleVoice: "CommandOrControl+Shift+V",
      toggleGhostKeyboard: "CommandOrControl+Alt+X",
      simulateTyping: "CommandOrControl+Alt+K",
      regenerate: "CommandOrControl+Shift+Y"
    }

    // Register showCenter shortcut
    try {
      globalShortcut.register(shortcuts.showCenter, () => {
        console.log("Show/Center window shortcut pressed...")
        this.appState.centerAndShowWindow()
      })
    } catch (err) {
      console.error("Failed to register showCenter shortcut:", err)
    }

    // Register screenshot shortcut
    try {
      globalShortcut.register(shortcuts.screenshot, async () => {
        const mainWindow = this.appState.getMainWindow()
        if (mainWindow) {
          console.log("Taking screenshot...")
          try {
            const screenshotPath = await this.appState.takeScreenshot()
            const preview = await this.appState.getImagePreview(screenshotPath)
            mainWindow.webContents.send("screenshot-taken", {
              path: screenshotPath,
              preview
            })
          } catch (error) {
            console.error("Error capturing screenshot:", error)
          }
        }
      })
    } catch (err) {
      console.error("Failed to register screenshot shortcut:", err)
    }

    // Register toggleStealth shortcut
    try {
      globalShortcut.register(shortcuts.toggleStealth, () => {
        this.appState.toggleMainWindow()
        // If window exists and we're showing it, bring it to front
        const mainWindow = this.appState.getMainWindow()
        if (mainWindow && !this.appState.isVisible()) {
          // Force the window to the front on macOS
          if (process.platform === "darwin") {
            mainWindow.setAlwaysOnTop(true, "normal")
            // Reset alwaysOnTop after a brief delay
            setTimeout(() => {
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.setAlwaysOnTop(true, "floating")
              }
            }, 100)
          }
        }
      })
    } catch (err) {
      console.error("Failed to register toggleStealth shortcut:", err)
    }

    // Register toggleVoice shortcut
    try {
      globalShortcut.register(shortcuts.toggleVoice, () => {
        const mainWindow = this.appState.getMainWindow()
        if (mainWindow) {
          console.log("Toggling voice recording...")
          mainWindow.webContents.send("toggle-voice-recording")
        }
      })
    } catch (err) {
      console.error("Failed to register toggleVoice shortcut:", err)
    }

    // Register copyLatest shortcut
    try {
      globalShortcut.register(shortcuts.copyLatest, () => {
        const mainWindow = this.appState.getMainWindow()
        if (mainWindow) {
          console.log("Global copy shortcut pressed...")
          mainWindow.webContents.send("copy-latest-response")
        }
      })
    } catch (err) {
      console.error("Failed to register copyLatest shortcut:", err)
    }

    // Register toggleGhostKeyboard shortcut
    try {
      const ghostShortcut = shortcuts.toggleGhostKeyboard || "CommandOrControl+Alt+X"
      globalShortcut.register(ghostShortcut, () => {
        console.log("Toggle ghost keyboard shortcut pressed...")
        this.appState.ghostKeyboardHelper.toggle()
      })
    } catch (err) {
      console.error("Failed to register toggleGhostKeyboard shortcut:", err)
    }

    // Register simulateTyping shortcut
    try {
      const typingShortcut = shortcuts.simulateTyping || "CommandOrControl+Alt+K"
      globalShortcut.register(typingShortcut, () => {
        if (this.appState.typingSimulator.isCurrentlyTyping()) {
          console.log("Typing is already active, cancelling...")
          this.appState.typingSimulator.cancelTyping()
        } else {
          const mainWindow = this.appState.getMainWindow()
          if (mainWindow && !mainWindow.isDestroyed()) {
            console.log("Triggering typing simulation...")
            mainWindow.webContents.send("simulate-latest-response")
          }
        }
      })
    } catch (err) {
      console.error("Failed to register simulateTyping shortcut:", err)
    }

    // Register regenerate shortcut
    try {
      const regenerateShortcut = shortcuts.regenerate || "CommandOrControl+Shift+Y"
      globalShortcut.register(regenerateShortcut, () => {
        const mainWindow = this.appState.getMainWindow()
        if (mainWindow && !mainWindow.isDestroyed()) {
          console.log("Triggering regeneration via global hotkey...")
          mainWindow.webContents.send("regenerate-last-response")
        }
      })
    } catch (err) {
      console.error("Failed to register regenerate shortcut:", err)
    }

    // Unregister shortcuts when quitting
    app.on("will-quit", () => {
      globalShortcut.unregisterAll()
    })
  }
}

