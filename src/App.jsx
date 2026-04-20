import { useState, useRef, useEffect } from "react";
import "./App.css";

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

function getWordCount(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function getFileExt(name) {
  return name.split(".").pop().toLowerCase();
}

const DEMO_DOC = {
  id: "demo1",
  name: "Product Roadmap Q3",
  ext: "txt",
  content: `Product Roadmap - Q3 2026

THEME: AI-first user experience

## Key Initiatives

1. Smart Onboarding
   - Personalized setup wizard
   - AI-generated first project
   - 48h time-to-value target

2. Document Intelligence
   - Upload & parse PDFs, DOCX, TXT
   - Real-time editing with AI suggestions
   - Auto-tagging and semantic search

3. Team Collaboration
   - Shared workspaces
   - Comment threads on documents
   - Role-based access control

## Milestones
- July 1: Beta launch with 500 users
- Aug 15: Public launch
- Sep 30: 10,000 active users target

## Budget
Total: $420,000
Engineering: $280,000
Marketing: $90,000
Operations: $50,000`,
  updatedAt: new Date(),
};

async function loadPdfJs() {
  if (window.pdfjsLib) return window.pdfjsLib;
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  return window.pdfjsLib;
}

async function loadMammoth() {
  if (window.mammoth) return window.mammoth;
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js";
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return window.mammoth;
}

async function extractTextFromPDF(file) {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(" ");
    fullText += `[Page ${i}]\n${pageText}\n\n`;
  }
  return fullText.trim();
}

async function extractTextFromDocx(file) {
  const mammoth = await loadMammoth();
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value.trim();
}

export default function App() {
  const [docs, setDocs] = useState([DEMO_DOC]);
  const [activeDocId, setActiveDocId] = useState("demo1");
  const [messages, setMessages] = useState([
    {
      id: "w1",
      role: "ai",
      text: "Hey! I'm your document assistant powered by Google Gemini. Upload any document — PDF, Word, or text — and ask me anything about it!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const saveTimerRef = useRef(null);

  const activeDoc = docs.find((d) => d.id === activeDocId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleFileUpload(e) {
    const files = Array.from(e.target.files || []);
    setUploading(true);
    for (const file of files) {
      const ext = getFileExt(file.name);
      const name = file.name.replace(/\.[^.]+$/, "");
      let content = "";
      try {
        if (ext === "pdf") {
          content = await extractTextFromPDF(file);
        } else if (ext === "docx" || ext === "doc") {
          content = await extractTextFromDocx(file);
        } else {
          content = await file.text();
        }
        const newDoc = {
          id: generateId(),
          name,
          ext,
          content: content || "[Could not extract text from this file]",
          updatedAt: new Date(),
        };
        setDocs((prev) => [...prev, newDoc]);
        setActiveDocId(newDoc.id);
      } catch (err) {
        alert(`Failed to read ${file.name}: ${err.message}`);
      }
    }
    setUploading(false);
    e.target.value = "";
  }

  function handleContentChange(val) {
    setSaved(false);
    setDocs((prev) =>
      prev.map((d) =>
        d.id === activeDocId ? { ...d, content: val, updatedAt: new Date() } : d
      )
    );
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => setSaved(true), 800);
  }

  function handleTitleChange(val) {
    setDocs((prev) =>
      prev.map((d) => (d.id === activeDocId ? { ...d, name: val } : d))
    );
  }

  function deleteDoc(id) {
    const remaining = docs.filter((d) => d.id !== id);
    setDocs(remaining);
    if (activeDocId === id) setActiveDocId(remaining[0]?.id || null);
  }

  function newDoc() {
    const doc = {
      id: generateId(),
      name: "Untitled Document",
      ext: "txt",
      content: "",
      updatedAt: new Date(),
    };
    setDocs((prev) => [...prev, doc]);
    setActiveDocId(doc.id);
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "ai",
          text: "⚠️ No API key found. Please add VITE_GEMINI_API_KEY to Vercel's Environment Variables and redeploy.",
        },
      ]);
      return;
    }
    const userText = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { id: generateId(), role: "user", text: userText }]);
    setLoading(true);
    const docsContext = docs.length
      ? docs.map((d) => `--- Document: "${d.name}" ---\n${d.content}`).join("\n\n")
      : "No documents available.";
    const systemInstruction = `You are a helpful AI assistant for a document knowledge base app. Always answer based ONLY on the current document content below.\n\n${docsContext}\n\nBe concise and helpful. If the answer isn't in the documents, say so.`;
    const history = messages
      .filter((m) => m.id !== "w1")
      .map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.text }],
      }));
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemInstruction }] },
            contents: [...history, { role: "user", parts: [{ text: userText }] }],
            generationConfig: { maxOutputTokens: 1000, temperature: 0.7 },
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "Gemini API error");
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response.";
      setMessages((prev) => [...prev, { id: generateId(), role: "ai", text: reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, { id: generateId(), role: "ai", text: `⚠️ Error: ${err.message}` }]);
    }
    setLoading(false);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="app">
      <header className="header">
        <button className="menu-btn" onClick={() => setSidebarOpen((v) => !v)}>
          <span /><span /><span />
        </button>
        <div className="logo-dot" />
        <div className="logo">DocMind</div>
        <div className="header-sub">powered by Google Gemini · free</div>
      </header>
      <div className="main-layout">
        <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
          <div className="sidebar-header">
            <span>Documents</span>
            <button className="upload-btn" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? "Reading..." : "＋ Upload"}
            </button>
            <input ref={fileInputRef} type="file" multiple accept=".txt,.md,.csv,.json,.js,.ts,.py,.html,.css,.xml,.yaml,.yml,.pdf,.doc,.docx" style={{ display: "none" }} onChange={handleFileUpload} />
          </div>
          <div className="doc-list">
            {docs.length === 0 ? (
              <div className="empty-docs"><span>📄</span>No documents yet.</div>
            ) : (
              docs.map((doc) => (
                <div key={doc.id} className={`doc-item ${doc.id === activeDocId ? "active" : ""}`} onClick={() => setActiveDocId(doc.id)}>
                  <div className="doc-name">{doc.name}</div>
                  <div className="doc-meta">{getWordCount(doc.content).toLocaleString()} words</div>
                  <div className="doc-actions">
                    <span className={`doc-tag ${doc.ext === "pdf" ? "tag-pdf" : doc.ext === "docx" || doc.ext === "doc" ? "tag-word" : ""}`}>{doc.ext || "txt"}</span>
                    <button className="delete-btn" onClick={(e) => { e.stopPropagation(); deleteDoc(doc.id); }}>remove</button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="sidebar-footer">
            <button className="new-doc-btn" onClick={newDoc}>+ New Document</button>
            <div className="supported-formats">PDF · DOCX · TXT · MD · CSV · JSON</div>
          </div>
        </aside>
        <main className="editor-panel">
          {uploading ? (
            <div className="editor-body"><div className="no-doc-placeholder"><div className="upload-spinner">⏳</div><h2>Reading document...</h2><p>Extracting text, please wait.</p></div></div>
          ) : activeDoc ? (
            <>
              <div className="editor-toolbar">
                <input className="doc-title-input" value={activeDoc.name} onChange={(e) => handleTitleChange(e.target.value)} placeholder="Document title..." />
                <div className={`save-indicator ${saved ? "saved" : "editing"}`}><div className="save-dot" />{saved ? "Saved" : "Editing..."}</div>
              </div>
              <div className="editor-body">
                <textarea className="doc-content-area" value={activeDoc.content} onChange={(e) => handleContentChange(e.target.value)} placeholder="Start typing or paste content here." spellCheck={false} />
              </div>
            </>
          ) : (
            <div className="editor-body"><div className="no-doc-placeholder"><h2>No document selected</h2><p>Upload a file or create a new document.</p><div className="drop-zone-hint" onClick={() => fileInputRef.current?.click()}><span>📂</span><p>Click to upload</p><small>PDF · DOCX · TXT · MD · CSV · JSON</small></div></div></div>
          )}
        </main>
        <aside className="chat-panel">
          <div className="chat-header">
            <span>AI Assistant</span>
            <div className="chat-header-right">
              {activeDoc && <div className="ctx-pill">📄 {activeDoc.name}</div>}
              <div className="chat-status"><div className="status-dot" /> live</div>
            </div>
          </div>
          {docs.length === 0 ? (
            <div className="no-docs-chat"><span>🤖</span><p>Upload a document to start.</p></div>
          ) : (
            <>
              <div className="chat-messages">
                {messages.map((msg) => (
                  <div key={msg.id} className={`msg ${msg.role === "user" ? "user" : "ai"}`}>
                    <div className="msg-label">{msg.role === "user" ? "you" : "docmind"}</div>
                    <div className="bubble">{msg.text}</div>
                  </div>
                ))}
                {loading && <div className="msg ai"><div className="msg-label">docmind</div><div className="bubble"><div className="typing"><span /><span /><span /></div></div></div>}
                <div ref={messagesEndRef} />
              </div>
              <div className="chat-input-area">
                <textarea className="chat-input" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Ask anything about your documents…" rows={1} />
                <button className="send-btn" onClick={sendMessage} disabled={!input.trim() || loading}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                </button>
              </div>
              <div className="chat-footer">
                <span className="doc-count">{docs.length} doc{docs.length !== 1 ? "s" : ""} in context</span>
                <button className="clear-btn" onClick={() => setMessages([{ id: generateId(), role: "ai", text: "Chat cleared!" }])}>clear chat</button>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
