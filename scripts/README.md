# Database Scripts & Utilities

This folder contains SQL scripts and database-related utilities for the QuizStack project.

## 📋 SQL Scripts

### Core Database Setup
- **`friend_challenges_setup.sql`** - Complete setup for the friend challenges system including tables, relationships, and policies
- **`comprehensive-fix.sql`** - Comprehensive database fixes and optimizations
- **`simple-challenge-fix.sql`** - Simplified challenge system fixes
- **`manual-migration-fix.sql`** - Manual migration fixes for database schema

### Constraint Fixes
- **`fix-battle-events-constraint.sql`** - Fixes constraints for battle events table
- **`fix-status-constraint.sql`** - Fixes status constraints across tables

### Testing & Development
- **`test-database-schema.sql`** - Test schema for development and testing purposes

## 🧪 Test Files

- **`test-challenge.html`** - HTML test file for challenge functionality

## 🚀 Usage

These scripts should be run in order based on your needs:

1. **Initial Setup**: Use `friend_challenges_setup.sql` for a complete system setup
2. **Fixes**: Apply constraint fixes as needed
3. **Testing**: Use test files for development validation

## ⚠️ Important Notes

- Always backup your database before running these scripts
- Test scripts in a development environment first
- Some scripts may need to be modified based on your specific database state
- Check the main project README for complete setup instructions

## 📚 Related Documentation

- [Friend Challenges Setup Guide](../docs/FRIEND_CHALLENGES_SETUP.md)
- [Main Project README](../README.md)
