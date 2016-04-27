import dataset
db = dataset.connect('sqlite:///dmv.db')
#print(db.tables)
#print(db['dmv'].columns)
result = db['dmv'].all()
dataset.freeze(result, format='csv', filename='../csv/dmv.csv')

#aggregate by hour
#TODO: exclude closed hours, weekends. also include day of week.
q = '''SELECT branch, strftime('%H', "update") hour, strftime('%w', "update") dayOfWeek, avg(appt) avgAppt, avg(nonAppt) avgNonAppt FROM dmv WHERE appt <> 0.0 and nonAppt<> 0.0 GROUP BY branch, strftime('%H', "update"),strftime('%w', "update")'''
result = db.query(q)
#for row in result:
#    print row
dataset.freeze(result, format='csv', filename='../csv/dmv_aggregation.csv')