import path from "node:path"
import fs from "node:fs"
import { app } from "electron"

export interface AppConfig {
  onboardingCompleted: boolean
  apiKey: string
  provider: "gemini" | "omnikey"
  model: string
  mode: "code" | "general"
  theme: "light" | "dark"
  opacity: number
  pulseEnabled: boolean
}

const DEFAULT_CONFIG: AppConfig = {
  onboardingCompleted: false,
  apiKey: "",
  provider: "gemini",
  model: "gemini-2.5-flash",
  mode: "code",
  theme: "dark",
  opacity: 0.25,
  pulseEnabled: true
}

export class ConfigHelper {
  private configPath: string

  constructor() {
    // Save inside the userData folder
    this.configPath = path.join(app.getPath("userData"), "config.json")
  }

  public loadConfig(): AppConfig {
    // Bypass for development environments utilizing .env files
    const envGeminiKey = process.env.GEMINI_API_KEY
    const envOmnikeyKey = process.env.OMNIKEY_API_KEY
    const envModel = process.env.GEMINI_MODEL

    if (envGeminiKey || envOmnikeyKey) {
      console.log("[ConfigHelper] Environment API Key detected. Bypassing onboarding.")
      return {
        onboardingCompleted: true,
        apiKey: envGeminiKey || envOmnikeyKey || "",
        provider: envGeminiKey ? "gemini" : "omnikey",
        model: envModel || (envGeminiKey ? "gemini-2.5-flash" : "auto"),
        mode: "code",
        theme: "dark",
        opacity: 0.25,
        pulseEnabled: true
      }
    }

    try {
      if (!fs.existsSync(this.configPath)) {
        console.log("[ConfigHelper] Config file does not exist. Using defaults.")
        return { ...DEFAULT_CONFIG }
      }

      const fileData = fs.readFileSync(this.configPath, "utf-8")
      const parsed = JSON.parse(fileData)
      
      // Ensure all fields are populated correctly with fallbacks
      return {
        onboardingCompleted: parsed.onboardingCompleted ?? DEFAULT_CONFIG.onboardingCompleted,
        apiKey: parsed.apiKey ?? DEFAULT_CONFIG.apiKey,
        provider: parsed.provider ?? DEFAULT_CONFIG.provider,
        model: parsed.model ?? DEFAULT_CONFIG.model,
        mode: parsed.mode ?? DEFAULT_CONFIG.mode,
        theme: parsed.theme ?? DEFAULT_CONFIG.theme,
        opacity: parsed.opacity ?? DEFAULT_CONFIG.opacity,
        pulseEnabled: parsed.pulseEnabled ?? DEFAULT_CONFIG.pulseEnabled
      }
    } catch (error) {
      console.error("[ConfigHelper] Error reading config file:", error)
      return { ...DEFAULT_CONFIG }
    }
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
