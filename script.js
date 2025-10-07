document.addEventListener('DOMContentLoaded', () => {

    // --- ⭐ FINAL CONFIGURATION (FOR GITHUB PAGES) ⭐ ---
    //
    // This script will automatically fetch all media from the 'products' folder.
    //
    // 1. ⚠️ ACTION REQUIRED: Replace these two values with your details.
    const GITHUB_USERNAME = 'pratikh6i';
    const GITHUB_REPO = 'my-products';
    //
    // 2. Ensure your product images/videos are in a folder named 'products' in your repository.
    //
    // Any files you add to that folder will now appear on the website automatically.
    //
    const PRODUCTS_FOLDER = 'products';
    const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${PRODUCTS_FOLDER}`;
    // --- END OF CONFIGURATION ---


    const galleryContainer = document.getElementById('gallery-container');
    const statusMessage = document.getElementById('statusMessage');
    const searchInput = document.getElementById('searchInput');
    const searchIcon = document.getElementById('searchIcon');

    async function fetchAndDisplayProducts() {
        try {
            const response = await fetch(GITHUB_API_URL);

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error("Products not found. Check your GITHUB_USERNAME, GITHUB_REPO in script.js, and make sure the 'products' folder exists and the repository is public.");
                }
                throw new Error(`Error: ${response.statusText}`);
            }

            const files = await response.json();
            const mediaFiles = files.filter(file =>
                file.type === 'file' && /\.(jpg|jpeg|png|gif|webp|mp4|webm|mov)$/i.test(file.name)
            );

            statusMessage.style.display = 'none';

            if (!Array.isArray(mediaFiles) || mediaFiles.length === 0) {
                displayMessage("No products found. Upload images and videos to the 'products' folder on GitHub.");
                return;
            }

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

    function createProductCard(filename, fileUrl) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.dataset.name = filename.toLowerCase().split('.')[0].replace(/[-_]/g, ' ');

        const fileExtension = filename.split('.').pop().toLowerCase();
        let mediaElement;

        if (['mp4', 'webm', 'mov'].includes(fileExtension)) {
            mediaElement = document.createElement('video');
            mediaElement.src = fileUrl;
            mediaElement.autoplay = true;
            mediaElement.loop = true;
            mediaElement.muted = true;
            mediaElement.playsInline = true;
        } else {
            mediaElement = document.createElement('img');
            mediaElement.src = fileUrl;
            mediaElement.alt = filename;
            mediaElement.loading = 'lazy';
        }

        mediaElement.className = 'product-card-media';
        card.appendChild(mediaElement);
        return card;
    }

    function setupIntersectionObserver() {
        const options = { root: null, rootMargin: '0px', threshold: 0.2 };
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, options);

        document.querySelectorAll('.product-card').forEach(card => observer.observe(card));
    }

    function displayMessage(message) {
        statusMessage.style.display = 'flex';
        statusMessage.innerHTML = `<p>${message}</p>`;
    }

    function handleSearch() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        document.querySelectorAll('.product-card').forEach(card => {
            const productName = card.dataset.name || '';
            card.style.display = productName.includes(searchTerm) ? 'block' : 'none';
        });
    }

    searchIcon.addEventListener('click', () => {
        searchInput.classList.toggle('active');
        searchInput.focus();
    });
    searchInput.addEventListener('keyup', handleSearch);

    fetchAndDisplayProducts();
});

