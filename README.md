<h1 align="center" style="font-size:40px;">🚀 Quick Docs — AI-Powered Secure Document Assistant</h1>
<h3 align="center">Secure | Translate | Summarize | Speak with Docs — All on Mobile</h3>

---

🔐 A full-stack mobile app that allows users to securely upload documents and chat with them using AI (Gemini 2.5 Pro), Voice, and Vision APIs. Built with React Native, Node.js, MongoDB, and Google Cloud AI services.

📱 Designed for mobile. Built for intelligence.

---

## 🎬 App Demo

👉 [📽️ Click here to watch the screen recording](./videos/Quick-Docs.mp4)

_(Preview not working? Right-click > "Open link in new tab" or download)_

---

## 📂 Folder Structure

quick-docs
\n ├── videos # 📽️ Demo recordings
\n ├── visible # 📱 React Native frontend
\n ├── invisible # 🧠 Backend with Node.js + MongoDB
\n ├── testing # 🧪 Sample test files (PDF, DOCX)
\n ├── docs # 📊 Presentations, PPTs


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
"@google-cloud/storage", "@google-cloud/aiplatform"![firebase-a08021](https://github.com/user-attachments/assets/42e77342-a29b-41c1-b8b8-29dd50886515)


🔓 Monetization
🆓 Free Tier: Upload 1 doc + 3 AI queries

💎 Premium Access: Unlock full features with RazorPay

<p align="left"> <a href="https://linkedin.com/in/nryadav18" target="blank"><img src="https://raw.githubusercontent.com/rahuldkjain/github-profile-readme-generator/master/src/images/icons/Social/linked-in-alt.svg" height="30" width="40" /></a> <a href="https://www.leetcode.com/rajeswar_2004" target="blank"><img src="https://raw.githubusercontent.com/rahuldkjain/github-profile-readme-generator/master/src/images/icons/Social/leet-code.svg" height="30" width="40" /></a> <a href="https://auth.geeksforgeeks.org/user/nryadav_18" target="blank"><img src="https://raw.githubusercontent.com/rahuldkjain/github-profile-readme-generator/master/src/images/icons/Social/geeks-for-geeks.svg" height="30" width="40" /></a> <a href="https://www.codechef.com/users/nryadav_18" target="_blank"> <img src="https://avatars.githubusercontent.com/u/11960354?v=4" height="30" width="40" /> </a> </p>

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
