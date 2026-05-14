# 🌾 Jaffna Agri-Sense: Farming AI Assistant "Hey Nila"

A smart, dual-portal agricultural IoT dashboard designed for the paddy fields of Jaffna. It combines real-time IoT sensor telemetry, Machine Learning soil analysis, and an accessible voice-activated AI assistant to help farmers optimize their crop yield and water management.

## 🌟 Key Features

### 1. Dual-Portal Architecture
*   **Executive Portal (`/executive`)**: A high-fidelity, data-dense analytics dashboard designed for agricultural researchers and farm managers. Features detailed historical charts, live multi-sensor telemetry (pH, Nitrogen, Phosphorus, Potassium, Humidity, Temperature, Conductivity), and visual tank monitoring.
*   **Farmer Portal (`/farmer`)**: A mobile-first, high-contrast, accessible interface designed specifically for elderly or uneducated farmers. Features large typography, emoji indicators, simple circular gauges, and direct "Action-based" soil prescriptions (e.g., "APPLY 12KG UREA NOW").

### 2. "Hey Nila" Voice Assistant
An integrated AI assistant built directly into the browser to bridge the digital literacy gap.
*   **Wake-Word Activation**: Simply say "Hey Nila" to activate the microphone.
*   **Context-Aware**: Nila is fed real-time sensor data and ML predictions in the background, allowing her to answer questions like *"What is the nitrogen level today?"* or *"Should I add fertilizer?"* accurately.
*   **Resilient Engine**: Built with a custom Watchdog Pattern to prevent the Chrome Speech API from crashing or entering "zombie" states during extended conversations.

### 3. Real-Time IoT & Machine Learning
*   **Live ThingSpeak Integration**: Bypasses stale database data by polling the ThingSpeak REST API directly for real-time farm conditions.
*   **Smart Fertilizer Prediction**: A Python-based ML pipeline analyzes the 10-minute moving average of N-P-K and pH levels to prescribe specific fertilizer actions (Urea, DAP, MOP) dynamically.

---

## 🛠️ Technology Stack

*   **Frontend**: Next.js 14, React, Recharts, CSS Modules (Vanilla CSS for performance)
*   **Backend**: Node.js, Express.js
*   **IoT Platform**: ThingSpeak API
*   **AI Engine**: OpenRouter API (Claude Sonnet / Opus)
*   **Machine Learning**: Python, Scikit-learn (Random Forest Classifier)

---

## 🚀 Setup & Installation

### Prerequisites
*   Node.js (v18+)
*   Python (3.8+) for ML scripts
*   An OpenRouter API Key

### 1. Backend Setup (`/thingspeak_api`)

1. Navigate to the backend directory:
   ```bash
   cd thingspeak_api
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `thingspeak_api` directory:
   ```env
   PORT=5000
   THINGSPEAK_CHANNEL_ID=your_channel_id
   THINGSPEAK_READ_API_KEY=your_read_key
   MONGO_URI=your_mongodb_uri
   OPENROUTER_API_KEY=your_openrouter_key
   ```
4. Start the backend server:
   ```bash
   npm start
   # Server will run on http://localhost:5000
   ```

### 2. Frontend Setup (`/dashboard`)

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd dashboard
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   # App will run on http://localhost:3000
   ```

---

## 📱 Usage Guide

1. Open `http://localhost:3000` in your browser.
2. You will be greeted by the **Portal Selector**.
3. **For Analytics**: Click "Executive Portal". Explore the graphs and real-time telemetry.
4. **For Farmers**: Click "Farmer Portal".
    * Ensure you grant **Microphone Permissions** when prompted by the browser.
    * Try saying: *"Hey Nila, what is the temperature today?"*
    * Nila will process the live data and speak the answer back to you.

## 🔒 Security Note
The `.env` file and `node_modules` are excluded from version control via `.gitignore`. Never commit your `OPENROUTER_API_KEY` to GitHub.
