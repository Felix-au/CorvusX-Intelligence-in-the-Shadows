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
      reset: "CommandOrControl+R",
      toggleStealth: "CommandOrControl+B",
      moveLeft: "CommandOrControl+Left",
      moveRight: "CommandOrControl+Right",
      moveUp: "CommandOrControl+Up",
      moveDown: "CommandOrControl+Down"
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

    // Register reset shortcut
    try {
      globalShortcut.register(shortcuts.reset, () => {
        console.log(
          "Command + R pressed. Canceling requests and resetting queues..."
        )

        // Cancel ongoing API requests
        this.appState.processingHelper.cancelOngoingRequests()

        // Clear both screenshot queues
        this.appState.clearQueues()

        console.log("Cleared queues.")

        // Update the view state to 'queue'
        this.appState.setView("queue")

        // Notify renderer process to switch view to 'queue'
        const mainWindow = this.appState.getMainWindow()
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("reset-view")
        }
      })
    } catch (err) {
      console.error("Failed to register reset shortcut:", err)
    }

    // Register moveLeft shortcut
    try {
      globalShortcut.register(shortcuts.moveLeft, () => {
        console.log("Move window left shortcut pressed.")
        this.appState.moveWindowLeft()
      })
    } catch (err) {
      console.error("Failed to register moveLeft shortcut:", err)
    }

    // Register moveRight shortcut
    try {
      globalShortcut.register(shortcuts.moveRight, () => {
        console.log("Move window right shortcut pressed.")
        this.appState.moveWindowRight()
      })
    } catch (err) {
      console.error("Failed to register moveRight shortcut:", err)
    }

    // Register moveDown shortcut
    try {
      globalShortcut.register(shortcuts.moveDown, () => {
        console.log("Move window down shortcut pressed.")
        this.appState.moveWindowDown()
      })
    } catch (err) {
      console.error("Failed to register moveDown shortcut:", err)
    }

    // Register moveUp shortcut
    try {
      globalShortcut.register(shortcuts.moveUp, () => {
        console.log("Move window up shortcut pressed.")
        this.appState.moveWindowUp()
      })
    } catch (err) {
      console.error("Failed to register moveUp shortcut:", err)
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

    // Unregister shortcuts when quitting
    app.on("will-quit", () => {
      globalShortcut.unregisterAll()
    })
  }
}

