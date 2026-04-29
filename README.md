# BBV Bingo — Setup Instructions

## Files in this package
- `index.html` — Guest-facing bingo game
- `admin.html` — Staff dashboard to manage reservations and approve rewards
- `vercel.json` — Deployment config for Vercel
- `logo.png` — Your Big Bear Vacations logo (add this file!)

## Step 1 — Add your logo
Copy your Big Bear Vacations logo file and rename it to `logo.png`, place it in this folder.

## Step 2 — Update the Supabase anon key
In BOTH index.html and admin.html, find this line:
```
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...placeholder';
```
Replace the value with your actual full anon key from Supabase.

## Step 3 — Change the admin password
In admin.html, find this line and change the password:
```
const ADMIN_PASSWORD = 'bbv-bingo-admin-2026';
```

## Step 4 — Deploy to Vercel
1. Go to vercel.com and sign up with your Google account
2. Click "Add New Project"
3. Choose "Upload" and drag this entire folder
4. Click Deploy — it's live in ~60 seconds!

## Step 5 — Connect your subdomain
1. In Vercel, go to your project → Settings → Domains
2. Add: bingo.bigbearvacations.com
3. In your domain registrar (wherever you manage bigbearvacations.com), add a CNAME record:
   - Name: bingo
   - Value: cname.vercel-dns.com

## Step 6 — Add reservations
Go to your admin dashboard at:
`https://bingo.bigbearvacations.com/admin`

Add reservations manually before guests check in. Each reservation needs:
- Reservation number (from Akia/Streamline)
- Guest last name
- Guest name (optional)
- Cabin name (optional)
- Check-in date (optional)

## Step 7 — Akia message template
In Akia, create an automated message sent on check-in day:
```
Hi [Guest Name]! 🏔️ Welcome to Big Bear!

We have a special Berry-Fun Bingo challenge just for you. Complete 5 activities in a row and earn a reward!

Play here: https://bingo.bigbearvacations.com?res=[RESERVATION_NUMBER]&last=[LAST_NAME]

Have an amazing stay! — Big Bear Vacations Team
```

## Admin dashboard features
- View all guest sessions
- See completed activities and uploaded photos
- Filter by: All / Bingo completed / Reward pending / Approved
- Add reward notes and approve rewards
- Real-time stats

## Guest link format
`https://bingo.bigbearvacations.com?res=12345&last=Smith`

The game auto-locks to the first device that opens it with that reservation.
