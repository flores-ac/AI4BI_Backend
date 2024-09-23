// Import required modules
const express = require('express');
const fs = require("fs");
const multer = require('multer');
const path = require('path');
const EmbeddingStorage = require("./Embedding.js");
const csvDataModal = require("../../Schema/csvDataModal.js")
const jwt = require('jsonwebtoken');
const User = require("../../Schema/userModel"); 



// Helper function to verify JWT
const verifyTokenFromCookie = (req, res) => {
  const token = req.cookies.token ? req.cookies.token : null;  // Get the JWT from the HTTP-only cookie
  if (!token) {
      throw new Error('Token not found');
  }
  
  try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return decoded;
  } catch (err) {
      return res.status(403).json({ message: 'Invalid token' + err});
  }
};
const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        console.log(req.params.email)
        const email = req.params.email;
        const destination = 'uploads/' + `${email}/`;
    
        // Check if the destination folder exists, create it if not
        if (!fs.existsSync(destination)) {
        fs.mkdirSync(destination, { recursive: true });
        }
      cb(null, 'uploads/' + `${email}/`); // Set the destination folder for uploaded files
    },
    filename: (req, file, cb) => {
      cb(null, file.originalname );
    },
  });

const upload = multer({ storage: storage });

router.post("/uploadFiles/" , upload.single('file') , async(req , res)=>{
  const decoded = verifyTokenFromCookie(req, res); 
    if (!decoded || decoded.message) {
      // Token verification failure, return with an appropriate error message
      return;
    }
    else{
      const userId = decoded.userId;  // Extract the userId from the decoded JWT
          // Fetch the user from the database using the userId, exclude sensitive info like password
        const user = await User.findById(userId).select('-password');
        const email = user.email;
        const uploadedFile = req.file;
      if (!uploadedFile) {
        return res.status(400).send('No file uploaded.');
      }

      // Read the content of the file
      const fileContent = await fs.promises.readFile(uploadedFile.path);

      // Specify the path where you want to save the file
      const savePath = path.join(__dirname, '../../uploads' + `/${email}` , uploadedFile.filename);

      // Save the file to the specified path
      await fs.promises.writeFile(savePath, fileContent);
      console.log(uploadedFile.filename.split("."))
      if(uploadedFile.filename.split(".")[1] === "pdf" || uploadedFile.filename.split(".")[1] === "csv" || uploadedFile.filename.split(".")[1] === "docx"  ){
        console.log("PDF , CSV , DOCX Detected")
        EmbeddingStorage(uploadedFile.filename , email);
      }else{
        console.log("NO PDF , CSV , DOCX DETECTED");
      }
      // Create Embeddings and store from uploaded File
      


      // Respond with a success message
      res.send('File uploaded and saved successfully.');
  }
})


router.get("/uploadedFiles/", async (req, res) => {

  try{
    const decoded = verifyTokenFromCookie(req, res); 
    if (!decoded || decoded.message) {
      // Token verification failure, return with an appropriate error message
      return;
    }else{
      const userId = decoded.userId;  // Extract the userId from the decoded JWT
        // Fetch the user from the database using the userId, exclude sensitive info like password
        const user = await User.findById(userId).select('-password');
      const email = user.email;
      
  const storageSegment = path.join(__dirname, '../../uploads', email);
      const csvFiles = await csvDataModal.find({}).select("fileName");
      const csvFileNames = csvFiles.map(element => element.fileName);
      
      fs.readdir(storageSegment, (err, files) => {
          if (err) {
              console.error(err);
              res.status(500).json({
                  "msg": "error",
                  "status": "Internal Server Error"
              });
              return;
          }

          files = files.concat(csvFileNames);
          console.log(csvFileNames);
          console.log(files);

          if (files.length === 0) {
              res.status(200).json({
                  "msg": "error",
                  "status": "No File Uploaded"
              });
          } else {
              res.status(200).json({
                  "status": "File Found",
                  "filesName": files
              });
          }
      });}
  } catch (error) {
      console.error(error);
      res.status(500).json({
          "msg": "error",
          "status": "Internal Server Error"
      });
  }
});


router.get("/uploadedData/:fileName" , async (req , res)=>{

  const fileName = req.params.fileName;
  try{
    const fileData = await csvDataModal.findOne({"fileName" : fileName});
    res.status(200).json(fileData);
  }catch(error){
    res.status(500).json(error);
  }


})



router.delete("/uploadedFiles/:fileName/:email" , (req , res)=>{
    const fileName = req.params.fileName;
    const email = req.params.email;
    const savedPath = path.join(__dirname, '../../uploads' + `/${email}` , fileName);


    if(fileName.split(".")[1] === "csv"){
      csvDataModal.deleteMany({"fileName" : fileName}).then(()=>{
        res.status(200).json({"msg" : "File deleted Successfully"})
      }).catch(err=>{
        res.status(500).json({"msg" : "Error in Deleting file"});
      })
    }else{
      console.log(savedPath)
      try {
        fs.unlinkSync(savedPath);
        res.status(200).json({ "msg": "File deleted Successfully" });
      } catch (err) {
        console.error("Error deleting file:", err);
        res.status(500).json({ "msg": "Error in Deleting file" });
      }
    }
    


})


// Export the router
module.exports = router;
