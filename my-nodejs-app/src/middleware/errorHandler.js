// src/middleware/errorHandler.js

// This is a generic error handling middleware.
// It catches any errors thrown by the application.
// The four arguments (err, req, res, next) are required for Express to
// recognize it as an error handler.
function errorHandler(err, req, res, next) {
    // Log the error to the console for debugging
    console.error(err.stack);

    // Set a default status code (500 for Internal Server Error)
    const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
    res.status(statusCode);

    // Send a JSON response with the error message
    // In a production environment, you might not want to expose the full error stack.
    res.json({
        message: err.message,
        // Only include the stack trace in development mode
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
}

module.exports = errorHandler;