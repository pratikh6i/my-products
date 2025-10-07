document.addEventListener('DOMContentLoaded', () => {
    // --- ⭐ FINAL CONFIGURATION ⭐ ---
    const GITHUB_USERNAME = 'pratikh6i';
    const GITHUB_REPO = 'my-products';

    // 1. ✅ Google Sheet URL is set.
    const GOOGLE_SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbxKuNsxy-sYMSlUteEFkKQXAUyRFMeHT42pQ9eoinZqwhLNdWgR_rR6jLaqmyhp4YvZ/exec';

    // 2. ✅ WhatsApp number is corrected.
    const WHATSAPP_PHONE_NUMBER = '917972711924';
    
    const PRODUCTS_FOLDER = 'products';
    const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${PRODUCTS_FOLDER}`;
    // --- END OF CONFIGURATION ---

    const galleryContainer = document.getElementById('gallery-container');
    const statusMessage = document.getElementById('statusMessage');
    const searchInput = document.getElementById('searchInput');
    const searchIcon = document.getElementById('searchIcon');
    const endOfListMessage = document.getElementById('endOfList');
    let allMediaFiles = [];

    async function initializeGallery() {
        try {
            statusMessage.style.display = 'flex';
            const response = await fetch(GITHUB_API_URL);
            if (!response.ok) throw new Error(`GitHub API Error: ${response.statusText}`);
            const files = await response.json();
            
            allMediaFiles = files
                .filter(file => file.type === 'file' && /\.(jpg|jpeg|png|gif|webp|mp4|webm|mov)$/i.test(file.name))
                .map(file => ({
                    name: file.name,
                    // ✅ FIX: Use raw URL for full resolution images/videos
                    url: `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${GITHUB_REPO}/main/${file.path}`
                }));

            if (allMediaFiles.length === 0) {
                displayMessage("No products found.");
                return;
            }

            statusMessage.style.display = 'none';
            renderGallery(allMediaFiles);

        } catch (error) {
            console.error('Initialization Error:', error);
            displayMessage('Could not load the collection. Please try again later.');
        }
    }

    function renderGallery(mediaFiles) {
        // Clear previous items except for the status message and end message
        const existingCards = galleryContainer.querySelectorAll('.product-card');
        existingCards.forEach(card => card.remove());

        mediaFiles.forEach(file => {
            const card = createProductCard(file.name, file.url);
            galleryContainer.insertBefore(card, endOfListMessage);
        });
        setupIntersectionObserver();
    }

    function createProductCard(filename, fileUrl) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.dataset.name = filename;

        // Media element
        const isVideo = /\.(mp4|webm|mov)$/i.test(filename);
        const mediaElement = isVideo ? document.createElement('video') : document.createElement('img');
        mediaElement.className = 'product-card-media';
        mediaElement.src = fileUrl;
        if (isVideo) {
            mediaElement.autoplay = true; mediaElement.loop = true; mediaElement.muted = true; mediaElement.playsInline = true;
        } else {
            mediaElement.alt = filename; mediaElement.loading = 'lazy';
        }
        card.appendChild(mediaElement);

        // Interactions
        const interactions = document.createElement('div');
        interactions.className = 'card-interactions';
        
        const dislikeBtn = createInteractionButton('dislike', 'M13 4a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h9Zm0 2H4v6h9V6Zm6-2a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h1Z', () => handleLikeDislike(filename, 'dislike', card, dislikeBtn));
        const likeBtn = createInteractionButton('like', 'M12 4a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h9Zm0 2H3v6h9V6Zm8-2a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h1Z', () => handleLikeDislike(filename, 'like', card, likeBtn));
        const whatsappBtn = createInteractionButton('whatsapp', 'M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zM9.53 9.02c-.27-.42-1.16-.9-1.3-1.03-.14-.12-.28-.18-.48-.18s-.49.12-.66.36c-.17.24-.66.8-.81 1.2s-.3.66-.15 1.02c.14.36.66.96 1.2 1.5.83.83 1.58 1.1 1.81 1.2.24.12.36.1.49-.06.13-.17.55-.64.7-1.2.14-.58.1-.96-.06-1.1s-.42-.24-.55-.3z', () => shareOnWhatsApp(filename, fileUrl));
        
        interactions.append(dislikeBtn, whatsappBtn, likeBtn);
        card.appendChild(interactions);
        
        // Check if already voted
        if (localStorage.getItem(filename)) {
            card.classList.add('voted');
            const action = localStorage.getItem(filename);
            if (action === 'like') likeBtn.classList.add('selected');
            if (action === 'dislike') dislikeBtn.classList.add('selected');
        }

        return card;
    }

    function createInteractionButton(type, svgPath, onClick) {
        const btn = document.createElement('button');
        btn.className = `interaction-button ${type}`;
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="currentColor" d="${svgPath}"/></svg>`;
        btn.addEventListener('click', onClick);
        return btn;
    }

    // --- ✅ NEW VOTE LOGIC ---
    async function handleLikeDislike(filename, action, card, button) {
        // Prevent voting if already voted
        if (card.classList.contains('voted')) {
            return;
        }

        // Visually mark as voted immediately
        card.classList.add('voted');
        button.classList.add('selected');

        // Store vote in localStorage to prevent re-voting on refresh
        localStorage.setItem(filename, action);

        // Send data to Google Sheet
        try {
            await fetch(GOOGLE_SHEET_API_URL, {
                method: 'POST', mode: 'no-cors', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ filename, action })
            });
        } catch (error) { 
            console.error('Error updating sheet:', error);
            // Optional: Handle error, e.g., remove voted status to allow retry
            // card.classList.remove('voted');
            // button.classList.remove('selected');
            // localStorage.removeItem(filename);
        }
    }
    
    function shareOnWhatsApp(filename, fileUrl) {
        const message = encodeURIComponent(`Hi, I'm interested in this product: ${filename}\n\nView it here: ${fileUrl}`);
        window.open(`https://wa.me/${WHATSAPP_PHONE_NUMBER}?text=${message}`, '_blank');
    }

    function setupIntersectionObserver() {
        const options = { root: null, rootMargin: '0px', threshold: 0.25 };
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    // Play video when it becomes visible
                    const video = entry.target.querySelector('video');
                    if (video) video.play();
                } else {
                    // Pause video when it goes out of view
                    const video = entry.target.querySelector('video');
                    if (video) video.pause();
                }
            });
        }, options);
        document.querySelectorAll('.product-card, .end-of-list-message').forEach(el => observer.observe(el));
    }

    // --- Search Logic ---
    function handleSearch() {
        const searchTerm = searchInput.value.toLowerCase();
        const filteredFiles = allMediaFiles.filter(file => file.name.toLowerCase().includes(searchTerm));
        renderGallery(filteredFiles);
    }
    
    function displayMessage(message) {
        statusMessage.style.display = 'flex';
        statusMessage.innerHTML = `<p>${message}</p>`;
    }
    
    searchIcon.addEventListener('click', () => searchInput.classList.toggle('active'));
    searchInput.addEventListener('keyup', handleSearch);

    initializeGallery();
});

