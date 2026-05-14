"""One-shot diagnostic: count PreloadedQuestion nodes in Neo4j.

Run from backend/ with the venv active:
    python -m scripts.check_preloaded

Uses whichever NEO4J_URI is set in backend/.env, so this checks the same DB
your backend talks to.
"""
from collections import defaultdict
from database import driver


def main():
    with driver.session() as session:
        total = session.run("MATCH (q:PreloadedQuestion) RETURN count(q) AS n").single()["n"]
        print(f"Total PreloadedQuestion nodes: {total}\n")

        if total == 0:
            print("→ Pool is EMPTY. Nothing to seed from.")
            print("  Run: python -m scripts.ingest_github_questions --write")
            return

        rows = session.run(
            """
            MATCH (q:PreloadedQuestion)
            RETURN q.role_id AS role, q.category_id AS category, count(q) AS n
            ORDER BY role, category
            """
        ).data()

        print(f"{'role':10}  {'category':20}  count")
        print("-" * 40)
        for r in rows:
            print(f"{r['role']:10}  {r['category']:20}  {r['n']}")


if __name__ == "__main__":
    main()
