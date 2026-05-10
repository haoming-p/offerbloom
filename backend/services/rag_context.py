"""RAG retrieval for the chat endpoint.

Given (user_id, question_id), pull the user's saved knowledge that's relevant
to *that question* and format it as a text block we append to the system prompt.

What gets included:
  1. Role node          → label + desc                        (e.g. "PM — Product Manager")
  2. Position node      → title + company + JD (if any)       (e.g. "Apple — PM intern")
  3. Saved Answers      → for THIS question only (label + content as plaintext)
  4. Saved Practices    → for THIS question only (transcript + AI feedback)
  5. Linked Files       → text_content of any :File LINKED_TO this role or position
                          (resume, cover letter, JD as a doc, etc.)

What is NOT included (intentional):
  - Chat drafts / typing-in-progress text — the spec is "AI uses SAVED data only"
  - Other questions' answers/practices — keep the context narrow per question
  - Files not linked to this role/position — link or it doesn't appear

"""

import json
import re
from neo4j import Session

# Per-item caps (chars). Adjust if you see retrieval missing the important bits.
MAX_ANSWER_CHARS = 1500
MAX_PRACTICE_CHARS = 1500
MAX_FILE_CHARS = 3000
MAX_FILES_INCLUDED = 4  # don't dump every resume the user owns
MAX_PRACTICES_INCLUDED = 3  # most recent only


def _strip_html(text: str) -> str:
    """Answers are stored as TipTap HTML — strip tags for cleaner prompts."""
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"&nbsp;", " ", text)
    text = re.sub(r"&amp;", "&", text)
    text = re.sub(r"&lt;", "<", text)
    text = re.sub(r"&gt;", ">", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def build_rag_context(db: Session, user_id: str, question_id: str) -> str:
    """Return a single text block of retrieved context, or '' if nothing found.

    Cypher does most of the work in one query: walk from the Question to its
    Role / Position / Answers / Practices, plus any files LINKED_TO either node.
    """
    record = db.run(
        """
        MATCH (u:User {id: $user_id})-[:HAS_QUESTION]->(q:Question {id: $q_id})

        // Role this question belongs to (matched via role_id property, since Question
        // stores role_id as a string rather than a graph edge — see Phase A schema).
        OPTIONAL MATCH (u)-[:HAS_ROLE]->(role:Role {id: q.role_id})

        // Position the question is tied to. q.position_key is either "general" or a
        // position id; we only resolve the latter.
        OPTIONAL MATCH (u)-[:HAS_POSITION]->(pos:Position {id: q.position_key})

        // Saved answers + practices for THIS question only.
        OPTIONAL MATCH (q)-[:HAS_ANSWER]->(a:Answer)
        WITH q, role, pos, collect(DISTINCT a) AS answers
        OPTIONAL MATCH (q)-[:HAS_PRACTICE]->(p:Practice)
        WITH q, role, pos, answers, collect(DISTINCT p) AS practices

        // Files linked to the role OR the position. Only this user's files (the
        // role/position nodes are scoped to the user already, so the [:LINKED_TO]
        // edge cannot cross users).
        OPTIONAL MATCH (f:File)-[:LINKED_TO]->(target)
        WHERE (target = role OR target = pos)
          AND f.text_content IS NOT NULL AND f.text_content <> ''
        WITH q, role, pos, answers, practices, collect(DISTINCT f) AS files

        RETURN q, role, pos, answers, practices, files
        """,
        user_id=user_id,
        q_id=question_id,
    ).single()

    if not record:
        return ""

    sections: list[str] = []

    # --- 1. Role context ---
    role = record["role"]
    if role:
        line = f"Role: {role.get('label', '')}"
        if role.get("desc"):
            line += f" — {role['desc']}"
        sections.append(line)

    # --- 2. Position context ---
    pos = record["pos"]
    if pos:
        line = f"Target position: {pos.get('title', '')}"
        if pos.get("company"):
            line += f" @ {pos['company']}"
        sections.append(line)
        if pos.get("jd"):
            jd = pos["jd"][:1500]
            sections.append(f"Job description:\n{jd}")

    # --- 3. Saved answers for this question ---
    answers = record["answers"] or []
    if answers:
        parts = ["Saved answers (the user's actual saved drafts):"]
        for a in answers:
            label = a.get("label", "(untitled)")
            content = _strip_html(a.get("content", ""))[:MAX_ANSWER_CHARS]
            if content:
                parts.append(f"  — {label}: {content}")
        if len(parts) > 1:
            sections.append("\n".join(parts))

    # --- 4. Saved practices for this question ---
    practices = record["practices"] or []
    if practices:
        # Most recent first; cap count.
        practices = sorted(practices, key=lambda p: p.get("created_at", 0), reverse=True)
        practices = practices[:MAX_PRACTICES_INCLUDED]
        parts = ["Saved practice attempts (most recent first):"]
        for p in practices:
            tag = p.get("tag", "")
            transcript = (p.get("transcript", "") or "")[:MAX_PRACTICE_CHARS]
            if not transcript or transcript.startswith("(Voice transcript"):
                continue
            parts.append(f"  — [{tag}] {transcript}")
            fb_raw = p.get("ai_feedback")
            if fb_raw:
                try:
                    fb = json.loads(fb_raw)
                    parts.append(
                        f"    feedback: score {fb.get('score', '?')}/10. "
                        f"Strengths: {'; '.join(fb.get('strengths', [])[:2])}. "
                        f"Improvements: {'; '.join(fb.get('improvements', [])[:2])}."
                    )
                except (TypeError, json.JSONDecodeError):
                    pass
        if len(parts) > 1:
            sections.append("\n".join(parts))

    # --- 5. Linked files (resume / cover letter / etc.) ---
    files = record["files"] or []
    if files:
        files = files[:MAX_FILES_INCLUDED]
        parts = ["Linked documents (extracted text):"]
        for f in files:
            name = f.get("name", "file")
            ftype = f.get("file_type", "")
            text = (f.get("text_content", "") or "")[:MAX_FILE_CHARS]
            if text:
                parts.append(f"  --- {name} ({ftype}) ---\n  {text}")
        if len(parts) > 1:
            sections.append("\n".join(parts))

    if not sections:
        return ""

    header = (
        "=== RETRIEVED USER CONTEXT (RAG) ===\n"
        "Use this saved context to ground your reply. Do not invent details "
        "beyond what's here. If something the user is asking about isn't present, "
        "say so and ask for it.\n"
    )
    return header + "\n\n".join(sections) + "\n=== END RETRIEVED CONTEXT ==="
