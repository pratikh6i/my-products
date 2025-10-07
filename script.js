document.addEventListener('DOMContentLoaded', () => {
    // --- ⭐ FINAL CONFIGURATION ⭐ ---
    const GITHUB_USERNAME = 'pratikh6i';
    const GITHUB_REPO = 'my-products';
    const GOOGLE_SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbyUp6v1siZRQW1ydR61hLrLMwgXrHofKJNNjHsjxYU7n8Qy8Q_syQFuEFkCK9B3i1Sr/exec';
    const WHATSAPP_PHONE_NUMBER = '917972711924';
    
    // --- Unique User Identifier & State ---
    const userId = localStorage.getItem('sparkChoiceUserId') || crypto.randomUUID();
    localStorage.setItem('sparkChoiceUserId', userId);
    let votes = JSON.parse(localStorage.getItem('votes') || '{}');
    let likedItems = JSON.parse(localStorage.getItem('likedItems') || '[]');

    // --- DOM Elements ---
    const galleryContainer = document.getElementById('gallery-container');
    const statusMessage = document.getElementById('statusMessage');
    const backgroundGlow = document.getElementById('backgroundGlow');
    const fullscreenViewer = document.getElementById('fullscreen-viewer');
    const viewerContent = fullscreenViewer.querySelector('.viewer-content');
    const closeViewerBtn = fullscreenViewer.querySelector('.close-viewer-btn');
    // ... other DOM elements

    // ... (Main Initialization `initializeGallery`, `renderGallery` remain the same)

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
        media.src = file.url;
        // ... (media event listeners for onload/oncanplay)
        card.appendChild(media);

        // ✅ Open fullscreen viewer on click
        card.addEventListener('click', () => showFullscreen(file));
        
        const interactions = document.createElement('div');
        interactions.className = 'card-interactions';
        
        // ✅ NEW SVG Buttons
        const likeSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>';
        const dislikeSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path></svg>';
        const whatsappSVG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.75 13.96c.25.13.43.2.5.33.07.13.07.65-.03.81-.1.17-.38.34-.58.34-.2 0-.34-.03-.5-.03-.17 0-1.16-.34-1.5-.55-.34-.2-.5-.38-.67-.55-.17-.17-.42-.42-.42-.83s.42-.92.58-1.08c.17-.17.34-.25.5-.25.17 0 .34.08.5.25.17.17.25.42.25.58 0 .17-.08.34-.17.5zm-3.13-2.5c-.34-.16-.5-.25-.75-.25-.25 0-.5.08-.67.25-.16.17-.25.42-.25.58 0 .42.25.83.67 1.25.42.42 1 .83 1.84 1.25.83.42 1.42.67 1.84.67.42 0 .83-.08 1.17-.25.3-.2.5-.46.58-.75.07-.3.07-.67 0-1-.07-.33-.5-.75-1-1.08-.5-.33-1.17-.5-1.84-.5-.66 0-1.25.17-1.75.5zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"></path></svg>';

        interactions.innerHTML = `
            <button class="interaction-button dislike-btn" onclick="event.stopPropagation()">${dislikeSVG}</button>
            <button class="interaction-button whatsapp-btn" onclick="event.stopPropagation()">${whatsappSVG}</button>
            <button class="interaction-button like-btn" onclick="event.stopPropagation()">${likeSVG}</button>
        `;
        card.appendChild(interactions);

        // Attach listeners after creation
        interactions.querySelector('.like-btn').addEventListener('click', () => handleLikeDislike(file, 'like'));
        interactions.querySelector('.dislike-btn').addEventListener('click', () => handleLikeDislike(file, 'dislike'));
        interactions.querySelector('.whatsapp-btn').addEventListener('click', () => shareOnWhatsApp(file.name, file.url));

        updateVoteUI(file.name, wrapper);
        return wrapper;
    }
    
    // --- ✅ Fullscreen Viewer Logic ---
    function showFullscreen(file) {
        viewerContent.innerHTML = '';
        const isVideo = /\.(mp4|webm|mov)$/i.test(file.name);
        const media = isVideo ? document.createElement('video') : document.createElement('img');
        media.src = file.url;
        if (isVideo) {
            media.controls = true; media.autoplay = true;
        }
        viewerContent.appendChild(media);
        fullscreenViewer.classList.add('visible');
    }
    closeViewerBtn.addEventListener('click', () => fullscreenViewer.classList.remove('visible'));
    fullscreenViewer.addEventListener('click', (e) => {
        if (e.target === fullscreenViewer) fullscreenViewer.classList.remove('visible');
    });

    // ... (handleLikeDislike, updateVoteUI, setupStrictScrolling, etc. remain the same)

    // --- ✅ FIXED Analytics Function ---
    async function sendAnalytics(type, data) {
        const payload = {
            type,
            timestamp: new Date().toISOString(),
            userId,
            filename: data.filename || currentVisibleCardWrapper?.dataset.name || 'unknown',
            ...data
        };

        // For Google Apps Script, the payload must be a stringified form data or simple text
        // We will send it as a stringified JSON
        try {
            await fetch(GOOGLE_SHEET_API_URL, {
                method: 'POST',
                mode: 'no-cors', // Important for cross-origin requests to GAS
                headers: {
                    'Content-Type': 'application/json', // Keep this, but GAS will see it in postData
                },
                body: JSON.stringify(payload)
            });
        } catch (error) {
            console.error('Analytics send failed:', error);
        }
    }
    
    // --- Initialize ---
    initializeGallery();
});

