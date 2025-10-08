document.addEventListener('DOMContentLoaded', () => {

    // --- ⭐ FINAL CONFIGURATION (FOR GITHUB & GOOGLE SHEETS) ⭐ ---
    //
    // 1. ⚠️ ACTION REQUIRED: Replace these values with your details.
    const GITHUB_USERNAME = 'pratikh6i';
    const GITHUB_REPO = 'my-products';
    const WHATSAPP_NUMBER = '919876543210'; // Use country code, no '+', no spaces.
    
    // 2. ⚠️ ACTION REQUIRED: Deploy your Google Apps Script and paste the Web App URL here.
    const WEB_APP_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec'; 

    // 3. IMPORTANT: Ensure filenames in the 'products' folder do NOT contain
    //    special characters like '#' or '?'. Use only letters, numbers, hyphens, and underscores.
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
    const globalWhatsappLink = document.getElementById('global-whatsapp-link');

    // --- State Management ---
    let userId = getUserId();
    let userVotes = JSON.parse(localStorage.getItem('userVotes')) || {};
    let viewStartTime = null;
    let currentVisibleProduct = null;
    const colorThief = new ColorThief();

    // --- Initial Setup ---
    globalWhatsappLink.href = `https://wa.me/${WHATSAPP_NUMBER}?text=Hi,%20I'm%20interested%20in%20your%20products!`;
    fetchAndDisplayProducts();


    /**
     * Generates or retrieves a unique user ID from localStorage.
     * @returns {string} The unique user ID.
     */
    function getUserId() {
        let id = localStorage.getItem('sparkChoiceUserId');
        if (!id) {
            id = Date.now().toString(36) + Math.random().toString(36).substring(2);
            localStorage.setItem('sparkChoiceUserId', id);
        }
        return id;
    }

    /**
     * Fetches product list from GitHub API and populates the gallery.
     */
    async function fetchAndDisplayProducts() {
        try {
            const response = await fetch(GITHUB_API_URL);
            if (!response.ok) {
                throw new Error(`GitHub API Error: ${response.status}. Check username/repo settings and ensure the repository is public.`);
            }
            const files = await response.json();

            const mediaFiles = files.filter(file =>
                file.type === 'file' && /\.(jpg|jpeg|png|gif|webp|mp4|webm|mov)$/i.test(file.name)
            );

            if (!Array.isArray(mediaFiles) || mediaFiles.length === 0) {
                displayMessage("No products found. Add media to the 'products' folder on GitHub.");
                return;
            }

            statusMessage.style.display = 'none';
            mediaFiles.forEach(file => {
                const productCard = createProductCard(file.name, file.download_url);
                galleryContainer.appendChild(productCard);
            });

            setupIntersectionObserver();

        } catch (error) {
            console.error('Failed to fetch products:', error);
            displayMessage(error.message);
        }
    }

    /**
     * Creates a product card element with all its interactive components.
     * @param {string} filename - The name of the media file.
     * @param {string} fileUrl - The direct download URL for the media.
     * @returns {HTMLElement} The complete product card element.
     */
    function createProductCard(filename, fileUrl) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.dataset.productId = filename; // Unique identifier for analytics

        const productName = filename.split('.')[0].replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        card.dataset.name = productName.toLowerCase();
        
        const fileExtension = filename.split('.').pop().toLowerCase();
        const isVideo = ['mp4', 'webm', 'mov'].includes(fileExtension);
        
        let mediaElement;
        if (isVideo) {
            mediaElement = document.createElement('video');
            mediaElement.src = fileUrl;
            mediaElement.autoplay = true;
            mediaElement.loop = true;
            mediaElement.muted = true;
            mediaElement.playsInline = true;
        } else {
            mediaElement = document.createElement('img');
            mediaElement.src = fileUrl;
            mediaElement.alt = productName;
            mediaElement.loading = 'lazy';
            mediaElement.crossOrigin = "Anonymous"; // Required for Color Thief
            mediaElement.addEventListener('load', () => {
                card.dataset.isImageLoaded = 'true'; // Flag for observer
            });
        }
        mediaElement.className = 'product-card-media';
        
        // --- Interactive Elements ---
        const nameLabel = document.createElement('div');
        nameLabel.className = 'product-name';
        nameLabel.textContent = productName;

        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'product-card-actions';

        const likeBtn = createActionButton('like', handleVote);
        const dislikeBtn = createActionButton('dislike', handleVote);
        const whatsappBtn = createActionButton('whatsapp', () => {
            const text = `Hi, I'm interested in this product: ${productName}`;
            window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank');
        });

        // Set initial voted state
        if (userVotes[filename] === 'like') likeBtn.classList.add('voted');
        if (userVotes[filename] === 'dislike') dislikeBtn.classList.add('voted');
        
        actionsContainer.append(likeBtn, dislikeBtn, whatsappBtn);
        card.append(mediaElement, nameLabel, actionsContainer);

        // Event listener for fullscreen view
        mediaElement.addEventListener('click', () => openModal(fileUrl, isVideo));

        return card;
    }
    
    /**
     * Helper to create action buttons for the card.
     * @param {string} type - 'like', 'dislike', or 'whatsapp'.
     * @param {Function} onClickHandler - The function to call on click.
     * @returns {HTMLElement} The button element.
     */
    function createActionButton(type, onClickHandler) {
        const button = document.createElement('button');
        button.className = `action-button ${type}-btn`;
        button.dataset.type = type;

        const icons = {
            like: `<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`,
            dislike: `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
            whatsapp: `<svg viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.886-.001 2.269.655 4.357 1.846 6.067l-1.259 4.605 4.74-1.241z"/></svg>`
        };
        button.innerHTML = icons[type];
        button.addEventListener('click', onClickHandler);
        return button;
    }

    /**
     * Sets up the Intersection Observer to track view time and trigger effects.
     */
    function setupIntersectionObserver() {
        const options = { root: galleryContainer, threshold: 0.8 };
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const card = entry.target;
                const productId = card.dataset.productId;

                if (entry.isIntersecting) { // Product scrolled INTO view
                    if (currentVisibleProduct !== productId) {
                        // Log duration for the PREVIOUS item before switching
                        logViewDuration(); 
                        
                        // Start timer for the NEW item
                        currentVisibleProduct = productId;
                        viewStartTime = Date.now();

                        // Trigger dynamic theme
                        const img = card.querySelector('img');
                        if (img && card.dataset.isImageLoaded === 'true') {
                            updateAmbilight(img);
                        } else {
                            resetAmbilight(); // Reset for videos or unloaded images
                        }
                    }
                }
            });
        }, options);

        document.querySelectorAll('.product-card').forEach(card => observer.observe(card));
        
        // Add a listener to log duration when user leaves the page
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                logViewDuration();
            }
        });
    }
    
    /**
     * Handles the logic for liking or disliking a product.
     * @param {Event} e - The click event.
     */
    function handleVote(e) {
        const button = e.currentTarget;
        const card = button.closest('.product-card');
        const productId = card.dataset.productId;
        const voteType = button.dataset.type;

        const currentVote = userVotes[productId];
        let newVote = voteType;

        // If clicking the same button again, un-vote
        if (currentVote === voteType) {
            newVote = 'none'; 
        }

        userVotes[productId] = newVote;
        localStorage.setItem('userVotes', JSON.stringify(userVotes));
        
        updateVoteUI(card, newVote);

        sendDataToSheet('vote', {
            userId: userId,
            productId: productId,
            vote: newVote,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Logs the view duration of the currently visible product.
     */
    function logViewDuration() {
        if (viewStartTime && currentVisibleProduct) {
            const duration = Math.round((Date.now() - viewStartTime) / 1000); // Duration in seconds
            if (duration > 1) { // Only log meaningful views
                sendDataToSheet('analytics', {
                    userId: userId,
                    productId: currentVisibleProduct,
                    duration: duration,
                    timestamp: new Date().toISOString()
                });
            }
        }
        // Reset timer
        viewStartTime = null;
        currentVisibleProduct = null;
    }

    /**
     * Generic function to send data to the Google Apps Script backend.
     * @param {string} type - The endpoint type ('vote' or 'analytics').
     * @param {object} payload - The data object to send.
     */
    async function sendDataToSheet(type, payload) {
        // Do not send analytics if the placeholder URL is still there
        if (WEB_APP_URL.includes('YOUR_DEPLOYMENT_ID')) {
            console.warn('Analytics Disabled: Please set your WEB_APP_URL in script.js');
            return;
        }
        
        try {
            await fetch(WEB_APP_URL, {
                method: 'POST',
                mode: 'no-cors', // Important for sending to Google Scripts from a different origin
                cache: 'no-cache',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, ...payload })
            });
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
        let firstMatch = null;
        document.querySelectorAll('.product-card').forEach(card => {
            const productName = card.dataset.name || '';
            const isMatch = productName.includes(searchTerm);
            card.style.display = isMatch ? 'flex' : 'none';
            if (isMatch && !firstMatch) {
                firstMatch = card;
            }
        });
        // On desktop, hiding is enough. On mobile, we need to ensure scroll-snap works.
        // A simple fix is to scroll to the first match.
        if (firstMatch && window.innerWidth < 768) {
            firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    
    function updateVoteUI(card, vote) {
        const likeBtn = card.querySelector('.like-btn');
        const dislikeBtn = card.querySelector('.dislike-btn');
        likeBtn.classList.remove('voted');
        dislikeBtn.classList.remove('voted');

        if (vote === 'like') likeBtn.classList.add('voted');
        if (vote === 'dislike') dislikeBtn.classList.add('voted');
    }

    function openModal(src, isVideo) {
        modalContent.innerHTML = '';
        let mediaElement;
        if (isVideo) {
            mediaElement = document.createElement('video');
            mediaElement.src = src;
            mediaElement.controls = true;
            mediaElement.autoplay = true;
        } else {
            mediaElement = document.createElement('img');
            mediaElement.src = src;
        }
        modalContent.appendChild(mediaElement);
        fullscreenModal.classList.add('visible');
    }

    function closeModal() {
        fullscreenModal.classList.remove('visible');
        modalContent.innerHTML = ''; // Stop video playback
    }

    function updateAmbilight(img) {
        try {
            const [r, g, b] = colorThief.getColor(img);
            document.documentElement.style.setProperty('--glow-color', `rgba(${r}, ${g}, ${b}, 0.5)`);
        } catch (e) {
            console.error('ColorThief error:', e);
            resetAmbilight();
        }
    }

    function resetAmbilight() {
        document.documentElement.style.setProperty('--glow-color', 'rgba(255, 193, 7, 0.5)');
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