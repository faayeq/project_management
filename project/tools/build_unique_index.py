#!/usr/bin/env python3
import json
import os
from io import StringIO
from typing import Dict, List

from pdfminer.high_level import extract_pages
from pdfminer.layout import LTTextContainer, LTTextLine, LTChar


PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(PROJECT_ROOT, "data")


PDFS: Dict[str, str] = {
    os.path.join(PROJECT_ROOT, "pmbok.pdf"): "PMBOK7",
    os.path.join(PROJECT_ROOT, "prince2.pdf"): "PRINCE2",
    os.path.join(PROJECT_ROOT, "ISO.pdf"): "ISO",
    os.path.join(PROJECT_ROOT, "PM_standards_comparison.pdf"): "COMPARISON",
}


def normalize_line(line: str) -> str:
    return " ".join(line.strip().split())


def choose_title(lines: List[str]) -> str:
    for raw in lines:
        line = normalize_line(raw)
        if not line:
            continue
        if 4 <= len(line) <= 120:
            return line
    return lines[0][:120] if lines else ""


def extract_page_text(pdf_path: str) -> List[str]:
    pages_text: List[str] = []
    for layout in extract_pages(pdf_path):
        lines: List[str] = []
        for element in layout:
            if isinstance(element, LTTextContainer):
                for text_line in element:
                    if isinstance(text_line, LTTextLine):
                        txt = text_line.get_text()
                        if txt:
                            lines.append(txt.rstrip("\n"))
        pages_text.append("\n".join(lines))
    return pages_text


def index_pdf(pdf_path: str, standard: str) -> List[Dict[str, str]]:
    items: List[Dict[str, str]] = []
    pages = extract_page_text(pdf_path)
    for i, page_text in enumerate(pages, start=1):
        raw_lines = page_text.split("\n")
        cleaned_lines = [normalize_line(l) for l in raw_lines if normalize_line(l)]
        title = choose_title(cleaned_lines)
        content = "\n".join(cleaned_lines)
        items.append({
            "standard": standard,
            "page": i,
            "title": title,
            "content": content,
        })
    return items


def main():
    all_items: List[Dict[str, str]] = []
    for pdf_path, standard in PDFS.items():
        if not os.path.exists(pdf_path):
            print(f"Warning: missing PDF {pdf_path}, skipping…")
            continue
        print(f"Indexing {os.path.basename(pdf_path)} as {standard}…")
        all_items.extend(index_pdf(pdf_path, standard))

    os.makedirs(DATA_DIR, exist_ok=True)
    out_path = os.path.join(DATA_DIR, "unique_index.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"items": all_items}, f, ensure_ascii=False, indent=2)
    print(f"Wrote {out_path} with {len(all_items)} items")


if __name__ == "__main__":
    main()


