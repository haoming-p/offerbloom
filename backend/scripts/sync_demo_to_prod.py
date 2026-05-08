#!/usr/bin/env python3
"""Sync demo data from local Docker Neo4j to production AuraDB.

Reads the user node + all owned data (files metadata, questions, answers, practices)
matching --email, wipes existing prod data for that user, and re-creates it on prod.

Files share R2 keys (same bucket across local/prod), so we only clone metadata.

USAGE
-----
From the project root, activate the backend venv and run:

    python backend/scripts/sync_demo_to_prod.py \\
      --prod-uri "neo4j+s://YOUR_INSTANCE.databases.neo4j.io" \\
      --prod-user "YOUR_INSTANCE_ID" \\
      --prod-password "YOUR_AURA_PASSWORD"

Optional flags:
    --email <email>         Defaults to haoming.p@berkeley.edu
    --local-uri <uri>       Defaults to bolt://localhost:7687
    --local-user <user>     Defaults to neo4j
    --local-password <pw>   Defaults to password
    --yes                   Skip the interactive confirmation prompt
    --dry-run               Print what would happen, don't write anything
"""

import argparse
import sys

from neo4j import GraphDatabase

DEFAULT_LOCAL_URI = "bolt://localhost:7687"
DEFAULT_LOCAL_USER = "neo4j"
DEFAULT_LOCAL_PASSWORD = "password"
DEFAULT_EMAIL = "haoming.p@berkeley.edu"


def read_user_bundle(session, email):
    """Pull user node + all owned data from a Neo4j session."""
    user = session.run(
        "MATCH (u:User {email: $email}) RETURN u",
        email=email,
    ).single()
    if not user:
        return None

    user_node = dict(user["u"])

    files = session.run(
        "MATCH (u:User {email: $email})-[:OWNS]->(f:File) RETURN f",
        email=email,
    ).data()

    questions = session.run(
        """
        MATCH (u:User {email: $email})-[:HAS_QUESTION]->(q:Question)
        OPTIONAL MATCH (q)-[:HAS_ANSWER]->(a:Answer)
        OPTIONAL MATCH (q)-[:HAS_PRACTICE]->(p:Practice)
        RETURN q,
               collect(DISTINCT a) AS answers,
               collect(DISTINCT p) AS practices
        """,
        email=email,
    ).data()

    return {
        "user": user_node,
        "files": [dict(r["f"]) for r in files],
        "questions": [
            {
                "q": dict(r["q"]),
                "answers": [dict(a) for a in r["answers"] if a is not None],
                "practices": [dict(p) for p in r["practices"] if p is not None],
            }
            for r in questions
        ],
    }


def wipe_owned_data(session, email):
    """Delete all owned data for a user. Keeps the user node intact."""
    session.run(
        """
        MATCH (u:User {email: $email})-[:HAS_QUESTION]->(q:Question)
        OPTIONAL MATCH (q)-[:HAS_ANSWER]->(a:Answer)
        OPTIONAL MATCH (q)-[:HAS_PRACTICE]->(p:Practice)
        DETACH DELETE q, a, p
        """,
        email=email,
    )
    session.run(
        """
        MATCH (u:User {email: $email})-[:OWNS]->(f:File)
        DETACH DELETE f
        """,
        email=email,
    )


def upsert_user(session, user_node):
    """Create user if missing, otherwise overwrite all properties."""
    session.run(
        """
        MERGE (u:User {email: $email})
        SET u = $props
        """,
        email=user_node["email"],
        props=user_node,
    )


def write_bundle(session, bundle):
    """Write user + all owned data to a target session."""
    user = bundle["user"]
    upsert_user(session, user)

    for f_props in bundle["files"]:
        session.run(
            """
            MATCH (u:User {email: $email})
            CREATE (f:File)
            SET f = $props
            CREATE (u)-[:OWNS]->(f)
            """,
            email=user["email"],
            props=f_props,
        )

    for q_data in bundle["questions"]:
        q_props = q_data["q"]
        q_id = q_props["id"]
        session.run(
            """
            MATCH (u:User {email: $email})
            CREATE (q:Question)
            SET q = $props
            CREATE (u)-[:HAS_QUESTION]->(q)
            """,
            email=user["email"],
            props=q_props,
        )
        for a_props in q_data["answers"]:
            session.run(
                """
                MATCH (q:Question {id: $q_id})
                CREATE (a:Answer)
                SET a = $props
                CREATE (q)-[:HAS_ANSWER]->(a)
                """,
                q_id=q_id,
                props=a_props,
            )
        for p_props in q_data["practices"]:
            session.run(
                """
                MATCH (q:Question {id: $q_id})
                CREATE (p:Practice)
                SET p = $props
                CREATE (q)-[:HAS_PRACTICE]->(p)
                """,
                q_id=q_id,
                props=p_props,
            )


def fmt_bundle_summary(bundle):
    n_questions = len(bundle["questions"])
    n_answers = sum(len(q["answers"]) for q in bundle["questions"])
    n_practices = sum(len(q["practices"]) for q in bundle["questions"])
    return (
        f"   • Files: {len(bundle['files'])}\n"
        f"   • Questions: {n_questions}\n"
        f"   • Answers: {n_answers}\n"
        f"   • Practices: {n_practices}"
    )


def main():
    parser = argparse.ArgumentParser(
        description="Sync demo user data from local Neo4j to production AuraDB.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--local-uri", default=DEFAULT_LOCAL_URI)
    parser.add_argument("--local-user", default=DEFAULT_LOCAL_USER)
    parser.add_argument("--local-password", default=DEFAULT_LOCAL_PASSWORD)
    parser.add_argument("--prod-uri", required=True)
    parser.add_argument("--prod-user", required=True)
    parser.add_argument("--prod-password", required=True)
    parser.add_argument("--email", default=DEFAULT_EMAIL)
    parser.add_argument("--yes", action="store_true", help="Skip the confirmation prompt")
    parser.add_argument("--dry-run", action="store_true", help="Show what would happen, don't write")
    args = parser.parse_args()

    print(f"📥 Local: {args.local_uri}")
    local_driver = GraphDatabase.driver(
        args.local_uri,
        auth=(args.local_user, args.local_password),
        notifications_disabled_categories=["UNRECOGNIZED"],
    )
    print(f"📤 Prod:  {args.prod_uri}")
    prod_driver = GraphDatabase.driver(
        args.prod_uri,
        auth=(args.prod_user, args.prod_password),
        notifications_disabled_categories=["UNRECOGNIZED"],
    )

    try:
        # 1. Read local
        with local_driver.session() as session:
            local_bundle = read_user_bundle(session, args.email)

        if not local_bundle:
            print(f"\n❌ User {args.email} not found in local DB. Nothing to sync.")
            sys.exit(1)

        # 2. Read prod (just for the summary of what'll be wiped)
        with prod_driver.session() as session:
            prod_bundle = read_user_bundle(session, args.email)

        print(f"\n📦 Local data for {args.email}:")
        print(fmt_bundle_summary(local_bundle))

        if prod_bundle:
            print(f"\n🗑  Existing prod data for {args.email} (will be wiped):")
            print(fmt_bundle_summary(prod_bundle))
        else:
            print(f"\n✨ User {args.email} doesn't exist on prod yet — will be created.")

        if args.dry_run:
            print("\n[dry-run] No changes written.")
            return

        # 3. Confirm
        if not args.yes:
            confirm = input("\nProceed? [y/N]: ").strip().lower()
            if confirm != "y":
                print("Aborted.")
                return

        # 4. Wipe + write
        with prod_driver.session() as session:
            if prod_bundle:
                print("\n🧹 Wiping owned data on prod...")
                wipe_owned_data(session, args.email)
            print("📤 Writing data to prod...")
            write_bundle(session, local_bundle)

        print("\n✅ Done. Visit https://offerbloom.vercel.app to verify.")

    finally:
        local_driver.close()
        prod_driver.close()


if __name__ == "__main__":
    main()
