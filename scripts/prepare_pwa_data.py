#!/usr/bin/env python3
"""Copy Collected_data JSON into pwa/public/data and write index.json."""

from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "Collected_data"
DST = ROOT / "pwa" / "public" / "data"

TOPICS: list[dict] = [
    {
        "id": "Data_Types_Variables_and_Operators",
        "title": "Kiểu dữ liệu, biến và toán tử",
        "blurb": "Nền tảng: int, float, biến, toán tử.",
        "lessons": [
            "Integer Data Types",
            "Floating & Decimal Data Types",
            "Char Types & String Literals",
            "Variables Intialization",
            "Variables Scope & Lifetime",
            "Expressions Type Conversion",
            "Arithmetic Operators",
            "Relational & Logical Operators",
            "Bitwise & Conditional Operators",
        ],
    },
    {
        "id": "Looping_Statements",
        "title": "Vòng lặp và rẽ nhánh",
        "blurb": "if, switch, for, while, do-while.",
        "lessons": [
            "IF Statements",
            "Switch Statement",
            "For Loop Statements",
            "While Loop Statements",
            "Do While Loop Statements",
            "Continue & Goto Statements",
        ],
    },
    {
        "id": "Classes",
        "title": "Class",
        "blurb": "Class, tham chiếu, phương thức, constructor.",
        "lessons": [
            "Class Fundamentals",
            "Reference Variables & Assignment",
            "Class Methods",
            "Class Constructors",
            "Destructors in Class",
        ],
    },
    {
        "id": "Arrays_and_Strings",
        "title": "Mảng và chuỗi",
        "blurb": "Array, string, ref/out, params.",
        "lessons": [
            "Array MCQ",
            "Strings Basic Operation",
            "Strings Comparison",
            "Searching & Modifying Strings",
            "Characters Operation",
            "String Class with Description",
            "Public & Private Access Modifier",
            "Ref & Out Parameters",
            "Variable Number of Arguments",
        ],
    },
    {
        "id": "Object_Oriented_Concepts",
        "title": "Lập trình hướng đối tượng",
        "blurb": "Kế thừa, đa hình, interface, overload.",
        "lessons": [
            "Structures",
            "Enumerations",
            "Method Overloading",
            "Constructor Overloading",
            "Inheritance Fundamentals",
            "Inheritance Implementation",
            "Method Overriding",
            "Polymorphism",
            "Abstract Class & Methods",
            "Interfaces Basics",
            "Interfaces Implementation",
            "Overloaded Operators",
            "Recursion",
        ],
    },
    {
        "id": "Indexers_and_Exception_Handling",
        "title": "Indexer và exception",
        "blurb": "Indexer, property, try/catch/finally.",
        "lessons": [
            "Indexers Basics",
            "Properties Basics",
            "Properties and its Applications",
            "Exception Handling Fundamentals",
            "Try & Catch",
            "Exception Handling Implementation",
            "Finally and Built in Exceptions",
        ],
    },
    {
        "id": "Console_IO_Operations_and_Stream_Classes",
        "title": "Console I/O và stream",
        "blurb": "Nhập xuất console, byte/character stream.",
        "lessons": [
            "Introduction of Console I_O Operations",
            "Reading Console Input Operations",
            "Writing Console Output Operations",
            "Stream Classes Basics",
            "Byte Stream",
            "Character Stream",
            "Attributes",
        ],
    },
    {
        "id": "Delegates_Generics_and_LINQ",
        "title": "Delegate, generic và LINQ",
        "blurb": "Delegate, generic, LINQ, Array class.",
        "lessons": [
            "Delegates MCQ",
            "Delegates in Detail",
            "Generics MCQ",
            "Generic Methods",
            "Introduction of Array Class",
            "LINQ MCQ",
            "LINQ Operation",
            "Runtime Type",
        ],
    },
    {
        "id": "Namespaces_Preprocessors_Networking",
        "title": "Namespace, preprocessor, networking",
        "blurb": "Namespace, #define, URI, network.",
        "lessons": [
            "Namespaces MCQ",
            "Preprocessors MCQ",
            "Parameters Method",
            "Type Interface",
            "Networking MCQ",
            "UrI Class",
            "Network Errors handling",
        ],
    },
    {
        "id": "Reflections_Multithreaded_Collection_Mathematical_Functions",
        "title": "Reflection, thread, collection, math",
        "blurb": "Reflection, collection, Math, multithread.",
        "lessons": [
            "Reflections Basics",
            "Collection Classes",
            "Iterators",
            "Maths Class",
            "Rounding Functions",
            "Multithreaded Programming MCQ",
            "Multithreaded Programming - 2",
        ],
    },
    {
        "id": "Miscellaneous",
        "title": "Linh tinh",
        "blurb": "Format chuỗi, pointer, unsafe code.",
        "lessons": [
            "String Formatting MCQ",
            "String Formatting Operations - C#",
            "String Formatting Operations - 2",
            "Accessor controls of class",
            "Unsafe Code and Pointers MCQ",
            "Pointers Operation - C#",
            "Pointers Operation - 2",
        ],
    },
]


def slugify(name: str) -> str:
    stem = name.removesuffix(".json")
    stem = re.sub(r"\s*-\s*Sanfoundry$", "", stem, flags=re.I)
    stem = re.sub(
        r"\s*-\s*C# (Multiple Choice Questions|Questions? & Answers?)\s*$",
        "",
        stem,
        flags=re.I,
    )
    stem = re.sub(r"^C# Questions? & Answers?\s*-\s*", "", stem, flags=re.I)
    slug = stem.lower()
    slug = slug.replace("&", "and").replace("#", "sharp")
    slug = re.sub(r"[^a-z0-9]+", "-", slug).strip("-")
    return slug or "lesson"


def match_order(filename: str, needles: list[str]) -> int:
    low = filename.lower()
    best = 1000
    best_len = -1
    for i, needle in enumerate(needles):
        n = needle.lower()
        if n in low and len(n) > best_len:
            best = i
            best_len = len(n)
    return best


def main() -> None:
    if not SRC.is_dir():
        raise SystemExit(f"Missing {SRC}")

    if DST.exists():
        shutil.rmtree(DST)
    DST.mkdir(parents=True)

    topics_out: list[dict] = []
    for order, spec in enumerate(TOPICS, start=1):
        folder = SRC / spec["id"]
        if not folder.is_dir():
            continue
        files = sorted(folder.glob("*.json"))
        files.sort(key=lambda p: (match_order(p.name, spec["lessons"]), p.name.lower()))

        dest_folder = DST / spec["id"]
        dest_folder.mkdir(parents=True, exist_ok=True)

        lessons: list[dict] = []
        used_ids: set[str] = set()
        for path in files:
            shutil.copy2(path, dest_folder / path.name)
            data = json.loads(path.read_text(encoding="utf-8"))
            lesson_id = slugify(path.name)
            base = lesson_id
            n = 2
            while lesson_id in used_ids:
                lesson_id = f"{base}-{n}"
                n += 1
            used_ids.add(lesson_id)
            rel = f"{spec['id']}/{path.name}"
            lessons.append(
                {
                    "id": lesson_id,
                    "file": path.name,
                    "path": rel.replace("\\", "/"),
                    "title": data.get("title") or path.stem,
                    "questionCount": int(data.get("questionCount") or len(data.get("questions") or [])),
                }
            )

        topics_out.append(
            {
                "id": spec["id"],
                "title": spec["title"],
                "blurb": spec["blurb"],
                "order": order,
                "questionCount": sum(x["questionCount"] for x in lessons),
                "lessons": lessons,
            }
        )

    index = {
        "title": "Ôn tập C#",
        "topicCount": len(topics_out),
        "questionCount": sum(t["questionCount"] for t in topics_out),
        "topics": topics_out,
    }
    (DST / "index.json").write_text(
        json.dumps(index, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Copied {sum(len(t['lessons']) for t in topics_out)} lessons")
    print(f"Wrote {DST / 'index.json'}")


if __name__ == "__main__":
    main()
