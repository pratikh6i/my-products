document.addEventListener('DOMContentLoaded', () => {
    // --- ⭐ FINAL CONFIGURATION ⭐ ---
    const GITHUB_USERNAME = 'pratikh6i';
    const GITHUB_REPO = 'my-products';
    const GOOGLE_SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbwD38HiebQGUM8z4rTSDsEojY793LbOCLG2b2St6tN7dC-KSb4ZV6lw76ZB8gxol-Ui/exec';
    const WHATSAPP_PHONE_NUMBER = '917972711924';
    
    // --- NEW: Unique User Identifier ---
    let userId = localStorage.getItem('sparkChoiceUserId');
    if (!userId) {
        userId = crypto.randomUUID();
        localStorage.setItem('sparkChoiceUserId', userId);
    }

    // --- DOM Elements ---
    const galleryContainer = document.getElementById('gallery-container');
    const statusMessage = document.getElementById('statusMessage');
    const searchInput = document.getElementById('searchInput');
    const searchIcon = document.getElementById('searchIcon');
    const favoritesButton = document.getElementById('favoritesButton');
    const favoritesModal = document.getElementById('favoritesModal');
    const closeModalButton = document.getElementById('closeModalButton');
    const favoritesGrid = document.getElementById('favoritesGrid');
    const restartButton = document.getElementById('restartButton');

    let allMediaFiles = [];
    let viewStartTime = null;
    let currentVisibleCard = null;

    // --- Main Initialization ---
    async function initializeGallery() { /* ... same as before, fetches and builds cards ... */ }
    
    // --- Card Creation and Rendering ---
    function renderGallery(mediaFiles) { /* ... same as before ... */ }
    function createProductCard(filename, fileUrl) { /* ... same as before, builds card HTML ... */ }

    // --- Analytics and Voting Logic ---
    async function sendAnalytics(type, data) {
        const payload = { userId, type, ...data, timestamp: new Date().toISOString() };
        try {
            await fetch(GOOGLE_SHEET_API_URL, {
                method: 'POST', mode: 'no-cors',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });
        } catch (error) { console.error('Analytics Error:', error); }
    }

    function handleLikeDislike(filename, action, card) {
        if (localStorage.getItem(`vote_${filename}`)) return;
        
        card.querySelector(`.interaction-button.${action}`).classList.add('voted');
        localStorage.setItem(`vote_${filename}`, action);

        sendAnalytics('vote', { filename, action });

        if (action === 'like') {
            const likedItems = JSON.parse(localStorage.getItem('likedItems') || '[]');
            const itemUrl = card.querySelector('.product-card-media').src;
            if (!likedItems.some(item => item.filename === filename)) {
                likedItems.push({ filename, url: itemUrl });
                localStorage.setItem('likedItems', JSON.stringify(likedItems));
            }
        }
    }

    // --- Favorites Modal Logic ---
    function showFavorites() { /* ... function to build and show the modal ... */ }

    // --- Intersection Observer for Analytics and Video Playback ---
    function setupIntersectionObserver() {
        const options = { root: galleryContainer, threshold: 0.75 };
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const card = entry.target;
                const video = card.querySelector('video');

                if (entry.isIntersecting) {
                    if (video) video.play();
                    
                    // Start view timer if it's a new card
                    if (card !== currentVisibleCard) {
                        // Log duration for the previous card
                        if (currentVisibleCard && viewStartTime) {
                            const duration = Date.now() - viewStartTime;
                            sendAnalytics('view', { filename: currentVisibleCard.dataset.name, duration });
                        }
                        // Start timer for the new card
                        currentVisibleCard = card;
                        viewStartTime = Date.now();
                    }
                } else {
                    if (video) video.pause();
                }
            });
        }, options);

        document.querySelectorAll('.product-card').forEach(card => observer.observe(card));
    }

    // --- Event Listeners ---
    restartButton.addEventListener('click', () => {
        galleryContainer.scrollTo({ top: 0, behavior: 'smooth' });
    });
    favoritesButton.addEventListener('click', showFavorites);
    closeModalButton.addEventListener('click', () => favoritesModal.style.display = 'none');
    
    initializeGallery();
});

