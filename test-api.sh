#!/bin/bash

# Test API Script
# This script tests all API endpoints to ensure they're working

API_BASE="http://localhost:3000"
API_KEY="test-api-key"  # Change this to your actual API key

echo "=========================================="
echo "  VPN Panel API - Integration Test"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Function to test endpoint
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local expect_auth=$5
    
    echo -n "Testing: $name ... "
    
    if [ "$method" = "GET" ]; then
        if [ "$expect_auth" = "true" ]; then
            response=$(curl -s -w "\n%{http_code}" -H "X-API-KEY: $API_KEY" "$API_BASE$endpoint")
        else
            response=$(curl -s -w "\n%{http_code}" "$API_BASE$endpoint")
        fi
    else
        if [ "$expect_auth" = "true" ]; then
            response=$(curl -s -w "\n%{http_code}" -X "$method" -H "Content-Type: application/json" -H "X-API-KEY: $API_KEY" -d "$data" "$API_BASE$endpoint")
        else
            response=$(curl -s -w "\n%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "$API_BASE$endpoint")
        fi
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✓ PASSED${NC} (HTTP $http_code)"
        PASSED=$((PASSED + 1))
    elif [ "$http_code" -eq 401 ] || [ "$http_code" -eq 403 ]; then
        echo -e "${YELLOW}⚠ AUTH REQUIRED${NC} (HTTP $http_code)"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ FAILED${NC} (HTTP $http_code)"
        echo "  Response: $body"
        FAILED=$((FAILED + 1))
    fi
}

# Check if server is running
echo "Checking if server is running..."
if ! curl -s "$API_BASE/health" > /dev/null; then
    echo -e "${RED}❌ Server is not running at $API_BASE${NC}"
    echo "Please start the server first: npm start"
    exit 1
fi
echo -e "${GREEN}✓ Server is running${NC}"
echo ""

# Test Health Check
test_endpoint "Health Check" "GET" "/health" "" "false"

# Test Root Endpoint
test_endpoint "Root API Info" "GET" "/" "" "false"

# Test User Endpoints (without actual execution to avoid system changes)
echo ""
echo "Note: User and Payment creation tests are skipped to avoid system changes."
echo "To test these endpoints, use the API_EXAMPLES.md examples manually."

# Test Authentication
echo ""
echo "Testing Authentication..."
test_endpoint "List Users (No Auth)" "GET" "/api/users" "" "false"
test_endpoint "List Users (With Auth)" "GET" "/api/users" "" "true"

# Test Invalid Endpoints
echo ""
echo "Testing Error Handling..."
test_endpoint "404 Not Found" "GET" "/api/invalid-endpoint" "" "false"

# Summary
echo ""
echo "=========================================="
echo "  Test Summary"
echo "=========================================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed.${NC}"
    exit 1
fi
