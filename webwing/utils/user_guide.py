from pathlib import Path

README_PATH = Path(__file__).resolve().parents[2] / "README.md"
USER_GUIDE_MARKER = "## User guide"

def _extract_user_guide_section():
    text = README_PATH.read_text(encoding="utf-8")

    start = text.find(USER_GUIDE_MARKER)
    if start == -1:
        return "User guide section not found"
    section_text = text[start:].strip()
    next_header = section_text.find("\n## ", len(USER_GUIDE_MARKER))
    if next_header != -1:
        section_text = section_text[:next_header].strip()
    return section_text