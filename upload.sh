#!/bin/bash

# This script uploads the website files to the remote server.

# Define remote server details
REMOTE_USER="toby"
REMOTE_HOST="192.168.193.133"
REMOTE_DIR="/var/www/zorus.firstassist.com.au/"

# Use rsync to sync files and directories from the current directory
# Exclude the script itself and the .git directory
echo "Syncing files to ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}..."
rsync dist/ -avz --exclude 'upload.sh' --exclude '.git/' ./ "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}"

if [ $? -eq 0 ]; then
  echo "Upload successful!"
else
  echo "Upload failed."
  exit 1
fi

exit 0 