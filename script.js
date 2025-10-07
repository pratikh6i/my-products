document.addEventListener('DOMContentLoaded', () => {

    // --- ⚠️ IMPORTANT LOCAL CONFIGURATION ⚠️ ---
    //
    // Since this code runs locally in your browser, it cannot automatically
    // detect files in a folder. You MUST list your product files here manually.
    //
    // 1. Place all your images and videos inside a folder named `products`.
    //    This `products` folder must be in the SAME directory as your index.html file.
    //
    // 2. Add the exact filenames to the list below.
    //
    // EXAMPLE:
    // const productFiles = [
    //   "blue-saree.jpg",
    //   "handmade-earrings.mp4",
    //   "silk-kurta-set.png",
    //   "gold-necklace.webp"
    // ];
    //
    const productFiles = [
        // Add your filenames here, like "product1.jpg"
        "image1.jpg",
        "video1.mp4",
        "image2.jpeg",
        "image3.png",
        "image4.jpg",
        "image5.webp"
        // Continue adding all your file names...
    ];

    const PRODUCTS_FOLDER_PATH = 'products';
    // --- END OF CONFIGURATION ---


    const galleryContainer = document.getElementById('gallery-container');
    const statusMessage = document.getElementById('statusMessage');
    const searchInput = document.getElementById('searchInput');
    const searchIcon = document.getElementById('searchIcon');

    /**
     * Creates and displays product cards in the gallery from the configured file list.
     */
    function loadProductsLocally() {
        // Clear the initial "Loading..." message
        statusMessage.style.display = 'none';

        if (productFiles.length === 0) {
            displayMessage("No products configured. Please add filenames to the 'productFiles' list in script.js.");
            return;
        }

        productFiles.forEach(filename => {
            const productCard = createProductCard(filename);
            galleryContainer.appendChild(productCard);
        });

        // After adding cards, set up the animation observer
        setupIntersectionObserver();
    }

    /**
     * Creates a single product card element (div) for a given filename.
     * @param {string} filename - The name of the media file (e.g., "image1.jpg").
     * @returns {HTMLElement} The fully constructed product card element.
     */
    function createProductCard(filename) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.dataset.name = filename.toLowerCase().split('.')[0]; // For searching by name

        const filePath = `${PRODUCTS_FOLDER_PATH}/${filename}`;
        const fileExtension = filename.split('.').pop().toLowerCase();
        let mediaElement;

        if (['mp4', 'webm', 'mov'].includes(fileExtension)) {
            mediaElement = document.createElement('video');
            mediaElement.src = filePath;
            mediaElement.autoplay = true;
            mediaElement.loop = true;
            mediaElement.muted = true; // Essential for autoplay in modern browsers
            mediaElement.playsInline = true; // Essential for iOS
        } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension)) {
            mediaElement = document.createElement('img');
            mediaElement.src = filePath;
            mediaElement.alt = filename;
            mediaElement.loading = 'lazy'; // Improves performance by loading images as they are scrolled into view
            // Error handling for broken image links
            mediaElement.onerror = () => {
                card.innerHTML = `<div class="status-message"><p>Could not load:<br>${filename}</p></div>`;
            };
        } else {
            // Handle unsupported file types gracefully
            console.warn(`Unsupported file type: ${filename}`);
            card.innerHTML = `<div class="status-message"><p>Unsupported file:<br>${filename}</p></div>`;
            return card;
        }

        mediaElement.className = 'product-card-media';
        card.appendChild(mediaElement);
        return card;
    }

    /**
     * Sets up an Intersection Observer to trigger the fade-in animation
     * on cards only when they scroll into the viewport. This is highly performant.
     */
    function setupIntersectionObserver() {
        const options = {
            root: null, // observes intersections relative to the viewport
            rootMargin: '0px',
            threshold: 0.1 // Triggers when 10% of the card is visible
        };

        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target); // Stop observing once it's visible
                }
            });
        }, options);

        const cards = document.querySelectorAll('.product-card');
        cards.forEach(card => observer.observe(card));
    }

    /**
     * Displays a message in the gallery (e.g., for errors or "not found").
     * @param {string} message - The message to display.
     */
    function displayMessage(message) {
        galleryContainer.innerHTML = `<div class="status-message"><p>${message}</p></div>`;
    }

    /**
     * Filters product cards based on the search input value.
     */
    function handleSearch() {
        const searchTerm = searchInput.value.toLowerCase();
        const productCards = document.querySelectorAll('.product-card');
        let foundItems = 0;

        productCards.forEach(card => {
            const productName = card.dataset.name || '';
            if (productName.includes(searchTerm)) {
                card.style.display = 'block'; // Use block for cards
                foundItems++;
            } else {
                card.style.display = 'none';
            }
        });
        
        // Remove "not found" message if it exists
        const notFoundMessage = document.getElementById('notFoundMessage');
        if(notFoundMessage) notFoundMessage.remove();

        // Show a message if no items are found
        if (foundItems === 0 && productCards.length > 0) {
             const messageElement = document.createElement('div');
             messageElement.className = 'status-message';
             messageElement.id = 'notFoundMessage';
             messageElement.innerHTML = `<p>No products found for "${searchInput.value}"</p>`;
             galleryContainer.appendChild(messageElement);
        }
    }

    // --- Event Listeners ---
    searchIcon.addEventListener('click', () => {
        searchInput.classList.toggle('active');
        if (searchInput.classList.contains('active')) {
            searchInput.focus();
        } else {
            searchInput.value = ''; // Clear search on close
            handleSearch(); // Reset view
        }
    });

    searchInput.addEventListener('keyup', handleSearch);

    // --- Initial Load ---
    loadProductsLocally();
});
