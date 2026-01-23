/**
 * Firebase Configuration for Frontend
 * 
 * IMPORTANT: Replace the values below with your actual Firebase project configuration
 * Get this from: Firebase Console > Project Settings > General > Your apps > Web app
 */

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDyRodplz4OQCEsZlnYVCaMCFETat6V-5c",
  authDomain: "motornation-466804.firebaseapp.com",
  projectId: "motornation-466804",
  storageBucket: "motornation-466804.appspot.com",
  appId: "1:336079007565:web:9ed92c3c4218a11ba71104"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Export auth instance for use in other scripts
const auth = firebase.auth();

console.log('🔥 Firebase initialized for project:', firebaseConfig.projectId);
