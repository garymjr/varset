#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Detect OS and architecture
OS=$(uname -s)
ARCH=$(uname -m)

# Map architecture to binary naming
case "$ARCH" in
  x86_64|amd64)
    ARCH_MAPPED="x64"
    ;;
  arm64|aarch64)
    ARCH_MAPPED="arm64"
    ;;
  *)
    echo -e "${RED}Error: Unsupported architecture: $ARCH${NC}"
    exit 1
    ;;
esac

# Determine binary name based on OS
case "$OS" in
  Linux)
    BINARY_NAME="varset-linux-${ARCH_MAPPED}"
    ;;
  Darwin)
    if [ "$ARCH_MAPPED" != "arm64" ]; then
      echo -e "${RED}Error: macOS x64 is not supported. Please use macOS ARM64 (Apple Silicon).${NC}"
      exit 1
    fi
    BINARY_NAME="varset-macos-arm64"
    ;;
  *)
    echo -e "${RED}Error: Unsupported operating system: $OS${NC}"
    exit 1
    ;;
esac

GITHUB_REPO="garymjr/varset"
GITHUB_API_URL="https://api.github.com/repos/${GITHUB_REPO}/releases/latest"
INSTALL_DIR="$HOME/.local/bin"
INSTALL_PATH="$INSTALL_DIR/varset"

echo -e "${YELLOW}Installing varset...${NC}"
echo "Platform: $OS $ARCH"
echo "Binary: $BINARY_NAME"

# Fetch latest release info
echo -e "${YELLOW}Fetching latest release...${NC}"
LATEST_RELEASE=$(curl -fsSL "$GITHUB_API_URL" 2>/dev/null || echo "")

if [ -z "$LATEST_RELEASE" ]; then
  echo -e "${RED}Error: Failed to fetch latest release from GitHub${NC}"
  exit 1
fi

# Extract download URL
DOWNLOAD_URL=$(echo "$LATEST_RELEASE" | grep -o "\"browser_download_url\": \"[^\"]*${BINARY_NAME}[^\"]*\"" | head -1 | cut -d'"' -f4)

if [ -z "$DOWNLOAD_URL" ]; then
  echo -e "${RED}Error: Could not find binary for your platform ($BINARY_NAME) in the latest release${NC}"
  echo -e "${YELLOW}Available platforms: Linux x64, macOS ARM64${NC}"
  exit 1
fi

# Create temporary directory
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

TEMP_BINARY="$TEMP_DIR/varset"

# Download binary
echo -e "${YELLOW}Downloading from: $DOWNLOAD_URL${NC}"
if ! curl -fsSL -o "$TEMP_BINARY" "$DOWNLOAD_URL"; then
  echo -e "${RED}Error: Failed to download binary${NC}"
  exit 1
fi

# Make executable
chmod +x "$TEMP_BINARY"

# Create install directory
mkdir -p "$INSTALL_DIR"

# Install binary
echo -e "${YELLOW}Installing to $INSTALL_PATH${NC}"
cp "$TEMP_BINARY" "$INSTALL_PATH"

# Check if ~/.local/bin is in PATH
if ! echo "$PATH" | grep -q "$HOME/.local/bin"; then
  echo -e "${YELLOW}Note: $HOME/.local/bin is not in your PATH${NC}"
  echo -e "${YELLOW}Add it to your shell profile with: export PATH=\"\$HOME/.local/bin:\$PATH\"${NC}"
fi

# Verify installation
echo -e "${YELLOW}Verifying installation...${NC}"
if "$INSTALL_PATH" version &> /dev/null; then
  VERSION=$("$INSTALL_PATH" version 2>/dev/null || echo "unknown")
  echo -e "${GREEN}Successfully installed varset!${NC}"
  echo "Location: $INSTALL_PATH"
  echo "Version: $VERSION"
  echo ""
  echo -e "${YELLOW}Get started:${NC}"
  echo "  varset help      - Show help information"
  echo "  varset version   - Show version information"
else
  echo -e "${RED}Error: Installation verification failed${NC}"
  echo -e "${YELLOW}varset not found or not working properly${NC}"
  exit 1
fi
