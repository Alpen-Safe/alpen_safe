#!/bin/bash

# Remove file extensions from imports
find . -type f -name "*.ts" -not -path "./node_modules/*" | xargs sed -i '' 's/from "\(.*\)\.ts"/from "\1"/g'
find . -type f -name "*.ts" -not -path "./node_modules/*" | xargs sed -i '' "s/from '\(.*\)\.ts'/from '\1'/g"
find . -type f -name "*.ts" -not -path "./node_modules/*" | xargs sed -i '' 's/from "\(.*\)\.js"/from "\1"/g'
find . -type f -name "*.ts" -not -path "./node_modules/*" | xargs sed -i '' "s/from '\(.*\)\.js'/from '\1'/g"

echo "Updated imports to remove file extensions"
echo "Remember to run 'npm install' to install all dependencies" 