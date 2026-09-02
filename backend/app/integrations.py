"""Replacements for Base44's integrations.Core namespace: SendEmail, UploadFile,
and InvokeLLM. Each degrades gracefully when no credentials/keys are configured
so the app is usable out of the box, and picks up real providers via env vars."""

import os
import json
import smtplib
import shutil
import uuid
from email.mime.text import MIMEText
from datetime import datetime

import requests

LOG_DIR = os.path.join(os.path.dirname(__file__), "..", "var")
os.makedirs(LOG_DIR, exist_ok=True)
EMAIL_LOG = os.path.join(LOG_DIR, "sent_emails.log")
UPLOAD_DIR = os.path.join(LOG_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def send_email(to: str, subject: str, body: str, from_name: str = "DairyPro"):
    host = os.environ.get("SMTP_HOST")
    if host:
        try:
            msg = MIMEText(body)
            msg["Subject"] = subject
            msg["From"] = os.environ.get("SMTP_FROM", from_name)
            msg["To"] = to
            with smtplib.SMTP(host, int(os.environ.get("SMTP_PORT", "587"))) as server:
                if os.environ.get("SMTP_TLS", "true").lower() == "true":
                    server.starttls()
                user = os.environ.get("SMTP_USER")
                pw = os.environ.get("SMTP_PASSWORD")
                if user and pw:
                    server.login(user, pw)
                server.send_message(msg)
            return {"status": "sent", "to": to}
        except Exception as exc:  # noqa: BLE001
            _log_email(to, subject, body, error=str(exc))
            return {"status": "error", "detail": str(exc)}
    # No SMTP configured — log locally so the flow still "works" in dev.
    _log_email(to, subject, body)
    return {"status": "logged", "to": to, "note": "SMTP not configured; email was logged instead of sent."}


def _log_email(to, subject, body, error=None):
    with open(EMAIL_LOG, "a", encoding="utf-8") as f:
        f.write(f"\n--- {datetime.utcnow().isoformat()} ---\n")
        f.write(f"To: {to}\nSubject: {subject}\n{'Error: ' + error if error else ''}\n{body}\n")


def save_upload(filename: str, contents: bytes) -> str:
    ext = os.path.splitext(filename)[1]
    safe_name = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(UPLOAD_DIR, safe_name)
    with open(path, "wb") as f:
        f.write(contents)
    return f"/api/files/{safe_name}"


ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
ANTHROPIC_MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-5")


def invoke_llm(prompt: str, response_json_schema: dict | None = None):
    """Best-effort replacement for base44.integrations.Core.InvokeLLM.
    Calls the Anthropic API directly if ANTHROPIC_API_KEY is set; otherwise
    returns a clear message so the UI can show a helpful fallback state."""
    if not ANTHROPIC_API_KEY:
        return {
            "_ai_unavailable": True,
            "message": "AI insights are not configured. Set ANTHROPIC_API_KEY on the backend to enable them.",
        }

    system = "You are a dairy farm data analyst. Respond ONLY with valid JSON matching the requested shape, no prose, no markdown fences."
    if response_json_schema:
        prompt = f"{prompt}\n\nRespond with JSON matching this schema:\n{json.dumps(response_json_schema)}"

    try:
        resp = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": ANTHROPIC_MODEL,
                "max_tokens": 1024,
                "system": system,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        text = "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text")
        text = text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        return json.loads(text)
    except Exception as exc:  # noqa: BLE001
        return {"_ai_unavailable": True, "message": f"AI request failed: {exc}"}
