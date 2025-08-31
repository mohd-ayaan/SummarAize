import sys
import os
import fitz  # PyMuPDF
import re
from PIL import Image
import pytesseract

def extract_text_from_pdf(pdf_path):
    try:
        doc = fitz.open(pdf_path)
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text
    except Exception as e:
        print(f"Error reading PDF: {e}", file=sys.stderr)
        sys.exit(1)

def extract_text_from_image(image_path):
    print(f"Attempting OCR on image: {image_path}", file=sys.stderr)
    try:
        img = Image.open(image_path)
        return pytesseract.image_to_string(img)
    except pytesseract.TesseractNotFoundError:
        print("Tesseract is not installed or not in your PATH.", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error processing image: {e}", file=sys.stderr)
        sys.exit(1)

def clean_text(text):
    # Replace multiple newlines with a single newline
    text = re.sub(r'\n\s*\n', '\n\n', text)
    # Replace multiple spaces with a single space
    text = re.sub(r' {2,}', ' ', text)
    # Add space after period if followed by a letter
    text = re.sub(r'\.([a-zA-Z])', r'. \1', text)
    return text.strip()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Error: No file path provided.", file=sys.stderr)
        sys.exit(1)

    file_path = sys.argv[1]

    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}", file=sys.stderr)
        sys.exit(1)

    ext = os.path.splitext(file_path)[1].lower()

    if ext == '.pdf':
        raw_text = extract_text_from_pdf(file_path)
    elif ext in ['.png', '.jpg', '.jpeg']:
        raw_text = extract_text_from_image(file_path)
    else:
        print("Error: Unsupported file type.", file=sys.stderr)
        sys.exit(1)

    cleaned = clean_text(raw_text)
    sys.stdout.buffer.write(cleaned.encode('utf-8'))
