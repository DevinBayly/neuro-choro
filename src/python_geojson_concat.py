import json
import os

os.chdir("./GeoJson_HCP-MMP1")

total = {}
for geofile in os.listdir("./"):
    print(geofile)
    if ".geojson" in geofile:
        with open(geofile,"r") as phile:
            ##remove the newlines and whitespaces from the whole document, to try to shave off some size
            total[geofile] = json.loads(phile.read().replace("\n","").replace("\t",""))

with open("total_small_parsed.json","w") as phile:
    phile.write(json.dumps(total))