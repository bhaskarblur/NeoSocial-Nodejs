import express, { response } from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import * as userController from './controllers/userController';
import * as postController from './controllers/postController';
const PORT = 10000;
const app= express();
const multer = require('multer');
const path = require('path');

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

app.use(cors({
    credentials:true,
}));
app.use(helmet());
app.use(compression());
app.use(cookieParser());
app.use(bodyParser.urlencoded({
    extended: true
  }));
app.use(bodyParser.json());

const userEndpoint ='/users';
const postsEndpoint ='/posts';

// Single routing
const router = express.Router();

app.use('/v1',router);
 
app.listen(PORT, () => {
    console.log("Server listening on PORT", PORT);
});

router.post(userEndpoint+"/signup", (req, res) => {
    userController.createUser(req, res);
})

router.post(userEndpoint+"/login", (req, res) => {
    userController.loginUser(req, res);
})

router.post(userEndpoint+"/forgot-password", (req, res) => {
    userController.forgotPassword(req, res);
})

router.post(userEndpoint+"/verify-forgot-pass", (req, res) => {
    userController.verifyForgotPass(req, res);
})

router.post(userEndpoint+"/logout-user", (req, res) => {
    userController.logoutUser(req, res);
})

router.post(userEndpoint+"/send-verification-otp", (req, res) => {
    userController.sendVerifyAccountOTP(req, res);
})

router.post(userEndpoint+"/confirm-verification-otp", (req, res) => {
    userController.verifyAccountOTP(req, res);
})

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

router.post(userEndpoint+"/follow-user", (req, res) => {
    userController.followUser(req, res);
})

router.post(userEndpoint+"/user-followers", (req, res) => {
    userController.followersList(req, res);
})

router.post(userEndpoint+"/user-followings", (req, res) => {
    userController.followingsList(req, res);
})

router.post(userEndpoint+"/upload-profile-pic", upload.single('image'),(req, res) => {
    userController.uploadProfilepic(req, res);
    
})

router.post(postsEndpoint+"/delete-post", (req, res) => {
    postController.deletePost(req, res);
})

router.post(userEndpoint+"/set-bio", (req, res) => {
    userController.setBio(req, res);
})

router.post(userEndpoint+"/user-profile", (req, res) => {
    userController.userProfile(req, res);
})

router.post(userEndpoint+"/mutual-followers", (req, res) => {
    userController.mutualFollowersList(req, res);
})

router.post(postsEndpoint+"/post-likes", (req, res) => {
    postController.postlikes(req, res);
})

router.post(postsEndpoint+"/post-comments", (req, res) => {
    postController.postcomments(req, res);
})