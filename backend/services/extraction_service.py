import re
from dataclasses import dataclass
from typing import Iterable


@dataclass
class EntityCandidate:
    text: str
    entity_type: str
    normalized_text: str
    confidence: float
    source: str = "initial_heuristic"


@dataclass
class TripleCandidate:
    subject_text: str
    predicate: str
    object_text: str
    confidence: float
    status: str = "pending_validation"


SKILLS = {
    "python", "sql", "excel", "tableau", "power bi", "neo4j", "fastapi", "react",
    "typescript", "javascript", "machine learning", "artificial intelligence", "ai",
    "rag", "retrieval augmented generation", "data analysis", "business analytics",
    "financial analysis", "accounting", "product management", "project management",
    "stakeholder management", "leadership", "security", "satellite communications",
    "computer vision", "nlp", "natural language processing", "pytorch", "tensorflow",
    "docker", "postgresql", "mongodb", "cypher", "graphql"
}

TOOLS = {
    "neo4j", "postgresql", "mongodb", "docker", "git", "github", "tableau",
    "power bi", "excel", "fastapi", "react", "vite", "jira", "confluence",
    "aws", "cloudflare r2", "ollama", "crewai", "langchain"
}

DOMAINS = {
    "finance", "accounting", "autonomous vehicles", "defense", "security",
    "education", "healthcare", "military", "satellite communications",
    "computer vision", "human-computer interaction", "information retrieval"
}

ENTITY_TYPE_TO_LABEL = {
    "Skill": "Skill",
    "Tool": "Tool",
    "Organization": "Organization",
    "Role": "Role",
    "Project": "Project",
    "Experience": "Experience",
    "Education": "Education",
    "Certification": "Certification",
    "Domain": "Domain",
}


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower())


def contains_phrase(haystack: str, phrase: str) -> bool:
    pattern = r"(?<![a-zA-Z0-9])" + re.escape(phrase) + r"(?![a-zA-Z0-9])"
    return re.search(pattern, haystack, flags=re.IGNORECASE) is not None


def label_for_entity_type(entity_type: str) -> str | None:
    return ENTITY_TYPE_TO_LABEL.get(entity_type)


def extract_entities(text: str) -> list[EntityCandidate]:
    found: dict[tuple[str, str], EntityCandidate] = {}
    lower = normalize_text(text)

    for skill in SKILLS:
        if contains_phrase(lower, skill):
            normalized = normalize_text(skill)
            label = "AI" if normalized == "ai" else skill.title()
            found[("Skill", normalized)] = EntityCandidate(
                text=label,
                entity_type="Skill",
                normalized_text=normalized,
                confidence=0.75,
            )

    for tool in TOOLS:
        if contains_phrase(lower, tool):
            normalized = normalize_text(tool)
            found[("Tool", normalized)] = EntityCandidate(
                text=tool,
                entity_type="Tool",
                normalized_text=normalized,
                confidence=0.72,
            )

    for domain in DOMAINS:
        if contains_phrase(lower, domain):
            normalized = normalize_text(domain)
            found[("Domain", normalized)] = EntityCandidate(
                text=domain.title(),
                entity_type="Domain",
                normalized_text=normalized,
                confidence=0.68,
            )

    for org in extract_possible_organizations(text):
        normalized = normalize_text(org)
        found[("Organization", normalized)] = EntityCandidate(
            text=org,
            entity_type="Organization",
            normalized_text=normalized,
            confidence=0.55,
        )

    return sorted(found.values(), key=lambda e: (e.entity_type, e.normalized_text))


def extract_possible_organizations(text: str) -> list[str]:
    patterns = [
        r"\b(?:at|for|with)\s+([A-Z][A-Za-z0-9&.\-]+(?:\s+[A-Z][A-Za-z0-9&.\-]+){0,3})",
        r"\b([A-Z][A-Za-z0-9&.\-]+(?:\s+[A-Z][A-Za-z0-9&.\-]+){0,2})\s+(?:Inc|LLC|Corp|Corporation|University|College)\b",
    ]

    found = set()
    for pattern in patterns:
        for match in re.finditer(pattern, text):
            candidate = match.group(1).strip()
            if len(candidate) >= 3 and not candidate.lower().startswith(("the ", "a ")):
                found.add(candidate)

    return sorted(found)[:25]


def build_user_triples(user_subject: str, entities: Iterable[EntityCandidate]) -> list[TripleCandidate]:
    triples: list[TripleCandidate] = []

    for entity in entities:
        if entity.entity_type == "Skill":
            predicate = "HAS_SKILL"
        elif entity.entity_type == "Tool":
            predicate = "HAS_USED_TOOL"
        elif entity.entity_type == "Domain":
            predicate = "HAS_DOMAIN_EXPOSURE"
        elif entity.entity_type == "Organization":
            predicate = "HAS_AFFILIATION_WITH"
        else:
            predicate = f"MENTIONS_{entity.entity_type.upper()}"

        triples.append(
            TripleCandidate(
                subject_text=user_subject,
                predicate=predicate,
                object_text=entity.text,
                confidence=max(0.45, entity.confidence - 0.05),
            )
        )

    return triples
