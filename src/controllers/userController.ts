import * as bcrypt from 'bcrypt'
import { Request, Response } from "express"
require('dotenv').config()

const neo4j = require('neo4j-driver')
const driver = neo4j.driver(process.env.neo4juri, 
    neo4j.auth.basic(process.env.neo4juser, process.env.neo4jpass))
const db = driver.session()
const fs = require('fs')
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  secure: true
});

async function checkToken(token, email, res) {
  try {
      const user = await db.run(
        'MATCH (n:user) -[:usesToken]->(t:token) WHERE n.email=$email AND t.token=$token RETURN n',
        { email:email, token:token}
      )
    
      if(user.records.length > 0) {
          return true;
      }
      else {
       
          res.status(401).send({"message":"Invalid token!"});
          return false;
      }
    
    }
    catch (err) {
    
      res.status(403).send({"message":err});
      return false;
      
    }
}

export const Encrypt = {

    crypt: (password: string) =>
        bcrypt.genSalt(10)
        .then((salt => bcrypt.hash(password, salt)))
        .then(hash => hash),
    
        compare: (password: string, hashPassword: string) =>
            bcrypt.compare(password, hashPassword)
            .then(resp => resp)
    
    }

    var generateOTP = function (length) {
        return Math.floor(Math.pow(10, length-1) + Math.random() * (Math.pow(10, length) - Math.pow(10, length-1) - 1));
    }

export async function createUser (req:Request, res: Response) {
    try {
        const user = await db.run(
          'MATCH (n:user) WHERE n.email=$email RETURN n ',
          { email: req.body.email }
        )
      
        if(user.records.length > 0) {
          res.status(200).send({"message":"This email already exists!"});
        }
        else {
        
          const token = await Encrypt.crypt(req.body.username);

          const createUser = await db.run
          ('CREATE (n:user {username: $username, email: $email, password: $password , status: $status}) -[:usesToken {lastUsed: $date}]-> (:token {token:$token}) RETURN n'
          , {username: req.body.username, token: token, email: req.body.email, password: await Encrypt.crypt(req.body.password), status: "unverified", date: new Date().toISOString()});

          const singleuser = createUser.records[0]
          const user = singleuser.get(0);


          const data={};
          data['userDetails']=user.properties
          data['token'] = token;
          res.status(200).send({"message":"User created","data":data});
        }
      

      }
      catch (err) {
        res.status(401).send({"message":err});
        
      }
}

export async function loginUser(req: Request, res: Response) {
  try {
    const user = await db.run(
      'MATCH (n:user) WHERE n.email=$email RETURN n ',
      { email: req.body.email }
    )
  
    if(user.records.length > 0) {
      const singleUser = user.records[0].get(0);


    
      if(await Encrypt.compare(req.body.password, singleUser.properties.password)) {
        const data = singleUser.properties;
        const token = await Encrypt.crypt(singleUser.properties.username);
        await db.run("MATCH (n:user) where n.email=$email CREATE (t:token {token:$token}) <-[:usesToken {lastUsed: $date}]- (n) Return t",
        {email: req.body.email, token:token, date: new Date().toISOString()})
        data['Token'] = token;
        res.status(200).send({"message":"Login successful!", "userDetails":data});
      }
      else {
        res.status(200).send({"message":"Incorrect email or password"});
      }
    }
    else {
      res.status(404).send({"message":"This user does not exist!"});
    }
    
  }
  catch(err){

    res.status(400).send({"message":err.message})
  }

}

export async function forgotPassword(req: Request, res: Response) {
  try {
    const user = await db.run(
      'MATCH (n:user) WHERE n.email=$email RETURN n',
      { email: req.body.email }
    )
  
    if(user.records.length > 0) {
      var otp = String(generateOTP(6));

      const makeOTP = await db.run('MATCH (n:user) WHERE n.email=$email CREATE (o: userotp{otp: $otp}) <-[:usesOtp {otpType:"forgpass"}]- (n) ',
      {email:req.body.email, otp:otp});

      // NO OTP service has been used but you can use any.

      res.status(200).send({"message":"Forgot password OTP Sent to "+req.body.email, "OTP":otp});
    }
    else {
      res.status(404).send({"message":"This user does not exist!"});
    }
    
  }
  catch(err){

    res.status(400).send({"message":err.message})
  }
}

export async function verifyForgotPass(req: Request, res: Response) {
  try {
    const user = await db.run(
      'MATCH (n:user) WHERE n.email=$email RETURN n',
      { email: req.body.email }
    )
  
    if(user.records.length > 0) {

      const makeOTP = await db.run('MATCH (n:user) -[rel:usesOtp]-> (otp: userotp) WHERE n.email=$email return otp;',
      {email:req.body.email});

      const otp = makeOTP.records[0].get(0).properties.otp;

    
      if(req.body.otp === String(otp)) {
        await db.run('MATCH (n:user) -[rel:usesOtp]-> (otp: userotp) WHERE n.email=$email DETACH DELETE otp',
        {email:req.body.email});
        res.status(200).send({"message":"OTP Correct, you can reset your password now!"});
      }
      else {
        res.status(401).send({"message":"Incorrect OTP!"});
      }
      
    }
    else {
      res.status(404).send({"message":"This user does not exist!"});
    }
    
  }
  catch(err){

    res.status(400).send({"message":err.message})
  }
}

export async function logoutUser(req: Request, res: Response) {
  try {
    const user = await db.run(
      'MATCH (n:user) WHERE n.email=$email RETURN n ',
      { email: req.body.email }
    )
  
    if(user.records.length > 0) {
      const singleUser = user.records[0].get(0);

      await db.run('Match (n:user) -[u:usesToken]-> (t:token) where t.token = $token detach delete t',
      {token:req.body.token});

      res.status(200).send({"message":"Logged out successfully!"});
    }
    else {
      res.status(404).send({"message":"This user does not exist!"});
    }
    
  }
  catch(err){

    res.status(400).send({"message":err.message})
  }
}

export async function sendVerifyAccountOTP(req: Request, res: Response) {
  try {
    const user = await db.run(
      'MATCH (n:user) WHERE n.email=$email RETURN n',
      { email: req.body.email }
    )
  
    console.log(user.records);
    if(user.records.length > 0) {
      var otp = String(generateOTP(6));

      const makeOTP = await db.run('MATCH (n:user) WHERE n.email=$email CREATE (o: userotp{otp: $otp}) <-[:usesOtp {otpType:"verifyacc"}]- (n) ',
      {email:req.body.email, otp:otp});

      // NO OTP service has been used but you can use any.
      res.status(200).send({"message":"Verify account OTP Sent to "+req.body.email, "OTP":otp});
    }
    else {
      res.status(404).send({"message":"This user does not exist!"});
    }
    
  }
  catch(err){

    res.status(400).send({"message":err.message})
  }
}

export async function verifyAccountOTP(req: Request, res: Response) {
  try {
    const user = await db.run(
      'MATCH (n:user) WHERE n.email=$email RETURN n',
      { email: req.body.email }
    )
  
    if(user.records.length > 0) {

      const makeOTP = await db.run('MATCH (n:user) -[rel:usesOtp]-> (otp: userotp) WHERE n.email=$email AND rel.otpType="verifyacc" return otp;',
      {email:req.body.email});

      const otp = makeOTP.records[0].get(0).properties.otp;

      if(req.body.otp === String(otp)) {
        await db.run('MATCH (n:user) WHERE n.email=$email set n.status="verified"',{email:req.body.email})
        await db.run('MATCH (n:user) -[rel:usesOtp]-> (otp: userotp) WHERE n.email=$email DETACH DELETE otp',
        {email:req.body.email});
      
        res.status(200).send({"message":"OTP Correct, your account is now verified!"});
      }
      else {
        res.status(401).send({"message":"Incorrect OTP!"});
      }
      
    }
    else {
      res.status(404).send({"message":"This user does not exist!"});
    }
    
  }
  catch(err){

    res.status(400).send({"message":err.message})
  }
}

export async function setBio (req: Request, res:Response) {

  try{
    if(await checkToken(req.body.token, req.body.email, res)) {
      await db.run('MATCH (n:user) where n.email=$email set n.bio=$bio return n', 
      {email:req.body.email, bio:req.body.bio});
      res.status(200).send({"message":"Bio updated successfully!"});
    }
  }
  catch(err){
    res.status(403).send({"message":err.message});
  }
}

export async function setLink (req: Request, res:Response) {

  try{
    if(await checkToken(req.body.token, req.body.email, res)) {
      await db.run('MATCH (n:user) where n.email=$email set n.link=$link return n', 
      {email:req.body.email, link:req.body.link});
      res.status(200).send({"message":"Link updated successfully!"});
    }
  }
  catch(err){
    res.status(403).send({"message":err.message});
  }
}

export async function setPhone (req: Request, res:Response) {

  try{
    if(await checkToken(req.body.token, req.body.email, res)) {
      await db.run('MATCH (n:user) where n.email=$email set n.phone=$phone return n', 
      {email:req.body.email, phone:req.body.phone});
      res.status(200).send({"message":"Phone number updated successfully!"});
    }
  }
  catch(err){
    res.status(403).send({"message":err.message});
  }
}

export async function uploadProfilepic (req: Request, res:Response) {
  try{
    if(await checkToken(req.body.token, req.body.email, res)) {
      const uploadImage = async (imagePath) => {

        // Use the uploaded file's name as the asset's public ID and 
        // allow overwriting the asset with new versions
        const options = {
          use_filename: true,
          unique_filename: false,
          overwrite: true,
        };
    
        try {
          const result = await cloudinary.uploader.upload(imagePath, options);
          await db.run('MATCH (n:user) where n.email=$email set n.profilepic=$image_ return n', 
          {email:req.body.email, image_:String(result.secure_url)});
          console.log(req.file.path);
          fs.unlink(req.file.path, (err) => {
            if (err) {
              console.error(err)
              return
            }
          })
          res.status(200).send({"message":"Image Uploaded!", "image":result.secure_url});
          return result.public_id;
        } catch (error) {
          res.status(403).send({"message":error.message});
        }
    };

    uploadImage(req.file?.path)
    }
  }
  catch(err){
    res.status(403).send({"message":err.message});
  }

}

export async function followUser(req:Request, res: Response) {
  try{
    if(await checkToken(req.body.token, req.body.email, res)) {

      if(req.body.action === String(0)) {
      await db.run('MATCH (u:user), (ou:user) where u.email=$email AND ou.email=$fuserid CREATE (u) -[:follows{followDateTime:$date}]-> (ou), (u) <-[:followedBy{followDateTime:$date}]- (ou)',
      {email:req.body.email, fuserid:req.body.fuserid, date:new Date().toISOString()});

      res.status(200).send({"message":"You started following the user!"});
      }
      else {
        await db.run('MATCH (u:user)-[rel:follows]->(ou:user), (u)<-[rel2:followedBy]-(ou) where u.email=$email AND ou.email=$fuserid detach delete rel, rel2',
        {email:req.body.email, fuserid:req.body.fuserid, date:new Date().toISOString()});
  
        res.status(200).send({"message":"You unfollowed the user!"});
      }
    }
}
    catch(err){
          res.status(403).send({"message":err.message});
    }
}

export async function followersList(req: Request, res:Response) {
  try{
    if(await checkToken(req.body.token, req.body.email, res)) {

      const followers= await db.run('MATCH (n:user)-[:followedBy]->(m:user) where n.email=$email return m.username, m.email ORDER BY m.username ASC'
      , {email:req.body.email});

      if(followers.records.length > 0) {
        
        const allFollowers=[];

        followers.records.forEach(element => {
          var follower={};
          follower= {"username":element._fields[0], "email":element._fields[1],"profilepic": element._fields[2]};
          // console.log(element._fields[0].properties);
          allFollowers.push(follower)
        });
        res.status(200).send({"message":"Followers list", 'Followers':allFollowers});
    }
    else {
      res.status(404).send({"message":"No followers found"});
    }
  }
}
catch(err){
  res.status(403).send({"message":err.message});
}

}

export async function followingsList(req: Request, res:Response) {
  try{
    if(await checkToken(req.body.token, req.body.email, res)) {

      const followers= await db.run('MATCH (n:user)-[:follows]->(m:user) where n.email=$email return m.username, m.email, m.profilepic ORDER BY m.username ASC'
      , {email:req.body.email});

      if(followers.records.length > 0) {
        
        const allFollowers=[];

        followers.records.forEach(element => {
          var follower={};
          follower= {"username":element._fields[0], "email":element._fields[1], "profilepic": element._fields[2]};
          // console.log(element._fields[0].properties);
          allFollowers.push(follower)
        });
        res.status(200).send({"message":"Followings list", 'Followings':allFollowers});
    }
    else {
      res.status(404).send({"message":"No followings found"});
    }
  }
}
catch(err){
  res.status(403).send({"message":err.message});
}

}

export async function userProfile(req: Request, res:Response) {
  try{

    if(await checkToken(req.body.token, req.body.email, res)) {
      const profile = await db.run("MATCH (n:user) where n.email=$uemail Return n.username as username ,n.email as email , n.profilepic as profilepic , n.bio as bio, n.link as link, n.phone as phone",
      {uemail: req.body.uemail})

      
      const posts= await db.run('MATCH (n:user) -[:posts]->(p:posts) where n.email=$uemail return p',
      {uemail: req.body.uemail})
      const details={}
      var followers = await db.run('MATCH (c:user)-[:followedBy]-> (ou:user) where c.email=$uemail return COUNT(ou)',
      {uemail:req.body.uemail})

      var followings = await db.run('MATCH (c:user)-[:follows]-> (ou:user) where c.email=$uemail return COUNT(ou)',
      {uemail:req.body.uemail})

      var isFollowed = await db.run('MATCH (n:user)-[:followedBy]->(m:user) where n.email=$uemail AND  m.email=$email return m;')
 
      details['username'] = profile.records[0]._fields[0];
      details['email'] = profile.records[0]._fields[1];
      details['profilepic'] = profile.records[0]._fields[2]
      details['bio'] = profile.records[0]._fields[3];
      details['link'] = profile.records[0]._fields[4];
      if(req.body.email === req.body.uemail) {
      details['phone'] = profile.records[0]._fields[5];
      }
      details['followersCount'] = followers.records[0].get(0).low;
      details['followingsCount'] = followings.records[0].get(0).low;
      var posts_=[]
      posts.records.forEach(record => {
        var post= record._fields[0].properties;
        posts_.push(post);
      })
      if(isFollowed.records.length > 0) {
        details['isFollowed'] = 1;
      }
      else {
        details['isFollowed'] = 0;
      }
      details['posts'] = posts_;
      res.status(200).send({"message":"User details", "userDetails":details});
    }
  }
  catch(err){
    res.status(403).send({"message":err.message});
  }
  

}

export async function mutualFollowersList(req: Request, res:Response) {
  try{
    if(await checkToken(req.body.token, req.body.email, res)) {

      const followers= await db.run('MATCH (a:user)-[:followedBy]-> (c:user), (b:user)-[:followedBy]->(c) where a.email=$aemail AND b.email=$bemail return c.username as username, c.email as email,c.profilepic as profilepic'
      , {aemail:req.body.email, bemail: req.body.fuserid});

      if(followers.records.length > 0) {
        
        const allFollowers=[];

        followers.records.forEach(element => {
          var follower={};
          follower= {"username":element._fields[0], "email":element._fields[1],"profilepic": element._fields[2]};
          // console.log(element._fields[0].properties);
          allFollowers.push(follower)
        });
        res.status(200).send({"message":"Followers list", 'Followers':allFollowers});
    }
    else {
      res.status(404).send({"message":"No followers found"});
    }
  }
}
catch(err){
  res.status(403).send({"message":err.message});
}

}

export async function deleteUser(req:Request, res:Response) {
  try{
    if(await checkToken(req.body.token, req.body.email, res)) {
    
    await db.run('MATCH (n:user)-[:posts]->(p:posts), (n)-[:usesToken]->(t:token), where n.email=$email detach delete n,p,t;'
       , {email: req.body.email, id:req.body.postid});

       res.status(200).send({"message":"User deleted! You've been logged out,"});
     
}
}
catch(err){
  res.status(403).send({"message":err.message});
}

}

