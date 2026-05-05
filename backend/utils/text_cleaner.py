import re


def clean_text(raw_text: str) -> str:
    text = raw_text.replace("\x00", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"(?m)^\s+$", "", text)
    return text.strip()


def estimate_token_count(text: str) -> int:
    return max(1, int(len(text.split()) * 1.3))
