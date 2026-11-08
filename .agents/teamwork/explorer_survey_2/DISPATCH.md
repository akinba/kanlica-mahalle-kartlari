# DISPATCH — explorer_survey_2

## Objective
Survey the functional requirements and domain model for the Kocaeli Kandıra Mahalle Kartları web application.
1. Read `/home/antigravity/akinba/kanlica-mahalle-kartlari/.agents/teamwork/ORIGINAL_REQUEST.md` and `/home/antigravity/agents.md`.
2. Enumerate key neighborhoods (mahalleler) of Kandıra district in Kocaeli (e.g., Akdurak, Aydınlık, Çarşı, Orhan, Akçakese, Kefken, Kerpe/Kıncıllı, Cebeci, Bağırganlı, Babalı, Sarısu, Seyrek, Kandıra merkez & rural mahalleler) with realistic coordinates around Kandıra (lat ~41.07°N, lng ~30.15°E to Black Sea coast ~41.18°N) and realistic demographic/socioeconomic profiles.
3. Define detailed data schemas and UI requirements for:
   - 5-year population changes (2020-2024 or 2021-2025 total population, growth rate, age distribution, migration/seasonal effects)
   - Vulnerable groups analysis (elderly 65+, children 0-14, disabled, low-income/social assistance households, chronic illness/isolated rural households, vulnerability index & alerts)
   - Geographic land use changes (agricultural land, forest, coastal/tourism zone, residential/built-up area changes over 5 years)
   - Health, education, and infrastructure developments (family health centers/ASM, hospitals, schools, student/teacher or classroom metrics, pharmacy/ambulance access, new investments/developments)
4. Write your complete findings to `/home/antigravity/akinba/kanlica-mahalle-kartlari/.agents/teamwork/explorer_survey_2/handoff.md` and send a completion message to the orchestrator (`4180dda031afd7c85f4ed5941ae5ae6a`).

## 2026-11-08T13:52:57Z
You are `explorer_survey_2` (archetype: `teamwork_preview_explorer`, running on Gemini Flash per `agents.md`).
Your working directory is: `/home/antigravity/akinba/kanlica-mahalle-kartlari/.agents/teamwork/explorer_survey_2`
Your parent orchestrator conversation ID is: `4180dda031afd7c85f4ed5941ae5ae6a`

MANDATORY: First read `/home/antigravity/akinba/kanlica-mahalle-kartlari/.agents/teamwork/ORIGINAL_REQUEST.md`, `/home/antigravity/agents.md`, and `/home/antigravity/akinba/kanlica-mahalle-kartlari/.agents/teamwork/explorer_survey_2/DISPATCH.md`.

Your task:
1. Analyze the requirements for the Kocaeli Kandıra Mahalle Kartları web application from `ORIGINAL_REQUEST.md`.
2. Prepare a detailed domain specification for Kandıra neighborhoods (mahalleler: Akdurak, Aydınlık, Çarşı, Orhan, Yeni, Akçabeyli, Kefken, Cebeci, Kerpe/Kıncıllı, Bağırganlı, Babalı, Karaağaç, Sarısu, Seyrek, Kurtyeri, Pınarlı, etc.) with accurate geographic coordinates in Kandıra (Kocaeli) and domain indicators across all 5 required pillars:
   - 5-year population changes (2020–2024/2025 yearly trends, net change %, age cohorts, seasonal/permanent dynamics)
   - Vulnerable groups analysis (65+ elderly, 0-14 children, disabled individuals, social assistance households, isolated rural risk, composite vulnerability score & priority alerts)
   - Geographic land use changes (5-year shifts in agricultural land, forest area, residential/built-up area, coastal/tourism zone in hectares and %)
   - Health, education, and social infrastructure developments (ASM/health centers, hospital distance, schools, classroom/teacher ratios, 5-year completed & planned developments)
   - Neighborhood Card (Mahalle Kartı) UI & comparison/filtering capabilities
3. Maintain `BRIEFING.md` and `progress.md` in `/home/antigravity/akinba/kanlica-mahalle-kartlari/.agents/teamwork/explorer_survey_2/`.
4. Write your complete report to `/home/antigravity/akinba/kanlica-mahalle-kartlari/.agents/teamwork/explorer_survey_2/handoff.md` and send a completion message via `send_message` to `4180dda031afd7c85f4ed5941ae5ae6a`.
