// server.js

// 1. Import required packages
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors'); 
require('dotenv').config();

const app = express();
const port = 5000;

// 2. Use the cors middleware to allow cross-origin requests
app.use(cors());

// Add middleware to parse request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize the Gemini API client with a valid model
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

// ... (Multer storage and upload variable declaration) ...

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and image files are allowed.'));
    }
  },
});


app.post('/upload-document', upload.single('document'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const filePath = req.file.path;
  const summaryLength = req.body.summaryLength || 'medium';

  const pythonProcess = spawn('python', [path.join(__dirname, 'process_document.py'), filePath]);

  let extractedText = '';
  let errorData = '';

  pythonProcess.stdout.on('data', (data) => {
    extractedText += data.toString();
  });

  pythonProcess.stderr.on('data', (data) => {
    errorData += data.toString();
  });

  pythonProcess.on('close', async (code) => {
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error removing file:', err);
    });

    if (code !== 0) {
      console.error('Python script error:', errorData);
      return res.status(500).send('Error processing document.');
    }

    let prompt = "";
    if (summaryLength === 'short') {
      prompt = `You are an AI summarizer. Provide a very concise, one-paragraph summary of the following text , highlighting the key points:`;
    } else if (summaryLength === 'long') {
      prompt = `You are an AI summarizer. Read the following document text and create: 1. A short narrative summary (2–3 paragraphs), 2. Then provide a list of key takeaways, donot bold the text:`;
    } else {
     
      prompt = `You are an AI summarizer. Create a summary of the following document, capturing the essential information and main ideas, create: 1. A short narrative summary (1 paragraphs), 2. Then include atleast 3 points, don't bold the text:`;
    }

    prompt += `\n\n${extractedText}`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const summary = response.text();

      res.status(200).json({
        message: 'Summary generated successfully!',
        summary: summary,
      });

    } catch (error) {
      console.error('Error calling Gemini API:', error);
      res.status(500).send('Error generating summary. Please try again.');
    }
  });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});