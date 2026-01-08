// DOM element selection - Get all slider items and navigation controls
let items = document.querySelectorAll('.slider .list .item');
let next = document.getElementById('next');
let prev = document.getElementById('prev');
let thumbnails = document.querySelectorAll('.thumbnail .item');

// Configuration parameters for slider functionality
let countItem = items.length;
let itemActive = 0;

// Next button click handler - Advances slider to next item
next.onclick = function() {
    itemActive = itemActive + 1;
    // Loop back to first item if we've reached the end
    if (itemActive >= countItem) {
        itemActive = 0;
    }
    showSlider();
}

// Previous button click handler - Goes back to previous item
prev.onclick = function() {
    itemActive = itemActive - 1;
    // Loop to last item if we've gone before the first
    if (itemActive < 0) {
        itemActive = countItem - 1;
    }
    showSlider();
}

// Add click event listeners to main slider items for direct navigation
items.forEach((item, index) => {
    item.addEventListener('click', () => {
        itemActive = index;
        showSlider();
    });
});

// Add click event listeners to thumbnail items for direct navigation
thumbnails.forEach((thumbnail, index) => {
    thumbnail.addEventListener('click', () => {
        itemActive = index;
        showSlider();
    });
});

// Main function to update slider display based on active item
function showSlider() {
    // Find and remove active class from currently active elements
    let itemActiveOld = document.querySelector('.slider .list .item.active');
    let thumbnailActiveOld = document.querySelector('.thumbnail .item.active');
    if (itemActiveOld) {
        itemActiveOld.classList.remove('active');
    }
    if (thumbnailActiveOld) {
        thumbnailActiveOld.classList.remove('active');
    }

    // Apply active class to the new active item and thumbnail
    items[itemActive].classList.add('active');
    thumbnails[itemActive].classList.add('active');
}

// Initialize slider on page load - Set first item as active
document.addEventListener('DOMContentLoaded', () => {
    items[itemActive].classList.add('active');
    thumbnails[itemActive].classList.add('active');
});