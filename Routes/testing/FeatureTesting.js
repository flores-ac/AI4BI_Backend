const express = require("express");
const  { PromptTemplate } = require("@langchain/core/prompts");
const { RunnableSequence } = require("@langchain/core/runnables");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const { ChatAnthropic } = require("@langchain/anthropic");
const { JsonOutputFunctionsParser } = require("langchain/output_parsers");
const {JsonOutputToolsParser } = require("@langchain/core/output_parsers/openai_tools")


const router = express.Router();





const prompt1 = PromptTemplate.fromTemplate(
    "Human Like Language query : {query}. convert this sentence into json defining parameters extracted from Human like language query "
  );
  const prompt2 = PromptTemplate.fromTemplate(
    `From This {jsonQuery} Convert the following json into SQL for BigQuery for GA4 table !important: Only provide query`
  );
  const prompt3 = PromptTemplate.fromTemplate(
    `From This {SQLQuery}, Tell me will this query work in GA4 return Only with true and false and query String in JSON no further explain !important: Only provide this json willwork: <true/false> , query: <>`
  );

router.get("/test" , async (req , res , next)=>{
    const parser = new JsonOutputToolsParser();

    const extractionFunctionSchema = {
        name: "extractor",
        description: "Extracts fields from the input.",
        parameters: {
          type: "object",
          properties: {
            willWork: {
              type: "string",
              enum: ["True", "False"],
              description: "Will This Query work",
            },
            query: {
              type: "string",
              description: "Query For SQL to be used in GA4",
            },
          },
          required: ["willWork", "query"],
        },
      };
    const model = new ChatAnthropic({});
    const chain = prompt1.pipe(model).pipe(new JsonOutputToolsParser());

    const combinedChain = RunnableSequence.from([
        {
          jsonQuery: chain,
        },
        prompt2,
        model,
        new JsonOutputToolsParser()
      ]);

      const combinedChain2 = RunnableSequence.from([
        {
            SQLQuery: combinedChain,
        },
        prompt3,
        model,
        new JsonOutputToolsParser(),
      ]);
    
      const result = await combinedChain2.invoke({
        query : "Write Query to extract data from age from 18 to 60 working for government"
      });

      console.log(result)

})



router.get("/test2" , async (req , res , next)=>{
  

    const promptTemplate =
  PromptTemplate.fromTemplate(`Given the user question below, classify it as either being about \`query\`, or \`Other\`.
                                     
Do not respond with more than one word.

<question>
{question}
</question>

Classification:`);

const model = new ChatAnthropic({
    modelName: "claude-3-sonnet-20240229",
  });

  const classificationChain = RunnableSequence.from([
    promptTemplate,
    model,
    new StringOutputParser(),
  ]);
  
  const classificationChainResult = await classificationChain.invoke({
    question: "what is 8086",
  });
  console.log(classificationChainResult);

})



module.exports = router;
