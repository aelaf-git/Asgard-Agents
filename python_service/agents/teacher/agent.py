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
from langchain_core.messages import HumanMessage, AIMessage
from langchain_groq import ChatGroq

TEACHER_PROMPT_TEMPLATE = """You are an expert teacher. Your role is to educate, clarify, and guide the student using only the provided document context.

## Teaching Style
- Start with a brief, warm acknowledgement of the question.
- Explain concepts in a clear, structured way — break complex ideas into digestible parts.
- Use markdown formatting: headings, bullet points, numbered steps, bold for key terms, and short paragraphs.
- Include concrete examples or analogies from the document when relevant.
- End with a concise summary and optionally ask if the student would like to go deeper.

## Rules
- ONLY use the context from the document below. If the answer is not in the context, say so directly and suggest what the student might look for instead.
- Keep your tone patient, encouraging, and professional — like a favourite teacher.

Context from the document:
{context}

Previous Conversation:
{history}

Student's Question: {question}

Teacher's Response:"""

# Global memory for the server
SESSION_INDEXES = {}
SESSION_HISTORY = {}

async def stream_teacher_task(prompt: str, pdf_bytes: bytes | None, job_id: str) -> AsyncGenerator[str, None]:
    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        temperature=0.3,
        groq_api_key=os.getenv("AI_API_KEY")
    )

    # MODE 1: Initialization / Upload
    if pdf_bytes is not None:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_pdf:
            temp_pdf.write(pdf_bytes)
            temp_pdf_path = temp_pdf.name

        try:
            yield "*(System: Reading PDF and building vector index...)*\n\n"

            loader = PyPDFLoader(temp_pdf_path)
            docs = loader.load()

            text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
            splits = text_splitter.split_documents(docs)

            embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
            vectorstore = FAISS.from_documents(documents=splits, embedding=embeddings)
            
            # Save to global memory
            SESSION_INDEXES[job_id] = vectorstore
            SESSION_HISTORY[job_id] = []

            # First prompt processing
            retriever = vectorstore.as_retriever(search_kwargs={"k": 4})
            chat_prompt = ChatPromptTemplate.from_template(TEACHER_PROMPT_TEMPLATE)
            
            def format_docs(docs):
                return "\n\n".join(doc.page_content for doc in docs)
            
            rag_chain = (
                {"context": retriever | format_docs, "history": lambda x: "", "question": RunnablePassthrough()}
                | chat_prompt
                | llm
                | StrOutputParser()
            )

            full_response = ""
            async for chunk in rag_chain.astream(prompt):
                full_response += chunk
                yield chunk
                
            SESSION_HISTORY[job_id].append(HumanMessage(content=prompt))
            SESSION_HISTORY[job_id].append(AIMessage(content=full_response))

        finally:
            if os.path.exists(temp_pdf_path):
                os.remove(temp_pdf_path)
        return

    # MODE 2: Continuous Chat
    if job_id not in SESSION_INDEXES:
        yield "Error: Session expired or invalid job ID. Please upload the PDF again."
        return

    vectorstore = SESSION_INDEXES[job_id]
    history = SESSION_HISTORY.get(job_id, [])
    
    retriever = vectorstore.as_retriever(search_kwargs={"k": 4})
    chat_prompt = ChatPromptTemplate.from_template(TEACHER_PROMPT_TEMPLATE)
    
    def format_docs(docs):
        return "\n\n".join(doc.page_content for doc in docs)
        
    def format_history(_):
        return "\n".join([f"{'Student' if isinstance(m, HumanMessage) else 'Teacher'}: {m.content}" for m in history[-6:]])

    rag_chain = (
        {"context": retriever | format_docs, "history": format_history, "question": RunnablePassthrough()}
        | chat_prompt
        | llm
        | StrOutputParser()
    )

    full_response = ""
    async for chunk in rag_chain.astream(prompt):
        full_response += chunk
        yield chunk
        
    history.append(HumanMessage(content=prompt))
    history.append(AIMessage(content=full_response))
    SESSION_HISTORY[job_id] = history
