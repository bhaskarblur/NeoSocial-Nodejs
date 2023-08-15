import { Request, Response } from "express"
require('dotenv').config()
const neo4j = require('neo4j-driver')
const driver = neo4j.driver(process.env.neo4juri, 
    neo4j.auth.basic(process.env.neo4juser, process.env.neo4jpass))
const db = driver.session()
import * as bcrypt from 'bcrypt';
const fs = require('fs')
const { promisify } = require('util');
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  secure: true
});
export const Encrypt = {

    generateId: (input: string) =>
        bcrypt.genSalt(10)
        .then((salt => bcrypt.hash(input, salt)))
        .then(hash => hash),
    
        compareId: (input: string, hashPassword: string) =>
            bcrypt.compare(input, hashPassword)
            .then(resp => resp)
    
    }

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

export async function createPost(req: Request, res: Response) {

    try {
        const user = await db.run(
          'MATCH (n:user) -[:usesToken]->(t:token) WHERE n.email=$email AND t.token=$token RETURN n',
          { email: req.body.email, token:req.body.token}
        )
      
        if(user.records.length > 0) {
            const postid = await Encrypt.generateId(String(Date.now()));
            try {
                const options = {
                    use_filename: true,
                    unique_filename: false,
                    overwrite: true,
                  };
              
                const result = await cloudinary.uploader.upload(req.file.path, options);
                fs.unlink(req.file.path, (err) => {
                    if (err) {
                      console.error(err)
                      return
                    }
                  })
                const createPost = await db.run
                ('MATCH (n:user) where n.email=$email CREATE (p:posts {postid:$id, posttext:$posttext, location:$location, image:$image}) <-[:posts {uploadDateTime: $date}]-(n), (p) -[:postedBy{uploadDateTime: $date}]-> (n) return p'
                , {email: req.body.email, id:postid, posttext:req.body.posttext,location: req.body.location, image:String(result.secure_url), date: new Date().toISOString()});
      
                const singlepost = createPost.records[0]
                const post = singlepost.get(0);
      
                const data={};
                data['postDetails'] = post.properties;
                res.status(200).send({"message":"Posted successfully!","data":data});
              } catch (error) {
                res.status(403).send({"message":error.message});
              }
      
        }
        else {
            res.status(401).send({"message":"Invalid token!"});
        }
      
      }
      catch (err) {
        res.status(403).send({"message":err});
        
      }
}

export async function deletePost(req: Request, res: Response) {
    try {
        const user = await db.run(
          'MATCH (n:user) -[:usesToken]->(t:token) WHERE n.email=$email AND t.token=$token RETURN n',
          { email: req.body.email, token:req.body.token}
        )
      
        if(user.records.length > 0) {
    
             await db.run('MATCH (n:user), (p:posts) where n.email=$email AND p.postid=$id detach delete p;'
                , {email: req.body.email, id:req.body.postid});
    
                res.status(200).send({"message":"Posted deleted!"});
              
      
        }
        else {
            res.status(401).send({"message":"Invalid token!"});
        }
      
      }
      catch (err) {
        res.status(403).send({"message":err});
        
      }
}
export async function getAllPosts(req: Request, res: Response) {

    try{
    if(await checkToken(req.body.token, req.body.email, res)) {
        const allPosts= await db.run('MATCH (p:posts)-[by:postedBy]->(u:user) return [u.email, u.username,p, u.profilepic] as pair ORDER BY by.uploadDateTime DESC');

        if(allPosts.records.length > 0) {
            

            var posts = [];
            allPosts.records.forEach(record => {
                var post={}
                post= record._fields[0][2].properties;
                post['userDetails'] = {"postedBy":record._fields[0][0], "postedByUsername":record._fields[0][1],"profilepic": record._fields[0][3]};
                posts.push(post);
            });
            
    
            res.status(200).send({"message":"Home all Posts","posts":posts});
        }
        else {
            res.status(404).send({"message":"No posts found!"});
        }
    }
}
    catch(err){
        res.status(403).send({"message":err.message});
}
}

export async function getUserAllPosts(req: Request, res: Response) {

    try{
    if(await checkToken(req.body.token, req.body.email, res)) {
        const allPosts= await db.run('MATCH (p:posts) <-[_p:posts]- (u:user) where u.email=$email return [u.email, u.username,p, u.profilepic] as pair ORDER BY _p.uploadDateTime DESC',
        {email:req.body.email});

        if(allPosts.records.length > 0) {
            

            var posts = [];
            allPosts.records.forEach(record => {
                var post={}
                post= record._fields[0][2].properties;
                post['userDetails'] = {"postedBy":record._fields[0][0], "postedByUsername":record._fields[0][1],"profilepic": record._fields[0][3]
            ,"likes":  record._fields[0][4], "comments": record._fields[0][4]};
                posts.push(post);
            });
            
    
            res.status(200).send({"message":"User all Posts","posts":posts});
        }
        else {
            res.status(404).send({"message":"No posts found!"});
        }
    }
}
    catch(err){
        res.status(403).send({"message":err.message});
}
}

export async function likePost(req: Request, res: Response) {
try{
    if(await checkToken(req.body.token, req.body.email, res)) {
        if(req.body.action===String(0)) {
        await db.run('MATCH (n:user),(p:posts) where n.email=$email AND p.postid=$postid CREATE (n)<-[:likedBy{likedDateTime: $date}]-(p), (p) <-[:likedPosts{likedDateTime: $date}]-(n)'
        , {email:req.body.email, postid:req.body.postid, date:new Date().toISOString()});
        res.status(200).send({"message":"Posts liked successfully."});
        }
        else {
            await db.run('MATCH (n:user)<-[rel:likedBy]-(p:posts), (n)-[rel_:likedPosts]-> (p) where n.email=$email AND p.postid=$postid delete rel,rel_'
            , {email:req.body.email, postid:req.body.postid, date:new Date().toISOString()});
            res.status(200).send({"message":"Posts unliked successfully."});
        }

    }
}
    catch(err){
            res.status(403).send({"message":err.message});
    }
}

export async function commentOnPost(req:Request, res: Response) {
    try{
        if(await checkToken(req.body.token, req.body.email, res)) {
           
            await db.run('MATCH (n:user),(p:posts) where n.email=$email AND p.postid=$postid CREATE (n)<-[:commentedBy{commentDateTime: $date}]-(c:comment{comment:$comment}), (p) <-[:commentedOn{commentDateTime: $date}]-(c), (p)-[:comments]->(c)'
            , {email:req.body.email, postid:req.body.postid, comment:req.body.comment, date:new Date().toISOString()});
            res.status(200).send({"message":"Comment posted!"});
    
        }
    }
        catch(err){
                res.status(403).send({"message":err.message});
        }
}

export async function likedPosts(req: Request, res: Response){
    try{
      if(await checkToken(req.body.token, req.body.email, res)) {
  
        const allPosts= await db.run('MATCH (p:posts) <-[:likedPosts]- (u:user), (p)-[:postedBy]->(ou:user) where u.email=$email return [ou.email, ou.username,p, ou.profilepic] as pair',
        {email:req.body.email});
  
        if(allPosts.records.length > 0) {
            var posts = [];
            allPosts.records.forEach(record => {
                var post={}
                post= record._fields[0][2].properties;
                post['userDetails'] = {"postedBy":record._fields[0][0], "postedByUsername":record._fields[0][1], "profilepic": record._fields[0][3]};
                posts.push(post);
            });
            
    
            res.status(200).send({"message":"User all Posts","posts":posts});
        }
        else {
            res.status(404).send({"message":"No posts found!"});
        }
  
      }
  }
      catch(err){
              res.status(403).send({"message":err.message});
      }
  }

  export async function postlikes(req:Request, res:Response) {
    try{
        if(await checkToken(req.body.token, req.body.email, res)) {
      const likes= await db.run('MATCH (p:posts) -[:likedBy]->(c:user) where p.postid=$postid return c.username as username, c.email as email,c.profilepic as profilepic'
      , {postid: req.body.postid});

      console.log(likes);
      if(likes.records.length > 0) {
        
        const allLikes=[];

        likes.records.forEach(element => {
          var follower={};
          follower= {"username":element._fields[0], "email":element._fields[1],"profilepic": element._fields[2]};
          // console.log(element._fields[0].properties);
          allLikes.push(follower)
        });
        res.status(200).send({"message":"Likes list", 'Likes':allLikes});
    }
    else {
        res.status(404).send({"message":"No Likes found"});
    }
        }
    }
    catch(err){
        res.status(403).send({"message":err.message});
}
  }

  export async function postcomments(req:Request, res:Response) {
    try{
        if(await checkToken(req.body.token, req.body.email, res)) {
      const comments= await db.run(
        'MATCH (p:posts) -[:comments]->(com:comment), (com)-[:commentedBy]-(c:user) where p.postid=$postid return c.username as username, c.email as email,c.profilepic as profilepic, com.comment as comment'
      , {postid: req.body.postid});

      if(comments.records.length > 0) {
        
        const allcomments=[];

        comments.records.forEach(element => {
          var comment={};
          comment= {"username":element._fields[0], "email":element._fields[1],"profilepic": element._fields[2]
        , "comment":element._fields[3]};
          // console.log(element._fields[0].properties);
          allcomments.push(comment)
        });
        res.status(200).send({"message":"comments list", 'Comments':allcomments});
    }
    else {
        res.status(404).send({"message":"No comments found"});
    }
        }
    }
    catch(err){
        res.status(403).send({"message":err.message});
}
  }