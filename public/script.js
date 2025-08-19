// ScreenSync - Professional Screenwriting Tool
// Client-side JavaScript

class ScreenplayEditor {
    constructor() {
        this.editor = document.getElementById('editor');
        this.currentElement = 'action';
        this.wordCount = 0;
        this.charCount = 0;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateStats();
        this.setupAutoFormatting();
    }

    setupEventListeners() {
        // Element buttons
        document.querySelectorAll('.element-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setCurrentElement(e.target.dataset.element);
            });
        });

        // Save button
        document.getElementById('save-btn').addEventListener('click', () => {
            this.showSaveModal();
        });

        // Export button (placeholder for future PDF export)
        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportToPDF();
        });

        // Editor events
        this.editor.addEventListener('input', () => {
            this.updateStats();
            this.autoFormat();
        });

        this.editor.addEventListener('keydown', (e) => {
            this.handleKeydown(e);
        });

        // Modal events
        this.setupModalEvents();

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.showSaveModal();
            }
        });
    }

    setupModalEvents() {
        const modal = document.getElementById('save-modal');
        const closeBtn = document.querySelector('.close');
        const cancelBtn = document.getElementById('cancel-save');
        const saveForm = document.getElementById('save-form');

        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        cancelBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        saveForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveScreenplay();
        });
    }

    setCurrentElement(element) {
        // Update active button
        document.querySelectorAll('.element-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-element="${element}"]`).classList.add('active');
        
        this.currentElement = element;
        document.getElementById('current-element').textContent = this.getElementDisplayName(element);
    }

    getElementDisplayName(element) {
        const names = {
            'action': 'Action',
            'scene': 'Scene Heading',
            'character': 'Character',
            'dialogue': 'Dialogue',
            'parenthetical': 'Parenthetical',
            'transition': 'Transition'
        };
        return names[element] || 'Action';
    }

    handleKeydown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            this.handleEnter(e);
        } else if (e.key === 'Tab') {
            e.preventDefault();
            this.handleTab(e);
        }
    }

    handleEnter(e) {
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        
        // Create new line element
        const newLine = document.createElement('div');
        newLine.className = `line ${this.currentElement}`;
        newLine.innerHTML = '&nbsp;';
        
        // Insert after current line
        const currentLine = this.getCurrentLine();
        if (currentLine) {
            currentLine.parentNode.insertBefore(newLine, currentLine.nextSibling);
        } else {
            this.editor.appendChild(newLine);
        }
        
        // Move cursor to new line
        range.selectNodeContents(newLine);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Auto-detect element type based on content
        setTimeout(() => this.autoDetectElement(newLine), 10);
    }

    handleTab(e) {
        // Cycle through common elements
        const elementCycle = ['action', 'character', 'dialogue', 'parenthetical'];
        const currentIndex = elementCycle.indexOf(this.currentElement);
        const nextIndex = (currentIndex + 1) % elementCycle.length;
        
        this.setCurrentElement(elementCycle[nextIndex]);
        
        // Apply to current line
        const currentLine = this.getCurrentLine();
        if (currentLine) {
            currentLine.className = `line ${this.currentElement}`;
        }
    }

    getCurrentLine() {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            let node = selection.getRangeAt(0).startContainer;
            while (node && !node.classList?.contains('line')) {
                node = node.parentNode;
            }
            return node;
        }
        return null;
    }

    autoDetectElement(line) {
        const text = line.textContent.trim().toUpperCase();
        
        if (text.startsWith('INT.') || text.startsWith('EXT.') || 
            text.startsWith('FADE IN') || text.startsWith('FADE OUT')) {
            this.applyElementFormat(line, 'scene');
        } else if (text.includes('CUT TO:') || text.includes('DISSOLVE TO:') || 
                   text.includes('FADE TO:') || text.endsWith('TO:')) {
            this.applyElementFormat(line, 'transition');
        } else if (text.startsWith('(') && text.endsWith(')')) {
            this.applyElementFormat(line, 'parenthetical');
        } else if (text === text.toUpperCase() && text.length < 30 && 
                   !text.includes('.') && text.split(' ').length <= 3 && text.length > 0) {
            this.applyElementFormat(line, 'character');
        }
    }

    applyElementFormat(line, elementType) {
        line.className = `line ${elementType}`;
        this.setCurrentElement(elementType);
    }

    autoFormat() {
        // Auto-format current line based on content
        const currentLine = this.getCurrentLine();
        if (currentLine) {
            this.autoDetectElement(currentLine);
        }
    }

    setupAutoFormatting() {
        // Set up mutation observer for dynamic formatting
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE && node.classList?.contains('line')) {
                            this.autoDetectElement(node);
                        }
                    });
                }
            });
        });

        observer.observe(this.editor, {
            childList: true,
            subtree: true
        });
    }

    updateStats() {
        const text = this.editor.textContent || '';
        this.wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
        this.charCount = text.length;
        
        document.getElementById('word-count').textContent = `Words: ${this.wordCount}`;
        document.getElementById('char-count').textContent = `Characters: ${this.charCount}`;
        
        // Estimate page count (roughly 250 words per page for screenplays)
        const pageCount = Math.max(1, Math.ceil(this.wordCount / 250));
        document.getElementById('page-count').textContent = `Page ${pageCount}`;
    }

    showSaveModal() {
        const modal = document.getElementById('save-modal');
        const titleInput = document.getElementById('title');
        const filenameInput = document.getElementById('filename');
        
        // Pre-fill with current title
        const currentTitle = document.getElementById('screenplay-title').value;
        titleInput.value = currentTitle;
        filenameInput.value = currentTitle.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        
        modal.style.display = 'block';
        titleInput.focus();
    }

    async saveScreenplay() {
        const title = document.getElementById('title').value;
        const filename = document.getElementById('filename').value;
        const content = this.getScreenplayContent();
        
        if (!title || !filename) {
            alert('Please fill in all fields');
            return;
        }

        try {
            document.getElementById('save-status').textContent = 'Saving...';
            
            const response = await fetch('/api/save-screenplay', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: title,
                    filename: filename,
                    content: content
                })
            });

            const result = await response.json();
            
            if (result.success) {
                document.getElementById('save-status').textContent = 'Saved successfully!';
                document.getElementById('save-modal').style.display = 'none';
                
                // Trigger download
                window.location.href = result.downloadUrl;
                
                setTimeout(() => {
                    document.getElementById('save-status').textContent = 'Ready';
                }, 3000);
            } else {
                throw new Error(result.error || 'Save failed');
            }
        } catch (error) {
            console.error('Save error:', error);
            document.getElementById('save-status').textContent = 'Save failed';
            alert('Failed to save screenplay: ' + error.message);
            
            setTimeout(() => {
                document.getElementById('save-status').textContent = 'Ready';
            }, 3000);
        }
    }

    getScreenplayContent() {
        const lines = this.editor.querySelectorAll('.line');
        let content = '';
        
        lines.forEach(line => {
            const text = line.textContent.trim();
            if (text && text !== '\u00a0') {
                content += text + '\n';
            }
        });
        
        return content;
    }

    exportToPDF() {
        // Placeholder for PDF export functionality
        alert('PDF export functionality will be implemented in a future version. For now, you can use your browser\'s print function (Ctrl/Cmd + P) to create a PDF.');
        window.print();
    }
}

// Initialize the editor when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ScreenplayEditor();
});

// Utility functions
function formatScreenplayElement(text, elementType) {
    switch (elementType) {
        case 'scene':
            return text.toUpperCase();
        case 'character':
            return text.toUpperCase();
        case 'transition':
            return text.toUpperCase();
        default:
            return text;
    }
}

// Auto-save functionality (optional)
let autoSaveTimer;
function setupAutoSave() {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
        // Auto-save logic here
        console.log('Auto-saving...');
    }, 30000); // Auto-save every 30 seconds
}
