# Admin Account Setup Guide

## Creating Admin Account via Firebase Console

Since admin registration is now handled from the backend, follow these steps to create an admin account:

### Method 1: Firebase Console (Recommended)

1. **Create User in Firebase Authentication**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project
   - Click "Authentication" in the left sidebar
   - Click "Users" tab
   - Click "Add user"
   - Enter admin email and password
   - Click "Add user"
   - Copy the User UID

2. **Add Admin Document in Firestore**
   - Click "Firestore Database" in the left sidebar
   - Click "Start collection" (if first time) or navigate to "users" collection
   - Click "Add document"
   - Document ID: Paste the User UID from step 1
   - Add fields:
     ```
     name: "Admin Name" (string)
     email: "admin@school.com" (string)
     role: "admin" (string)
     approved: true (boolean)
     createdAt: [Click "Add field" → Select "timestamp" → Click "Set to current time"]
     updatedAt: [Click "Add field" → Select "timestamp" → Click "Set to current time"]
     ```
   - Click "Save"

3. **Login as Admin**
   - Go to your LNMS application
   - Click "Admin Login" on the homepage
   - Enter the admin email and password
   - You should be redirected to the admin dashboard

### Method 2: Using Firebase CLI

If you have Firebase CLI installed, you can use this script:

```javascript
// admin-setup.js
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

async function createAdmin() {
  try {
    // Create user in Authentication
    const userRecord = await auth.createUser({
      email: 'admin@school.com',
      password: 'SecurePassword123!',
      displayName: 'System Administrator'
    });

    console.log('Successfully created admin user:', userRecord.uid);

    // Add user document in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      name: 'System Administrator',
      email: 'admin@school.com',
      role: 'admin',
      approved: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('Successfully created admin document in Firestore');
    console.log('Admin email: admin@school.com');
    console.log('Admin password: SecurePassword123!');
    console.log('Please change the password after first login!');

  } catch (error) {
    console.error('Error creating admin:', error);
  }
}

createAdmin();
```

Run with: `node admin-setup.js`

### Method 3: Promote Existing User

If you already have a user account:

1. Go to Firebase Console → Firestore Database
2. Find the user in the "users" collection
3. Edit the document
4. Change `role` from "teacher" to "admin"
5. Set `approved` to `true`
6. Save changes
7. Login using Admin Login page

## Admin Login URL

After setup, admins should login at:
- **Admin Login Page**: `/pages/admin-login.html`
- **Direct Link**: `https://your-domain.com/pages/admin-login.html`

## Security Notes

1. **Strong Passwords**: Always use strong passwords for admin accounts
2. **Limited Access**: Only create admin accounts for authorized personnel
3. **Regular Audits**: Regularly review admin accounts in Firebase Console
4. **Password Changes**: Change default passwords immediately after first login
5. **Two-Factor Authentication**: Consider enabling 2FA in Firebase Authentication

## Admin Capabilities

Once logged in, admins can:
- ✅ Review and approve/reject lesson notes
- ✅ Approve teacher registrations
- ✅ Manage teacher accounts
- ✅ Post announcements
- ✅ View analytics and reports
- ✅ Access activity logs
- ✅ Use AI evaluation tools

## Troubleshooting

### Cannot Login as Admin
- Verify the user exists in Firebase Authentication
- Check that the user document exists in Firestore "users" collection
- Confirm `role` field is set to "admin"
- Ensure `approved` field is set to `true`
- Try resetting the password in Firebase Console

### Admin Dashboard Not Loading
- Check browser console for errors
- Verify Firebase configuration is correct
- Ensure Firestore security rules allow admin access
- Clear browser cache and try again

## Multiple Admins

To create multiple admin accounts, repeat the process for each admin:
1. Create user in Authentication
2. Add document in Firestore with role="admin"
3. Provide credentials to the admin

## Best Practices

1. **Naming Convention**: Use descriptive names (e.g., "John Doe - Principal")
2. **Email Format**: Use official school email addresses
3. **Documentation**: Keep a secure record of admin accounts
4. **Regular Reviews**: Audit admin accounts quarterly
5. **Offboarding**: Remove admin access when personnel leave

---

**Important**: Never share admin credentials publicly or commit them to version control!