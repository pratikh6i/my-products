document.addEventListener('DOMContentLoaded', () => {

    // --- ⭐ FINAL CONFIGURATION (FOR GITHUB & GOOGLE SHEETS) ⭐ ---
    const GITHUB_USERNAME = 'pratikh6i';
    const GITHUB_REPO = 'my-products';
    const WHATSAPP_NUMBER = '919548172711'; // Updated phone number.
    const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwYyYjR4n4g7V4h8N3v8z3f7d4gY6f_5R2q9c8K3b1/exec'; // Please replace with your actual URL.
    const PRODUCTS_FOLDER = 'products';
    const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${PRODUCTS_FOLDER}`;
    // --- END OF CONFIGURATION ---

    // --- Element Selectors ---
    const galleryContainer = document.getElementById('gallery-container');
    const statusMessage = document.getElementById('statusMessage');
    const searchInput = document.getElementById('searchInput');
    const searchIcon = document.getElementById('searchIcon');
    const fullscreenModal = document.getElementById('fullscreen-modal');
    const modalContent = document.getElementById('modal-content');
    const closeModalBtn = document.querySelector('.close-button');

    // --- State Management ---
    let userId = getUserId();
    let userVotes = JSON.parse(localStorage.getItem('userVotes')) || {};
    let viewStartTime = null;
    let currentVisibleProduct = null;
    let currentlyGlowingCard = null;
    const colorThief = new ColorThief();

    // --- Initial Setup ---
    fetchAndDisplayProducts();

    function getUserId() {
        let id = localStorage.getItem('sparkChoiceUserId');
        if (!id) {
            id = Date.now().toString(36) + Math.random().toString(36).substring(2);
            localStorage.setItem('sparkChoiceUserId', id);
        }
        return id;
    }

    async function fetchAndDisplayProducts() {
        try {
            const response = await fetch(GITHUB_API_URL);
            if (!response.ok) throw new Error(`GitHub API Error: ${response.status}. Check username/repo and ensure it's public.`);
            
            const files = await response.json();
            const mediaFiles = files.filter(file =>
                file.type === 'file' && /\.(jpg|jpeg|png|gif|webp|mp4|webm|mov)$/i.test(file.name)
            );

            if (!mediaFiles || mediaFiles.length === 0) {
                displayMessage("No products found. Add media to the 'products' folder on GitHub.");
                return;
            }
            
            statusMessage.style.display = 'none';
            galleryContainer.innerHTML = ''; // Clear loader

            // 1. Add Intro Card to prompt scrolling
            galleryContainer.appendChild(createIntroCard());

            // 2. Add all product cards
            mediaFiles.forEach(file => {
                const productCard = createProductCard(file.name, file.download_url);
                galleryContainer.appendChild(productCard);
            });

            // 3. Add the End Card with "Scroll to Top"
            galleryContainer.appendChild(createEndCard());

            setupIntersectionObserver();

        } catch (error) {
            console.error('Failed to fetch products:', error);
            displayMessage(error.message);
        }
    }

    function createProductCard(filename, fileUrl) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.dataset.filename = filename; // Use 'filename' consistently

        const productName = filename.split('.')[0].replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        card.dataset.name = productName.toLowerCase();
        
        const isVideo = /\.(mp4|webm|mov)$/i.test(filename);
        
        let mediaElement;
        if (isVideo) {
            mediaElement = document.createElement('video');
            mediaElement.src = fileUrl;
            mediaElement.autoplay = true; mediaElement.loop = true;
            mediaElement.muted = true; mediaElement.playsInline = true;
        } else {
            mediaElement = document.createElement('img');
            mediaElement.src = fileUrl;
            mediaElement.alt = productName;
            mediaElement.loading = 'lazy';
            mediaElement.crossOrigin = "Anonymous"; // Required for Color Thief
            mediaElement.addEventListener('load', () => card.dataset.isImageLoaded = 'true');
        }
        mediaElement.className = 'product-card-media';
        
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'product-card-actions';

        const likeBtn = createActionButton('like', handleVote);
        const whatsappBtn = createActionButton('whatsapp', () => {
            const text = `Hi, I'm interested in this product: ${productName}`;
            window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank');
        });

        if (userVotes[filename] === 'like') likeBtn.classList.add('voted');
        
        actionsContainer.append(likeBtn, whatsappBtn);
        card.append(mediaElement, actionsContainer);

        mediaElement.addEventListener('click', () => openModal(fileUrl, isVideo));
        return card;
    }
    
    function createActionButton(type, onClickHandler) {
        const button = document.createElement('button');
        button.className = `action-button ${type}-btn`;
        button.dataset.type = type;

        const icons = {
            like: `<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`,
            whatsapp: `<img src="https://raw.githubusercontent.com/pratikh6i/my-products/main/products/statick-media/WhatsApp%20Messenger.webp" alt="WhatsApp">`
        };
        button.innerHTML = icons[type];
        button.addEventListener('click', onClickHandler);
        return button;
    }

    function setupIntersectionObserver() {
        const options = { root: null, threshold: 0.6 }; // Trigger when 60% is visible
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const card = entry.target;
                if (!card.dataset.filename) return; // Ignore intro/end cards
                
                const filename = card.dataset.filename;

                if (entry.isIntersecting) {
                    if (currentVisibleProduct !== filename) {
                        logViewDuration(); // Log duration for the previous item
                        currentVisibleProduct = filename;
                        viewStartTime = Date.now(); // Start timer for new item
                        
                        const img = card.querySelector('img');
                        if (img && card.dataset.isImageLoaded === 'true') {
                            updateGlow(card, img);
                        } else {
                            updateGlow(card, null); // Reset for videos
                        }
                    }
                }
            });
        }, options);

        document.querySelectorAll('.product-card').forEach(card => observer.observe(card));
        
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') logViewDuration();
        });
    }
    
    function handleVote(e) {
        const button = e.currentTarget;
        const card = button.closest('.product-card');
        const filename = card.dataset.filename;
        
        const currentVote = userVotes[filename];
        let newAction = 'like';

        if (currentVote === 'like') {
            newAction = 'unlike'; // Send 'unlike' when deselecting
        }

        userVotes[filename] = (newAction === 'like') ? 'like' : undefined;
        localStorage.setItem('userVotes', JSON.stringify(userVotes));
        
        updateVoteUI(card, newAction);

        sendDataToSheet('vote', {
            userId: userId,
            filename: filename, // FIX: Key is 'filename'
            action: newAction,  // FIX: Key is 'action'
            timestamp: new Date().toISOString()
        });
    }

    function logViewDuration() {
        if (viewStartTime && currentVisibleProduct) {
            const duration = Date.now() - viewStartTime; // Duration in milliseconds
            if (duration > 1000) { // Only log views longer than 1 second
                sendDataToSheet('view', {
                    userId: userId,
                    filename: currentVisibleProduct, // FIX: Key is 'filename'
                    duration: duration,
                    timestamp: new Date().toISOString()
                });
            }
        }
        viewStartTime = null;
        currentVisibleProduct = null;
    }

    async function sendDataToSheet(type, payload) {
        if (WEB_APP_URL.includes('YOUR_DEPLOYMENT_ID')) {
            console.warn('Analytics Disabled: Please set your WEB_APP_URL in script.js', payload);
            return;
        }
        try {
            // Using text/plain is more reliable with Apps Script's doPost redirect behavior
            const response = await fetch(WEB_APP_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ type, ...payload }) // The Apps Script will parse this string
            });
            console.log('Analytics data sent.');
        } catch (error) {
            console.error('Failed to send analytics:', error);
        }
    }

    // --- UI & UX Functions ---
    function displayMessage(message) {
        statusMessage.style.display = 'flex';
        statusMessage.innerHTML = `<p>${message}</p>`;
    }

    function handleSearch() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        document.querySelectorAll('.product-card').forEach(card => {
            const productName = card.dataset.name || '';
            card.style.display = productName.includes(searchTerm) ? 'flex' : 'none';
        });
    }
    
    function updateVoteUI(card, action) {
        const likeBtn = card.querySelector('.like-btn');
        if (action === 'like') {
            likeBtn.classList.add('voted');
        } else {
            likeBtn.classList.remove('voted');
        }
    }

    function openModal(src, isVideo) {
        modalContent.innerHTML = '';
        let mediaElement = document.createElement(isVideo ? 'video' : 'img');
        mediaElement.src = src;
        if (isVideo) {
            mediaElement.controls = true;
            mediaElement.autoplay = true;
        }
        modalContent.appendChild(mediaElement);
        fullscreenModal.classList.add('visible');
    }

    function closeModal() {
        fullscreenModal.classList.remove('visible');
        modalContent.innerHTML = '';
    }

    function updateGlow(card, img) {
        if (currentlyGlowingCard && currentlyGlowingCard !== card) {
            currentlyGlowingCard.classList.remove('is-glowing');
        }
        
        if (img) {
            try {
                const [r, g, b] = colorThief.getColor(img);
                card.style.setProperty('--glow-color', `rgba(${r}, ${g}, ${b}, 0.6)`);
            } catch (e) {
                card.style.setProperty('--glow-color', 'rgba(255, 193, 7, 0.4)');
            }
        } else { // For videos or if color thief fails
            card.style.setProperty('--glow-color', 'rgba(255, 193, 7, 0.4)');
        }
        card.classList.add('is-glowing');
        currentlyGlowingCard = card;
    }

    function createIntroCard() {
        const card = document.createElement('div');
        card.className = 'intro-card';
        card.innerHTML = `
            <div>
                <h2>Welcome to the Collection</h2>
                <p>Scroll up to explore the latest designs</p>
                <div class="scroll-prompt-animation">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
                </div>
            </div>
        `;
        // Make the intro card snap to the bottom to hint at the content above
        card.style.scrollSnapAlign = 'end';
        return card;
    }

    function createEndCard() {
        const card = document.createElement('div');
        card.className = 'end-card';
        card.innerHTML = `
            <div>
                <h2>You've reached the end!</h2>
                <p>Thank you for exploring the collection.</p>
                <br>
                <button id="scrollToTopBtn">Scroll to Top</button>
            </div>
        `;
        card.querySelector('#scrollToTopBtn').addEventListener('click', () => {
            galleryContainer.scrollTo({ top: 0, behavior: 'smooth' });
        });
        return card;
    }

    // --- Event Listeners ---
    searchIcon.addEventListener('click', () => {
        searchInput.classList.toggle('active');
        searchInput.focus();
    });
    searchInput.addEventListener('input', handleSearch);
    closeModalBtn.addEventListener('click', closeModal);
    fullscreenModal.addEventListener('click', (e) => {
        if (e.target === fullscreenModal) closeModal();
    });
});