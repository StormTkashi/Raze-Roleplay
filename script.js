// DOM Elements
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileOverlay = document.getElementById('mobileOverlay');
const sidebar = document.getElementById('sidebar');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const navLinks = document.querySelectorAll('.nav-link');
const contentSections = document.querySelectorAll('.content-section');
const copyLinkBtns = document.querySelectorAll('.copy-link-btn');
const discordLinks = document.querySelectorAll('#discordLink, #discordMainBtn, #discordMainBtn2');

// State Management
let searchTimeout;
let isSearchActive = false;

// Navigation System
class NavigationManager {
    constructor() {
        this.activeSection = 'introducao';
        this.init();
    }

    init() {
        this.bindEvents();
        this.handleInitialHash();
        this.observeScrolling();
    }

    bindEvents() {
        // Navigation link clicks
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                
                // Handle submenu toggle
                const parentItem = link.closest('.has-submenu');
                if (parentItem && !link.classList.contains('submenu-link')) {
                    // This is a parent menu item with submenu
                    parentItem.classList.toggle('active');
                    
                    // Also navigate to the section
                    this.navigateToSection(section);
                } else {
                    // Regular navigation or submenu item
                    this.navigateToSection(section);
                }
                
                // Close mobile menu if open
                if (window.mobileMenuManager) {
                    window.mobileMenuManager.closeMenu();
                }
            });
        });

        // Hash change events (browser back/forward)
        window.addEventListener('hashchange', () => {
            this.handleHashChange();
        });
    }

    navigateToSection(sectionId) {
        // Update URL without triggering scroll
        history.pushState(null, null, `#${sectionId}`);
        
        // Hide all sections
        contentSections.forEach(section => {
            section.classList.remove('active');
        });

        // Show target section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
            this.activeSection = sectionId;
        }

        // Update navigation active state
        this.updateActiveNavLink(sectionId);

        // Scroll to top of content
        document.querySelector('.content').scrollTop = 0;
    }

    updateActiveNavLink(sectionId) {
        navLinks.forEach(link => {
            link.classList.remove('active');
            link.closest('.nav-item')?.classList.remove('active');
        });

        const activeLink = document.querySelector(`[data-section="${sectionId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
            activeLink.closest('.nav-item')?.classList.add('active');
            
            // If this is a submenu item, also activate parent and expand submenu
            const submenuParent = activeLink.closest('.has-submenu');
            if (submenuParent) {
                submenuParent.classList.add('active');
                const parentLink = submenuParent.querySelector('.nav-link:not(.submenu-link)');
                if (parentLink) {
                    parentLink.classList.add('active');
                }
            }
        }
    }

    handleInitialHash() {
        const hash = window.location.hash.substring(1);
        if (hash && document.getElementById(hash)) {
            this.navigateToSection(hash);
        }
    }

    handleHashChange() {
        const hash = window.location.hash.substring(1);
        if (hash && hash !== this.activeSection) {
            this.navigateToSection(hash);
        }
    }

    observeScrolling() {
        // Smooth scrolling behavior for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(link => {
            link.addEventListener('click', (e) => {
                const targetId = link.getAttribute('href').substring(1);
                if (document.getElementById(targetId)) {
                    e.preventDefault();
                    this.navigateToSection(targetId);
                }
            });
        });
    }
}

// Search System
class SearchManager {
    constructor() {
        this.searchData = [];
        this.init();
    }

    init() {
        this.buildSearchIndex();
        this.bindEvents();
    }

    buildSearchIndex() {
        contentSections.forEach(section => {
            const sectionId = section.id;
            const title = section.querySelector('h1')?.textContent || '';
            const content = section.textContent || '';
            
            // Split content into searchable chunks
            const paragraphs = section.querySelectorAll('p, li, h2, h3');
            paragraphs.forEach(para => {
                if (para.textContent.trim()) {
                    this.searchData.push({
                        section: sectionId,
                        title: title,
                        content: para.textContent.trim(),
                        element: para
                    });
                }
            });
        });
    }

    bindEvents() {
        // Search input events
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            
            if (query.length === 0) {
                this.hideSearchResults();
                return;
            }

            searchTimeout = setTimeout(() => {
                this.performSearch(query);
            }, 300);
        });

        // Search input focus/blur
        searchInput.addEventListener('focus', () => {
            if (searchInput.value.trim().length > 0) {
                this.showSearchResults();
            }
        });

        // Click outside to close search
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                this.hideSearchResults();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl+K or Cmd+K to focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                searchInput.focus();
            }
            
            // Escape to close search
            if (e.key === 'Escape') {
                this.hideSearchResults();
                searchInput.blur();
            }
        });
    }

    performSearch(query) {
        const results = this.searchData.filter(item => 
            item.content.toLowerCase().includes(query.toLowerCase()) ||
            item.title.toLowerCase().includes(query.toLowerCase())
        );

        this.displaySearchResults(results.slice(0, 8), query); // Limit to 8 results
    }

    displaySearchResults(results, query) {
        if (results.length === 0) {
            searchResults.innerHTML = `
                <div class="search-result-item">
                    <div class="search-result-title">Nenhum resultado encontrado</div>
                    <div class="search-result-snippet">Tente buscar por outros termos</div>
                </div>
            `;
        } else {
            searchResults.innerHTML = results.map(result => {
                const snippet = this.highlightSearchTerm(
                    this.truncateText(result.content, 100),
                    query
                );
                
                return `
                    <div class="search-result-item" data-section="${result.section}">
                        <div class="search-result-title">${result.title}</div>
                        <div class="search-result-snippet">${snippet}</div>
                    </div>
                `;
            }).join('');

            // Bind click events to search results
            searchResults.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', () => {
                    const section = item.dataset.section;
                    navigationManager.navigateToSection(section);
                    this.hideSearchResults();
                    searchInput.value = '';
                });
            });
        }

        this.showSearchResults();
    }

    highlightSearchTerm(text, term) {
        const regex = new RegExp(`(${term})`, 'gi');
        return text.replace(regex, '<mark style="background: #ff00ac; color: white; padding: 1px 3px; border-radius: 2px;">$1</mark>');
    }

    truncateText(text, length) {
        if (text.length <= length) return text;
        return text.substring(0, length) + '...';
    }

    showSearchResults() {
        searchResults.style.display = 'block';
        isSearchActive = true;
    }

    hideSearchResults() {
        searchResults.style.display = 'none';
        isSearchActive = false;
    }
}

// Mobile Menu System
class MobileMenuManager {
    constructor() {
        this.isOpen = false;
        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        // Mobile menu button
        mobileMenuBtn.addEventListener('click', () => {
            this.toggleMenu();
        });

        // Overlay click to close
        mobileOverlay.addEventListener('click', () => {
            this.closeMenu();
        });

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeMenu();
            }
        });

        // Close menu on window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && this.isOpen) {
                this.closeMenu();
            }
        });
    }

    toggleMenu() {
        if (this.isOpen) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }

    openMenu() {
        sidebar.classList.add('active');
        mobileOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        this.isOpen = true;
    }

    closeMenu() {
        sidebar.classList.remove('active');
        mobileOverlay.classList.remove('active');
        document.body.style.overflow = '';
        this.isOpen = false;
    }
}

// Utility Functions
class UtilityManager {
    constructor() {
        this.init();
    }

    init() {
        this.bindCopyLinkButtons();
        this.bindDiscordLinks();
        this.addSmoothScrolling();
        this.handleExternalLinks();
    }

    bindCopyLinkButtons() {
        copyLinkBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const section = btn.dataset.section;
                const url = `${window.location.origin}${window.location.pathname}#${section}`;
                
                this.copyToClipboard(url).then(() => {
                    this.showNotification('Link copiado para a área de transferência!');
                }).catch(() => {
                    this.showNotification('Erro ao copiar link', 'error');
                });
            });
        });
    }

    bindDiscordLinks() {
        discordLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                // Replace with actual Discord invite link
                const discordUrl = 'https://discord.gg/razeroleplay';
                window.open(discordUrl, '_blank', 'noopener,noreferrer');
            });
        });
    }

    async copyToClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text);
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            return new Promise((resolve, reject) => {
                document.execCommand('copy') ? resolve() : reject();
                textArea.remove();
            });
        }
    }

    showNotification(message, type = 'success') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 90px;
            right: 20px;
            background: ${type === 'success' ? 'var(--accent-blue)' : '#dc3545'};
            color: white;
            padding: 12px 20px;
            border-radius: var(--border-radius);
            z-index: 10000;
            font-size: 14px;
            font-weight: 500;
            box-shadow: var(--shadow);
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Animate in
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0)';
        });

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    addSmoothScrolling() {
        // Add smooth scrolling to all internal links
        document.querySelectorAll('a[href^="#"]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                if (document.getElementById(targetId)) {
                    navigationManager.navigateToSection(targetId);
                }
            });
        });
    }

    handleExternalLinks() {
        // Add security attributes to external links
        document.querySelectorAll('a[href^="http"]').forEach(link => {
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
        });
    }
}

// Performance and Analytics
class PerformanceManager {
    constructor() {
        this.init();
    }

    init() {
        this.trackPageViews();
        this.optimizeImages();
        this.preloadCriticalResources();
    }

    trackPageViews() {
        // Track section views for analytics
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const section = entry.target.id;
                    console.log(`Section viewed: ${section}`);
                    // Here you would send to your analytics service
                }
            });
        }, { threshold: 0.5 });

        contentSections.forEach(section => {
            observer.observe(section);
        });
    }

    optimizeImages() {
        // Lazy load images if any are added
        const images = document.querySelectorAll('img[data-src]');
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            });
        });

        images.forEach(img => imageObserver.observe(img));
    }

    preloadCriticalResources() {
        // Preload critical CSS and fonts
        const criticalResources = [
            'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
            'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
        ];

        criticalResources.forEach(resource => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'style';
            link.href = resource;
            document.head.appendChild(link);
        });
    }
}

// Accessibility Manager
class AccessibilityManager {
    constructor() {
        this.init();
    }

    init() {
        this.addKeyboardNavigation();
        this.addAriaLabels();
        this.addFocusManagement();
    }

    addKeyboardNavigation() {
        // Add keyboard navigation for sidebar
        document.addEventListener('keydown', (e) => {
            if (e.target.classList.contains('nav-link')) {
                switch(e.key) {
                    case 'ArrowDown':
                        e.preventDefault();
                        this.focusNextNavItem(e.target);
                        break;
                    case 'ArrowUp':
                        e.preventDefault();
                        this.focusPrevNavItem(e.target);
                        break;
                }
            }
        });
    }

    focusNextNavItem(current) {
        const navItems = Array.from(document.querySelectorAll('.nav-link'));
        const currentIndex = navItems.indexOf(current);
        const nextIndex = (currentIndex + 1) % navItems.length;
        navItems[nextIndex].focus();
    }

    focusPrevNavItem(current) {
        const navItems = Array.from(document.querySelectorAll('.nav-link'));
        const currentIndex = navItems.indexOf(current);
        const prevIndex = currentIndex === 0 ? navItems.length - 1 : currentIndex - 1;
        navItems[prevIndex].focus();
    }

    addAriaLabels() {
        // Add aria-labels for better screen reader support
        searchInput.setAttribute('aria-label', 'Buscar nas regras');
        mobileMenuBtn.setAttribute('aria-label', 'Abrir menu de navegação');
        
        navLinks.forEach(link => {
            const text = link.querySelector('span').textContent;
            link.setAttribute('aria-label', `Navegar para ${text}`);
        });
    }

    addFocusManagement() {
        // Focus management will be handled when sections are activated
        // This avoids overriding the navigationManager method
    }
}

// Initialize Application
let navigationManager;
let searchManager;
let mobileMenuManager;
let utilityManager;
let performanceManager;
let accessibilityManager;

// Global close mobile menu function
function closeMobileMenu() {
    if (mobileMenuManager) {
        mobileMenuManager.closeMenu();
    }
}

// Document Ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize all managers
    navigationManager = new NavigationManager();
    searchManager = new SearchManager();
    mobileMenuManager = new MobileMenuManager();
    utilityManager = new UtilityManager();
    performanceManager = new PerformanceManager();
    accessibilityManager = new AccessibilityManager();

    // Make mobile menu manager globally accessible
    window.mobileMenuManager = mobileMenuManager;

    // Add loading state removal
    document.body.classList.add('loaded');

    console.log('Raze Roleplay - Rules Website Initialized');
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Page is hidden, pause any animations or timers
        clearTimeout(searchTimeout);
    }
});

// Handle online/offline status
window.addEventListener('online', () => {
    utilityManager.showNotification('Sinal restaurado', 'success');
});

window.addEventListener('offline', () => {
    utilityManager.showNotification('Sinal perdido', 'error');
});

// Expandable Section Function
function toggleSection(sectionId) {
    const content = document.getElementById(sectionId);
    const header = content.previousElementSibling;
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        header.classList.add('active');
    } else {
        content.style.display = 'none';
        header.classList.remove('active');
    }
}

// Navigation Section Function
function navigateSection(sectionId) {
    if (navigationManager) {
        navigationManager.navigateToSection(sectionId);
    }
}

// Export for potential external use
window.RazeRules = {
    navigation: () => navigationManager,
    search: () => searchManager,
    mobileMenu: () => mobileMenuManager,
    utils: () => utilityManager,
    toggleSection: toggleSection
};
