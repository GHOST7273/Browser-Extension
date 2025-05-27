let answerPopup = null;
let selectionTimeout = null;
let isExtensionAvailable = true;

// Check if extension is available
function checkExtensionAvailability() {
    try {
        chrome.runtime.getURL('');
        return true;
    } catch (e) {
        return false;
    }
}

// Create popup element
function createPopup() {
    const popup = document.createElement('div');
    popup.id = 'lms-answer-popup';
    popup.style.display = 'none';
    document.body.appendChild(popup);
    return popup;
}

// Show popup with answer
function showPopup(text, x, y) {
    if (!answerPopup) {
        answerPopup = createPopup();
    }
    
    // Adjust position based on viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Ensure popup stays within viewport
    let popupX = x;
    let popupY = y;
    
    if (x + 300 > viewportWidth) {
        popupX = viewportWidth - 320;
    }
    
    if (y + 200 > viewportHeight) {
        popupY = y - 220;
    }
    
    answerPopup.style.left = `${popupX}px`;
    answerPopup.style.top = `${popupY}px`;
    answerPopup.style.display = 'block';
    answerPopup.innerHTML = `
        <div class="popup-header">
            <span>Answer</span>
            <button class="close-btn" aria-label="Close">&times;</button>
        </div>
        <div class="popup-content">
            <div class="loading">
                <div class="spinner"></div>
                Getting answer...
            </div>
        </div>
    `;

    // Add close button functionality
    const closeBtn = answerPopup.querySelector('.close-btn');
    closeBtn.onclick = () => {
        answerPopup.style.display = 'none';
    };

    // Check extension availability before sending message
    if (!checkExtensionAvailability()) {
        const contentDiv = answerPopup.querySelector('.popup-content');
        contentDiv.innerHTML = `
            <div class="error">
                Extension is not available. Please refresh the page.
                <button onclick="window.location.reload()" style="margin-top: 10px; padding: 5px 10px;">
                    Refresh Page
                </button>
            </div>
        `;
        return;
    }

    // Send message to background script to get answer
    chrome.runtime.sendMessage(
        { action: 'getAnswer', text: text },
        (response) => {
            if (chrome.runtime.lastError) {
                console.error('Extension error:', chrome.runtime.lastError);
                const contentDiv = answerPopup.querySelector('.popup-content');
                contentDiv.innerHTML = `
                    <div class="error">
                        Extension needs to be reloaded. 
                        <button onclick="window.location.reload()" style="margin-top: 10px; padding: 5px 10px;">
                            Reload Page
                        </button>
                    </div>
                `;
                return;
            }

            const contentDiv = answerPopup.querySelector('.popup-content');
            if (!response) {
                contentDiv.innerHTML = `<div class="error">No response received. Please try again.</div>`;
                return;
            }
            if (response.error) {
                contentDiv.innerHTML = `<div class="error">${response.error}</div>`;
            } else if (response.answer) {
                contentDiv.innerHTML = `<div class="answer">${response.answer}</div>`;
            } else {
                contentDiv.innerHTML = `<div class="error">Unexpected response format. Please try again.</div>`;
            }
        }
    );
}

// Handle text selection with debounce
function handleTextSelection(e) {
    if (selectionTimeout) {
        clearTimeout(selectionTimeout);
    }
    
    selectionTimeout = setTimeout(() => {
        const selectedText = window.getSelection().toString().trim();
        
        if (selectedText) {
            const selection = window.getSelection();
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            // Position popup near the selection
            const x = rect.left + window.scrollX;
            const y = rect.bottom + window.scrollY + 10;
            
            showPopup(selectedText, x, y);
        }
    }, 300); // Debounce for 300ms
}

// Add event listeners for both mouse and touch events
document.addEventListener('mouseup', handleTextSelection);
document.addEventListener('touchend', handleTextSelection);

// Close popup when clicking/touching outside
document.addEventListener('mousedown', (e) => {
    if (answerPopup && !answerPopup.contains(e.target)) {
        answerPopup.style.display = 'none';
    }
});

document.addEventListener('touchstart', (e) => {
    if (answerPopup && !answerPopup.contains(e.target)) {
        answerPopup.style.display = 'none';
    }
});

// Listen for extension updates
chrome.runtime.onConnect.addListener(function(port) {
    port.onDisconnect.addListener(function() {
        isExtensionAvailable = false;
    });
}); 