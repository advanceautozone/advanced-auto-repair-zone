// towing.js - Google Maps integration for towing page
// Handles location selection, distance calculation, and cost estimation

(function() {
    'use strict';

    console.log('🚗 towing.js loaded');

    // ============================================
    // CONFIGURATION - UPDATE THESE VALUES
    // ============================================
    const SHOP_CONFIG = {
        name: '[SHOP NAME]',                              // Your shop name
        address: 'YOUR ADDRESS LINE 1, YOUR CITY, STATE ZIP', // Your full address
        lat: 43.6532,                                     // Your shop's latitude
        lng: -79.3832,                                    // Your shop's longitude
        phone: 'Call: +17186742455'                        // Your phone number
    };

    // Pricing configuration
    const PRICING = {
        baseRate: 100,      // Base rate for first 10 km
        baseDistance: 10,   // Kilometers included in base rate
        perKmRate: 15       // Rate per km beyond base distance
    };

    // Country restrictions for autocomplete (add/remove as needed)
    const COUNTRY_RESTRICTIONS = ['ca', 'us'];

    const API_URL = 'http://localhost:3000/api';

    // ============================================
    // GLOBAL VARIABLES
    // ============================================
    let shopMap = null;
    let pickupMap = null;
    let shopMarker = null;
    let pickupMarker = null;
    let directionsService = null;
    let directionsRenderer = null;
    let autocomplete = null;
    let formAutocomplete = null;
    let selectedLocation = null;
    let calculatedDistance = null;
    let calculatedCost = null;
    let mapsLoaded = false;

    // ============================================
    // INITIALIZE GOOGLE MAPS
    // ============================================
    window.initTowingMaps = function() {
        console.log('🗺️ Initializing Google Maps...');
        mapsLoaded = true;

        const shopLocation = { lat: SHOP_CONFIG.lat, lng: SHOP_CONFIG.lng };

        // Initialize Shop Location Map
        const shopMapEl = document.getElementById('shop-map');
        if (shopMapEl) {
            shopMap = new google.maps.Map(shopMapEl, {
                center: shopLocation,
                zoom: 15,
                styles: getMapStyles(),
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: true
            });

            // Add Shop Marker
            shopMarker = new google.maps.Marker({
                position: shopLocation,
                map: shopMap,
                title: SHOP_CONFIG.name,
                icon: getShopMarkerIcon(),
                animation: google.maps.Animation.DROP
            });

            // Shop Info Window
            const shopInfoWindow = new google.maps.InfoWindow({
                content: getShopInfoWindowContent()
            });

            shopMarker.addListener('click', function() {
                shopInfoWindow.open(shopMap, shopMarker);
            });

            console.log('✅ Shop map initialized');
        }

        // Initialize Pickup Location Map
        const pickupMapEl = document.getElementById('pickup-map');
        if (pickupMapEl) {
            pickupMap = new google.maps.Map(pickupMapEl, {
                center: shopLocation,
                zoom: 12,
                styles: getMapStyles(),
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: true
            });

            // Add Shop Marker to Pickup Map
            new google.maps.Marker({
                position: shopLocation,
                map: pickupMap,
                title: SHOP_CONFIG.name,
                icon: getShopMarkerIcon()
            });

            // Initialize Directions Service
            directionsService = new google.maps.DirectionsService();
            directionsRenderer = new google.maps.DirectionsRenderer({
                map: pickupMap,
                suppressMarkers: true,
                polylineOptions: {
                    strokeColor: '#e0242a',
                    strokeWeight: 4,
                    strokeOpacity: 0.8
                }
            });

            // Click listener for pickup map
            pickupMap.addListener('click', function(event) {
                placePickupMarker(event.latLng);
            });

            console.log('✅ Pickup map initialized');
        }

        // Initialize Autocomplete
        initAutocomplete();

        // Initialize Tab Switching
        initTabs();

        // Initialize GPS Button
        initGPSButton();

        // Initialize Form Handler
        initTowingFormHandler();

        console.log('✅ All towing maps and handlers initialized');
    };

    // ============================================
    // AUTOCOMPLETE INITIALIZATION
    // ============================================
    function initAutocomplete() {
        // Calculator Autocomplete
        const pickupAddressInput = document.getElementById('pickup-address');
        if (pickupAddressInput) {
            autocomplete = new google.maps.places.Autocomplete(pickupAddressInput, {
                types: ['address'],
                componentRestrictions: { country: COUNTRY_RESTRICTIONS }
            });

            autocomplete.addListener('place_changed', function() {
                const place = autocomplete.getPlace();
                if (place.geometry) {
                    const location = place.geometry.location;
                    selectedLocation = {
                        lat: location.lat(),
                        lng: location.lng(),
                        address: place.formatted_address
                    };
                    placePickupMarker(location, place.formatted_address);
                    
                    // Switch to map tab to show the route
                    switchToTab('map');
                }
            });

            console.log('✅ Calculator autocomplete initialized');
        }

        // Form Autocomplete
        const reqLocationInput = document.getElementById('req-location');
        if (reqLocationInput) {
            formAutocomplete = new google.maps.places.Autocomplete(reqLocationInput, {
                types: ['address'],
                componentRestrictions: { country: COUNTRY_RESTRICTIONS }
            });

            formAutocomplete.addListener('place_changed', function() {
                const place = formAutocomplete.getPlace();
                if (place.geometry) {
                    const location = place.geometry.location;
                    selectedLocation = {
                        lat: location.lat(),
                        lng: location.lng(),
                        address: place.formatted_address
                    };

                    // Update hidden fields
                    document.getElementById('req-lat').value = location.lat();
                    document.getElementById('req-lng').value = location.lng();

                    // Calculate distance
                    calculateRouteDistance(location);
                }
            });

            console.log('✅ Form autocomplete initialized');
        }
    }

    // ============================================
    // TAB SWITCHING
    // ============================================
    function initTabs() {
        const tabs = document.querySelectorAll('.location-tab');
        
        tabs.forEach(function(tab) {
            tab.addEventListener('click', function() {
                const tabId = this.getAttribute('data-tab');
                switchToTab(tabId);
            });
        });

        console.log('✅ Tab switching initialized');
    }

    function switchToTab(tabId) {
        // Remove active from all tabs
        document.querySelectorAll('.location-tab').forEach(function(t) {
            t.classList.remove('active');
        });
        document.querySelectorAll('.tab-content').forEach(function(c) {
            c.classList.remove('active');
        });

        // Activate selected tab
        const selectedTab = document.querySelector('.location-tab[data-tab="' + tabId + '"]');
        const selectedContent = document.getElementById('tab-' + tabId);
        
        if (selectedTab) selectedTab.classList.add('active');
        if (selectedContent) selectedContent.classList.add('active');

        // Trigger map resize if map tab is selected
        if (tabId === 'map' && pickupMap) {
            setTimeout(function() {
                google.maps.event.trigger(pickupMap, 'resize');
                
                // Center on pickup marker if exists, otherwise shop
                if (pickupMarker) {
                    pickupMap.setCenter(pickupMarker.getPosition());
                    pickupMap.setZoom(14);
                } else {
                    pickupMap.setCenter({ lat: SHOP_CONFIG.lat, lng: SHOP_CONFIG.lng });
                }
            }, 100);
        }
    }

    // ============================================
    // GPS BUTTON
    // ============================================
    function initGPSButton() {
        const gpsBtn = document.getElementById('get-location-btn');
        
        if (!gpsBtn) return;

        gpsBtn.addEventListener('click', function() {
            const btn = this;
            const originalText = btn.textContent;

            if (!navigator.geolocation) {
                alert('Geolocation is not supported by your browser');
                return;
            }

            btn.innerHTML = '<span class="loading-spinner"></span>Getting location...';
            btn.disabled = true;

            navigator.geolocation.getCurrentPosition(
                function(position) {
                    const location = new google.maps.LatLng(
                        position.coords.latitude,
                        position.coords.longitude
                    );

                    // Switch to map tab and place marker
                    switchToTab('map');

                    setTimeout(function() {
                        pickupMap.setCenter(location);
                        pickupMap.setZoom(15);
                        placePickupMarker(location);
                    }, 200);

                    btn.textContent = originalText;
                    btn.disabled = false;
                },
                function(error) {
                    let message = 'Unable to get your location. ';
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            message += 'Please allow location access in your browser settings.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            message += 'Location information is unavailable.';
                            break;
                        case error.TIMEOUT:
                            message += 'The request timed out.';
                            break;
                    }
                    alert(message);
                    btn.textContent = originalText;
                    btn.disabled = false;
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });

        console.log('✅ GPS button initialized');
    }

    // ============================================
    // PLACE PICKUP MARKER
    // ============================================
    function placePickupMarker(location, address) {
        // Remove existing pickup marker
        if (pickupMarker) {
            pickupMarker.setMap(null);
        }

        // Create new pickup marker
        pickupMarker = new google.maps.Marker({
            position: location,
            map: pickupMap,
            title: 'Your Vehicle Location',
            icon: getPickupMarkerIcon(),
            animation: google.maps.Animation.DROP,
            draggable: true
        });

        // Allow dragging the marker
        pickupMarker.addListener('dragend', function(event) {
            calculateRouteDistance(event.latLng);
            reverseGeocode(event.latLng);
        });

        // Calculate distance and get address
        calculateRouteDistance(location);

        if (!address) {
            reverseGeocode(location);
        } else {
            updateLocationDisplay(address);
        }
    }

    // ============================================
    // REVERSE GEOCODE
    // ============================================
    function reverseGeocode(location) {
        const geocoder = new google.maps.Geocoder();
        
        geocoder.geocode({ location: location }, function(results, status) {
            if (status === 'OK' && results[0]) {
                const address = results[0].formatted_address;
                selectedLocation = {
                    lat: location.lat(),
                    lng: location.lng(),
                    address: address
                };
                updateLocationDisplay(address);
            }
        });
    }

    // ============================================
    // UPDATE LOCATION DISPLAY
    // ============================================
    function updateLocationDisplay(address) {
        const displayEl = document.getElementById('selected-location-display');
        const addressText = document.getElementById('selected-address-text');

        if (addressText) addressText.textContent = address;
        if (displayEl) displayEl.classList.add('show');

        // Update form fields
        const pickupAddressInput = document.getElementById('pickup-address');
        const reqLocationInput = document.getElementById('req-location');
        
        if (pickupAddressInput) pickupAddressInput.value = address;
        if (reqLocationInput) reqLocationInput.value = address;

        if (selectedLocation) {
            const reqLat = document.getElementById('req-lat');
            const reqLng = document.getElementById('req-lng');
            
            if (reqLat) reqLat.value = selectedLocation.lat;
            if (reqLng) reqLng.value = selectedLocation.lng;
        }
    }

    // ============================================
    // CALCULATE ROUTE DISTANCE
    // ============================================
    function calculateRouteDistance(destination) {
        const shopLocation = new google.maps.LatLng(SHOP_CONFIG.lat, SHOP_CONFIG.lng);

        const request = {
            origin: destination,
            destination: shopLocation,
            travelMode: google.maps.TravelMode.DRIVING
        };

        directionsService.route(request, function(result, status) {
            if (status === 'OK') {
                // Show route on map
                directionsRenderer.setDirections(result);

                // Get distance and duration
                const route = result.routes[0].legs[0];
                const distanceKm = route.distance.value / 1000;
                const duration = route.duration.text;

                // Calculate cost
                const costResult = calculateCost(distanceKm);
                calculatedDistance = distanceKm;
                calculatedCost = costResult.cost;

                // Update display
                updateDistanceDisplay(distanceKm, duration, costResult.cost);
                updateFormFields(distanceKm, costResult.cost);
            } else {
                console.error('Directions request failed:', status);
                
                // Fallback to straight-line distance
                const straightLineDistance = calculateStraightLineDistance(
                    destination.lat(), destination.lng(),
                    SHOP_CONFIG.lat, SHOP_CONFIG.lng
                );
                
                const costResult = calculateCost(straightLineDistance);
                calculatedDistance = straightLineDistance;
                calculatedCost = costResult.cost;

                updateDistanceDisplay(straightLineDistance, null, costResult.cost);
                updateFormFields(straightLineDistance, costResult.cost);
            }
        });
    }

    // ============================================
    // CALCULATE STRAIGHT LINE DISTANCE (Fallback)
    // ============================================
    function calculateStraightLineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // ============================================
    // CALCULATE COST
    // ============================================
    function calculateCost(distance) {
        let cost = PRICING.baseRate;
        let breakdown = {
            base: PRICING.baseRate,
            extra: 0,
            extraKm: 0
        };

        if (distance > PRICING.baseDistance) {
            const extraKm = distance - PRICING.baseDistance;
            const extraCost = extraKm * PRICING.perKmRate;
            cost = PRICING.baseRate + extraCost;
            breakdown.extra = extraCost;
            breakdown.extraKm = extraKm;
        }

        return { cost: cost, breakdown: breakdown };
    }

    // ============================================
    // UPDATE DISTANCE DISPLAY
    // ============================================
    function updateDistanceDisplay(distance, duration, cost) {
        const displayEl = document.getElementById('distance-display');
        const distanceValue = document.getElementById('distance-value');
        const costValue = document.getElementById('cost-value');
        const routeInfo = document.getElementById('route-info');

        if (distanceValue) distanceValue.textContent = distance.toFixed(1) + ' KM';
        if (costValue) costValue.textContent = 'Estimated Cost: $' + cost.toFixed(2);

        if (routeInfo) {
            if (duration) {
                routeInfo.innerHTML = '🚗 Driving distance to our shop • Est. ' + duration;
            } else {
                routeInfo.innerHTML = '📍 Approximate distance to our shop';
            }
        }

        if (displayEl) {
            displayEl.classList.add('show');
            displayEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    // ============================================
    // UPDATE FORM FIELDS
    // ============================================
    function updateFormFields(distance, cost) {
        const reqDistance = document.getElementById('req-distance');
        const reqCost = document.getElementById('req-cost');
        const reqDistanceDisplay = document.getElementById('req-distance-display');
        const costPreview = document.getElementById('form-cost-preview');
        const costAmount = document.getElementById('form-cost-amount');

        if (reqDistance) reqDistance.value = distance.toFixed(2);
        if (reqCost) reqCost.value = cost.toFixed(2);
        if (reqDistanceDisplay) reqDistanceDisplay.value = distance.toFixed(1) + ' km';

        if (costAmount) costAmount.textContent = '$' + cost.toFixed(2);
        if (costPreview) costPreview.classList.add('show');
    }

    // ============================================
    // TOWING FORM HANDLER
    // ============================================
    function initTowingFormHandler() {
        const form = document.getElementById('towingRequestForm');
        
        if (!form) return;

        form.addEventListener('submit', function(e) {
            e.preventDefault();

            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn ? submitBtn.textContent : '';

            // Get form data
            const formData = new FormData(form);

            // Validate location
            if (!formData.get('location') || formData.get('location').trim() === '') {
                alert('Please enter or select a vehicle location');
                return;
            }

            const distance = parseFloat(formData.get('distance')) || calculatedDistance || 0;
            const cost = parseFloat(formData.get('estimatedCost')) || calculatedCost || calculateCost(distance).cost;

            const data = {
                name: formData.get('name'),
                phone: formData.get('phone'),
                email: formData.get('email') || '',
                service: 'Towing Service',
                location: formData.get('location'),
                latitude: formData.get('latitude') || '',
                longitude: formData.get('longitude') || '',
                distance: distance,
                vehicleType: formData.get('vehicleType'),
                issue: formData.get('issue') || '',
                urgent: formData.get('urgent') ? 'Yes' : 'No',
                estimatedCost: cost.toFixed(2),
                message: 'Towing Request:\n' +
                    'Location: ' + formData.get('location') + '\n' +
                    'Coordinates: ' + formData.get('latitude') + ', ' + formData.get('longitude') + '\n' +
                    'Distance: ' + distance.toFixed(1) + ' km\n' +
                    'Vehicle: ' + formData.get('vehicleType') + '\n' +
                    'Estimated Cost: $' + cost.toFixed(2) + '\n' +
                    'Issue: ' + (formData.get('issue') || 'Not specified') + '\n' +
                    'Urgent: ' + (formData.get('urgent') ? 'YES' : 'No'),
                preferredDate: new Date().toISOString()
            };

            // Check honeypot
            if (formData.get('website')) {
                console.log('Spam detected');
                return false;
            }

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="loading-spinner"></span>Submitting...';
            }

            fetch(API_URL + '/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })
            .then(function(response) {
                return response.json().then(function(result) {
                    return { ok: response.ok, result: result };
                });
            })
            .then(function(response) {
                if (response.ok) {
                    showSuccessModal(distance, cost, data.phone);
                    resetForm(form);
                } else {
                    alert('❌ ' + (response.result.error || 'Failed to submit request. Please try again.'));
                }
            })
            .catch(function(error) {
                console.error('Error:', error);
                alert('❌ Connection error. Please call us directly at ' + SHOP_CONFIG.phone);
            })
            .finally(function() {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            });
        });

        console.log('✅ Towing form handler initialized');
    }

    // ============================================
    // SUCCESS MODAL
    // ============================================
    function showSuccessModal(distance, cost, phone) {
        const modal = document.createElement('div');
        modal.style.cssText =
            'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);' +
            'background:white;padding:30px 40px;border-radius:12px;' +
            'box-shadow:0 10px 40px rgba(0,0,0,0.3);z-index:10000;' +
            'max-width:400px;text-align:center;';

        modal.innerHTML =
            '<div style="font-size:48px;margin-bottom:15px;">✅</div>' +
            '<div style="font-size:18px;font-weight:600;color:#155724;margin-bottom:10px;">Towing Request Received!</div>' +
            '<div style="font-size:14px;color:#333;margin-bottom:5px;">Distance: <strong>' + distance.toFixed(1) + ' km</strong></div>' +
            '<div style="font-size:14px;color:#333;margin-bottom:10px;">Estimated Cost: <strong>$' + cost.toFixed(2) + '</strong></div>' +
            '<div style="font-size:14px;color:#333;margin-bottom:20px;">We will contact you shortly at ' + phone + '</div>' +
            '<button onclick="this.parentElement.remove();document.getElementById(\'towing-overlay\').remove();" ' +
            'style="background:#e0242a;color:white;border:none;padding:10px 25px;' +
            'border-radius:5px;cursor:pointer;font-size:14px;font-weight:600;">OK</button>';

        const overlay = document.createElement('div');
        overlay.id = 'towing-overlay';
        overlay.style.cssText =
            'position:fixed;top:0;left:0;right:0;bottom:0;' +
            'background:rgba(0,0,0,0.5);z-index:9999;';

        document.body.appendChild(overlay);
        document.body.appendChild(modal);
    }

    // ============================================
    // RESET FORM
    // ============================================
    function resetForm(form) {
        form.reset();

        // Reset displays
        const selectedLocationDisplay = document.getElementById('selected-location-display');
        const distanceDisplay = document.getElementById('distance-display');
        const costPreview = document.getElementById('form-cost-preview');
        const reqDistanceDisplay = document.getElementById('req-distance-display');

        if (selectedLocationDisplay) selectedLocationDisplay.classList.remove('show');
        if (distanceDisplay) distanceDisplay.classList.remove('show');
        if (costPreview) costPreview.classList.remove('show');
        if (reqDistanceDisplay) reqDistanceDisplay.value = '';

        // Remove pickup marker
        if (pickupMarker) {
            pickupMarker.setMap(null);
            pickupMarker = null;
        }

        // Clear directions
        if (directionsRenderer) {
            directionsRenderer.setDirections({ routes: [] });
        }

        // Reset variables
        selectedLocation = null;
        calculatedDistance = null;
        calculatedCost = null;
    }

    // ============================================
    // MARKER ICONS
    // ============================================
    function getShopMarkerIcon() {
        return {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
                '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">' +
                '<circle cx="20" cy="20" r="18" fill="#e0242a" stroke="white" stroke-width="3"/>' +
                '<text x="20" y="26" text-anchor="middle" fill="white" font-size="16" font-weight="bold">🔧</text>' +
                '</svg>'
            ),
            scaledSize: new google.maps.Size(40, 40)
        };
    }

    function getPickupMarkerIcon() {
        return {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
                '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">' +
                '<circle cx="20" cy="20" r="18" fill="#2563eb" stroke="white" stroke-width="3"/>' +
                '<text x="20" y="26" text-anchor="middle" fill="white" font-size="16" font-weight="bold">🚗</text>' +
                '</svg>'
            ),
            scaledSize: new google.maps.Size(40, 40)
        };
    }

    function getShopInfoWindowContent() {
        return '<div style="padding: 10px; max-width: 250px;">' +
            '<h3 style="margin: 0 0 8px 0; color: #e0242a;">' + SHOP_CONFIG.name + '</h3>' +
            '<p style="margin: 0; font-size: 14px; color: #333;">' + SHOP_CONFIG.address + '</p>' +
            '<a href="tel:' + SHOP_CONFIG.phone + '" style="display: inline-block; margin-top: 10px; color: #e0242a; font-weight: 600;">' +
            '📞 ' + SHOP_CONFIG.phone +
            '</a>' +
            '</div>';
    }

    // ============================================
    // MAP STYLES
    // ============================================
    function getMapStyles() {
        return [
            {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]
            },
            {
                featureType: 'transit',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]
            }
        ];
    }

    // ============================================
    // EXPOSE CONFIG FOR DEBUGGING
    // ============================================
    window.TOWING_CONFIG = {
        shop: SHOP_CONFIG,
        pricing: PRICING
    };

    console.log('✅ towing.js ready - waiting for Google Maps API');

})();