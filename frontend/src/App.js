import React, { useState } from "react";
import "./App.css";
import Header from "./components/Header";
import Footer from "./components/Footer";

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [summaryLength, setSummaryLength] = useState("medium");

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setSummary(null);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      setSummary(null);
    }
    setIsDragOver(false);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleUpload = async () => {
    if (selectedFile) {
      setIsUploading(true);
      setSummary(null);
      const formData = new FormData();
      formData.append("document", selectedFile);
      formData.append("summaryLength", summaryLength);

      try {
        const response = await fetch("http://localhost:5000/upload-document", {
          method: "POST",
          body: formData,
        });

        // Ensure response is OK before parsing JSON
        if (!response.ok) {
          const errorResult = await response.json();
          throw new Error(errorResult.message || "Unknown server error");
        }

        const result = await response.json();

        if (result.summary) {
          // Check if summary exists in the response
          setSummary(result.summary);
          console.log("Summary received:", result.summary);
        } else {
          console.error("Backend did not return a summary.");
          setSummary("Error: Summary not received from the server.");
        }
      } catch (error) {
        console.error("Error during upload:", error);
        setSummary("Error connecting to the server. Please try again.");
      } finally {
        setIsUploading(false);
      }
    }
  };

  // This function will take the plain text summary and format it for display
  const formatSummary = (text) => {
    if (!text) return null;

    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "");

    const markdownBulletRegex = /^[-*]\s*\*\*(.+?)\*\*:\s*(.+)/;

    const formattedItems = [];
    let foundMarkdownBullets = false;

    for (const line of lines) {
      const match = line.match(markdownBulletRegex);
      if (match) {
        foundMarkdownBullets = true;
        const label = match[1].trim();
        const content = match[2].trim();
        formattedItems.push({ label, content });
      }
    } 

    if (foundMarkdownBullets) {
      return (
        <ul className="styled-list">
          {formattedItems.map((item, index) => (
            <li key={index}>
              <strong>{item.label}:</strong> {item.content}
            </li>
          ))}
        </ul>
      );
    }

    // Fallback: render as paragraphs
    return lines.map((line, index) => <p key={index}>{line}</p>);
  };

  return (
    <div className="App">
      <Header />
      <header className="App-header">
        <h1>
          Summar<span className="ai-highlight">AI</span>ze
        </h1>
        <p className="tagline">
          Smart AI-powered document summaries in seconds
        </p>

        <div className="summary-options">
          <label>Summary Length:</label>
          <select
            value={summaryLength}
            onChange={(e) => setSummaryLength(e.target.value)}
          >
            <option value="short">Short</option>
            <option value="medium">Medium</option>
            <option value="long">Long</option>
          </select>
        </div>

        <div
          className={`drop-zone ${isDragOver ? "drag-over" : ""}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            type="file"
            id="file-input"
            accept=".pdf, .png, .jpg, .jpeg"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          <p>
            {selectedFile
              ? `Selected: ${selectedFile.name}`
              : "Drag and drop your document here, or"}
          </p>
          <button onClick={() => document.getElementById("file-input").click()}>
            Browse Files
          </button>
        </div>

        {selectedFile && !isUploading && (
          <button className="upload-btn" onClick={handleUpload}>
            Get Summary
          </button>
        )}

        {isUploading && (
          <div className="loader-container">
            <div className="loader"></div>
            <p>Processing document... Please wait.</p>
          </div>
        )}
        {summary && (
          <div className="summary-container">
            <h3>Summary:</h3>
            <div className="summary-box">
              {/* Call formatSummary here to render the structured output */}
              {formatSummary(summary)}
            </div>
          </div>
        )}
      </header>
       <Footer />
    </div>
  );
}

export default App;
