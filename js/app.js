      // Global variables
      let notes = [];
      let currentNote = null;
      let currentTags = new Set();
      let mediaRecorder = null;
      let audioChunks = [];
      let recordedAudioBlob = null;
      let speechRecognition = null;
      let transcriptionText = "";
      let recordingStartTime = 0;
      let recordingTimerInterval = null;
      let isDarkMode = false;
      let isGridView = true;
      let currentFolder = "active";
      let trashRetentionDays = 30;

      // DOM Elements
      const noteModal = document.getElementById("note-modal");
      const confirmModal = document.getElementById("confirm-modal");
      const themeToggleButton = document.getElementById("theme-toggle");
      const themeToggleText = document.getElementById("theme-toggle-text");
      const viewToggleButton = document.getElementById("view-toggle");
      const favoriteCheckbox = document.getElementById("note-favorite");
      const pinnedCheckbox = document.getElementById("note-pinned");
      const colorButtons = document.querySelectorAll(
        "#note-color-options .color-option"
      );
      const settingsButton = document.getElementById("settings-button");
      const settingsView = document.getElementById("settings-view");
      const notesView = document.getElementById("notes-view");
      const trashRetentionInput = document.getElementById("trash-retention-input");
      const exportButton = document.getElementById("export-notes");
      const importButton = document.getElementById("import-notes");
      const importFileInput = document.getElementById("import-file");
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
      async function initApp() {
        loadPreferences();
        await initIndexedDB();
        await loadNotes();
        renderNotes();
        updateTagFilterUI();
        setupEventListeners();

        notes.forEach((note) => {
          if (note.reminderAt && note.reminderAt > Date.now()) {
            setReminder(note);
          }
        });
      }

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initApp);
      } else {
        initApp();
      }

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
          const now = Date.now();
          const retentionMs = trashRetentionDays * 24 * 60 * 60 * 1000;
          const filtered = [];
          for (const n of notes) {
            n.folder = n.folder || "active";
            if (n.folder === "trash" && n.deletedAt && now - n.deletedAt > retentionMs) {
              await deleteNoteFromDb(n.id);
            } else {
              filtered.push(n);
            }
          }
          notes = filtered;
          notes.sort((a, b) => b.createdAt - a.createdAt);
        } catch (error) {
          console.error("Błąd ładowania notatek:", error);
          showToast("Błąd podczas ładowania notatek", "error");
        }
      }

      // Render notes
      function renderNotes() {
        const container = document.getElementById("notes-container");
        const pinnedContainer = document.getElementById("pinned-notes-container");
        const pinnedSection = document.getElementById("pinned-section");
        const divider = document.getElementById("notes-divider");
        const othersHeader = document.getElementById("others-header");
        const emptyState = document.getElementById("empty-state");
        const filteredNotes = filterNotes();

        const showPinned = currentFolder === "active";
        const pinned = showPinned ? filteredNotes.filter((n) => n.isPinned) : [];
        const others = showPinned
          ? filteredNotes.filter((n) => !n.isPinned)
          : filteredNotes;

        if (filteredNotes.length === 0) {
          container.innerHTML = "";
          pinnedContainer.innerHTML = "";
          divider.classList.add("hidden");
          container.classList.remove(
            "sm:grid-cols-2",
            "lg:grid-cols-3",
            "xl:grid-cols-4"
          );
          pinnedContainer.classList.remove(
            "sm:grid-cols-2",
            "lg:grid-cols-3",
            "xl:grid-cols-4"
          );
          pinnedSection.classList.add("hidden");
          othersHeader.classList.add("hidden");
          emptyState.classList.remove("hidden");
          emptyState.classList.add("flex");
        } else {
          emptyState.classList.add("hidden");
          emptyState.classList.remove("flex");
          if (isGridView) {
            container.classList.add(
              "sm:grid-cols-2",
              "lg:grid-cols-3",
              "xl:grid-cols-4"
            );
            pinnedContainer.classList.add(
              "sm:grid-cols-2",
              "lg:grid-cols-3",
              "xl:grid-cols-4"
            );
          } else {
            container.classList.remove(
              "sm:grid-cols-2",
              "lg:grid-cols-3",
              "xl:grid-cols-4"
            );
            pinnedContainer.classList.remove(
              "sm:grid-cols-2",
              "lg:grid-cols-3",
              "xl:grid-cols-4"
            );
          }
          pinnedSection.classList.toggle("hidden", !showPinned || pinned.length === 0);
          divider.classList.toggle(
            "hidden",
            !showPinned || pinned.length === 0 || others.length === 0
          );
          othersHeader.classList.toggle(
            "hidden",
            !showPinned || pinned.length === 0 || others.length === 0
          );
          pinnedContainer.innerHTML = showPinned
            ? pinned.map((note) => createNoteCard(note)).join("")
            : "";
          container.innerHTML = others.map((note) => createNoteCard(note)).join("");
        }
      }

      // Filter notes
      function filterNotes() {
        let filtered = notes.filter((n) => (n.folder || "active") === currentFolder);
        const searchTerm = document
          .getElementById("search-input")
          .value.toLowerCase();
        if (searchTerm) {
          filtered = filtered.filter(
            (note) =>
              note.title.toLowerCase().includes(searchTerm) ||
              ((note.type === "text" || note.type === "transcription") &&
                (note.content || "").toLowerCase().includes(searchTerm)) ||
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
      function updateSearchSuggestions() {
        const container = document.getElementById("search-suggestions");
        const term = document
          .getElementById("search-input")
          .value.toLowerCase();
        if (!term) {
          container.classList.add("hidden");
          container.innerHTML = "";
          return;
        }
        const suggestions = [
          ...new Set(
            notes
              .flatMap((n) => [n.title, ...n.tags])
              .filter((t) => t && t.toLowerCase().includes(term))
          ),
        ].slice(0, 5);
        container.innerHTML = suggestions
          .map(
            (s) =>
              `<div class="suggestion-item px-3 py-2 cursor-pointer hover:bg-light-surface-variant dark:hover:bg-dark-surface-variant">${s}</div>`
          )
          .join("");
        container.classList.toggle("hidden", suggestions.length === 0);
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
        const pinnedIconHtml = note.isPinned
          ? '<span class="material-symbols-outlined text-light-primary dark:text-dark-primary text-lg absolute top-2 left-2 -rotate-45">push_pin</span>'
          : "";
        const noteTypeIcon =
          note.type === "text"
            ? "article"
            : note.type === "voice"
            ? "graphic_eq"
            : "subtitles";

        const daysLeftHtml =
          note.folder === "trash" && note.deletedAt
            ? `<span class="ml-2">Pozostało ${Math.max(
                0,
                Math.ceil((trashRetentionDays * 24 * 60 * 60 * 1000 - (Date.now() - note.deletedAt)) / (24 * 60 * 60 * 1000))
              )} dni</span>`
            : "";

        let actionsHtml = "";
        if (note.folder === "active") {
          actionsHtml = `
                                <button onclick="event.stopPropagation(); togglePinNote('${note.id}')" class="p-1.5 hover:bg-light-surface-variant dark:hover:bg-dark-surface-variant rounded-full ${note.isPinned ? 'text-light-primary dark:text-dark-primary' : ''}">
                                    <span class="material-symbols-outlined text-lg">push_pin</span>
                                </button>
                                <button onclick="event.stopPropagation(); editNote('${note.id}')" class="p-1.5 hover:bg-light-surface-variant dark:hover:bg-dark-surface-variant rounded-full">
                                    <span class="material-symbols-outlined text-lg">edit</span>
                                </button>
                                <button onclick="event.stopPropagation(); archiveNote('${note.id}')" class="p-1.5 hover:bg-light-surface-variant dark:hover:bg-dark-surface-variant rounded-full">
                                    <span class="material-symbols-outlined text-lg">archive</span>
                                </button>
                                <button onclick="event.stopPropagation(); confirmDeleteNoteAction('${note.id}')" class="p-1.5 hover:bg-light-surface-variant dark:hover:bg-dark-surface-variant rounded-full">
                                    <span class="material-symbols-outlined text-lg">delete</span>
                                </button>`;
        } else if (note.folder === "archive") {
          actionsHtml = `
                                <button onclick="event.stopPropagation(); unarchiveNote('${note.id}')" class="p-1.5 hover:bg-light-surface-variant dark:hover:bg-dark-surface-variant rounded-full">
                                    <span class="material-symbols-outlined text-lg">unarchive</span>
                                </button>
                                <button onclick="event.stopPropagation(); confirmDeleteNoteAction('${note.id}')" class="p-1.5 hover:bg-light-surface-variant dark:hover:bg-dark-surface-variant rounded-full">
                                    <span class="material-symbols-outlined text-lg">delete</span>
                                </button>`;
        } else {
          actionsHtml = `
                                <button onclick="event.stopPropagation(); restoreFromTrash('${note.id}')" class="p-1.5 hover:bg-light-surface-variant dark:hover:bg-dark-surface-variant rounded-full">
                                    <span class="material-symbols-outlined text-lg">restore_from_trash</span>
                                </button>
                                <button onclick="event.stopPropagation(); confirmDeleteNoteAction('${note.id}')" class="p-1.5 hover:bg-light-surface-variant dark:hover:bg-dark-surface-variant rounded-full">
                                    <span class="material-symbols-outlined text-lg">delete_forever</span>
                                </button>`;
        }

        return `
                <div class="${colorClass} rounded-lg shadow-sm hover:shadow-md p-4 md:p-5 flex flex-col justify-between cursor-pointer transition-shadow relative group"
                     onclick="openNote('${note.id}')">
                    ${pinnedIconHtml}${favoriteIconHtml}
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
                            : note.type === "transcription"
                            ? `
                            <p class="text-sm text-light-on-surface-variant dark:text-dark-on-surface-variant mb-3 line-clamp-4">${
                              (note.content || "").substring(0, 100)
                            }</p>
                        `
                            : `
                            <div class="flex items-center text-sm text-light-on-surface-variant dark:text-dark-on-surface-variant mb-3">
                                <span class="material-symbols-outlined mr-2 text-lg">${noteTypeIcon}</span> Nagranie głosowe
                            </div>
                        `
                        }
                        ${
                          note.attachments && note.attachments.length
                            ? `<div class="flex gap-1 mt-1">${note.attachments
                                .slice(0, 3)
                                .map((a) => {
                                  const url = URL.createObjectURL(a);
                                  return `<img src="${url}" onload="URL.revokeObjectURL('${url}')" class="w-16 h-16 object-cover rounded" />`;
                                })
                                .join("")}</div>`
                            : ""
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
                            ${daysLeftHtml}
                            <div class="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                                ${actionsHtml}
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
        [
          "add-transcription-note-fab",
          "add-transcription-note-fab-desktop",
        ].forEach((id) =>
          document
            .getElementById(id)
            ?.addEventListener("click", () => openNoteModal("transcription"))
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
        const searchInput = document.getElementById("search-input");
        const searchSuggestions = document.getElementById("search-suggestions");
        searchInput.addEventListener("input", () => {
          renderNotes();
          updateSearchSuggestions();
        });
        searchInput.addEventListener("focus", updateSearchSuggestions);
        searchSuggestions.addEventListener("click", (e) => {
          if (e.target.classList.contains("suggestion-item")) {
            searchInput.value = e.target.textContent;
            renderNotes();
            searchSuggestions.classList.add("hidden");
          }
        });
        document.addEventListener("click", (e) => {
          if (
            e.target !== searchInput &&
            !searchSuggestions.contains(e.target)
          ) {
            searchSuggestions.classList.add("hidden");
          }
        });

        document.querySelectorAll(".folder-button").forEach((button) => {
          button.addEventListener("click", (e) => {
            e.preventDefault();
            document.querySelectorAll(".folder-button").forEach((btn) => {
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
              );
            });
            if (settingsButton) {
              settingsButton.classList.remove(
                "active-filter",
                "bg-light-primary-container",
                "dark:bg-dark-primary-container",
                "text-light-on-primary-container",
                "dark:text-dark-on-primary-container"
              );
              settingsButton.classList.add(
                "text-light-on-surface-variant",
                "dark:text-dark-on-surface-variant"
              );
            }
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
            currentFolder = button.dataset.folder;
            settingsView?.classList.add("hidden");
            notesView?.classList.remove("hidden");
            renderNotes();
            if (window.innerWidth < 768) toggleSidebar();
          });
        });

        if (settingsButton) {
          settingsButton.addEventListener("click", (e) => {
            e.preventDefault();
            document.querySelectorAll(".folder-button").forEach((btn) => {
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
              );
            });
            settingsButton.classList.add(
              "active-filter",
              "bg-light-primary-container",
              "dark:bg-dark-primary-container",
              "text-light-on-primary-container",
              "dark:text-dark-on-primary-container"
            );
            settingsButton.classList.remove(
              "text-light-on-surface-variant",
              "dark:text-dark-on-surface-variant"
            );
            notesView?.classList.add("hidden");
            settingsView?.classList.remove("hidden");
            if (window.innerWidth < 768) toggleSidebar();
          });

          trashRetentionInput?.addEventListener("change", () => {
            let days = parseInt(trashRetentionInput.value);
            if (!days || days < 1) days = 1;
            trashRetentionDays = days;
            localStorage.setItem("trashRetentionDays", days);
            renderNotes();
          });
        }


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
        viewToggleButton.addEventListener("click", toggleView);
        exportButton?.addEventListener("click", exportNotes);
        importButton?.addEventListener("click", () => importFileInput?.click());
        importFileInput?.addEventListener("change", handleImportFile);

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
        pinnedCheckbox.addEventListener("change", updatePinnedIconInModal);
        colorButtons.forEach((btn) => {
          btn.addEventListener("click", () => {
            currentNote.color = btn.dataset.color;
            updateColorButtons();
          });
        });

        document
          .getElementById("note-attachments")
          .addEventListener("change", handleAttachmentInput);

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

      function updatePinnedIconInModal() {
        const iconSpan = pinnedCheckbox.parentElement.querySelector(
          ".material-symbols-outlined"
        );
        if (pinnedCheckbox.checked) {
          iconSpan.classList.add(
            "text-light-primary",
            "dark:text-dark-primary"
          );
        } else {
          iconSpan.classList.remove(
            "text-light-primary",
            "dark:text-dark-primary"
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
          : { type: type, tags: [], isFavorite: false, isPinned: false, createdAt: Date.now(), color: "default", folder: "active" };

        currentNote.color = currentNote.color || "default";

        document.getElementById("modal-title").textContent =
          currentNote.id && noteId ? `Edytuj notatkę` : `Nowa notatka`;

        document.getElementById("note-title").value = currentNote.title || "";
        document.getElementById("note-content").value =
          currentNote.type === "text" ? currentNote.content || "" : "";
        document.getElementById("voice-note-title").value =
          currentNote.type === "voice" || currentNote.type === "transcription"
            ? currentNote.title || ""
            : "";
        const transcriptionInput = document.getElementById("transcription-text");
        if (transcriptionInput)
          transcriptionInput.value =
            currentNote.type === "transcription" ? currentNote.content || "" : "";
        document.getElementById("note-reminder").value = currentNote.reminderAt
          ? new Date(
              currentNote.reminderAt - new Date().getTimezoneOffset() * 60000
            )
              .toISOString()
              .slice(0, 16)
          : "";

        favoriteCheckbox.checked = currentNote.isFavorite || false;
        updateFavoriteIconInModal();
        pinnedCheckbox.checked = currentNote.isPinned || false;
        updatePinnedIconInModal();

        currentTags = new Set(currentNote.tags || []);
        renderTagChipsInModal();
        document.getElementById("note-tags-input").value = "";

        currentNote.attachments = currentNote.attachments || [];
        document.getElementById("note-attachments").value = "";
        renderAttachmentPreviews();

        updateColorButtons();

        const textForm = document.getElementById("text-note-form");
        const voiceForm = document.getElementById("voice-note-form");
        const transcriptionArea = document.getElementById("transcription-area");

        if (type === "text") {
          textForm.classList.remove("hidden");
          voiceForm.classList.add("hidden");
          if (transcriptionArea) transcriptionArea.classList.add("hidden");
        } else {
          textForm.classList.add("hidden");
          voiceForm.classList.remove("hidden");
          voiceForm.classList.add("flex");
          if (transcriptionArea)
            transcriptionArea.classList.toggle("hidden", type !== "transcription");
          if (!noteId) resetRecordingUI();
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
        if (currentNote && currentNote.type === "transcription") {
          stopSpeechRecognition();
        }
        clearRecordingTimer();
        currentNote = null;
        recordedAudioBlob = null;
        currentTags.clear();
        document.getElementById("note-attachments").value = "";
        document.getElementById("attachment-previews").innerHTML = "";
        colorButtons.forEach((btn) => btn.classList.remove("selected"));
        pinnedCheckbox.checked = false;
        updatePinnedIconInModal();
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

      function renderAttachmentPreviews() {
        const container = document.getElementById("attachment-previews");
        if (!container) return;
        container.innerHTML = "";
        (currentNote.attachments || []).forEach((file) => {
          if (!(file instanceof Blob)) return;
          const url = URL.createObjectURL(file);
          const img = document.createElement("img");
          img.src = url;
          img.onload = () => URL.revokeObjectURL(url);
          img.className = "w-16 h-16 object-cover rounded";
          container.appendChild(img);
        });
      }

      function handleAttachmentInput(e) {
        const files = Array.from(e.target.files);
        if (!currentNote.attachments) currentNote.attachments = [];
        currentNote.attachments.push(...files);
        renderAttachmentPreviews();
        e.target.value = "";
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
            if (currentNote && currentNote.type === "transcription") {
              stopSpeechRecognition();
            }
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
          if (currentNote && currentNote.type === "transcription") {
            startSpeechRecognition();
          }
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
        if (currentNote && currentNote.type === "transcription") {
          stopSpeechRecognition();
        }
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
        if (currentNote && currentNote.type === "transcription") {
          stopSpeechRecognition();
          transcriptionText = "";
          const tArea = document.getElementById("transcription-text");
          if (tArea) tArea.value = "";
        }
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

      function startSpeechRecognition() {
        const SpeechRec =
          window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) {
          showToast("Transkrypcja nie jest wspierana w tej przeglądarce", "error");
          return;
        }
        speechRecognition = new SpeechRec();
        speechRecognition.lang = "pl-PL";
        speechRecognition.continuous = true;
        speechRecognition.interimResults = true;
        speechRecognition.onresult = (e) => {
          let interim = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const res = e.results[i];
            if (res.isFinal) {
              transcriptionText += res[0].transcript;
            } else {
              interim += res[0].transcript;
            }
          }
          const tArea = document.getElementById("transcription-text");
          if (tArea) tArea.value = transcriptionText + interim;
        };
        speechRecognition.onerror = (e) => {
          console.error("Błąd rozpoznawania mowy", e);
        };
        transcriptionText = "";
        speechRecognition.start();
      }

      function stopSpeechRecognition() {
        if (speechRecognition) {
          try {
            speechRecognition.stop();
          } catch {}
          speechRecognition = null;
        }
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
          const isTranscriptionNote = currentNote.type === "transcription";
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
          currentNote.isPinned = pinnedCheckbox.checked;
          currentNote.attachments = currentNote.attachments || [];
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
          } else if (isTranscriptionNote) {
            if (recordedAudioBlob) {
              currentNote.audioBlob = recordedAudioBlob;
            } else if (!currentNote.audioBlob) {
              showToast("Nagraj audio przed zapisaniem.", "error");
              return;
            }
            currentNote.content = document
              .getElementById("transcription-text")
              .value.trim();
            if (!currentNote.content) {
              showToast("Brak transkrypcji do zapisania.", "error");
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
          const savedTitle = currentNote.title;
          closeNoteModal();
          showToast(`Notatka "${savedTitle}" zapisana.`, "success");
          document.getElementById("note-attachments").value = "";
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

      function togglePinNote(id) {
        const note = notes.find((n) => n.id === id);
        if (!note) return;
        note.isPinned = !note.isPinned;
        note.updatedAt = Date.now();
        saveNoteToDb(note).then(() => {
          renderNotes();
          showToast(note.isPinned ? "Notatka przypięta" : "Notatka odpięta", "info");
        });
      }

      function archiveNote(id) {
        const note = notes.find((n) => n.id === id);
        if (!note) return;
        note.folder = "archive";
        note.updatedAt = Date.now();
        saveNoteToDb(note).then(() => {
          renderNotes();
          showToast("Notatka zarchiwizowana", "info");
        });
      }

      function unarchiveNote(id) {
        const note = notes.find((n) => n.id === id);
        if (!note) return;
        note.folder = "active";
        note.updatedAt = Date.now();
        saveNoteToDb(note).then(() => {
          renderNotes();
          showToast("Przywrócono z archiwum", "info");
        });
      }

      function restoreFromTrash(id) {
        const note = notes.find((n) => n.id === id);
        if (!note) return;
        note.folder = "active";
        note.deletedAt = null;
        note.updatedAt = Date.now();
        saveNoteToDb(note).then(() => {
          renderNotes();
          showToast("Przywrócono notatkę", "info");
        });
      }

      // Delete note
      let noteIdToDelete = null;
      function confirmDeleteNoteAction(id) {
        /* ... (same as before) ... */
        noteIdToDelete = id;
        const note = notes.find((n) => n.id === id);
        if (!note) return;
        document.getElementById("confirm-message").textContent =
          note.folder === "trash"
            ? `Trwale usunąć notatkę "${note.title}"?`
            : `Przenieść notatkę "${note.title}" do kosza?`;
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
          const note = notes.find((n) => n.id === noteIdToDelete);
          if (!note) return;
          if (note.folder === "trash") {
            await deleteNoteFromDb(noteIdToDelete);
            notes = notes.filter((n) => n.id !== noteIdToDelete);
            showToast("Notatka usunięta na zawsze.", "success");
          } else {
            note.folder = "trash";
            note.deletedAt = Date.now();
            note.updatedAt = Date.now();
            await saveNoteToDb(note);
            showToast("Przeniesiono do kosza.", "info");
          }
          renderNotes();
          updateTagFilterUI();
          closeConfirmModal();
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

      function toggleView() {
        isGridView = !isGridView;
        updateViewIcon();
        localStorage.setItem("notesViewMode", isGridView ? "grid" : "list");
        renderNotes();
      }

      function updateViewIcon() {
        const icon = viewToggleButton.querySelector(".material-symbols-outlined");
        icon.textContent = isGridView ? "view_agenda" : "grid_view";
      }

      function loadPreferences() {
        const savedTheme = localStorage.getItem("notesAppThemeM3");
        const themeIcon = themeToggleButton.querySelector(
          ".material-symbols-outlined"
        );
        const prefersDark = window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches;
        const useDark = savedTheme
          ? savedTheme === "dark"
          : prefersDark;

        isDarkMode = useDark;
        if (useDark) {
          document.documentElement.classList.add("dark");
          themeIcon.textContent = "light_mode";
          themeToggleText.textContent = "Jasny motyw";
        } else {
          document.documentElement.classList.remove("dark");
          themeIcon.textContent = "dark_mode";
          themeToggleText.textContent = "Ciemny motyw";
        }

        const savedView = localStorage.getItem("notesViewMode");
        isGridView = savedView ? savedView === "grid" : true;
        updateViewIcon();

        const savedRetention = parseInt(localStorage.getItem("trashRetentionDays"));
        trashRetentionDays = savedRetention && savedRetention > 0 ? savedRetention : 30;
        if (trashRetentionInput) trashRetentionInput.value = trashRetentionDays;
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
        const transcriptionInput = document.getElementById("transcription-text");

        [titleInput, contentInput, voiceTitleInput, transcriptionInput].forEach((input) => {
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
              else if (currentNote.type === "transcription")
                currentNote.content = transcriptionInput.value.trim();
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

      async function blobToDataURL(blob) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      async function dataURLToBlob(dataUrl) {
        const res = await fetch(dataUrl);
        return await res.blob();
      }

      async function exportNotes() {
        try {
          const allNotes = await loadNotesFromDb();
          const serialized = [];
          for (const n of allNotes) {
            const obj = { ...n };
            if (n.audioBlob instanceof Blob) {
              obj.audioBlob = await blobToDataURL(n.audioBlob);
            }
            serialized.push(obj);
          }
          const blob = new Blob([JSON.stringify(serialized)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "notes.json";
          a.click();
          URL.revokeObjectURL(url);
        } catch (err) {
          console.error("Błąd eksportu notatek:", err);
          showToast("Błąd eksportu notatek", "error");
        }
      }

      async function handleImportFile(e) {
        const file = e.target.files[0];
        if (!file) return;
        try {
          const text = await file.text();
          const imported = JSON.parse(text);
          if (!Array.isArray(imported)) throw new Error("Zły format pliku");
          const existing = await loadNotesFromDb();
          const existingIds = new Set(existing.map((n) => n.id));
          let added = 0;
          for (const n of imported) {
            if (!n.id || existingIds.has(n.id)) continue;
            const note = { ...n };
            if (n.audioBlob && typeof n.audioBlob === "string" && n.audioBlob.startsWith("data:")) {
              note.audioBlob = await dataURLToBlob(n.audioBlob);
            }
            await saveNoteToDb(note);
            notes.unshift(note);
            existingIds.add(note.id);
            added++;
          }
          notes.sort((a, b) => b.createdAt - a.createdAt);
          renderNotes();
          showToast(`Zaimportowano ${added} notatek`, "success");
        } catch (err) {
          console.error("Błąd importu notatek:", err);
          showToast("Błąd importu notatek", "error");
        } finally {
          e.target.value = "";
        }
      }

      // Expose functions for inline event handlers
      window.toggleSidebar = toggleSidebar;
      window.openNote = openNote;
      window.editNote = editNote;
      window.confirmDeleteNoteAction = confirmDeleteNoteAction;
      window.togglePinNote = togglePinNote;
      window.archiveNote = archiveNote;
      window.unarchiveNote = unarchiveNote;
      window.restoreFromTrash = restoreFromTrash;
