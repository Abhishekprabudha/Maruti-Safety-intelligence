# Maruti India IMS Safety Intelligence Command Center — AIonOS Static Demo

A GitHub Pages-ready demo tailored to the Maruti India safety/compliance narrative:

- AI-driven near-miss prediction from plant video and zone telemetry
- Uploaded plant movement video embedded with live AI overlays
- Automated incident documentation with event timeline, evidence pack and CAPA queue
- Cross-site compliance tracker for Gurgaon, Manesar and Gujarat expansion workflows
- BNVSAP / Bharat NCAP readiness, AIS traceability and DPDP-safe evidence controls
- Safety Copilot with RAG-style answers from synthetic IMS knowledge
- Export/import JSON so the entire scenario is reproducible with no backend

> Important: This is synthetic demo data and a consultative reference implementation. It does not contain Maruti operational data and should not be treated as legal/EHS advice.

## How to run locally

The app fetches `data/demo-data.json`, so run through a static server.

### Option 1: Python static server

```bash
cd Maruti-IMS-Safety-Demo
python -m http.server 8080
```

Open:

```text
http://localhost:8080
```

### Option 2: Vite dev server

```bash
npm install
npm run dev
```

## How to deploy on GitHub Pages using the web UI

1. Create a new GitHub repository.
2. Upload all files and folders from this repo zip to the repository root.
3. Go to **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Select branch: `main`; folder: `/root`.
6. Wait for GitHub Pages to publish and open the generated URL.

## Demo storyline

1. Start plant video monitoring across Maruti-style material movement zones.
2. Video AI flags a predicted human-vehicle proximity near miss.
3. Risk Agent correlates aisle congestion, PPE confidence, dwell time and shift context.
4. Documentation Agent drafts an incident pack with video evidence and timeline.
5. Compliance Agent maps the event to BNVSAP/Bharat NCAP readiness, AIS traceability and DPDP-safe controls.
6. Cross-site tracker assigns CAPA owners across Gurgaon, Manesar and Gujarat.
7. IMS Supervisor Agent publishes the audit-ready review queue.

## File structure

```text
Maruti-IMS-Safety-Demo/
  index.html
  styles.css
  app.js
  package.json
  data/
    demo-data.json
  assets/
    maruti_plant_safety_feed.mp4
  docs/
    demo-script.md
```

## What to show in a client demo

- Open with the cross-site KPI tiles and plant cards.
- Press **Start Maruti safety scenario**.
- Let the video run and point out the AI overlays on human path, vehicle lane, active material aisle and predicted conflict.
- Click **Generate incident pack** to show automated documentation.
- Use the **Safety Copilot** prompts, especially “How does DPDP affect incident reporting?”
- End with the compliance tracker and DPDP-safe evidence vault.

