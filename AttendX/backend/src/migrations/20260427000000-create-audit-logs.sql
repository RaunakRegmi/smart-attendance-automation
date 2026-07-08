-- Migration: Create audit_logs table
-- Created: 2026-04-27
-- Description: PostgreSQL table for storing API audit logs

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    route TEXT NOT NULL,
    client_ip INET NOT NULL,
    request_headers JSONB,
    authorization_header TEXT,
    response_status INTEGER,
    icp_hash TEXT,
    status JSONB,
    client_agent TEXT,
    request_body JSONB,
    remote_user TEXT,
    audit_event_type TEXT DEFAULT 'audit'
);

-- Create indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_logs (timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_endpoint ON audit_logs (endpoint);
CREATE INDEX IF NOT EXISTS idx_audit_type ON audit_logs (audit_event_type);

-- Enable row-level security (optional)
-- ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
