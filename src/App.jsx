import { useState, useRef, useEffect } from "react";
import "./App.css";

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

function getWordCount(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

const DEMO_DOC = {
  id: "demo1",
  name: "Product Roadmap Q3",
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

export default function App() {
  const [docs, setDocs] = useState([DEMO_DOC]);
  const [activeDocId, setActiveDocId] = useState("demo1");
  const [messages, setMessages] = useState([
    {
      id: "w1",
      role: "ai",
      text: "Hey! I'm your document assistant. Upload or select a document, and ask me anything about it. I always use the latest version of your edited content.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const saveTimerRef = useRef(null);

  const activeDoc = docs.find((d) => d.id === activeDocId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function handleFileUpload(e) {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target.result;
        const newDoc = {
          id: generateId(),
          name: file.name.replace(/\.[^.]+$/, ""),
          content: typeof content === "string" ? content : `[Binary file: ${file.name}]`,
          updatedAt: new Date(),
        };
        setDocs((prev) => [...prev, newDoc]);
        setActiveDocId(newDoc.id);
      };
      reader.readAsText(file);
    });
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
      content: "",
      updatedAt: new Date(),
    };
    setDocs((prev) => [...prev, doc]);
    setActiveDocId(doc.id);
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;

    // Check for API key
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) {
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "ai",
          text: "⚠️ No API key found. Please add your VITE_ANTHROPIC_API_KEY to the .env file (local) or Vercel environment variables (deployed).",
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

    const systemPrompt = `You are a helpful AI assistant for a document knowledge base app. The user has uploaded and may have edited the following documents. Always answer based ONLY on the current document content below — it reflects the latest edits.

${docsContext}

Be concise, helpful, and reference specific parts of the documents when relevant. If the answer isn't in the documents, say so honestly.`;

    const conversationHistory = messages
      .filter((m) => m.id !== "w1")
      .map((m) => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text }));

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompt,
          messages: [...conversationHistory, { role: "user", content: userText }],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "API error");
      }

      const reply = data.content?.[0]?.text || "Sorry, I couldn't generate a response.";
      setMessages((prev) => [...prev, { id: generateId(), role: "ai", text: reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "ai",
          text: `⚠️ Error: ${err.message}. Check your API key and try again.`,
        },
      ]);
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
      {/* HEADER */}
      <header className="header">
        <button className="menu-btn" onClick={() => setSidebarOpen((v) => !v)} title="Toggle sidebar">
          <span /><span /><span />
        </button>
        <div className="logo-dot" />
        <div className="logo">DocMind</div>
        <div className="header-sub">AI-powered document knowledge base</div>
      </header>

      <div className="main-layout">
        {/* SIDEBAR */}
        <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
          <div className="sidebar-header">
            <span>Documents</span>
            <button className="upload-btn" onClick={() => fileInputRef.current?.click()}>
              ＋ Upload
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,.md,.csv,.json,.js,.ts,.py,.html,.css,.xml,.yaml,.yml"
              style={{ display: "none" }}
              onChange={handleFileUpload}
            />
          </div>

          <div className="doc-list">
            {docs.length === 0 ? (
              <div className="empty-docs">
                <span>📄</span>
                No documents yet. Upload a file or create one.
              </div>
            ) : (
              docs.map((doc) => (
                <div
                  key={doc.id}
                  className={`doc-item ${doc.id === activeDocId ? "active" : ""}`}
                  onClick={() => setActiveDocId(doc.id)}
                >
                  <div className="doc-name">{doc.name}</div>
                  <div className="doc-meta">{getWordCount(doc.content).toLocaleString()} words</div>
                  <div className="doc-actions">
                    <span className="doc-tag">txt</span>
                    <button
                      className="delete-btn"
                      onClick={(e) => { e.stopPropagation(); deleteDoc(doc.id); }}
                    >
                      remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="sidebar-footer">
            <button className="new-doc-btn" onClick={newDoc}>
              + New Document
            </button>
          </div>
        </aside>

        {/* EDITOR */}
        <main className="editor-panel">
          {activeDoc ? (
            <>
              <div className="editor-toolbar">
                <input
                  className="doc-title-input"
                  value={activeDoc.name}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Document title..."
                />
                <div className={`save-indicator ${saved ? "saved" : "editing"}`}>
                  <div className="save-dot" />
                  {saved ? "Saved" : "Editing..."}
                </div>
              </div>
              <div className="editor-body">
                <textarea
                  className="doc-content-area"
                  value={activeDoc.content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder="Start typing or paste your document content here. Edit freely — the AI will always use the latest version when you ask questions."
                  spellCheck={false}
                />
              </div>
            </>
          ) : (
            <div className="editor-body">
              <div className="no-doc-placeholder">
                <h2>No document selected</h2>
                <p>Upload a file from the sidebar, or create a new document to get started.</p>
                <div className="drop-zone-hint" onClick={() => fileInputRef.current?.click()}>
                  <span>📂</span>
                  <p>Click to upload a file</p>
                  <small>.txt · .md · .csv · .json · .py · .js and more</small>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* CHAT */}
        <aside className="chat-panel">
          <div className="chat-header">
            <span>AI Assistant</span>
            <div className="chat-header-right">
              {activeDoc && <div className="ctx-pill">📄 {activeDoc.name}</div>}
              <div className="chat-status">
                <div className="status-dot" /> live
              </div>
            </div>
          </div>

          {docs.length === 0 ? (
            <div className="no-docs-chat">
              <span>🤖</span>
              <p>Upload at least one document to start asking questions.</p>
            </div>
          ) : (
            <>
              <div className="chat-messages">
                {messages.map((msg) => (
                  <div key={msg.id} className={`msg ${msg.role === "user" ? "user" : "ai"}`}>
                    <div className="msg-label">{msg.role === "user" ? "you" : "docmind"}</div>
                    <div className="bubble">{msg.text}</div>
                  </div>
                ))}
                {loading && (
                  <div className="msg ai">
                    <div className="msg-label">docmind</div>
                    <div className="bubble">
                      <div className="typing">
                        <span /><span /><span />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="chat-input-area">
                <textarea
                  className="chat-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything about your documents…"
                  rows={1}
                />
                <button
                  className="send-btn"
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  title="Send"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>

              <div className="chat-footer">
                <span className="doc-count">{docs.length} doc{docs.length !== 1 ? "s" : ""} in context</span>
                <button
                  className="clear-btn"
                  onClick={() => setMessages([{ id: generateId(), role: "ai", text: "Chat cleared. Ask me anything about your documents!" }])}
                >
                  clear chat
                </button>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
