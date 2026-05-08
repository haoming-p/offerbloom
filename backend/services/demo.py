"""Helpers for the public demo: each visitor gets their own :User:DemoGuest node
with a fresh clone of the demo source user's data. Files share R2 keys (metadata clone only)."""

import uuid
from neo4j import Session

from auth.password import hash_password


def clone_user_data(db: Session, src_id: str, tgt_id: str) -> None:
    """Copy all user-owned data from src to tgt. Assumes both User nodes already exist."""

    # 1. User-level JSON properties (roles, positions, statuses, onboarded flag)
    db.run(
        """
        MATCH (src:User {id: $src_id}), (tgt:User {id: $tgt_id})
        SET tgt.roles = COALESCE(src.roles, '[]'),
            tgt.positions = COALESCE(src.positions, '[]'),
            tgt.statuses = COALESCE(src.statuses, '[]'),
            tgt.onboarded = COALESCE(src.onboarded, false)
        """,
        src_id=src_id,
        tgt_id=tgt_id,
    )

    # 2. Files — clone metadata, share R2 keys
    files = db.run(
        "MATCH (u:User {id: $id})-[:OWNS]->(f:File) RETURN f",
        id=src_id,
    ).data()
    for record in files:
        props = dict(record["f"])
        props["id"] = str(uuid.uuid4())
        db.run(
            """
            MATCH (u:User {id: $tgt_id})
            CREATE (f:File)
            SET f = $props
            CREATE (u)-[:OWNS]->(f)
            """,
            tgt_id=tgt_id,
            props=props,
        )

    # 3. Questions + nested answers + practices
    rows = db.run(
        """
        MATCH (u:User {id: $id})-[:HAS_QUESTION]->(q:Question)
        OPTIONAL MATCH (q)-[:HAS_ANSWER]->(a:Answer)
        OPTIONAL MATCH (q)-[:HAS_PRACTICE]->(p:Practice)
        RETURN q,
               collect(DISTINCT a) AS answers,
               collect(DISTINCT p) AS practices
        """,
        id=src_id,
    ).data()

    for row in rows:
        q_props = dict(row["q"])
        new_q_id = str(uuid.uuid4())
        q_props["id"] = new_q_id
        db.run(
            """
            MATCH (u:User {id: $tgt_id})
            CREATE (q:Question)
            SET q = $props
            CREATE (u)-[:HAS_QUESTION]->(q)
            """,
            tgt_id=tgt_id,
            props=q_props,
        )

        for a in row["answers"] or []:
            if a is None:
                continue
            a_props = dict(a)
            a_props["id"] = str(uuid.uuid4())
            db.run(
                """
                MATCH (q:Question {id: $q_id})
                CREATE (a:Answer)
                SET a = $props
                CREATE (q)-[:HAS_ANSWER]->(a)
                """,
                q_id=new_q_id,
                props=a_props,
            )

        for p in row["practices"] or []:
            if p is None:
                continue
            p_props = dict(p)
            p_props["id"] = str(uuid.uuid4())
            db.run(
                """
                MATCH (q:Question {id: $q_id})
                CREATE (p:Practice)
                SET p = $props
                CREATE (q)-[:HAS_PRACTICE]->(p)
                """,
                q_id=new_q_id,
                props=p_props,
            )


def create_demo_guest(db: Session, admin_email: str) -> dict:
    """Create a fresh :User:DemoGuest, clone admin's data into it, return guest info.
    Raises ValueError if admin user not found."""
    admin = db.run(
        "MATCH (u:User {email: $email}) RETURN u",
        email=admin_email,
    ).single()
    if not admin:
        raise ValueError("Demo source user not found")
    admin_id = admin["u"]["id"]

    guest_id = str(uuid.uuid4())
    guest_email = f"guest-{guest_id}@offerbloom.local"
    guest_name = "Demo User"

    db.run(
        """
        CREATE (g:User:DemoGuest {
            id: $id,
            name: $name,
            email: $email,
            password: $password,
            created_at: datetime()
        })
        """,
        id=guest_id,
        name=guest_name,
        email=guest_email,
        password=hash_password(str(uuid.uuid4())),
    )

    clone_user_data(db, admin_id, guest_id)

    return {"id": guest_id, "name": guest_name, "email": guest_email}


def delete_user_and_data(db: Session, user_id: str) -> None:
    """Fully delete a user node and all owned data (questions, answers, practices, files).
    R2 objects are NOT deleted — Neo4j metadata only."""
    db.run(
        """
        MATCH (u:User {id: $id})
        OPTIONAL MATCH (u)-[:HAS_QUESTION]->(q:Question)
        OPTIONAL MATCH (q)-[:HAS_ANSWER]->(a:Answer)
        OPTIONAL MATCH (q)-[:HAS_PRACTICE]->(p:Practice)
        OPTIONAL MATCH (u)-[:OWNS]->(f:File)
        DETACH DELETE u, q, a, p, f
        """,
        id=user_id,
    )


def delete_old_guests(db: Session, ttl_hours: int = 24) -> int:
    """Delete :DemoGuest nodes (and all their data) older than ttl_hours. Returns total nodes deleted."""
    result = db.run(
        """
        MATCH (g:DemoGuest)
        WHERE g.created_at < datetime() - duration({hours: $ttl})
        OPTIONAL MATCH (g)-[:HAS_QUESTION]->(q:Question)
        OPTIONAL MATCH (q)-[:HAS_ANSWER]->(a:Answer)
        OPTIONAL MATCH (q)-[:HAS_PRACTICE]->(p:Practice)
        OPTIONAL MATCH (g)-[:OWNS]->(f:File)
        DETACH DELETE g, q, a, p, f
        """,
        ttl=ttl_hours,
    )
    summary = result.consume()
    return summary.counters.nodes_deleted


def wipe_user_data(db: Session, user_id: str) -> None:
    """Delete a user's owned data (files, questions, answers, practices) and reset
    JSON props. Does NOT delete the User node itself. R2 objects are NOT deleted —
    we only remove Neo4j metadata so shared keys stay intact."""

    # Questions + nested answers + practices
    db.run(
        """
        MATCH (u:User {id: $id})-[:HAS_QUESTION]->(q:Question)
        OPTIONAL MATCH (q)-[:HAS_ANSWER]->(a:Answer)
        OPTIONAL MATCH (q)-[:HAS_PRACTICE]->(p:Practice)
        DETACH DELETE a, p, q
        """,
        id=user_id,
    )

    # Files (metadata only)
    db.run(
        """
        MATCH (u:User {id: $id})-[:OWNS]->(f:File)
        DETACH DELETE f
        """,
        id=user_id,
    )

    # Reset JSON props
    db.run(
        """
        MATCH (u:User {id: $id})
        SET u.roles = '[]', u.positions = '[]', u.statuses = '[]', u.onboarded = false
        """,
        id=user_id,
    )
