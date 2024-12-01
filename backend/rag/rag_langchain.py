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

from langchain_openai import ChatOpenAI

from rag_helper import *

parser = argparse.ArgumentParser()
parser.add_argument('--query', type=str)
parser.add_argument('--llm_model', type=str, default='gpt-4o-mini')
parser.add_argument('--api_path', type=str, default='../openai_api.txt')
args = parser.parse_args()

print("Current working directory:", os.getcwd())
print("API path argument:", args.api_path)

with open(args.api_path, 'r') as f:
    os.environ["OPENAI_API_KEY"] = f.read().strip()
persist_directory = os.path.join(os.path.dirname(__file__), "chroma_db")
pdf_directory = os.path.join(os.path.dirname(__file__), "documents")
embedding = OpenAIEmbeddings()

all_documents = []

print("Current working directory:", os.getcwd())
print(pdf_directory)
print(persist_directory)
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

# vectorstore = Chroma.from_documents(documents=splits, embedding=OpenAIEmbeddings())

# Retrieve and generate using the relevant snippets of the blog.
retriever = vectorstore.as_retriever()
prompt = hub.pull("rlm/rag-prompt")

llm_model = args.llm_model
llm = ChatOpenAI(model=llm_model)

rag_chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | prompt
    | llm
    | StrOutputParser()
)

answer = rag_chain.invoke(args.query)

# Write the answer to a file
with open('rag/output.txt', 'w') as f:
    f.write(answer)

## TODO error handling
## TODO comparing different models
## TODO effect of RAG hyperparameters
## TODO temperature

retrieved_docs = retriever.invoke(args.query)
print("Retrieved Docs", retrieved_docs)
print_retrieved_docs(retrieved_docs, output_file=f'rag/retrieved_docs.txt')