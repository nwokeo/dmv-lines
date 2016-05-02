from urllib.request import urlopen, HTTPError, URLError
import dataset #http://dataset.readthedocs.org/en/latest/freezefile.html
import time, datetime
import plotly.tools as tls
import plotly.plotly as py                                                  
from plotly.graph_objs import Figure, Data, Layout, Scatter 
import os
import json
import configparser
import psycopg2

config = configparser.ConfigParser()
config.read('dmv.cfg')

os.environ['TZ'] = 'US/Pacific'
time.tzset()
dayOfWeek = datetime.date.today().weekday()

#intialize DB
conn = psycopg2.connect(host=config.get('DATABASE', 'host'),
                        user=config.get('DATABASE', 'username'),
                        password=config.get('DATABASE', 'password'),
                        dbname="reader")
conn.set_session(autocommit=True)
cur = conn.cursor()

#initialize vars 
la_branches = [502, 617, 508, 652, 510, 511, 576]
dmvUrl = config['URLS']['waitdata']

f = open('../resource/branch_data.json')
full_offices = json.loads(f.read())
f.close()

traces = []
inited = []

credentials = tls.get_credentials_file()                                    

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
        print(self.name, self.apptValue, self.noApptValue, self.update)


def tomins(hhmm):
    h = hhmm.split(':')[0]
    m = hhmm.split(':')[1]
    return int(h) * 60 + int(m)


def polldmv():
    try:
        # get all wait time data
        data = urlopen(dmvUrl).readlines()[1:]
        dbData = []

        for line in data:
            try:
                dataArray = line.decode("utf-8").rstrip().rsplit(',')
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
                print('ValueError', e)
        return dbData
    except HTTPError as e:
        print('HTTPError', e.code)
    except URLError as e:
        print('URLError', e.args)


def writetodb(data):
    for dataArray in data:
        cur.execute(
            '''insert into dmv.historical_waittimes(
             appt_wait,
             non_appt_wait,
             branch_id)
             values (%s,%s,%s)''', (int(dataArray[1]), int(dataArray[2]), int(dataArray[0]))
        )

def plot(traces):
    scatterObjs = []
    #make scatter objects
    for trace in traces:
        if int(trace.getName()) in la_branches:
            scatterObjs.append(Scatter(x=trace.getUpdate(), 
                y=trace.getNoApptValue(),
                mode='lines', 
                #name=branch_names[trace.getName()] 
                name=getOfficeName(trace.getName()) #read these from file. TODO: rename trace.getName?
                ))
    data = Data(scatterObjs)
    layout = Layout(title='Central LA DMV Non-Appointment Wait Times: ' + datetime.datetime.fromtimestamp(time.time()).strftime('%Y-%m-%d'))
    fig = Figure(data=data, layout=layout)         
    #TODO: trap plotly ConnectionError
    x = py.plot(fig, filename='Central LA DMV', auto_open=False)
    print(x)


def getOfficeName(id):
    id = int(id)
    for office in full_offices:
        if office['id'] == id:
            return office['name']


def getOfficeAddress(id):
    id = int(id)
    for office in full_offices:
        if office['id'] == id:
            return office['address']


def getOfficeCoords(id):
    id = int(id)
    for office in full_offices:
        if office['id'] == id:
            return office['coords']


def getOfficeHours(id):
    id = int(id)
    for office in full_offices:
        if office['id'] == id:
            return office['officeHours'].split(',')[dayOfWeek].split('-')


#update pseudo API file
def printTrace(traces):
    a = []
    for trace in traces:
        d = { 'address':getOfficeAddress(trace.getId()),
              'nonAppt':int(trace.getNoApptValue()[-1]),
              'id':int(trace.getId()),
              'name':getOfficeName(trace.getId()),
              'coords':getOfficeCoords(trace.getId()),
              'officeHours':getOfficeHours(trace.getId()) }
        a.append(d)
    with open('../resource/offices.json', 'w') as fp:
        fp.write('waitTime(')
        json.dump(a, fp)
        fp.write(');')
    fp.close()


def main():
    while True:
        dbData = polldmv()
        printTrace(traces)
        if dbData:
            writetodb(dbData)
        # todo: refresh data every 5 minutes, plotly every 20
        plot(traces)
        time.sleep(900) #refresh every 15 mins (plotly limit of 50/day)



if __name__=='__main__':
    main()
