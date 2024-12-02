import os
import argparse

import bs4
from langchain import hub
from langchain_chroma import Chroma
from langchain_community.document_loaders import PyPDFLoader
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from langchain_openai import ChatOpenAI

from rag_helper import *

parser = argparse.ArgumentParser()
parser.add_argument('--query', type=str)
parser.add_argument('--llm_model', type=str, default='gpt-4o-mini')
parser.add_argument('--api_path', type=str, default='../openai_api.txt')
parser.add_argument('--no_rag', action='store_true')
args = parser.parse_args()

# print("Current working directory:", os.getcwd())
# print("API path argument:", args.api_path)

with open(args.api_path, 'r') as f:
    os.environ["OPENAI_API_KEY"] = f.read().strip()
persist_directory = os.path.join(os.path.dirname(__file__), "chroma_db")
pdf_directory = os.path.join(os.path.dirname(__file__), "documents")
embedding = OpenAIEmbeddings()

all_documents = []

# print("Current working directory:", os.getcwd())
# print(pdf_directory)
# print(persist_directory)
# Check if the vectorstore already exists
if not os.path.exists(persist_directory):
    # Load, chunk and index the contents of the PDF.
    for pdf in os.listdir(pdf_directory):
        loader = PyPDFLoader(
            file_path=f"{pdf_directory}/{pdf}",
        )
        docs = loader.load()
        all_documents.extend(docs)

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    splits = text_splitter.split_documents(all_documents)

    # Create and persist the vectorstore
    vectorstore = Chroma.from_documents(
        documents=splits, 
        embedding=embedding,
        persist_directory=persist_directory
    )
    # vectorstore.persist()
    print("Vectorstore created and saved.")
else:
    # Load the existing vectorstore
    vectorstore = Chroma(
        persist_directory=persist_directory,
        embedding_function=embedding
    )
    print("Existing vectorstore loaded.")

messages = []

# read past questions and answers
if os.path.exists('rag/all_answers.txt'):
    with open('rag/all_answers.txt', 'r') as f:
        all_answers = f.read().split("\r\n")
    with open('rag/query.txt', 'r') as f:
        all_questions = f.read().split("\r\n")
    assert len(all_answers) == len(all_questions)
    for i in range(len(all_answers)):
        messages.append((HumanMessage(content=all_questions[i])))
        messages.append((AIMessage(content=all_answers[i])))
    print('Length of messages:', len(messages))

messages.append((HumanMessage(content=args.query)))

# saving the question
with open('rag/query.txt', 'a') as f:
    f.write(args.query)
    f.write("\r\n")

# Retrieve and generate using the relevant snippets of the blog.
retriever = vectorstore.as_retriever()

# Define a custom medical RAG prompt with chat history
message_template = [
    ("system", """You are an expert medical AI assistant. Your task is to provide accurate, helpful medical information based on the provided context and chat history.

Instructions:
1. Use the information from the provided context and previous conversation to answer questions
2. If the context doesn't contain enough information, acknowledge the limitations
3. Always maintain a professional and clear tone
4. Include relevant medical terminology when appropriate
5. If discussing treatments or medications, mention the importance of consulting healthcare providers

Context: {context}

Previous Conversation:
{chat_history}

Remember: Medical information should be accurate and evidence-based."""),
    ("human", "{question}")
]

medical_prompt = ChatPromptTemplate.from_messages(message_template)

# Replace the default prompt
prompt = medical_prompt

llm_model = args.llm_model
llm = ChatOpenAI(model=llm_model)

if args.no_rag:
    rag_chain = llm | StrOutputParser()
else:
    def get_chat_history(messages):
        return "\n".join([f"Human: {m.content}" if isinstance(m, HumanMessage) else f"Assistant: {m.content}" for m in messages])

    rag_chain = (
        {
            "context": retriever | format_docs,
            "chat_history": lambda x: get_chat_history(messages),
            "question": RunnablePassthrough()
        }
        | prompt
        | llm
        | StrOutputParser()
    )

answer = rag_chain.invoke(args.query)

# Write the answer to a file
with open('rag/output.txt', 'w') as f:
    f.write(answer)

with open('rag/all_answers.txt', 'a') as f:
    f.write(answer)
    f.write("\r\n")

## TODO error handling
## TODO comparing different models
## TODO effect of RAG hyperparameters
## TODO temperature

retrieved_docs = retriever.invoke(args.query)
# print("Retrieved Docs", retrieved_docs)
print_retrieved_docs(retrieved_docs, output_file=f'rag/retrieved_docs.txt')