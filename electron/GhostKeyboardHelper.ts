import { uIOhook } from "uiohook-napi"
import { BrowserWindow } from "electron"
import { AppState } from "./main"

const KEY_MAP: Record<number, { normal: string; shift: string }> = {
  // Letters
  30: { normal: "a", shift: "A" },
  48: { normal: "b", shift: "B" },
  46: { normal: "c", shift: "C" },
  32: { normal: "d", shift: "D" },
  18: { normal: "e", shift: "E" },
  33: { normal: "f", shift: "F" },
  34: { normal: "g", shift: "G" },
  35: { normal: "h", shift: "H" },
  23: { normal: "i", shift: "I" },
  36: { normal: "j", shift: "J" },
  37: { normal: "k", shift: "K" },
  38: { normal: "l", shift: "L" },
  50: { normal: "m", shift: "M" },
  49: { normal: "n", shift: "N" },
  24: { normal: "o", shift: "O" },
  25: { normal: "p", shift: "P" },
  16: { normal: "q", shift: "Q" },
  19: { normal: "r", shift: "R" },
  31: { normal: "s", shift: "S" },
  20: { normal: "t", shift: "T" },
  22: { normal: "u", shift: "U" },
  47: { normal: "v", shift: "V" },
  17: { normal: "w", shift: "W" },
  45: { normal: "x", shift: "X" },
  21: { normal: "y", shift: "Y" },
  44: { normal: "z", shift: "Z" },

  // Numbers
  2: { normal: "1", shift: "!" },
  3: { normal: "2", shift: "@" },
  4: { normal: "3", shift: "#" },
  5: { normal: "4", shift: "$" },
  6: { normal: "5", shift: "%" },
  7: { normal: "6", shift: "^" },
  8: { normal: "7", shift: "&" },
  9: { normal: "8", shift: "*" },
  10: { normal: "9", shift: "(" },
  11: { normal: "0", shift: ")" },

  // Symbols
  39: { normal: ";", shift: ":" },
  13: { normal: "=", shift: "+" },
  51: { normal: ",", shift: "<" },
  12: { normal: "-", shift: "_" },
  52: { normal: ".", shift: ">" },
  53: { normal: "/", shift: "?" },
  41: { normal: "`", shift: "~" },
  26: { normal: "[", shift: "{" },
  43: { normal: "\\", shift: "|" },
  27: { normal: "]", shift: "}" },
  40: { normal: "'", shift: "\"" },

  // Space
  57: { normal: " ", shift: " " },

  // Numpad Keys
  82: { normal: "0", shift: "0" },
  79: { normal: "1", shift: "1" },
  80: { normal: "2", shift: "2" },
  81: { normal: "3", shift: "3" },
  75: { normal: "4", shift: "4" },
  76: { normal: "5", shift: "5" },
  77: { normal: "6", shift: "6" },
  71: { normal: "7", shift: "7" },
  72: { normal: "8", shift: "8" },
  73: { normal: "9", shift: "9" },
  55: { normal: "*", shift: "*" },
  78: { normal: "+", shift: "+" },
  74: { normal: "-", shift: "-" },
  83: { normal: ".", shift: "." },
  3637: { normal: "/", shift: "/" }
}

export class GhostKeyboardHelper {
  private isActive = false
  private appState: AppState
  private onKeyDownHandler: ((e: any) => void) | null = null

  constructor(appState: AppState) {
    this.appState = appState
  }

  public toggle(state?: boolean) {
    const targetState = state !== undefined ? state : !this.isActive
    if (targetState === this.isActive) return

    this.isActive = targetState
    console.log(`[GhostKeyboardHelper] Toggled to: ${this.isActive}`)

    const mainWindow = this.appState.getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("toggle-ghost-mode", this.isActive)
    }

    if (this.isActive) {
      this.startListening()
    } else {
      this.stopListening()
    }
  }

  public getIsActive(): boolean {
    return this.isActive
  }

  private startListening() {
    this.stopListening()

    this.onKeyDownHandler = (e: any) => {
      if (!this.isActive) return
      const mainWindow = this.appState.getMainWindow()
      if (!mainWindow || mainWindow.isDestroyed()) return

      // If our own window is focused, ignore key mirroring to prevent duplication
      if (mainWindow.isFocused()) return

      // Ignore modifier combinations (Ctrl/Cmd) to avoid capturing shortcut triggers
      if (e.ctrlKey || e.metaKey) return

      let keyChar = ""
      let action: "append" | "backspace" | "clear" | "submit" = "append"

      if (e.keycode === 14) { // Backspace
        action = "backspace"
      } else if (e.keycode === 28 || e.keycode === 3636) { // Enter or Numpad Enter
        action = "submit"
      } else {
        const mapped = KEY_MAP[e.keycode]
        if (!mapped) return
        keyChar = e.shiftKey ? mapped.shift : mapped.normal
      }

      mainWindow.webContents.send("ghost-keypress", { char: keyChar, action })
    }

    uIOhook.on("keydown", this.onKeyDownHandler)
    try {
      uIOhook.start()
    } catch (err) {
      console.error("[GhostKeyboardHelper] Error starting uIOhook:", err)
    }
  }

  private stopListening() {
    try {
      uIOhook.stop()
    } catch (err) {
      // Ignore if not running
    }
    if (this.onKeyDownHandler) {
      uIOhook.off("keydown", this.onKeyDownHandler)
      this.onKeyDownHandler = null
    }
  }
}
