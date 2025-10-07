document.addEventListener('DOMContentLoaded', () => {
    // --- ⭐ CONFIGURATION ⭐ ---
    const GITHUB_USERNAME = 'pratikh6i';
    const GITHUB_REPO = 'my-products';
    const GOOGLE_SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbwD38HiebQGUM8z4rTSDsEojY793LbOCLG2b2St6tN7dC-KSb4ZV6lw76ZB8gxol-Ui/exec';
    const WHATSAPP_PHONE_NUMBER = '917972711924';
    
    // --- Unique User Identifier ---
    let userId = localStorage.getItem('sparkChoiceUserId') || crypto.randomUUID();
    localStorage.setItem('sparkChoiceUserId', userId);

    // --- DOM Elements & State ---
    const galleryContainer = document.getElementById('gallery-container');
    const statusMessage = document.getElementById('statusMessage');
    const searchInput = document.getElementById('searchInput');
    const searchIcon = document.getElementById('searchIcon');
    const favoritesButton = document.getElementById('favoritesButton');
    const favoritesModal = document.getElementById('favoritesModal');
    const closeModalButton = document.getElementById('closeModalButton');
    const favoritesGrid = document.getElementById('favoritesGrid');
    
    let allMediaFiles = [];
    let viewStartTime = null;
    let currentVisibleCardWrapper = null;
    let isScrolling = false;
    const colorThief = new ColorThief();

    // --- Main Initialization ---
    async function initializeGallery() {
        try {
            statusMessage.style.display = 'flex';
            const response = await fetch(`https://script.google.com/macros/s/AKfycbyUp6v1siZRQW1ydR61hLrLMwgXrHofKJNNjHsjxYU7n8Qy8Q_syQFuEFkCK9B3i1Sr/exec`);
            if (!response.ok) throw new Error(`GitHub API Error: ${response.statusText}`);
            const files = await response.json();
            
            allMediaFiles = files
                .filter(file => file.type === 'file' && /\.(jpg|jpeg|png|gif|webp|mp4|webm|mov)$/i.test(file.name))
                .map(file => ({
                    name: file.name,
                    url: `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${GITHUB_REPO}/main/${file.path}`
                }));

            if (allMediaFiles.length === 0) { throw new Error("No products found."); }

            statusMessage.style.display = 'none';
            renderGallery();
            setupStrictScrolling();

        } catch (error) {
            statusMessage.innerHTML = `<p>${error.message}</p>`;
        }
    }
    
    function renderGallery() {
        allMediaFiles.forEach(file => galleryContainer.appendChild(createCard(file)));
        
        // Add the restart card for the seamless loop
        const restartCard = createRestartCard();
        galleryContainer.appendChild(restartCard);

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
        media.src = file.url;
        media.crossOrigin = "Anonymous"; // Required for ColorThief
        
        if (media.tagName === 'VIDEO') {
            media.autoplay = true; media.loop = true; media.muted = true; media.playsInline = true;
        } else {
            media.alt = file.name; media.loading = 'lazy';
            media.onload = () => setAmbilight(card, media);
        }
        card.appendChild(media);
        
        // --- Interactions with Emojis ---
        const interactions = document.createElement('div');
        interactions.className = 'card-interactions';
        
        const createBtn = (content, action) => {
            const btn = document.createElement('button');
            btn.className = 'interaction-button';
            btn.textContent = content;
            btn.onclick = () => action();
            return btn;
        };
        
        interactions.appendChild(createBtn('👍', () => handleLikeDislike(file, 'like', wrapper)));
        interactions.appendChild(createBtn('👎', () => handleLikeDislike(file, 'dislike', wrapper)));
        interactions.appendChild(createBtn('💬', () => shareOnWhatsApp(file.name, file.url)));
        
        wrapper.appendChild(interactions);
        updateVoteUI(file.name, wrapper);
        return wrapper;
    }

    function createRestartCard() {
        const wrapper = document.createElement('div');
        wrapper.className = 'card-wrapper';
        wrapper.id = 'restartCardWrapper';
        wrapper.innerHTML = `
            <div class="restart-content">
                <svg class="restart-icon" xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                <p>Viewing the collection again...</p>
            </div>`;
        return wrapper;
    }

    function setAmbilight(card, image) {
        try {
            const color = colorThief.getColor(image);
            card.style.setProperty('--dominant-color-gradient', `linear-gradient(45deg, rgb(${color[0]}, ${color[1]}, ${color[2]}), #2a1610)`);
        } catch (e) {
            console.error("Could not get color from image", e);
        }
    }

    // --- ⭐ Rewritten Vote Logic ---
    function handleLikeDislike(file, newAction) {
        const { name, url } = file;
        const voteKey = `vote_${name}`;
        const currentAction = localStorage.getItem(voteKey);
        let finalAction = newAction;
        let analyticsType = 'vote';

        if (currentAction === newAction) { // User is un-voting
            localStorage.removeItem(voteKey);
            finalAction = `un${newAction}`;
        } else { // New vote or changing vote
            if (currentAction) analyticsType = 'vote_update';
            localStorage.setItem(voteKey, newAction);
        }

        sendAnalytics(analyticsType, { filename: name, action: finalAction });
        updateVoteUI(name, document.querySelector(`.card-wrapper[data-name="${name}"]`));
        updateFavorites(name, url, finalAction);
    }
    
    function updateVoteUI(filename, wrapper) {
        if (!wrapper) return;
        const vote = localStorage.getItem(`vote_${filename}`);
        const likeBtn = wrapper.querySelectorAll('.interaction-button')[0];
        const dislikeBtn = wrapper.querySelectorAll('.interaction-button')[1];
        likeBtn.classList.toggle('selected', vote === 'like');
        dislikeBtn.classList.toggle('selected', vote === 'dislike');
    }

    function updateFavorites(filename, url, action) {
        let likedItems = JSON.parse(localStorage.getItem('likedItems') || '[]');
        if (action === 'like') {
            if (!likedItems.some(item => item.filename === filename)) {
                likedItems.push({ filename, url });
            }
        } else {
            likedItems = likedItems.filter(item => item.filename !== filename);
        }
        localStorage.setItem('likedItems', JSON.stringify(likedItems));
    }

    // --- ⭐ Strict Scrolling Logic ---
    function setupStrictScrolling() {
        let scrollTimeout;
        galleryContainer.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            isScrolling = true;
            scrollTimeout = setTimeout(() => { isScrolling = false; }, 150);
        });

        const handleScroll = (e) => {
            if (isScrolling) return;
            e.preventDefault();
            const delta = e.deltaY || e.changedTouches[0].clientY - (window.lastTouchY || 0);
            const direction = delta > 0 ? 1 : -1;
            const scrollAmount = galleryContainer.clientHeight * direction;
            galleryContainer.scrollBy({ top: scrollAmount, behavior: 'smooth' });
        };
        
        window.addEventListener('wheel', handleScroll, { passive: false });
        window.addEventListener('touchstart', e => { window.lastTouchY = e.changedTouches[0].clientY; }, { passive: true });
        window.addEventListener('touchend', handleScroll, { passive: false });
    }

    // --- Analytics & Video Playback Observer ---
    function setupIntersectionObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const cardWrapper = entry.target;
                const video = cardWrapper.querySelector('video');

                if (entry.isIntersecting && entry.intersectionRatio >= 0.75) {
                    if (video) video.play();
                    
                    if (cardWrapper.id === 'restartCardWrapper') {
                        setTimeout(() => galleryContainer.scrollTo({ top: 0, behavior: 'smooth' }), 500);
                    } else if (cardWrapper !== currentVisibleCardWrapper) {
                        if (currentVisibleCardWrapper && viewStartTime) {
                            const duration = Date.now() - viewStartTime;
                            sendAnalytics('view', { filename: currentVisibleCardWrapper.dataset.name, duration });
                        }
                        currentVisibleCardWrapper = cardWrapper;
                        viewStartTime = Date.now();
                    }
                } else {
                    if (video) video.pause();
                }
            });
        }, { root: galleryContainer, threshold: 0.75 });

        document.querySelectorAll('.card-wrapper').forEach(card => observer.observe(card));
    }
    
    // --- Favorites Modal ---
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
    
    favoritesButton.addEventListener('click', showFavorites);
    closeModalButton.addEventListener('click', () => favoritesModal.style.display = 'none');
    
    initializeGallery();
});

