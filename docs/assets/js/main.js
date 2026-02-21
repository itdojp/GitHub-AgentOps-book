/**
 * Main JavaScript for Book Template
 * Handles general functionality and initialization
 */

(function() {
    'use strict';

    // Smooth scrolling for anchor links
    function initSmoothScrolling() {
        const links = document.querySelectorAll('a[href^="#"]');
        links.forEach(link => {
            link.addEventListener('click', function(e) {
                const targetId = this.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);
                
                if (targetElement) {
                    e.preventDefault();
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    // Reading progress indicator
    function initReadingProgress() {
        const progressBar = document.querySelector('.reading-progress');
        if (!progressBar) return;

        function updateProgress() {
            const scrollTop = window.pageYOffset;
            const docHeight = document.body.scrollHeight - window.innerHeight;
            const progress = (scrollTop / docHeight) * 100;
            
            progressBar.style.width = Math.min(progress, 100) + '%';
        }

        window.addEventListener('scroll', updateProgress);
        updateProgress(); // Initial call
    }

    // External link handling
    function initExternalLinks() {
        const externalLinks = document.querySelectorAll('a[href^="http"]');
        externalLinks.forEach(link => {
            if (!link.hostname.includes(window.location.hostname)) {
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener noreferrer');
            }
        });
    }

    // Focus management for accessibility
    function initFocusManagement() {
        // Skip to content link
        const skipLink = document.querySelector('.skip-to-content');
        if (skipLink) {
            skipLink.addEventListener('click', function(e) {
                e.preventDefault();
                const mainContent = document.querySelector('main');
                if (mainContent) {
                    mainContent.focus();
                    mainContent.scrollIntoView();
                }
            });
        }

        // Focus visible management
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Tab') {
                document.body.classList.add('keyboard-navigation');
            }
        });

        document.addEventListener('mousedown', function() {
            document.body.classList.remove('keyboard-navigation');
        });
    }

    // Print functionality
    function initPrintSupport() {
        const printButton = document.querySelector('.print-button');
        if (printButton) {
            printButton.addEventListener('click', function() {
                window.print();
            });
        }
    }

    // Image lazy loading fallback
    function initImageLazyLoading() {
        // Only if native lazy loading is not supported
        if ('loading' in HTMLImageElement.prototype) {
            return;
        }

        const images = document.querySelectorAll('img[loading="lazy"]');
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src || img.src;
                    img.classList.remove('lazy');
                    observer.unobserve(img);
                }
            });
        });

        images.forEach(img => imageObserver.observe(img));
    }

    // Initialize all functionality
    function init() {
        initSmoothScrolling();
        initReadingProgress();
        initExternalLinks();
        initFocusManagement();
        initPrintSupport();
        initImageLazyLoading();
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose global functions if needed
    window.bookTemplate = {
        init: init,
        smoothScrollTo: function(elementId) {
            const element = document.getElementById(elementId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        }
    };
})();