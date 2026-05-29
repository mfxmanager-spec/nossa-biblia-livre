import os
import re
import sys
import json
import sqlite3
import urllib.request
from bs4 import BeautifulSoup

# Configuration
DB_PATH = "bible.db"
DATA_DIR = "public/data"
WP_API_URL = "https://nossabiblialivre.com/wp-json/wp/v2/book"

def setup_database():
    """Initializes the SQLite database schema."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create books table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        slug TEXT UNIQUE,
        testament TEXT
    )
    """)
    
    # Create chapters table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chapters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER,
        number INTEGER,
        slug TEXT UNIQUE,
        title TEXT,
        introduction TEXT,
        wp_id INTEGER UNIQUE,
        FOREIGN KEY (book_id) REFERENCES books (id)
    )
    """)
    
    # Create verses table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS verses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chapter_id INTEGER,
        number INTEGER,
        text TEXT,
        FOREIGN KEY (chapter_id) REFERENCES chapters (id)
    )
    """)
    
    # Create verse_lines table (to store lines/poetic layout)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS verse_lines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        verse_id INTEGER,
        line_index INTEGER,
        text TEXT,
        raw_html TEXT,
        FOREIGN KEY (verse_id) REFERENCES verses (id)
    )
    """)
    
    # Create footnotes table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS footnotes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chapter_id INTEGER,
        ref_id TEXT,
        number INTEGER,
        text TEXT,
        raw_html TEXT,
        FOREIGN KEY (chapter_id) REFERENCES chapters (id),
        UNIQUE(chapter_id, ref_id)
    )
    """)
    
    conn.commit()
    conn.close()

def parse_chapter_html(html_content, title=""):
    """Parses the raw WordPress HTML into structured verses and footnotes."""
    soup = BeautifulSoup(html_content, "html.parser")
    
    # 1. Extract footnotes
    footnotes = []
    footnotes_ol = soup.find("ol", class_="footnotes")
    if footnotes_ol:
        for li in footnotes_ol.find_all("li"):
            fn_id = li.get("id")
            num_match = re.search(r'fn(\d+)', fn_id) if fn_id else None
            num = int(num_match.group(1)) if num_match else None
            
            # Remove backlinks
            for backlink in li.find_all("a", class_="backlink"):
                backlink.decompose()
            for backlink in li.find_all("a"):
                if "backlink" in backlink.get("class", []) or "↩" in backlink.get_text():
                    backlink.decompose()
                    
            raw_html = "".join(str(c) for c in li.contents).strip()
            clean_text = li.get_text().strip()
            
            if clean_text.startswith('“') and clean_text.endswith('”'):
                clean_text = clean_text[1:-1]
            elif clean_text.startswith('"') and clean_text.endswith('"'):
                clean_text = clean_text[1:-1]
                
            footnotes.append({
                "ref_id": fn_id,
                "number": num,
                "text": clean_text,
                "raw_html": raw_html
            })
            
        footnotes_ol.decompose()
        hr_footnotes = soup.find("hr", class_="footnotes")
        if hr_footnotes:
            hr_footnotes.decompose()

    # 2. Extract verses
    paragraphs = soup.find_all("p")
    
    introduction_paragraphs = []
    verses_map = {}
    current_verse_num = None
    current_verse_lines = []
    
    for p in paragraphs:
        # Skip empty paragraphs
        if not p.get_text().strip():
            continue
            
        sub_tag = p.find("sub")
        is_verse_start = False
        verse_num = None
        
        if sub_tag:
            sub_text = sub_tag.get_text().strip()
            digit_match = re.match(r'^(\d+)$', sub_text)
            if digit_match:
                is_verse_start = True
                verse_num = int(digit_match.group(1))
        
        if is_verse_start:
            if current_verse_num is not None:
                verses_map[current_verse_num] = current_verse_lines
            current_verse_num = verse_num
            
            # Decompose the verse number <sub> tag
            p_copy = BeautifulSoup(str(p), "html.parser").find("p")
            sub_in_copy = p_copy.find("sub")
            if sub_in_copy:
                sub_in_copy.decompose()
            # Clean up empty strong/mark tags
            for tag in p_copy.find_all(["strong", "mark", "code"]):
                if not tag.get_text().strip():
                    tag.decompose()
            current_verse_lines = [str(p_copy).strip()]
        else:
            if current_verse_num is None:
                introduction_paragraphs.append(str(p).strip())
            else:
                current_verse_lines.append(str(p).strip())
                
    if current_verse_num is not None:
        verses_map[current_verse_num] = current_verse_lines

    verses_list = []
    for num, lines in sorted(verses_map.items()):
        cleaned_lines = []
        for idx, line in enumerate(lines):
            line_soup = BeautifulSoup(line, "html.parser")
            
            # Extract clean text without footnote superscripts
            for sup in line_soup.find_all("sup"):
                sup.decompose()
            line_text = line_soup.get_text().strip()
            line_text = re.sub(r'\s+', ' ', line_text)
            line_text = re.sub(r'\s+([.,;:!?])', r'\1', line_text)
            
            if line_text:
                cleaned_lines.append({
                    "line_index": idx,
                    "raw_html": line,
                    "text": line_text
                })
                
        full_text = " ".join(l["text"] for l in cleaned_lines)
        
        verses_list.append({
            "number": num,
            "lines": cleaned_lines,
            "text": full_text
        })

    return {
        "introduction": "\n".join(introduction_paragraphs),
        "verses": verses_list,
        "footnotes": footnotes
    }

def get_or_create_book(cursor, book_name):
    """Retrieves or inserts a book record in the database."""
    # Determine slug
    slug = book_name.lower().replace(" ", "-")
    
    # Determine testament (rough guess)
    ot_books = [
        "gênesis", "genesis", "êxodo", "exodo", "levítico", "levitico", "números", "numeros", 
        "deuteronômio", "deuteronomio", "josué", "josue", "juízes", "juizes", "rute", 
        "1 samuel", "2 samuel", "1 reis", "2 reis", "1 crônicas", "2 crônicas", "esdras", 
        "neemias", "ester", "jó", "jo", "salmos", "provérbios", "proverbios", "eclesiastes", 
        "cantares", "cânticos", "isaías", "isaias", "jeremias", "lamentações", "lamentacoes", 
        "ezequiel", "daniel", "oséias", "oseias", "joel", "amós", "amos", "obadias", 
        "jonas", "miquéias", "miqueias", "naum", "habacuque", "sofonias", "ageu", 
        "zacarias", "malaquias"
    ]
    testament = "OT" if slug in ot_books or any(b in slug for b in ["samuel", "reis", "cronicas", "crônicas"]) else "NT"
    
    cursor.execute("SELECT id FROM books WHERE name = ?", (book_name,))
    row = cursor.fetchone()
    if row:
        return row[0]
        
    cursor.execute("INSERT INTO books (name, slug, testament) VALUES (?, ?, ?)", (book_name, slug, testament))
    return cursor.lastrowid

def parse_title(title):
    """Splits a title like '1 Reis 2' or 'Gênesis 6' into book name and chapter number."""
    # e.g., "1 Reis 2" -> Book: "1 Reis", Chapter: 2
    match = re.match(r'^(.+?)\s+(\d+)$', title.strip())
    if match:
        return match.group(1).strip(), int(match.group(2))
    return title.strip(), 1

def fetch_api_page(page=1, per_page=100):
    """Fetches a page of book posts from the WordPress REST API."""
    url = f"{WP_API_URL}?page={page}&per_page={per_page}"
    print(f"Fetching page {page} ({url})...")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 NossaBibliaLivreApp/1.0"})
    try:
        with urllib.request.urlopen(req) as response:
            headers = response.info()
            total_items = int(headers.get("X-WP-Total", 0))
            total_pages = int(headers.get("X-WP-TotalPages", 0))
            data = json.loads(response.read().decode("utf-8"))
            return data, total_items, total_pages
    except Exception as e:
        print(f"Error fetching API page {page}: {e}")
        return [], 0, 0

def sync_all():
    """Fetches all translated chapters and syncs them to the SQLite database."""
    setup_database()
    
    page = 1
    total_pages = 1
    total_synced = 0
    
    conn = sqlite3.connect(DB_PATH)
    
    while page <= total_pages:
        data, total_items, total_pages = fetch_api_page(page)
        if not data:
            break
            
        print(f"Loaded {len(data)} items. Total items on site: {total_items}")
        
        cursor = conn.cursor()
        for idx, item in enumerate(data):
            wp_id = item["id"]
            slug = item["slug"]
            raw_title = item["title"]["rendered"]
            content_html = item["content"]["rendered"]
            
            # Parse title
            book_name, chapter_num = parse_title(raw_title)
            
            print(f"[{total_synced + 1}/{total_items}] Syncing {book_name} {chapter_num} (ID: {wp_id})...")
            
            try:
                # Get or create book
                book_id = get_or_create_book(cursor, book_name)
                
                # Parse content html
                parsed_data = parse_chapter_html(content_html, raw_title)
                
                # Insert/Update chapter
                cursor.execute("""
                INSERT INTO chapters (book_id, number, slug, title, introduction, wp_id)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(wp_id) DO UPDATE SET
                    book_id=excluded.book_id,
                    number=excluded.number,
                    slug=excluded.slug,
                    title=excluded.title,
                    introduction=excluded.introduction
                """, (book_id, chapter_num, slug, raw_title, parsed_data["introduction"], wp_id))
                
                # Get the chapter ID (either newly inserted or existing)
                cursor.execute("SELECT id FROM chapters WHERE wp_id = ?", (wp_id,))
                chapter_id = cursor.fetchone()[0]
                
                # Delete existing verses and footnotes for this chapter to do a clean overwrite
                cursor.execute("DELETE FROM verse_lines WHERE verse_id IN (SELECT id FROM verses WHERE chapter_id = ?)", (chapter_id,))
                cursor.execute("DELETE FROM verses WHERE chapter_id = ?", (chapter_id,))
                cursor.execute("DELETE FROM footnotes WHERE chapter_id = ?", (chapter_id,))
                
                # Insert verses and lines
                for verse in parsed_data["verses"]:
                    cursor.execute("""
                    INSERT INTO verses (chapter_id, number, text)
                    VALUES (?, ?, ?)
                    """, (chapter_id, verse["number"], verse["text"]))
                    
                    verse_id = cursor.lastrowid
                    
                    for line in verse["lines"]:
                        cursor.execute("""
                        INSERT INTO verse_lines (verse_id, line_index, text, raw_html)
                        VALUES (?, ?, ?, ?)
                        """, (verse_id, line["line_index"], line["text"], line["raw_html"]))
                        
                # Insert footnotes
                for fn in parsed_data["footnotes"]:
                    cursor.execute("""
                    INSERT INTO footnotes (chapter_id, ref_id, number, text, raw_html)
                    VALUES (?, ?, ?, ?, ?)
                    """, (chapter_id, fn["ref_id"], fn["number"], fn["text"], fn["raw_html"]))
                    
                conn.commit()
                total_synced += 1
                
            except Exception as e:
                print(f"Error syncing item {wp_id} ({raw_title}): {e}")
                conn.rollback()
                
        page += 1
        
    conn.close()
    print(f"Sync complete! Total successfully synced: {total_synced}")

def export_json():
    """Exports database content to static JSON files for Jamstack hosting."""
    print("Exporting database to static JSON files...")
    
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
        
    chapters_dir = os.path.join(DATA_DIR, "chapters")
    if not os.path.exists(chapters_dir):
        os.makedirs(chapters_dir)
        
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # 1. Fetch and export books list index
    cursor.execute("SELECT id, name, slug, testament FROM books")
    books = [dict(row) for row in cursor.fetchall()]
    
    # Canonical Bible order mapping (Portuguese)
    canonical_order = {
        "Gênesis": 1,
        "Êxodo": 2,
        "Levítico": 3,
        "Números": 4,
        "Deuteronômio": 5,
        "Josué": 6,
        "Juízes": 7,
        "Rute": 8,
        "1 Samuel": 9,
        "2 Samuel": 10,
        "1 Reis": 11,
        "2 Reis": 12,
        "1 Crônicas": 13,
        "2 Crônicas": 14,
        "Esdras": 15,
        "Neemias": 16,
        "Ester": 17,
        "Jó": 18,
        "Salmos": 19,
        "Provérbios": 20,
        "Eclesiastes": 21,
        "Cântico dos Cânticos": 22,
        "Isaías": 23,
        "Jeremias": 24,
        "Lamentações": 25,
        "Ezequiel": 26,
        "Daniel": 27,
        "Oseias": 28,
        "Joel": 29,
        "Amós": 30,
        "Obadias": 31,
        "Jonas": 32,
        "Miqueias": 33,
        "Naum": 34,
        "Habacuque": 35,
        "Sofonias": 36,
        "Ageu": 37,
        "Zacarias": 38,
        "Malaquias": 39
    }
    
    # Sort books: Old Testament first, then New Testament, then by canonical order index
    books.sort(key=lambda b: (0 if b["testament"] == "OT" else 1, canonical_order.get(b["name"], 999)))
    
    for book in books:
        # Fetch chapters for this book
        cursor.execute("SELECT number, slug, title FROM chapters WHERE book_id = ? ORDER BY number ASC", (book["id"],))
        book["chapters"] = [dict(row) for row in cursor.fetchall()]
        
    # Write books index
    with open(os.path.join(DATA_DIR, "books.json"), "w", encoding="utf-8") as f:
        json.dump(books, f, ensure_ascii=False, indent=2)
    print("Saved data/books.json index.")
        
    # 2. Export each chapter
    cursor.execute("""
    SELECT c.id, c.number, c.title, c.slug as chapter_slug, c.introduction, b.name as book_name, b.slug as book_slug
    FROM chapters c
    JOIN books b ON c.book_id = b.id
    """)
    chapters = cursor.fetchall()
    
    for ch in chapters:
        ch_id = ch["id"]
        book_slug = ch["book_slug"]
        ch_num = ch["number"]
        
        # Ensure book subfolder exists
        book_dir = os.path.join(chapters_dir, book_slug)
        if not os.path.exists(book_dir):
            os.makedirs(book_dir)
            
        # Fetch verses
        cursor.execute("SELECT id, number, text FROM verses WHERE chapter_id = ? ORDER BY number ASC", (ch_id,))
        verses = []
        for v_row in cursor.fetchall():
            verse = dict(v_row)
            
            # Fetch verse lines
            cursor.execute("SELECT line_index, text, raw_html FROM verse_lines WHERE verse_id = ? ORDER BY line_index ASC", (verse["id"],))
            verse["lines"] = [dict(l_row) for l_row in cursor.fetchall()]
            
            # Clean up the internal ID to make the JSON clean
            del verse["id"]
            verses.append(verse)
            
        # Fetch footnotes
        cursor.execute("SELECT ref_id, number, text, raw_html FROM footnotes WHERE chapter_id = ? ORDER BY number ASC", (ch_id,))
        footnotes = [dict(fn_row) for fn_row in cursor.fetchall()]
        
        # Build chapter payload
        payload = {
            "title": ch["title"],
            "book_name": ch["book_name"],
            "book_slug": book_slug,
            "chapter_number": ch_num,
            "introduction": ch["introduction"],
            "verses": verses,
            "footnotes": footnotes
        }
        
        # Save chapter payload
        ch_file_path = os.path.join(book_dir, f"{ch_num}.json")
        with open(ch_file_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
            
    conn.close()
    print("Static JSON files export complete!")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--export-only":
        export_json()
    else:
        sync_all()
        export_json()
