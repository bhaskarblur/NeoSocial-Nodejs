import express, { response } from 'express';

const router = express.Router();
const multer = require('multer');
const path = require('path');
import * as postController from '../controllers/postController';

const postsEndpoint ='/posts';

const _storage = multer.diskStorage({
    destination:(req, file, cb)=>{
      cb(null,__dirname+'/images')
    },
    filename: (req,file,cb) => {
      console.log(file);
      cb(null, Date.now() + path.extname(file.originalname))
    }
  })
  
  const upload = multer({ storage : _storage});
export function getRouter() {
    return router;
}


router.post(postsEndpoint+"/post-feed", (req, res) => {
    postController.getAllPosts(req, res);
})

router.post(postsEndpoint+"/create-post", upload.single('image'), (req, res) => {
    postController.createPost(req, res);
})

router.post(postsEndpoint+"/user-all-posts", (req, res) => {
    postController.getUserAllPosts(req, res);
})

router.post(postsEndpoint+"/like-post", (req, res) => {
    postController.likePost(req, res);
})

router.post(postsEndpoint+"/comment-on-post", (req, res) => {
    postController.commentOnPost(req, res);
})

router.post(postsEndpoint+"/liked-post", (req, res) => {
    postController.likedPosts(req, res);
})


router.post(postsEndpoint+"/post-likes", (req, res) => {
    postController.postlikes(req, res);
})

router.post(postsEndpoint+"/post-comments", (req, res) => {
    postController.postcomments(req, res);
})

router.post(postsEndpoint+"/single-post", (req, res) => {
    postController.singlePost(req, res);
})

router.post(postsEndpoint+"/save-post", (req, res) => {
    postController.savePost(req, res);
})

router.post(postsEndpoint+"/saved-posts", (req, res) => {
    postController.savedPosts(req, res);
})

router.post(postsEndpoint+"/delete-post", (req, res) => {
    postController.deletePost(req, res);
})
