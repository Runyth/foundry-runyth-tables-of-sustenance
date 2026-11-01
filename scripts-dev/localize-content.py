# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import json, pathlib, re
ROOT=pathlib.Path(__file__).resolve().parents[1]
MID='runyth-tables-of-sustenance'

def tr_map(value, mapping):
    if isinstance(value,list): return ', '.join(mapping.get(v,v) for v in value)
    return mapping.get(value,value)

ingredients={
'acorn flour':'Eichelmehl','almond':'Mandel','barley':'Gerste','bean':'Bohne','black bean':'schwarze Bohne','black bread':'Schwarzbrot','black tea':'Schwarztee','brown bread':'Graubrot','butter':'Butter','cabbage':'Kohl','cane syrup':'Rohrzuckersirup','carrot':'Karotte','chestnut':'Kastanie','coconut':'Kokosnuss','dark ale':'Dunkelbier','date':'Dattel','dried apple':'getrockneter Apfel','dried pea':'getrocknete Erbse','elderberry':'Holunderbeere','fig':'Feige','flatbread':'Fladenbrot','goat':'Ziegenfleisch','goat milk':'Ziegenmilch','hardtack':'Hartkeks','hazelnut':'Haselnuss','herring':'Hering','juniper':'Wacholder','lentil':'Linse','lime':'Limette','mushroom':'Pilz','mussel':'Muschel','mustard':'Senf','mustard seed':'Senfsaat','oat':'Hafer','octopus':'Oktopus','onion':'Zwiebel','pear':'Birne','pepper seed':'Pfeffersaat','plantain':'Kochbanane','potato':'Kartoffel','rendered fat':'ausgelassenes Fett','restricted finishing stock':'beschränkter Abschlusssud','river crab':'Flusskrebs','river trout':'Flussforelle','rye':'Roggen','sage':'Salbei','salt bush':'Salzstrauch','sea-kale':'Meerkohl','seaweed':'Seetang','soft cheese':'Weichkäse','sorrel':'Sauerampfer','spruce tip':'Fichtenspitze','trout':'Forelle','unique legendary source':'einzigartige legendäre Quelle','venison':'Wildbret','white bean':'weiße Bohne','wild garlic':'Bärlauch','wild onion':'Wildzwiebel'}
method={
'air-dried':'luftgetrocknet','baked under coals':'unter Kohlen gebacken','berry-cured':'in Beeren gebeizt','boiled':'gekocht','braised':'geschmort','butter-basted':'mit Butter begossen','cellar-cured':'kellergereift','char-grilled':'über Glut gegrillt','charred':'angeröstet','cider-braised':'in Apfelwein geschmort','clarified':'geklärt','clay-pot cooked':'im Tontopf gegart','coconut-braised':'in Kokos geschmort','compressed':'gepresst','cultured':'kultiviert','dew-steeped':'in Tau gezogen','double-baked':'doppelt gebacken','dried':'getrocknet','earth-oven cooked':'im Erdofen gegart','fat-sealed':'in Fett versiegelt','fermented':'fermentiert','fine-milled':'fein gemahlen','foraged':'gesammelt','glazed':'glasiert','griddled':'auf der Platte gebacken','herb-wrapped':'in Kräuter gewickelt','honeyed':'mit Honig verfeinert','infused':'ausgezogen','iron-griddled':'auf Eisen gebacken','kettle-boiled':'im Kessel gekocht','layered':'geschichtet','leaf-baked':'im Blatt gebacken','lime-cured':'mit Limette gebeizt','malted':'gemälzt','masterwork service':'als Meistermahl zubereitet','mortar-ground':'im Mörser gemahlen','mustard-crusted':'mit Senfkruste','pan-seared':'in der Pfanne scharf angebraten','pickled':'eingelegt','pit-baked':'in der Grube gebacken','pot-roasted':'im Topf gebraten','pressed':'gepresst','pressure-stewed':'unter Druck geschmort','rationed':'rationiert','reconstituted':'wiederaufbereitet','reef-smoked':'über Riffholz geräuchert','resin-smoked':'über Harz geräuchert','river-smoked':'am Fluss geräuchert','salt-cured':'salzgebeizt','salt-fermented':'salzfermentiert','salted':'gesalzen','sand-baked':'im Sand gebacken','slow-baked':'langsam gebacken','smoked':'geräuchert','spice-rubbed':'mit Gewürzen eingerieben','steam-cooked':'dampfgegart','steam-wrapped':'im Dampfwickel gegart','stewed':'geschmort','stone-griddled':'auf Stein gebacken','stone-ground':'steingemahlen','stone-simmered':'auf Stein geköchelt','stuffed':'gefüllt','sun-dried':'sonnengetrocknet','syrup-preserved':'in Sirup konserviert','unique':'einzigartig','water-sparing':'wassersparend','wax-sealed':'wachsversiegelt','wine-poached':'in Wein pochiert'}
venues={'homes':'Haushalten','roadside inns':'Straßenherbergen','taverns':'Tavernen','dockside kitchens':'Hafenküchen','markets':'Märkten','bakeries':'Bäckereien','monasteries':'Klöstern','military camps':'Militärlagern','guard barracks':'Wachkasernen','noble households':'Adelshaushalten','Imperial offices':'imperialen Ämtern','ships':'Schiffen','farms':'Höfen','mines':'Minen','forests':'Wäldern','hunting camps':'Jagdlagern','festivals':'Festen','funerals':'Begräbnissen','religious ceremonies':'religiösen Zeremonien','illicit kitchens':'illegalen Küchen','alchemical laboratories':'alchemistischen Laboren','travelling caravans':'Reisekarawanen','poorhouses':'Armenhäusern','prisons':'Gefängnissen','slave and forced-labour camps':'Sklaven- und Zwangsarbeitslagern','remote settlements':'abgelegenen Siedlungen','worker kitchens':'Arbeiterküchen'}
consumers={'farmers':'Bauern','fishers':'Fischern','sailors':'Seeleuten','miners':'Bergleuten','soldiers':'Soldaten','Imperial officials':'imperialen Beamten','nobles':'Adligen','merchants':'Händlern','labourers':'Arbeitern','prisoners':'Gefangenen','hunters':'Jägern','travellers':'Reisenden','children':'Kindern','elderly people':'älteren Menschen','healers':'Heilkundigen','alchemists':'Alchemisten','magic practitioners':'Magieanwendern','specific ancestries':'bestimmten Abstammungen','specific settlements':'bestimmten Siedlungen','religious communities':'religiösen Gemeinschaften','regional factions':'regionalen Fraktionen','master cooks':'Meisterköchen','historians':'Historikern','inquisitors':'Inquisitoren'}
legality={'ordinary provision':'gewöhnlicher Proviant','lawful culinary craft':'rechtmäßiges Kochhandwerk','approved medicinal preparation':'zugelassene medizinische Zubereitung','licensed alchemical food':'lizenzierte alchemistische Nahrung','unverified folk preparation':'ungeprüfte Volkszubereitung','restricted military ration':'beschränkte Militärration','suspicious foreign dish':'verdächtige Fremdspeise','corruptive edible':'verderbliche Zaubernahrung','spirit-bound contraband':'geistgebundene Schmuggelware','classified anomaly':'klassifizierte Anomalie'}
rarity={'common':'häufig','uncommon':'ungewöhnlich','rare':'selten','very rare':'sehr selten','legendary':'legendär'}
difficulty={'simple':'einfach','trained':'geübt','expert':'fachkundig','masterwork':'meisterlich','legendary':'legendär'}
temp={'hot':'heiß','room temperature':'bei Raumtemperatur','provenance-specific':'herkunftsgebunden'}
shelf={'same day':'am selben Tag','2 days':'2 Tage','1 week':'1 Woche','1 month':'1 Monat','one season':'eine Jahreszeit','6 hours':'6 Stunden','provenance-specific':'herkunftsgebunden'}
season={'all year':'ganzjährig','spring':'Frühling','summer':'Sommer','autumn':'Herbst','winter':'Winter','unique event':'einmaliges Ereignis'}
social={'poor':'arm','working':'arbeitend','merchant':'kaufmännisch','noble':'adlig','military':'militärisch','religious':'religiös','legendary':'legendär'}
name_tokens={
'Salted':'Gesalzener','Sun-Dried':'Sonnengetrockneter','Dried':'Getrockneter','Smoked':'Geräucherter','Stewed':'Geschmorter','Baked':'Gebackener','Fortified':'Stärkender','Master-Cook’s':'Meisterkoch-','Master-Cooks':'Meisterkoch-','Herring':'Hering','Loaf':'Laib','Hazelnut':'Haselnuss','Broth':'Brühe','Bean':'Bohnen','Dumpling':'Kloß','River Crab':'Flusskrebs','Bowl':'Schale','Wild Garlic':'Bärlauch','Pottage':'Eintopf','Hardtack':'Hartkeks','Pickle':'Eingelegtes','Cabbage':'Kohl','Roll':'Rolle','Trout':'Forellen','Custard':'Auflauf','Goat':'Ziegen','Ale':'Bier','Black Bean':'Schwarzbohnen','Filled Bun':'gefülltes Brötchen','Tea':'Tee','Salad':'Salat','Ration Brick':'Rationsblock','Supper':'Abendmahl','Banquet':'Bankett','Vigil':'Nachtwache','Course':'Gang','Feast':'Festmahl','Pear':'Birne','Oyster':'Auster','Marrow Pearl':'Markperle','Grain':'Korn','Preserve':'Konfitüre','Honey':'Honig','Root':'Wurzel','Last Loaf':'Letzter Laib'}
legend_names={
'Heartseed of the Unbroken Green':'Herzsamen des Ungebrochenen Grüns','Ashen Moon Pear':'Aschmondbirne','Salt-Crown Oyster':'Salzkronenauster','Bellroot of the Silent Physician':'Glockenwurzel des Schweigenden Arztes','Starfall Grain':'Sternfallkorn','Last Loaf of Saint Othmar':'Letzter Laib des Heiligen Othmar','Emberhorn Marrow Pearl':'Gluthorn-Markperle','Memoryless Plum Preserve':'Erinnerungslose Pflaumenkonfitüre','Gravewinter Tea':'Grabwintertee','Black Glass Honey':'Schwarzglashonig'}

def translate_name(name):
    if name in legend_names:return legend_names[name]
    result=name
    # longest first, keep regional proper nouns
    for a,b in sorted(name_tokens.items(), key=lambda kv:-len(kv[0])):
        result=result.replace(a,b)
    return re.sub(r'\s+',' ',result).replace(' -','-').strip()

def german_description(item):
    flags=item['flags'][MID]; m=flags['meta']; mech=flags['mechanics']
    ing=tr_map(m.get('ingredients',[]),ingredients)
    ven=tr_map(m.get('typicalVenue',[]),venues) or 'besonderen Fundorten'
    usual=tr_map(m.get('usualConsumers',[]),consumers) or 'keiner gewöhnlichen Verbrauchergruppe'
    pref=tr_map(m.get('preferredConsumers',[]),consumers) or 'Kennern und Sammlern'
    seasons=tr_map(m.get('season',[]),season)
    social_de=tr_map(m.get('socialClass',[]),social)
    status=legality.get(m.get('legality'),m.get('legality'))
    overview=f"Die Speise verbindet {ing} mit der für {m.get('originSettlement')} typischen Zubereitung „{method.get(m.get('preparationMethod'),m.get('preparationMethod'))}“. Geschmack und Textur bleiben bodenständig und von den verfügbaren Vorräten geprägt."
    origin=f"Sie ist eng mit {m.get('originSettlement')} in der Region {m.get('originRegion')} sowie mit der Kultur {m.get('culture')} verbunden."
    availability=f"Gewöhnlich ist sie in {ven} zu finden. Ihre Seltenheit gilt als {rarity.get(m.get('rarity'),m.get('rarity'))}; die beste Verfügbarkeit besteht während {seasons}."
    typical=f"Sie wird meist von {usual} gegessen. Besonders geschätzt wird sie von {pref}, weil Preis, Haltbarkeit, Geschmack oder gesellschaftliche Bedeutung zu deren Alltag passen."
    preparation=f"Benötigt werden {ing}. Die Zubereitung gilt als {difficulty.get(m.get('preparationDifficulty'),m.get('preparationDifficulty'))}, dauert {m.get('preparationTime')} und wird {temp.get(m.get('servingTemperature'),m.get('servingTemperature'))} serviert. Die erwartete Haltbarkeit beträgt {shelf.get(m.get('shelfLife'),m.get('shelfLife'))}."
    cultural=f"Innerhalb von {m.get('culture')} steht die Speise vor allem für eine {social_de}e Lebenslage. Außerhalb ihres üblichen Umfelds kann sie als Gastfreundschaft, Sparsamkeit, Erinnerung, Standeszeichen oder bewusste Kränkung verstanden werden."
    mechanics=mech.get('summaryDe') or mech.get('summary')
    dur='dauerhaft' if mech.get('durationSeconds') is None else f"{mech.get('durationSeconds',0)} Sekunden"
    cd='keine' if not mech.get('cooldownSeconds') else f"{mech.get('cooldownSeconds')} Sekunden"
    consumption=f"Eine Portion wird als Aktion oder im Rahmen einer Rast verzehrt. Effektdauer: {dur}. Abklingzeit: {cd}. Stapelung und Einschränkungen folgen den Welteinstellungen und den stabilen Effektkennungen."
    imperial=f"Imperiale Einstufung: {status}. Kontrollen prüfen Herkunft, Wiederholbarkeit, Lizenzierung und mögliche Grenzüberschreitungen von Körper, Identität, Erinnerung, Tod, Traum, Blut oder Geist."
    gm="Zutaten können durch regional gleichwertige Vorräte ersetzt werden. Fälschungen verwenden meist billigere Grundnahrung, gefärbte Garnitur oder Gewürze, die Verderb verbergen."
    if m.get('tier')=='S':
        overview='Ein essbares Relikt mit unauffälligem Äußeren, das leicht für konservierte Früchte, Ritualbrot oder eine seltene Heilzubereitung gehalten werden kann.'
        origin=f"Die überlieferte Herkunft weist auf {m.get('provenance')} hin. Legende: {m.get('legend')}"
        availability='Es wird niemals gewöhnlich verkauft oder zufällig verteilt. Es kann nur durch eine einzigartige Expedition, Erbschaft, heilige Pflicht, klassifizierte Akte oder unmögliche Ernte entdeckt werden.'
        typical='Es besitzt keine gewöhnliche Verbrauchergruppe. Schon der Besitz zieht Gelehrte, Beamte, Kulte, Schmuggler und Personen an, die seine Existenz bestreiten.'
        preparation='Es verlangt die genaue, herkunftsgebundene Vorbereitung. Ersatz vernichtet die legendäre Eigenschaft und lässt nur gewöhnliche Nahrung zurück.'
        cultural='Der Verzehr verändert dauerhaft, wie mindestens eine Gemeinschaft, Institution oder übernatürliche Zeugin den Essenden wahrnimmt.'
        mechanics='Bis zur Identifizierung oder zum Verzehr verborgen.'
        consumption='Der Vorteil ist dauerhaft und kann von derselben Kreatur nur einmal erlangt werden. Ein doppelter Verzehr wird blockiert und verbraucht den Gegenstand nicht, außer die Spielleitung übersteuert dies ausdrücklich. Der Vorteil stapelt sich nicht mit sich selbst.'
        imperial='Imperiale Einstufung: klassifizierte Anomalie. Unbefugter Besitz, Transport, Kopie oder öffentliche Beschreibung kann Beschlagnahmung und Untersuchung auslösen.'
        gm=f"Tatsächlicher Vorteil: {mech.get('summaryDe') or mech.get('summary')} Entdeckungsbedingung: {m.get('discoveryConditions')} Kampagnenhinweis: als einmalige erzählerische Belohnung über viele Sitzungen behandeln, nicht als erwarteten Fortschritt."
    sections=[('Überblick',overview),('Herkunft',origin),('Verfügbarkeit',availability),('Typische Verbraucher',typical),('Zubereitung',preparation),('Kulturelle Bedeutung',cultural),('Mechanischer Effekt',mechanics),('Verzehr und Abklingzeit',consumption),('Imperialer Status',imperial)]
    html=''.join(f'<h3>{h}</h3><p>{p}</p>' for h,p in sections)
    html+=f'<section class="secret"><h3>SL-Hinweise</h3><p>{gm}</p></section>'
    return html

foods=json.loads((ROOT/'data/foods.json').read_text())
for item in foods:
    loc=item['flags'][MID].setdefault('localizations',{}).setdefault('de',{})
    loc['name']=translate_name(item['name'])
    loc['description']=german_description(item)
(ROOT/'data/foods.json').write_text(json.dumps(foods,ensure_ascii=False,indent=2)+'\n')
for item in foods:
    slug=next(ROOT.joinpath('packs-src/foods').glob(f"*-{item['_id']}.json"),None)
    if slug: slug.write_text(json.dumps(item,ensure_ascii=False,indent=2)+'\n')

# Add complete German recipe localization.
recipes=json.loads((ROOT/'data/recipes.json').read_text())
food_by_source={x['flags'][MID]['sourceId']:x for x in foods}
for recipe in recipes:
    f=food_by_source.get(recipe['flags'][MID]['foodSourceId'])
    req=recipe['flags'][MID]['requirements']
    food_name=f['flags'][MID]['localizations']['de']['name'] if f else recipe['name'].removeprefix('Recipe: ')
    ing=tr_map(req.get('ingredients',[]),ingredients)
    difficulty_de=difficulty.get(req.get('difficulty'),req.get('difficulty'))
    content=(f'<h2>{food_name}</h2><p><strong>Zutaten:</strong> {ing}</p>'
             f'<p><strong>Werkzeuge:</strong> Kochutensilien und eine regional geeignete Hitzequelle.</p>'
             f'<p><strong>Zeit:</strong> {req.get("time")}</p><p><strong>Schwierigkeit:</strong> {difficulty_de}</p>'
             f'<p><strong>Fehlschlag:</strong> Die Zutaten werden verbraucht; das Ergebnis wird zu einer verdorbenen Tier-1-Ration ohne Vorteil.</p>'
             f'<p><strong>Teilerfolg:</strong> Halbe Ausbeute, kein mechanischer Effekt, aber sicher essbar.</p>')
    recipe['flags'][MID].setdefault('localizations',{})['de']={'name':f'Rezept: {food_name}','pageName':'Rezept','content':content}
(ROOT/'data/recipes.json').write_text(json.dumps(recipes,ensure_ascii=False,indent=2)+'\n')
for recipe in recipes:
    slug=next(ROOT.joinpath('packs-src/recipes').glob(f"*-{recipe['_id']}.json"),None)
    if slug: slug.write_text(json.dumps(recipe,ensure_ascii=False,indent=2)+'\n')

# Repair the regional tavern table and add German localizations to all tables.
tables=json.loads((ROOT/'data/tables.json').read_text())
tavern=next(t for t in tables if t['flags'][MID]['sourceId']=='table.regional-tavern')
choices=[x for x in foods if any(v in ['roadside inns','dockside kitchens','markets'] for v in x['flags'][MID]['meta'].get('typicalVenue',[])) and x['flags'][MID]['meta']['tier'] in ['1','2']][:20]
tavern['results']=[]
for i,x in enumerate(choices,1):
    tavern['results'].append({'_id':f'TavernResult{i:04d}'[-16:].rjust(16,'0'),'type':'text','weight':1,'range':[i,i],'drawn':False,'description':x['name'],'name':'','img':x['img'],'documentUuid':None,'flags':{MID:{'tierSDirectResult':False,'foodSourceId':x['flags'][MID]['sourceId']}}})
tavern['formula']=f'1d{len(choices)}'
table_names={'Regional Tavern Meals':'Regionale Tavernenmahlzeiten','Poor Household Meals':'Mahlzeiten armer Haushalte','Common Travelling Provisions':'Gewöhnlicher Reiseproviant','Market Food':'Marktspeisen','Military Rations':'Militärrationen','Seasonal Dishes':'Saisonale Speisen','Spoiled Food':'Verdorbene Nahrung','Counterfeit Luxury Food':'Gefälschte Luxusspeisen','Unusual Ingredients':'Ungewöhnliche Zutaten','Illicit Cuisine':'Illegale Küche','Culinary Rumours':'Kulinarische Gerüchte','Legendary Food Clues':'Hinweise auf legendäre Nahrung'}
for table in tables:
    table['flags'][MID].setdefault('localizations',{})['de']={'name':table_names.get(table['name'],table['name']),'description':f'Nahrungstabelle: {table_names.get(table["name"],table["name"])}.'}
(ROOT/'data/tables.json').write_text(json.dumps(tables,ensure_ascii=False,indent=2)+'\n')
for table in tables:
    slug=next(ROOT.joinpath('packs-src/tables').glob(f"*-{table['_id']}.json"),None)
    if slug: slug.write_text(json.dumps(table,ensure_ascii=False,indent=2)+'\n')
print('Localized foods, recipes, tables; repaired tavern table:',len(choices))
