import uuid
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from neo4j import Session

from database import get_db
from models.question import QuestionOut, QuestionCreate, QuestionUpdate
from auth.jwt import decode_token

router = APIRouter(prefix="/questions", tags=["questions"])
bearer = HTTPBearer()

# Per-role default category ids. Used by "All" mode to seed every default
# category at once, so navigating between tabs after that doesn't leave the
# All view stale relative to per-category caches in the frontend. Keep this
# in sync with DEFAULT_CATEGORIES_BY_ROLE in frontend/.../PrepTab.jsx.
DEFAULT_CATEGORIES_BY_ROLE: dict[str, list[str]] = {
    "pm": ["bq", "product_sense", "general"],
    "sde": ["bq", "algorithm", "system_design"],
    "pjm": ["bq"],
}


# Default questions seeded for each role+category combo on first access
DEFAULT_QUESTIONS: dict[str, list[str]] = {
    "pm-bq": [
        "How do you prioritize?",
        "How do you align stakeholders?",
        "A case to deal with conflicts?",
        "How to hold accountability",
        "Tell me the most complicated project you managed",
    ],
    "pm-product_sense": [
        "How would you improve a product you use daily?",
        "Define success metrics for a new feature",
        "Walk me through a product launch strategy",
        "How do you make trade-offs between user needs and business goals?",
        "Describe a data-driven product decision you made",
    ],
    "pm-general": [
        "Why product management?",
        "Tell me about yourself",
        "What's your biggest strength and weakness?",
        "Where do you see yourself in 5 years?",
        "Why should we hire you?",
    ],
    "sde-bq": [
        "Tell me about a challenging technical project",
        "Describe a time you disagreed with a teammate's approach",
        "How do you handle tight deadlines?",
        "Tell me about a time you mentored someone",
        "Describe a time you had to learn something quickly",
    ],
    "sde-algorithm": [
        "How would you find the longest substring without repeating characters?",
        "Implement a LRU cache",
        "Merge k sorted linked lists",
        "Find the shortest path in a weighted graph",
        "Design an algorithm for task scheduling with dependencies",
    ],
    "sde-system_design": [
        "Design a URL shortener",
        "Design a chat messaging system",
        "Design a news feed",
        "Design a rate limiter",
        "Design a notification system",
    ],
    "sde-general": [
        "Why software engineering?",
        "Tell me about yourself",
        "What's your preferred tech stack and why?",
        "How do you stay current with new technologies?",
        "Describe your debugging process",
    ],
}


def _get_current_user_id(credentials: HTTPAuthorizationCredentials) -> str:
    try:
        payload = decode_token(credentials.credentials)
        return payload["sub"]
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def _seed_defaults(db: Session, user_id: str, role_id: str, category_id: str, position_key: str):
    """Seed questions from PreloadedQuestion pool; fallback to hardcoded defaults."""
    preloaded = db.run(
        """
        MATCH (q:PreloadedQuestion {role_id: $role_id, category_id: $category_id})
        RETURN q ORDER BY q.difficulty ASC LIMIT 10
        """,
        role_id=role_id,
        category_id=category_id,
    ).data()

    if preloaded:
        for i, row in enumerate(preloaded):
            pq = row["q"]
            q_id = str(uuid.uuid4())
            db.run(
                """
                MATCH (u:User {id: $user_id})
                CREATE (q:Question {
                    id: $id,
                    text: $text,
                    role_id: $role_id,
                    category_id: $category_id,
                    position_key: $position_key,
                    order: $order,
                    difficulty: $difficulty,
                    experience: $experience,
                    ideal_answer: $ideal_answer
                })
                CREATE (u)-[:HAS_QUESTION]->(q)
                """,
                user_id=user_id,
                id=q_id,
                text=pq["text"],
                role_id=role_id,
                category_id=category_id,
                position_key=position_key,
                order=i,
                difficulty=pq.get("difficulty", ""),
                experience=pq.get("experience", ""),
                ideal_answer=pq.get("ideal_answer", ""),
            )
        return

    # Fallback: hardcoded defaults for technical categories not in Kaggle pool
    key = f"{role_id}-{category_id}"
    for i, text in enumerate(DEFAULT_QUESTIONS.get(key, [])):
        q_id = str(uuid.uuid4())
        db.run(
            """
            MATCH (u:User {id: $user_id})
            CREATE (q:Question {
                id: $id,
                text: $text,
                role_id: $role_id,
                category_id: $category_id,
                position_key: $position_key,
                order: $order,
                difficulty: '',
                experience: '',
                ideal_answer: ''
            })
            CREATE (u)-[:HAS_QUESTION]->(q)
            """,
            user_id=user_id,
            id=q_id,
            text=text,
            role_id=role_id,
            category_id=category_id,
            position_key=position_key,
            order=i,
        )


@router.get("/", response_model=list[QuestionOut])
def list_questions(
    role_id: str,
    category_id: str | None = None,
    position_key: str = "general",
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    """List questions for a role + position. If category_id is omitted, returns
    questions across all categories (used by the 'All' tab). Default seeding
    is skipped in 'all' mode since we don't know which category to seed."""
    user_id = _get_current_user_id(credentials)

    if category_id:
        result = db.run(
            """
            MATCH (u:User {id: $user_id})-[:HAS_QUESTION]->(q:Question {
                role_id: $role_id,
                category_id: $category_id,
                position_key: $position_key
            })
            RETURN q ORDER BY q.order ASC
            """,
            user_id=user_id,
            role_id=role_id,
            category_id=category_id,
            position_key=position_key,
        )
        records = result.data()

        # Seed defaults ONLY under position_key='general' on first access.
        # Per-position lists stay user-curated to avoid duplicate seeded questions.
        if not records and position_key == "general":
            _seed_defaults(db, user_id, role_id, category_id, position_key)
            result = db.run(
                """
                MATCH (u:User {id: $user_id})-[:HAS_QUESTION]->(q:Question {
                    role_id: $role_id,
                    category_id: $category_id,
                    position_key: $position_key
                })
                RETURN q ORDER BY q.order ASC
                """,
                user_id=user_id,
                role_id=role_id,
                category_id=category_id,
                position_key=position_key,
            )
            records = result.data()
    else:
        # 'All' mode — every category for this role + position.
        # On general position only, also seed every default category that's
        # still empty. Without this, the frontend's 'All' cache can stay stale
        # relative to a later per-category fetch that triggers seeding.
        if position_key == "general":
            for cat in DEFAULT_CATEGORIES_BY_ROLE.get(role_id, []):
                has_any = db.run(
                    """
                    MATCH (u:User {id: $user_id})-[:HAS_QUESTION]->(q:Question {
                        role_id: $role_id,
                        category_id: $cat,
                        position_key: $position_key
                    })
                    RETURN q LIMIT 1
                    """,
                    user_id=user_id,
                    role_id=role_id,
                    cat=cat,
                    position_key=position_key,
                ).single()
                if not has_any:
                    _seed_defaults(db, user_id, role_id, cat, position_key)

        result = db.run(
            """
            MATCH (u:User {id: $user_id})-[:HAS_QUESTION]->(q:Question {
                role_id: $role_id,
                position_key: $position_key
            })
            RETURN q ORDER BY q.category_id ASC, q.order ASC
            """,
            user_id=user_id,
            role_id=role_id,
            position_key=position_key,
        )
        records = result.data()

    question_ids = [r["q"]["id"] for r in records]

    # Fetch all answers for these questions in one query
    answers_by_q: dict[str, list] = {qid: [] for qid in question_ids}
    if question_ids:
        ans_result = db.run(
            """
            MATCH (q:Question)-[:HAS_ANSWER]->(a:Answer)
            WHERE q.id IN $ids
            RETURN q.id AS q_id, a
            """,
            ids=question_ids,
        )
        for row in ans_result.data():
            answers_by_q[row["q_id"]].append({
                "id": row["a"]["id"],
                "label": row["a"]["label"],
                "content": row["a"]["content"],
            })

    return [
        QuestionOut(
            id=r["q"]["id"],
            text=r["q"]["text"],
            role_id=r["q"]["role_id"],
            category_id=r["q"]["category_id"],
            position_key=r["q"]["position_key"],
            order=r["q"]["order"],
            difficulty=r["q"].get("difficulty", ""),
            experience=r["q"].get("experience", ""),
            ideal_answer=r["q"].get("ideal_answer", ""),
            answers=answers_by_q.get(r["q"]["id"], []),
        )
        for r in records
    ]


@router.post("/", response_model=QuestionOut, status_code=201)
def create_question(
    data: QuestionCreate,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    user_id = _get_current_user_id(credentials)

    # category_id is optional. Untagged questions store as empty string so Cypher
    # property comparisons stay simple (Neo4j prefers empty over null for this).
    cat_id = data.category_id or ""

    # Place new question at the top (order = -1, then shift others)
    q_id = str(uuid.uuid4())
    db.run(
        """
        MATCH (u:User {id: $user_id})-[:HAS_QUESTION]->(q:Question {
            role_id: $role_id,
            category_id: $category_id,
            position_key: $position_key
        })
        SET q.order = q.order + 1
        """,
        user_id=user_id,
        role_id=data.role_id,
        category_id=cat_id,
        position_key=data.position_key,
    )
    db.run(
        """
        MATCH (u:User {id: $user_id})
        CREATE (q:Question {
            id: $id,
            text: $text,
            role_id: $role_id,
            category_id: $category_id,
            position_key: $position_key,
            order: 0
        })
        CREATE (u)-[:HAS_QUESTION]->(q)
        """,
        user_id=user_id,
        id=q_id,
        text=data.text,
        role_id=data.role_id,
        category_id=cat_id,
        position_key=data.position_key,
    )

    return QuestionOut(
        id=q_id,
        text=data.text,
        role_id=data.role_id,
        category_id=cat_id,
        position_key=data.position_key,
        order=0,
    )


@router.put("/{question_id}", response_model=QuestionOut)
def update_question(
    question_id: str,
    data: QuestionUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    user_id = _get_current_user_id(credentials)
    record = db.run(
        """
        MATCH (u:User {id: $user_id})-[:HAS_QUESTION]->(q:Question {id: $q_id})
        SET q.text = $text
        RETURN q
        """,
        user_id=user_id,
        q_id=question_id,
        text=data.text,
    ).single()
    if not record:
        raise HTTPException(status_code=404, detail="Question not found")
    q = record["q"]
    return QuestionOut(
        id=q["id"],
        text=q["text"],
        role_id=q["role_id"],
        category_id=q.get("category_id", ""),
        position_key=q["position_key"],
        order=q["order"],
        difficulty=q.get("difficulty", ""),
        experience=q.get("experience", ""),
        ideal_answer=q.get("ideal_answer", ""),
    )


from pydantic import BaseModel


class ReorderRequest(BaseModel):
    role_id: str
    category_id: str
    position_key: str = "general"
    ordered_ids: list[str]


@router.post("/reorder", status_code=204)
def reorder_questions(
    body: ReorderRequest,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    user_id = _get_current_user_id(credentials)
    for index, qid in enumerate(body.ordered_ids):
        db.run(
            """
            MATCH (u:User {id: $user_id})-[:HAS_QUESTION]->(q:Question {id: $qid})
            WHERE q.role_id = $role_id AND q.category_id = $category_id AND q.position_key = $position_key
            SET q.order = $order
            """,
            user_id=user_id,
            qid=qid,
            role_id=body.role_id,
            category_id=body.category_id,
            position_key=body.position_key,
            order=index,
        )


@router.delete("/{question_id}", status_code=204)
def delete_question(
    question_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    user_id = _get_current_user_id(credentials)

    result = db.run(
        """
        MATCH (u:User {id: $user_id})-[:HAS_QUESTION]->(q:Question {id: $q_id})
        RETURN q
        """,
        user_id=user_id,
        q_id=question_id,
    )
    if not result.single():
        raise HTTPException(status_code=404, detail="Question not found")

    db.run(
        """
        MATCH (u:User {id: $user_id})-[:HAS_QUESTION]->(q:Question {id: $q_id})
        DETACH DELETE q
        """,
        user_id=user_id,
        q_id=question_id,
    )
