// Import required modules
const express = require('express');
const fs = require("fs");
const multer = require('multer');
const path = require('path');
const EmbeddingStorage = require("./Embedding.js");

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

router.post("/uploadFiles/:email" , upload.single('file') , async(req , res)=>{
    const uploadedFile = req.file;
    const email = req.params.email;
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
  if(uploadedFile.filename.split(".")[1] === "pdf" || uploadedFile.filename.split(".")[1] === "csv" ){
    console.log("PDF Detected")
    EmbeddingStorage(uploadedFile.filename , email);
  }else{
    console.log("NO PDF DETECTED");
  }
  // Create Embeddings and store from uploaded File
  


  // Respond with a success message
  res.send('File uploaded and saved successfully.');
})


router.get("/uploadedFiles/:email" , (req , res )=>{
    const email = req.params.email;
    const currentDir = __dirname;
    const storageSegment =  path.join(__dirname, '../../uploads' + `/${email}`);
    console.log(storageSegment);
    fs.readdir(storageSegment , (err , files)=>{
        console.log(files)
        if(files == undefined ){
            res.status(200).json({
                "msg" : "error",
                "status" : "No File Uploaded"
            })
        }else{
            res.status(200).json({
                "status" : "File Found",
                "filesName" : files
            })
        }
    })
})



router.delete("/uploadedFiles/:fileName/:email" , (req , res)=>{
    const fileName = req.params.fileName;
    const email = req.params.email;
    const savedPath = path.join(__dirname, '../../uploads' + `/${email}` , fileName);
    fs.unlink(savedPath , (err)=>{
      if(err){
        res.status(500).json({"msg" : "Error in Deleting file"})
      }else{
        res.status(200).json({"msg" : "File deleted Successfully"})
      }
    })


})


// Export the router
module.exports = router;
