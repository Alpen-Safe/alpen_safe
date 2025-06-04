#!/bin/bash

# Convert README.md to PDF with GitHub styling
# Usage: ./convert-to-pdf.sh

echo "Converting README.md to PDF with GitHub styling..."

# Check if md-to-pdf is installed
if ! command -v md-to-pdf &> /dev/null; then
    echo "md-to-pdf is not installed. Installing it now..."
    npm install -g md-to-pdf
fi

# Convert using the config with inline CSS
echo "Converting with improved styling..."
md-to-pdf README.md --config-file md-to-pdf-config.json

if [ $? -eq 0 ]; then
    echo "✅ Successfully converted README.md to README.pdf"
    echo "📄 Output file: README.pdf"
    
    # Open the PDF if on macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "🔍 Opening PDF..."
        open README.pdf
    fi
else
    echo "❌ Conversion failed. Please check your configuration."
    exit 1
fi 