import path from "node:path"
import fs from "node:fs"
import { app } from "electron"

export interface AppShortcuts {
  showCenter: string
  screenshot: string
  toggleStealth: string
  toggleSettings: string
  copyLatest: string
  newSession: string
  declutter: string
  toggleVoice: string
  toggleGhostKeyboard: string
}

export interface AppConfig {
  onboardingCompleted: boolean
  apiKey: string
  provider: "gemini" | "omnikey"
  model: string
  mode: "code" | "general"
  theme: "light" | "dark"
  opacity: number
  pulseEnabled: boolean
  codingLanguage: string
  shortcuts?: AppShortcuts
}

const DEFAULT_SHORTCUTS: AppShortcuts = {
  showCenter: "CommandOrControl+Shift+Space",
  screenshot: "CommandOrControl+H",
  toggleStealth: "CommandOrControl+B",
  toggleSettings: "CommandOrControl+I",
  copyLatest: "CommandOrControl+Alt+C",
  newSession: "CommandOrControl+O",
  declutter: "CommandOrControl+U",
  toggleVoice: "CommandOrControl+Shift+V",
  toggleGhostKeyboard: "CommandOrControl+Alt+X"
}

const DEFAULT_CONFIG: AppConfig = {
  onboardingCompleted: false,
  apiKey: "",
  provider: "gemini",
  model: "gemini-2.5-flash",
  mode: "code",
  theme: "dark",
  opacity: 0.25,
  pulseEnabled: true,
  codingLanguage: "Auto-Detect",
  shortcuts: DEFAULT_SHORTCUTS
}

export class ConfigHelper {
  private configPath: string

  constructor() {
    // Save inside the userData folder
    this.configPath = path.join(app.getPath("userData"), "config.json")
  }

  public loadConfig(): AppConfig {
    // 1. Try reading the config file first
    let fileConfig: any = null
    try {
      if (fs.existsSync(this.configPath)) {
        const fileData = fs.readFileSync(this.configPath, "utf-8")
        fileConfig = JSON.parse(fileData)
      }
    } catch (error) {
      console.error("[ConfigHelper] Error reading config file during initial load:", error)
    }

    // 2. If config file has a valid API key, use it
    if (fileConfig && fileConfig.apiKey) {
      try {
        let parsedShortcuts = fileConfig.shortcuts || {}
        let needsSave = false

        const newKeys = Object.keys(DEFAULT_SHORTCUTS) as Array<keyof AppShortcuts>
        const mergedShortcuts = { ...DEFAULT_SHORTCUTS }

        for (const key of newKeys) {
          if (parsedShortcuts[key] !== undefined) {
            mergedShortcuts[key] = parsedShortcuts[key]
          } else {
            needsSave = true
          }
        }

        const parsedKeys = Object.keys(parsedShortcuts)
        const hasOldKeys = parsedKeys.some(key => !newKeys.includes(key as any))
        if (hasOldKeys) {
          needsSave = true
        }

        const loadedConfig: AppConfig = {
          onboardingCompleted: fileConfig.onboardingCompleted ?? DEFAULT_CONFIG.onboardingCompleted,
          apiKey: fileConfig.apiKey,
          provider: fileConfig.provider ?? DEFAULT_CONFIG.provider,
          model: fileConfig.model ?? DEFAULT_CONFIG.model,
          mode: fileConfig.mode ?? DEFAULT_CONFIG.mode,
          theme: fileConfig.theme ?? DEFAULT_CONFIG.theme,
          opacity: fileConfig.opacity ?? DEFAULT_CONFIG.opacity,
          pulseEnabled: fileConfig.pulseEnabled ?? DEFAULT_CONFIG.pulseEnabled,
          codingLanguage: fileConfig.codingLanguage ?? DEFAULT_CONFIG.codingLanguage,
          shortcuts: mergedShortcuts
        }

        if (needsSave) {
          this.saveConfig(loadedConfig)
        }

        return loadedConfig
      } catch (error) {
        console.error("[ConfigHelper] Error parsing config file:", error)
      }
    }

    // 3. Fallback: development environments utilizing .env files or shell env
    const envGeminiKey = process.env.GEMINI_API_KEY
    const envOmnikeyKey = process.env.OMNIKEY_API_KEY
    const envModel = process.env.GEMINI_MODEL

    if (envGeminiKey || envOmnikeyKey) {
      console.log("[ConfigHelper] Environment API Key detected as fallback. Bypassing onboarding.")
      
      // Ensure OpenAI keys have omnikey- prefix
      let apiKey = envGeminiKey || envOmnikeyKey || ""
      if (envOmnikeyKey && !envOmnikeyKey.startsWith("omnikey-")) {
        apiKey = "omnikey-" + envOmnikeyKey
      }

      return {
        onboardingCompleted: true,
        apiKey: apiKey,
        provider: envGeminiKey ? "gemini" : "omnikey",
        model: envModel || (envGeminiKey ? "gemini-2.5-flash" : "auto"),
        mode: "code",
        theme: "dark",
        opacity: 0.25,
        pulseEnabled: true,
        codingLanguage: "Auto-Detect",
        shortcuts: DEFAULT_SHORTCUTS
      }
    }

    // 4. Default config if both config file and environment variables are absent
    return { ...DEFAULT_CONFIG }
  }

  public saveConfig(config: AppConfig): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), "utf-8")
      console.log("[ConfigHelper] Config saved successfully to:", this.configPath)
    } catch (error) {
      console.error("[ConfigHelper] Error writing config file:", error)
    }
  }

  public updateConfig(updates: Partial<AppConfig>): AppConfig {
    const currentConfig = this.loadConfig()
    const updatedConfig = { ...currentConfig, ...updates }
    this.saveConfig(updatedConfig)
    return updatedConfig
  }
}
