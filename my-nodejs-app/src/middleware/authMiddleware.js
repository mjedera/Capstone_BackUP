const authMiddleware = (requiredRole) => {
    return (req, res, next) => {

        const isApiRequest =
        req.originalUrl.startsWith('/applicants') ||
        req.originalUrl.startsWith('/api') ||
        req.originalUrl.startsWith('/cashier/partials');


        // Not logged in
        if (!req.session || !req.session.username) {

            if (isApiRequest) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized. Please log in.'
                });
            }
 
            return res.redirect('/login');
        }

        // Role check (supports single or multiple roles)
        if (requiredRole) {
            const allowedRoles = Array.isArray(requiredRole)
                ? requiredRole
                : [requiredRole];

            if (!allowedRoles.includes(req.session.role)) {

                if (isApiRequest) {
                    return res.status(403).json({
                        success: false,
                        message: 'Forbidden. Insufficient permissions.'
                    });
                }

                return res
                    .status(403)
                    .send('<h1>Forbidden</h1><p>You do not have permission to access this page.</p>');
            }
        }

        next();
    };
};

module.exports = authMiddleware;
