/**
 * Firebase Authentication Middleware
 * 
 * This middleware verifies Firebase ID tokens sent from the frontend
 * and protects API routes from unauthorized access.
 */

const admin = require('../config/firebase-config');
require('dotenv').config();

/**
 * Parse authorized admin UIDs from environment variable
 * Format: AUTHORIZED_ADMIN_UIDS=uid1,uid2,uid3
 */
const getAuthorizedAdmins = () => {
  const uids = process.env.AUTHORIZED_ADMIN_UIDS || '';
  return uids.split(',').map(uid => uid.trim()).filter(uid => uid.length > 0);
};

/**
 * Middleware to authenticate Firebase users
 * 
 * Verifies the Firebase ID token from the Authorization header
 * and checks if the user is in the authorized admins list.
 * 
 * Usage: app.post('/api/protected', authenticateUser, handler)
 */
async function authenticateUser(req, res, next) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      console.warn('⚠️ Authentication failed: No Authorization header');
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'No authentication token provided. Please log in.' 
      });
    }

    // Check for Bearer token format
    if (!authHeader.startsWith('Bearer ')) {
      console.warn('⚠️ Authentication failed: Invalid Authorization header format');
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid authentication token format. Expected "Bearer <token>".' 
      });
    }

    // Extract the token
    const token = authHeader.split('Bearer ')[1];
    
    if (!token || token.trim() === '') {
      console.warn('⚠️ Authentication failed: Empty token');
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Empty authentication token.' 
      });
    }

    // Verify token with Firebase Admin SDK
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (verifyError) {
      console.error('❌ Token verification failed:', verifyError.code, verifyError.message);
      
      // Handle specific Firebase Auth errors
      if (verifyError.code === 'auth/id-token-expired') {
        return res.status(401).json({ 
          error: 'Token Expired',
          message: 'Your session has expired. Please log in again.' 
        });
      }
      
      if (verifyError.code === 'auth/argument-error') {
        return res.status(401).json({ 
          error: 'Invalid Token',
          message: 'Invalid authentication token format.' 
        });
      }
      
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid or expired authentication token.' 
      });
    }

    // Check if user is in the authorized admins list
    const authorizedAdmins = getAuthorizedAdmins();
    
    if (authorizedAdmins.length === 0) {
      console.error('❌ CRITICAL: No authorized admin UIDs configured!');
      console.error('⚠️  Set AUTHORIZED_ADMIN_UIDS environment variable');
      return res.status(500).json({ 
        error: 'Server Configuration Error',
        message: 'Admin authorization not configured. Contact system administrator.' 
      });
    }

    if (!authorizedAdmins.includes(decodedToken.uid)) {
      console.warn(`⚠️ Unauthorized access attempt by user: ${decodedToken.email} (UID: ${decodedToken.uid})`);
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'You do not have permission to access this resource. Only authorized administrators can perform this action.' 
      });
    }

    // Attach user information to request object for use in route handlers
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      authTime: decodedToken.auth_time,
      iat: decodedToken.iat,
      exp: decodedToken.exp
    };

    // Log successful authentication (useful for auditing)
    console.log(`✅ Authenticated admin: ${req.user.email} (UID: ${req.user.uid})`);

    // Proceed to next middleware or route handler
    next();

  } catch (error) {
    console.error('❌ Authentication middleware error:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'An error occurred during authentication.' 
    });
  }
}

/**
 * Optional: Middleware to check if user is authenticated (but not necessarily authorized)
 * Useful for routes that need user info but don't require admin privileges
 */
async function optionalAuthentication(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      
      if (token) {
        try {
          const decodedToken = await admin.auth().verifyIdToken(token);
          req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            emailVerified: decodedToken.email_verified
          };
          console.log(`👤 Optional auth: User ${req.user.email} is authenticated`);
        } catch (error) {
          console.log('ℹ️ Optional auth: Token verification failed, proceeding as anonymous');
        }
      }
    }
    
    // Always proceed, even if no valid token
    next();
    
  } catch (error) {
    console.error('❌ Optional authentication error:', error);
    next(); // Proceed anyway for optional auth
  }
}

module.exports = { 
  authenticateUser,
  optionalAuthentication,
  getAuthorizedAdmins
};
