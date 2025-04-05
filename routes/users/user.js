import express from "express";
import { queryDatabase } from "../../DBconnection.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv"
import authMiddleware from "../../authMiddleware.js";
dotenv.config()

const userRouter = express.Router();
 
userRouter.post('/registration', async (req, res) => {
   const {username, email, password} = req.body;

try {
   if (!username || !email || !password ) {
      return res.json({error: "all values are important!"})
   }

   const findUser = "SELECT * FROM users WHERE email = ?";
   const value = email;
   const found = await queryDatabase(findUser, value)

   if (found.length > 0) {
      return res.status(400).json({error: `user with email ${email} is already exists`})
   }
   const saltRounds = 10;

   const passwordHash = await bcrypt.hash(password, saltRounds)
   
   const addUser = "INSERT INTO users (username, email, password) VALUES (?, ?, ?) ";
   const userValue = [username, email, passwordHash]

   const addedUser = await queryDatabase(addUser, userValue)
  
   res.json(addedUser)
    
} catch (error) {
   res.json(error.message)
}
})


userRouter.post('/login', async (req, res) => {
   try {
      const {email, password} = req.body;

      if (!email || !password) {
         return res.status(400).json({error: 'all value are required'})
      }
   
      const findUser = 'SELECT * FROM users WHERE email = ?'
      const found = await queryDatabase(findUser, email)
   
      const correctPassword = found === null ? false
      : await bcrypt.compare(password, found[0].password)
   
      if (!(found && correctPassword)) {
         return res.json({error: "invalid email or password"})
      }

      const userForToken = {
         email: found[0].email,
         id: found[0].id
      }
   
      const token = jwt.sign(userForToken, process.env.SECRET)
      res
      .status(200)
      .send({ token,  username: found[0].username , email: found[0].email, id: found[0].id})
      console.log(found[0]);
   } catch (error) {
      res.json(error.name)
   }

})

    


userRouter.get('/get', async (req, res) => {
   const sql = "SELECT * FROM users";
   const answer = await queryDatabase(sql)
   res.json(answer)
})


userRouter.get('/get/:id', authMiddleware, async (req, res) => {
   try {
         const id = req.params.id;

   const sql = "SELECT * FROM users WHERE id = ?";

   const answer = await queryDatabase(sql, id)
   
   
   if(answer.length == 0) {
      return res.status(404).json({error: "user not found"})
   }

   res.json(answer)
      
   } catch (error) {
      console.log(error.message);
      
   }

 
})


export default userRouter;