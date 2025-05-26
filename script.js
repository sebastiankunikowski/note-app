      tailwind.config = {
        darkMode: "class",
        theme: {
          extend: {
            colors: {
              // Light Theme (Material You Inspired)
              light: {
                primary: "#3b82f6", // Blue 600
                "primary-container": "#dbeafe", // Blue 100
                "on-primary-container": "#1e40af", // Blue 800
                secondary: "#4f46e5", // Indigo 600
                "secondary-container": "#e0e7ff", // Indigo 100
                "on-secondary-container": "#3730a3", // Indigo 800
                tertiary: "#059669", // Emerald 600
                "tertiary-container": "#a7f3d0", // Emerald 200
                "on-tertiary-container": "#065f46", // Emerald 700
                error: "#dc2626", // Red 600
                "error-container": "#fee2e2", // Red 100
                "on-error-container": "#991b1b", // Red 800
                background: "#f8fafc", // Slate 50
                "on-background": "#0f172a", // Slate 900
                surface: "#ffffff", // White
                "on-surface": "#1e293b", // Slate 800
                "surface-variant": "#e2e8f0", // Slate 200
                "on-surface-variant": "#475569", // Slate 600
                outline: "#cbd5e1", // Slate 300
              },
              // Dark Theme (Material You Inspired)
              dark: {
                primary: "#60a5fa", // Blue 400
                "primary-container": "#1e3a8a", // Blue 800 (adjust for container)
                "on-primary-container": "#bfdbfe", // Blue 200
                secondary: "#818cf8", // Indigo 400
                "secondary-container": "#3730a3", // Indigo 800
                "on-secondary-container": "#c7d2fe", // Indigo 200
                tertiary: "#34d399", // Emerald 400
                "tertiary-container": "#065f46", // Emerald 700
                "on-tertiary-container": "#a7f3d0", // Emerald 200
                error: "#f87171", // Red 400
                "error-container": "#7f1d1d", // Red 900
                "on-error-container": "#fecaca", // Red 200
                background: "#111827", // Gray 900 (cooler dark)
                "on-background": "#f3f4f6", // Gray 100
                surface: "#1f2937", // Gray 800
                "on-surface": "#d1d5db", // Gray 300
                "surface-variant": "#374151", // Gray 700
                "on-surface-variant": "#9ca3af", // Gray 400
                outline: "#4b5563", // Gray 600
              },
            },
            fontFamily: {
              sans: ["Inter", "sans-serif"],
            },
            boxShadow: {
              "m3-light":
                "0 1px 2px 0 rgba(0, 0, 0, 0.1), 0 1px 3px 0 rgba(0, 0, 0, 0.1)",
              "m3-dark":
                "0 1px 2px 0 rgba(0, 0, 0, 0.25), 0 1px 3px 0 rgba(0, 0, 0, 0.25)", // Darker, more subtle
            },
          },
        },
      };
      // Global variables
      let notes = [];
      let currentNote = null;
      let currentTags = new Set();
      let mediaRecorder = null;
      let audioChunks = [];
      let recordedAudioBlob = null;
      let recordingStartTime = 0;
      let recordingTimerInterval = null;
      let isDarkMode = false;

      // DOM Elements
      const noteModal = document.getElementById("note-modal");
      const confirmModal = document.getElementById("confirm-modal");
      const themeToggleButton = document.getElementById("theme-toggle");
      const themeToggleText = document.getElementById("theme-toggle-text");
      const favoriteCheckbox = document.getElementById("note-favorite");
      const colorButtons = document.querySelectorAll(
        "#note-color-options .color-option"
      );
      const fab = document.getElementById("fab");
      const fabMenu = document.getElementById("fab-menu");
      const fabIcon = fab.querySelector(".material-symbols-outlined");
      const fabDesktop = document.getElementById("fab-desktop");
      const fabMenuDesktop = document.getElementById("fab-menu-desktop");
      const fabIconDesktop = fabDesktop.querySelector(
        ".material-symbols-outlined"
      );

      const sidebar = document.getElementById("sidebar");
      const sidebarOverlay = document.getElementById("sidebar-overlay");

      // Initialize app
      document.addEventListener("DOMContentLoaded", async function () {
        loadPreferences();
        await initIndexedDB();
        await loadNotes();
        renderNotes();
        updateTagFilterUI();
        setupEventListeners();
        setupAutoSave();

        notes.forEach((note) => {
          if (note.reminderAt && note.reminderAt > Date.now()) {
            setReminder(note);
          }
        });
      });

      function toggleSidebar() {
        sidebar.classList.toggle("sidebar-open");
        sidebarOverlay.classList.toggle("hidden");
        // Optional: Prevent body scroll when sidebar is open on mobile
        // document.body.classList.toggle('overflow-hidden', sidebar.classList.contains('sidebar-open'));
      }

      // IndexedDB setup (version 2 for potential schema changes)
      let db;
      async function initIndexedDB() {
        return new Promise((resolve, reject) => {
          const request = indexedDB.open("NotesAppDB_M3", 2);
          request.onerror = (event) =>
            reject("Błąd IndexedDB: " + event.target.error);
          request.onsuccess = (event) => {
            db = event.target.result;
            resolve();
          };
          request.onupgradeneeded = (event) => {
            db = event.target.result;
            if (!db.objectStoreNames.contains("notes")) {
              const store = db.createObjectStore("notes", { keyPath: "id" });
              store.createIndex("type", "type", { unique: false });
              store.createIndex("createdAt", "createdAt", { unique: false });
              store.createIndex("tags", "tags", { multiEntry: true });
            }
          };
        });
      }

      // Database operations
      async function saveNoteToDb(note) {
        /* ... (same as before) ... */
        return new Promise((resolve, reject) => {
          if (!db) return reject("Baza danych nie jest zainicjalizowana.");
          const transaction = db.transaction(["notes"], "readwrite");
          const store = transaction.objectStore("notes");
          const request = store.put(note);
          request.onsuccess = () => resolve();
          request.onerror = (event) =>
            reject("Błąd zapisu do IndexedDB: " + event.target.error);
        });
      }
      async function loadNotesFromDb() {
        /* ... (same as before) ... */
        return new Promise((resolve, reject) => {
          if (!db) return reject("Baza danych nie jest zainicjalizowana.");
          const transaction = db.transaction(["notes"], "readonly");
          const store = transaction.objectStore("notes");
          const request = store.getAll();
          request.onsuccess = (event) => resolve(event.target.result);
          request.onerror = (event) =>
            reject("Błąd odczytu z IndexedDB: " + event.target.error);
        });
      }
      async function deleteNoteFromDb(id) {
        /* ... (same as before) ... */
        return new Promise((resolve, reject) => {
          if (!db) return reject("Baza danych nie jest zainicjalizowana.");
          const transaction = db.transaction(["notes"], "readwrite");
          const store = transaction.objectStore("notes");
          const request = store.delete(id);
          request.onsuccess = () => resolve();
          request.onerror = (event) =>
            reject("Błąd usuwania z IndexedDB: " + event.target.error);
        });
      }

      // Load notes
      async function loadNotes() {
        try {
          notes = await loadNotesFromDb();
          notes.sort((a, b) => b.createdAt - a.createdAt);
        } catch (error) {
          console.error("Błąd ładowania notatek:", error);
          showToast("Błąd podczas ładowania notatek", "error");
        }
      }

      // Render notes
      function renderNotes() {
        const container = document.getElementById("notes-container");
        const emptyState = document.getElementById("empty-state");
        const filteredNotes = filterNotes();

        if (filteredNotes.length === 0) {
          container.innerHTML = "";
          container.classList.remove(
            "sm:grid-cols-2",
            "lg:grid-cols-3",
            "xl:grid-cols-4"
          ); // Clear grid classes
          emptyState.classList.remove("hidden");
          emptyState.classList.add("flex");
        } else {
          emptyState.classList.add("hidden");
          emptyState.classList.remove("flex");
          container.classList.add(
            "sm:grid-cols-2",
            "lg:grid-cols-3",
            "xl:grid-cols-4"
          ); // Ensure grid classes are present
          container.innerHTML = filteredNotes
            .map((note) => createNoteCard(note))
            .join("");
        }
      }

      // Filter notes
      function filterNotes() {
        let filtered = [...notes];
        const searchTerm = document
          .getElementById("search-input")
          .value.toLowerCase();
        if (searchTerm) {
          filtered = filtered.filter(
            (note) =>
              note.title.toLowerCase().includes(searchTerm) ||
              (note.type === "text" &&
                note.content.toLowerCase().includes(searchTerm)) ||
              note.tags.some((tag) => tag.toLowerCase().includes(searchTerm))
          );
        }

        const activeTypeFilter = document.querySelector(
          ".filter-type-button.active-filter"
        );
        const typeFilterValue = activeTypeFilter
          ? activeTypeFilter.dataset.filter
          : "all";
        if (typeFilterValue !== "all") {
          filtered = filtered.filter((note) => note.type === typeFilterValue);
        }

        const selectedTags = Array.from(
          document.querySelectorAll(
            '#tag-filter input[type="checkbox"]:checked'
          )
        ).map((cb) => cb.value);
        if (selectedTags.length > 0) {
          filtered = filtered.filter((note) =>
            selectedTags.every((selTag) => note.tags.includes(selTag))
          );
        }
        return filtered;
      }

      // Create note card HTML
      function createNoteCard(note) {
        const date = new Date(note.createdAt).toLocaleDateString("pl-PL", {
          day: "numeric",
          month: "short",
        });

        const colorClass =
          note.color && note.color !== "default"
            ? `note-color-${note.color}`
            : "bg-light-surface dark:bg-dark-surface";

        const tagsHtml = note.tags
          .slice(0, 3)
          .map(
            (
              tag // Show max 3 tags
            ) =>
              `<span class="inline-block bg-light-tertiary-container dark:bg-dark-tertiary-container text-light-on-tertiary-container dark:text-dark-on-tertiary-container text-xs px-2.5 py-1 rounded-lg">${tag}</span>`
          )
          .join("");

        const favoriteIconHtml = note.isFavorite
          ? '<span class="material-symbols-outlined text-yellow-500 dark:text-yellow-400 text-lg fill absolute top-2 right-2">star</span>'
          : "";
        const noteTypeIcon = note.type === "text" ? "article" : "graphic_eq";

        return `
                <div class="${colorClass} rounded-2xl border border-light-outline dark:border-dark-outline p-4 md:p-5 flex flex-col justify-between cursor-pointer hover:shadow-m3-light dark:hover:shadow-m3-dark transition-shadow relative group"
                     onclick="openNote('${note.id}')">
                    ${favoriteIconHtml}
                    <div>
                        <h3 class="text-md font-medium text-light-on-surface dark:text-dark-on-surface mb-2 truncate pr-6">${
                          note.title || "Bez tytułu"
                        }</h3>
                        ${
                          note.type === "text"
                            ? `
                            <p class="text-sm text-light-on-surface-variant dark:text-dark-on-surface-variant mb-3 line-clamp-4">${
                              note.content || ""
                            }</p>
                        `
                            : `
                            <div class="flex items-center text-sm text-light-on-surface-variant dark:text-dark-on-surface-variant mb-3">
                                <span class="material-symbols-outlined mr-2 text-lg">${noteTypeIcon}</span> Nagranie głosowe
                            </div>
                        `
                        }
                    </div>
                    <div class="mt-auto">
                        ${
                          note.tags.length > 0
                            ? `<div class="mb-3 flex flex-wrap gap-1.5">${tagsHtml}</div>`
                            : ""
                        }
                        <div class="flex items-center justify-between text-xs text-light-on-surface-variant/80 dark:text-dark-on-surface-variant/80">
                            <span>${date}</span>
                            <div class="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onclick="event.stopPropagation(); editNote('${
                                  note.id
                                }')" 
                                        class="p-1.5 hover:bg-light-surface-variant dark:hover:bg-dark-surface-variant rounded-full">
                                    <span class="material-symbols-outlined text-lg">edit</span>
                                </button>
                                <button onclick="event.stopPropagation(); confirmDeleteNoteAction('${
                                  note.id
                                }')" 
                                        class="p-1.5 hover:bg-light-surface-variant dark:hover:bg-dark-surface-variant rounded-full">
                                    <span class="material-symbols-outlined text-lg">delete</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
      }

      // Event listeners
      function setupEventListeners() {
        // FAB and its menu
        const fabButtons = [fab, fabDesktop];
        const fabMenus = [fabMenu, fabMenuDesktop];
        const fabIcons = [fabIcon, fabIconDesktop];

        fabButtons.forEach((button, index) => {
          if (!button) return;
          button.addEventListener("click", (e) => {
            e.stopPropagation();
            fabMenus[index].classList.toggle("opacity-0");
            fabMenus[index].classList.toggle("scale-95");
            fabMenus[index].classList.toggle("pointer-events-none");
            fabIcons[index].classList.toggle("rotate-45");
          });
        });

        document.addEventListener("click", () => {
          // Close FAB menu on outside click
          fabMenus.forEach((menu, index) => {
            if (!menu.classList.contains("opacity-0")) {
              menu.classList.add(
                "opacity-0",
                "scale-95",
                "pointer-events-none"
              );
              fabIcons[index].classList.remove("rotate-45");
            }
          });
        });

        ["add-text-note-fab", "add-text-note-fab-desktop"].forEach((id) =>
          document
            .getElementById(id)
            ?.addEventListener("click", () => openNoteModal("text"))
        );
        ["add-voice-note-fab", "add-voice-note-fab-desktop"].forEach((id) =>
          document
            .getElementById(id)
            ?.addEventListener("click", () => openNoteModal("voice"))
        );

        document
          .getElementById("close-modal")
          .addEventListener("click", closeNoteModal);
        document
          .getElementById("cancel-note")
          .addEventListener("click", closeNoteModal);
        document
          .getElementById("save-note")
          .addEventListener("click", saveNote);

        document
          .getElementById("record-button")
          .addEventListener("click", toggleRecording);
        document
          .getElementById("pause-recording")
          .addEventListener("click", togglePauseResumeRecording);
        document
          .getElementById("stop-recording")
          .addEventListener("click", stopRecording);
        document
          .getElementById("re-record")
          .addEventListener("click", resetRecordingUIAndStart);

        document
          .getElementById("search-input")
          .addEventListener("input", renderNotes);

        document.querySelectorAll(".filter-type-button").forEach((button) => {
          button.addEventListener("click", (e) => {
            e.preventDefault();
            document.querySelectorAll(".filter-type-button").forEach((btn) => {
              btn.classList.remove(
                "active-filter",
                "bg-light-primary-container",
                "dark:bg-dark-primary-container",
                "text-light-on-primary-container",
                "dark:text-dark-on-primary-container"
              );
              btn.classList.add(
                "text-light-on-surface-variant",
                "dark:text-dark-on-surface-variant"
              ); // Reset to default text color
            });
            button.classList.add(
              "active-filter",
              "bg-light-primary-container",
              "dark:bg-dark-primary-container",
              "text-light-on-primary-container",
              "dark:text-dark-on-primary-container"
            );
            button.classList.remove(
              "text-light-on-surface-variant",
              "dark:text-dark-on-surface-variant"
            );
            renderNotes();
            if (window.innerWidth < 768) toggleSidebar(); // Close sidebar on mobile after selection
          });
        });

        document
          .getElementById("confirm-cancel")
          .addEventListener("click", closeConfirmModal);
        document
          .getElementById("confirm-delete")
          .addEventListener("click", executeDeleteNote);

        themeToggleButton.addEventListener("click", toggleTheme);

        noteModal.addEventListener("click", (e) => {
          if (e.target === noteModal) closeNoteModal();
        });
        confirmModal.addEventListener("click", (e) => {
          if (e.target === confirmModal) closeConfirmModal();
        });

        document
          .getElementById("note-tags-input")
          .addEventListener("keypress", handleTagInput);
        favoriteCheckbox.addEventListener("change", updateFavoriteIconInModal);
        colorButtons.forEach((btn) => {
          btn.addEventListener("click", () => {
            currentNote.color = btn.dataset.color;
            updateColorButtons();
            if (currentNote.id) {
              currentNote.updatedAt = Date.now();
              saveNoteToDb({ ...currentNote }).then(() => {
                const idx = notes.findIndex((n) => n.id === currentNote.id);
                if (idx >= 0) notes[idx] = { ...currentNote };
                renderNotes();
              });
            }
          });
        });

        // Keyboard shortcuts
        document.addEventListener("keydown", (e) => {
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
            e.preventDefault();
            openNoteModal(e.shiftKey ? "voice" : "text");
          }
          if (e.key === "Escape") {
            if (!noteModal.classList.contains("hidden")) closeNoteModal();
            if (!confirmModal.classList.contains("hidden")) closeConfirmModal();
            const audioPlayerModal = document.querySelector(
              "body > .fixed.bg-black\\/50"
            ); // Adjusted selector
            if (audioPlayerModal && audioPlayerModal.querySelector("audio")) {
              audioPlayerModal.remove();
              const audioSrc =
                audioPlayerModal.querySelector("audio source")?.src;
              if (audioSrc && audioSrc.startsWith("blob:"))
                URL.revokeObjectURL(audioSrc);
            }
            // Close FAB menu if open
            fabMenus.forEach((menu, index) => {
              if (!menu.classList.contains("opacity-0")) {
                menu.classList.add(
                  "opacity-0",
                  "scale-95",
                  "pointer-events-none"
                );
                fabIcons[index].classList.remove("rotate-45");
              }
            });
            // Close sidebar if open
            if (sidebar.classList.contains("sidebar-open")) toggleSidebar();
          }
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
            if (!noteModal.classList.contains("hidden")) {
              e.preventDefault();
              saveNote();
            }
          }
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
            e.preventDefault();
            document.getElementById("search-input").focus();
          }
        });
      }

      function updateFavoriteIconInModal() {
        const iconSpan = favoriteCheckbox.parentElement.querySelector(
          ".material-symbols-outlined"
        );
        if (favoriteCheckbox.checked) {
          iconSpan.classList.add(
            "fill",
            "text-yellow-500",
            "dark:text-yellow-400"
          );
          iconSpan.classList.remove(
            "text-light-on-surface-variant",
            "dark:text-dark-on-surface-variant"
          );
        } else {
          iconSpan.classList.remove(
            "fill",
            "text-yellow-500",
            "dark:text-yellow-400"
          );
          iconSpan.classList.add(
            "text-light-on-surface-variant",
            "dark:text-dark-on-surface-variant"
          );
        }
      }

      function updateColorButtons() {
        colorButtons.forEach((btn) => {
          if (btn.dataset.color === (currentNote.color || "default")) {
            btn.classList.add("selected");
          } else {
            btn.classList.remove("selected");
          }
        });
      }

      // Modal functions
      function openNoteModal(type, noteId = null) {
        currentNote = noteId
          ? { ...notes.find((n) => n.id === noteId) }
          : { type: type, tags: [], isFavorite: false, isPinned: false, createdAt: Date.now(), color: "default" };

        currentNote.color = currentNote.color || "default";

        document.getElementById("modal-title").textContent =
          currentNote.id && noteId ? `Edytuj notatkę` : `Nowa notatka`;

        document.getElementById("note-title").value = currentNote.title || "";
        document.getElementById("note-content").value =
          currentNote.type === "text" ? currentNote.content || "" : "";
        document.getElementById("voice-note-title").value =
          currentNote.type === "voice" ? currentNote.title || "" : "";
        document.getElementById("note-reminder").value = currentNote.reminderAt
          ? new Date(
              currentNote.reminderAt - new Date().getTimezoneOffset() * 60000
            )
              .toISOString()
              .slice(0, 16)
          : "";

        favoriteCheckbox.checked = currentNote.isFavorite || false;
        updateFavoriteIconInModal();

        currentTags = new Set(currentNote.tags || []);
        renderTagChipsInModal();
        document.getElementById("note-tags-input").value = "";

        updateColorButtons();

        const textForm = document.getElementById("text-note-form");
        const voiceForm = document.getElementById("voice-note-form");

        if (type === "text") {
          textForm.classList.remove("hidden");
          voiceForm.classList.add("hidden");
        } else {
          textForm.classList.add("hidden");
          voiceForm.classList.remove("hidden");
          voiceForm.classList.add("flex");
          resetRecordingUI();
          if (currentNote.id && noteId && currentNote.audioBlob) {
            const audioUrl = URL.createObjectURL(currentNote.audioBlob);
            document.getElementById("recorded-audio").src = audioUrl;
            document
              .getElementById("audio-playback")
              .classList.remove("hidden");
            document.getElementById("recording-status").classList.add("hidden");
          }
        }

        noteModal.classList.remove("hidden");
        noteModal.classList.add("flex");
      }

      function closeNoteModal() {
        noteModal.classList.add("hidden");
        noteModal.classList.remove("flex");
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
          mediaRecorder.stop();
          mediaRecorder.stream.getTracks().forEach((track) => track.stop());
        }
        clearRecordingTimer();
        currentNote = null;
        recordedAudioBlob = null;
        currentTags.clear();
        colorButtons.forEach((btn) => btn.classList.remove("selected"));
      }

      // Tag Management
      function renderTagChipsInModal() {
        const container = document.getElementById("tag-chip-input-container");
        container.innerHTML = "";
        currentTags.forEach((tag) => {
          const chip = document.createElement("span");
          chip.className =
            "flex items-center px-2.5 py-1.5 bg-light-secondary-container dark:bg-dark-secondary-container text-light-on-secondary-container dark:text-dark-on-secondary-container rounded-lg text-xs font-medium";
          chip.textContent = tag;
          const closeIcon = document.createElement("span");
          closeIcon.className =
            "material-symbols-outlined ml-1.5 cursor-pointer text-xs hover:opacity-75";
          closeIcon.textContent = "close";
          closeIcon.onclick = () => {
            currentTags.delete(tag);
            renderTagChipsInModal();
          };
          chip.appendChild(closeIcon);
          container.appendChild(chip);
        });
      }

      function handleTagInput(event) {
        if (event.key === "Enter") {
          event.preventDefault();
          const input = event.target;
          const tag = input.value.trim().replace(/,/g, ""); // Remove commas
          if (tag && currentTags.size < 10) {
            // Limit number of tags
            currentTags.add(tag);
            renderTagChipsInModal();
            input.value = "";
          } else if (tag && currentTags.size >= 10) {
            showToast("Możesz dodać maksymalnie 10 tagów.", "warning");
          }
        }
      }

      // Recording functions
      let isRecordingPaused = false;
      async function toggleRecording() {
        if (mediaRecorder && mediaRecorder.state === "recording") {
          stopRecording();
        } else {
          await startRecording();
        }
      }
      async function startRecording() {
        /* ... (same as before, with UI updates) ... */
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          showToast("API MediaDevices nie jest wspierane.", "error");
          return;
        }
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          mediaRecorder = new MediaRecorder(stream, {
            mimeType: "audio/webm;codecs=opus",
          });
          audioChunks = [];
          recordedAudioBlob = null;
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) audioChunks.push(event.data);
          };
          mediaRecorder.onstop = () => {
            if (audioChunks.length > 0) {
              recordedAudioBlob = new Blob(audioChunks, {
                type: mediaRecorder.mimeType,
              });
              const audioUrl = URL.createObjectURL(recordedAudioBlob);
              document.getElementById("recorded-audio").src = audioUrl;
              document
                .getElementById("audio-playback")
                .classList.remove("hidden");
            }
            if (mediaRecorder && mediaRecorder.stream)
              mediaRecorder.stream.getTracks().forEach((track) => track.stop());
            mediaRecorder = null;
            clearRecordingTimer();
            document.getElementById("recording-status").classList.add("hidden");
            document
              .getElementById("recording-controls")
              .classList.add("hidden");
            document
              .getElementById("recording-controls")
              .classList.remove("flex");
            document
              .getElementById("audio-playback")
              .classList.remove("hidden");
            showToast("Nagrywanie zakończone", "success");
          };
          mediaRecorder.onstart = () => {
            recordingStartTime = Date.now();
            startRecordingTimer();
            document.getElementById("recording-status").classList.add("hidden");
            document
              .getElementById("recording-controls")
              .classList.remove("hidden");
            document.getElementById("recording-controls").classList.add("flex");
            document.getElementById("pause-recording").innerHTML =
              '<span class="material-symbols-outlined">pause</span>';
            isRecordingPaused = false;
            showToast("Nagrywanie rozpoczęte", "info");
            document
              .getElementById("record-button")
              .classList.add("animate-pulse-opacity"); // For main record button if visible
          };
          mediaRecorder.start();
        } catch (error) {
          console.error("Błąd nagrywania:", error);
          showToast("Błąd dostępu do mikrofonu: " + error.message, "error");
        }
      }
      function togglePauseResumeRecording() {
        /* ... (same as before, with UI updates) ... */
        if (!mediaRecorder) return;
        const pauseButton = document.getElementById("pause-recording");
        const timerDisplay = document.getElementById("recording-timer");
        if (mediaRecorder.state === "recording") {
          mediaRecorder.pause();
          isRecordingPaused = true;
          clearRecordingTimer();
          pauseButton.innerHTML =
            '<span class="material-symbols-outlined">play_arrow</span>';
          timerDisplay.classList.add("animate-pulse-opacity");
          showToast("Nagrywanie wstrzymane", "info");
        } else if (mediaRecorder.state === "paused") {
          mediaRecorder.resume();
          isRecordingPaused = false;
          startRecordingTimer(true);
          pauseButton.innerHTML =
            '<span class="material-symbols-outlined">pause</span>';
          timerDisplay.classList.remove("animate-pulse-opacity");
          showToast("Nagrywanie wznowione", "info");
        }
      }
      function stopRecording() {
        /* ... (same as before, with UI updates) ... */
        if (mediaRecorder && mediaRecorder.state !== "inactive")
          mediaRecorder.stop();
        document
          .getElementById("record-button")
          .classList.remove("animate-pulse-opacity");
        document
          .getElementById("recording-timer")
          .classList.remove("animate-pulse-opacity");
      }
      function resetRecordingUI() {
        /* ... (same as before, with UI updates) ... */
        if (mediaRecorder && mediaRecorder.state !== "inactive")
          mediaRecorder.stop();
        clearRecordingTimer();
        audioChunks = [];
        recordedAudioBlob = null;
        document.getElementById("recording-status").classList.remove("hidden");
        document.getElementById("recording-controls").classList.add("hidden");
        document.getElementById("recording-controls").classList.remove("flex");
        document.getElementById("audio-playback").classList.add("hidden");
        document.getElementById("recorded-audio").src = "";
        document.getElementById("recording-timer").textContent = "00:00";
        document
          .getElementById("record-button")
          .classList.remove("animate-pulse-opacity");
        document
          .getElementById("recording-timer")
          .classList.remove("animate-pulse-opacity");
      }
      async function resetRecordingUIAndStart() {
        resetRecordingUI();
        await startRecording();
      }

      function startRecordingTimer(isResuming = false) {
        /* ... (same as before) ... */
        clearRecordingTimer();
        if (!isResuming) recordingStartTime = Date.now();
        const timerDisplay = document.getElementById("recording-timer");

        function updateTimer() {
          const elapsed = Date.now() - recordingStartTime;
          const minutes = Math.floor(elapsed / 60000);
          const seconds = Math.floor((elapsed % 60000) / 1000);
          timerDisplay.textContent = `${minutes
            .toString()
            .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
        }
        updateTimer(); // Initial call
        recordingTimerInterval = setInterval(updateTimer, 1000);
      }
      function clearRecordingTimer() {
        clearInterval(recordingTimerInterval);
        recordingTimerInterval = null;
      }

      // Save note
      async function saveNote() {
        /* ... (mostly same, ensure currentNote is used for new notes too) ... */
        try {
          if (!currentNote) {
            showToast("Brak aktywnej notatki do zapisania.", "error");
            return;
          }

          const isTextNote = currentNote.type === "text";
          const title = (
            isTextNote
              ? document.getElementById("note-title").value
              : document.getElementById("voice-note-title").value
          ).trim();

          if (!title) {
            showToast("Tytuł jest wymagany.", "error");
            return;
          }

          currentNote.color = currentNote.color || "default";
          currentNote.title = title;
          currentNote.tags = Array.from(currentTags);
          currentNote.isFavorite = favoriteCheckbox.checked;
          const reminderInput = document.getElementById("note-reminder").value;
          currentNote.reminderAt = reminderInput
            ? new Date(reminderInput).getTime()
            : null;
          if (
            currentNote.reminderAt &&
            "Notification" in window &&
            Notification.permission === "default"
          ) {
            try {
              await Notification.requestPermission();
            } catch (e) {
              console.error("Błąd uzyskiwania uprawnień powiadomień:", e);
            }
          }
          currentNote.updatedAt = Date.now();

          if (isTextNote) {
            currentNote.content = document
              .getElementById("note-content")
              .value.trim();
            if (!currentNote.content) {
              showToast("Treść notatki jest wymagana.", "error");
              return;
            }
          } else {
            // Voice note
            if (recordedAudioBlob) {
              // New recording or re-recording
              currentNote.audioBlob = recordedAudioBlob;
            } else if (!currentNote.audioBlob) {
              // No existing blob and no new recording
              showToast("Nagraj audio przed zapisaniem.", "error");
              return;
            }
          }
          if (!currentNote.id) currentNote.id = generateId(); // Generate ID if new note

          await saveNoteToDb(currentNote);

          const existingIndex = notes.findIndex((n) => n.id === currentNote.id);
          if (existingIndex >= 0) notes[existingIndex] = { ...currentNote };
          else notes.unshift({ ...currentNote });
          notes.sort((a, b) => b.createdAt - a.createdAt);

          if (currentNote.reminderAt && currentNote.reminderAt > Date.now())
            setReminder(currentNote);

          renderNotes();
          updateTagFilterUI();
          closeNoteModal();
          showToast(`Notatka "${currentNote.title}" zapisana.`, "success");
        } catch (error) {
          console.error("Błąd zapisu notatki:", error);
          showToast("Błąd podczas zapisywania notatki: " + error, "error");
        }
      }

      // Open note for viewing/playing
      function openNote(id) {
        /* ... (same as before, using new modal styles if any) ... */
        const note = notes.find((n) => n.id === id);
        if (!note) return;

        if (note.type === "voice") {
          if (note.audioBlob instanceof Blob) {
            const audioUrl = URL.createObjectURL(note.audioBlob);
            const audioPlayerModal = document.createElement("div");
            audioPlayerModal.className =
              "fixed inset-0 bg-black/50 dark:bg-black/70 z-[70] flex items-center justify-center p-4 backdrop-blur-sm"; // Higher z-index
            audioPlayerModal.innerHTML = `
                        <div class="bg-light-surface dark:bg-dark-surface rounded-3xl max-w-md w-full p-6 shadow-xl relative">
                            <button class="absolute top-3 right-3 p-2 text-light-on-surface-variant dark:text-dark-on-surface-variant hover:bg-light-surface-variant dark:hover:bg-dark-surface-variant rounded-full" 
                                    onclick="this.closest('.fixed').remove(); URL.revokeObjectURL('${audioUrl}');">
                                <span class="material-symbols-outlined">close</span>
                            </button>
                            <h3 class="text-lg font-medium text-light-on-surface dark:text-dark-on-surface mb-4">${
                              note.title
                            }</h3>
                            <audio controls autoplay class="w-full mb-4 rounded-lg">
                                <source src="${audioUrl}" type="${
              note.audioBlob.type || "audio/webm"
            }">
                            </audio>
                            <div class="text-xs text-light-on-surface-variant dark:text-dark-on-surface-variant">
                                <p>Utworzono: ${new Date(
                                  note.createdAt
                                ).toLocaleString("pl-PL", {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })}</p>
                                ${
                                  note.tags.length > 0
                                    ? `<p class="mt-1">Tagi: ${note.tags.join(
                                        ", "
                                      )}</p>`
                                    : ""
                                }
                            </div>
                        </div>
                    `;
            document.body.appendChild(audioPlayerModal);
            const audioEl = audioPlayerModal.querySelector("audio");
            audioEl.onended = () => URL.revokeObjectURL(audioUrl);
            audioEl.onerror = () => {
              showToast("Błąd odtwarzania audio.", "error");
              URL.revokeObjectURL(audioUrl);
            };
          } else {
            showToast("Nie można odtworzyć notatki głosowej.", "error");
          }
        } else {
          editNote(id);
        }
      }

      // Edit note
      function editNote(id) {
        const note = notes.find((n) => n.id === id);
        if (note) openNoteModal(note.type, id);
      }

      // Delete note
      let noteIdToDelete = null;
      function confirmDeleteNoteAction(id) {
        /* ... (same as before) ... */
        noteIdToDelete = id;
        const note = notes.find((n) => n.id === id);
        if (!note) return;
        document.getElementById(
          "confirm-message"
        ).textContent = `Czy na pewno chcesz usunąć notatkę "${note.title}"?`;
        confirmModal.classList.remove("hidden");
        confirmModal.classList.add("flex");
      }
      function closeConfirmModal() {
        /* ... (same as before) ... */ confirmModal.classList.add("hidden");
        confirmModal.classList.remove("flex");
        noteIdToDelete = null;
      }
      async function executeDeleteNote() {
        /* ... (same as before) ... */
        if (!noteIdToDelete) return;
        try {
          await deleteNoteFromDb(noteIdToDelete);
          notes = notes.filter((n) => n.id !== noteIdToDelete);
          renderNotes();
          updateTagFilterUI();
          closeConfirmModal();
          showToast("Notatka została usunięta.", "success");
        } catch (error) {
          console.error("Błąd usuwania:", error);
          showToast("Błąd podczas usuwania notatki: " + error, "error");
        }
      }

      // Tag filter UI management
      function updateTagFilterUI() {
        const tagContainer = document.getElementById("tag-filter");
        const allTags = [...new Set(notes.flatMap((note) => note.tags))].sort(
          (a, b) => a.localeCompare(b)
        );

        if (allTags.length === 0) {
          tagContainer.innerHTML =
            '<p class="px-3 py-2 text-xs text-light-on-surface-variant dark:text-dark-on-surface-variant">Brak tagów.</p>';
          return;
        }
        tagContainer.innerHTML = allTags
          .map(
            (tag) => `
                <label class="flex items-center px-3 py-2 rounded-full cursor-pointer hover:bg-light-surface-variant dark:hover:bg-dark-surface-variant group">
                    <input type="checkbox" value="${tag}" class="h-4 w-4 text-light-primary dark:text-dark-primary bg-light-surface-variant dark:bg-dark-surface-variant border-light-outline dark:border-dark-outline rounded focus:ring-light-primary dark:focus:ring-dark-primary focus:ring-offset-0" onchange="renderNotes()">
                    <span class="ml-3 text-sm text-light-on-surface-variant dark:text-dark-on-surface-variant group-hover:text-light-on-surface dark:group-hover:text-dark-on-surface">${tag}</span>
                </label>
            `
          )
          .join("");
      }

      // Reminders
      function setReminder(note) {
        /* ... (same as before, consider M3 icon for notification) ... */
        const timeUntilReminder = note.reminderAt - Date.now();
        if (timeUntilReminder > 0) {
          setTimeout(() => {
            const currentNoteState = notes.find((n) => n.id === note.id);
            if (
              currentNoteState &&
              currentNoteState.reminderAt === note.reminderAt
            ) {
              // Check if reminder wasn't cancelled/changed
              if (
                "Notification" in window &&
                Notification.permission === "granted"
              ) {
                new Notification(`Przypomnienie: ${note.title}`, {
                  body:
                    note.type === "text"
                      ? note.content.substring(0, 100) +
                        (note.content.length > 100 ? "..." : "")
                      : "Notatka głosowa",
                  icon: "https://fonts.gstatic.com/s/i/short-term/release/znamky.webp/discover/v11/24px.png", // Placeholder icon
                });
              }
              showToast(`🔔 Przypomnienie: ${note.title}`, "info", 6000);
            }
          }, timeUntilReminder);
        }
      }

      // Theme toggle
      function toggleTheme() {
        isDarkMode = !isDarkMode;
        const themeIcon = themeToggleButton.querySelector(
          ".material-symbols-outlined"
        );
        if (isDarkMode) {
          document.documentElement.classList.add("dark");
          themeIcon.textContent = "light_mode";
          themeToggleText.textContent = "Jasny motyw";
        } else {
          document.documentElement.classList.remove("dark");
          themeIcon.textContent = "dark_mode";
          themeToggleText.textContent = "Ciemny motyw";
        }
        localStorage.setItem("notesAppThemeM3", isDarkMode ? "dark" : "light");
      }

      function loadPreferences() {
        const savedTheme = localStorage.getItem("notesAppThemeM3");
        const themeIcon = themeToggleButton.querySelector(
          ".material-symbols-outlined"
        );
        if (savedTheme === "dark") {
          isDarkMode = true;
          document.documentElement.classList.add("dark");
          themeIcon.textContent = "light_mode";
          themeToggleText.textContent = "Jasny motyw";
        } else {
          isDarkMode = false;
          document.documentElement.classList.remove("dark");
          themeIcon.textContent = "dark_mode";
          themeToggleText.textContent = "Ciemny motyw";
        }
      }

      // Toast notifications
      function showToast(message, type = "info", duration = 4000) {
        /* ... (same as before, with M3-like styling) ... */
        const toastContainer = document.getElementById("toast-container");
        const toast = document.createElement("div");
        let colors, iconName;

        switch (type) {
          case "success":
            colors = "bg-green-600 dark:bg-green-500 text-white";
            iconName = "check_circle";
            break;
          case "error":
            colors = "bg-red-600 dark:bg-red-500 text-white";
            iconName = "error";
            break;
          case "warning":
            colors =
              "bg-yellow-500 dark:bg-yellow-400 text-black dark:text-gray-900";
            iconName = "warning";
            break;
          default:
            colors =
              "bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-800";
            iconName = "info";
            break; // M3 snackbar style
        }

        toast.className = `flex items-center px-4 py-3 rounded-lg shadow-lg ${colors} text-sm font-medium transform transition-all duration-300 opacity-0 translate-y-4`;
        toast.innerHTML = `<span class="material-symbols-outlined mr-2.5">${iconName}</span><span>${message}</span>`;
        toastContainer.appendChild(toast);

        requestAnimationFrame(() => {
          // Ensure layout before transition
          toast.classList.remove("opacity-0", "translate-y-4");
          toast.classList.add("opacity-100", "translate-y-0");
        });

        setTimeout(() => {
          toast.classList.remove("opacity-100", "translate-y-0");
          toast.classList.add("opacity-0", "translate-y-4");
          setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
          }, 300);
        }, duration);
      }

      // Utility functions
      function generateId() {
        return (
          Date.now().toString(36) + Math.random().toString(36).substring(2, 11)
        );
      }

      // Auto-save (conceptual)
      let autoSaveTimeout;
      function setupAutoSave() {
        /* ... (same as before) ... */
        const titleInput = document.getElementById("note-title");
        const contentInput = document.getElementById("note-content");
        const voiceTitleInput = document.getElementById("voice-note-title");

        [titleInput, contentInput, voiceTitleInput].forEach((input) => {
          input.addEventListener("input", () => {
            if (
              noteModal.classList.contains("hidden") ||
              !currentNote ||
              !currentNote.id
            )
              return; // Only for existing notes being edited in an open modal

            clearTimeout(autoSaveTimeout);
            autoSaveTimeout = setTimeout(async () => {
              // Update currentNote in memory for immediate UI reflection if any
              currentNote.title = (
                currentNote.type === "text"
                  ? titleInput.value
                  : voiceTitleInput.value
              ).trim();
              if (currentNote.type === "text")
                currentNote.content = contentInput.value.trim();
              currentNote.updatedAt = Date.now();
              currentNote.tags = Array.from(currentTags); // Make sure tags are current

              try {
                // Lightweight save to DB without full UI refresh or toast
                await saveNoteToDb({ ...currentNote });
                // Update in local 'notes' array as well
                const existingIndex = notes.findIndex(
                  (n) => n.id === currentNote.id
                );
                if (existingIndex >= 0)
                  notes[existingIndex] = { ...currentNote };
                console.log(
                  "Notatka automatycznie zapisana:",
                  currentNote.title
                );
              } catch (err) {
                console.error("Błąd automatycznego zapisu:", err);
              }
            }, 2500); // Auto-save after 2.5 seconds of inactivity
          });
        });
      }
