#!/bin/bash

# Script to update Google OAuth redirect URI in AWS Secrets Manager

set -e

# Color functions
print_info() {
    echo -e "\033[36m[INFO]\033[0m $1"
}

print_success() {
    echo -e "\033[32m[SUCCESS]\033[0m $1"
}

print_error() {
    echo -e "\033[31m[ERROR]\033[0m $1"
}

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed."
    exit 1
fi

# Check jq
if ! command -v jq &> /dev/null; then
    print_error "jq is not installed."
    exit 1
fi

REGION="us-west-2"
SECRET_NAME="pfwise-api/google-oauth"

print_info "Updating Google OAuth redirect URI in AWS Secrets Manager"
print_info "Region: $REGION"

# Get current secret
print_info "Fetching current secret..."
CURRENT_SECRET=$(aws secretsmanager get-secret-value \
    --secret-id $SECRET_NAME \
    --region $REGION \
    --query 'SecretString' \
    --output text 2>/dev/null || echo '{}')

# Extract current values
CURRENT_CLIENT_ID=$(echo "$CURRENT_SECRET" | jq -r '.clientId // empty')
CURRENT_CLIENT_SECRET=$(echo "$CURRENT_SECRET" | jq -r '.clientSecret // empty')
CURRENT_REDIRECT_URI=$(echo "$CURRENT_SECRET" | jq -r '.redirectUri // empty')

if [ -z "$CURRENT_CLIENT_ID" ] || [ -z "$CURRENT_CLIENT_SECRET" ]; then
    print_error "Could not find existing Google OAuth credentials"
    exit 1
fi

print_info "Current configuration:"
print_info "Client ID: ${CURRENT_CLIENT_ID:0:20}..."
print_info "Client Secret: ${CURRENT_CLIENT_SECRET:0:10}..."
print_info "Current Redirect URI: ${CURRENT_REDIRECT_URI}"

# Prompt for new redirect URI
echo ""
print_info "Enter the new redirect URI (or press Enter to keep current):"
print_info "Example: https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/drive/callback"
read -p "New Redirect URI: " NEW_REDIRECT_URI

# Use current if no new value provided
if [ -z "$NEW_REDIRECT_URI" ]; then
    NEW_REDIRECT_URI="$CURRENT_REDIRECT_URI"
fi

# Create updated JSON
SECRET_JSON=$(jq -n \
    --arg clientId "$CURRENT_CLIENT_ID" \
    --arg clientSecret "$CURRENT_CLIENT_SECRET" \
    --arg redirectUri "$NEW_REDIRECT_URI" \
    '{clientId: $clientId, clientSecret: $clientSecret, redirectUri: $redirectUri}')

# Update the secret
print_info "Updating secret..."
aws secretsmanager update-secret \
    --secret-id $SECRET_NAME \
    --secret-string "$SECRET_JSON" \
    --region $REGION

if [ $? -eq 0 ]; then
    print_success "Secret updated successfully!"
    print_info "New redirect URI: $NEW_REDIRECT_URI"
    
    echo ""
    print_info "IMPORTANT: You must also update the redirect URI in Google Cloud Console:"
    print_info "1. Go to https://console.cloud.google.com/apis/credentials"
    print_info "2. Select your OAuth 2.0 Client ID"
    print_info "3. Add the new redirect URI to 'Authorized redirect URIs'"
    print_info "4. Save the changes"
else
    print_error "Failed to update secret"
    exit 1
fi