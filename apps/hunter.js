document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const compassRose = document.getElementById('compassRose');
    const currentDirection = document.getElementById('currentDirection');
    const spinnerWheel = document.getElementById('spinnerWheel');
    const spinnerContainer = document.getElementById('spinnerContainer');
    const selectedDistance = document.getElementById('selectedDistance');
    const markButton = document.getElementById('markButton');
    const resetButton = document.getElementById('resetButton');
    const resultContainer = document.getElementById('resultContainer');
    const currentLocation = document.getElementById('currentLocation');
    const resultDirection = document.getElementById('resultDirection');
    const resultDistance = document.getElementById('resultDistance');
    const targetLocation = document.getElementById('targetLocation');
    const statusMessage = document.getElementById('statusMessage');
    const fullscreenButton = document.getElementById('fullscreenButton');
    
    // Fullscreen functionality
    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
            fullscreenButton.textContent = '⮽';
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                fullscreenButton.textContent = '⛶';
            }
        }
    }

    // Update fullscreen button when fullscreen state changes
    document.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement) {
            fullscreenButton.textContent = '⮽';
        } else {
            fullscreenButton.textContent = '⛶';
        }
    });

    fullscreenButton.addEventListener('click', toggleFullscreen);
    
    // App state
    let deviceOrientation = {
        absolute: false,
        alpha: 0,
        beta: 0,
        gamma: 0
    };
    let currentHeading = 0;
    let currentPosition = null;
    let selectedDistanceValue = 100;
    let compassAvailable = false;
    let geoLocationAvailable = false;
    
    // Initialize spinner wheel
    function initSpinnerWheel() {
        // Clear existing items
        spinnerWheel.innerHTML = '';
        
        // Generate distance options from 5m to 500m
        for (let i = 5; i <= 500; i += 5) {
            const item = document.createElement('div');
            item.className = 'spinner-item';
            item.textContent = i;
            item.dataset.value = i;
            spinnerWheel.appendChild(item);
        }
        
        // Set initial position
        updateSpinnerPosition(selectedDistanceValue);
    }
    
    // Update spinner position based on selected value
    function updateSpinnerPosition(value) {
        const items = Array.from(spinnerWheel.children);
        const itemHeight = 40; // Same as in CSS
        const index = items.findIndex(item => parseInt(item.dataset.value) === value);
        
        if (index !== -1) {
            const centerOffset = (spinnerContainer.clientHeight - itemHeight) / 2;
            const y = -(index * itemHeight) + centerOffset;
            spinnerWheel.style.transform = `translateY(${y}px)`;
            selectedDistance.textContent = value;
            selectedDistanceValue = value;
        }
    }
    
    // Initialize spinner touch/mouse controls
    function initSpinnerControls() {
        let startY = 0;
        let currentY = 0;
        let initialOffset = 0;
        
        spinnerContainer.addEventListener('mousedown', startDrag);
        spinnerContainer.addEventListener('touchstart', startDrag, { passive: false });
        
        function startDrag(e) {
            e.preventDefault();
            startY = e.type === 'mousedown' ? e.clientY : e.touches[0].clientY;
            initialOffset = parseFloat(spinnerWheel.style.transform.replace('translateY(', '').replace('px)', '') || 0);
            
            document.addEventListener('mousemove', drag);
            document.addEventListener('touchmove', drag, { passive: false });
            document.addEventListener('mouseup', stopDrag);
            document.addEventListener('touchend', stopDrag);
        }
        
        function drag(e) {
            e.preventDefault();
            currentY = e.type === 'mousemove' ? e.clientY : e.touches[0].clientY;
            const deltaY = currentY - startY;
            let newOffset = initialOffset + deltaY;
            
            spinnerWheel.style.transform = `translateY(${newOffset}px)`;
        }
        
        function stopDrag() {
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('touchmove', drag);
            document.removeEventListener('mouseup', stopDrag);
            document.removeEventListener('touchend', stopDrag);
            
            // Find closest value
            const transform = spinnerWheel.style.transform;
            const currentOffset = parseFloat(transform.replace('translateY(', '').replace('px)', ''));
            const itemHeight = 40;
            const centerOffset = (spinnerContainer.clientHeight - itemHeight) / 2;
            
            // Calculate which item is closest to center
            const index = Math.round((centerOffset - currentOffset) / itemHeight);
            const items = Array.from(spinnerWheel.children);
            
            if (index >= 0 && index < items.length) {
                const value = parseInt(items[index].dataset.value);
                updateSpinnerPosition(value);
            }
        }
    }
    
    // Initialize device orientation and compass
    function initDeviceOrientation() {
        if (window.DeviceOrientationEvent) {
            // For iOS 13+ we need to request permission
            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                statusMessage.innerHTML = 'Bitte tippen Sie auf <span class="highlight">Standort markieren</span>, um Zugriff auf Orientierung zu erlauben';
                
                markButton.addEventListener('click', function requestOrientationAccess() {
                    DeviceOrientationEvent.requestPermission()
                        .then(permissionState => {
                            if (permissionState === 'granted') {
                                window.addEventListener('deviceorientationabsolute', handleOrientation, true);
                                window.addEventListener('deviceorientation', handleOrientation, true);
                                compassAvailable = true;
                                statusMessage.textContent = 'Orientierung verfügbar';
                                markButton.removeEventListener('click', requestOrientationAccess);
                                initGeolocation();
                            } else {
                                statusMessage.innerHTML = '<span class="highlight">Zugriff verweigert</span> - Simulation aktiv';
                                simulateCompass();
                            }
                        })
                        .catch(console.error);
                });
            } else {
                // Non-iOS or older iOS devices
                window.addEventListener('deviceorientationabsolute', handleOrientation, true);
                window.addEventListener('deviceorientation', handleOrientation, true);
                compassAvailable = true;
                statusMessage.textContent = 'Orientierung verfügbar';
                initGeolocation();
            }
        } else {
            statusMessage.innerHTML = '<span class="highlight">Kompass nicht verfügbar</span> - Simulation aktiv';
            simulateCompass();
        }
    }
    
    // Simulate compass for desktop testing
    function simulateCompass() {
        compassAvailable = true;
        
        // Allow manual rotation with mouse/touch on compass
        const compass = document.querySelector('.compass');
        let startAngle = 0;
        let currentAngle = 0;
        
        compass.addEventListener('mousedown', startRotate);
        compass.addEventListener('touchstart', startRotate, { passive: false });
        
        function startRotate(e) {
            e.preventDefault();
            const rect = compass.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            const x = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
            const y = e.type === 'mousedown' ? e.clientY : e.touches[0].clientY;
            
            startAngle = Math.atan2(y - centerY, x - centerX) * 180 / Math.PI;
            
            document.addEventListener('mousemove', rotate);
            document.addEventListener('touchmove', rotate, { passive: false });
            document.addEventListener('mouseup', stopRotate);
            document.addEventListener('touchend', stopRotate);
        }
        
        function rotate(e) {
            e.preventDefault();
            const rect = compass.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            const x = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
            const y = e.type === 'mousemove' ? e.clientY : e.touches[0].clientY;
            
            currentAngle = Math.atan2(y - centerY, x - centerX) * 180 / Math.PI;
            const rotation = currentAngle - startAngle;
            
            // Update simulated compass
            currentHeading = (currentHeading + rotation + 360) % 360;
            updateCompassDisplay(currentHeading);
            
            startAngle = currentAngle;
        }
        
        function stopRotate() {
            document.removeEventListener('mousemove', rotate);
            document.removeEventListener('touchmove', rotate);
            document.removeEventListener('mouseup', stopRotate);
            document.removeEventListener('touchend', stopRotate);
        }
        
        // Initialize geolocation
        initGeolocation();
    }
    
    // Handle device orientation changes
    function handleOrientation(event) {
        deviceOrientation = event;
        
        // Calculate compass heading
        let heading = null;
        
        // Try different methods to get the heading
        if (event.webkitCompassHeading) {
            // iOS devices
            heading = 360 - event.webkitCompassHeading;
        } else if (event.absolute && event.alpha !== null) {
            // Absolute orientation available
            heading = event.alpha;
        } else if (event.alpha !== null) {
            // Relative orientation
            heading = event.alpha;
        }
        
        if (heading !== null) {
            // Adjust for device orientation
            if (window.orientation) {
                switch (window.orientation) {
                    case 0:   break; // Portrait-primary
                    case 90:  heading = (heading + 90) % 360; break; // Landscape-primary
                    case -90: heading = (heading - 90 + 360) % 360; break; // Landscape-secondary
                    case 180: heading = (heading + 180) % 360; break; // Portrait-secondary
                }
            }
            
            // Normalize heading to 0-360
            heading = (heading + 360) % 360;
            
            currentHeading = heading;
            updateCompassDisplay(currentHeading);
        }
    }
    
    // Update compass display
    function updateCompassDisplay(heading) {
        // Rotate compass rose in opposite direction
        compassRose.style.transform = `rotate(${-heading}deg)`;
        
        // Display heading
        const displayHeading = Math.round(heading);
        currentDirection.textContent = displayHeading + '°';
    }
    
    // Initialize geolocation
    function initGeolocation() {
        if (navigator.geolocation) {
            const options = {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            };
            
            navigator.geolocation.watchPosition(
                handlePositionSuccess,
                handlePositionError,
                options
            );
            
            statusMessage.innerHTML = statusMessage.innerHTML + '<br>Standort wird ermittelt...';
        } else {
            statusMessage.innerHTML += '<br><span class="highlight">Standort nicht verfügbar</span> - Simulation aktiv';
            simulateGeolocation();
        }
    }
    
    // Handle successful geolocation
    function handlePositionSuccess(position) {
        currentPosition = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
        };
        
        geoLocationAvailable = true;
        
        // Update status
        statusMessage.textContent = `Bereit. GPS-Genauigkeit: ±${Math.round(currentPosition.accuracy)}m`;
        
        // Enable mark button
        markButton.disabled = false;
        
        // Update location display
        currentLocation.textContent = `${currentPosition.latitude.toFixed(6)}, ${currentPosition.longitude.toFixed(6)}`;
    }
    
    // Handle geolocation error
    function handlePositionError(error) {
        console.error('Geolocation error:', error);
        statusMessage.innerHTML = `<span class="highlight">Standortfehler:</span> ${error.message} - Simulation aktiv`;
        simulateGeolocation();
    }
    
    // Simulate geolocation for testing
    function simulateGeolocation() {
        // Simulate a position in Germany
        currentPosition = {
            latitude: 51.165691, // Example: Berlin
            longitude: 10.451526,
            accuracy: 10
        };
        
        geoLocationAvailable = true;
        
        // Update status
        statusMessage.textContent = 'Bereit (Simulierter Standort)';
        
        // Enable mark button
        markButton.disabled = false;
        
        // Update location display
        currentLocation.textContent = `${currentPosition.latitude.toFixed(6)}, ${currentPosition.longitude.toFixed(6)}`;
    }
    
    // Calculate target position based on heading, distance and current position
    function calculateTargetPosition(startPos, heading, distance) {
        // Earth's radius in meters
        const R = 6371000;
        
        // Convert to radians
        const lat1 = startPos.latitude * Math.PI / 180;
        const lon1 = startPos.longitude * Math.PI / 180;
        const bearing = heading * Math.PI / 180;
        
        // Distance in km
        const distKm = distance / 1000;
        
        // Calculate new position
        const lat2 = Math.asin(
            Math.sin(lat1) * Math.cos(distKm / R) +
            Math.cos(lat1) * Math.sin(distKm / R) * Math.cos(bearing)
        );
        
        const lon2 = lon1 + Math.atan2(
            Math.sin(bearing) * Math.sin(distKm / R) * Math.cos(lat1),
            Math.cos(distKm / R) - Math.sin(lat1) * Math.sin(lat2)
        );
        
        // Convert back to degrees
        return {
            latitude: lat2 * 180 / Math.PI,
            longitude: lon2 * 180 / Math.PI
        };
    }
    
    // Mark button click handler
    markButton.addEventListener('click', function() {
        if (compassAvailable && geoLocationAvailable) {
            // Calculate target position
            const target = calculateTargetPosition(
                currentPosition,
                currentHeading,
                selectedDistanceValue
            );
            
            // Update result display
            resultDirection.textContent = Math.round(currentHeading) + '°';
            resultDistance.textContent = selectedDistanceValue;
            targetLocation.textContent = `${target.latitude.toFixed(6)}, ${target.longitude.toFixed(6)}`;
            
            // Show result container
            resultContainer.style.display = 'block';
            
            // Update status
            statusMessage.textContent = 'Position markiert!';
        }
    });
    
    // Reset button click handler
    resetButton.addEventListener('click', function() {
        // Hide result container
        resultContainer.style.display = 'none';
        
        // Update status
        statusMessage.textContent = 'Bereit für neue Markierung';
    });
    
    // Initialize app
    function initApp() {
        initSpinnerWheel();
        initSpinnerControls();
        initDeviceOrientation();
        
        // Disable mark button initially
        markButton.disabled = true;
    }
    
    // Start the app
    initApp();
}); 