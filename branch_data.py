import urllib2
import os
import json
from bs4 import BeautifulSoup

waitTimesUrl = ''
#officeDataUrl = '' 
officeDataFile = 'foims_offices_min.json'
messagesUrl = path_foims_messages = '';

branchData = []

def tomins(hhmm):
    h = hhmm.split(':')[0]
    m = hhmm.split(':')[1]
    return int(h) * 60 + int(m)
    
def getTimes():
    try:
        data = urllib2.urlopen(waitTimesUrl).readlines()[1:]
        dbData = []
        for line in data:
            try:
                dataArray = line.rstrip().rsplit(',')
                branchId = dataArray[0]
                if dataArray[1].find(':') == 1:  # convert hh:mm to mins
                    dataArray[1] = tomins(dataArray[1])
                if dataArray[2].find(':') == 1:
                    dataArray[2] = tomins(dataArray[2])
                name = getOffices(dataArray[0])[0]
                address = getOffices(dataArray[0])[1]
                #branchData.append({'id':dataArray[0], 'appt':dataArray[1], 'nonAppt':dataArray[2], 'name':name, 'address':address })
                branchData.append({'id':dataArray[0], 'name':name, 'address':address, 'nonAppt':dataArray[2] })
            except ValueError as e:
                print e
        print json.dumps(branchData)
    except urllib2.HTTPError, e:
        print e.code
    except urllib2.URLError, e:
        print e.args

#get office names, locations based on published IDs.
def getOffices(branchid):
    #use static to limit traffic
    #data =  json.loads(urllib2.urlopen(officeDataUrl).readlines()[0])['foims_offices']['offices']
    f = open(officeDataFile)
    data = json.loads(f.read())['foims_offices']['offices']

    for office in data:
        if str(office['number']) == branchid:
            return (office['name'], office['address'])
    f.close()
    
'''
def getNames(data):
    for item in data:
        branchUrl = ''
        if item['id'] == '510':
            webdata = urllib2.urlopen(branchUrl).read()
            soup = BeautifulSoup(webdata)
            #print soup.prettify()
            address = soup.find(id='Address')
            address
            print address.getText()
            #addressText = soup.find_all(id='Address', text=True)
            print address
            #print address[0]
            #print address[0].findAll(text=True)
            #print addressText
            #print type(address[0])
            #print address[0].contents
            #print address[0].string
            #print address[0]['div']
'''

getTimes()