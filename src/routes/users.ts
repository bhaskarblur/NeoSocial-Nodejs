import express, { response } from 'express';

const router = express.Router();
const multer = require('multer');
const path = require('path');
import * as userController from '../controllers/userController';

const userEndpoint ='/users';

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

router.post(userEndpoint+"/set-bio", (req, res) => {
    userController.setBio(req, res);
})

router.post(userEndpoint+"/user-profile", (req, res) => {
    userController.userProfile(req, res);
})

router.post(userEndpoint+"/mutual-followers", (req, res) => {
    userController.mutualFollowersList(req, res);
})