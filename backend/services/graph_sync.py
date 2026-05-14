"""Mirror user's role/position JSON to graph nodes.

Existing code stores roles/positions as JSON strings on the User node — fast and
simple, but you can't traverse "this file is for the PM @ Apple position" via Cypher.

This module does dual-write: JSON stays authoritative for the existing UI; we
mirror to graph nodes so RAG retrieval and file-link queries can use the graph.

Schema added:
  (:User)-[:HAS_ROLE]->(:Role {id, label, emoji, desc})
  (:User)-[:HAS_POSITION]->(:Position {id, title, company, jd}) -[:FOR_ROLE]->(:Role)
"""

import json
from neo4j import Session


def sync_user_roles(db: Session, user_id: str, roles: list[dict]) -> None:
    """Replace user's :Role nodes with the given list. Drops orphaned roles.
    Batched via UNWIND — one round-trip for the upsert regardless of role count."""
    db.run(
        """
        MATCH (u:User {id: $user_id})-[r:HAS_ROLE]->(role:Role)
        WHERE NOT role.id IN $keep_ids
        DETACH DELETE role
        """,
        user_id=user_id,
        keep_ids=[r["id"] for r in roles],
    )

    if not roles:
        return

    db.run(
        """
        MATCH (u:User {id: $user_id})
        UNWIND $roles AS r
        MERGE (u)-[:HAS_ROLE]->(role:Role {id: r.id})
        SET role.label = r.label,
            role.emoji = r.emoji,
            role.desc = r.desc
        """,
        user_id=user_id,
        roles=[
            {
                "id": r["id"],
                "label": r.get("label", ""),
                "emoji": r.get("emoji", ""),
                "desc": r.get("desc", ""),
            }
            for r in roles
        ],
    )


def sync_user_positions(db: Session, user_id: str, positions: list[dict]) -> None:
    """Replace user's :Position nodes with the given list. Each Position is
    linked back to its :Role via [:FOR_ROLE]. Drops orphaned positions.
    Batched via UNWIND — two round-trips total (upsert + role links)."""
    db.run(
        """
        MATCH (u:User {id: $user_id})-[r:HAS_POSITION]->(p:Position)
        WHERE NOT p.id IN $keep_ids
        DETACH DELETE p
        """,
        user_id=user_id,
        keep_ids=[str(p["id"]) for p in positions],
    )

    if not positions:
        return

    pos_rows = [
        {
            "id": str(p["id"]),
            "title": p.get("title", ""),
            "company": p.get("company", ""),
            "jd": p.get("jd", ""),
            "role_id": p.get("role", ""),
        }
        for p in positions
    ]

    db.run(
        """
        MATCH (u:User {id: $user_id})
        UNWIND $positions AS p
        MERGE (u)-[:HAS_POSITION]->(pos:Position {id: p.id})
        SET pos.title = p.title,
            pos.company = p.company,
            pos.jd = p.jd,
            pos.role_id = p.role_id
        """,
        user_id=user_id,
        positions=pos_rows,
    )

    # Link positions → roles for those that have a role_id. Scoped through the
    # user so we only touch this user's :Position / :Role nodes (the original
    # per-row code matched globally by id, which could collide across users).
    pos_with_role = [p for p in pos_rows if p["role_id"]]
    if pos_with_role:
        db.run(
            """
            MATCH (u:User {id: $user_id})
            UNWIND $links AS link
            MATCH (u)-[:HAS_POSITION]->(pos:Position {id: link.id})
            MATCH (u)-[:HAS_ROLE]->(role:Role {id: link.role_id})
            MERGE (pos)-[:FOR_ROLE]->(role)
            """,
            user_id=user_id,
            links=pos_with_role,
        )


def sync_user_from_json(db: Session, user_id: str) -> dict:
    """Read user's roles/positions JSON props and rebuild graph nodes from them.
    Returns a count summary. Idempotent — safe to run on every save."""
    record = db.run(
        "MATCH (u:User {id: $id}) RETURN u.roles AS roles, u.positions AS positions",
        id=user_id,
    ).single()
    if not record:
        return {"roles": 0, "positions": 0, "found": False}

    try:
        roles = json.loads(record["roles"] or "[]")
    except (TypeError, json.JSONDecodeError):
        roles = []
    try:
        positions = json.loads(record["positions"] or "[]")
    except (TypeError, json.JSONDecodeError):
        positions = []

    sync_user_roles(db, user_id, roles)
    sync_user_positions(db, user_id, positions)

    return {"roles": len(roles), "positions": len(positions), "found": True}
