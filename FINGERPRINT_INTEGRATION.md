# Fingerprint Device Integration Guide

## Overview

This document explains how to integrate fingerprint/biometric devices with the attendance system for automatic check-in functionality.

## Backend API Endpoint

The system provides a dedicated endpoint for fingerprint check-ins:

### Endpoint
```
POST /api/attendance/fingerprint
```

### Request Body
```json
{
  "fingerprintId": "string",  // Unique fingerprint identifier from device
  "deviceId": "string",        // Optional: Device identifier
  "deviceName": "string"       // Optional: Device name/model
}
```

### Response (Success)
```json
{
  "success": true,
  "status": "success",
  "message": "Check-in successful",
  "attendance": {
    "_id": "...",
    "memberId": {...},
    "checkInTime": "2025-01-06T12:33:00.000Z",
    "method": "biometric",
    "status": "success"
  },
  "member": {
    "_id": "...",
    "firstName": "John",
    "lastName": "Doe",
    "memberId": "MEM000001"
  }
}
```

### Response (Expired/Blocked)
```json
{
  "success": false,
  "status": "expired",
  "message": "Membership has expired",
  "attendance": {...},
  "member": {...}
}
```

## How It Works

1. **Member Registration**: Members must have their fingerprint registered in the system
   - Fingerprint data is stored in `Member.biometricData.fingerprint`
   - Can be registered through the member profile

2. **Device Integration**: 
   - Fingerprint device scans the fingerprint
   - Device sends the fingerprint ID to the API endpoint
   - System validates membership status
   - If active: Creates attendance record and grants access
   - If expired/blocked: Creates attendance record with denied status

3. **Access Control**:
   - Active membership: ✅ Access granted
   - Expired membership: ❌ Access denied
   - Frozen membership: ❌ Access denied
   - Cancelled membership: ❌ Access denied

## Recommended Fingerprint Devices

### 1. **ZKTeco Series** (Recommended)
- **Models**: ZKTeco F18, ZKTeco K40, ZKTeco K50
https://www.amazon.in/ZKTeco-Attendance-Fingerprint-Cloud-Based-Management/dp/B0FDR1TS1Y?ref_=ast_sto_dp
- **Pros**: 
  - Excellent SDK support
  - TCP/IP and HTTP API integration
  - Good fingerprint recognition accuracy
  - Affordable pricing
  - Supports multiple communication protocols
- **Integration**: Use ZKTeco SDK or HTTP API
- **Price Range**: $50 - $200
- **Best For**: Small to medium gyms

### 2. **Suprema BioStation Series**
- **Models**: BioStation 2, BioStation A2
- **Pros**:
  - High accuracy
  - Face + fingerprint combination
  - Excellent SDK and API
  - Enterprise-grade reliability
- **Integration**: Suprema SDK or REST API
- **Price Range**: $200 - $500
- **Best For**: Medium to large facilities

### 3. **HID Global Readers**
- **Models**: HID Signo, HID VertX
- **Pros**:
  - Industry standard
  - Excellent security
  - Multiple authentication methods
  - Enterprise support
- **Integration**: HID SDK or REST API
- **Price Range**: $300 - $800
- **Best For**: Large enterprises

### 4. **Mantra MFS100** (Budget Option)
- **Pros**:
  - Very affordable
  - Good for Indian market
  - USB integration
  - Simple SDK
- **Integration**: Mantra SDK
- **Price Range**: $30 - $80
- **Best For**: Small gyms, budget-conscious setups

### 5. **IDEMIA MorphoWave**
- **Pros**:
  - Contactless fingerprint scanning
  - High security
  - Fast recognition
- **Integration**: IDEMIA SDK
- **Price Range**: $400 - $1000
- **Best For**: Premium facilities

## Integration Steps

### Step 1: Device Setup
1. Install the fingerprint device at the entrance
2. Connect to network (Ethernet/WiFi) or USB
3. Configure device IP address and port
4. Test device connectivity

### Step 2: SDK Installation
```bash
# Example for Node.js (if using device SDK)
npm install zkteco-sdk  # or appropriate SDK
```

### Step 3: Create Integration Service
Create a service that:
1. Listens to fingerprint device events
2. Extracts fingerprint ID
3. Calls the API endpoint
4. Handles responses (open door, show message, etc.)

### Example Integration Code (Node.js)

```javascript
const axios = require('axios');
const ZKTeco = require('zkteco-sdk'); // Example SDK

// Initialize device
const device = new ZKTeco({
  ip: '192.168.1.100',
  port: 4370
});

// Listen for fingerprint scans
device.on('fingerprint', async (fingerprintData) => {
  try {
    const response = await axios.post('http://your-api.com/api/attendance/fingerprint', {
      fingerprintId: fingerprintData.id,
      deviceId: 'DEVICE_001',
      deviceName: 'ZKTeco F18 - Main Entrance'
    });

    if (response.data.success) {
      // Grant access
      device.openDoor();
      device.showMessage('Welcome ' + response.data.member.firstName);
    } else {
      // Deny access
      device.showMessage(response.data.message);
      device.beep(); // Alert sound
    }
  } catch (error) {
    console.error('Check-in failed:', error);
    device.showMessage('System error. Please contact staff.');
  }
});

// Connect to device
device.connect();
```

### Step 4: Door Control Integration
Most fingerprint devices support:
- Relay output for door control
- LED indicators
- Buzzer/beep sounds
- LCD display for messages

Configure these based on API responses:
- ✅ Success: Green LED, door unlock, welcome message
- ❌ Denied: Red LED, beep, denial message

## Manual Override

If a member's fingerprint fails or they need manual check-in:
1. Staff can use the web interface
2. Search by attendance ID, member ID, or phone
3. Manually check in with `allowManualOverride: true`

## Security Considerations

1. **API Security**: 
   - Use API keys or device authentication
   - Consider IP whitelisting for device endpoints
   - Use HTTPS for all communications

2. **Device Security**:
   - Change default passwords
   - Keep firmware updated
   - Use secure network (VLAN if possible)

3. **Data Privacy**:
   - Fingerprint templates are encrypted
   - Comply with local biometric data regulations
   - Store minimal fingerprint data

## Testing

1. **Test Active Member**: Should grant access
2. **Test Expired Member**: Should deny access
3. **Test Duplicate Check-in**: Should prevent same-day duplicate
4. **Test Network Failure**: Should handle gracefully
5. **Test Invalid Fingerprint**: Should return appropriate error

## Troubleshooting

### Device Not Connecting
- Check network connectivity
- Verify IP address and port
- Check firewall settings

### Fingerprint Not Recognized
- Re-register fingerprint
- Clean sensor
- Check fingerprint quality

### API Errors
- Verify API endpoint URL
- Check authentication credentials
- Review server logs

## Support

For device-specific integration help:
- ZKTeco: https://www.zkteco.com/support
- Suprema: https://www.supremainc.com/support
- HID: https://www.hidglobal.com/support

## Future Enhancements

- Face recognition integration
- QR code scanning
- Mobile app check-in
- Offline mode support
- Multi-device synchronization

