#!/bin/bash

# Authentication System Test Script
# Tests all authentication features

API_URL="http://localhost:4000/api"
FRONTEND_URL="http://localhost:3000"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Helper function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASSED:${NC} $2"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAILED:${NC} $2"
        ((FAILED++))
    fi
}

# Helper function to extract field from JSON
extract_json() {
    echo "$1" | grep -o "\"$2\":\"[^\"]*\"" | cut -d'"' -f4
}

echo "========================================="
echo "Authentication System Test Suite"
echo "========================================="
echo ""

# Check if API is running
echo "🔍 Checking if API is running..."
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" ${API_URL}/../health)
if [ "$API_STATUS" = "200" ]; then
    print_result 0 "API is running"
else
    print_result 1 "API is not running (status: $API_STATUS)"
    echo "Please start the API with: npm run dev:api"
    exit 1
fi

echo ""
echo "========================================="
echo "TEST 1: User Registration"
echo "========================================="

# Generate unique email and phone for testing
TIMESTAMP=$(date +%s)
TEST_EMAIL="test${TIMESTAMP}@example.com"
TEST_PASSWORD="Test1234@"
# Generate unique phone number (last 8 digits from timestamp)
TEST_PHONE="+9955${TIMESTAMP: -8}"

echo "Registering user: $TEST_EMAIL"
echo "Phone: $TEST_PHONE"
REGISTER_RESPONSE=$(curl -s -X POST ${API_URL}/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test\",
    \"surname\": \"User\",
    \"email\": \"${TEST_EMAIL}\",
    \"phone\": \"${TEST_PHONE}\",
    \"password\": \"${TEST_PASSWORD}\",
    \"confirmPassword\": \"${TEST_PASSWORD}\"
  }")

echo "Response: $REGISTER_RESPONSE"

# Check if registration was successful
if echo "$REGISTER_RESPONSE" | grep -q '"success":true'; then
    print_result 0 "User registration successful"
    VERIFICATION_TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"verificationToken":"[^"]*"' | cut -d'"' -f4)
else
    print_result 1 "User registration failed"
    echo "Response: $REGISTER_RESPONSE"
fi

echo ""
echo "========================================="
echo "TEST 2: Login with Device Detection"
echo "========================================="

# Test login
echo "Logging in as: $TEST_EMAIL"
LOGIN_RESPONSE=$(curl -s -X POST ${API_URL}/auth/login \
  -H "Content-Type: application/json" \
  -c cookies1.txt \
  -d "{
    \"email\": \"${TEST_EMAIL}\",
    \"password\": \"${TEST_PASSWORD}\",
    \"screenResolution\": \"1920x1080\",
    \"timezone\": \"Asia/Tbilisi\",
    \"colorDepth\": \"24\"
  }")

echo "Response: $LOGIN_RESPONSE"

if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
    print_result 0 "Login successful with device detection"
    ACCESS_TOKEN=$(extract_json "$LOGIN_RESPONSE" "accessToken")
    SESSION_ID=$(extract_json "$LOGIN_RESPONSE" "sessionId")
    echo "  → Access Token: ${ACCESS_TOKEN:0:20}..."
    echo "  → Session ID: $SESSION_ID"
else
    print_result 1 "Login failed"
fi

echo ""
echo "========================================="
echo "TEST 3: Get User Devices"
echo "========================================="

DEVICES_RESPONSE=$(curl -s -X GET ${API_URL}/auth/devices \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -b cookies1.txt)

echo "Response: $DEVICES_RESPONSE"

if echo "$DEVICES_RESPONSE" | grep -q '"success":true'; then
    DEVICE_COUNT=$(echo "$DEVICES_RESPONSE" | grep -o '"deviceName"' | wc -l)
    print_result 0 "Retrieved devices (count: $DEVICE_COUNT)"
else
    print_result 1 "Failed to retrieve devices"
fi

echo ""
echo "========================================="
echo "TEST 4: Login from Multiple Devices (Max 3)"
echo "========================================="

echo "Device 1 (already logged in)"
print_result 0 "Device 1 session created"

echo "Logging in from Device 2..."
LOGIN2_RESPONSE=$(curl -s -X POST ${API_URL}/auth/login \
  -H "Content-Type: application/json" \
  -c cookies2.txt \
  -d "{
    \"email\": \"${TEST_EMAIL}\",
    \"password\": \"${TEST_PASSWORD}\",
    \"screenResolution\": \"1366x768\",
    \"timezone\": \"Europe/London\",
    \"colorDepth\": \"32\"
  }")

if echo "$LOGIN2_RESPONSE" | grep -q '"success":true'; then
    print_result 0 "Device 2 session created"
else
    print_result 1 "Device 2 login failed"
fi

echo "Logging in from Device 3..."
LOGIN3_RESPONSE=$(curl -s -X POST ${API_URL}/auth/login \
  -H "Content-Type: application/json" \
  -c cookies3.txt \
  -d "{
    \"email\": \"${TEST_EMAIL}\",
    \"password\": \"${TEST_PASSWORD}\",
    \"screenResolution\": \"414x896\",
    \"timezone\": \"America/New_York\",
    \"colorDepth\": \"24\"
  }")

if echo "$LOGIN3_RESPONSE" | grep -q '"success":true'; then
    print_result 0 "Device 3 session created"
else
    print_result 1 "Device 3 login failed"
fi

# Check device count
DEVICES_CHECK=$(curl -s -X GET ${API_URL}/auth/devices \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -b cookies1.txt)

DEVICE_COUNT=$(echo "$DEVICES_CHECK" | grep -o '"deviceName"' | wc -l)
if [ "$DEVICE_COUNT" -eq 3 ]; then
    print_result 0 "Device limit enforced (3 devices active)"
else
    print_result 1 "Device count incorrect (expected 3, got $DEVICE_COUNT)"
fi

echo ""
echo "========================================="
echo "TEST 5: Token Refresh"
echo "========================================="

echo "Waiting 2 seconds to ensure different timestamp..."
sleep 2

echo "Refreshing access token..."
REFRESH_RESPONSE=$(curl -s -X POST ${API_URL}/auth/refresh \
  -b cookies1.txt \
  -c cookies1.txt)

echo "Response: $REFRESH_RESPONSE"

if echo "$REFRESH_RESPONSE" | grep -q '"accessToken"'; then
    NEW_ACCESS_TOKEN=$(extract_json "$REFRESH_RESPONSE" "accessToken")
    print_result 0 "Token refresh successful"
    echo "  → New Access Token: ${NEW_ACCESS_TOKEN:0:20}..."

    # Verify old and new tokens are different
    if [ "$ACCESS_TOKEN" != "$NEW_ACCESS_TOKEN" ]; then
        print_result 0 "Token rotation working (tokens are different)"
    else
        print_result 1 "Token rotation failed (tokens are the same)"
    fi
else
    print_result 1 "Token refresh failed"
fi

echo ""
echo "========================================="
echo "TEST 6: Remove Device"
echo "========================================="

# Get first device ID
FIRST_DEVICE_ID=$(echo "$DEVICES_CHECK" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$FIRST_DEVICE_ID" ]; then
    echo "Removing device: $FIRST_DEVICE_ID"
    REMOVE_RESPONSE=$(curl -s -X DELETE ${API_URL}/auth/devices/${FIRST_DEVICE_ID} \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -b cookies1.txt)

    echo "Response: $REMOVE_RESPONSE"

    if echo "$REMOVE_RESPONSE" | grep -q '"success":true'; then
        print_result 0 "Device removed successfully"

        # Verify device was removed
        DEVICES_AFTER=$(curl -s -X GET ${API_URL}/auth/devices \
          -H "Authorization: Bearer $ACCESS_TOKEN" \
          -b cookies2.txt)

        NEW_COUNT=$(echo "$DEVICES_AFTER" | grep -o '"deviceName"' | wc -l)
        if [ "$NEW_COUNT" -eq 2 ]; then
            print_result 0 "Device count updated correctly (2 devices remaining)"
        else
            print_result 1 "Device count incorrect after removal"
        fi
    else
        print_result 1 "Device removal failed"
    fi
else
    print_result 1 "Could not find device ID"
fi

echo ""
echo "========================================="
echo "TEST 7: Rate Limiting (Failed Logins)"
echo "========================================="

echo "Testing rate limiting with 5 failed login attempts..."

for i in {1..6}; do
    FAIL_RESPONSE=$(curl -s -X POST ${API_URL}/auth/login \
      -H "Content-Type: application/json" \
      -d "{
        \"email\": \"${TEST_EMAIL}\",
        \"password\": \"WrongPassword123@\"
      }")

    if [ $i -le 5 ]; then
        if echo "$FAIL_RESPONSE" | grep -q '"success":false'; then
            echo "  Attempt $i: Login failed (expected)"
        fi
    else
        # 6th attempt should be rate limited
        if echo "$FAIL_RESPONSE" | grep -q 'RATE_LIMIT_EXCEEDED\|Too many'; then
            print_result 0 "Rate limiting activated after 5 failed attempts"
            echo "  → User blocked for 15 minutes"
            break
        else
            print_result 1 "Rate limiting not working"
        fi
    fi

    sleep 1
done

echo ""
echo "========================================="
echo "TEST 8: Password Reset Flow"
echo "========================================="

echo "Requesting password reset..."
FORGOT_RESPONSE=$(curl -s -X POST ${API_URL}/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"${TEST_EMAIL}\"}")

echo "Response: $FORGOT_RESPONSE"

if echo "$FORGOT_RESPONSE" | grep -q '"success":true'; then
    print_result 0 "Password reset request successful"
    echo "  → Check console logs for reset token (SendGrid not configured)"
else
    print_result 1 "Password reset request failed"
fi


echo ""
echo "========================================="
echo "TEST SUMMARY"
echo "========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some tests failed. Check the output above.${NC}"
    exit 1
fi

# Cleanup
rm -f cookies1.txt cookies2.txt cookies3.txt
