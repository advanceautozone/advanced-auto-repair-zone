// session-manager.js - Manage user session across all pages
(function() {
    'use strict';

    console.log('🔐 Session manager loaded');

    // Restore session from sessionStorage
    try {
        const storedUser = sessionStorage.getItem('autoShopUser');
        if (storedUser) {
            window.sessionUser = JSON.parse(storedUser);
            console.log('✅ Session restored for:', window.sessionUser.user.email);
        }
    } catch (e) {
        console.warn('⚠️ Could not restore session:', e);
    }

    // Helper functions
    window.getCurrentUser = function() {
        return window.sessionUser || null;
    };

    window.logout = function() {
        delete window.sessionUser;
        try {
            sessionStorage.removeItem('autoShopUser');
            console.log('✅ Session cleared from storage');
        } catch (e) {
            console.warn('Could not clear sessionStorage:', e);
        }
        console.log('👋 User logged out');
        window.location.reload();
    };

    window.isLoggedIn = function() {
        return !!(window.sessionUser && window.sessionUser.loggedIn);
    };

    // Update login button on page load
    function updateLoginButton() {
        const loginBtn = document.getElementById('loginButton');
        
        if (!loginBtn) {
            console.log('ℹ️ No login button found on this page');
            return;
        }

        if (window.sessionUser && window.sessionUser.loggedIn) {
            console.log('✅ User logged in:', window.sessionUser.user.name);
            
            const firstName = window.sessionUser.user.name.split(' ')[0];
            loginBtn.textContent = 'Hi, ' + firstName;
            loginBtn.href = '#';
            
            // Remove btn-primary class and add custom styling
            loginBtn.classList.remove('btn-primary');
            
            // Custom styling for logged-in state
            loginBtn.style.backgroundColor = 'transparent';
            loginBtn.style.color = '#e0242a';
            loginBtn.style.borderColor = '#e0242a';
            loginBtn.style.boxShadow = 'none';
            
            // Remove old listeners by cloning
            const newBtn = loginBtn.cloneNode(true);
            loginBtn.parentNode.replaceChild(newBtn, loginBtn);
            
            // Add logout functionality
            newBtn.addEventListener('click', function(e) {
                e.preventDefault();
                if (confirm('Are you sure you want to log out?')) {
                    window.logout();
                }
            });
            
            console.log('✅ Login button updated to: Hi, ' + firstName);
        } else {
            console.log('ℹ️ User not logged in');
        }
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateLoginButton);
    } else {
        updateLoginButton();
    }

    console.log('✅ Session manager ready');
})();