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
      memory.chatHistory.addMessage(new HumanMessage(obj.message));
    } else {
      memory.chatHistory.addMessage(new AIMessage(obj.message));
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
    Given the user question below, classify it as either being about \`query\`, or \`notQuery\` if user asked about query classify it as query if not return notQuery.
    Do not respond query if specifically Mentioned in Question.
  
    Do not respond with more than one word.

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

    const classificationChainResult = await classificationChain.invoke({
      question: Question,
    });

    // checking classification results

    console.log(classificationChainResult);

    if (classificationChainResult == "query") {
      const prompt1 = PromptTemplate.fromTemplate(
        "Human Like Language query : {query}. convert this sentence into json defining parameters extracted from Human like language query "
      );
      const prompt2 = PromptTemplate.fromTemplate(
        `From This {jsonQuery} Convert the following json into SQL for BigQuery for GA4 table !important: Only provide query`
      );
      const prompt3 = PromptTemplate.fromTemplate(
        `From This {SQLQuery},
     only provide query and small explanation no styling 
     `
      );
      const model = new ChatAnthropic({});
      const chain = prompt1.pipe(model).pipe(new StringOutputParser());
      const combinedChain = RunnableSequence.from([
        {
          jsonQuery: chain,
        },
        prompt2,
        model,
        new StringOutputParser(),
      ]);

      const combinedChain2 = RunnableSequence.from([
        {
          SQLQuery: combinedChain,
        },
        prompt3,
        model,
        new StringOutputParser(),
      ]);

      const result = await combinedChain2.invoke({
        query: Question,
      });
      return result;
    } else if (classificationChainResult == "notQuery") {
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

      const answer = await chain.invoke(Question);

      return answer;
    }
  }
};

module.exports = langchainRetrival;
