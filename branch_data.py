#using DMV master file (officeDataFile), cache pertinent information to branch_data.json
#only needs to be run periodically in case branch data changes

import json
import configparser
from urllib.request import urlopen

config = configparser.ConfigParser()
config.read('dmv.cfg')

officeDataUrl = str(config['URLS']['officedata'])
branchData = []

def getOffices():
    officedata = urlopen(officeDataUrl).readlines()[0]
    offices = json.loads(officedata.decode('utf-8'))['foims_offices']['offices']

    for office in offices:
        branchData.append(
            {'id':office['number'],
               'name':office['name'],
               'address':office['address'],
               'coords': [office['latitude'], office['longitude']],
               'officeHours':office['officeHours']
             })

    with open('../resource/branch_data.json', 'w') as fp:
        json.dump(branchData, fp)
    fp.close()
    
getOffices()