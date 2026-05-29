import { BillingManager } from './billing.js';

// State Management
let appState = {
    books: [],
    currentBook: null,
    currentChapterNum: null,
    currentChapterData: null,
    fontSize: 1.15, // in rem
    showNotes: true,
    theme: 'sepia',
    searchFilter: 'book',
    searchIndex: null,
    isPremium: false,
    highlights: JSON.parse(localStorage.getItem('nb-highlights')) || {},
    notes: JSON.parse(localStorage.getItem('nb-user-notes')) || {},
    history: JSON.parse(localStorage.getItem('nb-reading-history')) || [],
    activeVerseElement: null,
    activeVerseNum: null,
    activeSelection: null
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
    readerView: document.getElementById('readerView'),
    syncBtn: document.getElementById('syncBtn'),
    searchResultsPanel: document.getElementById('searchResultsPanel'),
    searchResultsList: document.getElementById('searchResultsList'),
    resultsCount: document.getElementById('resultsCount'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    pixBtn: document.getElementById('pixBtn'),
    pixModal: document.getElementById('pixModal'),
    closePixModal: document.getElementById('closePixModal'),
    copyPixBtn: document.getElementById('copyPixBtn'),
    pixKeyValue: document.getElementById('pixKeyValue'),
    pixCopySuccess: document.getElementById('pixCopySuccess'),
    testPremiumBtn: document.getElementById('testPremiumBtn'),
    paywallModal: document.getElementById('paywallModal'),
    closePaywall: document.getElementById('closePaywall'),
    subscribeBtn: document.getElementById('subscribeBtn'),
    restoreBtn: document.getElementById('restoreBtn'),
    planMonthly: document.getElementById('planMonthly'),
    planAnnual: document.getElementById('planAnnual'),
    verseActionsPopover: document.getElementById('verseActionsPopover'),
    clearHighlightBtn: document.getElementById('clearHighlightBtn'),
    copyVerseBtn: document.getElementById('copyVerseBtn'),
    noteVerseBtn: document.getElementById('noteVerseBtn'),
    noteModal: document.getElementById('noteModal'),
    closeNoteModal: document.getElementById('closeNoteModal'),
    noteVersePreview: document.getElementById('noteVersePreview'),
    noteTextarea: document.getElementById('noteTextarea'),
    saveNoteBtn: document.getElementById('saveNoteBtn'),
    // Áudio (Premium)
    audioPlayBtn: document.getElementById('audioPlayBtn'),
    audioPlayerPanel: document.getElementById('audioPlayerPanel'),
    audioStatus: document.getElementById('audioStatus'),
    audioPlayPauseBtn: document.getElementById('audioPlayPauseBtn'),
    audioStopBtn: document.getElementById('audioStopBtn'),
    audioPrevBtn: document.getElementById('audioPrevBtn'),
    audioNextBtn: document.getElementById('audioNextBtn'),
    audioSpeedSelect: document.getElementById('audioSpeedSelect'),
    closeAudioPanel: document.getElementById('closeAudioPanel'),
    // Compartilhamento (Premium)
    shareVerseBtn: document.getElementById('shareVerseBtn'),
    shareModal: document.getElementById('shareModal'),
    closeShareModal: document.getElementById('closeShareModal'),
    verseCardPreview: document.getElementById('verseCardPreview'),
    cardText: document.getElementById('cardText'),
    cardReference: document.getElementById('cardReference'),
    downloadCardBtn: document.getElementById('downloadCardBtn'),
    // Histórico (Premium)
    recentChaptersSection: document.getElementById('recentChaptersSection'),
    recentChaptersList: document.getElementById('recentChaptersList')
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    initEventListeners();
    loadBooks();
    
    renderRecentChapters();
    
    // Inicializa o sistema de cobrança/assinaturas
    BillingManager.init((isPremium) => {
        appState.isPremium = isPremium;
        updatePremiumUI();
    });
});

// Update Premium UI indicators
function updatePremiumUI() {
    if (appState.isPremium) {
        if (DOM.recentChaptersSection) DOM.recentChaptersSection.style.display = 'block';
    } else {
        if (DOM.recentChaptersSection) DOM.recentChaptersSection.style.display = 'none';
    }

    if (DOM.testPremiumBtn) {
        if (appState.isPremium) {
            DOM.testPremiumBtn.classList.add('active');
            DOM.testPremiumBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" title="Modo Premium Ativo (Cadeado Aberto)"><path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5-2.28 0-4.27 1.54-4.82 3.73-.25.99.36 1.99 1.37 2.24.99.25 1.99-.36 2.24-1.37.18-.73.85-1.24 1.62-1.24 1.66 0 3 1.34 3 3v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z"/></svg>
            `;
        } else {
            DOM.testPremiumBtn.classList.remove('active');
            DOM.testPremiumBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" title="Modo Premium Inativo (Cadeado Fechado)"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/></svg>
            `;
        }
    }
    renderRecentChapters();
}

// Helper to check premium access before running features
export function checkPremiumAccess(actionCallback) {
    if (appState.isPremium) {
        actionCallback();
    } else {
        if (DOM.paywallModal) {
            DOM.paywallModal.classList.add('open');
        } else {
            alert('Esta funcionalidade requer assinatura Premium.');
        }
    }
}

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

// Auxiliar robusto para copiar texto para a área de transferência
function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
    } else {
        return new Promise((resolve, reject) => {
            try {
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.style.top = "0";
                textArea.style.left = "0";
                textArea.style.position = "fixed";
                textArea.style.opacity = "0";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                if (successful) {
                    resolve();
                } else {
                    reject(new Error('Falha no fallback de cópia'));
                }
            } catch (err) {
                reject(err);
            }
        });
    }
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

    // Sync Button click
    if (DOM.syncBtn) {
        DOM.syncBtn.addEventListener('click', handleSync);
    }

    // Configurar escutas para os botões de filtro de pesquisa
    const filterBtns = document.querySelectorAll('.search-filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            appState.searchFilter = btn.dataset.filter;
            performSearch(DOM.bookSearch.value);
        });
    });

    // Configurar escuta para o botão de limpar pesquisa
    if (DOM.clearSearchBtn) {
        DOM.clearSearchBtn.addEventListener('click', () => {
            DOM.bookSearch.value = '';
            performSearch('');
        });
    }

    // Ações do Modal PIX de Contribuição
    if (DOM.pixBtn && DOM.pixModal) {
        DOM.pixBtn.addEventListener('click', () => {
            DOM.pixModal.classList.add('open');
        });
    }
    
    if (DOM.closePixModal && DOM.pixModal) {
        DOM.closePixModal.addEventListener('click', () => {
            DOM.pixModal.classList.remove('open');
            if (DOM.pixCopySuccess) DOM.pixCopySuccess.style.display = 'none';
        });
        
        DOM.pixModal.addEventListener('click', (e) => {
            if (e.target === DOM.pixModal) {
                DOM.pixModal.classList.remove('open');
                if (DOM.pixCopySuccess) DOM.pixCopySuccess.style.display = 'none';
            }
        });
    }
    
    if (DOM.copyPixBtn && DOM.pixKeyValue) {
        DOM.copyPixBtn.addEventListener('click', () => {
            const textToCopy = DOM.pixKeyValue.textContent.trim();
            copyToClipboard(textToCopy).then(() => {
                if (DOM.pixCopySuccess) {
                    DOM.pixCopySuccess.style.display = 'block';
                    setTimeout(() => {
                        DOM.pixCopySuccess.style.display = 'none';
                    }, 3000);
                }
            }).catch(err => {
                console.error('Falha ao copiar chave pix:', err);
                // Fallback secundário visual se ambos falharem
                alert('Chave PIX: ' + textToCopy);
            });
        });
    }

    // Ações do Botão de Teste Premium
    if (DOM.testPremiumBtn) {
        DOM.testPremiumBtn.addEventListener('click', () => {
            appState.isPremium = !appState.isPremium;
            localStorage.setItem('nb-premium-status', appState.isPremium ? 'true' : 'false');
            updatePremiumUI();
            
            // Notifica o usuário do estado alternado
            const statusMsg = appState.isPremium ? 'Premium Ativado (Simulação)' : 'Premium Desativado';
            console.log(`[Billing Test] ${statusMsg}`);
        });
    }

    // Ações do Modal Paywall (Assinatura)
    let selectedPlan = 'monthly';
    if (DOM.planMonthly && DOM.planAnnual) {
        DOM.planMonthly.addEventListener('click', () => {
            DOM.planMonthly.classList.add('active');
            DOM.planAnnual.classList.remove('active');
            selectedPlan = 'monthly';
        });
        DOM.planAnnual.addEventListener('click', () => {
            DOM.planAnnual.classList.add('active');
            DOM.planMonthly.classList.remove('active');
            selectedPlan = 'annual';
        });
    }

    if (DOM.closePaywall && DOM.paywallModal) {
        DOM.closePaywall.addEventListener('click', () => {
            DOM.paywallModal.classList.remove('open');
        });
        
        DOM.paywallModal.addEventListener('click', (e) => {
            if (e.target === DOM.paywallModal) {
                DOM.paywallModal.classList.remove('open');
            }
        });
    }

    if (DOM.subscribeBtn) {
        DOM.subscribeBtn.addEventListener('click', () => {
            DOM.subscribeBtn.textContent = 'Processando...';
            DOM.subscribeBtn.disabled = true;
            BillingManager.purchase(selectedPlan).then((res) => {
                DOM.subscribeBtn.textContent = 'Assinar Agora';
                DOM.subscribeBtn.disabled = false;
                if (res.success) {
                    appState.isPremium = true;
                    localStorage.setItem('nb-premium-status', 'true');
                    updatePremiumUI();
                    if (DOM.paywallModal) {
                        DOM.paywallModal.classList.remove('open');
                    }
                    alert('Obrigado pelo seu apoio! Recursos Premium desbloqueados. 🎉');
                }
            }).catch(err => {
                console.error('[Billing Test] Erro ao assinar:', err);
                DOM.subscribeBtn.textContent = 'Assinar Agora';
                DOM.subscribeBtn.disabled = false;
            });
        });
    }

    if (DOM.restoreBtn) {
        DOM.restoreBtn.addEventListener('click', () => {
            DOM.restoreBtn.textContent = 'Restaurando...';
            BillingManager.restore().then((res) => {
                DOM.restoreBtn.textContent = 'Restaurar Compra';
                if (res.success) {
                    alert('Assinaturas restauradas com sucesso!');
                }
            }).catch(err => {
                console.error('[Billing Test] Erro ao restaurar:', err);
                DOM.restoreBtn.textContent = 'Restaurar Compra';
            });
        });
    }

    // Ações de Popover do Versículo e Notas
    if (DOM.readerContainer) {
        DOM.readerContainer.addEventListener('click', (e) => {
            const selection = window.getSelection();
            if (selection && !selection.isCollapsed && selection.toString().trim().length >= 2) {
                return;
            }
            const verseBlock = e.target.closest('.verse-block');
            if (verseBlock && !e.target.closest('sup a') && !e.target.closest('.verse-note-indicator')) {
                appState.activeSelection = null;
                openVerseMenu(verseBlock, e);
            }
        });

        DOM.readerContainer.addEventListener('mouseup', handleTextSelection);
        DOM.readerContainer.addEventListener('touchend', handleTextSelection);
    }

    document.addEventListener('click', (e) => {
        if (DOM.verseActionsPopover && DOM.verseActionsPopover.classList.contains('open')) {
            if (!e.target.closest('.verse-block') && !e.target.closest('#verseActionsPopover')) {
                DOM.verseActionsPopover.classList.remove('open');
            }
        }
    });

    const colorBtns = document.querySelectorAll('.highlight-color-btn');
    colorBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            checkPremiumAccess(() => {
                const color = btn.dataset.color;
                applyVerseHighlight(color);
            });
        });
    });

    if (DOM.clearHighlightBtn) {
        DOM.clearHighlightBtn.addEventListener('click', () => {
            checkPremiumAccess(() => {
                applyVerseHighlight(null);
            });
        });
    }

    if (DOM.copyVerseBtn) {
        DOM.copyVerseBtn.addEventListener('click', () => {
            copyActiveVerse();
        });
    }

    if (DOM.noteVerseBtn) {
        DOM.noteVerseBtn.addEventListener('click', () => {
            checkPremiumAccess(() => {
                openNoteModal();
            });
        });
    }

    if (DOM.closeNoteModal && DOM.noteModal) {
        DOM.closeNoteModal.addEventListener('click', () => {
            DOM.noteModal.classList.remove('open');
        });
        
        DOM.noteModal.addEventListener('click', (e) => {
            if (e.target === DOM.noteModal) {
                DOM.noteModal.classList.remove('open');
            }
        });
    }

    if (DOM.saveNoteBtn) {
        DOM.saveNoteBtn.addEventListener('click', () => {
            saveActiveVerseNote();
        });
    }

    // --- Listeners de Áudio (Premium) ---
    if (DOM.audioPlayBtn) {
        DOM.audioPlayBtn.addEventListener('click', () => {
            checkPremiumAccess(() => {
                toggleAudioPlayerPanel();
            });
        });
    }

    if (DOM.closeAudioPanel) {
        DOM.closeAudioPanel.addEventListener('click', () => {
            closeAudioPlayerPanel();
        });
    }

    if (DOM.audioPlayPauseBtn) {
        DOM.audioPlayPauseBtn.addEventListener('click', () => {
            if (audioState.isPlaying) {
                pauseAudio();
            } else {
                playAudio();
            }
        });
    }

    if (DOM.audioStopBtn) {
        DOM.audioStopBtn.addEventListener('click', () => {
            stopAudio();
        });
    }

    if (DOM.audioPrevBtn) {
        DOM.audioPrevBtn.addEventListener('click', () => {
            playPreviousVerseAudio();
        });
    }

    if (DOM.audioNextBtn) {
        DOM.audioNextBtn.addEventListener('click', () => {
            playNextVerseAudio();
        });
    }

    if (DOM.audioSpeedSelect) {
        DOM.audioSpeedSelect.addEventListener('change', () => {
            audioState.speed = parseFloat(DOM.audioSpeedSelect.value);
            if (audioState.isPlaying) {
                const currentVerse = audioState.currentVerseIndex;
                pauseAudio();
                audioState.currentVerseIndex = currentVerse;
                playAudio();
            }
        });
    }

    // --- Listeners de Compartilhamento (Premium) ---
    if (DOM.shareVerseBtn) {
        DOM.shareVerseBtn.addEventListener('click', () => {
            checkPremiumAccess(() => {
                openShareModal();
            });
        });
    }

    if (DOM.closeShareModal && DOM.shareModal) {
        DOM.closeShareModal.addEventListener('click', () => {
            DOM.shareModal.classList.remove('open');
        });
        DOM.shareModal.addEventListener('click', (e) => {
            if (e.target === DOM.shareModal) {
                DOM.shareModal.classList.remove('open');
            }
        });
    }

    // Seletores de Tema do Card
    const themeOpts = document.querySelectorAll('.theme-opt');
    themeOpts.forEach(opt => {
        opt.addEventListener('click', () => {
            themeOpts.forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            
            const bgClass = opt.dataset.bg;
            if (DOM.verseCardPreview) {
                DOM.verseCardPreview.className = DOM.verseCardPreview.className.replace(/\bbg-\S+/g, bgClass);
            }
        });
    });

    // Seletores de Fonte do Card
    const fontOpts = document.querySelectorAll('.font-opt');
    fontOpts.forEach(opt => {
        opt.addEventListener('click', () => {
            fontOpts.forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            
            const fontClass = opt.dataset.font;
            if (DOM.verseCardPreview) {
                DOM.verseCardPreview.className = DOM.verseCardPreview.className.replace(/\bfont-\S+/g, fontClass);
            }
        });
    });

    if (DOM.downloadCardBtn) {
        DOM.downloadCardBtn.addEventListener('click', () => {
            generateAndDownloadCard();
        });
    }
}

// Fetch helper with local/Web intelligent caching
async function fetchWithCache(url) {
    let cache;
    try {
        cache = await caches.open('nb-chapters-cache');
    } catch (e) {
        console.warn('CacheStorage não suportado ou bloqueado:', e);
    }

    try {
        // Se estiver rodando em localhost, não tenta bater na URL de produção externa
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const webUrl = (url.startsWith('http') || isLocal) ? url : `https://biblialivre.mf.app.br/${url}`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch(webUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (response.ok) {
            // Prevenir falsos-positivos caso o servidor retorne HTML de SPA em rota 404
            const contentType = response.headers.get('content-type');
            if (url.endsWith('.json') && contentType && contentType.includes('text/html')) {
                throw new Error('Servidor retornou HTML em vez de JSON para ' + url);
            }

            if (cache) {
                try {
                    await cache.put(url, response.clone());
                } catch (cacheErr) {
                    console.error('Falha ao gravar no cache:', cacheErr);
                }
            }
            return response;
        }
    } catch (netErr) {
        console.log(`Falha ao buscar da rede (${url}), tentando cache...`, netErr);
    }

    if (cache) {
        const cachedResponse = await cache.match(url);
        if (cachedResponse) {
            return cachedResponse;
        }
    }

    return fetch(url);
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
    if (DOM.currentLocation) {
        DOM.currentLocation.classList.add('loading');
    }
    try {
        const response = await fetchWithCache('data/books.json');
        if (!response.ok) throw new Error('Falha ao carregar índice de livros');
        
        appState.books = await response.json();
        renderSidebar();

        // Recuperar última leitura salva no localStorage
        const lastBook = localStorage.getItem('nb-last-book');
        const lastChapter = localStorage.getItem('nb-last-chapter');
        if (lastBook && lastChapter) {
            await loadChapter(lastBook, parseInt(lastChapter));
        } else {
            loadDefaultChapter();
        }
    } catch (error) {
        console.error(error);
        DOM.bookNav.innerHTML = `
            <div class="nav-loading">
                <p style="color: red; text-align: center;">Erro ao carregar os livros. Recarregue a página.</p>
            </div>
        `;
    } finally {
        if (DOM.currentLocation) {
            DOM.currentLocation.classList.remove('loading');
        }
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
    const query = e.target.value;
    performSearch(query);
}

// Limpa notas explicativas de rodapé misturadas no meio do texto do versículo
function cleanVerseText(text) {
    if (!text) return '';
    // Remove notas explicativas do tipo (( ... ))
    let cleaned = text.replace(/\(\(.*?\)\)/g, '');
    // Remove notas explicativas com parenteses alternativos se houver (como （ ... ）)
    cleaned = cleaned.replace(/（.*?））/g, '');
    cleaned = cleaned.replace(/（.*?）/g, '');
    // Remove notas explicativas que começam com (“ e terminam com ))
    cleaned = cleaned.replace(/\(“.*?\)\)/g, '');
    // Remove notas que começam com ( e terminam com ) contendo referências a livros e capítulos
    // Ex: (Cf. Gênesis 1,3; ...) ou referências de notas
    cleaned = cleaned.replace(/\(Cf\..*?\)/gi, '');
    cleaned = cleaned.replace(/\(Somente em.*?\)/gi, '');
    // Remove espaços duplicados
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    return cleaned;
}

// Execute global search based on filter option
async function performSearch(query) {
    query = query.toLowerCase().trim();
    
    // Se o filtro for 'book' (livros)
    if (appState.searchFilter === 'book') {
        DOM.bookNav.style.display = 'block';
        DOM.searchResultsPanel.style.display = 'none';
        
        // Tenta identificar se o usuário busca um capítulo específico (ex: "12" ou "1 reis 12")
        const match = query.match(/^(.*?)\s*(\d+)$/);
        let targetChapter = null;
        let bookQuery = query;
        
        if (match) {
            const txt = match[1].trim();
            const num = parseInt(match[2]);
            // Apenas filtra por capítulo se houver nome de livro ou se for número com mais de 1 dígito (evita confundir query "1" ou "2" de livros)
            if (txt !== '' || match[2].length > 1) {
                bookQuery = txt;
                targetChapter = num;
            }
        }
        
        const bookItems = document.querySelectorAll('.book-item');
        bookItems.forEach(item => {
            const bookTitle = item.querySelector('.book-title-btn span').textContent.toLowerCase();
            const chapterBtns = item.querySelectorAll('.chapter-btn');
            
            let hasMatchingChapter = false;
            
            // Filtra os botões de capítulos dentro do livro
            chapterBtns.forEach(btn => {
                const chNum = parseInt(btn.textContent);
                if (targetChapter !== null) {
                    if (chNum === targetChapter) {
                        btn.style.display = 'block';
                        hasMatchingChapter = true;
                    } else {
                        btn.style.display = 'none';
                    }
                } else {
                    btn.style.display = 'block';
                }
            });
            
            // Verifica correspondência do nome do livro
            const matchesBookName = bookQuery === '' || bookTitle.includes(bookQuery);
            
            if (matchesBookName && (targetChapter === null || hasMatchingChapter)) {
                item.style.display = 'block';
                if (query !== '') {
                    item.classList.add('expanded');
                } else {
                    item.classList.remove('expanded');
                }
            } else {
                item.style.display = 'none';
                item.classList.remove('expanded');
            }
        });
        return;
    }
    
    // Busca avançada por versículo ou palavra
    DOM.bookNav.style.display = 'none';
    DOM.searchResultsPanel.style.display = 'flex';
    
    if (query === '') {
        DOM.searchResultsList.innerHTML = '<p class="nav-loading">Digite palavras para buscar...</p>';
        DOM.resultsCount.textContent = '0 resultados';
        return;
    }
    
    // Carrega o search-index.json se ainda não foi carregado
    if (!appState.searchIndex) {
        DOM.searchResultsList.innerHTML = `
            <div class="nav-loading">
                <div class="spinner"></div>
                <span>Carregando índice de busca...</span>
            </div>
        `;
        try {
            const response = await fetchWithCache('data/search-index.json');
            if (!response.ok) throw new Error('Falha ao baixar índice de busca');
            appState.searchIndex = await response.json();
        } catch (err) {
            console.error(err);
            DOM.searchResultsList.innerHTML = '<p style="color: red; padding: 20px; text-align: center;">Erro ao carregar índice de busca offline.</p>';
            return;
        }
    }
    
    DOM.searchResultsList.innerHTML = `
        <div class="nav-loading">
            <div class="spinner"></div>
            <span>Pesquisando...</span>
        </div>
    `;
    
    let results = [];
    const isWordSearch = appState.searchFilter === 'word';
    
    // Escapar caracteres especiais para regex e criar padrão de busca
    const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    
    // Regex para palavra inteira ou substring
    const regex = isWordSearch 
        ? new RegExp(`\\b${escapedQuery}\\b`, 'i') 
        : new RegExp(escapedQuery, 'i');
        
    for (const item of appState.searchIndex) {
        // Limpar anotações explicativas antes de testar
        const cleanText = cleanVerseText(item.t);
        if (regex.test(cleanText)) {
            results.push({ ...item, cleanText });
        }
    }
    
    const limit = 50;
    const paginatedResults = results.slice(0, limit);
    DOM.resultsCount.textContent = `${results.length} resultado(s)`;
    
    if (results.length === 0) {
        DOM.searchResultsList.innerHTML = '<p class="nav-loading">Nenhum resultado encontrado.</p>';
        return;
    }
    
    DOM.searchResultsList.innerHTML = '';
    paginatedResults.forEach(res => {
        const div = document.createElement('div');
        div.className = 'search-result-item';
        
        // Destacar termo correspondente no texto limpo de notas explicativas
        const highlightedText = res.cleanText.replace(
            new RegExp(`(${escapedQuery})`, 'gi'), 
            '<mark>$1</mark>'
        );
        
        div.innerHTML = `
            <div class="result-meta">${res.n} ${res.c}:${res.v}</div>
            <div class="result-text">${highlightedText}</div>
        `;
        
        div.addEventListener('click', () => {
            loadChapter(res.b, res.c);
            
            // Rolar e destacar o versículo após carregar a página
            setTimeout(() => {
                const verseEl = document.getElementById(`verse-${res.v}`);
                if (verseEl) {
                    verseEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    verseEl.classList.add('highlight-flash');
                    setTimeout(() => verseEl.classList.remove('highlight-flash'), 3000);
                }
            }, 500);
            
            // Fecha sidebar em telas menores
            if (window.innerWidth <= 1024) {
                closeSidebar();
            }
        });
        
        DOM.searchResultsList.appendChild(div);
    });
    
    if (results.length > limit) {
        const moreDiv = document.createElement('p');
        moreDiv.className = 'nav-loading';
        moreDiv.style.fontSize = '0.8rem';
        moreDiv.textContent = `Mostrando os primeiros ${limit} de ${results.length} resultados. Refine sua busca.`;
        DOM.searchResultsList.appendChild(moreDiv);
    }
}

// Fetch Chapter Content
async function loadChapter(bookSlug, chapterNum) {
    if (DOM.currentLocation) {
        DOM.currentLocation.classList.add('loading');
    }

    // Parar áudio se estiver tocando ao mudar de capítulo
    stopAudio();

    // Transição de Swipe (Saída)
    if (swipeDirection) {
        const outClass = swipeDirection === 'left' ? 'slide-left-out' : 'slide-right-out';
        DOM.readerContainer.classList.add(outClass);
        await new Promise(resolve => setTimeout(resolve, 180));
        DOM.readerContainer.classList.remove(outClass);
    }

    // Show reader loading indicator
    DOM.readerContainer.innerHTML = `
        <div class="nav-loading" style="min-height: 40vh;">
            <div class="spinner"></div>
            <span>Carregando ${bookSlug.replace(/-/g, ' ')} ${chapterNum}...</span>
        </div>
    `;

    try {
        const response = await fetchWithCache(`data/chapters/${bookSlug}/${chapterNum}.json`);
        if (!response.ok) throw new Error('Falha ao carregar o capítulo');
        
        const data = await response.json();
        appState.currentBook = bookSlug;
        appState.currentChapterNum = chapterNum;
        appState.currentChapterData = data;

        // Salvar última leitura no localStorage
        localStorage.setItem('nb-last-book', bookSlug);
        localStorage.setItem('nb-last-chapter', chapterNum.toString());
        
        // Histórico de Leitura Recente (Premium)
        addToReadingHistory(bookSlug, chapterNum);
        
        renderChapter(data);
        highlightActiveChapterInSidebar(bookSlug, chapterNum);

        // Se o painel de áudio estiver aberto, atualiza versículos para o novo capítulo
        if (DOM.audioPlayerPanel && DOM.audioPlayerPanel.classList.contains('open')) {
            loadAudioVerses();
            updateAudioUI();
        }

        // Transição de Swipe (Entrada)
        if (swipeDirection) {
            const inClass = swipeDirection === 'left' ? 'slide-left-in' : 'slide-right-in';
            DOM.readerContainer.classList.add(inClass);
            setTimeout(() => {
                DOM.readerContainer.classList.remove(inClass);
            }, 250);
        }
    } catch (error) {
        console.error(error);
        DOM.readerContainer.innerHTML = `
            <div class="placeholder-card" style="margin: 40px auto;">
                <h3 style="color: red; margin-bottom: 12px;">Capítulo não encontrado</h3>
                <p>Este capítulo ainda não está disponível ou ocorreu um erro ao buscá-lo.</p>
                <button class="btn btn-primary" onclick="loadDefaultChapter()">Voltar ao início</button>
            </div>
        `;
    } finally {
        swipeDirection = null; // Reseta direção
        if (DOM.currentLocation) {
            DOM.currentLocation.classList.remove('loading');
        }
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

        const refKey = `${appState.currentBook}-${data.chapter_number}-${verse.number}`;
        
        // Aplica destaque salvo se for bloco inteiro
        const savedColor = appState.highlights[refKey];
        if (savedColor && typeof savedColor === 'string') {
            block.classList.add(`highlight-${savedColor}`);
        }

        // Number marker
        const numMarker = document.createElement('div');
        numMarker.className = 'verse-num-marker';
        numMarker.textContent = `Versículo ${verse.number}`;
        block.appendChild(numMarker);

        // Adiciona indicador de nota pessoal se houver
        if (appState.notes[refKey]) {
            const noteIndicator = document.createElement('span');
            noteIndicator.className = 'verse-note-indicator';
            noteIndicator.innerHTML = `
                <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                <span>Nota</span>
            `;
            noteIndicator.title = appState.notes[refKey];
            
            noteIndicator.addEventListener('click', (e) => {
                e.stopPropagation();
                appState.activeVerseElement = block;
                appState.activeVerseNum = verse.number;
                checkPremiumAccess(() => {
                    openNoteModal();
                });
            });
            
            numMarker.appendChild(noteIndicator);
        }

        // Lines container
        const linesContainer = document.createElement('div');
        linesContainer.className = 'verse-lines';

        verse.lines.forEach(line => {
            const lineEl = document.createElement('div');
            lineEl.className = 'verse-line';
            lineEl.innerHTML = line.raw_html;
            linesContainer.appendChild(lineEl);
        });

        // Se houver destaques parciais (array de trechos)
        if (Array.isArray(savedColor)) {
            highlightTextNodes(linesContainer, savedColor);
        }

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
                swipeDirection = 'right';
                navigateToPreviousChapter();
            } else {
                // Swipe Left -> Load Next Chapter
                swipeDirection = 'left';
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

// Trigger the backend workflow synchronization
async function handleSync() {
    if (DOM.syncBtn.classList.contains('syncing')) return;

    // Change UI state to syncing
    DOM.syncBtn.classList.add('syncing');
    const syncText = DOM.syncBtn.querySelector('span');
    const originalText = syncText ? syncText.textContent : 'Sincronizar Textos';
    if (syncText) {
        syncText.textContent = 'Verificando...';
    }

    try {
        const response = await fetch('/api/sync', {
            method: 'POST'
        });

        let data = {};
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
        } else {
            // Se não for JSON (ex: erro 404 do Vite ou 500 sem formato JSON)
            const textResponse = await response.text();
            throw new Error(textResponse.substring(0, 100) || `Status ${response.status}`);
        }

        if (response.ok && data.success) {
            alert('Sincronização iniciada com sucesso no GitHub! Novos capítulos estarão online em cerca de 2 minutos.');
            if (syncText) syncText.textContent = 'Sincronizando...';
            
            setTimeout(() => {
                DOM.syncBtn.classList.remove('syncing');
                if (syncText) syncText.textContent = originalText;
            }, 5000);
        } else {
            alert(`Erro na sincronização: ${data.error || 'Erro desconhecido'}`);
            DOM.syncBtn.classList.remove('syncing');
            if (syncText) syncText.textContent = originalText;
        }
    } catch (error) {
        console.error('Erro na requisição de sincronização:', error);
        alert(`Erro de conexão ao tentar sincronizar: ${error.message || 'Verifique se o servidor está online.'}`);
        DOM.syncBtn.classList.remove('syncing');
        if (syncText) syncText.textContent = originalText;
    }
}

// Ações de Versículo e Premium
function openVerseMenu(verseBlock, event) {
    // Guarda o versículo ativo
    appState.activeVerseElement = verseBlock;
    appState.activeVerseNum = parseInt(verseBlock.id.replace('verse-', ''));
    
    // Abre o popover
    DOM.verseActionsPopover.classList.add('open');
    
    // Posiciona o popover acima do versículo
    const rect = verseBlock.getBoundingClientRect();
    
    const popoverHeight = DOM.verseActionsPopover.offsetHeight || 80;
    const popoverWidth = DOM.verseActionsPopover.offsetWidth || 230;
    
    const top = rect.top + window.scrollY - popoverHeight - 8;
    const left = rect.left + window.scrollX + (rect.width / 2) - (popoverWidth / 2);
    
    DOM.verseActionsPopover.style.top = `${top}px`;
    DOM.verseActionsPopover.style.left = `${left}px`;
    
    event.stopPropagation();
}

function applyVerseHighlight(color) {
    if (!appState.activeVerseElement || !appState.currentBook || !appState.currentChapterNum) return;
    
    const refKey = `${appState.currentBook}-${appState.currentChapterNum}-${appState.activeVerseNum}`;
    
    if (appState.activeSelection) {
        const selectedText = appState.activeSelection.text;
        
        if (color) {
            // Remove destaque de bloco se houver
            appState.activeVerseElement.classList.remove('highlight-yellow', 'highlight-green', 'highlight-blue', 'highlight-pink');
            
            if (!Array.isArray(appState.highlights[refKey])) {
                appState.highlights[refKey] = [];
            }
            
            // Adiciona a nova marcação se não existir idêntica
            const exists = appState.highlights[refKey].some(h => h.text.toLowerCase() === selectedText.toLowerCase());
            if (!exists) {
                appState.highlights[refKey].push({
                    text: selectedText,
                    color: color
                });
            }
            
            // Aplica no DOM reconstruindo as linhas
            const linesContainer = appState.activeVerseElement.querySelector('.verse-lines');
            if (linesContainer) {
                const verseData = appState.currentChapterData.verses.find(v => v.number === appState.activeVerseNum);
                if (verseData) {
                    linesContainer.innerHTML = '';
                    verseData.lines.forEach(line => {
                        const lineEl = document.createElement('div');
                        lineEl.className = 'verse-line';
                        lineEl.innerHTML = line.raw_html;
                        linesContainer.appendChild(lineEl);
                    });
                    highlightTextNodes(linesContainer, appState.highlights[refKey]);
                }
            }
        } else {
            // Limpa tudo do versículo
            delete appState.highlights[refKey];
            appState.activeVerseElement.classList.remove('highlight-yellow', 'highlight-green', 'highlight-blue', 'highlight-pink');
            
            const linesContainer = appState.activeVerseElement.querySelector('.verse-lines');
            if (linesContainer) {
                const verseData = appState.currentChapterData.verses.find(v => v.number === appState.activeVerseNum);
                if (verseData) {
                    linesContainer.innerHTML = '';
                    verseData.lines.forEach(line => {
                        const lineEl = document.createElement('div');
                        lineEl.className = 'verse-line';
                        lineEl.innerHTML = line.raw_html;
                        linesContainer.appendChild(lineEl);
                    });
                }
            }
        }
        appState.activeSelection = null;
    } else {
        // Destaque de bloco (versículo inteiro)
        appState.activeVerseElement.classList.remove('highlight-yellow', 'highlight-green', 'highlight-blue', 'highlight-pink');
        
        // Restaura linhas sem tags mark antes de aplicar no bloco
        const linesContainer = appState.activeVerseElement.querySelector('.verse-lines');
        if (linesContainer) {
            const verseData = appState.currentChapterData.verses.find(v => v.number === appState.activeVerseNum);
            if (verseData) {
                linesContainer.innerHTML = '';
                verseData.lines.forEach(line => {
                    const lineEl = document.createElement('div');
                    lineEl.className = 'verse-line';
                    lineEl.innerHTML = line.raw_html;
                    linesContainer.appendChild(lineEl);
                });
            }
        }

        if (color) {
            appState.activeVerseElement.classList.add(`highlight-${color}`);
            appState.highlights[refKey] = color;
        } else {
            delete appState.highlights[refKey];
        }
    }
    
    // Salva no localStorage
    localStorage.setItem('nb-highlights', JSON.stringify(appState.highlights));
    
    // Limpa a seleção visual
    window.getSelection().removeAllRanges();
    
    // Fecha o popover
    DOM.verseActionsPopover.classList.remove('open');
}

// Helper para destacar trechos de nós de texto de forma segura
function highlightTextNodes(element, highlights) {
    if (!highlights || highlights.length === 0) return;
    
    const childNodes = Array.from(element.childNodes);
    
    for (let node of childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
            let text = node.textContent;
            let matchFound = false;
            
            for (let highlight of highlights) {
                const index = text.toLowerCase().indexOf(highlight.text.toLowerCase());
                if (index !== -1) {
                    const matchedText = text.substring(index, index + highlight.text.length);
                    const before = text.substring(0, index);
                    const after = text.substring(index + highlight.text.length);
                    
                    const beforeNode = document.createTextNode(before);
                    const markNode = document.createElement('mark');
                    markNode.className = `highlight-${highlight.color} inline-highlight`;
                    markNode.textContent = matchedText;
                    const afterNode = document.createTextNode(after);
                    
                    node.parentNode.insertBefore(beforeNode, node);
                    node.parentNode.insertBefore(markNode, node);
                    node.parentNode.insertBefore(afterNode, node);
                    node.parentNode.removeChild(node);
                    
                    highlightTextNodes(element, highlights);
                    matchFound = true;
                    break;
                }
            }
            if (matchFound) break;
        } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'MARK') {
            highlightTextNodes(node, highlights);
        }
    }
}

// Handler de seleção de texto
function handleTextSelection(e) {
    setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || selection.toString().trim() === '') {
            return;
        }

        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        
        const verseBlock = container.nodeType === Node.ELEMENT_NODE ? container.closest('.verse-block') : container.parentElement.closest('.verse-block');
        if (!verseBlock) return;

        const selectedText = selection.toString().trim();
        if (selectedText.length < 2) return;

        appState.activeSelection = {
            text: selectedText,
            verseBlock: verseBlock,
            verseNum: parseInt(verseBlock.id.replace('verse-', '')),
            range: range.cloneRange()
        };

        appState.activeVerseElement = verseBlock;
        appState.activeVerseNum = appState.activeSelection.verseNum;

        DOM.verseActionsPopover.classList.add('open');
        
        const rect = range.getBoundingClientRect();
        const popoverHeight = DOM.verseActionsPopover.offsetHeight || 80;
        const popoverWidth = DOM.verseActionsPopover.offsetWidth || 230;

        let top = rect.top + window.scrollY - popoverHeight - 8;
        let left = rect.left + window.scrollX + (rect.width / 2) - (popoverWidth / 2);

        if (rect.width === 0 || rect.height === 0) {
            const blockRect = verseBlock.getBoundingClientRect();
            top = blockRect.top + window.scrollY - popoverHeight - 8;
            left = blockRect.left + window.scrollX + (blockRect.width / 2) - (popoverWidth / 2);
        }

        DOM.verseActionsPopover.style.top = `${top}px`;
        DOM.verseActionsPopover.style.left = `${left}px`;
    }, 10);
}

function copyActiveVerse() {
    if (!appState.activeVerseNum || !appState.currentChapterData) return;
    
    const verseData = appState.currentChapterData.verses.find(v => v.number === appState.activeVerseNum);
    if (!verseData) return;
    
    const verseText = verseData.text;
    const bookName = appState.currentChapterData.book_name;
    const reference = `${bookName} ${appState.currentChapterNum}:${appState.activeVerseNum}`;
    const formattedText = `"${verseText}" (${reference}) - Nossa Bíblia Livre`;
    
    copyToClipboard(formattedText).then(() => {
        // Fecha o popover
        DOM.verseActionsPopover.classList.remove('open');
        
        // Alerta visual discreto na tela
        const copyNotice = document.createElement('div');
        copyNotice.className = 'pix-copy-success';
        copyNotice.style.position = 'fixed';
        copyNotice.style.bottom = '80px';
        copyNotice.style.left = '50%';
        copyNotice.style.transform = 'translateX(-50%)';
        copyNotice.style.display = 'block';
        copyNotice.style.backgroundColor = 'var(--bg-sidebar)';
        copyNotice.style.border = '1px solid var(--border-color)';
        copyNotice.style.padding = '10px 20px';
        copyNotice.style.borderRadius = '8px';
        copyNotice.style.boxShadow = 'var(--shadow-lg)';
        copyNotice.style.zIndex = '3000';
        copyNotice.textContent = 'Versículo copiado com sucesso! 📖';
        
        document.body.appendChild(copyNotice);
        setTimeout(() => {
            copyNotice.remove();
        }, 2000);
    }).catch(err => {
        console.error('Erro ao copiar versículo:', err);
    });
}

function openNoteModal() {
    if (!appState.activeVerseNum || !appState.currentChapterData) return;
    
    const refKey = `${appState.currentBook}-${appState.currentChapterNum}-${appState.activeVerseNum}`;
    
    // Fecha o popover das ações
    DOM.verseActionsPopover.classList.remove('open');
    
    // Prepara a prévia do texto do versículo a partir de dados estruturados limpos
    const verseData = appState.currentChapterData.verses.find(v => v.number === appState.activeVerseNum);
    const verseText = verseData ? verseData.text : '';
    
    const bookName = appState.currentChapterData.book_name;
    DOM.noteVersePreview.textContent = `"${verseText}" (${bookName} ${appState.currentChapterNum}:${appState.activeVerseNum})`;
    
    // Carrega nota antiga se houver
    DOM.noteTextarea.value = appState.notes[refKey] || '';
    
    // Abre o modal
    DOM.noteModal.classList.add('open');
    DOM.noteTextarea.focus();
}

function saveActiveVerseNote() {
    if (!appState.activeVerseElement || !appState.currentBook || !appState.currentChapterNum) return;
    
    const refKey = `${appState.currentBook}-${appState.currentChapterNum}-${appState.activeVerseNum}`;
    const noteText = DOM.noteTextarea.value.trim();
    
    if (noteText !== '') {
        appState.notes[refKey] = noteText;
    } else {
        delete appState.notes[refKey];
    }
    
    // Salva no localStorage
    localStorage.setItem('nb-user-notes', JSON.stringify(appState.notes));
    
    // Fecha o modal
    DOM.noteModal.classList.remove('open');
    
    // Atualiza o indicador visual no versículo
    updateVerseNoteIndicator(appState.activeVerseElement, refKey);
}

function updateVerseNoteIndicator(verseBlock, refKey) {
    // Remove o indicador antigo se houver
    const oldIndicator = verseBlock.querySelector('.verse-note-indicator');
    if (oldIndicator) {
        oldIndicator.remove();
    }
    
    // Se existir nota, adiciona o indicador ao marcador de número do versículo
    if (appState.notes[refKey]) {
        const numMarker = verseBlock.querySelector('.verse-num-marker');
        if (numMarker) {
            const noteIndicator = document.createElement('span');
            noteIndicator.className = 'verse-note-indicator';
            noteIndicator.innerHTML = `
                <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                <span>Nota</span>
            `;
            noteIndicator.title = appState.notes[refKey];
            
            // Abre a nota ao clicar no indicador diretamente
            noteIndicator.addEventListener('click', (e) => {
                e.stopPropagation();
                // Simula que clicou no versículo e abre direto a nota
                appState.activeVerseElement = verseBlock;
                appState.activeVerseNum = parseInt(verseBlock.id.replace('verse-', ''));
                checkPremiumAccess(() => {
                    openNoteModal();
                });
            });
            
            numMarker.appendChild(noteIndicator);
        }
    }
}

// --- Variável global para controle de Swipe ---
let swipeDirection = null;

// --- Histórico de Leituras Recentes (Premium) ---
function addToReadingHistory(bookSlug, chapterNum) {
    if (!appState.isPremium) return;
    
    // Remove duplicatas
    appState.history = appState.history.filter(item => !(item.bookSlug === bookSlug && parseInt(item.chapterNum) === parseInt(chapterNum)));
    
    // Insere no topo
    appState.history.unshift({
        bookSlug,
        chapterNum,
        timestamp: Date.now()
    });
    
    // Limita aos 5 mais recentes
    if (appState.history.length > 5) {
        appState.history.pop();
    }
    
    localStorage.setItem('nb-reading-history', JSON.stringify(appState.history));
    renderRecentChapters();
}

function renderRecentChapters() {
    if (!DOM.recentChaptersList || !DOM.recentChaptersSection) return;
    
    if (!appState.isPremium || appState.history.length === 0) {
        DOM.recentChaptersSection.style.display = 'none';
        return;
    }
    
    DOM.recentChaptersSection.style.display = 'block';
    DOM.recentChaptersList.innerHTML = '';
    
    appState.history.forEach(item => {
        const bookName = item.bookSlug.replace(/-/g, ' ');
        const chip = document.createElement('button');
        chip.className = 'recent-chip';
        chip.innerHTML = `${bookName} ${item.chapterNum}`;
        chip.addEventListener('click', () => {
            loadChapter(item.bookSlug, item.chapterNum);
            closeSidebar();
        });
        DOM.recentChaptersList.appendChild(chip);
    });
}

// --- Player de Áudio Inteligente (Premium / TTS) ---
let audioState = {
    isPlaying: false,
    currentVerseIndex: -1,
    verses: [],
    utterance: null,
    speed: 1.0
};

function toggleAudioPlayerPanel() {
    if (!DOM.audioPlayerPanel) return;
    
    const isOpen = DOM.audioPlayerPanel.classList.contains('open');
    if (isOpen) {
        closeAudioPlayerPanel();
    } else {
        DOM.audioPlayerPanel.classList.add('open');
        loadAudioVerses();
        updateAudioUI();
    }
}

function closeAudioPlayerPanel() {
    if (DOM.audioPlayerPanel) {
        DOM.audioPlayerPanel.classList.remove('open');
    }
    stopAudio();
}

function loadAudioVerses() {
    audioState.verses = [];
    audioState.currentVerseIndex = -1;
    
    if (!appState.currentChapterData || !appState.currentChapterData.verses) return;
    
    appState.currentChapterData.verses.forEach((verse, index) => {
        const block = document.getElementById(`verse-${verse.number}`);
        audioState.verses.push({
            index: index,
            element: block,
            number: verse.number,
            text: verse.text
        });
    });
}

function playAudio() {
    if (audioState.verses.length === 0) return;
    
    // Se o índice de versículo atual não for válido, começa do primeiro
    if (audioState.currentVerseIndex < 0 || audioState.currentVerseIndex >= audioState.verses.length) {
        audioState.currentVerseIndex = 0;
    }
    
    audioState.isPlaying = true;
    updateAudioUI();
    
    // Cancela qualquer fala anterior
    window.speechSynthesis.cancel();
    
    const currentVerse = audioState.verses[audioState.currentVerseIndex];
    
    // Highlight do versículo em reprodução
    document.querySelectorAll('.verse-block').forEach(block => block.classList.remove('reading'));
    currentVerse.element.classList.add('reading');
    currentVerse.element.scrollIntoView({ block: 'center', behavior: 'smooth' });
    
    // Configura o sintetizador de voz nativo do navegador
    audioState.utterance = new SpeechSynthesisUtterance(currentVerse.text);
    audioState.utterance.lang = 'pt-BR';
    audioState.utterance.rate = audioState.speed;
    
    // Evento ao finalizar a fala do versículo
    audioState.utterance.onend = () => {
        if (audioState.isPlaying) {
            audioState.currentVerseIndex++;
            if (audioState.currentVerseIndex < audioState.verses.length) {
                playAudio();
            } else {
                stopAudio();
                // Passa para o próximo capítulo automaticamente se houver
                setTimeout(() => {
                    navigateToNextChapter();
                }, 1000);
            }
        }
    };
    
    audioState.utterance.onerror = (e) => {
        console.error('SpeechSynthesisUtterance erro:', e);
        if (e.error !== 'interrupted') {
            audioState.isPlaying = false;
            updateAudioUI();
        }
    };
    
    window.speechSynthesis.speak(audioState.utterance);
}

function pauseAudio() {
    audioState.isPlaying = false;
    window.speechSynthesis.cancel();
    updateAudioUI();
}

function stopAudio() {
    audioState.isPlaying = false;
    window.speechSynthesis.cancel();
    audioState.currentVerseIndex = -1;
    document.querySelectorAll('.verse-block').forEach(block => block.classList.remove('reading'));
    updateAudioUI();
}

function playNextVerseAudio() {
    if (audioState.verses.length === 0) return;
    
    if (audioState.currentVerseIndex < audioState.verses.length - 1) {
        audioState.currentVerseIndex++;
        playAudio();
    } else {
        stopAudio();
        navigateToNextChapter();
    }
}

function playPreviousVerseAudio() {
    if (audioState.verses.length === 0) return;
    
    if (audioState.currentVerseIndex > 0) {
        audioState.currentVerseIndex--;
        playAudio();
    }
}

function updateAudioUI() {
    if (!DOM.audioPlayPauseBtn || !DOM.audioStatus) return;
    
    const playIcon = DOM.audioPlayPauseBtn.querySelector('.play-icon');
    const pauseIcon = DOM.audioPlayPauseBtn.querySelector('.pause-icon');
    
    if (audioState.isPlaying) {
        if (playIcon) playIcon.style.display = 'none';
        if (pauseIcon) pauseIcon.style.display = 'block';
        
        const currentVerse = audioState.verses[audioState.currentVerseIndex];
        const bookName = appState.currentChapterData ? appState.currentChapterData.book_name : appState.currentBook;
        DOM.audioStatus.textContent = `Lendo: ${bookName} ${appState.currentChapterNum}:${currentVerse ? currentVerse.number : 1}`;
    } else {
        if (playIcon) playIcon.style.display = 'block';
        if (pauseIcon) pauseIcon.style.display = 'none';
        
        if (audioState.currentVerseIndex >= 0) {
            DOM.audioStatus.textContent = 'Leitura pausada';
        } else {
            DOM.audioStatus.textContent = 'Pronto para ler o capítulo';
        }
    }
}

// --- Gerador de Cards de Versículos (Premium) ---
function openShareModal() {
    if (!appState.activeVerseNum || !appState.currentChapterData) return;
    
    // Fecha o popover das ações
    DOM.verseActionsPopover.classList.remove('open');
    
    const verseData = appState.currentChapterData.verses.find(v => v.number === appState.activeVerseNum);
    const verseText = verseData ? verseData.text : '';
    
    const bookName = appState.currentChapterData.book_name;
    const reference = `${bookName} ${appState.currentChapterNum}:${appState.activeVerseNum}`;
    
    // Preenche os dados no preview do Modal
    if (DOM.cardText) DOM.cardText.textContent = `"${verseText}"`;
    if (DOM.cardReference) DOM.cardReference.textContent = reference;
    
    // Abre o modal
    if (DOM.shareModal) DOM.shareModal.classList.add('open');
}

function generateAndDownloadCard() {
    const cardTextVal = DOM.cardText.textContent;
    const cardRefVal = DOM.cardReference.textContent;
    
    // Identifica o tema e fonte ativos no preview
    const activeThemeBtn = document.querySelector('.theme-opt.active');
    const activeFontBtn = document.querySelector('.font-opt.active');
    
    const themeBgClass = activeThemeBtn ? activeThemeBtn.dataset.bg : 'bg-grad-purple';
    const fontClass = activeFontBtn ? activeFontBtn.dataset.font : 'font-lora';
    
    // Cria um Canvas de alta resolução (1080x1080 - perfeito para instagram)
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    
    // 1. Desenha o fundo de acordo com o tema selecionado
    if (themeBgClass === 'bg-grad-purple') {
        const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
        grad.addColorStop(0, '#667eea');
        grad.addColorStop(1, '#764ba2');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1080, 1080);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'; // cor da aspa
    } else if (themeBgClass === 'bg-grad-sunset') {
        const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
        grad.addColorStop(0, '#f857a6');
        grad.addColorStop(1, '#ff5858');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1080, 1080);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    } else if (themeBgClass === 'bg-grad-forest') {
        const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
        grad.addColorStop(0, '#11998e');
        grad.addColorStop(1, '#38ef7d');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1080, 1080);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    } else if (themeBgClass === 'bg-grad-ocean') {
        const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
        grad.addColorStop(0, '#2b5876');
        grad.addColorStop(1, '#4e4376');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1080, 1080);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    } else if (themeBgClass === 'bg-minimal-dark') {
        ctx.fillStyle = '#1e1e24';
        ctx.fillRect(0, 0, 1080, 1080);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    } else { // bg-minimal-light
        ctx.fillStyle = '#f7f5f0';
        ctx.fillRect(0, 0, 1080, 1080);
        
        // Borda elegante
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
        ctx.lineWidth = 20;
        ctx.strokeRect(10, 10, 1060, 1060);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
    }
    
    // 2. Desenha a aspa de fundo gigante
    let fontName = 'Georgia';
    if (fontClass === 'font-sans') fontName = '"Plus Jakarta Sans", sans-serif';
    if (fontClass === 'font-playfair') fontName = '"Playfair Display", serif';
    
    ctx.font = `italic 320px ${fontName}`;
    ctx.fillText('“', 100, 320);
    
    // 3. Configura cores do texto
    let textColor = '#ffffff';
    let subColor = 'rgba(255, 255, 255, 0.7)';
    if (themeBgClass === 'bg-minimal-light') {
        textColor = '#2c2520';
        subColor = 'rgba(44, 37, 32, 0.6)';
    }
    
    // 4. Desenha o texto do versículo com Word Wrap
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    
    const padding = 100;
    const maxWidth = 880;
    let fontSize = 48;
    
    // Ajusta o tamanho da fonte com base na extensão do versículo
    if (cardTextVal.length > 250) {
        fontSize = 36;
    } else if (cardTextVal.length > 150) {
        fontSize = 42;
    }
    
    ctx.font = `italic ${fontSize}px ${fontName}`;
    const lineHeight = fontSize * 1.5;
    
    // Desenha o bloco do texto e pega a altura total ocupada
    const textHeight = drawTextWithWordWrap(ctx, cardTextVal, 540, 540, maxWidth, lineHeight);
    
    // 5. Desenha a referência do versículo
    ctx.fillStyle = textColor;
    ctx.font = `bold 32px ${fontName}`;
    
    // Coloca a referência um pouco abaixo do bloco do texto centralizado
    const refY = 540 + (textHeight / 2) + 60;
    ctx.fillText(cardRefVal, 540, refY);
    
    // 6. Desenha a marca d'água no rodapé
    ctx.fillStyle = subColor;
    ctx.font = `900 24px "Plus Jakarta Sans", sans-serif`;
    ctx.letterSpacing = '2px';
    ctx.fillText('NOSSA BÍBLIA LIVRE', 540, 980);
    
    // Dispara o download da imagem em PNG
    const link = document.createElement('a');
    link.download = `nossa-biblia-livre-${cardRefVal.replace(/\s+/g, '-').replace(/:/g, '-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

function drawTextWithWordWrap(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let lines = [];
    
    for (let n = 0; n < words.length; n++) {
        let testLine = line + words[n] + ' ';
        let metrics = ctx.measureText(testLine);
        let testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            lines.push(line);
            line = words[n] + ' ';
        } else {
            line = testLine;
        }
    }
    lines.push(line);
    
    const totalHeight = lines.length * lineHeight;
    let currentY = y - (totalHeight / 2) + (lineHeight / 2);
    
    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i].trim(), x, currentY);
        currentY += lineHeight;
    }
    
    return totalHeight;
}

