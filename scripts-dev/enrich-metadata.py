from __future__ import annotations

import csv
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MID = "runyth-tables-of-sustenance"
foods_path = ROOT / "data" / "foods.json"
foods = json.loads(foods_path.read_text(encoding="utf-8"))

VENUE_RULES = {
    "taverns": lambda m: m["originRegion"] in {"Velia Coast", "Heidel Riverlands", "Calpheon Basin"},
    "ships": lambda m: m["originRegion"] in {"Velia Coast", "Distant Coasts"},
    "farms": lambda m: m["originRegion"] in {"Olvia Orchard Country", "Heidel Riverlands"},
    "mines": lambda m: m["originRegion"] == "Northern Mineholds",
    "forests": lambda m: m["originRegion"] in {"Evergreen Marches", "Florin Herbal Vale"},
    "hunting camps": lambda m: m["originRegion"] in {"Evergreen Marches", "Florin Herbal Vale", "Black Desert Frontier"},
    "funerals": lambda m: m["tier"] in {"1", "2", "3"},
    "illicit kitchens": lambda m: m["tier"] in {"2", "3", "4"} and m["legality"] != "ordinary provision",
    "alchemical laboratories": lambda m: m["originRegion"] == "Florin Herbal Vale" or m["nature"] == "alchemical",
    "slave and forced-labour camps": lambda m: m["originRegion"] in {"Imperial Roads", "Northern Mineholds", "Black Desert Frontier"} and m["tier"] in {"1", "2"},
}

CONSUMER_RULES = {
    "farmers": lambda m: m["originRegion"] in {"Olvia Orchard Country", "Heidel Riverlands"},
    "miners": lambda m: m["originRegion"] == "Northern Mineholds",
    "prisoners": lambda m: "prisons" in m["typicalVenue"] or "slave and forced-labour camps" in m["typicalVenue"],
    "hunters": lambda m: m["originRegion"] in {"Evergreen Marches", "Florin Herbal Vale", "Black Desert Frontier"},
    "healers": lambda m: m["nature"] == "medicinal" or m["originRegion"] == "Florin Herbal Vale",
    "alchemists": lambda m: m["nature"] == "alchemical" or "alchemical laboratories" in m["typicalVenue"],
    "magic practitioners": lambda m: m["nature"] == "magical" or m["tier"] == "S",
    "religious communities": lambda m: "religious ceremonies" in m["typicalVenue"] or "monasteries" in m["typicalVenue"],
    "regional factions": lambda m: bool(m.get("factionAssociation")),
}

# Add combinations with deterministic spacing so metadata remains searchable without
# turning every entry into an undifferentiated bag of tags.
for venue_index, (venue, predicate) in enumerate(VENUE_RULES.items()):
    candidates = [food for food in foods if predicate(food["flags"][MID]["meta"])]
    for offset, food in enumerate(candidates):
        if offset % 5 == venue_index % 5:
            values = food["flags"][MID]["meta"].setdefault("typicalVenue", [])
            if venue not in values:
                values.append(venue)

for consumer_index, (consumer, predicate) in enumerate(CONSUMER_RULES.items()):
    candidates = [food for food in foods if predicate(food["flags"][MID]["meta"])]
    for offset, food in enumerate(candidates):
        if offset % 4 == consumer_index % 4:
            meta = food["flags"][MID]["meta"]
            key = "preferredConsumers" if consumer in {"magic practitioners", "healers", "alchemists", "religious communities", "regional factions"} else "usualConsumers"
            values = meta.setdefault(key, [])
            if consumer not in values:
                values.append(consumer)
            professions = meta.setdefault("professionAssociation", [])
            if consumer in {"farmers", "miners", "hunters", "healers", "alchemists", "magic practitioners"} and consumer not in professions:
                professions.append(consumer)

# Rebuild dietary tags deterministically from ingredients and alcohol metadata.
fish_ingredients = {"herring", "mussel", "river crab", "river trout", "trout", "octopus", "seaweed"}
meat_ingredients = {"goat", "venison"}
dairy_ingredients = {"butter", "soft cheese", "goat milk"}
nut_ingredients = {"almond", "hazelnut", "chestnut"}
gluten_ingredients = {"barley", "black bread", "brown bread", "flatbread", "hardtack", "oat", "rye"}
medicinal_ingredients = {"elderberry", "juniper", "sage", "sorrel", "spruce tip", "wild garlic"}
for food in foods:
    meta = food["flags"][MID]["meta"]
    ingredients = set(meta.get("ingredients", []))
    if meta.get("tier") == "S":
        meta["dietaryProperties"] = ["unknown until identified"]
        continue
    tags: list[str] = []
    if ingredients & fish_ingredients:
        tags.append("contains fish")
    if ingredients & meat_ingredients:
        tags.append("contains meat")
    if ingredients & dairy_ingredients:
        tags.append("dairy")
    if ingredients & nut_ingredients:
        tags.append("nut")
    if ingredients & gluten_ingredients:
        tags.append("gluten")
    if ingredients & medicinal_ingredients or meta.get("nature") == "medicinal":
        tags.append("medicinal herb")
    if meta.get("alcoholic"):
        tags.append("alcohol")
    if not (ingredients & fish_ingredients or ingredients & meat_ingredients):
        tags.append("vegetarian")
    meta["dietaryProperties"] = tags

foods_path.write_text(json.dumps(foods, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
for food in foods:
    matches = list((ROOT / "packs-src" / "foods").glob(f"*-{food['_id']}.json"))
    if matches:
        matches[0].write_text(json.dumps(food, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

# Rebuild searchable counts over every metadata value, not only primary values.
def count_scalar(key: str) -> Counter:
    return Counter(food["flags"][MID]["meta"].get(key) for food in foods)

def count_array(*keys: str) -> Counter:
    counter: Counter = Counter()
    for food in foods:
        meta = food["flags"][MID]["meta"]
        values: list[str] = []
        for key in keys:
            values.extend(meta.get(key, []))
        counter.update(set(values))
    return counter

counts = {
    "tier": count_scalar("tier"),
    "region": count_scalar("originRegion"),
    "venue": count_array("typicalVenue"),
    "consumer": count_array("usualConsumers", "preferredConsumers"),
    "culture": count_scalar("culture"),
    "legality": count_scalar("legality"),
}
index_path = ROOT / "data" / "content-index.json"
index = json.loads(index_path.read_text(encoding="utf-8"))
index["counts"] = {key: dict(sorted(counter.items(), key=lambda pair: (-pair[1], pair[0]))) for key, counter in counts.items()}
index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

report_path = ROOT / "docs" / "reports" / "compendium-counts.md"
lines = [
    "# Compendium Counts", "", f"Total foods: **{len(foods)}**", f"Total recipes: **{index['totalRecipes']}**",
    f"Total roll tables: **{index['totalTables']}**", ""
]
for label, key in [("Tier", "tier"), ("Region", "region"), ("Venue", "venue"), ("Consumer Category", "consumer")]:
    lines.extend([f"## By {label}", "", "| Value | Count |", "|---|---:|"])
    lines.extend(f"| {value} | {count} |" for value, count in index["counts"][key].items())
    lines.append("")
report_path.write_text("\n".join(lines), encoding="utf-8")

catalogue_path = ROOT / "docs" / "reports" / "content-catalogue.csv"
with catalogue_path.open("w", encoding="utf-8", newline="") as handle:
    fields = ["source_id", "name", "tier", "region", "settlement", "culture", "factions", "venues", "usual_consumers", "preferred_consumers", "social_class", "price_category", "rarity", "legality", "meal_type", "nature", "ingredients", "effect", "duration_seconds", "cooldown_seconds", "servings", "image"]
    writer = csv.DictWriter(handle, fieldnames=fields)
    writer.writeheader()
    for food in foods:
        flags = food["flags"][MID]
        meta = flags["meta"]
        mechanics = flags["mechanics"]
        writer.writerow({
            "source_id": flags["sourceId"], "name": food["name"], "tier": meta["tier"], "region": meta["originRegion"],
            "settlement": meta["originSettlement"], "culture": meta["culture"], "factions": ";".join(meta.get("factionAssociation", [])),
            "venues": ";".join(meta.get("typicalVenue", [])), "usual_consumers": ";".join(meta.get("usualConsumers", [])),
            "preferred_consumers": ";".join(meta.get("preferredConsumers", [])), "social_class": ";".join(meta.get("socialClass", [])),
            "price_category": meta["priceCategory"], "rarity": meta["rarity"], "legality": meta["legality"],
            "meal_type": ";".join(meta.get("mealType", [])), "nature": meta["nature"], "ingredients": ";".join(meta.get("ingredients", [])),
            "effect": mechanics["summary"], "duration_seconds": mechanics.get("durationSeconds"), "cooldown_seconds": mechanics.get("cooldownSeconds"),
            "servings": meta["servings"], "image": food["img"]
        })

print(f"Enriched metadata across {len(foods)} foods and rebuilt counts/catalogue reports.")
