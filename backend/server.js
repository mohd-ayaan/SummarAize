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
const port = process.env.PORT || 5000; // Dynamic port for Render

// 2. Middleware setup
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Initialize Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

// 4. Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    allowedTypes.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error('Invalid file type. Only PDF and image files are allowed.'));
  },
});

// 5. Health check route
app.get('/health', (req, res) => {
  res.send('Backend is up and running!');
});

// 6. Document upload and summary generation
app.post('/upload-document', upload.single('document'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');

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
    try {
      fs.unlinkSync(filePath); // Clean up uploaded file
    } catch (err) {
      console.error('File cleanup error:', err);
    }

    if (code !== 0) {
      console.error('Python script error:', errorData);
      return res.status(500).send('Error processing document.');
    }

    // Construct prompt based on summary length
    let prompt = '';
    if (summaryLength === 'short') {
      prompt = `You are an AI summarizer. Provide a very concise, one-paragraph summary of the following text, highlighting the key points:\n\n${extractedText}`;
    } else if (summaryLength === 'long') {
      prompt = `You are an AI summarizer. Read the following document text and create: 1. A short narrative summary (2–3 paragraphs), 2. Then provide a list of key takeaways, do not bold the text:\n\n${extractedText}`;
    } else {
      prompt = `You are an AI summarizer. Create a summary of the following document, capturing the essential information and main ideas. Create: 1. A short narrative summary (1 paragraph), 2. Then include at least 3 points, don't bold the text:\n\n${extractedText}`;
    }

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const summary = response.text();

      res.status(200).json({
        message: 'Summary generated successfully!',
        summary,
      });
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      res.status(500).json({
        error: 'Gemini API failed',
        details: error.message || 'Unknown error',
      });
    }
  });
});

// 7. Start server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
