document.addEventListener('DOMContentLoaded', () => {
    // --- ⭐ FINAL CONFIGURATION ⭐ ---
    const GITHUB_USERNAME = 'pratikh6i';
    const GITHUB_REPO = 'my-products';
    const GOOGLE_SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbyUp6v1siZRQW1ydR61hLrLMwgXrHofKJNNjHsjxYU7n8Qy8Q_syQFuEFkCK9B3i1Sr/exec';
    const WHATSAPP_PHONE_NUMBER = '917972711924';
    
    // --- Unique User Identifier ---
    const userId = localStorage.getItem('sparkChoiceUserId') || crypto.randomUUID();
    localStorage.setItem('sparkChoiceUserId', userId);

    // --- DOM Elements & State ---
    const galleryContainer = document.getElementById('gallery-container');
    const statusMessage = document.getElementById('statusMessage');
    const backgroundGlow = document.getElementById('backgroundGlow');
    // ... other DOM elements
    const favoritesButton = document.getElementById('favoritesButton');
    const favoritesModal = document.getElementById('favoritesModal');
    const closeModalButton = document.getElementById('closeModalButton');
    const favoritesGrid = document.getElementById('favoritesGrid');
    const searchIcon = document.getElementById('searchIcon');
    const searchInput = document.getElementById('searchInput');

    let allMediaFiles = [];
    let viewStartTime = null;
    let currentVisibleCardWrapper = null;
    let isScrollingPermitted = true;
    const colorThief = new ColorThief();
    // ✅ Using the robust votes object for state management
    let votes = JSON.parse(localStorage.getItem('votes') || '{}');
    let likedItems = JSON.parse(localStorage.getItem('likedItems') || '[]');

    // --- Main Initialization ---
    async function initializeGallery() {
        try {
            const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/products`);
            if (!response.ok) throw new Error(`Network response error: ${response.statusText}`);
            const files = await response.json();
            
            allMediaFiles = files
                .filter(file => file.type === 'file' && /\.(jpg|jpeg|png|gif|webp|mp4|webm|mov)$/i.test(file.name))
                .map(file => ({
                    name: file.name,
                    url: `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${GITHUB_REPO}/main/${file.path}`
                }));

            if (allMediaFiles.length === 0) throw new Error("No products found.");
            
            statusMessage.style.display = 'none';
            renderGallery();
            setupStrictScrolling();

        } catch (error) {
            console.error("Initialization Failed:", error);
            statusMessage.innerHTML = `<p>Error: Could not load collection.<br><small>${error.message}</small></p>`;
        }
    }
    
    function renderGallery() {
        allMediaFiles.forEach(file => galleryContainer.appendChild(createCard(file)));
        galleryContainer.appendChild(createRestartCard());
        setupIntersectionObserver();
    }

    function createCard(file) {
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
            if (media.tagName === 'IMG' && media.complete) {
                setAmbilight(media);
            }
        };
        media.src = file.url;
        
        if (media.tagName === 'VIDEO') {
            media.muted = true; media.loop = true; media.playsInline = true;
        }
        card.appendChild(media);
        
        const interactions = document.createElement('div');
        interactions.className = 'card-interactions';
        
        const createBtn = (content, action, type) => {
            const btn = document.createElement('button');
            btn.className = `interaction-button ${type}-btn`;
            btn.textContent = content;
            btn.onclick = (e) => { e.stopPropagation(); action(); };
            return btn;
        };
        
        interactions.appendChild(createBtn('👍', () => handleLikeDislike(file, 'like'), 'like'));
        interactions.appendChild(createBtn('👎', () => handleLikeDislike(file, 'dislike'), 'dislike'));
        interactions.appendChild(createBtn('💬', () => shareOnWhatsApp(file.name, file.url), 'whatsapp'));
        
        wrapper.appendChild(interactions);
        
        updateVoteUI(file.name, wrapper);
        return wrapper;
    }

    function createRestartCard() { /* ... same as previous version ... */ }

    function setAmbilight(image) {
        try {
            const color = colorThief.getColor(image);
            const gradient = `radial-gradient(circle, rgb(${color.join(',')}) 0%, var(--bg-color) 70%)`;
            backgroundGlow.style.setProperty('--dominant-color-gradient', gradient);
        } catch (e) { /* fail silently */ }
    }

    // --- ✅ Merged & Corrected Vote Logic ---
    function handleLikeDislike(file, newAction) {
        const filename = file.name;
        const previousAction = votes[filename];
        let analyticsAction = newAction;

        if (previousAction === newAction) { // User is un-voting
            analyticsAction = `un${newAction}`;
            delete votes[filename];
        } else { // New vote or changing vote
            if (previousAction) analyticsAction = `changed_to_${newAction}`;
            votes[filename] = newAction;
        }
        
        localStorage.setItem('votes', JSON.stringify(votes));
        
        // Update liked items for favorites list
        if (votes[filename] === 'like') {
            if (!likedItems.some(item => item.filename === filename)) {
                likedItems.push({ filename, url: file.url });
            }
        } else {
            likedItems = likedItems.filter(item => item.filename !== filename);
        }
        localStorage.setItem('likedItems', JSON.stringify(likedItems));
        
        const type = previousAction ? 'vote_update' : 'vote';
        sendAnalytics(type, { filename, action: analyticsAction });
        
        const wrapper = document.querySelector(`.card-wrapper[data-name="${filename}"]`);
        updateVoteUI(filename, wrapper);
    }
    
    function updateVoteUI(filename, wrapper) {
        if (!wrapper) return;
        const likeBtn = wrapper.querySelector('.like-btn');
        const dislikeBtn = wrapper.querySelector('.dislike-btn');
        if (!likeBtn || !dislikeBtn) return;
        
        likeBtn.classList.toggle('selected', votes[filename] === 'like');
        dislikeBtn.classList.toggle('selected', votes[filename] === 'dislike');
    }

    // --- Other Functions ---
    function setupStrictScrolling() { /* ... same as previous version ... */ }
    function setupIntersectionObserver() { /* ... same as previous version ... */ }
    function showFavorites() { /* ... same as previous version ... */ }
    async function sendAnalytics(type, data) { /* ... same as previous version ... */ }
    function shareOnWhatsApp(filename, fileUrl) { /* ... same as previous version ... */ }
    
    // --- Event Listeners ---
    searchIcon.addEventListener('click', () => searchInput.classList.toggle('active'));
    // ... other event listeners
    favoritesButton.addEventListener('click', showFavorites);
    closeModalButton.addEventListener('click', () => favoritesModal.style.display = 'none');

    // --- Start the App ---
    initializeGallery();
});

