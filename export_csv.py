import dataset
db = dataset.connect('sqlite:///dmv.db')
result = db['dmv'].all()
dataset.freeze(result, format='csv', filename='dmv.csv')