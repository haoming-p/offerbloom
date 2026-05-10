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


def build_rag_context(
    db: Session,
    user_id: str,
    question_id: str,
    selected_answer_id: str | None = None,
    selected_practice_id: str | None = None,
) -> str:
    """Return a single text block of retrieved context, or '' if nothing found.

    Cypher does most of the work in one query: walk from the Question to its
    Role / Position / Answers / Practices, plus any files LINKED_TO either node.

    If selected_answer_id or selected_practice_id is set, that item is marked
    "[FOCUS]" in the prompt + a top-line instruction tells the model that
    "this answer" / "this practice" refers to it.
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
    focused_answer_label = None
    if answers:
        parts = ["Saved answers (the user's actual saved drafts):"]
        for a in answers:
            label = a.get("label", "(untitled)")
            content = _strip_html(a.get("content", ""))[:MAX_ANSWER_CHARS]
            if not content:
                continue
            marker = ""
            if selected_answer_id and a.get("id") == selected_answer_id:
                marker = " [FOCUS]"
                focused_answer_label = label
            parts.append(f"  — {label}{marker}: {content}")
        if len(parts) > 1:
            sections.append("\n".join(parts))

    # --- 4. Saved practices for this question ---
    practices = record["practices"] or []
    focused_practice_tag = None
    if practices:
        # Sort by recency, but always include the focused practice even if it's
        # older than MAX_PRACTICES_INCLUDED's cutoff would normally allow.
        practices_sorted = sorted(practices, key=lambda p: p.get("created_at", 0), reverse=True)
        keep = practices_sorted[:MAX_PRACTICES_INCLUDED]
        if selected_practice_id and not any(p.get("id") == selected_practice_id for p in keep):
            focus = next((p for p in practices_sorted if p.get("id") == selected_practice_id), None)
            if focus:
                keep = [focus] + keep[: MAX_PRACTICES_INCLUDED - 1]

        parts = ["Saved practice attempts (most recent first):"]
        for p in keep:
            tag = p.get("tag", "")
            transcript = (p.get("transcript", "") or "")[:MAX_PRACTICE_CHARS]
            if not transcript or transcript.startswith("(Voice transcript"):
                continue
            marker = ""
            if selected_practice_id and p.get("id") == selected_practice_id:
                marker = " [FOCUS]"
                focused_practice_tag = tag
            parts.append(f"  — [{tag}]{marker} {transcript}")
            fb_raw = p.get("ai_feedback")
            if fb_raw:
                # ai_feedback is now stored as raw markdown text. Older rows may still
                # contain a JSON string ({score, strengths, improvements}); render
                # either form compactly for the prompt.
                try:
                    fb = json.loads(fb_raw)
                    if isinstance(fb, dict) and "score" in fb:
                        parts.append(
                            f"    feedback: score {fb.get('score', '?')}/10. "
                            f"Strengths: {'; '.join(fb.get('strengths', [])[:2])}. "
                            f"Improvements: {'; '.join(fb.get('improvements', [])[:2])}."
                        )
                    else:
                        parts.append(f"    saved feedback: {str(fb_raw)[:400]}")
                except (TypeError, json.JSONDecodeError):
                    parts.append(f"    saved feedback: {str(fb_raw)[:400]}")
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

    header_lines = [
        "=== RETRIEVED USER CONTEXT (RAG) ===",
        "Use this saved context to ground your reply. Do not invent details "
        "beyond what's here. If something the user is asking about isn't present, "
        "say so and ask for it.",
    ]
    if focused_answer_label:
        header_lines.append(
            f'When the user says "this answer" / "the selected answer" / "refine it", '
            f'they mean the [FOCUS] item below labeled "{focused_answer_label}". '
            f'Center your reply on that item.'
        )
    if focused_practice_tag:
        header_lines.append(
            f'When the user says "this practice" / "give feedback", they mean the '
            f'[FOCUS] practice below tagged "{focused_practice_tag}". '
            f'Center your reply on that transcript.'
        )
    header = "\n".join(header_lines) + "\n"
    return header + "\n\n".join(sections) + "\n=== END RETRIEVED CONTEXT ==="
