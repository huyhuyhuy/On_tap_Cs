#!/usr/bin/env python3
"""Extract C# MCQs from saved Sanfoundry HTML pages into JSON files.

Reads sanfoundryHtml/<topic>/*.html and writes Collected_data/<topic>/*.json
with the same file stem. Requires: beautifulsoup4, lxml.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from copy import deepcopy
from pathlib import Path

from bs4 import BeautifulSoup, NavigableString, Tag

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SRC = ROOT / "sanfoundryHtml"
DEFAULT_DST = ROOT / "Collected_data"

QUESTION_START_RE = re.compile(r"^(\d{1,2})\.\s+(.*)$", re.S)
# Line-start `a)` is always an option. Inline `b) text` needs content after.
# Do not treat `+(int a, int b)` as option `b)`.
OPTION_MARKER_RE = re.compile(
    r"(?:^|\n)\s*([a-e])\)|(?<=\s)([a-e])\)(?=\s+(?![a-e]\))\S)"
)
TRAILING_OPTION_RE = re.compile(r"(?<=\s)([a-e])\)\s*$")
ANSWER_RE = re.compile(r"Answer:\s*([^\n]+)", re.I)
EXPLANATION_RE = re.compile(r"Explanation:\s*(.*)", re.S | re.I)

STOP_PHRASES = (
    "Sanfoundry Global Education",
    "To practice all areas",
)

PROMO_SNIPPETS = (
    "join sanfoundry classes",
    "t.me/sanfoundry",
    "free certifications",
    "sanfoundryofficial",
    "for weekly csharp practice",
    "register today",
    "register now",
)

# Unescaped C# generics like Nullable<T> break HTML parsers.
GENERIC_RE = re.compile(
    r"(?<=[A-Za-z0-9_])<"
    r"(T(?:Key|Value)?|U|V|K|int|uint|string|float|double|byte|sbyte|"
    r"char|long|ulong|short|ushort|bool|decimal)"
    r"(?:\s*,\s*[A-Za-z_][A-Za-z0-9_]*)*>"
)

CHAR_MAP = str.maketrans(
    {
        "\u00a0": " ",
        "\u200b": "",
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2013": "-",
        "\u2014": "-",
        "\ufeff": "",
    }
)


def normalize_chars(text: str) -> str:
    return text.translate(CHAR_MAP).replace("\r\n", "\n").replace("\r", "\n")


def collapse_ws(text: str) -> str:
    text = normalize_chars(text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def collapse_inline(text: str) -> str:
    return re.sub(r"\s+", " ", collapse_ws(text)).strip()


def keep_indent(text: str) -> str:
    text = normalize_chars(text)
    lines = [line.rstrip() for line in text.splitlines()]
    while lines and not lines[0].strip():
        lines.pop(0)
    while lines and not lines[-1].strip():
        lines.pop()
    out: list[str] = []
    empty = 0
    for line in lines:
        if not line.strip():
            empty += 1
            if empty <= 1:
                out.append("")
        else:
            empty = 0
            out.append(line)
    return "\n".join(out)


def join_blocks(parts: list[str]) -> str:
    return "\n\n".join(p for p in parts if p and p.strip())


def extract_highlighted_code(wrap: Tag) -> str:
    ol = wrap.find("ol")
    if ol:
        lines: list[str] = []
        for li in ol.find_all("li", recursive=False):
            pre = li.find("pre")
            line = pre.get_text() if pre else li.get_text()
            lines.append(normalize_chars(line).rstrip("\n"))
        return keep_indent("\n".join(lines))
    pres = wrap.find_all("pre")
    if pres:
        return keep_indent("\n".join(normalize_chars(pre.get_text()) for pre in pres))
    return keep_indent(wrap.get_text())


def is_junk_tag(tag: Tag) -> bool:
    if tag.name in {"script", "style", "noscript"}:
        return True
    classes = tag.get("class") or []
    if "collapseomatic_content" in classes:
        return False
    cid = tag.get("id") or ""
    if any(c.startswith("sf-") for c in classes):
        return True
    if cid.startswith("sf-ads"):
        return True
    text = collapse_inline(tag.get_text(" ", strip=True)).lower()
    if "answer:" in text:
        return False
    if not text:
        return tag.name == "div"
    if text == "advertisement":
        return True
    if any(snippet in text for snippet in PROMO_SNIPPETS):
        return True
    return False


def escape_csharp_generics(html: str) -> str:
    def repl(match: re.Match) -> str:
        return "&lt;" + match.group(0)[1:-1] + "&gt;"

    return GENERIC_RE.sub(repl, html)


def should_stop(text: str) -> bool:
    stripped = text.strip()
    return any(stripped.startswith(phrase) for phrase in STOP_PHRASES)


def parse_answer_div(div: Tag) -> tuple[str | None, str]:
    node = deepcopy(div)
    for junk in node.select(".sf-mobile-ads, [id^=sf-ads]"):
        junk.decompose()
    for child in list(node.find_all(["div", "p", "span"])):
        raw = collapse_inline(child.get_text(" ", strip=True)).lower()
        if "answer:" in raw:
            continue
        if raw == "advertisement" or any(s in raw for s in PROMO_SNIPPETS):
            child.decompose()

    for wrap in list(node.select(".hk1_style-wrap5")):
        code = extract_highlighted_code(wrap)
        wrap.replace_with(NavigableString("\n" + code + "\n"))
    for pre in list(node.find_all("pre")):
        if pre.find_parent(class_="hk1_style-wrap5"):
            continue
        pre.replace_with(NavigableString("\n" + keep_indent(pre.get_text()) + "\n"))

    text = keep_indent(node.get_text("\n"))
    answer = None
    m = ANSWER_RE.search(text)
    if m:
        letters = re.findall(r"[a-e]", m.group(1).lower())
        if letters:
            answer = ",".join(dict.fromkeys(letters))

    expl = ""
    em = EXPLANATION_RE.search(text)
    if em:
        expl = keep_indent(em.group(1))
        expl = re.sub(r"\n?Output\s*:?\s*$", "", expl, flags=re.I).strip()
    elif m:
        rest = keep_indent(text[m.end() :]).strip()
        rest = re.sub(r"\n?Output\s*:?\s*$", "", rest, flags=re.I).strip()
        expl = rest

    if expl.lower() in {"none.", "none"}:
        expl = "None."
    expl = strip_promo_lines(expl)
    return answer, expl


def strip_promo_lines(text: str) -> str:
    if not text:
        return text
    kept: list[str] = []
    for line in text.splitlines():
        low = line.lower()
        if any(ch in line for ch in "⚡🎓👉"):
            continue
        if any(snippet in low for snippet in PROMO_SNIPPETS):
            continue
        if "certification" in low and ("free" in low or "august" in low):
            continue
        kept.append(line)
    return keep_indent("\n".join(kept))


def _clean_option_body(body: str) -> str:
    body = collapse_ws(body)
    if "\n" not in body:
        body = collapse_inline(body)
    return body


def _best_option_run(matches: list[tuple[int, int, str]]) -> list[tuple[int, int, str]]:
    """Longest consecutive a,b,c,... (or b,c,d / c,d) run."""
    best: list[tuple[int, int, str]] = []
    n = len(matches)
    for i in range(n):
        j = i + 1
        expected = chr(ord(matches[i][2]) + 1)
        while j < n and expected <= "e" and matches[j][2] == expected:
            expected = chr(ord(expected) + 1)
            j += 1
        run = matches[i:j]
        if len(run) > len(best) or (
            len(run) == len(best) and run and best and run[0][2] < best[0][2]
        ):
            best = run
    return best


def split_options(
    text: str, *, allow_single: bool = False
) -> tuple[str, list[tuple[str, str]]]:
    """Split a blob into leading stem text and (letter, body) options."""
    text = collapse_ws(text)
    text = re.sub(r"\s*View Answer\s*", "\n", text, flags=re.I).strip()
    found = [
        (m.start(), m.end(), (m.group(1) or m.group(2)).lower())
        for m in OPTION_MARKER_RE.finditer(text)
    ]
    trail = TRAILING_OPTION_RE.search(text)
    if trail:
        letter = trail.group(1).lower()
        already = any(start == trail.start() for start, _end, _let in found)
        if not already and found:
            last_letter = found[-1][2]
            if ord(letter) == ord(last_letter) + 1:
                found.append((trail.start(), trail.end(), letter))
    run = _best_option_run(found)
    if len(run) < 2:
        # "Question text?\na)" — option a is empty and waits for a code block.
        if found and found[0][2] == "a":
            start, end, _letter = found[0]
            stem_part = collapse_inline(text[:start])
            if stem_part:
                options: list[tuple[str, str]] = []
                for idx, (_s, e, let) in enumerate(found):
                    body_end = found[idx + 1][0] if idx + 1 < len(found) else len(text)
                    options.append((let, _clean_option_body(text[e:body_end])))
                return stem_part, options
        lone = re.match(r"^([a-e])\)\s*(.*)$", text, re.S)
        if lone and allow_single:
            return "", [(lone.group(1).lower(), _clean_option_body(lone.group(2)))]
        return collapse_inline(text), []

    stem = collapse_inline(text[: run[0][0]])
    options: list[tuple[str, str]] = []
    for idx, (_start, end, letter) in enumerate(run):
        body_end = run[idx + 1][0] if idx + 1 < len(run) else len(text)
        options.append((letter, _clean_option_body(text[end:body_end])))
    return stem, options


class QuizParser:
    def __init__(self) -> None:
        self.description = ""
        self.questions: list[dict] = []
        self.current: dict | None = None
        self.phase = "intro"
        self.warnings: list[str] = []

    def finish_current(self) -> None:
        if not self.current:
            return
        q = self.current
        code = join_blocks(q["code"]) if isinstance(q["code"], list) else q["code"]
        q["code"] = code or None
        ordered = []
        for letter in q.pop("option_order"):
            text = q["options"].get(letter, "").strip()
            ordered.append({"key": letter, "text": text})
        q["options"] = ordered
        if not q.get("answer"):
            self.warnings.append(f"Q{q['number']} missing answer")
        if len(ordered) < 2:
            self.warnings.append(f"Q{q['number']} has {len(ordered)} option(s)")
        missing = [o["key"] for o in ordered if not o["text"]]
        if missing:
            self.warnings.append(f"Q{q['number']} empty option(s): {','.join(missing)}")
        keys = {o["key"] for o in ordered}
        if q.get("answer"):
            for letter in str(q["answer"]).split(","):
                if letter not in keys:
                    self.warnings.append(
                        f"Q{q['number']} answer '{letter}' not in options {sorted(keys)}"
                    )
        self.questions.append(q)
        self.current = None

    def start_question(self, number: int, stem: str) -> None:
        self.finish_current()
        self.current = {
            "number": number,
            "question": stem,
            "code": [],
            "options": {},
            "option_order": [],
            "answer": None,
            "explanation": "",
            "_pending": None,
        }
        self.phase = "question"

    def add_option(self, letter: str, body: str) -> None:
        if not self.current:
            return
        self.phase = "options"
        if letter not in self.current["options"]:
            self.current["option_order"].append(letter)
            self.current["options"][letter] = body
        elif body:
            prev = self.current["options"][letter]
            sep = "\n" if ("\n" in prev or "\n" in body) else " "
            self.current["options"][letter] = (prev + sep + body).strip() if prev else body
        self.current["_pending"] = letter

    def emit_text(self, text: str) -> bool:
        text = collapse_ws(text)
        if not text or text.lower() in {"view answer", "advertisement"}:
            return True
        if should_stop(text):
            self.phase = "done"
            return False

        qmatch = QUESTION_START_RE.match(text)
        rest = text
        allow_single = self.phase in {"question", "options"}
        if qmatch:
            number = int(qmatch.group(1))
            rest = qmatch.group(2).strip()
            stem, options = split_options(rest, allow_single=True)
            self.start_question(number, stem)
            for letter, body in options:
                self.add_option(letter, body)
            return True

        stem, options = split_options(rest, allow_single=allow_single)
        if options:
            if stem and self.current and self.phase == "question":
                self.current["question"] = collapse_inline(
                    (self.current["question"] + " " + stem).strip()
                )
            for letter, body in options:
                self.add_option(letter, body)
            return True

        if self.phase == "intro":
            self.description = collapse_inline(
                (self.description + " " + collapse_inline(rest)).strip()
            )
            return True
        if self.current and self.phase == "question":
            self.current["question"] = collapse_inline(
                (self.current["question"] + " " + collapse_inline(rest)).strip()
            )
            return True
        if self.current and self.phase == "options" and self.current.get("_pending"):
            self.add_option(self.current["_pending"], collapse_inline(rest))
            return True
        if self.current and self.phase == "between":
            extra = keep_indent(rest)
            if extra:
                expl = self.current["explanation"]
                self.current["explanation"] = join_blocks([expl, extra]) if expl else extra
            return True
        return True

    def emit_code(self, code: str) -> None:
        code = keep_indent(code)
        if not code or self.phase == "done":
            return
        if self.current and self.phase == "between":
            expl = self.current["explanation"]
            self.current["explanation"] = join_blocks([expl, code]) if expl else code
            return
        if self.current and self.phase == "options" and self.current.get("option_order"):
            letter = self.current.get("_pending") or self.current["option_order"][-1]
            prev = self.current["options"].get(letter, "")
            self.current["options"][letter] = join_blocks([prev, code]) if prev else code
            self.current["_pending"] = letter
            return
        if self.current:
            self.current["code"].append(code)
            if self.phase == "intro":
                self.phase = "question"

    def emit_answer(self, answer: str | None, explanation: str) -> None:
        if not self.current:
            self.warnings.append("Answer block with no current question")
            return
        self.current["answer"] = answer
        self.current["explanation"] = explanation
        self.current["_pending"] = None
        self.phase = "between"

    def feed_entry(self, entry: Tag) -> None:
        for child in entry.children:
            if self.phase == "done":
                break
            if isinstance(child, NavigableString):
                continue
            if not isinstance(child, Tag):
                continue
            if is_junk_tag(child):
                continue
            classes = child.get("class") or []
            if "collapseomatic_content" in classes:
                answer, expl = parse_answer_div(child)
                self.emit_answer(answer, expl)
                continue
            if "collapseomatic" in classes:
                continue
            if "hk1_style-wrap5" in classes:
                self.emit_code(extract_highlighted_code(child))
                continue
            if child.name == "pre":
                self.emit_code(keep_indent(child.get_text()))
                continue
            if child.name in {"p", "div", "span"}:
                if not self.emit_text(child.get_text("\n")):
                    break
                continue
        self.finish_current()
        for q in self.questions:
            q.pop("_pending", None)


def parse_html_file(path: Path) -> tuple[dict, list[str]]:
    raw = path.read_text(encoding="utf-8", errors="replace")
    raw = escape_csharp_generics(raw)
    soup = BeautifulSoup(raw, "lxml")
    entry = soup.select_one(".entry-content")
    if entry is None:
        raise ValueError(f"No .entry-content in {path}")

    expected = len(entry.select(".collapseomatic_content"))
    parser = QuizParser()
    parser.feed_entry(entry)

    title_el = soup.select_one("h1.entry-title")
    title = collapse_inline(title_el.get_text()) if title_el else path.stem
    canonical = soup.find("link", rel="canonical")
    source_url = canonical["href"].strip() if canonical and canonical.get("href") else ""

    if expected and len(parser.questions) != expected:
        parser.warnings.append(
            f"question count {len(parser.questions)} != View Answer count {expected}"
        )

    data = {
        "title": title,
        "topic": path.parent.name,
        "sourceUrl": source_url,
        "sourceFile": path.name,
        "description": parser.description,
        "questionCount": len(parser.questions),
        "questions": parser.questions,
    }
    return data, parser.warnings


def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def main() -> int:
    ap = argparse.ArgumentParser(description="Extract Sanfoundry C# MCQs to JSON")
    ap.add_argument("--src", type=Path, default=DEFAULT_SRC)
    ap.add_argument("--dst", type=Path, default=DEFAULT_DST)
    ap.add_argument("--file", type=Path, help="Parse a single HTML file (print JSON)")
    args = ap.parse_args()

    if args.file:
        data, warnings = parse_html_file(args.file)
        json.dump(data, sys.stdout, ensure_ascii=False, indent=2)
        print(file=sys.stderr)
        for w in warnings:
            print("WARN:", w, file=sys.stderr)
        return 0 if not warnings else 1

    html_files = sorted(args.src.rglob("*.html"))
    if not html_files:
        print(f"No HTML files under {args.src}", file=sys.stderr)
        return 1

    total_q = 0
    files_ok = 0
    files_warn = 0
    report: list[str] = []

    for html_path in html_files:
        rel = html_path.relative_to(args.src)
        out_path = args.dst / rel.with_suffix(".json")
        try:
            data, warnings = parse_html_file(html_path)
        except Exception as exc:  # noqa: BLE001
            report.append(f"ERROR {rel}: {exc}")
            files_warn += 1
            continue
        write_json(out_path, data)
        total_q += data["questionCount"]
        if warnings:
            files_warn += 1
            for w in warnings:
                report.append(f"WARN {rel}: {w}")
        else:
            files_ok += 1

    print(f"HTML files: {len(html_files)}")
    print(f"JSON written: {files_ok + files_warn}")
    print(f"Questions: {total_q}")
    print(f"Clean files: {files_ok}")
    print(f"Files with warnings/errors: {files_warn}")
    if report:
        print("---")
        print("\n".join(report))
    return 0 if files_warn == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
