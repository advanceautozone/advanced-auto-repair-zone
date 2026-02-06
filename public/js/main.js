// main.js - Main JavaScript for Auto Repair Shop Website
// This file handles global functionality across all pages

(function() {
    'use strict';

    console.log('🔧 main.js loaded');

    // ========== Mobile Navigation Toggle ==========
    function initMobileNav() {
        const navToggle = document.querySelector('.nav-toggle');
        const mainNav = document.querySelector('.main-nav');
        
        if (navToggle && mainNav) {
            navToggle.addEventListener('click', function() {
                mainNav.classList.toggle('open');
                const isOpen = mainNav.classList.contains('open');
                navToggle.setAttribute('aria-expanded', isOpen);
            });

            // Close menu when clicking outside
            document.addEventListener('click', function(e) {
                if (!navToggle.contains(e.target) && !mainNav.contains(e.target)) {
                    mainNav.classList.remove('open');
                    navToggle.setAttribute('aria-expanded', 'false');
                }
            });

            // Close menu when clicking a nav link
            const navLinks = mainNav.querySelectorAll('a');
            navLinks.forEach(function(link) {
                link.addEventListener('click', function() {
                    mainNav.classList.remove('open');
                    navToggle.setAttribute('aria-expanded', 'false');
                });
            });
        }
    }

    // ========== Current Year in Footer ==========
    function updateFooterYear() {
        const yearSpan = document.getElementById('current-year');
        if (yearSpan) {
            yearSpan.textContent = new Date().getFullYear();
        }
    }

    // ========== Smooth Scroll for Anchor Links ==========
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
            anchor.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                if (href !== '#' && document.querySelector(href)) {
                    e.preventDefault();
                    document.querySelector(href).scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    // ========== Highlight Active Navigation Link ==========
    function highlightActiveNav() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const navLinks = document.querySelectorAll('.main-nav a');

        navLinks.forEach(function(link) {
            if (link.getAttribute('href') === currentPage) {
                link.style.borderBottomColor = 'var(--color-primary)';
                link.style.color = 'var(--color-primary)';
            }
        });
    }

    // ========== Date Input Minimum Date (Today) ==========
    function setMinDateForInputs() {
        const dateInputs = document.querySelectorAll('input[type="date"]');
        const today = new Date().toISOString().split('T')[0];
        dateInputs.forEach(function(input) {
            input.setAttribute('min', today);
        });
    }

    // ========== Check Login Status ==========
    function checkLoginStatus() {
        const loginBtn = document.querySelector('a[href="Login.html"]');
        
        if (window.sessionUser && window.sessionUser.loggedIn) {
            // User is logged in
            console.log('✅ User logged in:', window.sessionUser.user.name);
            
            if (loginBtn) {
                const firstName = window.sessionUser.user.name.split(' ')[0];
                loginBtn.textContent = 'Hi, ' + firstName;
                loginBtn.href = '#';
                loginBtn.style.cursor = 'pointer';
                loginBtn.classList.remove('btn-primary');
                loginBtn.classList.add('btn-outline');
                
                // Remove old click listener by cloning
                const newLoginBtn = loginBtn.cloneNode(true);
                loginBtn.parentNode.replaceChild(newLoginBtn, loginBtn);
                
                // Add logout functionality
                newLoginBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    if (confirm('Are you sure you want to log out?')) {
                        delete window.sessionUser;
                        window.location.reload();
                    }
                });
            }
        } else {
            console.log('ℹ️ User not logged in');
        }
    }

    // ========== Scroll to Top Button ==========
    function initScrollToTop() {
        const scrollBtn = document.createElement('button');
        scrollBtn.innerHTML = '↑';
        scrollBtn.className = 'scroll-to-top';
        scrollBtn.setAttribute('aria-label', 'Scroll to top');
        scrollBtn.style.cssText = 
            'position: fixed;' +
            'bottom: 30px;' +
            'right: 30px;' +
            'width: 50px;' +
            'height: 50px;' +
            'border-radius: 50%;' +
            'background-color: var(--color-primary);' +
            'color: white;' +
            'border: none;' +
            'font-size: 20px;' +
            'cursor: pointer;' +
            'display: none;' +
            'z-index: 999;' +
            'box-shadow: 0 4px 12px rgba(224, 36, 42, 0.4);' +
            'transition: opacity 0.3s ease, transform 0.3s ease;';

        document.body.appendChild(scrollBtn);

        window.addEventListener('scroll', function() {
            if (window.scrollY > 300) {
                scrollBtn.style.display = 'block';
            } else {
                scrollBtn.style.display = 'none';
            }
        });

        scrollBtn.addEventListener('click', function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });

        scrollBtn.addEventListener('mouseenter', function() {
            scrollBtn.style.transform = 'scale(1.1)';
        });

        scrollBtn.addEventListener('mouseleave', function() {
            scrollBtn.style.transform = 'scale(1)';
        });
    }

    // ========== Initialize All Functions ==========
    function init() {
        initMobileNav();
        updateFooterYear();
        initSmoothScroll();
        highlightActiveNav();
        setMinDateForInputs();
        checkLoginStatus();
        initScrollToTop();
        
        console.log('✅ All main.js functions initialized');
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ========== Console Welcome Message ==========
    console.log('%c🚗 Welcome to our Auto Repair Shop Website!', 'color: #e0242a; font-size: 16px; font-weight: bold;');
    console.log('%cNeed help? Contact us for any automotive service needs!', 'color: #666; font-size: 12px;');

})();