<h1 align="center" style="font-size:40px;">🚀 Quick Docs — AI-Powered Secure Document Assistant</h1>
<h3 align="center">Secure | Translate | Summarize | Speak with Docs — All on Mobile</h3>

---

🔐 A Full-Stack Mobile App that allows Users to securely upload documents and Chat, Talk with them using AI, Integrated Voice and Vision APIs. Built with React Native Expo, Node.js, Express.js, MongoDB and Google Cloud Platform services.

📱 Designed for mobile. Built for intelligence.

---

## 🎬 App Demo

[🔗 Click Here To Download App Video](https://raw.githubusercontent.com/nryadav18/Quick-Docs/main/videos/Quick-Docs.mp4)

<p align="center">
  <img src="./outputs/1.jpg" alt="Login Page" width="30%" style="margin: 150px;" />
  <img src="./outputs/2.jpg" alt="Login Page" width="30%" style="margin: 150px;" />
  <img src="./outputs/3.jpg" alt="Login Page" width="30%" style="margin: 150px;" />
</p>

<p align="center">
  <img src="./outputs/4.jpg" alt="Login Page" width="30%" style="margin: 150px;" />
  <img src="./outputs/5.jpg" alt="Login Page" width="30%" style="margin: 150px;" />
  <img src="./outputs/6.jpg" alt="Login Page" width="30%" style="margin: 150px;" />
</p>

<p align="center">
  <img src="./outputs/7.jpg" alt="Login Page" width="30%" style="margin: 150px;" />
  <img src="./outputs/8.jpg" alt="Login Page" width="30%" style="margin: 150px;" />
  <img src="./outputs/9.jpg" alt="Login Page" width="30%" style="margin: 150px;" />
</p>

<p align="center">
  <img src="./outputs/10.jpg" alt="Login Page" width="30%" style="margin: 150px;" />
  <img src="./outputs/11.jpg" alt="Login Page" width="30%" style="margin: 150px;" />
  <img src="./outputs/12.jpg" alt="Login Page" width="30%" style="margin: 150px;" />
</p>

<p align="center">
  <img src="./outputs/13.jpg" alt="Login Page" width="30%" style="margin: 150px;" />
  <img src="./outputs/14.jpg" alt="Login Page" width="30%" style="margin: 150px;" />
  <img src="./outputs/15.jpg" alt="Login Page" width="30%" style="margin: 150px;" />
</p>

<p align="center">
  <img src="./outputs/16.jpg" alt="Login Page" width="30%" style="margin: 150px;" />
  <img src="./outputs/17.jpg" alt="Login Page" width="30%" style="margin: 150px;" />
  <img src="./outputs/18.jpg" alt="Login Page" width="30%" style="margin: 150px;" />
</p>

<p align="center">
  <img src="./outputs/19.png" alt="Login Page" width="30%" style="margin: 150px;" />
  <img src="./outputs/20.png" alt="Login Page" width="30%" style="margin: 150px;" />
  <img src="./outputs/21.png" alt="Login Page" width="30%" style="margin: 150px;" />
</p>

<p align="center">
  <img src="./outputs/22.jpg" alt="Login Page" width="30%" style="margin: 150px;" />
  <img src="./outputs/23.png" alt="Login Page" width="30%" style="margin: 150px;" />
  <img src="./outputs/24.jpg" alt="Login Page" width="30%" style="margin: 150px;" />
</p>

---

## 📂 Folder Structure

quick-docs:
1. videos # 📽️ Demo recordings
2. visible # 📱 React Native frontend
3. invisible # 🧠 Backend with Node.js + MongoDB
4. testing # 🧪 Sample test files (PDF, DOCX)
5. docs # 📊 Presentations, PPTs
6. outputs #📱 App Working Pictures

---

## 💡 Features

- 🧠 Gemini Pro (2.5) via Vertex AI — Chat with documents (PDF, DOCX)
- 🗣️ Voice Assistant — voice-to-voice AI using Cloud TTS & STT
- 📸 Google Vision AI — OCR, Face, Logo, Landmark, Content moderation
- 🌐 Google Translate — auto-detect language, translate content
- 🔐 AES encryption + JWT auth + Expo Secure Storage
- 🧾 RazorPay integration for monetization (free & premium tiers)
- 📊 AI Dashboard with document history & insights

---

## 🧰 Tech Stack

### 💻 Frontend (visible/)
- React Native Expo SDK 53
- Zustand (lightweight global state)
- Firebase Cloud Messaging (v1)
- Expo Secure Storage + Biometrics
- EAS Build system

### 🔧 Backend (invisible/)
- Node.js + Express.js
- MongoDB + Vector Search
- JWT + BCRYPT + AES Encryption
- Google Cloud AI: Vision, Translate, TTS, STT
- Gemini Pro 2.5 LLM (via Vertex AI)

---

## 📦 Packages Used


"axios", "zustand", "expo-secure-store", "expo-local-authentication",
"react-native-voice", "react-native-push-notification",
"express", "cors", "jsonwebtoken", "pdf-parse", "mammoth",
"@google-cloud/translate", "@google-cloud/vision",
"@google-cloud/text-to-speech", "@google-cloud/speech",
"@google-cloud/storage", "@google-cloud/aiplatform"


🔓 Monetization
🆓 Free Tier: Upload 1 doc + 3 AI queries

💎 Premium Access: Unlock full features with RazorPay

<p align="left"> <img src="https://reactnative.dev/img/header_logo.svg" width="40" height="40" /> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/nodejs/nodejs-original-wordmark.svg" width="40" height="40" /> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/mongodb/mongodb-original-wordmark.svg" width="40" height="40" /> <img src="https://www.vectorlogo.zone/logos/firebase/firebase-icon.svg" width="40" height="40" /> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/javascript/javascript-original.svg" width="40" height="40" /> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/express/express-original-wordmark.svg" width="40" height="40" /> </p>

# Clone the repo
git clone https://github.com/nryadav18/quick-docs.git
cd quick-docs

# Frontend (React Native)
cd visible
npm install
npx expo start

# Backend (Node.js)
cd ../invisible
npm install
npm run dev
