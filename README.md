# Nexus Discord Bot

A Discord bot built with [Sapphire Framework](https://www.sapphirejs.dev/).

## Setup

1. Install dependencies: `npm install`
2. Create `.env` with `TOKEN`
3. Initialize database: `npx drizzle-kit push`
4. Run: `npm run dev`

## Commands

### General

- `/ping` - Replies with Pong!
- `/statistics` - View server statistics (members, boosts, channels, roles, emojis, etc.)

### Reminders

- `/reminder create message:"..." when:"in 2 hours"` - Create a reminder
- `/reminder list` - List your reminders
- `/reminder delete` - Delete your reminders
- `/admin-reminders user:@user` - View reminders for a specific user

### Moderation

- `/purge count:50` - Bulk delete messages (1-100, requires Manage Messages)
- `/timeout duration:30` - Timeout yourself for a specified duration

### Configuration (Admin)

- `/config starboard channel:#channel` - Set the starboard channel
- `/config starboard threshold:3` - Set the star threshold (default: 3)
- `/config starboard disable` - Disable starboard
- `/config starboard status` - View current starboard settings
