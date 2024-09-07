const express = require('express');
const mongoose = require('mongoose');
const { OpenAI } = require('openai'); 
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const path = require('path');
const Document = require('./documentModel'); 
const Chat = require('./chatModel');

dotenv.config(); 

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateResponse(prompt) {
  try {
    const response = await openai.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
    });
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating response:', error);
    throw error;
  }
}

const app = express();
app.use(express.json());

const rateLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 10 * 1000, 
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 5, 
    handler: (req, res) => {
      res.status(429).json({ error: 'Too many requests - try again later' });
    },
    keyGenerator: (req) => req.ip 
});

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((error) => {
  console.error('Error connecting to MongoDB:', error);
});

async function insertSampleData() {
    const existingDocs = await Document.find();
    if (existingDocs.length === 0) {
      const sampleData = [
        { question: "What is LangChain?", answer: "LangChain is a framework for developing language model-based applications." },
        { question: "What is RAG?", answer: "RAG stands for Retrieval-Augmented Generation, a technique that combines information retrieval with language generation." }
      ];
      await Document.insertMany(sampleData);
      console.log("Sample data inserted");
    } else {
      console.log("Sample data already exists");
    }
  }
  insertSampleData();
//since open-ai api wasnt working, i used default some default question and answer.
//the default answers got stored in MongoDB
//i used express.js for ip address based rate limiting since aditi wasnt working with api-based chstbox.
//keeping integration in our mind i switched from flask limiter (for flask-api based bot) to node.js 
//env has the api key,mongo pathway as well as the default values for rate limiting and they're included in a .gitignore file
app.use('/chat', rateLimiter); 

app.post('/chat', async (req, res) => {
  const userMessage = req.body.message;
  console.log('Received message:', userMessage);

  try {
    
    const retrievedDoc = await Document.findOne({ question: { $regex: userMessage, $options: 'i' } });

    if (retrievedDoc) {
      const botResponse = `Retrieved answer: ${retrievedDoc.answer}`;
      console.log('Returning retrieved response:', botResponse);
      res.json({ response: botResponse });
    } else {
      
      const completion = await openai.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: 'user', content: `Answer the question: ${userMessage}` }],
        max_tokens: 100
      });

      const botResponse = completion.choices[0].text.trim();
      console.log('Returning response:', botResponse);
      res.json({ response: botResponse });
    }
    await Chat.create({
        userMessage: userMessage,
        botResponse: botResponse
    });
    res.json({ response: botResponse });   
  } catch (error) {
    console.error('Error processing chat:', error);
    res.status(500).json({ error: 'please try again later.' });
  }
});
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });

const PORT = process.env.PORT || 5500;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});