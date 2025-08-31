# backend/process_document.py
import sys
import os
import fitz
import re
from PIL import Image
import pytesseract

def extract_text_from_pdf(pdf_path):
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text()
    doc.close()
    return text

def extract_text_from_image(image_path):
    print(f"Attempting OCR on image: {image_path}", file=sys.stderr)
    try:
        img = Image.open(image_path)
        text = pytesseract.image_to_string(img)
        return text
    except pytesseract.TesseractNotFoundError:
        print("Tesseract is not installed or not in your PATH.", file=sys.stderr)
        return ""
    except Exception as e:
        print(f"Error processing image: {e}", file=sys.stderr)
        return ""
    
def clean_text(text):
    """
    Cleans up raw extracted text to improve formatting.
    - Replaces multiple newlines with a single newline.
    - Ensures a space after punctuation.
    """
    # Replace multiple newlines with a single newline
    cleaned_text = re.sub(r'\n\s*\n', '\n\n', text)

    # Replace multiple spaces with a single space
    cleaned_text = re.sub(r' {2,}', ' ', cleaned_text)

    # Add a space after a period if it's followed by a letter (simple sentence boundary detection)
    cleaned_text = re.sub(r'\.([a-zA-Z])', r'. \1', cleaned_text)

    return cleaned_text.strip() # .strip() removes leading/trailing whitespace

if __name__ == "__main__":
    # Get the file path from the command-line arguments
    if len(sys.argv) < 2:
        print("Error: No file path provided.", file=sys.stderr)
        sys.exit(1)

    file_path = sys.argv[1]

    # Check if the file exists
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}", file=sys.stderr)
        sys.exit(1)

    # Determine file type and extract text
    file_extension = os.path.splitext(file_path)[1].lower()

    if file_extension == '.pdf':
        extracted_content = extract_text_from_pdf(file_path)
    elif file_extension in ['.png', '.jpg', '.jpeg']:
        extracted_content = extract_text_from_image(file_path)
    else:
        print("Error: Unsupported file type.", file=sys.stderr)
        sys.exit(1)

    # Use sys.stdout.buffer.write() to write bytes directly, ensuring UTF-8 encoding
    sys.stdout.buffer.write(extracted_content.encode('utf-8'))

    # Clean the extracted content before printing it
    cleaned_content = clean_text(extracted_content)

    # Print the cleaned text to standard output for the Node.js process to read
    # Use sys.stdout.buffer.write() to ensure UTF-8 encoding
    sys.stdout.buffer.write(cleaned_content.encode('utf-8'))