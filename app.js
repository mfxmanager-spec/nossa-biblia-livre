// State Management
let appState = {
    books: [],
    currentBook: null,
    currentChapterNum: null,
    currentChapterData: null,
    fontSize: 1.15, // in rem
    showNotes: true,
    theme: 'sepia'
};

// Touch Gestures Coordinates
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

// DOM Elements
const DOM = {
    body: document.body,
    sidebar: document.getElementById('sidebar'),
    menuToggle: document.getElementById('menuToggle'),
    closeSidebar: document.getElementById('closeSidebar'),
    bookNav: document.getElementById('bookNav'),
    bookSearch: document.getElementById('bookSearch'),
    currentLocation: document.getElementById('currentLocation'),
    readerContainer: document.getElementById('readerContainer'),
    startReadingBtn: document.getElementById('startReadingBtn'),
    footnoteDrawer: document.getElementById('footnoteDrawer'),
    noteNumber: document.getElementById('noteNumber'),
    drawerContent: document.getElementById('drawerContent'),
    closeDrawer: document.getElementById('closeDrawer'),
    backdrop: document.getElementById('backdrop'),
    textSizeDec: document.getElementById('textSizeDec'),
    textSizeInc: document.getElementById('textSizeInc'),
    toggleNotes: document.getElementById('toggleNotes'),
    themeDots: document.querySelectorAll('.theme-dot'),
    readerView: document.getElementById('readerView')
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    initEventListeners();
    loadBooks();
});

// Load settings from localStorage
function loadSettings() {
    const savedTheme = localStorage.getItem('nb-theme');
    if (savedTheme) {
        setTheme(savedTheme);
    } else {
        setTheme('sepia');
    }

    const savedFontSize = localStorage.getItem('nb-font-size');
    if (savedFontSize) {
        appState.fontSize = parseFloat(savedFontSize);
        updateFontSize();
    }

    const savedShowNotes = localStorage.getItem('nb-show-notes');
    if (savedShowNotes !== null) {
        appState.showNotes = savedShowNotes === 'true';
        updateNotesVisibility();
    }
}

// Save settings to localStorage
function saveSettings(key, value) {
    localStorage.setItem(`nb-${key}`, value);
}

// Theme controls
function setTheme(themeName) {
    appState.theme = themeName;
    DOM.body.className = `theme-${themeName}`;
    
    // Update active dot in top bar
    DOM.themeDots.forEach(dot => {
        if (dot.dataset.theme === themeName) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
    saveSettings('theme', themeName);
}

// Adjust font size
function updateFontSize() {
    document.documentElement.style.setProperty('--font-size-base', `${appState.fontSize}rem`);
    saveSettings('font-size', appState.fontSize);
}

// Toggle notes visibility
function updateNotesVisibility() {
    if (appState.showNotes) {
        DOM.readerContainer.classList.remove('hide-notes-indicators');
        DOM.toggleNotes.classList.add('active');
    } else {
        DOM.readerContainer.classList.add('hide-notes-indicators');
        DOM.toggleNotes.classList.remove('active');
    }
    saveSettings('show-notes', appState.showNotes);
}

// Initialize Event Listeners
function initEventListeners() {
    // Sidebar drawer toggles
    DOM.menuToggle.addEventListener('click', openSidebar);
    DOM.closeSidebar.addEventListener('click', closeSidebar);
    DOM.backdrop.addEventListener('click', () => {
        closeSidebar();
        closeFootnoteDrawer();
    });

    // Footnote drawer close
    DOM.closeDrawer.addEventListener('click', closeFootnoteDrawer);

    // Search bar filter
    DOM.bookSearch.addEventListener('input', handleSearch);

    // Theme selector
    DOM.themeDots.forEach(dot => {
        dot.addEventListener('click', () => {
            setTheme(dot.dataset.theme);
        });
    });

    // Font size controls
    DOM.textSizeDec.addEventListener('click', () => {
        if (appState.fontSize > 0.85) {
            appState.fontSize -= 0.05;
            updateFontSize();
        }
    });
    DOM.textSizeInc.addEventListener('click', () => {
        if (appState.fontSize < 2.0) {
            appState.fontSize += 0.05;
            updateFontSize();
        }
    });

    // Footnote indicators toggle
    DOM.toggleNotes.addEventListener('click', () => {
        appState.showNotes = !appState.showNotes;
        updateNotesVisibility();
    });

    // Welcome placeholder button
    if (DOM.startReadingBtn) {
        DOM.startReadingBtn.addEventListener('click', loadDefaultChapter);
    }

    // Touch event listeners for swiping chapters
    if (DOM.readerView) {
        DOM.readerView.addEventListener('touchstart', handleTouchStart, { passive: true });
        DOM.readerView.addEventListener('touchend', handleTouchEnd, { passive: true });
    }
}

// UI Drawer triggers
function openSidebar() {
    DOM.sidebar.classList.add('open');
    DOM.backdrop.classList.add('visible');
}

function closeSidebar() {
    DOM.sidebar.classList.remove('open');
    if (!DOM.footnoteDrawer.classList.contains('open')) {
        DOM.backdrop.classList.remove('visible');
    }
}

function openFootnoteDrawer(refId, number) {
    // Find footnote details in state
    if (!appState.currentChapterData || !appState.currentChapterData.footnotes) return;
    
    const footnote = appState.currentChapterData.footnotes.find(f => f.ref_id === refId);
    if (!footnote) return;

    DOM.noteNumber.textContent = number;
    DOM.drawerContent.innerHTML = footnote.raw_html;
    
    // Intercept internal link clicks in footnotes
    const links = DOM.drawerContent.querySelectorAll('a');
    links.forEach(link => {
        // If it looks like a WordPress reference, handle or styled appropriately
        if (link.getAttribute('href') && link.getAttribute('href').startsWith('https://nossabiblialivre.com')) {
            // Keep target blank to allow visiting external ref
            link.setAttribute('target', '_blank');
        }
    });

    DOM.footnoteDrawer.classList.add('open');
    DOM.backdrop.classList.add('visible');
}

function closeFootnoteDrawer() {
    DOM.footnoteDrawer.classList.remove('open');
    if (!DOM.sidebar.classList.contains('open')) {
        DOM.backdrop.classList.remove('visible');
    }
}

// Load default chapter (e.g. 1 Reis 1 or 2, whichever is available first)
function loadDefaultChapter() {
    if (appState.books.length > 0) {
        const firstBook = appState.books[0];
        if (firstBook.chapters && firstBook.chapters.length > 0) {
            loadChapter(firstBook.slug, firstBook.chapters[0].number);
            return;
        }
    }
    // Fallback if index not loaded yet
    loadChapter('1-reis', 1);
}

// Fetch Books list index
async function loadBooks() {
    try {
        const response = await fetch('data/books.json');
        if (!response.ok) throw new Error('Falha ao carregar índice de livros');
        
        appState.books = await response.json();
        renderSidebar();
    } catch (error) {
        console.error(error);
        DOM.bookNav.innerHTML = `
            <div class="nav-loading">
                <p style="color: red; text-align: center;">Erro ao carregar os livros. Recarregue a página.</p>
            </div>
        `;
    }
}

// Render Sidebar Navigation
function renderSidebar() {
    DOM.bookNav.innerHTML = '';
    
    // Group books by testament
    const testamentGroups = {
        'OT': { name: 'Antigo Testamento', books: [] },
        'NT': { name: 'Novo Testamento', books: [] }
    };
    
    appState.books.forEach(book => {
        const group = book.testament === 'NT' ? 'NT' : 'OT';
        testamentGroups[group].books.push(book);
    });

    // Render each group
    Object.keys(testamentGroups).forEach(groupId => {
        const group = testamentGroups[groupId];
        if (group.books.length === 0) return;
        
        const section = document.createElement('div');
        section.className = 'testament-section';
        section.dataset.testament = groupId;
        
        const title = document.createElement('h3');
        title.className = 'section-title';
        title.textContent = group.name;
        section.appendChild(title);
        
        group.books.forEach(book => {
            const bookItem = document.createElement('div');
            bookItem.className = 'book-item';
            bookItem.id = `book-nav-${book.slug}`;
            
            const btn = document.createElement('button');
            btn.className = 'book-title-btn';
            btn.innerHTML = `
                <span>${book.name}</span>
                <svg viewBox="0 0 24 24" width="16" height="16">
                    <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" fill="currentColor"/>
                </svg>
            `;
            
            const grid = document.createElement('div');
            grid.className = 'chapters-grid';
            
            book.chapters.forEach(ch => {
                const chBtn = document.createElement('button');
                chBtn.className = 'chapter-btn';
                chBtn.textContent = ch.number;
                chBtn.dataset.book = book.slug;
                chBtn.dataset.chapter = ch.number;
                
                chBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // Remove active classes
                    document.querySelectorAll('.chapter-btn').forEach(b => b.classList.remove('active'));
                    chBtn.classList.add('active');
                    loadChapter(book.slug, ch.number);
                    closeSidebar();
                });
                grid.appendChild(chBtn);
            });
            
            btn.addEventListener('click', () => {
                const isExpanded = bookItem.classList.contains('expanded');
                // Close others if desired, or just toggle this one
                bookItem.classList.toggle('expanded');
            });
            
            bookItem.appendChild(btn);
            bookItem.appendChild(grid);
            section.appendChild(bookItem);
        });
        
        DOM.bookNav.appendChild(section);
    });
}

// Search filtering logic
function handleSearch(e) {
    const query = e.target.value.toLowerCase().trim();
    const bookItems = document.querySelectorAll('.book-item');
    
    bookItems.forEach(item => {
        const bookTitle = item.querySelector('.book-title-btn span').textContent.toLowerCase();
        
        if (query === '') {
            item.style.display = 'block';
            item.classList.remove('expanded');
        } else if (bookTitle.includes(query)) {
            item.style.display = 'block';
            item.classList.add('expanded'); // Auto expand matches
        } else {
            item.style.display = 'none';
        }
    });
}

// Fetch Chapter Content
async function loadChapter(bookSlug, chapterNum) {
    // Show reader loading indicator
    DOM.readerContainer.innerHTML = `
        <div class="nav-loading" style="min-height: 40vh;">
            <div class="spinner"></div>
            <span>Carregando ${bookSlug.replace('-', ' ')} ${chapterNum}...</span>
        </div>
    `;

    try {
        const response = await fetch(`data/chapters/${bookSlug}/${chapterNum}.json`);
        if (!response.ok) throw new Error('Falha ao carregar o capítulo');
        
        const data = await response.json();
        appState.currentBook = bookSlug;
        appState.currentChapterNum = chapterNum;
        appState.currentChapterData = data;
        
        renderChapter(data);
        highlightActiveChapterInSidebar(bookSlug, chapterNum);
    } catch (error) {
        console.error(error);
        DOM.readerContainer.innerHTML = `
            <div class="placeholder-card" style="margin: 40px auto;">
                <h3 style="color: red; margin-bottom: 12px;">Capítulo não encontrado</h3>
                <p>Este capítulo ainda não está disponível ou ocorreu um erro ao buscá-lo.</p>
                <button class="btn btn-primary" onclick="loadDefaultChapter()">Voltar ao início</button>
            </div>
        `;
    }
}

// Highlights selected chapter on sidebar, expanding its parent book item
function highlightActiveChapterInSidebar(bookSlug, chapterNum) {
    // Collapse all book items
    document.querySelectorAll('.book-item').forEach(item => {
        if (item.id !== `book-nav-${bookSlug}`) {
            item.classList.remove('expanded');
        } else {
            item.classList.add('expanded');
        }
    });
    
    // Highlight chapter button
    document.querySelectorAll('.chapter-btn').forEach(btn => {
        if (btn.dataset.book === bookSlug && parseInt(btn.dataset.chapter) === parseInt(chapterNum)) {
            btn.classList.add('active');
            // Scroll to the active button if possible
            btn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } else {
            btn.classList.remove('active');
        }
    });
}

// Render Chapter payload into view
function renderChapter(data) {
    // Set Document title & Topbar location text
    document.title = `${data.title} — Nossa Bíblia Livre`;
    DOM.currentLocation.innerHTML = `
        <span class="location-book">${data.book_name}</span>
        <span class="location-chapter">${data.chapter_number}</span>
    `;

    // Clear Container
    DOM.readerContainer.innerHTML = '';

    // Create Chapter Header element
    const header = document.createElement('header');
    header.className = 'chapter-header';
    header.innerHTML = `
        <div class="chapter-book-meta">${data.book_name}</div>
        <h2 class="chapter-title">Capítulo ${data.chapter_number}</h2>
    `;
    DOM.readerContainer.appendChild(header);

    // Render Introduction/Commentary if available
    if (data.introduction && data.introduction.trim() !== '') {
        const intro = document.createElement('section');
        intro.className = 'chapter-introduction';
        intro.innerHTML = data.introduction;
        DOM.readerContainer.appendChild(intro);
    }

    // Render Verses
    const versesContainer = document.createElement('div');
    versesContainer.className = 'verses-container';

    data.verses.forEach(verse => {
        const block = document.createElement('div');
        block.className = 'verse-block';
        block.id = `verse-${verse.number}`;

        // Number marker
        const numMarker = document.createElement('div');
        numMarker.className = 'verse-num-marker';
        numMarker.textContent = `Versículo ${verse.number}`;
        block.appendChild(numMarker);

        // Lines container
        const linesContainer = document.createElement('div');
        linesContainer.className = 'verse-lines';

        verse.lines.forEach(line => {
            const lineEl = document.createElement('div');
            lineEl.className = 'verse-line';
            lineEl.innerHTML = line.raw_html;
            linesContainer.appendChild(lineEl);
        });

        block.appendChild(linesContainer);
        versesContainer.appendChild(block);
    });

    DOM.readerContainer.appendChild(versesContainer);

    // Apply active settings states
    updateNotesVisibility();

    // Register click handlers for footnote markers
    DOM.readerContainer.querySelectorAll('sup a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const href = link.getAttribute('href'); // e.g., "#fn1-30200"
            const refId = href.replace('#', '');
            const number = link.textContent.trim();
            
            openFootnoteDrawer(refId, number);
        });
    });
}

// Swipe Gesture Handlers
function handleTouchStart(e) {
    // Disable swiping if menus are open
    if (DOM.footnoteDrawer && DOM.footnoteDrawer.classList.contains('open')) return;
    if (DOM.sidebar && DOM.sidebar.classList.contains('open')) return;

    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}

function handleTouchEnd(e) {
    if (DOM.footnoteDrawer && DOM.footnoteDrawer.classList.contains('open')) return;
    if (DOM.sidebar && DOM.sidebar.classList.contains('open')) return;

    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    handleSwipeGesture();
}

function handleSwipeGesture() {
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;
    
    const SWIPE_THRESHOLD = 80;    // Minimum horizontal swipe distance
    const SWIPE_CONSTRAINT = 60;   // Maximum vertical deviation allowed

    // Ensure swipe was primarily horizontal
    if (Math.abs(diffX) > Math.abs(diffY)) {
        if (Math.abs(diffX) > SWIPE_THRESHOLD && Math.abs(diffY) < SWIPE_CONSTRAINT) {
            if (diffX > 0) {
                // Swipe Right -> Load Previous Chapter
                navigateToPreviousChapter();
            } else {
                // Swipe Left -> Load Next Chapter
                navigateToNextChapter();
            }
        }
    }
}

// Navigation helpers
function navigateToNextChapter() {
    if (!appState.currentBook || appState.currentChapterNum === null) return;
    
    const bookIdx = appState.books.findIndex(b => b.slug === appState.currentBook);
    if (bookIdx === -1) return;
    
    const currentBook = appState.books[bookIdx];
    const chIdx = currentBook.chapters.findIndex(c => parseInt(c.number) === parseInt(appState.currentChapterNum));
    if (chIdx === -1) return;
    
    if (chIdx < currentBook.chapters.length - 1) {
        // Next chapter in the same book
        const nextCh = currentBook.chapters[chIdx + 1];
        loadChapter(currentBook.slug, nextCh.number);
    } else {
        // First chapter of the next book
        if (bookIdx < appState.books.length - 1) {
            const nextBook = appState.books[bookIdx + 1];
            if (nextBook.chapters && nextBook.chapters.length > 0) {
                loadChapter(nextBook.slug, nextBook.chapters[0].number);
            }
        }
    }
}

function navigateToPreviousChapter() {
    if (!appState.currentBook || appState.currentChapterNum === null) return;
    
    const bookIdx = appState.books.findIndex(b => b.slug === appState.currentBook);
    if (bookIdx === -1) return;
    
    const currentBook = appState.books[bookIdx];
    const chIdx = currentBook.chapters.findIndex(c => parseInt(c.number) === parseInt(appState.currentChapterNum));
    if (chIdx === -1) return;
    
    if (chIdx > 0) {
        // Previous chapter in the same book
        const prevCh = currentBook.chapters[chIdx - 1];
        loadChapter(currentBook.slug, prevCh.number);
    } else {
        // Last chapter of the previous book
        if (bookIdx > 0) {
            const prevBook = appState.books[bookIdx - 1];
            if (prevBook.chapters && prevBook.chapters.length > 0) {
                const lastCh = prevBook.chapters[prevBook.chapters.length - 1];
                loadChapter(prevBook.slug, lastCh.number);
            }
        }
    }
}
