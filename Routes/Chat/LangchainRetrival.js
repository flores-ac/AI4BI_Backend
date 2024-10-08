const { Pinecone } = require("@pinecone-database/pinecone");
const { MultiQueryRetriever } = require("langchain/retrievers/multi_query");
const { ChatOpenAI } = require("@langchain/openai");
const { PineconeStore } = require("langchain/vectorstores/pinecone");
const { OpenAIEmbeddings } = require("@langchain/openai");
const {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
  MessagesPlaceholder,
} = require("@langchain/core/prompts");
const {
  RunnableWithMessageHistory,
  RunnablePassthrough,
  RunnableSequence,
} = require("@langchain/core/runnables");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const chatModel = require("../../Schema/chatModel");
const { HumanMessage, AIMessage } = require("@langchain/core/messages");
const { BufferMemory } = require("langchain/memory");
const CSVMongooseModal = require("../../Schema/csvDataModal");
const { ChatAnthropic } = require("@langchain/anthropic");
const { PromptTemplate } = require("@langchain/core/prompts");

require("dotenv").config();
function generateQueriesWithExplanation(eventName, startDate, endDate, paramOne, paramTwo) {
  try {
    // Generate the query for view events
    let viewQuery = `SELECT
    user_pseudo_id AS cid,
    event_timestamp AS view_timestamp,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = '${paramOne}') AS parameter_one,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = '${paramTwo}') AS parameter_two
    FROM
    \`flowers-203019.analytics_264952733.events_\`
    WHERE
    event_name = '${eventName}' AND
    _TABLE_SUFFIX BETWEEN '${startDate}' AND '${endDate}'`;

    // Generate the query for purchase events
    let purchaseQuery = `WITH purchase_events AS (
    SELECT DISTINCT
      user_pseudo_id AS cid,
      event_timestamp AS purchase_timestamp,
      ecommerce.transaction_id,
      (SELECT value.double_value FROM UNNEST(event_params) WHERE key = 'value') AS revenue
    FROM
      \`flowers-203019.analytics_264952733.events_\`
    WHERE
      event_name = '${eventName}' AND
      _TABLE_SUFFIX BETWEEN '${startDate}' AND '${endDate}'
    ),
    all_click_events AS (
    SELECT DISTINCT
      user_pseudo_id AS cid,
      event_timestamp AS view_timestamp,
      (SELECT value.string_value FROM UNNEST(event_params) WHERE key = '${paramOne}') AS parameter_one,
      (SELECT value.string_value FROM UNNEST(event_params) WHERE key = '${paramTwo}') AS parameter_two
    FROM
      \`flowers-203019.analytics_264952733.events_\`
    WHERE
      event_name = 'mcp_content_view' AND
      _TABLE_SUFFIX BETWEEN '${startDate}' AND '${endDate}'
    ),
    last_view_before_purchase AS (
    SELECT
      pe.cid,
      pe.purchase_timestamp,
      pe.transaction_id,
      pe.revenue,
      LAST_VALUE(ace.parameter_one) OVER (
        PARTITION BY pe.cid
        ORDER BY ace.view_timestamp
        RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
      ) AS last_parameter_one,
      LAST_VALUE(ace.parameter_two) OVER (
        PARTITION BY pe.cid
        ORDER BY ace.view_timestamp
        RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
      ) AS last_parameter_two
    FROM
      purchase_events pe
    JOIN
      all_click_events ace ON pe.cid = ace.cid AND ace.view_timestamp < pe.purchase_timestamp
    )
    SELECT
    cid,
    transaction_id,
    revenue,
    last_parameter_one,
    last_parameter_two
    FROM (
    SELECT
      *,
      ROW_NUMBER() OVER (PARTITION BY cid, transaction_id ORDER BY last_view_timestamp DESC) AS rn
    FROM
      last_view_before_purchase
    )
    WHERE
    rn = 1;`;

    // User instructions
    let userInstructions = `
    You have generated two queries to analyze user interactions on your platform:

    1. **View Events Query**: This query retrieves user interactions specific to views, capturing details based on parameters like ${paramOne} and ${paramTwo}.
    2. **Purchase Events Query**: This advanced query captures purchase events and attributes them to user views immediately preceding the purchase. It also integrates revenue data for comprehensive analysis.

    **Steps to Proceed**:
    - Execute both queries in your data environment.
    - Upload the results to LookerStudio.
    - Use a full outer join on the result sets to blend data based on user identifiers.
    - Analyze this combined data set to compute metrics such as conversion rates, average order value, and more. This will offer insights into campaign effectiveness and user behavior.

    These insights are instrumental in refining your marketing strategies and enhancing user engagement. Ensure to periodically update your queries to include new events and adapt to changes in data schema.`;

    return {
        viewQuery: viewQuery,
        purchaseQuery: purchaseQuery,
        instructions: userInstructions
    };
  } catch (error) {
    console.error("An error occurred while generating queries:", error);
    return null;
  }
}

// Example usage:
//const eventName = "mcp_content_view"; // Assuming same event name used for simpler illustration
//const result = generateQueriesWithExplanation(eventName, '20231101', '20231114', 'experience_name', 'campaign_name');
//console.log("View Query:\n", result.viewQuery);
//console.log("Purchase Query:\n", result.purchaseQuery);
//console.log("Instructions:\n", result.instructions);

// function
function createCSVArray(data) {
  // Check if the data array is not empty
  if (data.length === 0) {
    console.error("Input data array is empty.");
    return;
  }

  // Extract the keys (column names) from the pageContent of the first element
  const columns = data[0].pageContent
    .split("\n")
    .filter((line) => line.includes(":"))
    .map((line) => line.split(":")[0].trim());

  // Create the CSV array with the columns as the first element
  const csvArray = [columns];

  // Populate the remaining elements of the CSV array with data
  data.forEach((item) => {
    const rowData = columns.map((column) => {
      // Extract the value for each column from the pageContent
      const regex = new RegExp(`${column}:\\s*(.+)`);
      const match = item.pageContent.match(regex);
      return match ? match[1].trim() : "";
    });

    // Add the row data to the CSV array
    csvArray.push(rowData);
  });

  return csvArray;
}

const langchainRetrival = async (Email, ChatId, Question) => {
  const memory = new BufferMemory({
    returnMessages: true,
    memoryKey: "chat_history",
  });
  console.log("passed");
  const loadedHistory = await chatModel.findOne({ _id: ChatId });

  
  loadedHistory.chatHistory.forEach((obj) => {
    if (obj.responseFrom === "User") {
      memory.chatHistory.addMessage(new HumanMessage(obj.message || ""));
    } else {
      memory.chatHistory.addMessage(new AIMessage(obj.message || ""));
    }
  });
  console.log("passed2");
  //Vector Search
  // Initilize Pincone instense
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENV,
  });

  const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX);
  // MultiQuery Retrival passing to LLM then Vector DB retriveing broader context of text from Vector DB
  let context = "";
  const model = new ChatOpenAI({
    temperature: 0.9,
    modelName: "gpt-4-turbo-preview",
  });
  if (
    Question.split(".csv:").length > 1 ||
    Question.split("analyze-").length > 1
  ) {
    const firstSplit = Question.split(":")[0];
    const fileName = firstSplit.split("analyze-")[1];

    const loadedDocument = await CSVMongooseModal.findOne({
      fileName: fileName,
    });

    const cleanedData = createCSVArray(loadedDocument.dataInFile);

    context = `
  \n
  this is loaded data from file named ${fileName}
   structure of this csv file data is like this:
  first array is column names and then next arrays have data entry corresponding to first array of column names 
  \n
  ${cleanedData.toString()}

  !important Analyze Entire Data entry provided dont leave any of that, Also Keep record of number of rows analyzed in numerical form for future refrece 

  Answer the question asked on bases of above analysis

  `;
    console.log(cleanedData);
  } else {
     // routing between Runnables
    const chatRecognizerTemplate = PromptTemplate.fromTemplate(`
    Please classify the user question provided below as either a \`query\` or \`notQuery\` based on its content. 

    Clasify as \`query\` if the user irs requesting for data analysis that will require the creation of a GA4 query or is explicitly requesting the creation of a query for a specific demand.

    Classify as \`notQuery\` if the question is not data analytics related or does not require the creation of a GA4 query.

    <question>
    {question}
    </question>

    Classification:`);


    const chatRecognizerModal = new ChatOpenAI({
      modelName: "gpt-4-0125-preview",
      temperature: 0,
    });

    const classificationChain = RunnableSequence.from([
      chatRecognizerTemplate,
      chatRecognizerModal,
      new StringOutputParser(),
    ]);

    // const classificationChainResult = await classificationChain.invoke({
    //   question: Question,
    // });
    

    const classifyQuestion = async (Question) => {
      try {
        const classificationChainResult = await classificationChain.invoke({
          question: Question,
        });
    
        const classification = classificationChainResult.trim(); // Clean up the result
    
        // Handle the classification result
        if (classification === 'query') {
          try {
            const queryTemplate = PromptTemplate.fromTemplate(`
            We need to answer the following question: 
            <question>
            {question} 
            </question>
    
            To start generating a custom SQL queries, we need the following details: 
            1. The exact name of the event we need to analyze (e.g., 'campaign_view').
            2. The start and end dates for the data we seek to analyze, formatted as YYYYMMDD (e.g., 20230101 to 20230131).
            3. Two key parameters related to the events that we are particularly interested in. These could be attributes like 'campaign_name' or 'user_experience'.
            
            Generate a JSON with the required information in the following syntax only
            
            Example JSON:
            
            "eventName": "view_campaign_interaction",
            "startDate": "20230101",
            "endDate": "20230131",
            "paramOne": "campaign_name",
            "paramTwo": "experience_name"
          
    
    
            Generated JSON:`);
            const queryModal = new ChatOpenAI({
              modelName: "gpt-4-0125-preview",
              temperature: 0,
            });
        
            const queryChain = RunnableSequence.from([
              queryTemplate,
              queryModal,
              new StringOutputParser(),
            ]);
            
            
            const jsonOutput = await queryChain.invoke({
              question: Question,
            });
            const trimmedString = jsonOutput.trim().replace(/^```json\s*|```$/g, '');
            console.log(trimmedString);
            const { eventName, startDate, endDate, paramOne, paramTwo } = JSON.parse(trimmedString);
            
            const result = generateQueriesWithExplanation(eventName, startDate, endDate, paramOne, paramTwo);
            return result.instructions + "\n\n" + result.viewQuery + "\n\n" + result.purchaseQuery;
          } catch (error) {
            console.log(error)
            return "Error occurred while processing the prompt response";
          }
        } else if (classification === 'notQuery') {
          // Handle the notQuery case
          console.log("The question is classified as 'notQuery'. No GA4 query creation needed.");
          // Add your logic for handling non-query questions here
          // Extrating data from Vector Data bases
        const vectorStore = await PineconeStore.fromExistingIndex(
          new OpenAIEmbeddings(),
          { pineconeIndex }
          );

          const retriever = MultiQueryRetriever.fromLLM({
            llm: model,
            retriever: vectorStore.asRetriever(),
            verbose: true,
          });
          const query = Question;
          const retrievedDocs = await retriever.getRelevantDocuments(query);

          // creating context using Retrieved contexts

          retrievedDocs.map((element, index) => {
            context =
              context + `\n Context Number# ${index + 1}: ` + element.pageContent;
          });

          // Creating System/human prompt for gpt
          // Create a system & human prompt for the chat model
          const SYSTEM_TEMPLATE = ` 
      
          chat-history
          {chat_history}
          -------End of Chat History------
          
          Use the following pieces of context to answer the question at the end if and only if question is related to context other wise refer to chat history.
          If you don't know the answer, just say that you don't know, don't try to make up an answer. 
          If asked question is not relevant to context provided refer back to chat-history provided at top.
          Also if how much data is analyzed is asked go through  messages history as it has numerical value which tells how much is data and data was there and donot tell there was no data available as it might not be in history but previous system template had.
          chat-history might have related text if nothing is related then just say that you do not know. 
          
          ----------------
          ${context}`;

          console.log(SYSTEM_TEMPLATE);

          const messages = [
            SystemMessagePromptTemplate.fromTemplate(SYSTEM_TEMPLATE),
            new MessagesPlaceholder("chat_history"),
            HumanMessagePromptTemplate.fromTemplate("{question}"),
          ];

          const prompt = ChatPromptTemplate.fromMessages(messages);

          const chain = RunnableSequence.from([
            {
              question: new RunnablePassthrough(),
              chat_history: async () => {
                const { chat_history } = await memory.loadMemoryVariables({});
                return chat_history;
              },
            },
            prompt,
            model,
            new StringOutputParser(),
          ]);

          const answer = await chain.invoke({ question: Question, chat_history: loadedHistory.chatHistory });

          return answer;
        } else {
          // Handle unexpected classification results
          console.error("Unexpected classification result:", classification);
        }
      } catch (error) {
        // Handle any errors that occur during the process
        console.error("An error occurred while classifying the question:", error);
      }
    };
    console.log(classifyQuestion);
  }
};

module.exports = langchainRetrival;