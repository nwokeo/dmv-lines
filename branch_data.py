#using DMV master file (officeDataFile), cache pertinent information to branch_data.json
#only needs to be run periodically in case branch data changes

import os
import json

officeDataFile = 'foims_offices_min.json'
branchData = []

def getOffices():
    f = open(officeDataFile)
    data = json.loads(f.read())['foims_offices']['offices']
    for office in data:
        branchData.append({'id':office['number'], 'name':office['name'], 'address':office['address'], 'coords': [office['latitude'], office['longitude']], 'officeHours':office['officeHours'] })
    #print branchData
    with open('branch_data.json', 'w') as fp:
        json.dump(branchData, fp)
    f.close()
    fp.close()
    
getOffices()