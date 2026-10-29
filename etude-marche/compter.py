# Count active companies per trade (NAF code) in Savoie (73) and Haute-Savoie (74)
# Source: https://recherche-entreprises.api.gouv.fr (official SIRENE data, no key)
import json, time, urllib.request, csv
METIERS = {
 "43.22A": "Plomberie, installation eau et gaz", "43.22B": "Chauffage, climatisation",
 "43.21A": "Électricité", "43.32A": "Menuiserie bois et PVC", "43.32B": "Menuiserie métallique, serrurerie",
 "43.34Z": "Peinture, vitrerie", "43.31Z": "Plâtrerie", "43.33Z": "Carrelage, sols, murs",
 "43.91A": "Charpente", "43.91B": "Couverture", "43.99C": "Maçonnerie générale",
 "41.20A": "Construction de maisons individuelles", "43.12A": "Terrassement", "43.29A": "Isolation",
 "43.39Z": "Autres travaux de finition", "43.99D": "Autres travaux spécialisés (BTP)",
 "81.30Z": "Paysagiste, espaces verts", "81.21Z": "Nettoyage de bâtiments", "81.22Z": "Nettoyage spécialisé, ramonage",
 "81.29A": "Désinfection, dératisation", "45.20A": "Réparation automobile", "96.02A": "Coiffure",
 "96.02B": "Soins de beauté", "10.71C": "Boulangerie-pâtisserie", "49.32Z": "Taxi",
 "95.22Z": "Réparation électroménager", "96.04Z": "Entretien corporel (spa, massage)",
 "95.29Z": "Réparation d'autres biens (cordonnerie…)", "33.12Z": "Réparation machines", "74.20Z": "Photographie",
}
def total(naf, dep):
    url = f"https://recherche-entreprises.api.gouv.fr/search?activite_principale={naf}&departement={dep}&etat_administratif=A&per_page=1"
    for _ in range(4):
        try:
            return json.load(urllib.request.urlopen(url, timeout=20))["total_results"]
        except Exception:
            time.sleep(2)
    return None
rows = []
for naf, nom in METIERS.items():
    a, b = total(naf, "73"), total(naf, "74"); time.sleep(0.3)
    rows.append((naf, nom, a, b, (a or 0) + (b or 0)))
rows.sort(key=lambda r: -r[4])
with open("artisans-savoie.csv", "w", newline="") as f:
    w = csv.writer(f); w.writerow(["naf", "metier", "savoie_73", "haute_savoie_74", "total"]); w.writerows(rows)
for r in rows: print(f"{r[4]:>6}  73:{r[2]:>5}  74:{r[3]:>5}  {r[0]}  {r[1]}")
