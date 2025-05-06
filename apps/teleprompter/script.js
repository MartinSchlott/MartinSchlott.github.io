'use strict';

document.addEventListener('DOMContentLoaded', () => {

    // --- DOM-Elemente auswählen ---
    const body = document.body;
    const mainElement = document.querySelector('main');
    const editMode = document.getElementById('edit-mode');
    const playMode = document.getElementById('play-mode');
    const textInput = document.getElementById('text-input');
    const loadButton = document.getElementById('load-button');
    const saveButton = document.getElementById('save-button');
    const startButton = document.getElementById('start-button');
    const prompterDisplay = document.getElementById('prompter-display');
    const controlsPanel = document.getElementById('controls-panel');
    const editButton = document.getElementById('edit-button');
    const speedDownButton = document.getElementById('speed-down-button');
    const speedDisplay = document.getElementById('speed-display');
    const speedUpButton = document.getElementById('speed-up-button');
    const playPauseButton = document.getElementById('play-pause-button');
    const playPauseIcon = document.getElementById('play-pause-icon');
    const fontDownButton = document.getElementById('font-down-button');
    const fontDisplay = document.getElementById('font-display');
    const fontUpButton = document.getElementById('font-up-button');
    const fullscreenButton = document.getElementById('fullscreen-button');
    const fullscreenIcon = document.getElementById('fullscreen-icon');

    // --- Konstanten und State ---
    const LOCAL_STORAGE_KEY = 'teleprompterText';
    const DEFAULT_SPEED = 5;
    const MIN_SPEED = 1;
    const MAX_SPEED = 10;
    const DEFAULT_FONT_SIZE = 24; // in px
    const MIN_FONT_SIZE = 12;
    const MAX_FONT_SIZE = 72;
    const FONT_SIZE_STEP = 2; // Schrittweite für Schriftgrößenänderung
    const MANUAL_SCROLL_AMOUNT = 100; // Pixelwert für manuelles Scrollen (Links/Rechts Pfeiltasten)
    const BASE_SPEED_MS = 30; // Millisekunden zwischen Updates bei Geschwindigkeit 5
    
    // Lookup-Tabelle für Scrollgeschwindigkeiten in Pixel pro Sekunde
    const SPEED_TABLE = {
        1: 5,    // Sehr langsam: 5px/Sekunde
        2: 10,   // 10px/Sekunde
        3: 20,   // 20px/Sekunde
        4: 35,   // 35px/Sekunde
        5: 55,   // 55px/Sekunde
        6: 85,   // 85px/Sekunde
        7: 130,  // 130px/Sekunde
        8: 190,  // 190px/Sekunde
        9: 270,  // 270px/Sekunde
        10: 400  // Sehr schnell: 400px/Sekunde
    };

    // Player State
    let currentSpeed = DEFAULT_SPEED;
    let currentFontSize = DEFAULT_FONT_SIZE;
    let isPlaying = false;
    let animationFrameId = null;
    let isPanelVisible = true; // State für Sichtbarkeit des Control Panels
    let scrollPosition = 0; // Aktuelle Scroll-Position in Pixeln
    let lastTimestamp = 0; // Letzter Zeitstempel für Animation

    // --- Funktionen ---

    function saveText() {
        const textToSave = textInput.value;
        localStorage.setItem(LOCAL_STORAGE_KEY, textToSave);
        saveButton.textContent = 'Gespeichert!';
        saveButton.disabled = true;
        setTimeout(() => {
            saveButton.innerHTML = '<i class="fas fa-save icon-save"></i> Speichern';
            saveButton.disabled = false;
        }, 1500);
        console.log('Text gespeichert.');
    }

    function loadText() {
        const savedText = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedText !== null) {
            textInput.value = savedText;
            console.log('Text geladen.');
        } else {
            console.log('Kein gespeicherter Text gefunden.');
        }
    }

    function showEditMode() {
        if (isPlaying) {
            stopScrolling(); // Wichtig: Scrolling stoppen beim Verlassen
        }
        // Vollbild verlassen, wenn aktiv
        if (document.fullscreenElement) {
            exitFullscreen();
        }
        playMode.classList.add('hidden');
        controlsPanel.classList.add('controls-hidden');
        editMode.classList.remove('hidden');
        body.classList.remove('play-active');
        mainElement.classList.remove('play-active');
        console.log("Wechsle zu Edit-Modus");
    }

    function showPlayMode() {
        const text = textInput.value;
        if (text.trim() === '') {
            alert('Bitte gib zuerst Text in das Feld ein.');
            return;
        }
        
        // Setze State und Anzeige zurück
        isPlaying = false;
        currentSpeed = DEFAULT_SPEED;
        currentFontSize = DEFAULT_FONT_SIZE;
        isPanelVisible = true;
        scrollPosition = 0;
        
        // Aktualisiere die Anzeigen
        updateSpeed(0);
        updateFontSize(0);
        
        // Setze den Text und scroll zurück
        prompterDisplay.textContent = text;
        prompterDisplay.scrollTop = 0;

        // Aktualisiere Icons
        playPauseIcon.classList.remove('fa-pause');
        playPauseIcon.classList.add('fa-play');
        playPauseIcon.classList.remove('icon-pause');
        playPauseIcon.classList.add('icon-play');
        
        fullscreenIcon.classList.remove('fa-compress');
        fullscreenIcon.classList.add('fa-expand');
        fullscreenIcon.classList.remove('icon-exit-fullscreen');
        fullscreenIcon.classList.add('icon-fullscreen');

        // Wechsle die Modi
        editMode.classList.add('hidden');
        playMode.classList.remove('hidden');
        controlsPanel.classList.remove('controls-hidden');
        
        // Aktiviere den Play-Modus
        body.classList.add('play-active');
        mainElement.classList.add('play-active');

        console.log("Wechsle zu Play-Modus");
    }

    // --- Player Kernfunktionen ---

    /**
     * Die Hauptfunktion für die Scroll-Animation.
     * Verwendet requestAnimationFrame und berechnet Positionen basierend auf verstrichener Zeit.
     * @param {number} timestamp - Vom Browser bereitgestellter Zeitstempel
     */
    function scrollText(timestamp) {
        if (!isPlaying) return;
        
        // Wenn es der erste Frame ist, Zeitstempel merken und nächsten Frame anfordern
        if (!lastTimestamp) {
            lastTimestamp = timestamp;
            animationFrameId = requestAnimationFrame(scrollText);
            return;
        }
        
        // Zeit seit letztem Frame berechnen (in Sekunden)
        const deltaTime = (timestamp - lastTimestamp) / 1000;
        lastTimestamp = timestamp;
        
        // Scroll-Distanz für diesen Frame basierend auf verstrichener Zeit und Geschwindigkeit
        const pixelsPerSecond = SPEED_TABLE[currentSpeed];
        const scrollAmount = pixelsPerSecond * deltaTime;
        
        // Neue Position berechnen
        scrollPosition += scrollAmount;
        
        // Begrenzen auf die Maximalhöhe des Inhalts
        const maxScroll = prompterDisplay.scrollHeight - prompterDisplay.clientHeight;
        
        // Prüfen, ob das Ende erreicht ist
        if (scrollPosition >= maxScroll) {
            scrollPosition = maxScroll;
            prompterDisplay.scrollTop = scrollPosition;
            console.log("Ende erreicht");
            stopScrolling();
            return;
        }
        
        // Scrollposition anwenden (Math.floor für Browsers, die keine Subpixel-Scrolling unterstützen)
        prompterDisplay.scrollTop = Math.floor(scrollPosition);
        
        // Nächsten Frame anfordern
        animationFrameId = requestAnimationFrame(scrollText);
    }

    /**
     * Startet die Scroll-Animation.
     */
    function startScrolling() {
        if (isPlaying) return; // Nicht starten, wenn schon läuft
        
        // Aktuelle Scroll-Position erfassen
        scrollPosition = prompterDisplay.scrollTop;
        
        // Prüfen, ob wir schon am Ende sind, bevor wir starten
        const maxScroll = prompterDisplay.scrollHeight - prompterDisplay.clientHeight;
        if (scrollPosition >= maxScroll) {
            console.log("Bereits am Ende, nicht starten.");
            return;
        }

        isPlaying = true;
        lastTimestamp = 0; // Zeitstempel zurücksetzen
        
        playPauseIcon.classList.remove('fa-play');
        playPauseIcon.classList.add('fa-pause');
        playPauseIcon.classList.remove('icon-play');
        playPauseIcon.classList.add('icon-pause');
        
        console.log("Starte Scrolling");
        animationFrameId = requestAnimationFrame(scrollText); // Starte die Schleife
    }

    /**
     * Stoppt die Scroll-Animation.
     */
    function stopScrolling() {
        if (!isPlaying && animationFrameId === null) return; // Nicht stoppen, wenn nicht läuft

        isPlaying = false;
        lastTimestamp = 0; // Zeitstempel zurücksetzen
        
        playPauseIcon.classList.remove('fa-pause');
        playPauseIcon.classList.add('fa-play');
        playPauseIcon.classList.remove('icon-pause');
        playPauseIcon.classList.add('icon-play');
        
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId); // Stoppe die Schleife
            animationFrameId = null;
        }
        
        // Aktuelle Scrollposition sichern
        scrollPosition = prompterDisplay.scrollTop;
        
        console.log("Stoppe Scrolling");
    }

    /**
     * Schaltet zwischen Play und Pause um.
     */
    function togglePlayPause() {
        if (isPlaying) {
            stopScrolling();
        } else {
            startScrolling();
        }
    }

    /**
     * Aktualisiert die Geschwindigkeit.
     * @param {number} delta - Änderung (+1 oder -1)
     */
    function updateSpeed(delta) {
        const newSpeed = currentSpeed + delta;
        // Clamp speed between MIN and MAX
        currentSpeed = Math.max(MIN_SPEED, Math.min(newSpeed, MAX_SPEED));
        speedDisplay.textContent = currentSpeed.toString();
        console.log("Geschwindigkeit auf", currentSpeed, "gesetzt");
    }

    /**
     * Aktualisiert die Schriftgröße.
     * @param {number} delta - Änderung (+FONT_SIZE_STEP oder -FONT_SIZE_STEP)
     */
    function updateFontSize(delta) {
        const newSize = currentFontSize + delta;
         // Clamp font size between MIN and MAX
        currentFontSize = Math.max(MIN_FONT_SIZE, Math.min(newSize, MAX_FONT_SIZE));
        prompterDisplay.style.fontSize = `${currentFontSize}px`;
        fontDisplay.textContent = `${currentFontSize}px`;
        console.log("Schriftgröße auf", currentFontSize, "px gesetzt");
    }

    /**
     * Manuelles Scrollen (für Links/Rechts Pfeiltasten)
     * @param {number} amount - Zu scrollende Menge (positiv=runter, negativ=hoch)
     */
    function manualScroll(amount) {
        // Manuelles Scrollen sollte das automatische Scrollen NICHT stoppen
        
        // Aktuelle Position aktualisieren (falls Animation läuft)
        if (isPlaying) {
            scrollPosition = prompterDisplay.scrollTop;
        }
        
        // Neue Position berechnen
        scrollPosition += amount;
        
        // Grenzen prüfen
        const maxScroll = prompterDisplay.scrollHeight - prompterDisplay.clientHeight;
        scrollPosition = Math.max(0, Math.min(scrollPosition, maxScroll));
        
        // Anwenden
        prompterDisplay.scrollTop = scrollPosition;
    }

    /**
     * Umschalten der Panel-Sichtbarkeit
     */
    function toggleControlsPanel() {
        isPanelVisible = !isPanelVisible;
        
        if (isPanelVisible) {
            controlsPanel.classList.remove('controls-hidden');
        } else {
            controlsPanel.classList.add('controls-hidden');
        }
    }

    /**
     * Vollbildmodus einschalten
     */
    function enterFullscreen() {
        if (mainElement.requestFullscreen) {
            mainElement.requestFullscreen();
        } else if (mainElement.webkitRequestFullscreen) { /* Safari */
            mainElement.webkitRequestFullscreen();
        } else if (mainElement.msRequestFullscreen) { /* IE11 */
            mainElement.msRequestFullscreen();
        }
        
        // Icon aktualisieren
        fullscreenIcon.classList.remove('fa-expand');
        fullscreenIcon.classList.add('fa-compress');
        fullscreenIcon.classList.remove('icon-fullscreen');
        fullscreenIcon.classList.add('icon-exit-fullscreen');
    }

    /**
     * Vollbildmodus ausschalten
     */
    function exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) { /* Safari */
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { /* IE11 */
            document.msExitFullscreen();
        }
        
        // Icon aktualisieren
        fullscreenIcon.classList.remove('fa-compress');
        fullscreenIcon.classList.add('fa-expand');
        fullscreenIcon.classList.remove('icon-exit-fullscreen');
        fullscreenIcon.classList.add('icon-fullscreen');
    }

    /**
     * Umschalten des Vollbildmodus
     */
    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            enterFullscreen();
        } else {
            exitFullscreen();
        }
    }


    // --- Event Listeners ---
    startButton.addEventListener('click', showPlayMode);
    editButton.addEventListener('click', showEditMode);
    saveButton.addEventListener('click', saveText);
    loadButton.addEventListener('click', loadText);

    // Player Controls Listener
    playPauseButton.addEventListener('click', togglePlayPause);
    speedUpButton.addEventListener('click', () => updateSpeed(1));
    speedDownButton.addEventListener('click', () => updateSpeed(-1));
    fontUpButton.addEventListener('click', () => updateFontSize(FONT_SIZE_STEP));
    fontDownButton.addEventListener('click', () => updateFontSize(-FONT_SIZE_STEP));
    fullscreenButton.addEventListener('click', toggleFullscreen);

    // Listener für das Umschalten des Control Panels
    prompterDisplay.addEventListener('click', toggleControlsPanel);

    // Globaler Keyboard Listener für alle Tastenanschläge (verbesserte Version)
    document.addEventListener('keydown', function(event) {
        // Nur reagieren, wenn wir im Play-Modus sind
        if (playMode.classList.contains('hidden')) return;
        
        // Verhindern, dass Standard-Aktionen ausgeführt werden (wichtig für Pfeiltasten)
        if (['Enter', 'ArrowUp', 'ArrowDown', 'ArrowRight', 'ArrowLeft', 'f', 'F', 'Escape'].includes(event.key)) {
            event.preventDefault();
        }
        
        switch (event.key) {
            case 'Enter':
                togglePlayPause();
                break;
            case 'ArrowUp':
                updateSpeed(1);
                break;
            case 'ArrowDown':
                updateSpeed(-1);
                break;
            case 'ArrowRight':
                manualScroll(MANUAL_SCROLL_AMOUNT);
                break;
            case 'ArrowLeft':
                manualScroll(-MANUAL_SCROLL_AMOUNT);
                break;
            case 'f':
            case 'F':
                toggleFullscreen();
                break;
            case 'Escape':
                // Bei ESC, wenn im Vollbild, Vollbild verlassen, sonst zurück zum Editor
                if (document.fullscreenElement) {
                    exitFullscreen();
                } else {
                    showEditMode();
                }
                break;
        }
    });

    // Fullscreen Change Event Listener
    document.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement) {
            fullscreenIcon.classList.remove('fa-expand');
            fullscreenIcon.classList.add('fa-compress');
            fullscreenIcon.classList.remove('icon-fullscreen');
            fullscreenIcon.classList.add('icon-exit-fullscreen');
        } else {
            fullscreenIcon.classList.remove('fa-compress');
            fullscreenIcon.classList.add('fa-expand');
            fullscreenIcon.classList.remove('icon-exit-fullscreen');
            fullscreenIcon.classList.add('icon-fullscreen');
        }
    });

    // --- Initialisierung ---
    loadText();
    prompterDisplay.style.whiteSpace = 'pre-wrap'; // Sicherstellen für Zeilenumbrüche

    // Stelle sicher, dass PlayMode initial versteckt ist etc. (bereits vorhanden)
    if (!playMode.classList.contains('hidden')) {
        playMode.classList.add('hidden');
    }
     if (editMode.classList.contains('hidden')) {
        editMode.classList.remove('hidden');
    }


}); // Ende DOMContentLoaded