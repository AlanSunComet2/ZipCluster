# Use Case to HTML Mockup Mapping Document
This document outlines how each of the 15 created HTML wireframes satisfies the use cases specified in the `Cpts489_mid_submission.pdf` requirement document.

## User (Buyer/Seller) Screens

| HTML Wireframe | Associated Use Case | Description |
| :--- | :--- | :--- |
| `index.html` | General Discovery | Landing page linking users to search or registration. |
| `login_register.html` | **UC-007 (Registration and Login processing)** | Allows users to create a Buyer or Agent account, or login to an existing one. |
| `search_properties.html` | **UC-008 (Search and Filter properties)** | Main interface for searching cities/ZIPs and applying filters (Price, Beds, Baths). Features an interactive map placeholder. |
| `property_details.html` | **UC-009 (View Property Details)** | The comprehensive detail view of a listing, showing image galleries, specs, facts, and agent contact info. |
| `saved_properties.html` | UC-008 (Alt Flow 2: Save Property Listing) | The UI where favorited properties are stored for the user to review later. |
| `contact_agent.html` | US-009 (Action: Contact Agent) | The form triggering an inquiry about a specific listing directly to the hosting agent. |

## Real Estate Agent Screens

| HTML Wireframe | Associated Use Case | Description |
| :--- | :--- | :--- |
| `agent_dashboard.html` | Agent Overview | High-level summary of agent statistics (views, inquiries, total sold volume). |
| `agent_profile_edit.html` | **US-001 (Register & Manage Agent Profile)** | UI allowing an approved agent to update their bio, contact information, profile photo, and upload license documents. |
| `agent_public_profile.html` | Public Agent Info | The public-facing view where buyers can read the agent's bio and view all of their active listings. |
| `my_listings.html` | Agent Listing Management | Data table displaying all properties the agent has submitted, alongside their status (Active, Pending, Sold). |
| `create_listing.html` | **US-002 (Create Property Listing)** | Detailed form for agents to enter property details, upload media, set the status, and submit a new listing for review. |
| `edit_listing.html` | **US-003 (Edit / Delete Property Listing)** | Form to modify pricing, description, media, or change the status of an existing property listing. |

## Admin Screens

| HTML Wireframe | Associated Use Case | Description |
| :--- | :--- | :--- |
| `admin_dashboard.html` | Admin Overview | System-wide statistics showing total active listings, registered users, and active alerts. |
| `admin_approve_agents.html` | US-001 (Post-condition: Mod Approval) | The interface where admins review submitted agent license documents and approve/reject their applications. |
| `admin_manage_users.html` | User Management | Moderation table for all roles on the platform, allowing admins to view, suspend, or delete accounts. |
