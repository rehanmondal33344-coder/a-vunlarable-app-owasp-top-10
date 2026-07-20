-- DVLA Database Schema
-- SQLite database for chat logs, documents, challenges, and exploit logging

-- Application settings (mode, system prompt, etc.)
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Chat message history
CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('system', 'user', 'assistant', 'tool')),
    content TEXT NOT NULL,
    raw_prompt TEXT,           -- The full prompt sent to the LLM (for inspector)
    mode TEXT NOT NULL CHECK(mode IN ('vulnerable', 'hardened')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- RAG knowledge base documents
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    content TEXT NOT NULL,
    uploaded_by TEXT DEFAULT 'admin',
    tenant_id TEXT DEFAULT 'default',
    status TEXT DEFAULT 'indexed' CHECK(status IN ('pending', 'indexed', 'rejected')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Document chunks for vector retrieval
CREATE TABLE IF NOT EXISTS document_chunks (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    content TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    tenant_id TEXT DEFAULT 'default',
    embedding TEXT,            -- JSON-serialized vector
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- CTF challenge progress
CREATE TABLE IF NOT EXISTS challenge_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    challenge_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    flag_submitted TEXT,
    is_correct INTEGER DEFAULT 0,
    attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(challenge_id, session_id, flag_submitted)
);

-- Tool execution log
CREATE TABLE IF NOT EXISTS tool_executions (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    tool_name TEXT NOT NULL,
    arguments TEXT,            -- JSON
    result TEXT,               -- JSON
    was_confirmed INTEGER DEFAULT 0,
    mode TEXT NOT NULL CHECK(mode IN ('vulnerable', 'hardened')),
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Exploit attempt log (all security-relevant events)
CREATE TABLE IF NOT EXISTS exploit_logs (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    vulnerability_id TEXT NOT NULL,  -- LLM01, LLM02, etc.
    event_type TEXT NOT NULL,        -- 'attempt', 'success', 'blocked'
    description TEXT,
    request_data TEXT,               -- JSON snapshot of the request
    response_data TEXT,              -- JSON snapshot of the response
    mode TEXT NOT NULL CHECK(mode IN ('vulnerable', 'hardened')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chunks_document ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_tenant ON document_chunks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_exploit_session ON exploit_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_exploit_vuln ON exploit_logs(vulnerability_id);
CREATE INDEX IF NOT EXISTS idx_tool_session ON tool_executions(session_id);
