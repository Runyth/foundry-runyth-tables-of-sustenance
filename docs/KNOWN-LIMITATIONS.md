# runyth-tables-of-sustenance-1.1.1

## Known Limitations

1. System-neutral content cannot be made into a valid inventory Item without knowing the active system's Item schema; install an adapter for that operation.
2. Very narrow narrative bonuses may require an adapter-specific priming workflow because many systems cannot infer the narrative source of a roll.
3. Cross-system transfer of already-materialised Item Documents is blocked; transfer neutral content/settings and rematerialise in the destination system instead.
4. Live Foundry acceptance testing is not available in the build environment; static/unit validation and a manual v13 matrix are supplied.
5. Tier S placement remains a GM narrative decision and is excluded from ordinary generation unless explicitly enabled.
