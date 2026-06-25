# CivicLens AI - Project Description

## Problem Statement Selected

**Problem Statement 2: Community Hero - Hyperlocal Problem Solver**

Communities face recurring issues such as potholes, water leakages, damaged streetlights, waste mismanagement, and unsafe public infrastructure. Reporting is fragmented, hard to track, and often lacks transparency.

## Solution Overview

CivicLens AI is an AI-powered hyperlocal civic issue reporting and resolution platform. Citizens can upload a photo of a local issue, add location context, and receive an AI-generated civic case that is ready for public tracking and official routing.

The platform uses Gemini to classify the issue, estimate severity, identify the likely responsible department, detect duplicate risk, explain the reasoning, and recommend next actions. Community members can confirm reports, helping urgent and widely experienced problems rise in priority.

## Key Features

- Image-based civic issue reporting.
- Gemini-powered issue categorization and severity scoring.
- Responsible department recommendation.
- Duplicate-risk estimation using existing report context.
- Community confirmation and verification flow.
- Transparent issue status tracker.
- Impact dashboard showing open cases, high-priority cases, confirmations, resolved cases, category split, and issue density.
- Demo mode for reliable evaluation even without an API key.

## Technologies Used

- HTML, CSS, and JavaScript.
- Browser local storage for prototype persistence.
- Gemini API for AI analysis.
- Google AI Studio Build Mode for app development and deployment.

## Google Technologies Utilized

- **Google AI Studio**: Core build and deployment environment for the hackathon submission.
- **Gemini API**: Multimodal reasoning over citizen-uploaded images and text.
- **Structured output generation**: Gemini returns JSON fields that power the app's triage workflow.
- **Google Cloud Run via AI Studio deployment**: AI Studio publishing provides the live deployed app URL.

## Why It Matters

CivicLens AI improves the civic reporting loop by reducing friction for citizens and increasing transparency for communities. Instead of submitting unstructured complaints that disappear into fragmented channels, citizens get a public, prioritized, and explainable case that can be validated and tracked.

## Agentic Depth

The AI acts as a civic triage agent. It does more than answer questions:

- Interprets photo and text evidence.
- Reasons about urgency, public safety, and impact.
- Routes the case to a likely owner.
- Checks for duplicate risk against existing reports.
- Produces next actions for officials and volunteers.
- Converts a citizen complaint into an operational civic case.
