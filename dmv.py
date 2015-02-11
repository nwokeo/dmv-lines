import urllib2
import dataset #http://dataset.readthedocs.org/en/latest/freezefile.html
import time, datetime
from time import gmtime
import plotly.tools as tls                                                  
import plotly.plotly as py                                                  
from plotly.graph_objs import Figure, Data, Layout, Scatter 
import random
import os

#source: http://apps.dmv.ca.gov/web/fomap.html?itemType=fo&officeNumber=502

os.environ['TZ'] = 'US/Pacific'
time.tzset()

#intialize DB
db = dataset.connect('sqlite:///dmv.db')
table = db['dmv']

#initialize vars
target_branches = [502, 617, 508, 652, 510, 511, 576]
branch_names = {'502':"Los Angeles", '617':"Lincoln Park", '508':"Hollywood", '652':"West Hollywood", '510':"Glendale", '511':"Montebello", '576':"Bell Gardens"}
dmvUrl = 'http://apps.dmv.ca.gov/fodata/Output2.txt'
traces = []
inited = []

credentials = tls.get_credentials_file()                                    
#print credentials        
    
#dont init if it already exists
class Trace():
    def __init__(self, id, name):
        self.name = name
        self.id = id
        self.apptValue = []
        self.noApptValue = []
        self.update = []
    
    def updateWait(self, apptValue, noApptValue, update):
        self.apptValue.append(apptValue)
        self.noApptValue.append(noApptValue)
        self.update.append(update)
        
    def getName(self):
        return self.name
        
    def getApptValue(self):
        return self.apptValue
        
    def getNoApptValue(self):
        return self.noApptValue
        
    def getUpdate(self):
        return self.update
        
    def getId(self):
        return self.id
        
    def showData(self):
        print self.name, self.apptValue, self.noApptValue, self.update
    
def tomins(hhmm):
    h = hhmm.split(':')[0]
    m = hhmm.split(':')[1]
    return int(h) * 60 + int(m)

def polldmv():
    try:
        data = urllib2.urlopen(dmvUrl).readlines()[1:]
        dbData = []
        for line in data:
            try:
                if int(line[:3]) in target_branches:
                    dataArray = line.rstrip().rsplit(',')
                    if dataArray[1].find(':') == 1:
                        dataArray[1] = tomins(dataArray[1])
                    if dataArray[2].find(':') == 1:
                        dataArray[2] = tomins(dataArray[2])
                    if dataArray[0] not in inited:
                        traces.append(Trace(dataArray[0], str(dataArray[0]))) #TODO: lookup branch name
                        inited.append(dataArray[0])
                    #append to global array
                    for trace in traces:
                        if dataArray[0] == trace.getName():
                            trace.updateWait(dataArray[1], dataArray[2], datetime.datetime.fromtimestamp(time.time()).strftime('%Y-%m-%d %H:%M:%S')) 
                    #append to local db array
                    dbData.append(dataArray)
            except ValueError as e:
                print e
        return dbData
    except urllib2.HTTPError, e:
        print e.code
    except urllib2.URLError, e:
        print e.args


def writetodb(data):
    for dataArray in data:
        dataDict = dict(update=datetime.datetime.fromtimestamp(time.time()).strftime('%Y-%m-%d %H:%M:%S'),
                        branch=dataArray[0],
                        appt=dataArray[1],
                        nonAppt=dataArray[2])
        table.insert(dataDict)
        
def plot(traces):
    scatterObjs = []
    #make scatter objects
    for trace in traces:
        scatterObjs.append(Scatter(x=trace.getUpdate(), 
            y=trace.getNoApptValue(),
            mode='lines', 
            name=branch_names[trace.getName()]
            ))
    data = Data(scatterObjs)
    layout = Layout(title='Cantral LA DMV Non-Apointment Wait Times: ' + datetime.datetime.fromtimestamp(time.time()).strftime('%Y-%m-%d'))
    fig = Figure(data=data, layout=layout)                                      
    #print fig.to_string()                                                       
    x = py.plot(fig, filename='DMV', auto_open=False)                           
    print x   
    
def main():
    while True:
        dbData = polldmv()
        print dbData
        writetodb(dbData)
        plot(traces)
        time.sleep(300) #refresh every 5 mins
    
if __name__=='__main__':
    main()