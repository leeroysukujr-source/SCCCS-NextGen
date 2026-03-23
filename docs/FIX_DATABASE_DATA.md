# Fix Database Data Loading - Step by Step Guide

## 🔍 Issue: Can't See Previous Information Created

If you're not seeing previous data (channels, rooms, classes, etc.), follow these steps:

## Step 1: Check If Data Exists in Database

Run this script to verify your database has data:

```bash
cd backend
python check_database.py
```

This will show you:
- How many users exist
- How many channels exist
- How many messages exist
- How many rooms exist
- How many classes exist
- Whether new tables exist (direct_messages, feedbacks)

## Step 2: Check Database File

Verify your database file exists and has data:

**Windows:**
```bash
cd backend\instance
dir scccs.db
```

**Mac/Linux:**
```bash
cd backend/instance
ls -lh scccs.db
```

The file should exist and have a size > 0 bytes. If it's missing or 0 bytes, the database wasn't initialized.

## Step 3: Create Missing Tables

If new tables (direct_messages, feedbacks) don't exist, run:

```bash
cd backend
python migrate_new_tables.py
```

This will create:
- `direct_messages` table
- `direct_message_files` table
- `feedbacks` table

**This preserves existing data** - it only adds new tables.

## Step 4: Reinitialize Database (Only if Data is Missing)

**⚠️ WARNING: This will DELETE existing data!**

Only run this if:
- Database file doesn't exist
- Database is empty (no users, no data)
- You want to start fresh

```bash
cd backend
python init_db.py
```

This creates:
- Default users (admin, teacher, student)
- Sample room, channel, and class

## Step 5: Verify Queries Are Working

### For Admins:

All queries now return **ALL data** for admins:

✅ **Channels**: `/api/channels` - Returns ALL channels
✅ **Messages**: Admins can view messages in ALL channels
✅ **Rooms**: `/api/rooms` - Returns ALL rooms
✅ **Classes**: `/api/classes` - Returns ALL classes
✅ **Direct Messages**: `/api/direct-messages/conversations` - Returns ALL conversations
✅ **Feedback**: `/api/feedback` - Returns ALL feedback

### For Regular Users:

- Channels: Only channels they're members of
- Messages: Only messages in channels they're members of
- Rooms: Only rooms they're participants in
- Classes: All classes (visible to all)
- Direct Messages: Only their conversations
- Feedback: Only their own (students) or feedbacks sent to them (lecturers)

## Step 6: Test Backend API

Test if backend is returning data:

```bash
# Test channels endpoint (replace YOUR_TOKEN with actual JWT token)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/channels

# Test rooms endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/rooms

# Test classes endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/classes
```

If these return empty arrays `[]`, the database might be empty.

## Step 7: Frontend Data Loading

Check browser console for errors:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for errors when loading pages

Common issues:
- CORS errors (backend not running or wrong URL)
- 401 Unauthorized (token expired - try logging out and back in)
- 404 Not Found (endpoint doesn't exist)
- Empty responses (database empty or queries not working)

## Step 8: Refresh Data

After making changes:

1. **Restart Backend**:
   ```bash
   # Stop backend (Ctrl+C)
   # Start again
   python run.py
   ```

2. **Refresh Frontend**:
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Clear browser cache
   - Log out and log back in

## 🔧 Troubleshooting

### Issue: Empty results even though data exists

**Solution**: Check if queries are filtering correctly. Admins should see all data now.

### Issue: "Table doesn't exist" errors

**Solution**: Run migration script:
```bash
python migrate_new_tables.py
```

### Issue: Authentication errors

**Solution**: 
- Log out and log back in
- Check if JWT token is valid
- Verify backend is running

### Issue: CORS errors

**Solution**: 
- Verify backend is running on correct port (5000)
- Check `.env` file has correct CORS_ORIGINS
- Verify frontend is connecting to correct backend URL

### Issue: Database file not found

**Solution**: 
- Run `python init_db.py` to create database
- Check database path in config.py
- Verify write permissions in `backend/instance/` directory

## ✅ Verification Checklist

After fixes, verify:

- [ ] Database file exists (`backend/instance/scccs.db`)
- [ ] Database has data (run `check_database.py`)
- [ ] New tables exist (direct_messages, feedbacks)
- [ ] Backend is running without errors
- [ ] Frontend can connect to backend (no CORS errors)
- [ ] Admin can see all channels, rooms, classes
- [ ] Admin can see all conversations and feedback
- [ ] Previous data is visible in UI

## 📝 Summary of Changes

1. ✅ **Admin Access**: Admins can now see ALL data (channels, rooms, classes, messages, conversations, feedback)
2. ✅ **Database Queries**: All queries properly fetch from database
3. ✅ **Channel Privacy**: Updated to allow admins full access
4. ✅ **Migration Script**: Created to add new tables without losing data
5. ✅ **Admin Dashboard**: Added overview sections for messages and feedback

All data should now be visible to admins, and queries properly fetch from the database.

