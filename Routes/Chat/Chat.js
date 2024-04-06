const express = require("express");
const bodyParser = require("body-parser");
const chatModel = require("../../Schema/chatModel");
const LangchainRetrival = require("./LangchainRetrival");

const router = express.Router();

router.get("/:email", async (req, res, next) => {
  const email = req.params.email;
  try {
    const userChats = await chatModel.find({ userEmail: email });
    res.status(200).json({ userChats });
  } catch {
    (err) => {
      res.status(500).json({ message: "Some Error Occurred at Server" });
    };
  }
});

router.get("/createChat/:email", async (req, res, next) => {
    const email = req.params.email;
    console.log("created");
  try {
   const data =  await chatModel.create({ userEmail: email });
   console.log(data);
    res.status(200).json(data);
  } catch {
    (err) => {
      res.status(500).json({ message: "Some Error Occurred at Server" });
    };
  }
});

router.post("/prompt/:chatId" , bodyParser.json() , async(req , res , next)=>{
    const chatId = req.params.chatId;
    const body = req.body;
    let message = body.prompt;




    console.log("flag 1")
    await chatModel.findOneAndUpdate({_id : chatId} , {$push: {chatHistory : {"message" : message , "responseFrom" : "User"} }})
    const result = await LangchainRetrival(1 , chatId , message);
    await chatModel.findOneAndUpdate({_id : chatId} , {$push: {chatHistory : {"message" : result , "responseFrom" : "OpenAI"} }}) 
    console.log("flag 3")
    res.status(200).json({"message" : result , "responseFrom" : "OpenAI"});

  




    


})

// router.post("/chat" , bodyParser.json() , (req , res , next)=>{
//     const body = req.body;
//     const question = req.body;

// })


router.delete("/:chatId" , async(req , res , next)=>{

  const id = req.params.chatId;

  try{
    await chatModel.findOneAndDelete({_id : id}).then(()=>{
      res.sendStatus(200)
    })
  }catch(e){
    res.status(500).json({"message" : "Unexpected Server Error occurred"})
  }



})

module.exports = router;
