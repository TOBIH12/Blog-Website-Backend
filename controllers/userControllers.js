const HttpError = require("../models/errorModel");
const userModel = require("../models/userModel");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const {v4: uuid} = require('uuid');
 const cloudinary = require('../cloudinaryConfig'); 
 // Comment if you do not want to use Cloudinary for image uploads

// ======================== REGISTER NEW USER ==================//
// POST : api/users/register


// UNPROTECTED
module.exports.registerUser = async (req, res, next) => {
   try {
    const {name, email, password, password2} = req.body;

    if(!name || !email || !password || !password2) {
        return next(new HttpError('Fill in all fields', 422))
    }

    const newEmail = email.toLowerCase()

    const emailExists = await userModel.findOne({email: newEmail})
    if(emailExists) {
        return next(new HttpError('Email already exists', 422))
    }

    if((password.trim()).length < 6) {
        return next(new HttpError('Password must be at least 6 characters', 422))
    }

    if(password != password2) {
        return next(new HttpError('Passwords do not match.', 422))
    }

    const salt = await bcrypt.genSalt(10)
    const hashedPass = await bcrypt.hash(password, salt);

    const newUser = await userModel.create({name, email: newEmail, password: hashedPass})
    res.status(201).send(`New user: ${newUser.email} created!`);

   } catch (error) {
    return next(new HttpError('User registration failed.', 422))
   }
}



// ======================== LOGIN A REGISTERED USER ==================//
// POST : api/users/login
// UNPROTECTED
module.exports.loginUser = async (req, res, next) => {
   try {
    const {email, password} = req.body;

    if(!email || !password) {
        return next(new HttpError('Fill in all fields', 422))
    }
    

    const userEmail = email.toLowerCase();
    const checkedEmail = await userModel.findOne({email: userEmail})
   
    if(!checkedEmail){
        return next(new HttpError('Invalid Credentials', 422))
    }

    const checkPass = await bcrypt.compare(password, checkedEmail.password);
    if(!checkPass) {
        return next(new HttpError('Invalid Credentials', 422))
    }
  
   const {_id: id, name} = checkedEmail;
   const token = jwt.sign({id, name}, process.env.JWT_SECRET, {expiresIn: "1d"})

   res.status(201).json({token, id, name});
    
   } catch (error) {
    next(new HttpError('Login failed, recheck credentials', 422))
    console.log(error);
    
    
   }
}


// ======================== USER PROFILE ==================//
// POST : api/users/:id
// PROTECTED
module.exports.getUser = async (req, res, next) => {
   try {
    const {id} = req.params;
    const user = await userModel.findById(id).select('-password');
    if(!user){
        return next(new HttpError('User not found', 404))
    }

    res.status(200).send(user)
    
   } catch (error) {
    return next(new HttpError(error, 404))
    
   }
}


// ======================== CHANGE USER AVATAR (PROFILE PICTURE) ==================//
// POST : api/users/change-avatar
// PROTECTED
module.exports.changeAvatar = async (req, res, next) => {

   try {
    if(!req.files.avatar){
        return next(new HttpError('Please choose an image', 422))
    }

    // Find user from database (PROTECTED!!)
    const user = await userModel.findById(req.user.id)
    // delete old avatar if exists
    if(user.avatar){
      await  fs.promises.unlink(path.join(__dirname, '..', 'uploads', user.avatar )).catch(() => { /* ignore errors */ });
    }

    const {avatar} = req.files;
    // check fie size
    if(avatar.size > 500000) {
        return next(new HttpError('Selected image is too large, it should be less than 500kb'))
    }

    // let fileName;
    // fileName = avatar.name;
    // let splittedFileName = fileName.split('.')
    // let newFileName = splittedFileName[0] + uuid() + '.' + splittedFileName[splittedFileName.length - 1]



    // Upload to cloudinary
    // console.log('Avatar File:', avatar);
    const uploadedImage = await cloudinary.uploader.upload(avatar.tempFilePath, {
        resource_type: "auto",
       folder: 'avatars',
    }).catch(err => {
       console.error('Cloudinary Upload Error:', err);});
    if(!uploadedImage || !uploadedImage.public_id){
        return next(new HttpError('Image upload failed, try again', 500))
    }

    // console.log('Uploaded Image:', uploadedImage);

        const imageID = uploadedImage.public_id + '.' + uploadedImage.format;
        
        // Save the new avatar to the database
       const updatedAvatar = await userModel.findByIdAndUpdate(req.user.id, {avatar: imageID}, {new: true})
        


       if(!updatedAvatar){
        return next(new HttpError('Failed to update', 422))
       }

       

       res.status(201).send(updatedAvatar)

   } catch (error) {
    console.error(error); // Log the error for debugging
    return next(new HttpError('An unexpected error occurred', 500));
   }
}


// ======================== EDIT USER DETAILS ==================//
// PUT : api/users/edit-user
// PROTECTED
module.exports.editUser = async (req, res, next) => {
    try {
        const {name, email, currentPassword, newPassword, newConfirmNewPassword} = req.body;

        if(!name || !email || !currentPassword || !newPassword || !newConfirmNewPassword){
            return next(new HttpError('Fill in all fields', 422))
        }

        // GET USER FROM DATABASE
        const user = await userModel.findById(req.user.id);
        if(!user) {
            return next(new HttpError('User not found', 403))
        }

        // make sure new email doesn't already exist
        const userEmail = email.toLowerCase()
        const checkUserEmail = await userModel.findOne({email: userEmail})

        // Incase we want to update our details with or without changing our email (which is a unique email since we use it to login)
        if(checkUserEmail && (checkUserEmail._id != req.user.id)){
            return next(new HttpError('Email already exists.', 422))
        }

        // compare current password to database password
        const validateUserPassword = await bcrypt.compare(currentPassword, user.password)
        if(!validateUserPassword){
            return next(new HttpError('Invalid current password', 422))
        }

        // compare new passwords
        if(newPassword != newConfirmNewPassword){
            return next(new HttpError('New passwords do not match', 422))
        }
        // hash new passwords
        const salt = await bcrypt.genSalt(10)
        const hashNewPass = await bcrypt.hash(newPassword, salt);

        // update user info in database
        const newInfo = await userModel.findByIdAndUpdate(req.user.id, {name, email, password: hashNewPass}, {new: true})
        res.status(201).send(newInfo)

    } catch (error) {
        return next(new HttpError(error))
    }
}



// ======================== GET ALL AUTHORS ==================//
// POST : api/users/authors
// UNPROTECTED
module.exports.getAuthors = async (req, res, next) => {
    try {
        const allAuthors = await userModel.find().select('-password')
        if(!allAuthors){
          return next(new HttpError('No authors found', 404))
        }
          res.status(200).send(allAuthors);
        
    } catch (error) {
        return next(new HttpError(error, 404))
    }

}