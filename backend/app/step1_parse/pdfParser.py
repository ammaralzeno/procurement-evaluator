"""
A script to extract all visible text and structure from any procurement PDF,
including numbered and unnumbered headings, multi-page sections, tables inline, and nested sections.

Dependencies:
  pip install PyMuPDF

Approach:
 1. Uses PyMuPDF (fitz) to extract text blocks with font and layout metadata.
 2. Dynamically infers heading font sizes via a largest-gap (knee) detector.
 3. Sorts heading candidates by page and vertical position.
 4. Traverses all blocks in reading order, grouping content under each heading until the next.
 5. Preserves raw text flow, including tables as inline text.
 6. Outputs a JSON object grouping each section with its title and body text.

Usage:
  result = extract_everything("Procurement.pdf")
  print(json.dumps(result, ensure_ascii=False, indent=2))
"""
import fitz  # PyMuPDF
import re
import json
from collections import Counter

def infer_heading_sizes(font_sizes):
    """
    Identify heading font sizes by finding the largest gap in the sorted set of unique font sizes.
    Everything above this gap is returned as the heading sizes set.
    
    """
    unique_sizes = sorted(set(font_sizes), reverse=True)
    # If there's only one size or none, treat all as possible headings
    if len(unique_sizes) < 2:
        return set(unique_sizes)

    # Compute differences between adjacent sizes
    diffs = [(unique_sizes[i] - unique_sizes[i+1], i) for i in range(len(unique_sizes) - 1)]
    # Find the index with the maximum gap
    max_gap, idx = max(diffs, key=lambda x: x[0])
    # Return all sizes above or equal to the gap cutoff
    return set(unique_sizes[: idx + 1])


def extract_everything(pdf_path, heading_font_count=None):
    """
    Extracts a structured JSON of sections from a procurement PDF.

    :param pdf_path: Path to the PDF file.
    :param heading_font_count: Optional minimum number of top font sizes to force as headings.
    :return: {"content": [{"section": str, "text": str}, ...]}
    """
    # Open document
    doc = fitz.open(pdf_path)

    # Step 1: Collect all font sizes and page blocks
    font_sizes = []
    pages_blocks = []  # list of (page_num, blocks)

    for page_num, page in enumerate(doc, start=1):
        raw = page.get_text("dict")
        blocks = []
        for block in raw.get("blocks", []):
            if block.get("type") != 0 or not block.get("lines"):
                continue
            # Track max span size per line to identify common sizes
            for line in block["lines"]:
                spans = line.get("spans", [])
                if not spans:
                    continue
                max_span = max(spans, key=lambda s: s["size"])
                font_sizes.append(max_span["size"])
            blocks.append(block)
        pages_blocks.append((page_num, blocks))

    # Step 2: Infer heading font sizes dynamically
    heading_sizes = infer_heading_sizes(font_sizes)
    # Optionally enforce at least N heading sizes
    if heading_font_count:
        sorted_sizes = sorted(set(font_sizes), reverse=True)
        forced = set(sorted_sizes[:heading_font_count])
        heading_sizes |= forced

    # Regex for numeric headings
    num_heading_re = re.compile(r"^\d+(?:[\.\d]+)?\s+.*")

    # Step 3: Identify heading candidates
    headings = []  # list of {page, y0, text}
    for page_num, blocks in pages_blocks:
        for block in blocks:
            # Reconstruct all spans in the block
            spans = [s for line in block["lines"] for s in line.get("spans", [])]
            if not spans:
                continue
            # Text and style of block
            text = "".join(s["text"] for s in spans).strip()
            if not text:
                continue
            max_span = max(spans, key=lambda s: s["size"])
            size = max_span["size"]

            # Heuristic checks for heading
            is_heading = (
                size in heading_sizes or
                bool(num_heading_re.match(text)) or
                text.isupper() or
                (len(text.split()) <= 5 and text.istitle())
            )
            if not is_heading:
                continue

            # Determine vertical position by the smallest y0 among spans
            y0 = min(s["bbox"][1] for s in spans)
            headings.append({"page": page_num, "y0": y0, "text": text})

    # Sort headings in document order
    headings.sort(key=lambda h: (h["page"], h["y0"]))

    # Step 4: Flatten all text blocks in reading order
    flat_blocks = []  # list of (page_num, block, y0)
    for page_num, blocks in pages_blocks:
        for block in blocks:
            spans = [s for line in block["lines"] for s in line.get("spans", [])]
            if not spans:
                continue
            y0 = min(s["bbox"][1] for s in spans)
            flat_blocks.append((page_num, block, y0))
    flat_blocks.sort(key=lambda x: (x[0], x[2]))

    # Step 5: Group blocks under each heading
    content = []
    for idx, heading in enumerate(headings):
        start_pg, start_y = heading["page"], heading["y0"]
        if idx + 1 < len(headings):
            next_h = headings[idx + 1]
            end_pg, end_y = next_h["page"], next_h["y0"]
        else:
            end_pg, end_y = float("inf"), float("inf")

        texts = []
        for pg, block, y0 in flat_blocks:
            # Check if this block belongs to the current section
            if ((pg > start_pg or (pg == start_pg and y0 >= start_y)) and
                (pg < end_pg   or (pg == end_pg   and y0 <  end_y))):
                # Reconstruct block text, preserving line breaks
                lines = ["".join(s["text"] for s in line["spans"]) for line in block["lines"]]
                texts.append("\n".join(lines))

        section_body = "\n".join(texts).strip()
        content.append({"section": heading["text"], "text": section_body})

    return {"content": content}


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Extract procurement PDF structure to JSON.")
    parser.add_argument("pdf", help="Path to procurement PDF file.")
    parser.add_argument("--out", help="Output JSON file.", default=None)
    parser.add_argument("--min-headings", type=int,
                        help="Ensure at least this many top font sizes are forced as headings.")
    args = parser.parse_args()

    result = extract_everything(args.pdf, heading_font_count=args.min_headings)
    if args.out:
        with open(args.out, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"Written to {args.out}")
    else:
        print(json.dumps(result, ensure_ascii=False, indent=2))
