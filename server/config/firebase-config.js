/**
 * Firebase Admin SDK Configuration
 * 
 * This module initializes Firebase Admin SDK for server-side authentication
 * token verification. It loads service account credentials from environment
 * variables or a JSON file.
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let firebaseApp = null;

/**
 * Initialize Firebase Admin SDK
 * Supports multiple credential loading strategies for different environments
 */
function initializeFirebase() {
  if (firebaseApp) {
    console.log('🔥 Firebase Admin already initialized');
    return firebaseApp;
  }

  try {
    let serviceAccount;

    // Strategy 1: Load from JSON string in environment variable (Production)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.log('🔐 Loading Firebase credentials from FIREBASE_SERVICE_ACCOUNT env variable');
      
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      } catch (parseError) {
        console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', parseError.message);
        throw new Error('Invalid JSON in FIREBASE_SERVICE_ACCOUNT environment variable');
      }
    }
    // Strategy 2: Load from file path (Development)
    else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
      
      // Check if it's a JSON string instead of a file path
      if (filePath.trim().startsWith('{')) {
        console.log('🔐 Loading Firebase credentials from FIREBASE_SERVICE_ACCOUNT_PATH (JSON string)');
        try {
          serviceAccount = JSON.parse(filePath);
        } catch (parseError) {
          console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_PATH JSON:', parseError.message);
          throw new Error('Invalid JSON in FIREBASE_SERVICE_ACCOUNT_PATH environment variable');
        }
      } else {
        // It's a file path
        const resolvedPath = path.resolve(__dirname, '..', filePath);
        console.log('🔐 Loading Firebase credentials from file:', resolvedPath);
        
        if (!fs.existsSync(resolvedPath)) {
          throw new Error(`Firebase service account file not found: ${resolvedPath}`);
        }
        
        serviceAccount = require(resolvedPath);
      }
    }
    // Strategy 3: Try default location (Development fallback)
    else {
      const defaultPath = path.resolve(__dirname, '..', 'firebase-service-account.json');
      console.log('🔐 Attempting to load Firebase credentials from default location:', defaultPath);
      
      if (fs.existsSync(defaultPath)) {
        serviceAccount = require(defaultPath);
      } else {
        throw new Error(
          'Firebase service account not configured. Please set FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_PATH environment variable.'
        );
      }
    }

    // Initialize Firebase Admin
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'motornation-466804'
    });

    console.log('✅ Firebase Admin initialized successfully');
    console.log(`🔥 Project ID: ${serviceAccount.project_id}`);
    
    return firebaseApp;

  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error.message);
    throw error;
  }
}

// Initialize on module load
initializeFirebase();

// Export admin instance for use in other modules
module.exports = admin;
