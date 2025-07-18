<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Quick Docs | AI-Powered Secure Document Assistant</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      margin: 0;
      padding: 0;
      background: #f9f9f9;
      color: #333;
    }

    header {
      background: #1f2937;
      color: white;
      padding: 2rem;
      text-align: center;
    }

    h1 {
      margin: 0;
      font-size: 2.5rem;
    }

    main {
      padding: 2rem;
      max-width: 1200px;
      margin: auto;
    }

    section {
      margin-bottom: 3rem;
    }

    h2 {
      color: #1f2937;
      border-left: 5px solid #4f46e5;
      padding-left: 1rem;
      font-size: 1.8rem;
    }

    ul, pre, code {
      background: #f4f4f4;
      padding: 1rem;
      border-radius: 5px;
      overflow-x: auto;
    }

    .video {
      display: flex;
      justify-content: center;
      margin: 2rem 0;
    }

    video {
      max-width: 100%;
      border: 2px solid #ccc;
      border-radius: 10px;
    }

    .folder-structure {
      white-space: pre;
      font-family: 'Courier New', Courier, monospace;
      background: #e5e7eb;
      padding: 1rem;
      border-radius: 8px;
      margin-top: 1rem;
    }

    a {
      color: #4f46e5;
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    footer {
      background: #1f2937;
      color: white;
      text-align: center;
      padding: 1.5rem;
      font-size: 0.9rem;
    }

    .tagline {
      font-style: italic;
      margin-top: 0.5rem;
      color: #9ca3af;
    }

    .tech-list li {
      margin-bottom: 0.5rem;
    }
  </style>
</head>
<body>
  <header>
    <h1>📄 Quick Docs</h1>
    <p class="tagline">AI-Powered Secure Document Assistant — Built with React Native, Node.js, MongoDB, and Google Cloud</p>
  </header>

  <main>
    <section>
      <h2>📁 Repository Structure</h2>
      <div class="folder-structure">
quick-docs/
├── videos/        # 🎬 App screen recordings  
├── visible/       # 📱 Frontend (React Native Expo + Zustand)  
├── invisible/     # 🛠️ Backend (Node.js + Express.js + MongoDB)  
├── testing/       # 🧪 Testing documents  
├── docs/          # 📊 PPT documentation  
      </div>
    </section>

    <section>
      <h2>🎬 App Demo</h2>
      <div class="video">
        <video controls>
          <source src="./videos/quickdocs-demo.mp4" type="video/mp4">
          Your browser does not support the video tag.
        </video>
      </div>
    </section>

    <section>
      <h2>🛠️ Tech Stack</h2>
      <ul class="tech-list">
        <li><strong>Frontend:</strong> React Native Expo SDK 53, Zustand, Expo-Secure-Storage</li>
        <li><strong>Backend:</strong> Node.js, Express.js, MongoDB</li>
        <li><strong>Authentication:</strong> JWT, AES, Fingerprint/PIN, Expo Secure Storage</li>
        <li><strong>AI & Cloud:</strong> Google Cloud APIs (Speech, Translate, Vision, Text-to-Speech, Vertex AI, Gemini 2.5 Pro)</li>
        <li><strong>Notifications:</strong> Expo Notifications + FCM</li>
        <li><strong>Payments:</strong> RazorPay Gateway</li>
        <li><strong>File Processing:</strong> pdf-parse, mammoth</li>
        <li><strong>Optimizations:</strong> MongoDB Vector Search, Custom Hooks, EAS Build, Optional Chaining, Nullish Coalescing</li>
      </ul>
    </section>

    <section>
      <h2>🤖 AI Features</h2>
      <ul>
        <li>🎙️ Voice-to-Voice Communication AI Assistant</li>
        <li>🌍 Google Translate API with Auto Detection</li>
        <li>🔊 Speech-to-Text and Text-to-Speech (Telugu, English)</li>
        <li>📷 Vision AI: OCR, Image Labeling, Face Detection, Content Detection</li>
        <li>🧠 Gemini 2.5 PRO with RAG: Chat with AI on local + regional language messages</li>
        <li>📈 AI Dashboard for personalized analytics</li>
      </ul>
    </section>

    <section>
      <h2>🔐 Security Features</h2>
      <ul>
        <li>Advanced Encryption Standard (AES)</li>
        <li>JWT Tokens for Secure Auth</li>
        <li>BCRYPT for Hashing</li>
        <li>Environment Variables with .env</li>
        <li>Secure API Gateway (GET, POST, DELETE)</li>
      </ul>
    </section>

    <section>
      <h2>📄 Document Handling</h2>
      <ul>
        <li>📘 PDF Extraction with <code>pdf-parse</code></li>
        <li>📄 DOCX Extraction with <code>mammoth</code></li>
        <li>☁️ Google Cloud Storage for file uploads</li>
      </ul>
    </section>

    <section>
      <h2>💸 Monetization Flow</h2>
      <ul>
        <li>🔓 Free users can:
          <ul>
            <li>Upload 1 file</li>
            <li>Use 3 AI prompts</li>
          </ul>
        </li>
        <li>💳 Upgrade with RazorPay for full access</li>
      </ul>
    </section>

    <section>
      <h2>🧪 Testing & Docs</h2>
      <ul>
        <li>📂 <code>testing/</code> — Contains QA docs</li>
        <li>📂 <code>docs/</code> — PPT slides and reference documentation</li>
      </ul>
    </section>

    <section>
      <h2>🚀 Getting Started</h2>
<pre><code>git clone https://github.com/your-username/quick-docs.git
cd quick-docs

# Frontend
cd visible
npm install
npx expo start

# Backend
cd ../invisible
npm install
npm run dev
</code></pre>
    </section>

    <section>
      <h2>🙌 Contributing</h2>
      <p>Feel free to fork this repo, suggest features, or raise pull requests. Contributions are welcome!</p>
    </section>

    <section>
      <h2>📄 License</h2>
      <p>MIT License. See <code>LICENSE</code> file for details.</p>
    </section>
  </main>

  <footer>
    Made with ❤️ by <a href="https://github.com/nryadav18" target="_blank" style="color: #60a5fa;">N R Yadav (Rajesh)</a><br/>
    Portfolio: <a href="https://nryadav18.vercel.app" target="_blank" style="color: #60a5fa;">nryadav18.vercel.app</a>
  </footer>
</body>
</html>
