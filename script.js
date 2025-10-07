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
    const searchIcon = document.getElementById('searchIcon');
    const searchInput = document.getElementById('searchInput');
    
    let allMediaFiles = [];
    let viewStartTime = null;
    let currentVisibleCardWrapper = null;
    let isScrollingPermitted = true;
    const colorThief = new ColorThief();
    let votes = JSON.parse(localStorage.getItem('votes') || '{}');
    let likedItems = JSON.parse(localStorage.getItem('likedItems') || '[]');

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
                    url: `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${GITHUB_REPO}/main/${file.path}`
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
        const wrapper = document.createElement('div');
        wrapper.className = 'card-wrapper';
        wrapper.dataset.name = file.name;
    
        const card = document.createElement('div');
        card.className = 'product-card';
        wrapper.appendChild(card);
    
        const media = /\.(mp4|webm|mov)$/i.test(file.name) ? document.createElement('video') : document.createElement('img');
        media.className = 'product-card-media';
        media.crossOrigin = "Anonymous";
        if (media.tagName === 'VIDEO') {
            media.muted = true;
            media.loop = true;
            media.playsInline = true;
        }
    
        media.onload = media.oncanplay = () => {
            card.classList.add('loaded');
            if (media.tagName === 'IMG') {
                setAmbilight(media);
            }
        };
        media.onerror = () => console.error('Media load failed:', file.url);
        media.src = file.url;
        
        card.appendChild(media);
        
        // --- Add Interactions ---
        const interactions = document.createElement('div');
        interactions.className = 'card-interactions';
        
        const likeBtn = document.createElement('button');
        likeBtn.className = 'interaction-button like-btn';
        likeBtn.innerHTML = '👍';
        likeBtn.onclick = () => handleLikeDislike(file, 'like');
        
        const dislikeBtn = document.createElement('button');
        dislikeBtn.className = 'interaction-button dislike-btn';
        dislikeBtn.innerHTML = '👎';
        dislikeBtn.onclick = () => handleLikeDislike(file, 'dislike');
        
        interactions.append(likeBtn, dislikeBtn);
        card.appendChild(interactions);
        
        // --- Share Button ---
        const shareBtn = document.createElement('button');
        shareBtn.className = 'share-button';
        shareBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92z"></path></svg>';
        shareBtn.onclick = () => shareOnWhatsApp(file.name, file.url);
        card.appendChild(shareBtn);
        
        updateVoteUI(file.name, wrapper);
        return wrapper;
    }
    
    function createRestartCard() {
        const wrapper = document.createElement('div');
        wrapper.id = 'restartCardWrapper';
        wrapper.className = 'card-wrapper';
        
        const card = document.createElement('div');
        card.className = 'product-card loaded';
        wrapper.appendChild(card);
        
        const restart = document.createElement('div');
        restart.className = 'restart-content';
        restart.innerHTML = '<div class="restart-icon">🔄</div><p>Restart Collection</p>';
        card.appendChild(restart);
        
        return wrapper;
    }

    function setAmbilight(image) {
        try {
            const color = colorThief.getColor(image);
            const gradient = `radial-gradient(circle, rgb(${color[0]}, ${color[1]}, ${color[2]}) 0%, ${getComputedStyle(document.documentElement).getPropertyValue('--bg-color')} 70%)`;
            backgroundGlow.style.setProperty('--dominant-color-gradient', gradient);
        } catch (e) { /* fail silently */ }
    }

    // --- Vote Logic ---
    function handleLikeDislike(file, newAction) {
        const filename = file.name;
        const previousAction = votes[filename];
        let action = newAction;
        
        if (previousAction === newAction) {
            action = `un${newAction}`;
            delete votes[filename];
        } else {
            votes[filename] = newAction;
            if (previousAction && previousAction !== newAction) {
                action = `changed_to_${newAction}`;
            }
        }
        
        localStorage.setItem('votes', JSON.stringify(votes));
        
        // Update liked items
        if (newAction === 'like' && !previousAction) {
            likedItems.push({ filename, url: file.url });
        } else if (newAction === 'like' && previousAction === 'dislike') {
            // Remove if was dislike, but since like now, add
            likedItems = likedItems.filter(item => item.filename !== filename);
            likedItems.push({ filename, url: file.url });
        } else if (action === 'unlike') {
            likedItems = likedItems.filter(item => item.filename !== filename);
        }
        localStorage.setItem('likedItems', JSON.stringify(likedItems));
        
        // Send analytics
        const type = previousAction ? 'vote_update' : 'vote';
        sendAnalytics(type, { action });
        
        // Update UI
        const wrapper = document.querySelector(`[data-name="${filename}"]`);
        updateVoteUI(filename, wrapper);
    }
    
    function updateVoteUI(filename, wrapper) {
        const card = wrapper.querySelector('.product-card');
        const likeBtn = card.querySelector('.like-btn');
        const dislikeBtn = card.querySelector('.dislike-btn');
        
        likeBtn.classList.toggle('selected', votes[filename] === 'like');
        dislikeBtn.classList.toggle('selected', votes[filename] === 'dislike');
    }

    function updateFavorites(filename, url, action) {
        // Handled in handleLikeDislike
    }

    // --- Robust Strict Scrolling ---
    function setupStrictScrolling() {
        galleryContainer.addEventListener('scroll', () => {
            if (!isScrollingPermitted) return;
            isScrollingPermitted = false;
            setTimeout(() => { isScrollingPermitted = true; }, 500); // Debounce to prevent multi-scroll
        }, { passive: true });
    }

    // --- Observer for Analytics, Video Playback & Ambilight ---
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
                        // Analytics: Send duration for previous
                        if (currentVisibleCardWrapper && viewStartTime) {
                            const duration = Date.now() - viewStartTime;
                            sendAnalytics('view', { duration: Math.round(duration) });
                        }
                        // Start new timer
                        viewStartTime = Date.now();
                        currentVisibleCardWrapper = cardWrapper;
                    }
                } else {
                    if (video) video.pause();
                }
            });
        }, { root: galleryContainer, threshold: 0.7 });

        document.querySelectorAll('.card-wrapper').forEach(card => observer.observe(card));
    }
    
    // --- Favorites Modal (Now Functional) ---
    function showFavorites() {
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

    // --- Analytics & Sharing ---
    async function sendAnalytics(type, data) {
        try {
            const payload = {
                type,
                timestamp: new Date().toISOString(),
                userId,
                filename: data.filename || currentVisibleCardWrapper?.dataset.name || 'unknown',
                ...data
            };
            await fetch(GOOGLE_SHEET_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (error) {
            console.error('Analytics send failed:', error);
        }
    }
    
    function shareOnWhatsApp(filename, fileUrl) {
        const message = `Check out this product: ${filename}`;
        const whatsappUrl = `https://wa.me/${WHATSAPP_PHONE_NUMBER}?text=${encodeURIComponent(message)} ${encodeURIComponent(fileUrl)}`;
        window.open(whatsappUrl, '_blank');
    }
    
    // --- Search Functionality ---
    searchIcon.addEventListener('click', () => {
        searchInput.classList.toggle('active');
    });
    
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        document.querySelectorAll('.card-wrapper').forEach(wrapper => {
            const filename = wrapper.dataset.name.toLowerCase();
            wrapper.style.display = filename.includes(query) ? 'flex' : 'none';
        });
        // Hide restart if searching
        const restart = document.getElementById('restartCardWrapper');
        if (query) restart.style.display = 'none';
        else restart.style.display = 'flex';
    });
    
    // --- Event Listeners ---
    favoritesButton.addEventListener('click', showFavorites);
    closeModalButton.addEventListener('click', () => favoritesModal.style.display = 'none');
    favoritesModal.addEventListener('click', (e) => {
        if (e.target === favoritesModal) favoritesModal.style.display = 'none';
    });
    
    // --- Start the App ---
    initializeGallery();
});