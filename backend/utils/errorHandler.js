/**
 * Formats Mongoose validation errors into user-friendly messages
 * @param {Error} error - The error object from Mongoose
 * @returns {string} - User-friendly error message
 */
export const formatError = (error) => {
  // Handle Mongoose validation errors
  if (error.name === 'ValidationError' && error.errors) {
    const errors = Object.values(error.errors);
    if (errors.length > 0) {
      const firstError = errors[0];
      
      // Handle different types of validation errors
      if (firstError.kind === 'minlength') {
        const field = firstError.path;
        const minLength = firstError.properties.minlength;
        return `${field.charAt(0).toUpperCase() + field.slice(1)} must be at least ${minLength} characters long`;
      }
      
      if (firstError.kind === 'maxlength') {
        const field = firstError.path;
        const maxLength = firstError.properties.maxlength;
        return `${field.charAt(0).toUpperCase() + field.slice(1)} must be at most ${maxLength} characters long`;
      }
      
      if (firstError.kind === 'required') {
        const field = firstError.path;
        return `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
      }
      
      if (firstError.kind === 'enum') {
        const field = firstError.path;
        return `${field.charAt(0).toUpperCase() + field.slice(1)} must be one of the allowed values`;
      }
      
      if (firstError.kind === 'unique') {
        const field = firstError.path;
        return `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
      }
      
      // Default validation error message
      return firstError.message || `Validation failed for ${firstError.path}`;
    }
  }
  
  // Handle Mongoose duplicate key errors
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || 'field';
    return `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
  }
  
  // Handle Cast errors (invalid ObjectId, etc.)
  if (error.name === 'CastError') {
    return `Invalid ${error.path || 'value'}`;
  }
  
  // Handle custom error messages
  if (error.message && !error.message.includes('User validation failed') && !error.message.includes('Path')) {
    return error.message;
  }
  
  // Parse Mongoose error messages that contain "Path" and "length" info
  const pathMatch = error.message.match(/Path `(\w+)`/);
  const lengthMatch = error.message.match(/length (\d+)\)/);
  const minLengthMatch = error.message.match(/minimum allowed length \((\d+)\)/);
  
  if (pathMatch && minLengthMatch) {
    const field = pathMatch[1];
    const minLength = minLengthMatch[1];
    const currentLength = lengthMatch ? lengthMatch[1] : '';
    return `${field.charAt(0).toUpperCase() + field.slice(1)} must be at least ${minLength} characters long${currentLength ? ` (current: ${currentLength})` : ''}`;
  }
  
  // Fallback to original message, but clean it up
  if (error.message) {
    // Remove technical details from Mongoose errors
    let message = error.message
      .replace(/User validation failed: /g, '')
      .replace(/Path `(\w+)` \(`[^`]+`, length \d+\)/g, '$1')
      .replace(/is shorter than the minimum allowed length \((\d+)\)/g, 'must be at least $1 characters long')
      .replace(/is longer than the maximum allowed length \((\d+)\)/g, 'must be at most $1 characters long');
    
    return message;
  }
  
  return 'An error occurred. Please try again.';
};

/**
 * Handles errors and sends appropriate response
 * @param {Error} error - The error object
 * @param {Object} res - Express response object
 * @param {number} defaultStatus - Default HTTP status code (default: 500)
 */
export const handleError = (error, res, defaultStatus = 500) => {
  const message = formatError(error);
  const status = error.status || error.statusCode || defaultStatus;
  
  // Log error for debugging
  console.error('Error:', error);
  
  res.status(status).json({
    success: false,
    message: message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      originalError: error.message
    })
  });
};

