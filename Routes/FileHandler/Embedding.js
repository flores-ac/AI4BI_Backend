require('dotenv').config();
const {PDFLoader} = require("langchain/document_loaders/fs/pdf");
const path = require('path');
const { OpenAIEmbeddings } =  require("@langchain/openai");
const {Pinecone}  = require("@pinecone-database/pinecone")
const {PineconeStore} = require("langchain/vectorstores/pinecone")
const {RecursiveCharacterTextSplitter } = require("langchain/text_splitter")
const {Document} = require("langchain/document");
const {MultiQueryRetriever } = require("langchain/retrievers/multi_query")
const {ChatOpenAI} = require("@langchain/openai")
const { CSVLoader } = require("langchain/document_loaders/fs/csv");
const CSVMongooseModal = require("../../Schema/csvDataModal");
const { DocxLoader } = require("langchain/document_loaders/fs/docx");
const fs = require("fs");



const EmbeddingStorage = async (fileName , userEmail) => {

    // Generating path to get file name:
    const savePath = path.join(__dirname, '../../uploads' + `/${userEmail}` , fileName);

    let docs = [];
    let docOutput = [];
    
    if(fileName.split(".")[1] === "csv"){
      const loader = new CSVLoader(savePath);
      const _docs = await loader.load();
      await CSVMongooseModal.create({"email" : userEmail , "fileName" : fileName , "dataInFile" : _docs});
      const savedPath = path.join(__dirname, '../../uploads' + `/${userEmail}` , fileName);
    fs.unlink(savedPath , (err)=>{
      console.log("CSV has been removed")
    })
      return;
    }else{
      let loader;
      if(fileName.split(".")[1] === "docx"){
        console.log("DOCX CALLED")
         loader = new DocxLoader(
          savePath
        );

      }else if(fileName.split(".")[1] === "pdf"){
         loader = new PDFLoader(savePath , {
          splitPages: false,
        });
      }

    const _docs = await loader.load();
    docs = _docs
    }

    // transform

    if(fileName.split(".")[1] === "pdf" || fileName.split(".")[1] === "docx"){
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 1,
      })
       docOutput = await splitter.splitDocuments([
        new Document({ pageContent: docs[0].pageContent }),
      ]);

    docOutput.forEach((element)=>{
      element.pageContent = "File Name: " + fileName + "\n" + element.pageContent
    })
  }
    // embeddings

    // const documentRes = await embeddings.embedDocuments([docs[0].pageContent]);
    
    // store embeddings in vector database 
    const pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
        environment: process.env.PINECONE_ENV
    });

    const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX);

    await PineconeStore.fromDocuments(docOutput, new OpenAIEmbeddings(), {

        pineconeIndex,
        maxConcurrency: 5, // Maximum number of batch requests to allow at once. Each batch is 1000 vectors.
      });


      //Vector Search
    // const vectorStore = await PineconeStore.fromExistingIndex(
    //     new OpenAIEmbeddings(),
    //     { pineconeIndex }
    //   );
    // const results = await vectorStore.similaritySearch("total registers", 1);
    //   console.log(results);


      // MultiQuery Retiver 

      // const model = new ChatOpenAI({
      //   temperature: 0.9,
      // });

      // const retriever = MultiQueryRetriever.fromLLM({
      //   llm: model,
      //   retriever: vectorStore.asRetriever(),
      //   verbose: true,
      // });
      // const query = "what is task of each register in 8086?";
      //   const retrievedDocs = await retriever.getRelevantDocuments(query);
      //   console.log(retrievedDocs);

}


module.exports =  EmbeddingStorage;