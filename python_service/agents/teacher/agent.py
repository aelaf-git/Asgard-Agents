import os
import tempfile
from typing import AsyncGenerator
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_groq import ChatGroq

TEACHER_PROMPT_TEMPLATE = """You are a patient and knowledgeable Teacher Agent. 
Your goal is to explain concepts clearly, simply, and accurately based ONLY on the provided document context.
If the answer is not contained in the context, clearly state that you cannot find the answer in the document.

Context from the document:
{context}

Student's Question: {question}

Teacher's Explanation:"""

async def stream_teacher_task(prompt: str, pdf_bytes: bytes) -> AsyncGenerator[str, None]:
    # 1. Save the uploaded bytes to a temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_pdf:
        temp_pdf.write(pdf_bytes)
        temp_pdf_path = temp_pdf.name

    try:
        # Yield a status message to the frontend while building the index
        yield "*(System: Reading PDF and building vector index...)*\n\n"

        # 2. Load the PDF
        loader = PyPDFLoader(temp_pdf_path)
        docs = loader.load()

        # 3. Split the text into manageable chunks
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        splits = text_splitter.split_documents(docs)

        # 4. Create the FAISS Vector Database using local HuggingFace embeddings
        # This will download the model weights (approx 80MB) on the first run
        embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        vectorstore = FAISS.from_documents(documents=splits, embedding=embeddings)
        
        # 5. Create the retriever
        retriever = vectorstore.as_retriever(search_kwargs={"k": 4})

        # 6. Initialize LLM and Chain
        llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            temperature=0.3,
            groq_api_key=os.getenv("AI_API_KEY")
        )

        chat_prompt = ChatPromptTemplate.from_template(TEACHER_PROMPT_TEMPLATE)

        # Format docs helper
        def format_docs(docs):
            return "\n\n".join(doc.page_content for doc in docs)

        rag_chain = (
            {"context": retriever | format_docs, "question": RunnablePassthrough()}
            | chat_prompt
            | llm
            | StrOutputParser()
        )

        # 7. Stream the answer
        async for chunk in rag_chain.astream(prompt):
            yield chunk

    finally:
        # Cleanup the temporary file
        if os.path.exists(temp_pdf_path):
            os.remove(temp_pdf_path)
