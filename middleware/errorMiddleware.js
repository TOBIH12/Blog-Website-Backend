// Unsupported (404) routes

const notFound = (req, res, next) => {
    const error = new Error(`Not Found + ${req.originalUrl}`);
    res.status(404);
    next(error);
}

// MIDDLEWARE TO HANDLE ERRORS
const errorHandler = (error, req, res, next) => {
    if(res.headerSent) {
        return next(error)
    }

    res.status(error.code || 500).json({message: error.message || 'Unknown error occured'})
}

module.exports = {notFound, errorHandler}
