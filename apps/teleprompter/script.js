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

    // Player State
    let currentSpeed = DEFAULT_SPEED;
    let currentFontSize = DEFAULT_FONT_SIZE;
    let isPlaying = false;
    let animationFrameId = null;

    // --- Funktionen ---

    function saveText() {
        const textToSave = textInput.value;
        localStorage.setItem(LOCAL_STORAGE_KEY, textToSave);
        saveButton.textContent = 'Gespeichert!';
        saveButton.disabled = true;
        setTimeout(() => {
            saveButton.innerHTML = '<i class="ph ph-floppy-disk"></i> Speichern';
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
        
        // Aktualisiere die Anzeigen
        updateSpeed(0);
        updateFontSize(0);
        
        // Setze den Text und scroll zurück
        prompterDisplay.textContent = text;
        prompterDisplay.scrollTop = 0;

        // Aktualisiere Icons
        playPauseIcon.classList.remove('ph-pause');
        playPauseIcon.classList.add('ph-play');
        fullscreenIcon.classList.remove('ph-arrows-in');
        fullscreenIcon.classList.add('ph-arrows-out');

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
     * Wird wiederholt durch requestAnimationFrame aufgerufen.
     */
    function scrollText() {
        // Berechnung der Scroll-Distanz für diesen Frame
        // Die Formel (currentSpeed * 0.X) muss evtl. angepasst werden für angenehme Geschwindigkeit
        const scrollAmount = currentSpeed * 0.25; // Kleinere Schritte pro Frame

        prompterDisplay.scrollTop += scrollAmount;

        // Prüfen, ob das Ende erreicht ist
        // Kleine Toleranz eingebaut (>= -1), um Rundungsfehler abzufangen
        const remainingScroll = prompterDisplay.scrollHeight - prompterDisplay.clientHeight - prompterDisplay.scrollTop;
        if (remainingScroll <= 1) { // Ende erreicht oder fast erreicht
             console.log("Ende erreicht");
             stopScrolling(); // Stoppt Animation und setzt Button zurück
        } else if (isPlaying) {
            // Nur weitermachen, wenn wir noch im Play-Status sind
            animationFrameId = requestAnimationFrame(scrollText);
        }
    }

    /**
     * Startet die Scroll-Animation.
     */
    function startScrolling() {
        if (isPlaying) return; // Nicht starten, wenn schon läuft

         // Prüfen, ob wir schon am Ende sind, bevor wir starten
        const remainingScroll = prompterDisplay.scrollHeight - prompterDisplay.clientHeight - prompterDisplay.scrollTop;
         if (remainingScroll <= 1) {
            console.log("Bereits am Ende, nicht starten.");
            return;
         }

        isPlaying = true;
        playPauseIcon.classList.remove('ph-play');
        playPauseIcon.classList.add('ph-pause');
        console.log("Starte Scrolling");
        animationFrameId = requestAnimationFrame(scrollText); // Starte die Schleife
    }

    /**
     * Stoppt die Scroll-Animation.
     */
    function stopScrolling() {
        if (!isPlaying && animationFrameId === null) return; // Nicht stoppen, wenn nicht läuft

        isPlaying = false;
        playPauseIcon.classList.remove('ph-pause');
        playPauseIcon.classList.add('ph-play');
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId); // Stoppe die Schleife
            animationFrameId = null;
        }
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