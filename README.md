# CorvusX: Intelligence in the Shadows

A premium, invisible, always-on-top desktop intelligence overlay that runs silently in the background, providing real-time cognitive reasoning, screenshot analysis, and contextual insights during professional meetings, interviews, presentations, and active debugging sessions.

---

## 🚀 Key Features

* **Stealth HUD Overlay:** A highly optimized, translucent, and click-through window that sits persistently on top of all applications, toggled instantly via global hotkeys.
* **Smart Screen OCR & Vision:** Instantly capture specific screen regions, extract text via Tesseract.js, and process code/diagrams using vision models.
* **Audio Intelligence:** Process voice recordings and transcripts, perfect for summarizing meeting notes and extracting action items.
* **Flexible AI Engines:** Out-of-the-box support for direct API integrations:
  * **Google Gemini:** High-speed vision reasoning via Google AI Studio.
  * **OmniKey API:** Unified proxy capabilities for advanced multimodal models.
* **Keyboard Navigation:** Fully controllable via system shortcuts for swift activation without breaking your active focus or window layout.

---

## 💻 System Requirements

```bash
Minimum:      4GB RAM, Dual-core CPU, 2GB disk space
Recommended:  8GB+ RAM, Quad-core CPU, Hardware Acceleration enabled
```

---

## 🛠️ Quick Start Guide

### 1. Installation
Clone the repository, navigate to the folder, and install the dependencies:

```bash
# If you encounter Sharp build errors, run this:
SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm install --ignore-scripts
npm rebuild sharp

# Otherwise, perform standard installation:
npm install
```

### 2. Configure Credentials
You can input your credentials directly within the application's settings dashboard at runtime. Alternatively, you can configure them in a `.env` file at the root of the project:

```env
# Google Gemini API Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# OmniKey Unified API Configuration
OMNIKEY_API_KEY=your_omnikey_api_key_here
```

### 3. Launching the Application

* **Development Mode (Vite + Electron):**
  ```bash
  npm start
  ```
  *(Launches the Vite dev server on port `5180` and starts the Electron client).*

* **Package Production Build:**
  ```bash
  npm run dist
  ```
  *(Packages the application binaries into the `release/` folder).*

---

## ⌨️ Global Keyboard Shortcuts

* **`Cmd/Ctrl + B`**: Toggle stealth overlay visibility.
* **`Cmd/Ctrl + H`**: Capture screenshot and trigger vision reasoning.
* **`Cmd/Ctrl + U`**: Just declutter the UI (clears chat messages and audio results from display, preserving the backend conversation context).
* **`Cmd/Ctrl + O`**: Create a new chat session (clears UI and resets the backend conversation history/context completely).
* **`Cmd/Ctrl + I`**: Toggle the settings and AI models list.
* **`Cmd/Ctrl + Arrow Keys`**: Shift/reposition the overlay window.
* **`Cmd/Ctrl + Q`**: Exit/quit the application completely.

---

## 🔧 Troubleshooting

### Sharp / Node-Gyp Build Failures
If you get `gyp ERR! find Python` or binary build errors during installation:
1. Delete the `node_modules` folder and `package-lock.json`.
2. Run:
   ```bash
   SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm install --ignore-scripts
   npm rebuild sharp
   ```

### Application Launch Blockers
* Ensure port `5180` is free. If another process is listening on `5180`, the Vite dev server will fail to start.
