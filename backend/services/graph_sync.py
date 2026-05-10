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
    """Replace user's :Role nodes with the given list. Drops orphaned roles."""
    db.run(
        """
        MATCH (u:User {id: $user_id})-[r:HAS_ROLE]->(role:Role)
        WHERE NOT role.id IN $keep_ids
        DETACH DELETE role
        """,
        user_id=user_id,
        keep_ids=[r["id"] for r in roles],
    )

    for r in roles:
        db.run(
            """
            MATCH (u:User {id: $user_id})
            MERGE (u)-[:HAS_ROLE]->(role:Role {id: $id})
            SET role.label = $label,
                role.emoji = $emoji,
                role.desc = $desc
            """,
            user_id=user_id,
            id=r["id"],
            label=r.get("label", ""),
            emoji=r.get("emoji", ""),
            desc=r.get("desc", ""),
        )


def sync_user_positions(db: Session, user_id: str, positions: list[dict]) -> None:
    """Replace user's :Position nodes with the given list. Each Position is
    linked back to its :Role via [:FOR_ROLE]. Drops orphaned positions."""
    db.run(
        """
        MATCH (u:User {id: $user_id})-[r:HAS_POSITION]->(p:Position)
        WHERE NOT p.id IN $keep_ids
        DETACH DELETE p
        """,
        user_id=user_id,
        keep_ids=[str(p["id"]) for p in positions],
    )

    for p in positions:
        pid = str(p["id"])
        db.run(
            """
            MATCH (u:User {id: $user_id})
            MERGE (u)-[:HAS_POSITION]->(pos:Position {id: $id})
            SET pos.title = $title,
                pos.company = $company,
                pos.jd = $jd,
                pos.role_id = $role_id
            """,
            user_id=user_id,
            id=pid,
            title=p.get("title", ""),
            company=p.get("company", ""),
            jd=p.get("jd", ""),
            role_id=p.get("role", ""),
        )

        # Link to the role node
        if p.get("role"):
            db.run(
                """
                MATCH (pos:Position {id: $pos_id})
                MATCH (role:Role {id: $role_id})
                MERGE (pos)-[:FOR_ROLE]->(role)
                """,
                pos_id=pid,
                role_id=p["role"],
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
