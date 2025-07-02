const jwt = require('jsonwebtoken')
const HttpError = require('../models/errorModel');

const authMiddleware = async (req, res, next) =>{
    const Authorization = req.headers.Authorization || req.headers.authorization;
   
    // Check if Authorization header is present and starts with 'Bearer'
    if(Authorization && Authorization.startsWith('Bearer')) {
        // Extract the token from the Authorization header
        
        const token = Authorization.split(' ')[1]
        jwt.verify(token, process.env.JWT_SECRET, (error, info) =>{
            if(error){
                return next(new HttpError('Unathorized. Invalid token', 403))
            }

            req.user = info;
            next()
        })
    } else {
        return next(new HttpError('Unathorized. No token', 402))
    }
}

module.exports = {authMiddleware};