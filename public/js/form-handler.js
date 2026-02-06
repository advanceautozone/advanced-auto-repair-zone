// form-handler.js - Handle all form submissions with backend API
// Add this file to your public/js/ folder

(function() {
    'use strict';

    console.log('📝 form-handler.js loaded');

    const API_URL = 'http://localhost:3000/api';

    // ========== HELPER FUNCTIONS ==========
    
    function showMessage(message, isSuccess) {
        // Create a nice modal/toast instead of alert
        const modal = document.createElement('div');
        modal.style.cssText = 
            'position: fixed;' +
            'top: 50%;' +
            'left: 50%;' +
            'transform: translate(-50%, -50%);' +
            'background: white;' +
            'padding: 30px 40px;' +
            'border-radius: 12px;' +
            'box-shadow: 0 10px 40px rgba(0,0,0,0.3);' +
            'z-index: 10000;' +
            'max-width: 400px;' +
            'text-align: center;' +
            'animation: slideIn 0.3s ease;';
        
        const icon = isSuccess ? '✅' : '❌';
        const color = isSuccess ? '#155724' : '#721c24';
        const bgColor = isSuccess ? '#d4edda' : '#f8d7da';
        
        modal.innerHTML = 
            '<div style="font-size: 48px; margin-bottom: 15px;">' + icon + '</div>' +
            '<div style="font-size: 18px; font-weight: 600; color: ' + color + '; margin-bottom: 10px;">' +
            (isSuccess ? 'Success!' : 'Error') +
            '</div>' +
            '<div style="font-size: 14px; color: #333; margin-bottom: 20px;">' + message + '</div>' +
            '<button onclick="this.parentElement.remove(); document.getElementById(\'modal-overlay\').remove();" ' +
            'style="background: #e0242a; color: white; border: none; padding: 10px 25px; ' +
            'border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: 600;">OK</button>';
        
        // Add overlay
        const overlay = document.createElement('div');
        overlay.id = 'modal-overlay';
        overlay.style.cssText = 
            'position: fixed;' +
            'top: 0;' +
            'left: 0;' +
            'right: 0;' +
            'bottom: 0;' +
            'background: rgba(0,0,0,0.5);' +
            'z-index: 9999;';
        
        // Add animation
        const style = document.createElement('style');
        style.textContent = '@keyframes slideIn { from { opacity: 0; transform: translate(-50%, -60%); } to { opacity: 1; transform: translate(-50%, -50%); } }';
        document.head.appendChild(style);
        
        document.body.appendChild(overlay);
        document.body.appendChild(modal);
        
        // Auto close after 5 seconds for success messages
        if (isSuccess) {
            setTimeout(function() {
                if (modal.parentElement) {
                    modal.remove();
                    if (overlay.parentElement) overlay.remove();
                }
            }, 5000);
        }
    }

    // ========== APPOINTMENT FORM HANDLER ==========
    function handleAppointmentForms() {
        // Find all appointment forms
        const appointmentForms = document.querySelectorAll('form[action*="form-handler"], .hero-form');
        
        appointmentForms.forEach(function(form) {
            // Skip if already has listener
            if (form.dataset.listenerAdded) return;
            form.dataset.listenerAdded = 'true';

            form.addEventListener('submit', function(e) {
                e.preventDefault();
                
                console.log('📅 Appointment form submitted');
                
                const formData = new FormData(form);
                const submitBtn = form.querySelector('button[type="submit"]');
                const originalText = submitBtn ? submitBtn.textContent : '';
                
                // Get form data
                const data = {
                    name: formData.get('name'),
                    email: formData.get('email') || '',
                    phone: formData.get('phone'),
                    service: formData.get('service'),
                    preferredDate: formData.get('preferred_date') || formData.get('date'),
                    message: formData.get('message') || ''
                };
                
                // Check honeypot
                if (formData.get('website')) {
                    console.log('🛡️ Honeypot triggered - blocking spam');
                    return false;
                }
                
                // Validation
                if (!data.name || !data.phone || !data.service) {
                    showMessage('Please fill in all required fields.', false);
                    return;
                }
                
                // Show loading state
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Sending...';
                }
                
                console.log('📤 Sending appointment data:', data);
                
                fetch(API_URL + '/appointments', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                })
                .then(function(response) {
                    return response.json();
                })
                .then(function(result) {
                    console.log('📥 Appointment response:', result);
                    
                    if (result.message) {
                        showMessage(result.message + '\n\nWe will contact you shortly to confirm your appointment.', true);
                        form.reset();
                    } else {
                        showMessage(result.error || 'Something went wrong. Please try again.', false);
                    }
                })
                .catch(function(error) {
                    console.error('❌ Appointment error:', error);
                    showMessage('Server connection error. Please make sure you are connected to the internet.', false);
                })
                .finally(function() {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalText;
                    }
                });
            });
        });

        console.log('✅ Appointment form handlers attached:', appointmentForms.length);
    }

    // ========== CONTACT FORM HANDLER ==========
    function handleContactForm() {
        const contactForm = document.querySelector('#contactForm, form.contact-form');
        
        if (!contactForm) {
            console.log('ℹ️ No contact form found on this page');
            return;
        }

        // Skip if already has listener
        if (contactForm.dataset.listenerAdded) return;
        contactForm.dataset.listenerAdded = 'true';
        
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            console.log('📧 Contact form submitted');
            
            const formData = new FormData(contactForm);
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalText = submitBtn ? submitBtn.textContent : '';
            
            const data = {
                name: formData.get('name'),
                email: formData.get('email'),
                phone: formData.get('phone') || '',
                message: formData.get('message')
            };
            
            // Check honeypot
            if (formData.get('website')) {
                console.log('🛡️ Honeypot triggered - blocking spam');
                return false;
            }
            
            // Validation
            if (!data.name || !data.email || !data.message) {
                showMessage('Please fill in all required fields.', false);
                return;
            }
            
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Sending...';
            }
            
            console.log('📤 Sending contact data:', data);
            
            fetch(API_URL + '/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })
            .then(function(response) {
                return response.json();
            })
            .then(function(result) {
                console.log('📥 Contact response:', result);
                
                if (result.message) {
                    showMessage(result.message, true);
                    contactForm.reset();
                } else {
                    showMessage(result.error || 'Something went wrong. Please try again.', false);
                }
            })
            .catch(function(error) {
                console.error('❌ Contact error:', error);
                showMessage('Server connection error. Please make sure you are connected to the internet.', false);
            })
            .finally(function() {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            });
        });

        console.log('✅ Contact form handler attached');
    }

    // ========== INITIALIZE ALL HANDLERS ==========
    function init() {
        handleAppointmentForms();
        handleContactForm();
        
        console.log('✅ Form handlers initialized and connected to backend API');
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();