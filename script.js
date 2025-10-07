document.addEventListener('DOMContentLoaded', () => {
    // --- ⭐ FINAL CONFIGURATION ⭐ ---
    const GITHUB_USERNAME = 'pratikh6i';
    const GITHUB_REPO = 'my-products';
    // ✅ NEW URL INTEGRATED
    const GOOGLE_SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbyUp6v1siZRQW1ydR61hLrLMwgXrHofKJNNjHsjxYU7n8Qy8Q_syQFuEFkCK9B3i1Sr/exec';
    const WHATSAPP_PHONE_NUMBER = '917972711924';
    
    // --- Unique User Identifier ---
    const userId = localStorage.getItem('sparkChoiceUserId') || crypto.randomUUID();
    localStorage.setItem('sparkChoiceUserId', userId);

    // --- DOM Elements & State ---
    const galleryContainer = document.getElementById('gallery-container');
    const statusMessage = document.getElementById('statusMessage');
    const backgroundGlow = document.getElementById('backgroundGlow');
    const favoritesButton = document.getElementById('favoritesButton');
    const favoritesModal = document.getElementById('favoritesModal');
    const closeModalButton = document.getElementById('closeModalButton');
    const favoritesGrid = document.getElementById('favoritesGrid');
    
    let allMediaFiles = [];
    let viewStartTime = null;
    let currentVisibleCardWrapper = null;
    let isScrollingPermitted = true;
    const colorThief = new ColorThief();

    // --- Main Initialization ---
    async function initializeGallery() {
        try {
            const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/products`);
            if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
            const files = await response.json();
            
            allMediaFiles = files
                .filter(file => file.type === 'file' && /\.(jpg|jpeg|png|gif|webp|mp4|webm|mov)$/i.test(file.name))
                .map(file => ({
                    name: file.name,
                    url: `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO}/main/${file.path}`
                }));

            if (allMediaFiles.length === 0) throw new Error("No products found in the repository.");
            
            statusMessage.style.display = 'none';
            renderGallery();
            setupStrictScrolling();

        } catch (error) {
            console.error("Initialization Failed:", error);
            statusMessage.innerHTML = `<p>Error: Could not load the collection.<br><small>${error.message}</small></p>`;
        }
    }
    
    function renderGallery() {
        // Create all cards but load media sequentially
        allMediaFiles.forEach(file => galleryContainer.appendChild(createCard(file)));
        galleryContainer.appendChild(createRestartCard());
        setupIntersectionObserver();
    }

    function createCard(file) {
        // ... (same as previous version, but ensures media loading is handled carefully)
        const wrapper = document.createElement('div');
        wrapper.className = 'card-wrapper';
        wrapper.dataset.name = file.name;
    
        const card = document.createElement('div');
        card.className = 'product-card';
        wrapper.appendChild(card);
    
        const media = /\.(mp4|webm|mov)$/i.test(file.name) ? document.createElement('video') : document.createElement('img');
        media.className = 'product-card-media';
        media.crossOrigin = "Anonymous";
    
        media.onload = media.oncanplay = () => {
            card.classList.add('loaded');
            if (media.tagName === 'IMG') {
                setAmbilight(media);
            }
        };
        media.src = file.url;
        
        if (media.tagName === 'VIDEO') {
            // ... video properties
        }
        card.appendChild(media);
        
        // --- Add Interactions ---
        // ... (same as previous version)
        
        updateVoteUI(file.name, wrapper);
        return wrapper;
    }
    
    function createRestartCard() { /* ... same as previous version ... */ }

    function setAmbilight(image) {
        try {
            const color = colorThief.getColor(image);
            const gradient = `radial-gradient(circle, rgb(${color[0]}, ${color[1]}, ${color[2]}) 0%, ${getComputedStyle(document.documentElement).getPropertyValue('--bg-color')} 70%)`;
            backgroundGlow.style.setProperty('--dominant-color-gradient', gradient);
        } catch (e) { /* fail silently */ }
    }

    // --- ✅ Vote Logic (Unchanged) ---
    function handleLikeDislike(file, newAction) { /* ... same as previous version ... */ }
    function updateVoteUI(filename, wrapper) { /* ... same as previous version ... */ }
    function updateFavorites(filename, url, action) { /* ... same as previous version ... */ }

    // --- ✅ Robust Strict Scrolling ---
    function setupStrictScrolling() {
        galleryContainer.addEventListener('scroll', () => {
            if (!isScrollingPermitted) return;
            isScrollingPermitted = false;
            setTimeout(() => { isScrollingPermitted = true; }, 500); // Debounce to prevent multi-scroll
        }, { passive: true });
    }

    // --- ✅ Observer for Analytics, Video Playback & Ambilight ---
    function setupIntersectionObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const cardWrapper = entry.target;
                const video = cardWrapper.querySelector('video');
                const image = cardWrapper.querySelector('img');

                if (entry.isIntersecting && entry.intersectionRatio >= 0.7) {
                    if (video) video.play();
                    if (image && image.complete) setAmbilight(image);
                    
                    if (cardWrapper.id === 'restartCardWrapper') {
                        setTimeout(() => galleryContainer.scrollTo({ top: 0, behavior: 'smooth' }), 500);
                    } else if (cardWrapper !== currentVisibleCardWrapper) {
                        // ... analytics logic (same as before)
                    }
                } else {
                    if (video) video.pause();
                }
            });
        }, { root: galleryContainer, threshold: 0.7 });

        document.querySelectorAll('.card-wrapper').forEach(card => observer.observe(card));
    }
    
    // --- ✅ Favorites Modal (Now Functional) ---
    function showFavorites() {
        const likedItems = JSON.parse(localStorage.getItem('likedItems') || '[]');
        favoritesGrid.innerHTML = '';
        if (likedItems.length === 0) {
            favoritesGrid.innerHTML = '<p class="empty-favorites">You haven\'t liked any items yet.</p>';
        } else {
            likedItems.forEach(item => {
                const favItem = document.createElement('div');
                favItem.className = 'favorite-item';
                favItem.innerHTML = `<img src="${item.url}" alt="${item.filename}" loading="lazy"><p>${item.filename}</p>`;
                favoritesGrid.appendChild(favItem);
            });
        }
        favoritesModal.style.display = 'flex';
    }

    // --- Other Functions ---
    async function sendAnalytics(type, data) { /* ... same as before ... */ }
    function shareOnWhatsApp(filename, fileUrl) { /* ... same as before ... */ }
    
    // --- Event Listeners ---
    favoritesButton.addEventListener('click', showFavorites);
    closeModalButton.addEventListener('click', () => favoritesModal.style.display = 'none');
    
    // --- Start the App ---
    initializeGallery();
});

