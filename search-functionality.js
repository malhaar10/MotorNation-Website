// Search functionality that redirects to search results page
function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) {
        console.warn('Search input not found');
        return;
    }

    // Add event listener for Enter key
    searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            const tag = this.value.trim();
            if (!tag) return;

            // Determine the correct path to search.html based on current location
            const currentPath = window.location.pathname;
            let searchPath = 'search.html';
            
            // If we're in a subdirectory, we need to go up one level
            if (currentPath.includes('/')) {
                const pathParts = currentPath.split('/');
                if (pathParts.length > 2) { // More than just domain and filename
                    searchPath = '../search.html';
                }
            }

            // Redirect to search results page
            window.location.href = `${searchPath}?tag=${encodeURIComponent(tag)}`;
        }
    });
}

// Optional: Add search button functionality
function performSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    const tag = searchInput.value.trim();
    if (!tag) return;
    
    // Determine the correct path to search.html based on current location
    const currentPath = window.location.pathname;
    let searchPath = 'search.html';
    
    // If we're in a subdirectory, we need to go up one level
    if (currentPath.includes('/')) {
        const pathParts = currentPath.split('/');
        if (pathParts.length > 2) { // More than just domain and filename
            searchPath = '../search.html';
        }
    }
    
    window.location.href = `${searchPath}?tag=${encodeURIComponent(tag)}`;
}

// Initialize search functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeSearch();
});