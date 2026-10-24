"""
Chuẩn bị dữ liệu món ăn từ bộ dữ liệu ViFoodRec để nhập vào recipe_web.

Nguồn: An Tran, Thanh Dang, Hong Dang, Tin Huynh, "A New Dataset and Empirical Evaluation for
Vietnamese Food Recommendation System", PACLIC 2024.
Repo gốc: https://github.com/QuocAn55/DS300 (thư mục Data/Raw Dataset)

Script chỉ dùng thư viện chuẩn của Python (không cần pandas).

Cách chạy:
    python scripts/data/prepare_vifoodrec.py <thư mục Raw Dataset> data/vifoodrec/recipes.json.gz

Các bước xử lý:
  1. Đọc 2 file CSV thô (cooky.vn và monngonmoingay.com).
  2. Tách chuỗi nguyên liệu thành từng dòng {name, amount, unit}.
  3. Tách phần "Cách làm" thành các bước.
  4. Suy ra danh mục (cách chế biến) từ tên món.
  5. Gắn tag: tag gốc của dataset + nhóm nguyên liệu chính + món chay.
  6. Loại các món trùng tên.

Lưu ý: KHÔNG dùng file ratings.csv của ViFoodRec vì phân tích thống kê cho thấy điểm
đánh giá phân bố đều tuyệt đối trên mọi mức 0-5 (dữ liệu ngẫu nhiên).
"""

import csv
import gzip
import json
import re
import sys
import unicodedata

# ---------------------------------------------------------------------------
# Tiện ích chuỗi
# ---------------------------------------------------------------------------


def strip_accents(text):
    text = unicodedata.normalize("NFD", text)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    return text.replace("đ", "d").replace("Đ", "D")


def normalize(text):
    """Chữ thường, bỏ dấu, chỉ giữ chữ và số - dùng để so trùng."""
    text = strip_accents(str(text or "")).lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def clean_spaces(text):
    # NFC: gộp các kiểu mã hóa dấu tiếng Việt khác nhau về một dạng
    text = unicodedata.normalize("NFC", str(text or ""))
    return re.sub(r"\s+", " ", text).strip()


def words(text):
    """Danh sách từ (giữ dấu, chữ thường) để so khớp từ khóa tiếng Việt."""
    text = unicodedata.normalize("NFC", str(text or "")).lower()
    return re.findall(r"[0-9a-zà-ỹđ]+", text)


def contains_phrase(word_list, phrase):
    target = phrase.split()
    n = len(target)
    return any(word_list[i : i + n] == target for i in range(len(word_list) - n + 1))


# ---------------------------------------------------------------------------
# Nguyên liệu
# ---------------------------------------------------------------------------

UNIT_ALIASES = {
    "g": "g", "gr": "g", "gram": "g", "grams": "g",
    "kg": "kg", "ml": "ml", "l": "lít", "lít": "lít", "lit": "lít",
    "m": "muỗng cà phê", "M": "muỗng canh",
}
MULTIWORD_UNITS = ["muỗng cà phê", "muỗng canh", "thìa cà phê", "thìa canh", "chén nhỏ"]
QTY = r"(?:\d+(?:[.,/]\d+)?(?:\s*-\s*\d+(?:[.,/]\d+)?)?|½|¼|¾|1/2|1/3|1/4)"


def parse_quantity(rest):
    """'1.5 muỗng canh thái nhỏ' -> ('1.5', 'muỗng canh', 'thái nhỏ')."""
    rest = clean_spaces(rest)
    match = re.match(rf"^({QTY})\s*(.*)$", rest)
    if not match:
        return None, None, rest
    amount, tail = match.group(1).replace(",", "."), match.group(2).strip()
    if not tail:
        return amount, None, ""
    lower_tail = tail.lower()
    for unit in MULTIWORD_UNITS:
        if lower_tail.startswith(unit):
            return amount, unit.replace("thìa", "muỗng"), tail[len(unit):].strip(" ,.")
    first, _, remainder = tail.partition(" ")
    if first in ("m", "M"):
        unit = UNIT_ALIASES[first]
    else:
        unit = UNIT_ALIASES.get(first.lower(), first.lower())
    return amount, unit[:30], remainder.strip(" ,.")


def parse_ingredient(item):
    item = clean_spaces(item).strip(" –-•:.")
    if not item or len(item) < 2:
        return None
    letters = re.sub(r"[^A-Za-zÀ-ỹ]", "", item)
    if letters and letters.isupper() and len(letters) > 3:
        return None  # tiêu đề kiểu "ĂN KÈM"

    if ":" in item:
        name, rest = item.split(":", 1)
        amount, unit, note = parse_quantity(rest)
        if amount is None:
            note = rest.strip()
    else:
        match = re.match(rf"^(.*?[^\d\s.,/])\s+({QTY}\s*.*)$", item)
        if match:
            name = match.group(1)
            amount, unit, note = parse_quantity(match.group(2))
        else:
            glued = re.match(rf"^(.*?[^\d\s])\s*({QTY})\s*(g|gr|kg|ml|l)\b(.*)$", item, re.I)
            if glued:
                name, amount = glued.group(1), glued.group(2)
                unit, note = UNIT_ALIASES.get(glued.group(3).lower()), glued.group(4)
            else:
                name, amount, unit, note = item, None, None, ""

    name = clean_spaces(name).strip(" ,.:")
    note = clean_spaces(note).strip(" ,.:")
    if not name:
        return None
    if note:
        name = f"{name} ({note})"
    return {
        "name": name[:200],
        "amount": (amount or None) and amount[:50],
        "unit": (unit or None) and unit[:50],
    }


def mnmn_spoons(text):
    """monngonmoingay viết tắt: '2M' = 2 muỗng canh, '1m' = 1 muỗng cà phê."""
    text = re.sub(rf"({QTY})\s*M\b", r"\1 muỗng canh", text)
    return re.sub(rf"({QTY})\s*m\b(?!l)", r"\1 muỗng cà phê", text)


def parse_ingredients(raw, source):
    raw = str(raw or "")
    if source == "monngonmoingay":
        raw = mnmn_spoons(raw)
    items = [parse_ingredient(part) for part in re.split(r",(?![^()]*\))", raw)]
    return [item for item in items if item]


# ---------------------------------------------------------------------------
# Các bước làm
# ---------------------------------------------------------------------------


def chunk_sentences(text, max_len=350):
    sentences = re.split(r"(?<=[.!?])\s+", text)
    chunks, current = [], ""
    for sentence in sentences:
        if current and len(current) + len(sentence) > max_len:
            chunks.append(current.strip())
            current = ""
        current += " " + sentence
    if current.strip():
        chunks.append(current.strip())
    return chunks


def split_steps(text):
    text = clean_spaces(text)
    if not text:
        return []
    # Dữ liệu gốc nối các bước bằng ".,"
    parts = [p.strip(" ,") for p in re.split(r"\.\s*,\s+", text) if p.strip(" ,")]
    steps = []
    for part in parts:
        part = part if part.endswith((".", "!", "?")) else part + "."
        steps.extend(chunk_sentences(part) if len(part) > 450 else [part])
    return steps


def build_steps(row, source):
    steps = []
    if source == "monngonmoingay":
        prep = clean_spaces(mnmn_spoons(row.get("Sơ chế", ""))).strip(" –-")
        if prep:
            bullets = [b.strip(" .") for b in re.split(r"\s*–\s*", prep) if b.strip(" .")]
            steps.append("Sơ chế: " + ". ".join(bullets) + ".")
    steps.extend(split_steps(mnmn_spoons(row.get("Cách làm", "")) if source == "monngonmoingay" else row.get("Cách làm", "")))
    serve = clean_spaces(row.get("Cách dùng", "")) if source == "monngonmoingay" else ""
    if serve:
        steps.append("Cách dùng: " + serve)
    return [s[:2000] for s in steps if len(s) > 3]


# ---------------------------------------------------------------------------
# Danh mục (cách chế biến) - suy từ tên món, xét theo thứ tự ưu tiên
# ---------------------------------------------------------------------------

# Nhóm nước chấm / sốt: chỉ xét khi tên món BẮT ĐẦU bằng các từ này
# (vd "Tương ớt tỏi", "Nước chấm chua ngọt"), tránh nhầm "Gà sốt cam".
SAUCE_PREFIXES = ["tương", "nước chấm", "sốt", "mắm", "muối", "xốt", "dầu điều"]

CATEGORY_RULES = [
    ("Món Lẩu", ["lẩu"]),
    ("Món Canh", ["canh", "súp", "soup"]),
    ("Món Nướng", ["nướng", "quay", "bbq", "đút lò"]),
    ("Món Hấp", ["hấp"]),
    ("Món Chiên", ["chiên", "rán", "chiên giòn"]),
    ("Món Xào", ["xào", "áp chảo", "rang"]),
    ("Món Kho", ["kho", "rim", "ram", "om", "rô ti", "tộ"]),
    ("Món Luộc", ["luộc"]),
    ("Gỏi & Salad", ["gỏi", "nộm", "salad", "trộn", "cuốn"]),
    ("Đồ uống", ["sinh tố", "nước ép", "trà", "cà phê", "smoothie", "soda", "mojito", "sữa chua uống", "nước"]),
    ("Bánh & Tráng miệng", ["bánh", "chè", "kem", "flan", "pudding", "thạch", "rau câu", "mứt", "cookie", "tart"]),
    ("Cơm, Bún, Phở & Mì", ["cơm", "bún", "phở", "mì", "miến", "hủ tiếu", "cháo", "xôi", "nui", "pasta", "spaghetti"]),
]
DEFAULT_CATEGORY = "Món khác"

CATEGORY_DESCRIPTIONS = {
    "Món Luộc": "Các món luộc đơn giản, giữ vị tự nhiên",
    "Gỏi & Salad": "Gỏi, nộm, salad và các món trộn thanh mát",
    "Đồ uống": "Sinh tố, nước ép, trà và các loại đồ uống",
    "Bánh & Tráng miệng": "Bánh ngọt, chè, kem và món tráng miệng",
    "Cơm, Bún, Phở & Mì": "Các món cơm, bún, phở, mì, cháo, xôi",
    "Sốt & Nước chấm": "Các loại nước chấm, nước sốt, tương, mắm",
    "Món khác": "Các món chưa thuộc nhóm cách chế biến cụ thể",
}


def infer_category(title):
    title_words = words(title)
    if any(title_words[: len(p.split())] == p.split() for p in SAUCE_PREFIXES):
        return "Sốt & Nước chấm"
    for category, keywords in CATEGORY_RULES:
        for keyword in keywords:
            if keyword == "nước":
                # chỉ coi là đồ uống khi tên món bắt đầu bằng "nước" (vd "Nước chanh dây")
                if title_words[:1] == ["nước"] and not contains_phrase(title_words, "nước mắm"):
                    return category
                continue
            if contains_phrase(title_words, keyword):
                return category
    return DEFAULT_CATEGORY


# ---------------------------------------------------------------------------
# Tag
# ---------------------------------------------------------------------------

PROTEIN_RULES = [
    ("hải sản", ["tôm", "cua", "mực", "ghẹ", "nghêu", "sò", "hến", "ốc", "bạch tuộc", "hàu", "hải sản"]),
    ("cá", ["cá"]),
    ("thịt bò", ["bò"]),
    ("thịt gà", ["gà"]),
    ("thịt heo", ["heo", "lợn", "ba rọi", "ba chỉ", "sườn", "thịt xay"]),
    ("thịt vịt", ["vịt"]),
    ("đậu hũ", ["đậu hũ", "đậu phụ", "tàu hũ", "tàu hủ"]),
    ("trứng", ["trứng"]),
    ("nấm", ["nấm"]),
]
NOT_PROTEIN = ["bò bía", "trứng muối", "gà đông tảo"]  # tránh nhận nhầm


def protein_tags(title, ingredients):
    title_words = words(title)
    main_ingredients = words(" ".join(i["name"] for i in ingredients[:3]))
    found = []
    for tag, keywords in PROTEIN_RULES:
        for keyword in keywords:
            in_title = contains_phrase(title_words, keyword)
            in_main = tag not in ("trứng", "nấm") and contains_phrase(main_ingredients, keyword)
            if (in_title or in_main) and not any(contains_phrase(title_words, x) for x in NOT_PROTEIN):
                found.append(tag)
                break
    return found[:2]


def dataset_tags(raw, title):
    title_norm = normalize(title)
    seen, result = set(), []
    for tag in str(raw or "").split(","):
        tag = clean_spaces(tag).lower()
        norm = normalize(tag)
        if len(tag) < 2 or len(tag) > 50 or not norm or norm == title_norm or norm in seen:
            continue
        # tag tiếng Việt không dấu (vd "tau hu ky") là bản trùng của tag có dấu -> bỏ
        if tag.isascii() and len(tag.split()) >= 2:
            continue
        seen.add(norm)
        result.append(tag)
    return result[:3]


# ---------------------------------------------------------------------------
# Đọc và chuyển đổi
# ---------------------------------------------------------------------------


def clean_image_url(value):
    """Giữ NGUYÊN cách mã hóa dấu của link ảnh (không chuẩn hóa NFC):
    file trên máy chủ có thể đặt tên ở dạng NFD, đổi sang NFC sẽ làm link hỏng.
    Bỏ các giá trị không phải link (vd "Image link not found")."""
    url = str(value or "").strip()
    if not re.match(r"^https?://", url) or len(url) > 255:
        return None
    return url


def to_int(value, default, low=None, high=None):
    match = re.search(r"\d+", str(value or ""))
    number = int(match.group()) if match else default
    if (low is not None and number < low) or (high is not None and number > high):
        return default
    return number


def convert(row, source, index):
    title = clean_spaces(row["Tên món"])
    if not title:
        return None
    ingredients = parse_ingredients(row.get("Nguyên liệu"), source)
    steps = build_steps(row, source)
    if len(ingredients) < 2 or not steps:
        return None

    description = clean_spaces(row.get("Giới thiệu"))
    tip = clean_spaces(row.get("Mách nhỏ")) if source == "monngonmoingay" else ""
    if tip:
        description = (description + "\n\nMẹo: " + tip).strip()

    is_vegetarian = "chay" in str(row.get("Loại món", "")).lower() or contains_phrase(words(title), "chay")
    tags = [{"name": t, "type": "community"} for t in dataset_tags(row.get("Tags"), title)]
    tags += [{"name": t, "type": "ingredient"} for t in protein_tags(title, ingredients)]
    if is_vegetarian:
        tags.append({"name": "món chay", "type": "dietary"})
    # bỏ trùng tên tag
    unique, seen = [], set()
    for tag in tags:
        key = normalize(tag["name"])
        if key not in seen:
            seen.add(key)
            unique.append(tag)

    return {
        "source": source,
        "source_id": f"{source}-{row.get('STT') or index}",
        "title": title[:255],
        "description": description,
        "category": infer_category(title),
        "servings": to_int(row.get("Khẩu phần"), 4, low=1, high=50),
        "cook_time": to_int(row.get("Time Cooking"), 30, low=1, high=24 * 60),
        "image_url": clean_image_url(row.get("Link Ảnh")),
        "calories": to_int(row.get("Calories"), None),
        "is_vegetarian": is_vegetarian,
        "ingredients": ingredients,
        "steps": steps,
        "tags": unique,
    }


def main(raw_dir, output_path):
    files = [
        ("monngonmoingay", "food_dataset_mnmnweb.csv"),
        ("cooky", "food_dataset_cookyweb.csv"),
    ]
    recipes, seen_titles, skipped = [], set(), {"duplicate": 0, "invalid": 0}
    for source, filename in files:
        with open(f"{raw_dir}/{filename}", encoding="utf-8") as handle:
            for index, row in enumerate(csv.DictReader(handle)):
                recipe = convert(row, source, index)
                if not recipe:
                    skipped["invalid"] += 1
                    continue
                key = normalize(recipe["title"])
                if key in seen_titles:
                    skipped["duplicate"] += 1
                    continue
                seen_titles.add(key)
                recipes.append(recipe)

    opener = gzip.open if output_path.endswith(".gz") else open
    with opener(output_path, "wt", encoding="utf-8") as handle:
        json.dump(
            {
                "source": "ViFoodRec (PACLIC 2024) - https://github.com/QuocAn55/DS300",
                "category_descriptions": CATEGORY_DESCRIPTIONS,
                "recipes": recipes,
            },
            handle,
            ensure_ascii=False,
            separators=(",", ":"),
        )

    by_category = {}
    for recipe in recipes:
        by_category[recipe["category"]] = by_category.get(recipe["category"], 0) + 1
    print(f"Đã ghi {len(recipes)} món vào {output_path}")
    print("Bỏ qua:", skipped)
    print("Theo danh mục:", dict(sorted(by_category.items(), key=lambda kv: -kv[1])))


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    main(sys.argv[1], sys.argv[2])
