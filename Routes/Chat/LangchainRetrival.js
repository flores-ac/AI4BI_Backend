const { Pinecone } = require("@pinecone-database/pinecone");
const { MultiQueryRetriever } = require("langchain/retrievers/multi_query");
const { ChatOpenAI } = require("@langchain/openai");
const { PineconeStore } = require("langchain/vectorstores/pinecone");
const { OpenAIEmbeddings } = require("@langchain/openai");
const {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} = require("@langchain/core/prompts");
const {
  RunnablePassthrough,
  RunnableSequence,
} = require("@langchain/core/runnables");
const { StringOutputParser } =  require("@langchain/core/output_parsers");

require("dotenv").config();

const langchainRetrival = async (Email, ChatId, Question) => {
  console.log(Question);
  //Vector Search
  // Initilize Pincone instense
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENV,
  });

  const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX);
  // MultiQuery Retrival passing to LLM then Vector DB retriveing broader context of text from Vector DB

  const vectorStore = await PineconeStore.fromExistingIndex(
    new OpenAIEmbeddings(),
    { pineconeIndex }
  );
  const model = new ChatOpenAI({
    temperature: 0.9,
  });

  const retriever = MultiQueryRetriever.fromLLM({
    llm: model,
    retriever: vectorStore.asRetriever(),
    verbose: true,
  });
  const query = Question;
  const retrievedDocs = await retriever.getRelevantDocuments(query);

  // creating context using Retrieved contexts
  let context = "";
  console.log(retrievedDocs[0].pageContent);
  retrievedDocs.map((element, index) => {
    context =
      context + `\n Context Number# ${index + 1}: ` + element.pageContent;
  });

  // Creating System/human prompt for gpt
  // Create a system & human prompt for the chat model
  const SYSTEM_TEMPLATE = `Use the following pieces of context to answer the question at the end.
If you don't know the answer, just say that you don't know, don't try to make up an answer.
----------------
${context}`;

  const messages = [
    SystemMessagePromptTemplate.fromTemplate(SYSTEM_TEMPLATE),
    HumanMessagePromptTemplate.fromTemplate("{question}"),
  ];

  const prompt = ChatPromptTemplate.fromMessages(messages);

  const chain = RunnableSequence.from([
    {
      question: new RunnablePassthrough(),
    },
    prompt,
    model,
    new StringOutputParser(),
  ]);

  const answer = await chain.invoke(
    Question
  );

  return answer;
};

module.exports = langchainRetrival;
