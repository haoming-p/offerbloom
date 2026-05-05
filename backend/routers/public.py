from fastapi import APIRouter, Depends
from neo4j import Session
from database import get_db

router = APIRouter(prefix="/public", tags=["public"])

ROLES = [
    {"id": "sde",       "label": "Software Engineer",  "emoji": "💻"},
    {"id": "pm",        "label": "Product Manager",     "emoji": "🎯"},
    {"id": "ds",        "label": "Data Scientist",      "emoji": "📊"},
    {"id": "devops",    "label": "DevOps Engineer",     "emoji": "⚙️"},
    {"id": "marketing", "label": "Marketing",           "emoji": "📢"},
    {"id": "qa",        "label": "QA Analyst",          "emoji": "🔍"},
    {"id": "ux",        "label": "UX Designer",         "emoji": "🎨"},
    {"id": "hr",        "label": "HR Specialist",       "emoji": "👥"},
]

CATEGORIES = [
    {"id": "adaptability",        "label": "Adaptability"},
    {"id": "career_goals",        "label": "Career Goals"},
    {"id": "conflict_resolution", "label": "Conflict Resolution"},
    {"id": "culture_fit",         "label": "Culture Fit"},
    {"id": "leadership",          "label": "Leadership"},
    {"id": "motivation",          "label": "Motivation"},
    {"id": "team_collaboration",  "label": "Team Collaboration"},
    {"id": "work_style",          "label": "Work Style"},
]


@router.get("/roles")
def list_roles():
    return ROLES


@router.get("/categories")
def list_categories():
    return CATEGORIES


@router.get("/questions")
def list_public_questions(
    role_id: str | None = None,
    category_id: str | None = None,
    difficulty: str | None = None,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    conditions = []
    params: dict = {"limit": limit}

    if role_id:
        conditions.append("q.role_id = $role_id")
        params["role_id"] = role_id
    if category_id:
        conditions.append("q.category_id = $category_id")
        params["category_id"] = category_id
    if difficulty:
        conditions.append("q.difficulty = $difficulty")
        params["difficulty"] = difficulty

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    cypher = f"MATCH (q:PreloadedQuestion) {where} RETURN q LIMIT $limit"

    result = db.run(cypher, **params)
    return [
        {
            "id":          r["q"]["id"],
            "text":        r["q"]["text"],
            "role_id":     r["q"]["role_id"],
            "category_id": r["q"]["category_id"],
            "difficulty":  r["q"].get("difficulty", ""),
            "experience":  r["q"].get("experience", ""),
            "ideal_answer":r["q"].get("ideal_answer", ""),
        }
        for r in result.data()
    ]
