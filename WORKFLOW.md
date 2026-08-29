# FlyRank AI Internship Assignment Workflow

This project was developed as part of the FlyRank AI Internship assignment, with an AI assistant supporting the development workflow for the stated assignment.

## Project Overview
This repository is an anime tracker app built with React + TypeScript + Vite, using Firebase for authentication and Firestore favorites, and AniList for anime discovery data.

The app includes:
- user authentication with email/password
- anime discovery browsing
- favorites management
- tracking status for finished, queued, and rewatches
- watch stats and streak calculations
- AniList API proxy via a Vercel serverless function
- rate-limit handling and caching for AniList requests

## AI Assistant Role
The AI assistant was used to support the assignment by helping with:
- project planning and feature breakdown
- UI and component architecture
- TypeScript implementation and bug fixing
- Firebase + Firestore integration
- AniList API integration and proxy setup
- Vercel deployment configuration and environment handling
- debugging, validation, and build verification

## Development Workflow
1. Review the assignment requirements and app goals.
2. Set up the frontend architecture and app structure.
3. Implement core app features and state management.
4. Integrate Firebase authentication and favorites persistence.
5. Connect AniList data through a backend proxy for reliability and caching.
6. Add rate-limit handling and request retry logic.
7. Validate the app using build checks and resolve issues.
8. Prepare the project for Vercel deployment and environment configuration.

## Tech Stack
- React
- TypeScript
- Vite
- Firebase Authentication
- Firestore
- AniList GraphQL API
- Vercel Serverless Functions

## Assignment Context
This workflow document reflects work completed for the FlyRank AI Internship assignment, where AI-assisted development was used to accelerate implementation while maintaining code quality and functionality.

## Notes
- The project is intended as a learning and assignment-focused application.
- Deployment and environment configuration were designed to support Vercel hosting.
- The AniList backend proxy helps reduce direct client-side calls and supports better handling of rate limits.
