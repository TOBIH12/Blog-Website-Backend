const postModel = require('../models/postModel');
const userModel = require('../models/userModel');
const  path  = require('path');
const fs = require('fs');
const {v4: uuid} = require('uuid')
const HttpError = require('../models/errorModel');
const { errorMonitor } = require('stream');
const cloudinary = require('../cloudinaryConfig');

// ================== CREATE A POST ========================
// POST : api/posts
//PROTECTED
module.exports.createPost = async (req, res, next) =>{
   try {
     let {title, category, description} = req.body;
     if(!title || !category || !description || !req.files){
        return next(new HttpError('Fill in all fields, and choose image'))
     }
     const {thumbnail} = req.files
    //  check file size
    if(thumbnail.size > 2000000){
        return next(new HttpError('Image is too big, file should be less than 2mb '))
    }
    // let fileName = thumbnail.name;
    // let splittedFileName = fileName.split('.')
    // let newFileName = splittedFileName[0] + uuid() + '.' + splittedFileName[splittedFileName.length - 1]

    // Upload to Cloudinary
    console.log("Thumbnail", thumbnail)

const uploadedThumbnail = await cloudinary.uploader.upload(thumbnail.tempFilePath, {
    resource_type: "auto",
    folder: 'thumbnails',
}).catch(err => {
        console.error("Cloudinary Upload error", err);
});
if(!uploadedThumbnail || !uploadedThumbnail.public_id){
    return next(new HttpError('Image upload failed, try again', 500))
}

console.log('Uploaded Image:', uploadedThumbnail);


    const thumbnailID = uploadedThumbnail.public_id + '.' + uploadedThumbnail.format;



    // SEND UNIQUE IMAGE CLOUDINARY PATH TO DATABASE   
            const newPost = await postModel.create({title, category, description, thumbnail: thumbnailID, creator: req.user.id})
            if(!newPost){
                return next(new HttpError("Post couldn't be created", 422))
            }
            // find current user and increase post count by 1
            const currentUser = await userModel.findById(req.user.id);
            const userPostCount = currentUser.posts + 1;
            await userModel.findByIdAndUpdate(req.user.id, {posts: userPostCount})

            res.status(201).send(newPost);
       
   
   } catch (error) {
    return next(new HttpError(error))
   }
};

// ==================  GET ALL POSTS ========================
// GET : api/posts
//UNPROTECTED
module.exports.getPosts = async (req, res, next) =>{
    try {
        const posts = await postModel.find().sort({createdAt: -1});
        res.send(posts)
    } catch (error) {
        return next(new HttpError(error))
    }
}



// ================== GET SINGLE POST========================
// GET : api/posts/:id
//UNPROTECTED
module.exports.getSinglePost = async (req, res, next) =>{
    try {
        let postId = req.params.id
        const singlePost = await postModel.findById(postId)
        if(!singlePost){
            return next(new HttpError('Post not found', 404))
        }
        res.status(200).send(singlePost)
    } catch (error) {
        return next(new HttpError(error))
    }
}



// ================== GET POSTS BY CATEGORY ========================
// GET : api/posts/categories/:category
//UNPROTECTED
module.exports.getCatPosts = async (req, res, next) =>{
    try {
        let {category} = req.params;
        const catPost = await postModel.find({category}).sort({createdAt: -1})
        if(!catPost){
            return next(new HttpError('No Posts found', 404))
        }

        res.status(200).send(catPost);
    } catch (error) {
        return next(new HttpError(error))
    }
}


// ================== GET POSTS BY AUTHOR/USER ========================
// GET : api/posts/users/:id
//UNPROTECTED
module.exports.getUserPosts = async (req, res, next) =>{
   try {
    let userPostsID = req.params.id
     await postModel.find({creator: userPostsID}).sort({createdAt: -1})
     .then((data) => {
        if(!data){
            return next(new HttpError('No posts from author found', 404))
        }
        res.status(200).send(data)
     })

   } catch (error) {
    return next(new HttpError(error))
   }
}



// ==================EDIT POSTS ========================
// PUT : api/posts/edit/:id
//PROTECTED
module.exports.editPost = async (req, res, next) =>{
    try {
       let fileName;
       let newFileName;
       let updatedPost;
       let postId = req.params.id;
       let {title, category, description} = req.body;

       if(!title || !category || description < 12){
        return next(new HttpError('Fill in all fields', 422))
       }
        // get old post from database
        const oldPost = await postModel.findById({_id: postId});
if(oldPost.creator){
    if(!req.files){
        updatedPost = await postModel.findByIdAndUpdate(postId, {title, category, description}, {new: true}).then((data) => {
        if(!data){
            return next(new HttpError('Post was unable to be updated', 400))
        } else{
            res.status(200).send(data);
        } })
       } else{

        // delete old thumbnaik from post
        // fs.unlink(path.join(__dirname, "..", "/uploads", oldPost.thumbnail), async (err) => {
        //     if (err) {
        //         return next(new HttpError(err))
        //     }
        // });
        // check new thumbnail size
        const {thumbnail} =  req.files;
        if(thumbnail.size > 2000000){
            return next(new HttpError('File size too big, choose a smaller image', 422))
        }
        // edit thumbnail name
        // fileName = thumbnail.name
        // let splittedFileName = fileName.split('.')
        // newFileName = splittedFileName[0] + uuid() + '.' + splittedFileName[splittedFileName.length - 1]
        // // upload thumbnail
        // thumbnail.mv(path.join(__dirname, '..', '/uploads', newFileName), async (err) =>{
        //     if(err){
        //         return next(new HttpError(err))
        //     }

        // })

        console.log("Thumbnail", thumbnail)

const uploadedThumbnail = await cloudinary.uploader.upload(thumbnail.tempFilePath, {
    resource_type: "auto",
    folder: 'thumbnails',
}).catch(err => {
        console.error("Cloudinary Upload error", err);
});
if(!uploadedThumbnail || !uploadedThumbnail.public_id){
    return next(new HttpError('Image upload failed, try again', 500))
}

console.log('Uploaded Image:', uploadedThumbnail);


    const thumbnailID = uploadedThumbnail.public_id + '.' + uploadedThumbnail.format;

        await postModel.findByIdAndUpdate(postId, {title, category, description, thumbnail: thumbnailID}, {new: true}).then((data) => {
            if(!data){
                return next(new HttpError('Post was unable to be updated', 400))
            } else{
                res.status(200).send(data);
            }
        })
       }

       
} else{
    return next(new HttpError(`Cannot edit another author's post`, 422))
}
     
    } catch (error) {
        return next(new HttpError(error))
    }
}


// ====================== LIKE POST ========================
// PUT : api/posts/like/:id
//PROTECTED

module.exports.likePost = async (req, res, next) =>{
    try {
        const postId = req.params.id;
        if(!postId){
            return next(new HttpError('Post unavailable', 400))
        }
        const post = await postModel.findById(postId)
        if(!post){
            return next(new HttpError('Post not found', 404))
        }
       
        const hasLiked = post.likes.includes(req.user.id);
        if(hasLiked){
            // Unlike
            post.likes = post.likes.filter(id => id.toString() !== req.user.id.toString());
        } else {
            // like
            post.likes.push(req.user.id)
        }
       
       
       await post.save();
       res.json(post.likes.length);
    } catch (error) {
        return next(new HttpError(error))
    }
};

// // ====================== UnLIKE POST ========================
// // PUT : api/posts/unlike/:id
// //PROTECTED

// module.exports.unlikePost = async (req, res, next) =>{
//     try {
//         const postId = req.params.id;
//         if(!postId){
//             return next(new HttpError('Post unavailable', 400))
//         }
//         const post = await postModel.findById(postId)
//         if(!post){
//             return next(new HttpError('Post not found', 404))
//         }
//         const likeCount = post.likes - 1;
//         const  unlikeUser = req.user.id
        


//         await postModel.findByIdAndUpdate(postId, {likes: likeCount}, {new: true})
//         .then((data) => {
//             if(!data){
//                 return next(new HttpError('Unable to unlike post', 400))
//             } else{
//                 res.status(200).send(data)
//             }
//         })
//     } catch (error) {
//         return next(new HttpError(error))
//     }
// }



// ==================DELETE POSTS ========================
//DELETE : api/posts/:id
//PROTECTED
module.exports.deletePost = async (req, res, next) =>{

    try {
        const postId = req.params.id;
        if(!postId){
            return next(new HttpError('Post unavailable', 400))
        }
        const post = await postModel.findById(postId)
    //    delete thumbnail from uploads
    if(post.creator){
        console.log("Post Thumbnail to delete:", post.thumbnail)
       await cloudinary.uploader.destroy(post.thumbnail.split('.')[0], async (err, result) => {
            if (err) {
                    return next(new HttpError(err))
                
            } else{
                 // delete the main document
                await postModel.findByIdAndDelete(postId);
                // Find user and reduce post count by 1
                 const currentUser = await userModel.findById(req.user.id);
                const userPostCount = currentUser.posts - 1;
                await userModel.findByIdAndUpdate(req.user.id, {posts: userPostCount});
                res.status(202).send(`Post ${postId} deleted successfully`);
            }
        })

    } else{
        return next(new HttpError('Cannot delete post by another author', 422))
    }
        
    } catch (error) {
        return next(new HttpError(error))
    }
   

}