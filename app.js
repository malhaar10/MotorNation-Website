let items = document.querySelectorAll('.slider .list .item');
let next = document.getElementById('next');
let prev = document.getElementById('prev');
let thumbnails = document.querySelectorAll('.thumbnail .item');

// Config param
let countItem = items.length;
let itemActive = 0;

// Event next click
next.onclick = function() {
    itemActive = itemActive + 1;
    if (itemActive >= countItem) {
        itemActive = 0;
    }
    showSlider();
}

// Event prev click
prev.onclick = function() {
    itemActive = itemActive - 1;
    if (itemActive < 0) {
        itemActive = countItem - 1;
    }
    showSlider();
}

// Add event listeners to each item for click
items.forEach((item, index) => {
    item.addEventListener('click', () => {
        itemActive = index;
        showSlider();
    });
});

thumbnails.forEach((thumbnail, index) => {
    thumbnail.addEventListener('click', () => {
        itemActive = index;
        showSlider();
    });
});

function showSlider() {
    // Remove active class from old items
    let itemActiveOld = document.querySelector('.slider .list .item.active');
    let thumbnailActiveOld = document.querySelector('.thumbnail .item.active');
    if (itemActiveOld) {
        itemActiveOld.classList.remove('active');
    }
    if (thumbnailActiveOld) {
        thumbnailActiveOld.classList.remove('active');
    }

    // Add active class to new items
    items[itemActive].classList.add('active');
    thumbnails[itemActive].classList.add('active');
}

// Initialize the first item as active
document.addEventListener('DOMContentLoaded', () => {
    items[itemActive].classList.add('active');
    thumbnails[itemActive].classList.add('active');
});
