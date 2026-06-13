import { uIOhook } from "uiohook-napi"
import { AppState } from "./main"

const CHAR_TO_KEY: Record<string, { code: number; shift?: boolean }> = {
  // Lowercase letters
  "a": { code: 30 }, "b": { code: 48 }, "c": { code: 46 }, "d": { code: 32 },
  "e": { code: 18 }, "f": { code: 33 }, "g": { code: 34 }, "h": { code: 35 },
  "i": { code: 23 }, "j": { code: 36 }, "k": { code: 37 }, "l": { code: 38 },
  "m": { code: 50 }, "n": { code: 49 }, "o": { code: 24 }, "p": { code: 25 },
  "q": { code: 16 }, "r": { code: 19 }, "s": { code: 31 }, "t": { code: 20 },
  "u": { code: 22 }, "v": { code: 47 }, "w": { code: 17 }, "x": { code: 45 },
  "y": { code: 21 }, "z": { code: 44 },

  // Uppercase letters
  "A": { code: 30, shift: true }, "B": { code: 48, shift: true }, "C": { code: 46, shift: true }, "D": { code: 32, shift: true },
  "E": { code: 18, shift: true }, "F": { code: 33, shift: true }, "G": { code: 34, shift: true }, "H": { code: 35, shift: true },
  "I": { code: 23, shift: true }, "J": { code: 36, shift: true }, "K": { code: 37, shift: true }, "L": { code: 38, shift: true },
  "M": { code: 50, shift: true }, "N": { code: 49, shift: true }, "O": { code: 24, shift: true }, "P": { code: 25, shift: true },
  "Q": { code: 16, shift: true }, "R": { code: 19, shift: true }, "S": { code: 31, shift: true }, "T": { code: 20, shift: true },
  "U": { code: 22, shift: true }, "V": { code: 47, shift: true }, "W": { code: 17, shift: true }, "X": { code: 45, shift: true },
  "Y": { code: 21, shift: true }, "Z": { code: 44, shift: true },

  // Numbers
  "1": { code: 2 }, "2": { code: 3 }, "3": { code: 4 }, "4": { code: 5 }, "5": { code: 6 },
  "6": { code: 7 }, "7": { code: 8 }, "8": { code: 9 }, "9": { code: 10 }, "0": { code: 11 },

  // Special shift-numbers
  "!": { code: 2, shift: true }, "@": { code: 3, shift: true }, "#": { code: 4, shift: true },
  "$": { code: 5, shift: true }, "%": { code: 6, shift: true }, "^": { code: 7, shift: true },
  "&": { code: 8, shift: true }, "*": { code: 9, shift: true }, "(": { code: 10, shift: true },
  ")": { code: 11, shift: true },

  // Symbols
  " ": { code: 57 },
  "\t": { code: 15 },
  "\n": { code: 28 }, // Enter key

  ";": { code: 39 }, ":": { code: 39, shift: true },
  "=": { code: 13 }, "+": { code: 13, shift: true },
  ",": { code: 51 }, "<": { code: 51, shift: true },
  "-": { code: 12 }, "_": { code: 12, shift: true },
  ".": { code: 52 }, ">": { code: 52, shift: true },
  "/": { code: 53 }, "?": { code: 53, shift: true },
  "`": { code: 41 }, "~": { code: 41, shift: true },
  "[": { code: 26 }, "{": { code: 26, shift: true },
  "\\": { code: 43 }, "|": { code: 43, shift: true },
  "]": { code: 27 }, "}": { code: 27, shift: true },
  "'": { code: 40 }, "\"": { code: 40, shift: true }
}

export class TypingSimulator {
  private isTyping = false
  private appState: AppState

  constructor(appState: AppState) {
    this.appState = appState
  }

  public isCurrentlyTyping(): boolean {
    return this.isTyping
  }

  public cancelTyping(): void {
    if (this.isTyping) {
      console.log("[TypingSimulator] Typing simulation cancelled by request")
      this.isTyping = false
    }
  }

  public async startTyping(text: string): Promise<void> {
    if (this.isTyping) {
      this.cancelTyping()
      return
    }

    if (!text) return

    this.isTyping = true
    console.log("[TypingSimulator] Starting typing simulation after 2 seconds delay...")

    // 2-second delay before starting typing (responsive to cancellation)
    for (let i = 0; i < 20; i++) {
      await this.sleep(100)
      if (!this.isTyping) {
        console.log("[TypingSimulator] Typing simulation cancelled during initial delay")
        return
      }
    }

    try {
      // Split the text into lines
      const lines = text.split(/\r?\n/)

      for (let i = 0; i < lines.length; i++) {
        if (!this.isTyping) break

        const line = lines[i]
        const cleanLine = line.trimStart()

        // On newlines (except the very first line), type Enter
        if (i > 0) {
          // Send Enter key
          uIOhook.keyTap(28)
          // Wait a brief moment for the editor to process the Enter key and auto-indent
          await this.sleep(100)
          if (!this.isTyping) break
        }

        // Type the line with leading spaces stripped
        if (cleanLine.length > 0) {
          await this.typeString(cleanLine)
        }

        // Add a small delay between lines for realism and editor buffer safety
        const lineDelay = Math.floor(Math.random() * 100) + 100
        await this.sleep(lineDelay)
      }
    } catch (err) {
      console.error("[TypingSimulator] Error during typing simulation:", err)
    } finally {
      this.isTyping = false
      console.log("[TypingSimulator] Typing simulation finished")
    }
  }

  private sendKey(char: string): void {
    const mapping = CHAR_TO_KEY[char]
    if (mapping) {
      if (mapping.shift) {
        uIOhook.keyTap(mapping.code, [42]) // Type with Shift modifier
      } else {
        uIOhook.keyTap(mapping.code)
      }
    }
  }

  private async typeString(str: string): Promise<void> {
    for (const char of str) {
      if (!this.isTyping) break

      // 2% chance of introducing a typo for letters (a-zA-Z)
      const isLetter = /^[a-zA-Z]$/.test(char)
      if (isLetter && Math.random() < 0.02) {
        const isDoubleType = Math.random() < 0.5
        if (isDoubleType) {
          // Double-type typo
          this.sendKey(char)
          await this.sleep(Math.floor(Math.random() * 50) + 50)
          
          this.sendKey(char)
          await this.sleep(Math.floor(Math.random() * 100) + 100)
          
          uIOhook.keyTap(14) // Backspace
          await this.sleep(Math.floor(Math.random() * 100) + 100)
        } else {
          // Mistype typo
          const letters = "abcdefghijklmnopqrstuvwxyz"
          let typoChar = letters.charAt(Math.floor(Math.random() * letters.length))
          if (typoChar === char.toLowerCase()) {
            typoChar = typoChar === "a" ? "b" : "a"
          }
          if (char === char.toUpperCase()) {
            typoChar = typoChar.toUpperCase()
          }

          this.sendKey(typoChar)
          await this.sleep(Math.floor(Math.random() * 100) + 100)

          uIOhook.keyTap(14) // Backspace
          await this.sleep(Math.floor(Math.random() * 100) + 100)
        }
      }

      this.sendKey(char)

      // Random delay between keystrokes to mimic human typing (100ms - 250ms)
      const delay = Math.floor(Math.random() * 150) + 100
      await this.sleep(delay)
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
