#!/usr/bin/env python3
"""Sync one user's full subgraph from local Neo4j to prod AuraDB.

Covers every label/edge in the current schema:
  :User, :File, :Question, :Answer, :Practice, :Role, :Position,
  :ChatSession, :Message
  + LINKED_TO, FOR_ROLE, OWNS, HAS_*, etc.

Files share R2 keys across local/prod, so we only clone metadata.
ChatSessions + Messages are included so the demo carries chat history.

USAGE
-----
    ./venv/bin/python scripts/sync_demo_to_prod.py \\
      --prod-uri   "neo4j+s://YOUR_INSTANCE.databases.neo4j.io" \\
      --prod-user  "YOUR_INSTANCE_ID" \\
      --prod-password "YOUR_AURA_PASSWORD"

Flags: --email, --local-uri/--local-user/--local-password, --yes, --dry-run.
"""

import argparse
import sys
from neo4j import GraphDatabase

DEFAULT_EMAIL = "haoming.p@berkeley.edu"
DEFAULT_LOCAL_URI = "bolt://localhost:7687"
DEFAULT_LOCAL_USER = "neo4j"
DEFAULT_LOCAL_PASSWORD = "password"


def read_bundle(s, email):
    """Fetch everything owned by a user. Returns None if user is missing."""
    user = s.run("MATCH (u:User {email: $email}) RETURN u", email=email).single()
    if not user:
        return None

    def fetch(query):
        return s.run(query, email=email).data()

    return {
        "user": dict(user["u"]),
        "files": fetch("MATCH (:User {email: $email})-[:OWNS]->(n:File) RETURN n"),
        "roles": fetch("MATCH (:User {email: $email})-[:HAS_ROLE]->(n:Role) RETURN n"),
        "positions": fetch("MATCH (:User {email: $email})-[:HAS_POSITION]->(n:Position) RETURN n"),
        "questions": fetch("""
            MATCH (:User {email: $email})-[:HAS_QUESTION]->(q:Question)
            OPTIONAL MATCH (q)-[:HAS_ANSWER]->(a:Answer)
            OPTIONAL MATCH (q)-[:HAS_PRACTICE]->(p:Practice)
            RETURN q, collect(DISTINCT a) AS answers, collect(DISTINCT p) AS practices
        """),
        "sessions": fetch("""
            MATCH (:User {email: $email})-[:HAS_CHAT]->(cs:ChatSession)
            OPTIONAL MATCH (cs)-[:HAS_MESSAGE]->(m:Message)
            RETURN cs, collect(DISTINCT m) AS messages
        """),
        "links": fetch("""
            MATCH (:User {email: $email})-[:OWNS]->(f:File)-[:LINKED_TO]->(t)
            WHERE t:Role OR t:Position
            RETURN f.id AS file_id, t.id AS target_id, labels(t)[0] AS target_label
        """),
    }


def wipe(s, email):
    """Delete everything owned by this user. Keeps the :User node intact."""
    s.run("""
        MATCH (u:User {email: $email})
        OPTIONAL MATCH (u)-[:HAS_QUESTION]->(q:Question)
        OPTIONAL MATCH (q)-[:HAS_ANSWER]->(a)
        OPTIONAL MATCH (q)-[:HAS_PRACTICE]->(p)
        OPTIONAL MATCH (u)-[:OWNS]->(f:File)
        OPTIONAL MATCH (u)-[:HAS_ROLE]->(r:Role)
        OPTIONAL MATCH (u)-[:HAS_POSITION]->(pos:Position)
        OPTIONAL MATCH (u)-[:HAS_CHAT]->(cs:ChatSession)
        OPTIONAL MATCH (cs)-[:HAS_MESSAGE]->(m:Message)
        DETACH DELETE q, a, p, f, r, pos, cs, m
    """, email=email)


def write_bundle(s, b):
    """Recreate the full subgraph for this user on the target session."""
    email = b["user"]["email"]
    s.run("MERGE (u:User {email: $email}) SET u = $props", email=email, props=b["user"])

    def create_owned(rel, label, props):
        s.run(
            f"MATCH (u:User {{email: $email}}) CREATE (u)-[:{rel}]->(n:{label}) SET n = $props",
            email=email, props=props,
        )

    for rec in b["files"]:     create_owned("OWNS", "File", dict(rec["n"]))
    for rec in b["roles"]:     create_owned("HAS_ROLE", "Role", dict(rec["n"]))
    for rec in b["positions"]: create_owned("HAS_POSITION", "Position", dict(rec["n"]))

    # Position -> Role edges, reconstructed from Position.role_id (set by graph_sync).
    s.run("""
        MATCH (u:User {email: $email})-[:HAS_POSITION]->(p:Position)
        WHERE p.role_id IS NOT NULL AND p.role_id <> ''
        MATCH (u)-[:HAS_ROLE]->(r:Role {id: p.role_id})
        MERGE (p)-[:FOR_ROLE]->(r)
    """, email=email)

    for rec in b["questions"]:
        q = dict(rec["q"])
        create_owned("HAS_QUESTION", "Question", q)
        for child, rel, label in (
            (rec["answers"], "HAS_ANSWER", "Answer"),
            (rec["practices"], "HAS_PRACTICE", "Practice"),
        ):
            for node in child:
                if node is None:
                    continue
                s.run(
                    f"MATCH (q:Question {{id: $qid}}) CREATE (q)-[:{rel}]->(n:{label}) SET n = $props",
                    qid=q["id"], props=dict(node),
                )

    for rec in b["sessions"]:
        cs = dict(rec["cs"])
        create_owned("HAS_CHAT", "ChatSession", cs)
        for m in rec["messages"]:
            if m is None:
                continue
            s.run(
                "MATCH (cs:ChatSession {id: $cid}) CREATE (cs)-[:HAS_MESSAGE]->(m:Message) SET m = $props",
                cid=cs["id"], props=dict(m),
            )

    # File -> Role/Position links (LINKED_TO). Must run after files and targets exist.
    for link in b["links"]:
        s.run(
            f"MATCH (f:File {{id: $fid}}), (t:{link['target_label']} {{id: $tid}}) "
            f"MERGE (f)-[:LINKED_TO]->(t)",
            fid=link["file_id"], tid=link["target_id"],
        )


def summary(b):
    if not b:
        return "(none)"
    n_ans = sum(len([a for a in q["answers"] if a]) for q in b["questions"])
    n_prac = sum(len([p for p in q["practices"] if p]) for q in b["questions"])
    n_msgs = sum(len([m for m in s["messages"] if m]) for s in b["sessions"])
    return (
        f"files={len(b['files'])}, roles={len(b['roles'])}, positions={len(b['positions'])}, "
        f"questions={len(b['questions'])}, answers={n_ans}, practices={n_prac}, "
        f"sessions={len(b['sessions'])}, messages={n_msgs}, links={len(b['links'])}"
    )


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--local-uri", default=DEFAULT_LOCAL_URI)
    ap.add_argument("--local-user", default=DEFAULT_LOCAL_USER)
    ap.add_argument("--local-password", default=DEFAULT_LOCAL_PASSWORD)
    ap.add_argument("--prod-uri", required=True)
    ap.add_argument("--prod-user", required=True)
    ap.add_argument("--prod-password", required=True)
    ap.add_argument("--email", default=DEFAULT_EMAIL)
    ap.add_argument("--yes", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    local = GraphDatabase.driver(args.local_uri, auth=(args.local_user, args.local_password),
                                 notifications_disabled_categories=["UNRECOGNIZED"])
    prod = GraphDatabase.driver(args.prod_uri, auth=(args.prod_user, args.prod_password),
                                notifications_disabled_categories=["UNRECOGNIZED"])
    try:
        with local.session() as s:
            local_bundle = read_bundle(s, args.email)
        if not local_bundle:
            print(f"❌ User {args.email} not found locally."); sys.exit(1)

        with prod.session() as s:
            prod_bundle = read_bundle(s, args.email)

        print(f"📥 Local:  {summary(local_bundle)}")
        print(f"📤 Prod:   {summary(prod_bundle)}  (will be replaced)")

        if args.dry_run:
            print("[dry-run] No changes written."); return
        if not args.yes and input("\nProceed? [y/N]: ").strip().lower() != "y":
            print("Aborted."); return

        with prod.session() as s:
            if prod_bundle:
                wipe(s, args.email)
            write_bundle(s, local_bundle)

        print("✅ Done.")
    finally:
        local.close(); prod.close()


if __name__ == "__main__":
    main()
