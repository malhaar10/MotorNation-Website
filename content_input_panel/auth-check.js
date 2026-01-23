/**
 * Authentication Check Script
 * 
 * This script runs on every admin panel page to verify that the user
 * is authenticated before allowing access to the page.
 * 
 * Include this in all protected admin pages after Firebase SDK and firebase-config.js
 */

(function() {
  'use strict';

  console.log('🔐 Starting authentication check...');

  // Show loading screen while checking authentication
  function showLoading() {
    const loadingDiv = document.getElementById('auth-loading');
    const contentDiv = document.getElementById('page-content');
    
    if (loadingDiv) loadingDiv.style.display = 'flex';
    if (contentDiv) contentDiv.style.display = 'none';
  }

  // Hide loading and show page content
  function showContent() {
    const loadingDiv = document.getElementById('auth-loading');
    const contentDiv = document.getElementById('page-content');
    
    if (loadingDiv) loadingDiv.style.display = 'none';
    if (contentDiv) contentDiv.style.display = 'block';
  }

  // Redirect to login page
  function redirectToLogin() {
    console.log('❌ Not authenticated - redirecting to login');
    
    // Store the current page URL to redirect back after login
    const currentPage = window.location.pathname;
    sessionStorage.setItem('redirectAfterLogin', currentPage);
    
    window.location.href = 'login.html';
  }

  // Initialize loading state
  showLoading();

  // Check authentication state
  firebase.auth().onAuthStateChanged(async function(user) {
    if (user) {
      // User is signed in
      console.log('✅ User authenticated:', user.email);
      console.log('👤 User UID:', user.uid);
      
      try {
        // Get fresh ID token
        const token = await user.getIdToken();
        console.log('🎫 Firebase token obtained (length:', token.length, ')');
        
        // Store token globally for API calls
        window.firebaseToken = token;
        window.currentUser = {
          uid: user.uid,
          email: user.email,
          emailVerified: user.emailVerified
        };
        
        // Show the page content
        showContent();
        
        console.log('✅ Authentication check complete - access granted');
        
      } catch (error) {
        console.error('❌ Error getting Firebase token:', error);
        alert('Authentication error: ' + error.message);
        redirectToLogin();
      }
      
    } else {
      // No user is signed in
      console.log('❌ No authenticated user found');
      redirectToLogin();
    }
  });

  // Auto-refresh token before it expires (tokens expire after 1 hour)
  setInterval(async () => {
    const user = firebase.auth().currentUser;
    if (user) {
      try {
        const token = await user.getIdToken(true); // Force refresh
        window.firebaseToken = token;
        console.log('🔄 Firebase token refreshed');
      } catch (error) {
        console.error('❌ Token refresh failed:', error);
        alert('Your session has expired. Please log in again.');
        redirectToLogin();
      }
    }
  }, 50 * 60 * 1000); // Refresh every 50 minutes (tokens expire after 60)

})();

/**
 * Helper function to get current Firebase token
 * Use this in your API calls
 */
async function getAuthToken() {
  if (window.firebaseToken) {
    return window.firebaseToken;
  }
  
  const user = firebase.auth().currentUser;
  if (user) {
    const token = await user.getIdToken();
    window.firebaseToken = token;
    return token;
  }
  
  throw new Error('No authenticated user');
}

/**
 * Helper function to logout
 */
async function logout() {
  try {
    await firebase.auth().signOut();
    console.log('✅ Logged out successfully');
    window.location.href = 'login.html';
  } catch (error) {
    console.error('❌ Logout error:', error);
    alert('Error logging out: ' + error.message);
  }
}
