# Booking Appointment Timezone Mismatch - SOLUTION GUIDE

## Problem Summary
When users select 8:00 AM for a booking appointment, it shows as 6:00 AM when retrieved. This is a 2-hour timezone mismatch.

**Root Cause:**
- The application uses `Africa/Johannesburg` timezone (UTC+2 in winter, UTC+3 in summer)
- Times are stored in MongoDB as UTC via JavaScript `new Date()` 
- When times are retrieved, no timezone conversion is applied, causing the mismatch
- The frontend was sending times without proper timezone context

## Solution Implemented

### 1. Created Timezone Helper (`src/helpars/timezoneHelper.ts`)
This new file provides utility functions for timezone conversion:

```typescript
- convertToUTC()                  // Convert local time to UTC for storage
- convertToLocalTimezone()        // Convert UTC to local timezone
- formatTimeInTimezone()          // Format time in readable format
- getNowInBusinessTimezone()      // Get current time in business timezone
- BUSINESS_TIMEZONE              // Set to 'Africa/Johannesburg'
```

### 2. Updated Booking Service
Modified `src/app/modules/booking/booking.service.ts` to:

#### When Creating Bookings:
- Import the timezone helper
- Store times as-is (JavaScript handles the conversion when passed as Date objects)
- Format times in notifications using `timezoneHelper.formatTimeInTimezone()`

#### When Retrieving Bookings:
- Add `startTimeFormatted` and `endTimeFormatted` fields to API responses
- These automatically show times in the `Africa/Johannesburg` timezone

### 3. Key Changes

**In booking creation:**
```typescript
// Before: toLocaleTimeString (unreliable)
const timeSlotStr = new Date(timeSlots[0].startTime).toLocaleTimeString('en-US', ...)

// After: using timezone helper
const timeSlotStr = timezoneHelper.formatTimeInTimezone(
  new Date(timeSlots[0].startTime), 
  "hh:mm a"
)
```

**In booking retrieval:**
```typescript
// Added formatted fields alongside raw timestamps
timeSlot: result.timeSlot.map((slot) => ({
  ...slot,
  startTime: slot.startTime,                               // Raw UTC time
  endTime: slot.endTime,                                   // Raw UTC time
  startTimeFormatted: timezoneHelper.formatTimeInTimezone(slot.startTime, "hh:mm a"),  // Formatted in TZ
  endTimeFormatted: timezoneHelper.formatTimeInTimezone(slot.endTime, "hh:mm a"),      // Formatted in TZ
}))
```

## Frontend Changes Needed

To ensure proper timezone handling on the frontend:

### 1. When Sending Appointment Times
**Current (May be causing issues):**
```javascript
// Don't send just the time; send the full ISO string
const time = "08:00 AM"; // ❌ WRONG - loses timezone context
```

**Correct Approach:**
```javascript
// Send as ISO string with full date-time context
const time = new Date("2024-04-11T08:00:00").toISOString(); // ✅ CORRECT
// Or in ISO format: "2024-04-11T08:00:00Z"
```

### 2. When Displaying Appointment Times
**Don't use:**
```javascript
new Date(timeSlot.startTime).toLocaleTimeString() // May show wrong time
```

**Use the backend response:**
```javascript
// The API now returns formatted times
timeSlot.startTimeFormatted  // e.g., "08:00 am"
timeSlot.startTime           // Raw UTC time for calculations
```

### 3. Time Picker/Selection on Frontend
If using a time picker library, ensure it:
1. Captures the user's selected time
2. Sends it as an ISO string with correct date: `"2024-04-11T08:00:00"`
3. The backend will handle the timezone conversion

## Testing the Fix

### Test Case 1: Create Booking with 8:00 AM
```bash
curl -X POST http://localhost:5000/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "serviceId": "service_id",
    "specialistId": "specialist_id", 
    "businessId": "business_id",
    "bookingDate": "2024-04-11",
    "totalPrice": 100,
    "status": "PENDING",
    "timeSlot": [
      {
        "startTime": "2024-04-11T08:00:00",
        "endTime": "2024-04-11T09:00:00"
      }
    ]
  }'
```

### Expected Response:
```json
{
  "timeSlot": [
    {
      "startTime": "2024-04-11T06:00:00.000Z",  // UTC stored
      "endTime": "2024-04-11T07:00:00.000Z",    // UTC stored
      "startTimeFormatted": "08:00 am",          // ✅ Shows 8:00 am
      "endTimeFormatted": "09:00 am"             // ✅ Shows 9:00 am
    }
  ]
}
```

## Configuration

To change the timezone from `Africa/Johannesburg` to another timezone:

Edit `src/helpars/timezoneHelper.ts`:
```typescript
const BUSINESS_TIMEZONE = "Africa/Johannesburg"; // Change this to your timezone
```

Common timezone values:
- `"America/New_York"` (EST/EDT)
- `"Europe/London"` (GMT/BST)
- `"Asia/Dubai"` (GST)
- `"Australia/Sydney"` (AEST/AEDT)
- `"Africa/Cairo"` (EET)

## Files Modified

1. ✅ Created: `src/helpars/timezoneHelper.ts` - New timezone utility functions
2. ✅ Updated: `src/app/modules/booking/booking.service.ts` - Added timezone handling
3. ⏳ To Update: Frontend - Ensure times are sent as ISO strings

## Important Notes

1. **Database Migration:** Existing bookings store times in UTC. They will automatically display in the correct timezone when retrieved.

2. **Notification Times:** All notifications now use the timezone helper, ensuring consistent time display.

3. **Future Bookings:** All new bookings created after this fix will have proper timezone handling.

4. **API Response Format:** You can now rely on the `startTimeFormatted` and `endTimeFormatted` fields in API responses for displaying times to users.

## Troubleshooting

**Times still showing wrong?**
1. Verify the frontend is sending ISO string with date: `"2024-04-11T08:00:00"`
2. Check that `BUSINESS_TIMEZONE` is set correctly in `timezoneHelper.ts`
3. Check browser/app timezone settings match your business timezone
4. Clear browser cache and restart the backend

**Notifications showing wrong time?**
- All notifications now use `timezoneHelper.formatTimeInTimezone()` 
- Ensure Firebase/notification service is using the formatted time strings from the response

## Next Steps

1. ✅ Install the timezone helper (done)
2. ✅ Update booking service (done)
3. ⏳ Update frontend to send ISO string times
4. ⏳ Update frontend to use `startTimeFormatted` from API responses
5. ⏳ Test with bookings in your local timezone
6. ⏳ Verify notifications display correct times
