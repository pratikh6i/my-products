document.addEventListener('DOMContentLoaded', () => {
    // --- ⭐ FINAL CONFIGURATION ⭐ ---
    const GITHUB_USERNAME = 'pratikh6i';
    const GITHUB_REPO = 'my-products';

    // 1. ⚠️ ACTION REQUIRED: Get this URL from the Google Apps Script setup (see README_GoogleSheet.md)
    const GOOGLE_SHEET_API_URL = 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';

    // 2. ⚠️ ACTION REQUIRED: Enter your Mami's WhatsApp number with the country code (no + or spaces)
    const WHATSAPP_PHONE_NUMBER = '910000000000'; // Example for India
    
    const PRODUCTS_FOLDER = 'products';
    const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${PRODUCTS_FOLDER}`;
    // --- END OF CONFIGURATION ---

    const galleryContainer = document.getElementById('gallery-container');
    const statusMessage = document.getElementById('statusMessage');
    let productCards = [];
    let currentIndex = 0;

    async function fetchAndDisplayProducts() {
        // ... (fetch logic is the same as before)
        try {
            const response = await fetch(GITHUB_API_URL);
            if (!response.ok) throw new Error(`GitHub API Error: ${response.statusText}`);
            const files = await response.json();
            const mediaFiles = files.filter(file => file.type === 'file' && file.download_url && /\.(jpg|jpeg|png|gif|webp|mp4|webm|mov)$/i.test(file.name));

            statusMessage.style.display = 'none';
            if (mediaFiles.length === 0) {
                displayMessage("No products found.");
                return;
            }

            // Create cards in reverse order for correct visual stacking
            mediaFiles.reverse().forEach(file => {
                const card = createProductCard(file.name, file.download_url);
                galleryContainer.appendChild(card);
            });
            
            productCards = document.querySelectorAll('.product-card');
            
            // Different setup for mobile vs desktop
            if (window.innerWidth < 768) {
                setupSwipeListeners();
            } else {
                setupIntersectionObserver();
            }

        } catch (error) {
            console.error('Fetch Error:', error);
            displayMessage(error.message);
        }
    }

    function createProductCard(filename, fileUrl) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.dataset.name = filename; // Store full filename

        // Media element (Image or Video)
        const mediaElement = createMediaElement(filename, fileUrl);
        card.appendChild(mediaElement);

        // Interactions Overlay
        const interactions = document.createElement('div');
        interactions.className = 'card-interactions';
        
        // Buttons
        const dislikeBtn = createInteractionButton('dislike', 'M13 4a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h9Zm0 2H4v6h9V6Zm6-2a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h1Z', () => handleLikeDislike(filename, 'dislike', card));
        const likeBtn = createInteractionButton('like', 'M12 4a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h9Zm0 2H3v6h9V6Zm8-2a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h1Z', () => handleLikeDislike(filename, 'like', card));
        const whatsappBtn = createInteractionButton('whatsapp', 'M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zM9.53 9.02c-.27-.42-1.16-.9-1.3-1.03-.14-.12-.28-.18-.48-.18s-.49.12-.66.36c-.17.24-.66.8-.81 1.2s-.3.66-.15 1.02c.14.36.66.96 1.2 1.5.83.83 1.58 1.1 1.81 1.2.24.12.36.1.49-.06.13-.17.55-.64.7-1.2.14-.58.1-.96-.06-1.1s-.42-.24-.55-.3z', () => shareOnWhatsApp(filename, fileUrl));
        
        interactions.append(dislikeBtn, whatsappBtn, likeBtn);
        card.appendChild(interactions);
        return card;
    }

    // Helper functions for card creation
    function createMediaElement(filename, fileUrl) {
        const fileExtension = filename.split('.').pop().toLowerCase();
        const media = ['mp4', 'webm', 'mov'].includes(fileExtension) ? document.createElement('video') : document.createElement('img');
        media.className = 'product-card-media';
        media.src = fileUrl;
        if (media.tagName === 'VIDEO') {
            media.autoplay = true; media.loop = true; media.muted = true; media.playsInline = true;
        } else {
            media.alt = filename; media.loading = 'lazy';
        }
        return media;
    }
    
    function createInteractionButton(type, svgPath, onClick) {
        const btn = document.createElement('button');
        btn.className = `interaction-button ${type}`;
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="currentColor" d="${svgPath}"/></svg>`;
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent card drag from firing on button click
            onClick();
        });
        return btn;
    }

    // --- New Feature Logic ---
    async function handleLikeDislike(filename, action, card) {
        if (GOOGLE_SHEET_API_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
            alert('Google Sheet API is not configured in script.js');
            return;
        }
        
        // Animate the card out
        const angle = action === 'like' ? 15 : -15;
        card.style.transform = `translate(${angle * 10}px, -30px) rotate(${angle}deg)`;
        setTimeout(removeTopCard, 200);

        try {
            await fetch(GOOGLE_SHEET_API_URL, {
                method: 'POST',
                mode: 'no-cors', // Important for Apps Script
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ filename, action })
            });
        } catch (error) {
            console.error('Error updating sheet:', error);
        }
    }

    function shareOnWhatsApp(filename, fileUrl) {
        const message = encodeURIComponent(`Hi, I'm interested in this product: ${filename}\n\n${fileUrl}`);
        window.open(`https://wa.me/${WHATSAPP_PHONE_NUMBER}?text=${message}`, '_blank');
    }

    // --- Tinder-Style Swipe Logic ---
    function setupSwipeListeners() {
        let startX, startY, isDragging = false, card;

        function onPointerStart(e) {
            if (currentIndex >= productCards.length) return;
            card = productCards[currentIndex];
            startX = e.touches ? e.touches[0].clientX : e.clientX;
            startY = e.touches ? e.touches[0].clientY : e.clientY;
            isDragging = true;
            card.classList.add('dragging');
        }

        function onPointerMove(e) {
            if (!isDragging || !card) return;
            const currentX = e.touches ? e.touches[0].clientX : e.clientX;
            const currentY = e.touches ? e.touches[0].clientY : e.clientY;
            const deltaX = currentX - startX;
            const deltaY = currentY - startY;

            // Prevent vertical scroll from triggering swipe
            if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 10) {
                 isDragging = false;
                 card.style.transform = '';
                 return;
            }

            const rotate = deltaX * 0.1;
            card.style.transform = `translateX(${deltaX}px) rotate(${rotate}deg)`;
        }

        function onPointerEnd(e) {
            if (!isDragging || !card) return;
            isDragging = false;
            card.classList.remove('dragging');
            const deltaX = (e.changedTouches ? e.changedTouches[0].clientX : e.clientX) - startX;
            
            if (Math.abs(deltaX) > 100) { // Threshold for a swipe
                const action = deltaX > 0 ? 'like' : 'dislike';
                handleLikeDislike(card.dataset.name, action, card);
            } else {
                card.style.transform = ''; // Reset card position
            }
        }
        
        galleryContainer.addEventListener('mousedown', onPointerStart);
        galleryContainer.addEventListener('mousemove', onPointerMove);
        galleryContainer.addEventListener('mouseup', onPointerEnd);
        galleryContainer.addEventListener('mouseleave', onPointerEnd);
        galleryContainer.addEventListener('touchstart', onPointerStart, { passive: true });
        galleryContainer.addEventListener('touchmove', onPointerMove, { passive: true });
        galleryContainer.addEventListener('touchend', onPointerEnd);
    }
    
    function removeTopCard() {
        if (currentIndex < productCards.length) {
            const card = productCards[currentIndex];
            card.style.display = 'none';
            currentIndex++;
            if (currentIndex >= productCards.length) {
                displayMessage("That's all for now!");
            }
        }
    }

    // Desktop animation setup
    function setupIntersectionObserver() {
        // ... (same as before)
    }
    function displayMessage(message) {
        // ... (same as before)
    }

    fetchAndDisplayProducts();
});

