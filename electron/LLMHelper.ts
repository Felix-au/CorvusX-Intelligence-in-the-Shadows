import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai"
import fs from "fs"
import { ConfigHelper } from "./ConfigHelper"

export class LLMHelper {
  private model: GenerativeModel | null = null
  private mode: 'code' | 'general' = 'code'
  private chatHistory: Array<{ role: 'user' | 'model', parts: any[] }> = []
  private configHelper = new ConfigHelper()

  public clearChatHistory(): void {
    this.chatHistory = [];
    console.log("[LLMHelper] Chat context/history has been cleared.");
  }

  private getSystemPrompt(): string {
    if (this.mode === 'code') {
      const config = this.configHelper.loadConfig();
      const language = config.codingLanguage || 'Auto-Detect';
      const languageInstruction = language !== 'Auto-Detect'
        ? ` IMPORTANT: Write the code solution exclusively in the ${language} programming language.`
        : "";
      return `You are Wingman AI, a technical copilot and software engineering assistant. For any user input, analyze it from a technical perspective. If the user input or problem involves a coding question, programming concept, or technical query, respond directly with clean, production-ready code to solve it. Keep it precise, direct, and extremely concise. No introductory or closing remarks, no suggestions or options, just the direct solution/code. Do not include any comments, explanations, or notes inside the code block.${languageInstruction} If any starting code, boilerplate, template, or partial class definition is provided in the input, context, or screenshot, you must preserve its structure and signatures, and complete or build directly on top of it.`;
    } else {
      return `You are Wingman AI, a helpful, direct, and proactive assistant. For any user input, provide a clear, direct, and highly concise answer. Avoid long-winded paragraphs, unnecessary background, or listings of options/next steps unless specifically requested. Answer directly in a single brief paragraph.`;
    }
  }

  public getMode(): 'code' | 'general' {
    return this.mode;
  }

  public setMode(mode: 'code' | 'general'): void {
    this.mode = mode;
    console.log(`[LLMHelper] Mode set to: ${mode}`);
    this.configHelper.updateConfig({ mode });
  }

  private keyType: 'gemini' | 'omnikey-openai' | 'omnikey-gemini' = 'gemini'
  private apiKey: string = ''
  private geminiModel: string = 'gemini-2.5-flash'

  constructor(apiKey?: string, geminiModel?: string) {
    if (apiKey) {
      this.apiKey = apiKey
      this.keyType = apiKey.startsWith('omnikey-g-') ? 'omnikey-gemini' : (apiKey.startsWith('omnikey-') ? 'omnikey-openai' : 'gemini')
      this.geminiModel = geminiModel || (this.keyType === 'gemini' ? 'gemini-2.5-flash' : 'auto')

      if (this.keyType === 'gemini') {
        const genAI = new GoogleGenerativeAI(apiKey)
        const modelToUse = this.geminiModel === 'auto' ? 'gemini-2.5-flash' : this.geminiModel
        this.model = genAI.getGenerativeModel({ model: modelToUse })
        console.log(`[LLMHelper] Using Google Gemini with model ${modelToUse}`)
      } else {
        console.log(`[LLMHelper] Using OmniKey (Type: ${this.keyType}, Model: ${this.geminiModel})`)
      }
    } else {
      console.warn("[LLMHelper] Warning: No API key configured. Please configure an API key in the UI.")
    }
  }

  private getOmnikeyUrl(): string {
    return process.env.OMNIKEY_URL || "https://omnikey-ai-unified-key-manager.onrender.com"
  }

  private async generateContentCall(contentInput: any): Promise<string> {
    if (this.keyType === 'gemini') {
      if (!this.model) {
        throw new Error("No Gemini model configured")
      }
      let finalContent;
      const systemPrompt = this.getSystemPrompt();

      if (Array.isArray(contentInput) && contentInput.length > 0 && 'role' in contentInput[0]) {
        finalContent = { contents: contentInput };
      } else if (typeof contentInput === 'string') {
        finalContent = `[System Instructions]\n${systemPrompt}\n\nUser Message: ${contentInput}`;
      } else if (Array.isArray(contentInput)) {
        finalContent = [`[System Instructions]\n${systemPrompt}`, ...contentInput];
      } else {
        finalContent = [`[System Instructions]\n${systemPrompt}`, contentInput];
      }

      const result = await this.model.generateContent(finalContent)
      const response = await result.response
      return response.text()
    }

    const baseUrl = this.getOmnikeyUrl()

    if (this.keyType === 'omnikey-gemini') {
      let contents;
      if (Array.isArray(contentInput) && contentInput.length > 0 && 'role' in contentInput[0]) {
        contents = contentInput;
      } else {
        const contentArray = Array.isArray(contentInput) ? contentInput : [contentInput]
        const parts = contentArray.map(item => {
          if (typeof item === 'string') {
            return { text: item }
          } else if (item && typeof item === 'object' && item.inlineData) {
            return { inlineData: item.inlineData }
          } else if (item && typeof item === 'object' && (item.text || item.inlineData)) {
            return item
          }
          return { text: String(item) }
        })
        contents = [{ role: 'user', parts }];
      }

      const url = `${baseUrl}/v1beta/models/${this.geminiModel}:generateContent?key=${this.apiKey}`
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: this.getSystemPrompt() }]
          }
        })
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`OmniKey Gemini API error: ${response.status} ${response.statusText} - ${errText}`)
      }
      const data = await response.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) {
        throw new Error("Empty response from OmniKey Gemini API")
      }
      return text
    }

    // For OpenAI format: omnikey-openai
    const openAiKey = this.apiKey.replace(/^omnikey-g-/, 'omnikey-')
    let messages;

    if (Array.isArray(contentInput) && contentInput.length > 0 && 'role' in contentInput[0]) {
      messages = [
        { role: 'system', content: this.getSystemPrompt() },
        ...contentInput.map(msg => {
          const role = msg.role === 'model' ? 'assistant' : 'user';
          const content = msg.parts.map((part: any) => {
            if (part.text) {
              return { type: 'text', text: part.text };
            } else if (part.inlineData) {
              return {
                type: 'image_url',
                image_url: {
                  url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
                }
              };
            }
            return { type: 'text', text: String(part) };
          });
          return role === 'user' ? { role, content } : { role, content: content.map((c: any) => c.text).join('\n') };
        })
      ];
    } else {
      const contentArray = Array.isArray(contentInput) ? contentInput : [contentInput]
      const messagesContent = contentArray.map(item => {
        if (typeof item === 'string') {
          return { type: 'text', text: item }
        } else if (item && typeof item === 'object' && item.inlineData) {
          return {
            type: 'image_url',
            image_url: {
              url: `data:${item.inlineData.mimeType};base64,${item.inlineData.data}`
            }
          }
        } else if (item && typeof item === 'object' && item.text) {
          return { type: 'text', text: item.text }
        }
        return { type: 'text', text: String(item) }
      })
      messages = [
        { role: 'system', content: this.getSystemPrompt() },
        { role: 'user', content: messagesContent }
      ];
    }

    const url = `${baseUrl}/v1/chat/completions`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.geminiModel,
        messages
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`OmniKey OpenAI API error: ${response.status} ${response.statusText} - ${errText}`)
    }
    const data = await response.json()
    const text = data.choices?.[0]?.message?.content
    if (!text) {
      throw new Error("Empty response from OmniKey OpenAI API")
    }
    return text
  }

  private async transcribeAudioWithOmniKey(buffer: Buffer, mimeType: string, filename: string): Promise<string> {
    const FormData = require('form-data')
    const form = new FormData()
    form.append('file', buffer, { filename, contentType: mimeType })
    form.append('model', 'auto')

    const baseUrl = this.getOmnikeyUrl()
    const url = `${baseUrl}/v1/audio/transcriptions`
    const openAiKey = this.apiKey.replace(/^omnikey-g-/, 'omnikey-')

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        ...form.getHeaders()
      },
      body: form.getBuffer()
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`OmniKey Audio Transcription error: ${response.status} ${response.statusText} - ${errText}`)
    }

    const data = await response.json()
    return data.text
  }

  private async fileToGenerativePart(imagePath: string) {
    const imageData = await fs.promises.readFile(imagePath)
    return {
      inlineData: {
        data: imageData.toString("base64"),
        mimeType: "image/png"
      }
    }
  }

  private cleanJsonResponse(text: string): string {
    // Remove markdown code block syntax if present
    text = text.replace(/^```(?:json)?\n/, '').replace(/\n```$/, '');
    // Remove any leading/trailing whitespace
    text = text.trim();
    return text;
  }


  public async extractProblemFromImages(imagePaths: string[]) {
    try {
      const imageParts = await Promise.all(imagePaths.map(path => this.fileToGenerativePart(path)))

      const systemPromptToUse = this.getSystemPrompt()
      const modeInstruction = this.mode === 'code'
        ? "\nNote: Since we are in CODE mode, if the problem involves a programming/coding question, focus the extraction on the coding challenge requirements and constraints."
        : ""
      const prompt = `${systemPromptToUse}\n\nYou are a wingman. Please analyze these images and extract the following information in JSON format:\n{
  "problem_statement": "A clear statement of the problem or situation depicted in the images.",
  "context": "Relevant background or context from the images.",
  "suggested_responses": ["First possible answer or action", "Second possible answer or action", "..."],
  "reasoning": "Explanation of why these suggestions are appropriate."
}\n${modeInstruction}\nImportant: Return ONLY the JSON object, without any markdown formatting or code blocks.`

      const textResponse = await this.generateContentCall([prompt, ...imageParts])
      const text = this.cleanJsonResponse(textResponse)
      return JSON.parse(text)
    } catch (error) {
      console.error("Error extracting problem from images:", error)
      throw error
    }
  }

  public async generateSolution(problemInfo: any) {
    const systemPromptToUse = this.getSystemPrompt()
    const modeInstruction = this.mode === 'code'
      ? "\nNote: Since we are in CODE mode, if the problem/situation is a programming or coding challenge, write the complete, clean, working code block in the 'code' field of the JSON."
      : ""
    const prompt = `${systemPromptToUse}\n\nGiven this problem or situation:\n${JSON.stringify(problemInfo, null, 2)}\n${modeInstruction}\n\nPlease provide your response in the following JSON format:\n{
  "solution": {
    "code": "The code or main answer here.",
    "problem_statement": "Restate the problem or situation.",
    "context": "Relevant background/context.",
    "suggested_responses": ["First possible answer or action", "Second possible answer or action", "..."],
    "reasoning": "Explanation of why these suggestions are appropriate."
  }
}\nImportant: Return ONLY the JSON object, without any markdown formatting or code blocks.`

    console.log("[LLMHelper] Calling LLM for solution...");
    try {
      const textResponse = await this.generateContentCall(prompt)
      console.log("[LLMHelper] LLM returned result.");
      const text = this.cleanJsonResponse(textResponse)
      const parsed = JSON.parse(text)
      console.log("[LLMHelper] Parsed LLM response:", parsed)
      return parsed
    } catch (error) {
      console.error("[LLMHelper] Error in generateSolution:", error);
      throw error;
    }
  }

  public async debugSolutionWithImages(problemInfo: any, currentCode: string, debugImagePaths: string[]) {
    try {
      const imageParts = await Promise.all(debugImagePaths.map(path => this.fileToGenerativePart(path)))

      const systemPromptToUse = this.getSystemPrompt()
      const modeInstruction = this.mode === 'code'
        ? "\nNote: Since we are in CODE mode, provide corrected code blocks resolving the debug/error outputs in the 'code' field of the JSON."
        : ""
      const prompt = `${systemPromptToUse}\n\nYou are a wingman. Given:\n1. The original problem or situation: ${JSON.stringify(problemInfo, null, 2)}\n2. The current response or approach: ${currentCode}\n3. The debug information in the provided images\n${modeInstruction}\n\nPlease analyze the debug information and provide feedback in this JSON format:\n{
  "solution": {
    "code": "The code or main answer here.",
    "problem_statement": "Restate the problem or situation.",
    "context": "Relevant background/context.",
    "suggested_responses": ["First possible answer or action", "Second possible answer or action", "..."],
    "reasoning": "Explanation of why these suggestions are appropriate."
  }
}\nImportant: Return ONLY the JSON object, without any markdown formatting or code blocks.`

      const textResponse = await this.generateContentCall([prompt, ...imageParts])
      const text = this.cleanJsonResponse(textResponse)
      const parsed = JSON.parse(text)
      console.log("[LLMHelper] Parsed debug LLM response:", parsed)
      return parsed
    } catch (error) {
      console.error("Error debugging solution with images:", error)
      throw error
    }
  }

  public async analyzeAudioFile(audioPath: string) {
    try {
      const audioData = await fs.promises.readFile(audioPath);

      if (this.keyType === 'omnikey-gemini') {
        throw new Error("Voice recording/transcription is only supported for OmniKey OpenAI format keys (keys starting with 'omnikey-' without 'g-').");
      }

      if (this.keyType !== 'gemini') {
        console.log("[LLMHelper] Transcribing audio via OmniKey STT API");
        const transcript = await this.transcribeAudioWithOmniKey(
          audioData,
          audioPath.endsWith('.wav') ? 'audio/wav' : 'audio/mp3',
          audioPath.endsWith('.wav') ? 'audio.wav' : 'audio.mp3'
        );
        const prompt = this.mode === 'code'
          ? `You are a candidate being interviewed for a software engineering or technical role. Here is the transcription of what the interviewer just said or asked:\n"${transcript}"\n\nProvide a direct, natural, and concise answer to the interviewer as the candidate. Do not suggest actions, do not list next steps, do not provide multiple options, do not explain your reasoning, and do not include meta-commentary. Provide ONLY the spoken reply.`
          : `${this.getSystemPrompt()}\n\nHere is the transcription of the audio clip:\n"${transcript}"\n\nPlease analyze this audio/conversation. First, provide a direct, ready-to-use reply or answer that the user can say or use instantly. Then, if helpful, list possible next steps or alternative suggestions. Keep the response natural, conversational, concise, and do not return structured JSON.`;
        const text = await this.generateContentCall(prompt);
        return { text, timestamp: Date.now() };
      }

      const audioPart = {
        inlineData: {
          data: audioData.toString("base64"),
          mimeType: "audio/mp3"
        }
      };
      const prompt = this.mode === 'code'
        ? `You are a candidate being interviewed for a software engineering or technical role. Please analyze this audio which contains the question/statement from the interviewer. Provide a direct, natural, and concise answer to the interviewer as the candidate. Do not suggest actions, do not list next steps, do not provide multiple options, do not explain your reasoning, and do not include meta-commentary. Provide ONLY the spoken reply.`
        : `${this.getSystemPrompt()}\n\nPlease analyze this audio. First, provide a direct, ready-to-use reply or answer that the user can say or use instantly based on the audio contents. Then, if helpful, list possible next steps or alternative suggestions. Keep the response natural, conversational, concise, and do not return structured JSON.`;
      const result = await this.model!.generateContent([prompt, audioPart]);
      const response = await result.response;
      const text = response.text();
      return { text, timestamp: Date.now() };
    } catch (error) {
      console.error("Error analyzing audio file:", error);
      throw error;
    }
  }

  public async analyzeAudioFromBase64(data: string, mimeType: string) {
    try {
      if (this.keyType === 'omnikey-gemini') {
        throw new Error("Voice recording/transcription is only supported for OmniKey OpenAI format keys (keys starting with 'omnikey-' without 'g-').");
      }

      if (this.keyType !== 'gemini') {
        console.log("[LLMHelper] Transcribing audio via OmniKey STT API (Base64)");
        const buffer = Buffer.from(data, "base64");
        const filename = mimeType.includes('wav') ? 'audio.wav' : 'audio.mp3';
        const transcript = await this.transcribeAudioWithOmniKey(buffer, mimeType, filename);
        const prompt = this.mode === 'code'
          ? `You are a candidate being interviewed for a software engineering or technical role. Here is the transcription of what the interviewer just said or asked:\n"${transcript}"\n\nProvide a direct, natural, and concise answer to the interviewer as the candidate. Do not suggest actions, do not list next steps, do not provide multiple options, do not explain your reasoning, and do not include meta-commentary. Provide ONLY the spoken reply.`
          : `${this.getSystemPrompt()}\n\nHere is the transcription of the audio clip:\n"${transcript}"\n\nPlease analyze this audio/conversation. First, provide a direct, ready-to-use reply or answer that the user can say or use instantly. Then, if helpful, list possible next steps or alternative suggestions. Keep the response natural, conversational, concise, and do not return structured JSON.`;
        const text = await this.generateContentCall(prompt);
        return { text, timestamp: Date.now() };
      }

      const audioPart = {
        inlineData: {
          data,
          mimeType
        }
      };
      const prompt = this.mode === 'code'
        ? `You are a candidate being interviewed for a software engineering or technical role. Please analyze this audio which contains the question/statement from the interviewer. Provide a direct, natural, and concise answer to the interviewer as the candidate. Do not suggest actions, do not list next steps, do not provide multiple options, do not explain your reasoning, and do not include meta-commentary. Provide ONLY the spoken reply.`
        : `${this.getSystemPrompt()}\n\nPlease analyze this audio. First, provide a direct, ready-to-use reply or answer that the user can say or use instantly based on the audio contents. Then, if helpful, list possible next steps or alternative suggestions. Keep the response natural, conversational, concise, and do not return structured JSON.`;
      const result = await this.model!.generateContent([prompt, audioPart]);
      const response = await result.response;
      const text = response.text();
      return { text, timestamp: Date.now() };
    } catch (error) {
      console.error("Error analyzing audio from base64:", error);
      throw error;
    }
  }

  public async analyzeImageFile(imagePath: string) {
    try {
      const imageData = await fs.promises.readFile(imagePath);
      const imagePart = {
        inlineData: {
          data: imageData.toString("base64"),
          mimeType: "image/png"
        }
      };
      const systemPromptToUse = this.getSystemPrompt();
      const prompt = this.mode === 'code'
        ? `${systemPromptToUse}\n\nAnalyze this image. If the image depicts a coding question, programming challenge, or code snippet, write the complete, clean code solution. Otherwise, describe the content of this image. Keep your answer direct, natural, and concise. Do not use structured JSON.`
        : `${systemPromptToUse}\n\nDescribe the content of this image in a short, concise answer. In addition to your main answer, suggest several possible actions or responses the user could take next based on the image. Do not return a structured JSON object, just answer naturally as you would to a user. Be concise and brief.`;
      const text = await this.generateContentCall([prompt, imagePart]);
      return { text, timestamp: Date.now() };
    } catch (error) {
      console.error("Error analyzing image file:", error);
      throw error;
    }
  }

  public async chatWithGemini(message: string, imagePaths?: string[]): Promise<string> {
    try {
      const userParts: any[] = [];
      if (imagePaths && imagePaths.length > 0) {
        const imageParts = await Promise.all(imagePaths.map(path => this.fileToGenerativePart(path)));
        userParts.push(...imageParts);
      }
      
      if (this.keyType === 'gemini' && this.chatHistory.length === 0) {
        userParts.push({ text: `[System Instructions]\n${this.getSystemPrompt()}\n\nUser Message: ${message}` });
      } else {
        userParts.push({ text: message });
      }
      
      this.chatHistory.push({ role: 'user', parts: userParts });
      
      const responseText = await this.generateContentCall(this.chatHistory);
      
      this.chatHistory.push({ role: 'model', parts: [{ text: responseText }] });
      return responseText;
    } catch (error) {
      console.error("[LLMHelper] Error in chatWithGemini:", error);
      throw error;
    }
  }

  public async chat(message: string): Promise<string> {
    return this.chatWithGemini(message);
  }

  public getCurrentProvider(): "gemini" | "omnikey" {
    return this.keyType === 'gemini' ? 'gemini' : 'omnikey';
  }

  public getCurrentModel(): string {
    return this.geminiModel;
  }

  public async switchToGemini(apiKey?: string, model?: string): Promise<void> {
    if (apiKey) {
      this.apiKey = apiKey;
      this.keyType = apiKey.startsWith('omnikey-g-') ? 'omnikey-gemini' : (apiKey.startsWith('omnikey-') ? 'omnikey-openai' : 'gemini');
    }

    if (model) {
      this.geminiModel = model;
    } else if (!this.geminiModel) {
      this.geminiModel = this.keyType === 'gemini' ? 'gemini-2.5-flash' : 'auto';
    }

    if (this.keyType === 'gemini') {
      if (this.apiKey) {
        const genAI = new GoogleGenerativeAI(this.apiKey);
        const modelToUse = this.geminiModel === 'auto' ? 'gemini-2.5-flash' : this.geminiModel;
        this.model = genAI.getGenerativeModel({ model: modelToUse });
      }
    } else {
      this.model = null;
    }

    if (this.keyType === 'gemini' && !this.model && !this.apiKey) {
      throw new Error("No Gemini API key provided and no existing model instance");
    }
    if (this.keyType !== 'gemini' && !this.apiKey) {
      throw new Error("No OmniKey API key configured");
    }

    // Persist to local config.json
    if (this.apiKey) {
      const currentConfig = this.configHelper.loadConfig();
      this.configHelper.updateConfig({
        apiKey: this.apiKey,
        model: this.geminiModel,
        provider: this.keyType === 'gemini' ? 'gemini' : 'omnikey',
        onboardingCompleted: currentConfig.onboardingCompleted
      });
    }

    console.log(`[LLMHelper] Switched to Gemini/OmniKey (Type: ${this.keyType}, Model: ${this.geminiModel})`);
  }

  public async testConnection(tempApiKey?: string, tempModel?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const apiKeyToTest = tempApiKey || this.apiKey;
      const modelToTest = tempModel || this.geminiModel;

      if (!apiKeyToTest) {
        return { success: false, error: "No API key provided for testing" };
      }

      const tempKeyType = apiKeyToTest.startsWith('omnikey-g-') ? 'omnikey-gemini' : (apiKeyToTest.startsWith('omnikey-') ? 'omnikey-openai' : 'gemini');

      if (tempKeyType === 'gemini') {
        const genAI = new GoogleGenerativeAI(apiKeyToTest);
        const modelName = modelToTest === 'auto' ? 'gemini-2.5-flash' : modelToTest;
        const modelInstance = genAI.getGenerativeModel({ model: modelName });
        const result = await modelInstance.generateContent("Hello");
        const response = await result.response;
        const text = response.text();
        if (text) return { success: true };
        return { success: false, error: "Empty response from Gemini" };
      } else {
        const originalApiKey = this.apiKey;
        const originalKeyType = this.keyType;
        const originalGeminiModel = this.geminiModel;
        const originalModel = this.model;

        try {
          this.apiKey = apiKeyToTest;
          this.keyType = tempKeyType;
          this.geminiModel = modelToTest || 'auto';
          this.model = null;

          const text = await this.generateContentCall("Hello");
          if (text) return { success: true };
          return { success: false, error: "Empty response from OmniKey" };
        } finally {
          this.apiKey = originalApiKey;
          this.keyType = originalKeyType;
          this.geminiModel = originalGeminiModel;
          this.model = originalModel;
        }
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
} 