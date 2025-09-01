#!/usr/bin/env bash

# Install Python and dependencies
apt-get update
apt-get install -y python3 python3-pip tesseract-ocr libtesseract-dev poppler-utils

# Install Python packages
pip3 install -r requirements.txt

# Continue with Node.js setup
npm install
